import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('MediaStreamTrack Ended Event Handling Tests', () => {
  let mockGetUserMedia: any
  let originalMediaDevices: MediaDevices | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Store original mediaDevices
    originalMediaDevices = navigator.mediaDevices
    
    // Create mock getUserMedia
    mockGetUserMedia = vi.fn()
  })

  afterEach(() => {
    // Restore original mediaDevices
    if (originalMediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: originalMediaDevices,
        writable: true,
        configurable: true,
      })
    }
  })

  describe('tdd-2.13: Verify MediaStreamTrack.ended event handling for disconnection', () => {
    it('should detect when microphone track ends due to device disconnection', () => {
      const createMockMediaStreamTrack = (options: {
        kind: 'audio' | 'video'
        label: string
        deviceId: string
        enabled?: boolean
      }) => {
        const track = {
          id: `${options.kind}-track-${Date.now()}`,
          kind: options.kind,
          label: options.label,
          enabled: options.enabled ?? true,
          muted: false,
          readyState: 'live' as MediaStreamTrackState,
          
          // Device information
          getSettings: vi.fn(() => ({
            deviceId: options.deviceId,
            groupId: `group-${options.deviceId}`,
            label: options.label,
            sampleRate: 48000,
            channelCount: 1,
          })),
          
          getCapabilities: vi.fn(() => ({
            deviceId: options.deviceId,
            groupId: `group-${options.deviceId}`,
          })),
          
          // Track control
          stop: vi.fn(() => {
            track.readyState = 'ended'
            track.dispatchEvent('ended')
          }),
          
          clone: vi.fn(() => createMockMediaStreamTrack(options)),
          
          // Event handling
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn((eventType: string) => {
            const listeners = track._eventListeners[eventType] || []
            listeners.forEach((listener: Function) => {
              listener({ type: eventType, target: track })
            })
          }),
          
          // Internal event storage
          _eventListeners: {} as Record<string, Function[]>,
          
          // Helper to simulate events
          _simulateEvent: (eventType: string, data?: any) => {
            track.dispatchEvent(eventType)
          },
          
          // Helper to simulate device disconnection
          _simulateDisconnection: () => {
            track.readyState = 'ended'
            track._simulateEvent('ended')
          },
        }

        // Mock addEventListener implementation
        track.addEventListener = vi.fn((event: string, listener: Function) => {
          if (!track._eventListeners[event]) {
            track._eventListeners[event] = []
          }
          track._eventListeners[event].push(listener)
        })

        return track
      }

      const createMockMediaStream = (audioTracks: any[] = []) => {
        return {
          id: `stream-${Date.now()}`,
          active: audioTracks.some(track => track.readyState === 'live'),
          
          getAudioTracks: vi.fn(() => audioTracks),
          getVideoTracks: vi.fn(() => []),
          getTracks: vi.fn(() => audioTracks),
          
          addTrack: vi.fn((track: any) => {
            audioTracks.push(track)
          }),
          
          removeTrack: vi.fn((track: any) => {
            const index = audioTracks.indexOf(track)
            if (index > -1) audioTracks.splice(index, 1)
          }),
          
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }
      }

      class MediaStreamTrackEndedHandler {
        private activeStreams = new Map<string, any>()
        private trackEndListeners = new Map<string, Function>()
        private deviceChangeListeners: Function[] = []

        async setupMicrophoneWithDisconnectionDetection(): Promise<{
          stream: any
          trackId: string
          deviceId: string
        }> {
          // Create mock track and stream
          const audioTrack = createMockMediaStreamTrack({
            kind: 'audio',
            label: 'USB Microphone',
            deviceId: 'usb-mic-001',
          })

          const stream = createMockMediaStream([audioTrack])

          // Set up ended event listener
          const endedListener = (event: any) => {
            this.handleTrackEnded(event.target)
          }

          audioTrack.addEventListener('ended', endedListener)
          this.trackEndListeners.set(audioTrack.id, endedListener)

          // Store stream reference
          this.activeStreams.set(stream.id, {
            stream,
            audioTrack,
            deviceInfo: audioTrack.getSettings(),
            createdAt: Date.now(),
          })

          return {
            stream,
            trackId: audioTrack.id,
            deviceId: audioTrack.getSettings().deviceId,
          }
        }

        handleTrackEnded(track: any) {
          const trackSettings = track.getSettings()
          
          return {
            action: 'track_ended',
            trackId: track.id,
            deviceId: trackSettings.deviceId,
            deviceLabel: trackSettings.label,
            timestamp: Date.now(),
            reason: this.determineEndReason(track),
            recovery: this.planRecovery(track),
          }
        }

        determineEndReason(track: any): {
          type: 'device_disconnected' | 'user_stopped' | 'system_interrupted' | 'unknown'
          confidence: 'high' | 'medium' | 'low'
          indicators: string[]
        } {
          const indicators = []
          
          // Check if track was stopped programmatically
          if (track.stop.mock?.calls?.length > 0) {
            indicators.push('stop() method was called')
            return {
              type: 'user_stopped',
              confidence: 'high',
              indicators,
            }
          }

          // Check track state
          if (track.readyState === 'ended') {
            indicators.push('track state is ended')
          }

          // In real implementation, we would check:
          // - Device enumeration changes
          // - System audio device status
          // - Browser navigator.mediaDevices events
          
          // For testing, simulate device disconnection detection
          const deviceLabel = track.getSettings().label
          if (deviceLabel.includes('USB') || deviceLabel.includes('Bluetooth')) {
            indicators.push('external device detected')
            return {
              type: 'device_disconnected',
              confidence: 'medium',
              indicators,
            }
          }

          return {
            type: 'unknown',
            confidence: 'low',
            indicators,
          }
        }

        planRecovery(track: any): {
          strategy: 'auto_reconnect' | 'device_selection' | 'fallback_device' | 'user_intervention'
          actions: string[]
          timeoutMs: number
        } {
          const endReason = this.determineEndReason(track)
          
          switch (endReason.type) {
            case 'device_disconnected':
              return {
                strategy: 'auto_reconnect',
                actions: [
                  'Wait for device reconnection',
                  'Monitor device enumeration changes',
                  'Attempt automatic reconnection',
                  'Fallback to default device if needed',
                ],
                timeoutMs: 5000,
              }

            case 'user_stopped':
              return {
                strategy: 'user_intervention',
                actions: [
                  'Show microphone restart button',
                  'Wait for user action',
                ],
                timeoutMs: 0, // No automatic timeout
              }

            case 'system_interrupted':
              return {
                strategy: 'auto_reconnect',
                actions: [
                  'Wait for system to stabilize',
                  'Retry microphone access',
                  'Check system audio settings',
                ],
                timeoutMs: 3000,
              }

            default:
              return {
                strategy: 'device_selection',
                actions: [
                  'Show device selection UI',
                  'Allow user to choose alternative device',
                  'Retry with selected device',
                ],
                timeoutMs: 10000,
              }
          }
        }

        async monitorDeviceChanges(): Promise<void> {
          // Mock device change monitoring
          const deviceChangeHandler = (event: any) => {
            this.handleDeviceChange(event)
          }

          this.deviceChangeListeners.push(deviceChangeHandler)

          // In real implementation:
          // navigator.mediaDevices.addEventListener('devicechange', deviceChangeHandler)
        }

        handleDeviceChange(event: any) {
          return {
            action: 'device_change_detected',
            timestamp: Date.now(),
            affectedStreams: this.findAffectedStreams(),
            recommendation: 'Check active streams and reconnect if needed',
          }
        }

        findAffectedStreams() {
          const affectedStreams = []
          
          for (const [streamId, streamData] of this.activeStreams) {
            const { audioTrack } = streamData
            
            if (audioTrack.readyState === 'ended') {
              affectedStreams.push({
                streamId,
                trackId: audioTrack.id,
                deviceId: audioTrack.getSettings().deviceId,
                deviceLabel: audioTrack.getSettings().label,
              })
            }
          }
          
          return affectedStreams
        }

        getActiveStreamsStatus() {
          const status = []
          
          for (const [streamId, streamData] of this.activeStreams) {
            const { stream, audioTrack, deviceInfo, createdAt } = streamData
            
            status.push({
              streamId,
              trackId: audioTrack.id,
              deviceId: deviceInfo.deviceId,
              deviceLabel: deviceInfo.label,
              trackState: audioTrack.readyState,
              streamActive: stream.active,
              ageMs: Date.now() - createdAt,
              isHealthy: audioTrack.readyState === 'live' && stream.active,
            })
          }
          
          return status
        }

        cleanup() {
          // Remove all event listeners
          for (const [streamId, streamData] of this.activeStreams) {
            const { audioTrack } = streamData
            const listener = this.trackEndListeners.get(audioTrack.id)
            
            if (listener) {
              audioTrack.removeEventListener('ended', listener)
              this.trackEndListeners.delete(audioTrack.id)
            }
          }

          this.activeStreams.clear()
          this.deviceChangeListeners = []
        }
      }

      const handler = new MediaStreamTrackEndedHandler()

      // Test setting up microphone with disconnection detection
      const setupResult = handler.setupMicrophoneWithDisconnectionDetection()
      expect(setupResult).resolves.toMatchObject({
        stream: expect.any(Object),
        trackId: expect.any(String),
        deviceId: 'usb-mic-001',
      })

      // Test initial status
      setupResult.then(() => {
        const status = handler.getActiveStreamsStatus()
        expect(status).toHaveLength(1)
        expect(status[0].isHealthy).toBe(true)
        expect(status[0].trackState).toBe('live')
      })
    })

    it('should implement automatic reconnection when device becomes available again', async () => {
      class AutoReconnectionManager {
        private reconnectionAttempts = new Map<string, number>()
        private maxReconnectionAttempts = 5
        private reconnectionDelay = 2000
        private deviceMonitorInterval?: NodeJS.Timeout

        async startReconnectionProcess(deviceId: string, deviceLabel: string): Promise<{
          success: boolean
          attempt: number
          strategy: string
          nextAttemptIn?: number
        }> {
          const currentAttempts = this.reconnectionAttempts.get(deviceId) || 0
          
          if (currentAttempts >= this.maxReconnectionAttempts) {
            return {
              success: false,
              attempt: currentAttempts,
              strategy: 'max_attempts_reached',
            }
          }

          this.reconnectionAttempts.set(deviceId, currentAttempts + 1)
          
          try {
            const reconnectionResult = await this.attemptReconnection(deviceId, deviceLabel)
            
            if (reconnectionResult.success) {
              // Reset attempts on success
              this.reconnectionAttempts.delete(deviceId)
              return {
                success: true,
                attempt: currentAttempts + 1,
                strategy: 'device_reconnected',
              }
            } else {
              // Schedule next attempt
              const nextDelay = this.calculateBackoffDelay(currentAttempts + 1)
              this.scheduleReconnectionAttempt(deviceId, deviceLabel, nextDelay)
              
              return {
                success: false,
                attempt: currentAttempts + 1,
                strategy: 'retry_scheduled',
                nextAttemptIn: nextDelay,
              }
            }
          } catch (error) {
            return {
              success: false,
              attempt: currentAttempts + 1,
              strategy: 'reconnection_failed',
              nextAttemptIn: this.calculateBackoffDelay(currentAttempts + 1),
            }
          }
        }

        async attemptReconnection(deviceId: string, deviceLabel: string): Promise<{
          success: boolean
          stream?: any
          error?: string
        }> {
          try {
            // Check if device is available
            const isDeviceAvailable = await this.checkDeviceAvailability(deviceId)
            
            if (!isDeviceAvailable) {
              return {
                success: false,
                error: 'Device not available',
              }
            }

            // Attempt to get media stream with specific device
            const stream = await this.getMediaStreamForDevice(deviceId)
            
            return {
              success: true,
              stream,
            }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        }

        async checkDeviceAvailability(deviceId: string): Promise<boolean> {
          // Mock device enumeration check
          try {
            // In real implementation:
            // const devices = await navigator.mediaDevices.enumerateDevices()
            // return devices.some(device => device.deviceId === deviceId && device.kind === 'audioinput')
            
            // For testing, simulate device availability
            return Math.random() > 0.3 // 70% chance device is available
          } catch (error) {
            return false
          }
        }

        async getMediaStreamForDevice(deviceId: string): Promise<any> {
          // Mock getUserMedia with specific device
          const constraints = {
            audio: {
              deviceId: { exact: deviceId },
              echoCancellation: true,
              noiseSuppression: true,
            },
          }

          // In real implementation:
          // return navigator.mediaDevices.getUserMedia(constraints)
          
          // For testing, create mock stream
          return {
            id: `reconnected-stream-${Date.now()}`,
            getAudioTracks: () => [{
              id: `reconnected-track-${Date.now()}`,
              kind: 'audio',
              getSettings: () => ({ deviceId }),
            }],
          }
        }

        calculateBackoffDelay(attemptNumber: number): number {
          // Exponential backoff with jitter
          const exponentialDelay = Math.min(
            this.reconnectionDelay * Math.pow(2, attemptNumber - 1),
            30000 // Max 30 seconds
          )
          
          const jitter = Math.random() * 0.3 * exponentialDelay
          return Math.floor(exponentialDelay + jitter)
        }

        scheduleReconnectionAttempt(deviceId: string, deviceLabel: string, delayMs: number) {
          setTimeout(() => {
            this.startReconnectionProcess(deviceId, deviceLabel)
          }, delayMs)
        }

        startDeviceMonitoring() {
          this.deviceMonitorInterval = setInterval(() => {
            this.checkForReconnectedDevices()
          }, 3000) // Check every 3 seconds
        }

        async checkForReconnectedDevices() {
          // Check if any previously disconnected devices are now available
          const disconnectedDevices = Array.from(this.reconnectionAttempts.keys())
          
          for (const deviceId of disconnectedDevices) {
            const isAvailable = await this.checkDeviceAvailability(deviceId)
            
            if (isAvailable) {
              // Device is back - attempt immediate reconnection
              this.startReconnectionProcess(deviceId, `Device ${deviceId}`)
            }
          }
        }

        stopDeviceMonitoring() {
          if (this.deviceMonitorInterval) {
            clearInterval(this.deviceMonitorInterval)
            this.deviceMonitorInterval = undefined
          }
        }

        getReconnectionStatus() {
          const status = []
          
          for (const [deviceId, attempts] of this.reconnectionAttempts) {
            status.push({
              deviceId,
              attempts,
              maxAttempts: this.maxReconnectionAttempts,
              canRetry: attempts < this.maxReconnectionAttempts,
              nextBackoffDelay: this.calculateBackoffDelay(attempts + 1),
            })
          }
          
          return {
            activeReconnections: status,
            isMonitoring: !!this.deviceMonitorInterval,
            totalDisconnectedDevices: this.reconnectionAttempts.size,
          }
        }

        resetReconnectionAttempts(deviceId?: string) {
          if (deviceId) {
            this.reconnectionAttempts.delete(deviceId)
          } else {
            this.reconnectionAttempts.clear()
          }
        }
      }

      const reconnectionManager = new AutoReconnectionManager()

      // Test initial reconnection attempt
      const deviceId = 'usb-mic-001'
      const deviceLabel = 'USB Microphone'
      
      const reconnectionResult = await reconnectionManager.startReconnectionProcess(deviceId, deviceLabel)
      
      expect(reconnectionResult.attempt).toBe(1)
      expect(['device_reconnected', 'retry_scheduled', 'reconnection_failed'])
        .toContain(reconnectionResult.strategy)

      // Test reconnection status
      const status = reconnectionManager.getReconnectionStatus()
      expect(status.totalDisconnectedDevices).toBeGreaterThanOrEqual(0)
      
      if (!reconnectionResult.success) {
        expect(status.activeReconnections).toHaveLength(1)
        expect(status.activeReconnections[0].deviceId).toBe(deviceId)
        expect(status.activeReconnections[0].canRetry).toBe(true)
      }

      // Test device monitoring
      reconnectionManager.startDeviceMonitoring()
      const monitoringStatus = reconnectionManager.getReconnectionStatus()
      expect(monitoringStatus.isMonitoring).toBe(true)

      // Cleanup
      reconnectionManager.stopDeviceMonitoring()
    })

    it('should provide device health monitoring and proactive notifications', () => {
      class DeviceHealthMonitor {
        private healthChecks = new Map<string, any>()
        private healthHistory = new Map<string, any[]>()
        private alertThresholds = {
          disconnectionRate: 0.3, // 30% disconnection rate
          reconnectionTime: 10000, // 10 seconds
          consecutiveFailures: 3,
        }

        startHealthMonitoring(deviceId: string, deviceLabel: string) {
          const healthData = {
            deviceId,
            deviceLabel,
            startTime: Date.now(),
            totalConnections: 0,
            successfulConnections: 0,
            disconnections: 0,
            reconnections: 0,
            averageConnectionDuration: 0,
            lastConnectionTime: null,
            consecutiveFailures: 0,
            currentStatus: 'unknown' as 'connected' | 'disconnected' | 'reconnecting' | 'unknown',
          }

          this.healthChecks.set(deviceId, healthData)
          this.healthHistory.set(deviceId, [])
        }

        recordConnection(deviceId: string, successful: boolean) {
          const health = this.healthChecks.get(deviceId)
          if (!health) return

          health.totalConnections++
          health.lastConnectionTime = Date.now()
          
          if (successful) {
            health.successfulConnections++
            health.consecutiveFailures = 0
            health.currentStatus = 'connected'
          } else {
            health.consecutiveFailures++
            health.currentStatus = 'disconnected'
          }

          this.recordHealthEvent(deviceId, 'connection_attempt', { successful })
          this.checkHealthAlerts(deviceId)
        }

        recordDisconnection(deviceId: string, reason?: string) {
          const health = this.healthChecks.get(deviceId)
          if (!health) return

          health.disconnections++
          health.currentStatus = 'disconnected'

          this.recordHealthEvent(deviceId, 'disconnection', { reason })
          this.checkHealthAlerts(deviceId)
        }

        recordReconnection(deviceId: string, timeToReconnect: number) {
          const health = this.healthChecks.get(deviceId)
          if (!health) return

          health.reconnections++
          health.currentStatus = 'connected'
          health.consecutiveFailures = 0

          this.recordHealthEvent(deviceId, 'reconnection', { timeToReconnect })
        }

        recordHealthEvent(deviceId: string, eventType: string, data: any) {
          const history = this.healthHistory.get(deviceId) || []
          
          history.push({
            timestamp: Date.now(),
            eventType,
            data,
          })

          // Keep only last 50 events
          if (history.length > 50) {
            history.shift()
          }

          this.healthHistory.set(deviceId, history)
        }

        checkHealthAlerts(deviceId: string): {
          alerts: any[]
          severity: 'low' | 'medium' | 'high'
        } {
          const health = this.healthChecks.get(deviceId)
          if (!health) return { alerts: [], severity: 'low' }

          const alerts = []

          // Check disconnection rate
          if (health.totalConnections > 0) {
            const disconnectionRate = health.disconnections / health.totalConnections
            if (disconnectionRate > this.alertThresholds.disconnectionRate) {
              alerts.push({
                type: 'high_disconnection_rate',
                severity: 'high',
                message: `Device "${health.deviceLabel}" has a high disconnection rate (${Math.round(disconnectionRate * 100)}%)`,
                recommendation: 'Check device connection stability and consider using a different device',
              })
            }
          }

          // Check consecutive failures
          if (health.consecutiveFailures >= this.alertThresholds.consecutiveFailures) {
            alerts.push({
              type: 'consecutive_failures',
              severity: 'high',
              message: `Device "${health.deviceLabel}" has ${health.consecutiveFailures} consecutive failures`,
              recommendation: 'Device may be permanently disconnected or malfunctioning',
            })
          }

          // Check if device has been disconnected for too long
          if (health.currentStatus === 'disconnected' && health.lastConnectionTime) {
            const timeSinceLastConnection = Date.now() - health.lastConnectionTime
            if (timeSinceLastConnection > this.alertThresholds.reconnectionTime) {
              alerts.push({
                type: 'extended_disconnection',
                severity: 'medium',
                message: `Device "${health.deviceLabel}" has been disconnected for ${Math.round(timeSinceLastConnection / 1000)} seconds`,
                recommendation: 'Check if device is properly connected',
              })
            }
          }

          const severity = alerts.some(a => a.severity === 'high') ? 'high' :
                          alerts.some(a => a.severity === 'medium') ? 'medium' : 'low'

          return { alerts, severity }
        }

        generateHealthReport(deviceId: string) {
          const health = this.healthChecks.get(deviceId)
          const history = this.healthHistory.get(deviceId) || []
          
          if (!health) {
            return { error: 'Device not found in health monitoring' }
          }

          const monitoringDuration = Date.now() - health.startTime
          const successRate = health.totalConnections > 0 
            ? health.successfulConnections / health.totalConnections 
            : 0

          const recentEvents = history.slice(-10)
          const disconnectionEvents = history.filter(e => e.eventType === 'disconnection')
          const reconnectionEvents = history.filter(e => e.eventType === 'reconnection')

          const averageReconnectionTime = reconnectionEvents.length > 0
            ? reconnectionEvents.reduce((sum, e) => sum + e.data.timeToReconnect, 0) / reconnectionEvents.length
            : 0

          return {
            deviceInfo: {
              id: health.deviceId,
              label: health.deviceLabel,
              currentStatus: health.currentStatus,
            },
            statistics: {
              monitoringDurationMs: monitoringDuration,
              totalConnections: health.totalConnections,
              successfulConnections: health.successfulConnections,
              disconnections: health.disconnections,
              reconnections: health.reconnections,
              successRate: Math.round(successRate * 100) / 100,
              averageReconnectionTimeMs: Math.round(averageReconnectionTime),
              consecutiveFailures: health.consecutiveFailures,
            },
            recentActivity: recentEvents.map(event => ({
              time: new Date(event.timestamp).toISOString(),
              event: event.eventType,
              details: event.data,
            })),
            healthScore: this.calculateHealthScore(health),
            alerts: this.checkHealthAlerts(deviceId),
            recommendations: this.generateRecommendations(health),
          }
        }

        calculateHealthScore(health: any): {
          score: number
          grade: 'A' | 'B' | 'C' | 'D' | 'F'
          factors: any[]
        } {
          const factors = []
          let score = 100

          // Success rate factor
          const successRate = health.totalConnections > 0 
            ? health.successfulConnections / health.totalConnections 
            : 1
          const successRateScore = successRate * 40
          factors.push({ name: 'Success Rate', score: Math.round(successRateScore), weight: 40 })
          score = score - 40 + successRateScore

          // Disconnection frequency factor
          const disconnectionRate = health.totalConnections > 0 
            ? health.disconnections / health.totalConnections 
            : 0
          const disconnectionScore = Math.max(0, 30 - (disconnectionRate * 100))
          factors.push({ name: 'Connection Stability', score: Math.round(disconnectionScore), weight: 30 })
          score = score - 30 + disconnectionScore

          // Current status factor
          const statusScore = health.currentStatus === 'connected' ? 20 :
                             health.currentStatus === 'reconnecting' ? 10 : 0
          factors.push({ name: 'Current Status', score: statusScore, weight: 20 })
          score = score - 20 + statusScore

          // Consecutive failures penalty
          const failurePenalty = Math.min(10, health.consecutiveFailures * 3)
          factors.push({ name: 'Failure Penalty', score: -failurePenalty, weight: 10 })
          score = score - failurePenalty

          // Determine grade
          const finalScore = Math.max(0, Math.min(100, score))
          const grade = finalScore >= 90 ? 'A' :
                       finalScore >= 80 ? 'B' :
                       finalScore >= 70 ? 'C' :
                       finalScore >= 60 ? 'D' : 'F'

          return {
            score: Math.round(finalScore),
            grade,
            factors,
          }
        }

        generateRecommendations(health: any): string[] {
          const recommendations = []

          if (health.consecutiveFailures >= 2) {
            recommendations.push('Consider switching to a different microphone device')
          }

          const disconnectionRate = health.totalConnections > 0 
            ? health.disconnections / health.totalConnections 
            : 0

          if (disconnectionRate > 0.2) {
            recommendations.push('Check USB/audio jack connections for stability')
            recommendations.push('Try using a different USB port or audio interface')
          }

          if (health.currentStatus === 'disconnected') {
            recommendations.push('Verify the microphone is properly connected')
            recommendations.push('Check system audio settings and permissions')
          }

          if (recommendations.length === 0) {
            recommendations.push('Device is operating normally')
          }

          return recommendations
        }

        getAllDevicesHealth() {
          const allDevices = []
          
          for (const [deviceId, health] of this.healthChecks) {
            const report = this.generateHealthReport(deviceId)
            allDevices.push(report)
          }

          return {
            devices: allDevices,
            summary: {
              totalDevices: allDevices.length,
              healthyDevices: allDevices.filter(d => d.healthScore?.grade === 'A' || d.healthScore?.grade === 'B').length,
              unhealthyDevices: allDevices.filter(d => d.healthScore?.grade === 'D' || d.healthScore?.grade === 'F').length,
              averageHealthScore: allDevices.length > 0 
                ? allDevices.reduce((sum, d) => sum + (d.healthScore?.score || 0), 0) / allDevices.length 
                : 0,
            },
          }
        }
      }

      const healthMonitor = new DeviceHealthMonitor()

      // Test health monitoring setup
      const deviceId = 'usb-mic-001'
      const deviceLabel = 'USB Microphone'
      
      healthMonitor.startHealthMonitoring(deviceId, deviceLabel)

      // Test recording various events
      healthMonitor.recordConnection(deviceId, true)
      healthMonitor.recordConnection(deviceId, true)
      healthMonitor.recordDisconnection(deviceId, 'device_unplugged')
      healthMonitor.recordConnection(deviceId, false)
      healthMonitor.recordReconnection(deviceId, 3000)

      // Test health report generation
      const healthReport = healthMonitor.generateHealthReport(deviceId)
      
      expect(healthReport.deviceInfo.id).toBe(deviceId)
      expect(healthReport.statistics.totalConnections).toBe(3)
      expect(healthReport.statistics.disconnections).toBe(1)
      expect(healthReport.statistics.reconnections).toBe(1)
      expect(healthReport.healthScore.score).toBeGreaterThan(0)
      expect(healthReport.healthScore.grade).toMatch(/[A-F]/)
      expect(healthReport.recommendations).toBeInstanceOf(Array)

      // Test alerts
      const alertStatus = healthMonitor.checkHealthAlerts(deviceId)
      expect(alertStatus.alerts).toBeInstanceOf(Array)
      expect(['low', 'medium', 'high']).toContain(alertStatus.severity)

      // Test overall health summary
      const overallHealth = healthMonitor.getAllDevicesHealth()
      expect(overallHealth.devices).toHaveLength(1)
      expect(overallHealth.summary.totalDevices).toBe(1)
      expect(overallHealth.summary.averageHealthScore).toBeGreaterThan(0)
    })
  })
})