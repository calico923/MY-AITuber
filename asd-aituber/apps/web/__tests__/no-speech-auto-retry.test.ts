import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('No-Speech Auto-Retry Tests', () => {
  let mockSpeechRecognition: any
  let originalSpeechRecognition: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Store original SpeechRecognition
    originalSpeechRecognition = (global as any).SpeechRecognition || (global as any).webkitSpeechRecognition
    
    // Create mock SpeechRecognition
    mockSpeechRecognition = vi.fn().mockImplementation(() => ({
      continuous: false,
      interimResults: false,
      lang: 'en-US',
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onstart: null,
      onend: null,
      onerror: null,
      onresult: null,
      onspeechstart: null,
      onspeechend: null,
    }))

    // Mock global SpeechRecognition
    ;(global as any).SpeechRecognition = mockSpeechRecognition
    ;(global as any).webkitSpeechRecognition = mockSpeechRecognition
  })

  afterEach(() => {
    // Restore original SpeechRecognition
    if (originalSpeechRecognition) {
      ;(global as any).SpeechRecognition = originalSpeechRecognition
      ;(global as any).webkitSpeechRecognition = originalSpeechRecognition
    }
  })

  describe('tdd-2.7: Verify no-speech error triggers auto-retry mechanism', () => {
    it('should detect no-speech error and trigger auto-retry', async () => {
      class NoSpeechRetryManager {
        private recognition: any
        private retryCount = 0
        private maxRetries = 3
        private retryDelay = 1000
        private retryTimer?: NodeJS.Timeout

        constructor() {
          this.recognition = new (global as any).SpeechRecognition()
          this.setupErrorHandling()
        }

        setupErrorHandling() {
          this.recognition.onerror = (event: any) => {
            this.handleError(event)
          }

          this.recognition.onend = () => {
            this.handleRecognitionEnd()
          }
        }

        handleError(event: any) {
          if (event.error === 'no-speech') {
            return this.handleNoSpeechError(event)
          }

          // Handle other errors
          this.handleOtherErrors(event)
        }

        handleNoSpeechError(event: any) {
          const shouldRetry = this.shouldRetryNoSpeech()
          
          if (shouldRetry) {
            this.scheduleRetry('no-speech')
            return {
              action: 'retry_scheduled',
              retryCount: this.retryCount + 1,
              maxRetries: this.maxRetries,
              delay: this.retryDelay,
            }
          } else {
            return {
              action: 'max_retries_reached',
              retryCount: this.retryCount,
              fallback: 'manual_activation_required',
            }
          }
        }

        shouldRetryNoSpeech(): boolean {
          return this.retryCount < this.maxRetries
        }

        scheduleRetry(reason: string) {
          this.retryCount++
          
          this.retryTimer = setTimeout(() => {
            this.executeRetry(reason)
          }, this.retryDelay)

          // Exponential backoff for subsequent retries
          this.retryDelay = Math.min(this.retryDelay * 1.5, 5000)
        }

        executeRetry(reason: string) {
          try {
            this.recognition.start()
            return {
              success: true,
              reason,
              attempt: this.retryCount,
            }
          } catch (error) {
            return {
              success: false,
              reason,
              attempt: this.retryCount,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        }

        handleOtherErrors(event: any) {
          // Don't retry for certain error types
          const noRetryErrors = ['not-allowed', 'service-not-allowed', 'network']
          
          if (noRetryErrors.includes(event.error)) {
            return {
              action: 'no_retry',
              error: event.error,
              reason: 'Error type does not support retry',
            }
          }

          // Generic retry for other errors
          if (this.retryCount < this.maxRetries) {
            this.scheduleRetry(event.error)
            return {
              action: 'retry_scheduled',
              error: event.error,
              retryCount: this.retryCount + 1,
            }
          }

          return {
            action: 'max_retries_reached',
            error: event.error,
          }
        }

        handleRecognitionEnd() {
          // Recognition ended naturally - could trigger restart if in continuous mode
          return {
            action: 'recognition_ended',
            shouldRestart: this.recognition.continuous,
          }
        }

        clearRetryTimer() {
          if (this.retryTimer) {
            clearTimeout(this.retryTimer)
            this.retryTimer = undefined
          }
        }

        reset() {
          this.retryCount = 0
          this.retryDelay = 1000
          this.clearRetryTimer()
        }

        getRetryStatus() {
          return {
            retryCount: this.retryCount,
            maxRetries: this.maxRetries,
            remainingRetries: this.maxRetries - this.retryCount,
            currentDelay: this.retryDelay,
            hasActiveTimer: !!this.retryTimer,
          }
        }
      }

      const retryManager = new NoSpeechRetryManager()
      const mockRecognition = retryManager['recognition']

      // Simulate no-speech error
      const noSpeechEvent = { error: 'no-speech', message: 'No speech detected' }
      const result = retryManager.handleError(noSpeechEvent)

      expect(result.action).toBe('retry_scheduled')
      expect(result.retryCount).toBe(1)
      expect(result.delay).toBe(1000)

      // Check retry status
      const status = retryManager.getRetryStatus()
      expect(status.remainingRetries).toBe(2)
      expect(status.hasActiveTimer).toBe(true)
    })

    it('should implement progressive backoff strategy for retries', () => {
      const backoffCalculator = {
        calculateDelay(attempt: number, baseDelay: number = 1000): number {
          // Exponential backoff with jitter
          const exponentialDelay = baseDelay * Math.pow(1.5, attempt - 1)
          const jitter = Math.random() * 0.1 * exponentialDelay
          const maxDelay = 5000
          
          return Math.min(exponentialDelay + jitter, maxDelay)
        },

        getBackoffSequence(maxAttempts: number, baseDelay: number = 1000): number[] {
          const sequence = []
          for (let i = 1; i <= maxAttempts; i++) {
            sequence.push(Math.floor(this.calculateDelay(i, baseDelay)))
          }
          return sequence
        },

        validateBackoffStrategy(sequence: number[]): {
          isValid: boolean
          issues: string[]
        } {
          const issues = []

          // Check if delays are increasing
          for (let i = 1; i < sequence.length; i++) {
            if (sequence[i] < sequence[i - 1]) {
              issues.push(`Delay decreased at attempt ${i + 1}`)
            }
          }

          // Check if delays are reasonable
          const maxReasonableDelay = 10000
          const tooLongDelays = sequence.filter(delay => delay > maxReasonableDelay)
          if (tooLongDelays.length > 0) {
            issues.push(`Delays too long: ${tooLongDelays}`)
          }

          return {
            isValid: issues.length === 0,
            issues,
          }
        },
      }

      // Test backoff calculation
      const delays = backoffCalculator.getBackoffSequence(5)
      expect(delays).toHaveLength(5)
      expect(delays[0]).toBeLessThanOrEqual(1500) // First attempt with jitter
      expect(delays[4]).toBeLessThanOrEqual(5000) // Capped at max delay

      // Validate backoff strategy
      const validation = backoffCalculator.validateBackoffStrategy(delays)
      expect(validation.isValid).toBe(true)
      expect(validation.issues).toHaveLength(0)
    })

    it('should track retry attempts and provide detailed logging', () => {
      const retryLogger = {
        attempts: [] as any[],
        
        logRetryAttempt(attempt: {
          timestamp: number
          attemptNumber: number
          reason: string
          delay: number
          success: boolean
          error?: string
        }) {
          this.attempts.push({
            ...attempt,
            id: `retry-${Date.now()}-${Math.random()}`,
          })
        },

        getRetryStatistics() {
          const total = this.attempts.length
          const successful = this.attempts.filter(a => a.success).length
          const failed = total - successful
          
          const reasonCounts = this.attempts.reduce((acc, attempt) => {
            acc[attempt.reason] = (acc[attempt.reason] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          const averageDelay = total > 0 
            ? this.attempts.reduce((sum, a) => sum + a.delay, 0) / total 
            : 0

          return {
            totalAttempts: total,
            successfulAttempts: successful,
            failedAttempts: failed,
            successRate: total > 0 ? successful / total : 0,
            reasonBreakdown: reasonCounts,
            averageDelay: Math.round(averageDelay),
          }
        },

        getRecentAttempts(count: number = 5) {
          return this.attempts
            .slice(-count)
            .map(attempt => ({
              time: new Date(attempt.timestamp).toISOString(),
              attempt: attempt.attemptNumber,
              reason: attempt.reason,
              success: attempt.success,
              delay: attempt.delay,
            }))
        },

        exportLogs() {
          return {
            metadata: {
              exportTime: new Date().toISOString(),
              totalAttempts: this.attempts.length,
            },
            statistics: this.getRetryStatistics(),
            recentAttempts: this.getRecentAttempts(10),
            fullLog: this.attempts,
          }
        },

        clear() {
          this.attempts = []
        },
      }

      // Log some retry attempts
      retryLogger.logRetryAttempt({
        timestamp: Date.now(),
        attemptNumber: 1,
        reason: 'no-speech',
        delay: 1000,
        success: false,
        error: 'Still no speech detected',
      })

      retryLogger.logRetryAttempt({
        timestamp: Date.now() + 1000,
        attemptNumber: 2,
        reason: 'no-speech',
        delay: 1500,
        success: true,
      })

      retryLogger.logRetryAttempt({
        timestamp: Date.now() + 2500,
        attemptNumber: 3,
        reason: 'network',
        delay: 2000,
        success: false,
        error: 'Network error',
      })

      const stats = retryLogger.getRetryStatistics()
      expect(stats.totalAttempts).toBe(3)
      expect(stats.successfulAttempts).toBe(1)
      expect(stats.successRate).toBeCloseTo(0.33, 2)
      expect(stats.reasonBreakdown['no-speech']).toBe(2)
      expect(stats.reasonBreakdown['network']).toBe(1)

      const recent = retryLogger.getRecentAttempts(2)
      expect(recent).toHaveLength(2)
      expect(recent[1].reason).toBe('network')
    })

    it('should integrate with speech recognition lifecycle', async () => {
      class SpeechRecognitionWithRetry {
        private recognition: any
        private isActive = false
        private retryManager: any
        private eventHandlers = new Map()

        constructor() {
          this.recognition = new (global as any).SpeechRecognition()
          this.setupRecognition()
          this.retryManager = this.createRetryManager()
        }

        setupRecognition() {
          this.recognition.continuous = true
          this.recognition.interimResults = true
          
          // Set up event handlers
          this.recognition.onstart = () => {
            this.isActive = true
            this.emit('recognitionStart')
          }

          this.recognition.onend = () => {
            this.isActive = false
            this.emit('recognitionEnd')
            
            // Auto-restart if continuous and no errors
            if (this.recognition.continuous && !this.retryManager.hasError) {
              this.scheduleRestart('continuous_mode')
            }
          }

          this.recognition.onerror = (event: any) => {
            this.handleError(event)
          }

          this.recognition.onresult = (event: any) => {
            this.retryManager.reset() // Reset retry count on successful result
            this.emit('result', event)
          }
        }

        createRetryManager() {
          return {
            retryCount: 0,
            maxRetries: 3,
            baseDelay: 1000,
            hasError: false,
            
            shouldRetry(errorType: string): boolean {
              const retryableErrors = ['no-speech', 'audio-capture', 'network']
              return retryableErrors.includes(errorType) && this.retryCount < this.maxRetries
            },

            calculateDelay(): number {
              return this.baseDelay * Math.pow(1.5, this.retryCount)
            },

            reset() {
              this.retryCount = 0
              this.hasError = false
            },
          }
        }

        async start() {
          if (this.isActive) {
            throw new Error('Recognition is already active')
          }

          try {
            this.recognition.start()
            return { success: true }
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        }

        stop() {
          if (this.isActive) {
            this.recognition.stop()
          }
          this.retryManager.reset()
        }

        handleError(event: any) {
          this.retryManager.hasError = true
          this.emit('error', event)

          if (this.retryManager.shouldRetry(event.error)) {
            this.scheduleRetry(event.error)
          } else {
            this.emit('maxRetriesReached', event)
          }
        }

        scheduleRetry(reason: string) {
          const delay = this.retryManager.calculateDelay()
          this.retryManager.retryCount++

          this.emit('retryScheduled', { reason, delay, attempt: this.retryManager.retryCount })

          setTimeout(() => {
            this.executeRetry(reason)
          }, delay)
        }

        scheduleRestart(reason: string) {
          // Short delay for continuous mode restart
          setTimeout(() => {
            if (!this.isActive) {
              this.start()
            }
          }, 100)
        }

        executeRetry(reason: string) {
          this.emit('retryAttempt', { reason, attempt: this.retryManager.retryCount })
          this.start()
        }

        on(event: string, handler: Function) {
          if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, [])
          }
          this.eventHandlers.get(event).push(handler)
        }

        emit(event: string, data?: any) {
          const handlers = this.eventHandlers.get(event) || []
          handlers.forEach((handler: Function) => handler(data))
        }

        getStatus() {
          return {
            isActive: this.isActive,
            retryCount: this.retryManager.retryCount,
            maxRetries: this.retryManager.maxRetries,
            hasError: this.retryManager.hasError,
            continuous: this.recognition.continuous,
          }
        }
      }

      const speechRecognition = new SpeechRecognitionWithRetry()
      const events: any[] = []

      // Set up event listeners
      speechRecognition.on('recognitionStart', () => events.push('start'))
      speechRecognition.on('error', (event) => events.push(`error:${event.error}`))
      speechRecognition.on('retryScheduled', (data) => events.push(`retry:${data.reason}`))
      speechRecognition.on('retryAttempt', (data) => events.push(`attempt:${data.attempt}`))

      // Test normal start
      const startResult = await speechRecognition.start()
      expect(startResult.success).toBe(true)

      const status = speechRecognition.getStatus()
      expect(status.isActive).toBe(true)
      expect(status.retryCount).toBe(0)

      // Simulate no-speech error
      const mockRecognition = speechRecognition['recognition']
      mockRecognition.onerror({ error: 'no-speech' })

      expect(events).toContain('error:no-speech')
      expect(events).toContain('retry:no-speech')

      // Check retry status
      const retryStatus = speechRecognition.getStatus()
      expect(retryStatus.retryCount).toBe(1)
      expect(retryStatus.hasError).toBe(true)
    })

    it('should handle different types of speech recognition errors appropriately', () => {
      const errorTypeHandler = {
        getRetryStrategy(errorType: string): {
          shouldRetry: boolean
          maxAttempts: number
          baseDelay: number
          backoffMultiplier: number
          userMessage: string
        } {
          const strategies = {
            'no-speech': {
              shouldRetry: true,
              maxAttempts: 5,
              baseDelay: 1000,
              backoffMultiplier: 1.2,
              userMessage: 'No speech detected. Please try speaking again.',
            },
            'audio-capture': {
              shouldRetry: true,
              maxAttempts: 3,
              baseDelay: 2000,
              backoffMultiplier: 1.5,
              userMessage: 'Audio capture failed. Checking microphone...',
            },
            'network': {
              shouldRetry: true,
              maxAttempts: 4,
              baseDelay: 3000,
              backoffMultiplier: 2.0,
              userMessage: 'Network error. Retrying connection...',
            },
            'not-allowed': {
              shouldRetry: false,
              maxAttempts: 0,
              baseDelay: 0,
              backoffMultiplier: 1.0,
              userMessage: 'Microphone access denied. Please allow permissions.',
            },
            'service-not-allowed': {
              shouldRetry: false,
              maxAttempts: 0,
              baseDelay: 0,
              backoffMultiplier: 1.0,
              userMessage: 'Speech recognition service not available.',
            },
            'bad-grammar': {
              shouldRetry: false,
              maxAttempts: 0,
              baseDelay: 0,
              backoffMultiplier: 1.0,
              userMessage: 'Speech recognition configuration error.',
            },
          }

          return strategies[errorType] || {
            shouldRetry: true,
            maxAttempts: 2,
            baseDelay: 1500,
            backoffMultiplier: 1.5,
            userMessage: 'Speech recognition error. Retrying...',
          }
        },

        classifyError(error: any): {
          category: 'recoverable' | 'user_action_required' | 'permanent'
          severity: 'low' | 'medium' | 'high'
          impact: 'minimal' | 'moderate' | 'severe'
        } {
          const errorType = error.error || error.type || 'unknown'

          const classifications = {
            'no-speech': { category: 'recoverable' as const, severity: 'low' as const, impact: 'minimal' as const },
            'audio-capture': { category: 'recoverable' as const, severity: 'medium' as const, impact: 'moderate' as const },
            'network': { category: 'recoverable' as const, severity: 'medium' as const, impact: 'moderate' as const },
            'not-allowed': { category: 'user_action_required' as const, severity: 'high' as const, impact: 'severe' as const },
            'service-not-allowed': { category: 'permanent' as const, severity: 'high' as const, impact: 'severe' as const },
            'bad-grammar': { category: 'permanent' as const, severity: 'medium' as const, impact: 'moderate' as const },
          }

          return classifications[errorType] || {
            category: 'recoverable' as const,
            severity: 'medium' as const,
            impact: 'moderate' as const,
          }
        },

        getErrorAnalytics(errors: any[]): {
          totalErrors: number
          errorFrequency: Record<string, number>
          mostCommonError: string
          recoverableErrors: number
          permanentErrors: number
        } {
          const totalErrors = errors.length
          const errorFrequency = errors.reduce((acc, error) => {
            const type = error.error || error.type || 'unknown'
            acc[type] = (acc[type] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          const mostCommonError = Object.entries(errorFrequency)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none'

          const classifications = errors.map(error => this.classifyError(error))
          const recoverableErrors = classifications.filter(c => c.category === 'recoverable').length
          const permanentErrors = classifications.filter(c => c.category === 'permanent').length

          return {
            totalErrors,
            errorFrequency,
            mostCommonError,
            recoverableErrors,
            permanentErrors,
          }
        },
      }

      // Test retry strategies
      const noSpeechStrategy = errorTypeHandler.getRetryStrategy('no-speech')
      expect(noSpeechStrategy.shouldRetry).toBe(true)
      expect(noSpeechStrategy.maxAttempts).toBe(5)
      expect(noSpeechStrategy.baseDelay).toBe(1000)

      const permissionStrategy = errorTypeHandler.getRetryStrategy('not-allowed')
      expect(permissionStrategy.shouldRetry).toBe(false)
      expect(permissionStrategy.maxAttempts).toBe(0)

      // Test error classification
      const noSpeechClass = errorTypeHandler.classifyError({ error: 'no-speech' })
      expect(noSpeechClass.category).toBe('recoverable')
      expect(noSpeechClass.severity).toBe('low')

      const permissionClass = errorTypeHandler.classifyError({ error: 'not-allowed' })
      expect(permissionClass.category).toBe('user_action_required')
      expect(permissionClass.severity).toBe('high')

      // Test error analytics
      const sampleErrors = [
        { error: 'no-speech' },
        { error: 'no-speech' },
        { error: 'network' },
        { error: 'not-allowed' },
        { error: 'no-speech' },
      ]

      const analytics = errorTypeHandler.getErrorAnalytics(sampleErrors)
      expect(analytics.totalErrors).toBe(5)
      expect(analytics.mostCommonError).toBe('no-speech')
      expect(analytics.errorFrequency['no-speech']).toBe(3)
      expect(analytics.recoverableErrors).toBe(4) // 3 no-speech + 1 network
      expect(analytics.permanentErrors).toBe(0)
    })
  })
})