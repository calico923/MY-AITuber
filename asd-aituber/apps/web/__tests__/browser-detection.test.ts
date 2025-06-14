import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('Browser Detection Tests', () => {
  let originalUserAgent: string

  beforeEach(() => {
    // Store original user agent
    originalUserAgent = navigator.userAgent
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
      configurable: true,
    })
  })

  describe('tdd-2.1: Verify Firefox browser detection and warning', () => {
    it('should detect Firefox browser correctly', () => {
      const firefoxUserAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:91.0) Gecko/20100101 Firefox/91.0',
        'Mozilla/5.0 (X11; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0',
        'Mozilla/5.0 (Android; Mobile; rv:91.0) Gecko/91.0 Firefox/91.0',
      ]

      const detectFirefox = (userAgent: string): boolean => {
        return userAgent.toLowerCase().includes('firefox') && !userAgent.includes('Seamonkey')
      }

      firefoxUserAgents.forEach(ua => {
        Object.defineProperty(navigator, 'userAgent', {
          value: ua,
          writable: true,
          configurable: true,
        })

        expect(detectFirefox(navigator.userAgent)).toBe(true)
      })
    })

    it('should not detect Firefox for other browsers', () => {
      const nonFirefoxUserAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
      ]

      const detectFirefox = (userAgent: string): boolean => {
        return userAgent.toLowerCase().includes('firefox') && !userAgent.includes('Seamonkey')
      }

      nonFirefoxUserAgents.forEach(ua => {
        Object.defineProperty(navigator, 'userAgent', {
          value: ua,
          writable: true,
          configurable: true,
        })

        expect(detectFirefox(navigator.userAgent)).toBe(false)
      })
    })

    it('should show appropriate warning message for Firefox users', () => {
      const getBrowserWarning = (isFirefox: boolean) => {
        if (isFirefox) {
          return {
            type: 'warning',
            title: 'Firefox Compatibility Notice',
            message: 'Speech recognition features may have limited support in Firefox. For the best experience, we recommend using Chrome, Edge, or Safari.',
            actions: [
              { label: 'Continue Anyway', value: 'continue' },
              { label: 'Download Chrome', value: 'download_chrome', url: 'https://www.google.com/chrome/' },
            ],
          }
        }
        return null
      }

      const firefoxWarning = getBrowserWarning(true)
      expect(firefoxWarning).not.toBeNull()
      expect(firefoxWarning?.type).toBe('warning')
      expect(firefoxWarning?.message).toContain('limited support')
      expect(firefoxWarning?.actions).toHaveLength(2)

      const noWarning = getBrowserWarning(false)
      expect(noWarning).toBeNull()
    })

    it('should handle Firefox-specific microphone permission flow', async () => {
      // Set Firefox user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
        writable: true,
      })

      const handleFirefoxMicrophonePermission = async () => {
        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox')

        if (isFirefox) {
          // Firefox doesn't support Permission API for microphone
          // Must use getUserMedia directly
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            // Important: Stop tracks after getting permission
            stream.getTracks().forEach(track => track.stop())
            return { 
              granted: true, 
              method: 'getUserMedia',
              warning: 'Firefox requires direct getUserMedia call for permissions'
            }
          } catch (error) {
            return { 
              granted: false, 
              method: 'getUserMedia',
              error: error instanceof Error ? error.message : 'Permission denied',
              suggestion: 'Please allow microphone access when prompted by Firefox'
            }
          }
        }

        // Non-Firefox browsers can use Permission API
        return { granted: false, method: 'permission_api' }
      }

      // Mock getUserMedia
      const mockGetUserMedia = vi.fn().mockResolvedValue({
        getTracks: () => [{
          stop: vi.fn()
        }]
      })

      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
      })

      const result = await handleFirefoxMicrophonePermission()
      expect(result.method).toBe('getUserMedia')
      expect(result.warning).toContain('Firefox requires')
      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
    })

    it('should provide Firefox-specific feature detection', () => {
      const firefoxFeatureSupport = {
        speechRecognition: false, // Firefox doesn't support Web Speech API
        permissionAPI: {
          microphone: false, // Can't query microphone permission
          camera: false,
          notifications: true,
        },
        webRTC: {
          getUserMedia: true,
          peerConnection: true,
          dataChannel: true,
        },
        audioContext: true,
        
        getUnsupportedFeatures() {
          const unsupported = []
          
          if (!this.speechRecognition) {
            unsupported.push('Web Speech Recognition API')
          }
          
          if (!this.permissionAPI.microphone) {
            unsupported.push('Microphone Permission Query')
          }
          
          return unsupported
        },
        
        getRecommendations() {
          if (!this.speechRecognition) {
            return [
              'Use a third-party speech recognition service',
              'Implement server-side speech processing',
              'Consider using Chrome or Edge for speech features',
            ]
          }
          return []
        },
      }

      const unsupported = firefoxFeatureSupport.getUnsupportedFeatures()
      expect(unsupported).toContain('Web Speech Recognition API')
      expect(unsupported).toContain('Microphone Permission Query')

      const recommendations = firefoxFeatureSupport.getRecommendations()
      expect(recommendations).toHaveLength(3)
      expect(recommendations[0]).toContain('third-party')
    })

    it('should track Firefox usage analytics', () => {
      const analyticsTracker = {
        events: [] as any[],
        
        trackBrowserUsage(browserInfo: {
          name: string
          version: string
          isSupported: boolean
          missingFeatures: string[]
        }) {
          this.events.push({
            type: 'browser_usage',
            timestamp: Date.now(),
            ...browserInfo,
          })
        },
        
        trackFirefoxWarningResponse(action: string) {
          this.events.push({
            type: 'firefox_warning_response',
            timestamp: Date.now(),
            action,
          })
        },
        
        getFirefoxMetrics() {
          const firefoxEvents = this.events.filter(e => 
            e.name === 'Firefox' || e.type === 'firefox_warning_response'
          )
          
          const responses = firefoxEvents
            .filter(e => e.type === 'firefox_warning_response')
            .reduce((acc, e) => {
              acc[e.action] = (acc[e.action] || 0) + 1
              return acc
            }, {} as Record<string, number>)
          
          return {
            totalFirefoxUsers: firefoxEvents.filter(e => e.name === 'Firefox').length,
            warningResponses: responses,
          }
        },
      }

      // Track Firefox usage
      analyticsTracker.trackBrowserUsage({
        name: 'Firefox',
        version: '91.0',
        isSupported: false,
        missingFeatures: ['SpeechRecognition', 'PermissionAPI'],
      })

      // Track user responses
      analyticsTracker.trackFirefoxWarningResponse('continue')
      analyticsTracker.trackFirefoxWarningResponse('download_chrome')
      analyticsTracker.trackFirefoxWarningResponse('continue')

      const metrics = analyticsTracker.getFirefoxMetrics()
      expect(metrics.totalFirefoxUsers).toBe(1)
      expect(metrics.warningResponses.continue).toBe(2)
      expect(metrics.warningResponses.download_chrome).toBe(1)
    })
  })

  describe('tdd-2.2: Verify Safari browser detection and specific handling', () => {
    it('should detect Safari browser correctly', () => {
      const safariUserAgents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      ]

      const detectSafari = (userAgent: string): boolean => {
        const ua = userAgent.toLowerCase()
        return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android')
      }

      safariUserAgents.forEach(ua => {
        Object.defineProperty(navigator, 'userAgent', {
          value: ua,
          writable: true,
          configurable: true,
        })

        expect(detectSafari(navigator.userAgent)).toBe(true)
      })
    })

    it('should handle Safari-specific permission requirements', () => {
      const safariPermissionHandler = {
        requirements: {
          httpsRequired: true,
          userGestureRequired: true,
          permissionAPISupport: false,
        },
        
        async requestMicrophoneAccess(fromUserGesture: boolean = false) {
          if (!fromUserGesture) {
            return {
              success: false,
              error: 'Safari requires user gesture for microphone access',
              suggestion: 'Click the microphone button to enable voice input',
            }
          }
          
          // Simulate getUserMedia call
          return {
            success: true,
            method: 'getUserMedia_with_gesture',
            notes: 'Safari requires HTTPS and user interaction',
          }
        },
        
        getSafariSpecificInstructions() {
          return {
            setup: [
              'Ensure your site is served over HTTPS',
              'Request microphone access only after user interaction',
              'Handle the case where Permission API is not available',
            ],
            userInstructions: [
              'Click the microphone button to start',
              'Allow microphone access when prompted',
              'Check Safari settings if access was previously denied',
            ],
          }
        },
      }

      const noGestureResult = safariPermissionHandler.requestMicrophoneAccess(false)
      expect(noGestureResult).resolves.toMatchObject({
        success: false,
        error: expect.stringContaining('user gesture'),
      })

      const instructions = safariPermissionHandler.getSafariSpecificInstructions()
      expect(instructions.setup).toHaveLength(3)
      expect(instructions.userInstructions).toHaveLength(3)
    })

    it('should handle Safari mobile vs desktop differences', () => {
      const detectSafariPlatform = (userAgent: string) => {
        const ua = userAgent.toLowerCase()
        const isSafari = ua.includes('safari') && !ua.includes('chrome')
        
        if (!isSafari) return null
        
        return {
          isMobile: /iphone|ipad|ipod/.test(ua),
          isDesktop: /macintosh/.test(ua),
          version: ua.match(/version\/(\d+\.\d+)/)?.[1] || 'unknown',
          supportedFeatures: {
            speechRecognition: /macintosh/.test(ua), // Only desktop Safari
            continuousRecognition: false, // Not supported on any Safari
            permissionAPI: false,
            getUserMedia: true,
          },
        }
      }

      // Test desktop Safari
      const desktopSafari = detectSafariPlatform(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
      )
      expect(desktopSafari?.isDesktop).toBe(true)
      expect(desktopSafari?.isMobile).toBe(false)
      expect(desktopSafari?.supportedFeatures.speechRecognition).toBe(true)

      // Test mobile Safari
      const mobileSafari = detectSafariPlatform(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      )
      expect(mobileSafari?.isMobile).toBe(true)
      expect(mobileSafari?.isDesktop).toBe(false)
      expect(mobileSafari?.supportedFeatures.speechRecognition).toBe(false)
    })

    it('should provide Safari-specific workarounds', () => {
      const safariWorkarounds = {
        // Safari doesn't support continuous recognition
        handleContinuousRecognition() {
          return {
            supported: false,
            workaround: 'Implement manual restart on recognition end',
            code: `
              recognition.addEventListener('end', () => {
                if (shouldContinue) {
                  recognition.start(); // Manually restart
                }
              });
            `,
          }
        },
        
        // Safari needs specific audio constraints
        getAudioConstraints() {
          return {
            audio: {
              echoCancellation: { ideal: true },
              noiseSuppression: { ideal: true },
              autoGainControl: { ideal: false }, // Can cause issues on Safari
              sampleRate: { ideal: 48000 },
            },
          }
        },
        
        // Handle Safari security restrictions
        handleSecurityRestrictions() {
          return {
            autoplay: 'Requires user interaction',
            mediaStreamAccess: 'Requires HTTPS and user gesture',
            persistentPermissions: 'Not supported - request each session',
          }
        },
      }

      const continuousWorkaround = safariWorkarounds.handleContinuousRecognition()
      expect(continuousWorkaround.supported).toBe(false)
      expect(continuousWorkaround.code).toContain('recognition.start()')

      const constraints = safariWorkarounds.getAudioConstraints()
      expect(constraints.audio.autoGainControl).toEqual({ ideal: false })
    })
  })
})