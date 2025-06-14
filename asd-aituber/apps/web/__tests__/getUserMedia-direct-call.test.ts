import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('getUserMedia Direct Call Tests', () => {
  let originalMediaDevices: MediaDevices | undefined
  let mockGetUserMedia: any

  beforeEach(() => {
    // Store original mediaDevices
    originalMediaDevices = navigator.mediaDevices
    
    // Create mock getUserMedia
    mockGetUserMedia = vi.fn()
    
    vi.clearAllMocks()
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

  describe('tdd-2.3: Verify getUserMedia direct call with proper error handling', () => {
    it('should successfully call getUserMedia with audio constraints', async () => {
      const mockAudioTrack = {
        id: 'audio-track-1',
        kind: 'audio',
        label: 'Mock Microphone',
        enabled: true,
        muted: false,
        readyState: 'live',
        stop: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getCapabilities: vi.fn(() => ({
          deviceId: 'mock-device',
          groupId: 'mock-group',
          echoCancellation: [true, false],
          noiseSuppression: [true, false],
          autoGainControl: [true, false],
        })),
        getSettings: vi.fn(() => ({
          deviceId: 'mock-device',
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        })),
      }

      const mockStream = {
        id: 'mock-stream-id',
        active: true,
        getAudioTracks: vi.fn(() => [mockAudioTrack]),
        getVideoTracks: vi.fn(() => []),
        getTracks: vi.fn(() => [mockAudioTrack]),
        addTrack: vi.fn(),
        removeTrack: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }

      mockGetUserMedia.mockResolvedValue(mockStream)

      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
        configurable: true,
      })

      const directGetUserMedia = async (constraints: MediaStreamConstraints) => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints)
          
          return {
            success: true,
            stream,
            audioTracks: stream.getAudioTracks(),
            videoTracks: stream.getVideoTracks(),
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      }

      const result = await directGetUserMedia({ audio: true })

      expect(result.success).toBe(true)
      expect(result.stream).toBeDefined()
      expect(result.audioTracks).toHaveLength(1)
      expect(result.audioTracks![0].kind).toBe('audio')
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
    })

    it('should handle NotAllowedError for permission denial', async () => {
      const notAllowedError = new DOMException('Permission denied', 'NotAllowedError')
      mockGetUserMedia.mockRejectedValue(notAllowedError)

      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
      })

      const handleGetUserMediaError = async (constraints: MediaStreamConstraints) => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints)
          return { success: true, stream }
        } catch (error) {
          if (error instanceof DOMException) {
            switch (error.name) {
              case 'NotAllowedError':
                return {
                  success: false,
                  errorType: 'permission_denied',
                  message: 'Microphone access was denied. Please allow microphone permissions.',
                  userAction: 'Check browser settings and allow microphone access',
                  canRetry: true,
                }
              default:
                return {
                  success: false,
                  errorType: 'unknown_dom_exception',
                  message: error.message,
                }
            }
          }
          
          return {
            success: false,
            errorType: 'unknown_error',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
          }
        }
      }

      const result = await handleGetUserMediaError({ audio: true })

      expect(result.success).toBe(false)
      expect(result.errorType).toBe('permission_denied')
      expect(result.message).toContain('denied')
      expect(result.canRetry).toBe(true)
    })

    it('should handle NotFoundError for missing devices', async () => {
      const notFoundError = new DOMException('No audio input device found', 'NotFoundError')
      mockGetUserMedia.mockRejectedValue(notFoundError)

      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
      })

      const handleDeviceError = async () => {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch (error) {
          if (error instanceof DOMException && error.name === 'NotFoundError') {
            return {
              errorType: 'no_device',
              message: 'No microphone found. Please connect a microphone and try again.',
              suggestions: [
                'Check if your microphone is connected',
                'Try a different microphone',
                'Check audio device settings in your system',
              ],
            }
          }
          throw error
        }
      }

      const result = await handleDeviceError()

      expect(result.errorType).toBe('no_device')
      expect(result.suggestions).toHaveLength(3)
      expect(result.message).toContain('No microphone found')
    })

    it('should handle OverconstrainedError for unsupported constraints', async () => {
      const overconstrainedError = new DOMException(
        'Constraints could not be satisfied',
        'OverconstrainedError'
      )
      
      // Add constraint property to simulate overconstrained error
      ;(overconstrainedError as any).constraint = 'sampleRate'

      mockGetUserMedia.mockRejectedValue(overconstrainedError)

      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
      })

      const handleConstraintError = async (constraints: MediaStreamConstraints) => {
        try {
          await navigator.mediaDevices.getUserMedia(constraints)
        } catch (error) {
          if (error instanceof DOMException && error.name === 'OverconstrainedError') {
            const constraint = (error as any).constraint || 'unknown'
            
            return {
              errorType: 'constraint_error',
              failedConstraint: constraint,
              message: `The constraint "${constraint}" could not be satisfied.`,
              suggestion: 'Try using less restrictive audio constraints',
              fallbackConstraints: { audio: true }, // Simple fallback
            }
          }
          throw error
        }
      }

      const result = await handleConstraintError({
        audio: {
          sampleRate: { exact: 96000 }, // Unrealistic constraint
          channelCount: { exact: 8 },
        },
      })

      expect(result.errorType).toBe('constraint_error')
      expect(result.failedConstraint).toBe('sampleRate')
      expect(result.fallbackConstraints).toEqual({ audio: true })
    })

    it('should handle AbortError for operation cancellation', async () => {
      const abortError = new DOMException('Operation was aborted', 'AbortError')
      mockGetUserMedia.mockRejectedValue(abortError)

      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
      })

      const handleAbortError = async () => {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return {
              errorType: 'operation_aborted',
              message: 'Microphone access request was cancelled',
              canRetry: true,
              retryDelay: 1000, // Wait 1 second before retry
            }
          }
          throw error
        }
      }

      const result = await handleAbortError()

      expect(result.errorType).toBe('operation_aborted')
      expect(result.canRetry).toBe(true)
      expect(result.retryDelay).toBe(1000)
    })

    it('should handle NotReadableError for hardware issues', async () => {
      const notReadableError = new DOMException(
        'Could not start audio source',
        'NotReadableError'
      )
      mockGetUserMedia.mockRejectedValue(notReadableError)

      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
      })

      const handleHardwareError = async () => {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch (error) {
          if (error instanceof DOMException && error.name === 'NotReadableError') {
            return {
              errorType: 'hardware_error',
              message: 'Microphone hardware error. The device may be in use by another application.',
              troubleshooting: [
                'Close other applications that might be using the microphone',
                'Disconnect and reconnect your microphone',
                'Try restarting your browser',
                'Check if the microphone works in other applications',
              ],
            }
          }
          throw error
        }
      }

      const result = await handleHardwareError()

      expect(result.errorType).toBe('hardware_error')
      expect(result.troubleshooting).toHaveLength(4)
      expect(result.message).toContain('hardware error')
    })

    it('should implement comprehensive error classification', async () => {
      class GetUserMediaErrorHandler {
        static classify(error: unknown) {
          if (!(error instanceof DOMException)) {
            return {
              category: 'unknown',
              severity: 'medium',
              userFriendly: 'An unexpected error occurred',
              technical: error instanceof Error ? error.message : 'Unknown error',
            }
          }

          switch (error.name) {
            case 'NotAllowedError':
              return {
                category: 'permission',
                severity: 'high',
                userFriendly: 'Microphone access was denied',
                technical: error.message,
                canRetry: true,
                retryMethod: 'permission_request',
              }

            case 'NotFoundError':
              return {
                category: 'device',
                severity: 'high',
                userFriendly: 'No microphone device found',
                technical: error.message,
                canRetry: false,
                suggestions: ['Connect a microphone', 'Check device settings'],
              }

            case 'OverconstrainedError':
              return {
                category: 'constraints',
                severity: 'medium',
                userFriendly: 'Audio settings are not supported',
                technical: error.message,
                canRetry: true,
                retryMethod: 'fallback_constraints',
              }

            case 'NotReadableError':
              return {
                category: 'hardware',
                severity: 'high',
                userFriendly: 'Microphone hardware error',
                technical: error.message,
                canRetry: true,
                retryMethod: 'device_refresh',
              }

            case 'AbortError':
              return {
                category: 'operation',
                severity: 'low',
                userFriendly: 'Operation was cancelled',
                technical: error.message,
                canRetry: true,
                retryMethod: 'immediate',
              }

            case 'SecurityError':
              return {
                category: 'security',
                severity: 'high',
                userFriendly: 'Security error - ensure HTTPS is used',
                technical: error.message,
                canRetry: false,
                requirements: ['HTTPS protocol', 'Secure context'],
              }

            default:
              return {
                category: 'dom_exception',
                severity: 'medium',
                userFriendly: 'Browser compatibility issue',
                technical: `${error.name}: ${error.message}`,
                canRetry: true,
                retryMethod: 'fallback',
              }
          }
        }

        static async callWithErrorHandling(constraints: MediaStreamConstraints) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints)
            return {
              success: true,
              stream,
              error: null,
            }
          } catch (error) {
            const classification = this.classify(error)
            
            return {
              success: false,
              stream: null,
              error: {
                ...classification,
                originalError: error,
                timestamp: new Date().toISOString(),
              },
            }
          }
        }
      }

      // Test different error scenarios
      const testCases = [
        {
          error: new DOMException('Permission denied', 'NotAllowedError'),
          expectedCategory: 'permission',
        },
        {
          error: new DOMException('No device found', 'NotFoundError'),
          expectedCategory: 'device',
        },
        {
          error: new DOMException('Constraints failed', 'OverconstrainedError'),
          expectedCategory: 'constraints',
        },
        {
          error: new Error('Network error'),
          expectedCategory: 'unknown',
        },
      ]

      testCases.forEach(({ error, expectedCategory }) => {
        const classification = GetUserMediaErrorHandler.classify(error)
        expect(classification.category).toBe(expectedCategory)
        expect(classification.userFriendly).toBeTruthy()
        expect(classification.technical).toBeTruthy()
      })

      // Test successful call
      mockGetUserMedia.mockResolvedValue({
        getAudioTracks: () => [{ kind: 'audio' }],
        getTracks: () => [{ kind: 'audio' }],
      })

      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
      })

      const successResult = await GetUserMediaErrorHandler.callWithErrorHandling({ audio: true })
      expect(successResult.success).toBe(true)
      expect(successResult.error).toBe(null)
    })

    it('should provide retry mechanisms for different error types', async () => {
      const retryManager = {
        maxRetries: 3,
        retryDelays: [1000, 2000, 5000], // Progressive backoff

        async retryGetUserMedia(
          constraints: MediaStreamConstraints,
          errorHandler: (error: any) => any
        ) {
          let lastError: any
          
          for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
              const stream = await navigator.mediaDevices.getUserMedia(constraints)
              return {
                success: true,
                stream,
                attempts: attempt + 1,
              }
            } catch (error) {
              lastError = error
              
              const classification = errorHandler(error)
              
              // Don't retry if error type doesn't support it
              if (!classification.canRetry || attempt === this.maxRetries) {
                break
              }
              
              // Apply retry strategy based on error type
              if (classification.retryMethod === 'fallback_constraints') {
                // Simplify constraints for next attempt
                constraints = { audio: true }
              } else if (classification.retryMethod === 'device_refresh') {
                // Could implement device refresh logic here
              }
              
              // Wait before retry
              if (this.retryDelays[attempt]) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelays[attempt]))
              }
            }
          }
          
          return {
            success: false,
            error: lastError,
            attempts: this.maxRetries + 1,
          }
        },
      }

      // Mock a scenario where first two attempts fail, third succeeds
      let callCount = 0
      mockGetUserMedia.mockImplementation(() => {
        callCount++
        if (callCount <= 2) {
          return Promise.reject(new DOMException('Device busy', 'NotReadableError'))
        }
        return Promise.resolve({
          getAudioTracks: () => [{ kind: 'audio' }],
        })
      })

      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
      })

      const result = await retryManager.retryGetUserMedia(
        { audio: true },
        (error: any) => ({
          canRetry: true,
          retryMethod: 'device_refresh',
        })
      )

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(3)
      expect(mockGetUserMedia).toHaveBeenCalledTimes(3)
    })

    it('should validate constraints before getUserMedia call', () => {
      const validateAudioConstraints = (constraints: MediaStreamConstraints) => {
        const errors: string[] = []
        
        if (!constraints.audio) {
          errors.push('Audio constraints are required')
          return { valid: false, errors }
        }
        
        if (typeof constraints.audio === 'object') {
          const audioConstraints = constraints.audio
          
          // Check sample rate
          if (audioConstraints.sampleRate) {
            const sampleRate = audioConstraints.sampleRate
            if (typeof sampleRate === 'object' && sampleRate.exact) {
              if (sampleRate.exact > 48000) {
                errors.push('Sample rate too high (max 48000)')
              }
              if (sampleRate.exact < 8000) {
                errors.push('Sample rate too low (min 8000)')
              }
            }
          }
          
          // Check channel count
          if (audioConstraints.channelCount) {
            const channelCount = audioConstraints.channelCount
            if (typeof channelCount === 'object' && channelCount.exact) {
              if (channelCount.exact > 2) {
                errors.push('Channel count too high (max 2 for most devices)')
              }
            }
          }
        }
        
        return {
          valid: errors.length === 0,
          errors,
          sanitized: errors.length > 0 ? { audio: true } : constraints,
        }
      }

      // Test valid constraints
      const validResult = validateAudioConstraints({ audio: true })
      expect(validResult.valid).toBe(true)
      expect(validResult.errors).toHaveLength(0)

      // Test invalid constraints
      const invalidResult = validateAudioConstraints({
        audio: {
          sampleRate: { exact: 96000 },
          channelCount: { exact: 8 },
        },
      })
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.errors).toContain('Sample rate too high (max 48000)')
      expect(invalidResult.errors).toContain('Channel count too high (max 2 for most devices)')
      expect(invalidResult.sanitized).toEqual({ audio: true })
    })
  })
})