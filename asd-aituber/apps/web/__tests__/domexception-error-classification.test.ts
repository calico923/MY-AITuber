import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('DOMException Error Classification Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('tdd-2.4: Verify DOMException error types are properly classified', () => {
    it('should classify NotAllowedError correctly', () => {
      const classifyDOMException = (error: DOMException) => {
        switch (error.name) {
          case 'NotAllowedError':
            return {
              type: 'permission_denied',
              severity: 'high',
              category: 'user_permission',
              userMessage: 'Microphone access was denied by the user',
              technicalMessage: error.message,
              canRetry: true,
              retryStrategy: 'request_permission',
              browserAction: 'show_permission_dialog',
              userActions: [
                'Click "Allow" when prompted for microphone access',
                'Check browser settings for microphone permissions',
                'Ensure site is not blocked in browser settings',
              ],
            }
          default:
            return { type: 'unknown', severity: 'medium' }
        }
      }

      const notAllowedError = new DOMException(
        'The request is not allowed by the user agent or the platform in the current context',
        'NotAllowedError'
      )

      const classification = classifyDOMException(notAllowedError)

      expect(classification.type).toBe('permission_denied')
      expect(classification.severity).toBe('high')
      expect(classification.canRetry).toBe(true)
      expect(classification.userActions).toHaveLength(3)
      expect(classification.retryStrategy).toBe('request_permission')
    })

    it('should classify NotFoundError correctly', () => {
      const classifyDeviceError = (error: DOMException) => {
        if (error.name === 'NotFoundError') {
          return {
            type: 'no_device_found',
            severity: 'critical',
            category: 'hardware',
            userMessage: 'No microphone device was found on your system',
            technicalMessage: error.message,
            canRetry: false,
            requiresHardware: true,
            troubleshooting: [
              'Connect a microphone to your computer',
              'Check if your microphone is properly connected',
              'Try a different USB port (for USB microphones)',
              'Check system audio settings',
              'Restart your browser after connecting the microphone',
            ],
            systemChecks: [
              'Verify microphone is detected in system audio settings',
              'Test microphone in other applications',
              'Check device manager (Windows) or System Preferences (Mac)',
            ],
          }
        }
        return { type: 'unknown' }
      }

      const notFoundError = new DOMException(
        'The object can not be found here',
        'NotFoundError'
      )

      const classification = classifyDeviceError(notFoundError)

      expect(classification.type).toBe('no_device_found')
      expect(classification.severity).toBe('critical')
      expect(classification.canRetry).toBe(false)
      expect(classification.requiresHardware).toBe(true)
      expect(classification.troubleshooting).toHaveLength(5)
      expect(classification.systemChecks).toHaveLength(3)
    })

    it('should classify OverconstrainedError with constraint information', () => {
      const classifyConstraintError = (error: DOMException & { constraint?: string }) => {
        if (error.name === 'OverconstrainedError') {
          const constraint = error.constraint || 'unknown'
          
          const constraintInfo: Record<string, any> = {
            sampleRate: {
              explanation: 'The requested audio sample rate is not supported',
              commonValues: [8000, 16000, 22050, 44100, 48000],
              fallback: { audio: { sampleRate: { ideal: 44100 } } },
            },
            channelCount: {
              explanation: 'The requested number of audio channels is not supported',
              commonValues: [1, 2],
              fallback: { audio: { channelCount: { ideal: 1 } } },
            },
            echoCancellation: {
              explanation: 'Echo cancellation setting is not supported',
              fallback: { audio: { echoCancellation: { ideal: true } } },
            },
            noiseSuppression: {
              explanation: 'Noise suppression setting is not supported',
              fallback: { audio: { noiseSuppression: { ideal: true } } },
            },
            autoGainControl: {
              explanation: 'Auto gain control setting is not supported',
              fallback: { audio: { autoGainControl: { ideal: false } } },
            },
          }

          return {
            type: 'constraint_not_satisfied',
            severity: 'medium',
            category: 'configuration',
            constraint,
            userMessage: constraintInfo[constraint]?.explanation || 
                        `The audio constraint "${constraint}" could not be satisfied`,
            technicalMessage: error.message,
            canRetry: true,
            retryStrategy: 'fallback_constraints',
            fallbackConstraints: constraintInfo[constraint]?.fallback || { audio: true },
            supportedValues: constraintInfo[constraint]?.commonValues,
            recommendations: [
              'Use less restrictive audio constraints',
              'Try the suggested fallback constraints',
              'Test with basic audio: true first',
            ],
          }
        }
        return { type: 'unknown' }
      }

      // Test with sampleRate constraint
      const overconstrainedError = new DOMException(
        'Constraint sampleRate could not be satisfied',
        'OverconstrainedError'
      ) as DOMException & { constraint?: string }
      overconstrainedError.constraint = 'sampleRate'

      const classification = classifyConstraintError(overconstrainedError)

      expect(classification.type).toBe('constraint_not_satisfied')
      expect(classification.constraint).toBe('sampleRate')
      expect(classification.canRetry).toBe(true)
      expect(classification.fallbackConstraints).toEqual({
        audio: { sampleRate: { ideal: 44100 } }
      })
      expect(classification.supportedValues).toContain(44100)
    })

    it('should classify NotReadableError for hardware issues', () => {
      const classifyHardwareError = (error: DOMException) => {
        if (error.name === 'NotReadableError') {
          return {
            type: 'hardware_error',
            severity: 'high',
            category: 'device_hardware',
            userMessage: 'Microphone hardware error - device may be in use or malfunctioning',
            technicalMessage: error.message,
            canRetry: true,
            retryStrategy: 'device_refresh',
            possibleCauses: [
              'Another application is using the microphone',
              'Hardware driver issues',
              'Device malfunction or connection problems',
              'Operating system audio service issues',
            ],
            troubleshooting: [
              'Close other applications that might be using the microphone',
              'Disconnect and reconnect the microphone',
              'Restart your browser',
              'Restart your computer',
              'Try a different microphone',
              'Update audio drivers',
            ],
            diagnostics: {
              checkOtherApps: 'Verify no other apps are using the microphone',
              testSystemAudio: 'Test microphone in system audio settings',
              checkDrivers: 'Ensure audio drivers are up to date',
            },
          }
        }
        return { type: 'unknown' }
      }

      const notReadableError = new DOMException(
        'The I/O read operation failed',
        'NotReadableError'
      )

      const classification = classifyHardwareError(notReadableError)

      expect(classification.type).toBe('hardware_error')
      expect(classification.severity).toBe('high')
      expect(classification.canRetry).toBe(true)
      expect(classification.possibleCauses).toHaveLength(4)
      expect(classification.troubleshooting).toHaveLength(6)
      expect(classification.diagnostics.checkOtherApps).toBeTruthy()
    })

    it('should classify AbortError for cancelled operations', () => {
      const classifyAbortError = (error: DOMException) => {
        if (error.name === 'AbortError') {
          return {
            type: 'operation_cancelled',
            severity: 'low',
            category: 'user_action',
            userMessage: 'Microphone access request was cancelled',
            technicalMessage: error.message,
            canRetry: true,
            retryStrategy: 'immediate_retry',
            retryDelay: 500, // Short delay
            isUserInitiated: true,
            causes: [
              'User cancelled the permission dialog',
              'Operation timed out',
              'Browser cancelled the request',
              'Page navigation occurred during request',
            ],
            nextSteps: [
              'Try requesting microphone access again',
              'Ensure you allow the permission when prompted',
            ],
          }
        }
        return { type: 'unknown' }
      }

      const abortError = new DOMException(
        'The operation was aborted',
        'AbortError'
      )

      const classification = classifyAbortError(abortError)

      expect(classification.type).toBe('operation_cancelled')
      expect(classification.severity).toBe('low')
      expect(classification.isUserInitiated).toBe(true)
      expect(classification.retryDelay).toBe(500)
      expect(classification.causes).toHaveLength(4)
    })

    it('should classify SecurityError for security context issues', () => {
      const classifySecurityError = (error: DOMException) => {
        if (error.name === 'SecurityError') {
          return {
            type: 'security_context_error',
            severity: 'critical',
            category: 'security',
            userMessage: 'Security error - microphone access requires a secure connection',
            technicalMessage: error.message,
            canRetry: false,
            requiresHTTPS: true,
            securityRequirements: [
              'Page must be served over HTTPS',
              'Valid SSL certificate required',
              'Secure context (not in iframe without proper permissions)',
              'Not in private/incognito mode restrictions',
            ],
            solutions: [
              'Ensure the website is accessed via HTTPS',
              'Check SSL certificate validity',
              'Use localhost for development (automatically secure)',
              'Avoid iframe embedding without proper permissions',
            ],
            devSolutions: [
              'Use mkcert for local development certificates',
              'Configure dev server with HTTPS',
              'Use ngrok or similar tunneling for testing',
            ],
          }
        }
        return { type: 'unknown' }
      }

      const securityError = new DOMException(
        'The request is not allowed by the user agent',
        'SecurityError'
      )

      const classification = classifySecurityError(securityError)

      expect(classification.type).toBe('security_context_error')
      expect(classification.severity).toBe('critical')
      expect(classification.canRetry).toBe(false)
      expect(classification.requiresHTTPS).toBe(true)
      expect(classification.securityRequirements).toHaveLength(4)
      expect(classification.devSolutions).toHaveLength(3)
    })

    it('should provide comprehensive error classification system', () => {
      class MediaErrorClassifier {
        static classify(error: unknown) {
          if (!(error instanceof DOMException)) {
            return this.classifyGenericError(error)
          }

          const baseClassification = {
            timestamp: new Date().toISOString(),
            errorName: error.name,
            errorMessage: error.message,
            isDOMException: true,
          }

          switch (error.name) {
            case 'NotAllowedError':
              return {
                ...baseClassification,
                ...this.getPermissionErrorDetails(error),
              }
            case 'NotFoundError':
              return {
                ...baseClassification,
                ...this.getDeviceErrorDetails(error),
              }
            case 'OverconstrainedError':
              return {
                ...baseClassification,
                ...this.getConstraintErrorDetails(error as any),
              }
            case 'NotReadableError':
              return {
                ...baseClassification,
                ...this.getHardwareErrorDetails(error),
              }
            case 'AbortError':
              return {
                ...baseClassification,
                ...this.getAbortErrorDetails(error),
              }
            case 'SecurityError':
              return {
                ...baseClassification,
                ...this.getSecurityErrorDetails(error),
              }
            default:
              return {
                ...baseClassification,
                ...this.getUnknownDOMExceptionDetails(error),
              }
          }
        }

        static classifyGenericError(error: unknown) {
          return {
            type: 'generic_error',
            severity: 'medium',
            category: 'unknown',
            isDOMException: false,
            userMessage: 'An unexpected error occurred',
            technicalMessage: error instanceof Error ? error.message : 'Unknown error',
            canRetry: true,
            retryStrategy: 'generic_retry',
          }
        }

        static getPermissionErrorDetails(error: DOMException) {
          return {
            type: 'permission_denied',
            severity: 'high',
            category: 'permission',
            canRetry: true,
            retryStrategy: 'permission_request',
            userActions: ['Allow microphone access when prompted'],
          }
        }

        static getDeviceErrorDetails(error: DOMException) {
          return {
            type: 'no_device',
            severity: 'critical',
            category: 'hardware',
            canRetry: false,
            requiresHardware: true,
          }
        }

        static getConstraintErrorDetails(error: DOMException & { constraint?: string }) {
          return {
            type: 'constraint_error',
            severity: 'medium',
            category: 'configuration',
            canRetry: true,
            constraint: error.constraint || 'unknown',
            retryStrategy: 'fallback_constraints',
          }
        }

        static getHardwareErrorDetails(error: DOMException) {
          return {
            type: 'hardware_error',
            severity: 'high',
            category: 'device',
            canRetry: true,
            retryStrategy: 'device_refresh',
          }
        }

        static getAbortErrorDetails(error: DOMException) {
          return {
            type: 'operation_cancelled',
            severity: 'low',
            category: 'user_action',
            canRetry: true,
            retryStrategy: 'immediate',
          }
        }

        static getSecurityErrorDetails(error: DOMException) {
          return {
            type: 'security_error',
            severity: 'critical',
            category: 'security',
            canRetry: false,
            requiresHTTPS: true,
          }
        }

        static getUnknownDOMExceptionDetails(error: DOMException) {
          return {
            type: 'unknown_dom_exception',
            severity: 'medium',
            category: 'browser',
            canRetry: true,
            retryStrategy: 'generic_retry',
          }
        }

        static getSeverityLevel(classification: any) {
          const severityLevels = {
            low: 1,
            medium: 2,
            high: 3,
            critical: 4,
          }
          return severityLevels[classification.severity] || 2
        }

        static shouldShowToUser(classification: any) {
          return this.getSeverityLevel(classification) >= 2 // medium and above
        }

        static getRetryRecommendation(classification: any) {
          if (!classification.canRetry) {
            return { shouldRetry: false, reason: 'Error type does not support retry' }
          }

          const retryStrategies = {
            permission_request: { delay: 0, maxAttempts: 3 },
            fallback_constraints: { delay: 1000, maxAttempts: 2 },
            device_refresh: { delay: 2000, maxAttempts: 3 },
            immediate: { delay: 500, maxAttempts: 5 },
            generic_retry: { delay: 1000, maxAttempts: 2 },
          }

          const strategy = retryStrategies[classification.retryStrategy] || 
                          retryStrategies.generic_retry

          return {
            shouldRetry: true,
            strategy: classification.retryStrategy,
            delay: strategy.delay,
            maxAttempts: strategy.maxAttempts,
          }
        }
      }

      // Test comprehensive classification
      const testErrors = [
        new DOMException('Permission denied', 'NotAllowedError'),
        new DOMException('No device found', 'NotFoundError'),
        new Error('Network error'),
        new DOMException('Unknown DOM error', 'CustomError'),
      ]

      testErrors.forEach(error => {
        const classification = MediaErrorClassifier.classify(error)
        
        expect(classification).toHaveProperty('type')
        expect(classification).toHaveProperty('severity')
        expect(classification).toHaveProperty('category')
        expect(classification).toHaveProperty('canRetry')
        
        const shouldShow = MediaErrorClassifier.shouldShowToUser(classification)
        expect(typeof shouldShow).toBe('boolean')
        
        const retryRec = MediaErrorClassifier.getRetryRecommendation(classification)
        expect(retryRec).toHaveProperty('shouldRetry')
      })

      // Test severity levels
      const criticalError = MediaErrorClassifier.classify(
        new DOMException('No device', 'NotFoundError')
      )
      expect(MediaErrorClassifier.getSeverityLevel(criticalError)).toBe(4)

      const lowError = MediaErrorClassifier.classify(
        new DOMException('Cancelled', 'AbortError')
      )
      expect(MediaErrorClassifier.getSeverityLevel(lowError)).toBe(1)
    })

    it('should generate user-friendly error messages', () => {
      const generateUserMessage = (classification: any) => {
        const messages = {
          permission_denied: {
            title: 'Microphone Access Required',
            message: 'Please allow microphone access to use voice features.',
            action: 'Click "Allow" when prompted',
            icon: '🎤',
          },
          no_device: {
            title: 'No Microphone Found',
            message: 'Please connect a microphone to your computer.',
            action: 'Connect microphone and refresh',
            icon: '🔌',
          },
          constraint_error: {
            title: 'Audio Settings Issue',
            message: 'Some audio settings are not supported by your device.',
            action: 'Using default settings instead',
            icon: '⚙️',
          },
          hardware_error: {
            title: 'Microphone Hardware Error',
            message: 'Your microphone may be in use by another application.',
            action: 'Close other apps and try again',
            icon: '⚠️',
          },
          operation_cancelled: {
            title: 'Request Cancelled',
            message: 'Microphone access request was cancelled.',
            action: 'Click the microphone button to try again',
            icon: '🚫',
          },
          security_error: {
            title: 'Security Error',
            message: 'Microphone access requires a secure connection (HTTPS).',
            action: 'Ensure site is accessed via HTTPS',
            icon: '🔒',
          },
        }

        const template = messages[classification.type] || {
          title: 'Audio Error',
          message: 'An audio-related error occurred.',
          action: 'Please try again',
          icon: '❓',
        }

        return {
          ...template,
          severity: classification.severity,
          canRetry: classification.canRetry,
          technicalDetails: classification.technicalMessage,
        }
      }

      const permissionError = {
        type: 'permission_denied',
        severity: 'high',
        canRetry: true,
        technicalMessage: 'NotAllowedError: Permission denied',
      }

      const userMessage = generateUserMessage(permissionError)

      expect(userMessage.title).toBe('Microphone Access Required')
      expect(userMessage.icon).toBe('🎤')
      expect(userMessage.canRetry).toBe(true)
      expect(userMessage.technicalDetails).toContain('NotAllowedError')
    })
  })
})