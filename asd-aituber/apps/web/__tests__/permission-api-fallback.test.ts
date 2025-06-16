import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('Permission API Fallback Tests', () => {
  let originalPermissions: Permissions | undefined
  let originalMediaDevices: MediaDevices | undefined

  beforeEach(() => {
    // Store original APIs
    originalPermissions = navigator.permissions
    originalMediaDevices = navigator.mediaDevices
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original APIs
    if (originalPermissions) {
      Object.defineProperty(navigator, 'permissions', {
        value: originalPermissions,
        writable: true,
        configurable: true,
      })
    }
    
    if (originalMediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: originalMediaDevices,
        writable: true,
        configurable: true,
      })
    }
  })

  describe('tdd-2.5: Verify Permission API fallback when not available', () => {
    it('should detect when Permission API is not available', () => {
      // Remove permissions API
      Object.defineProperty(navigator, 'permissions', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const checkPermissionAPISupport = () => {
        return {
          available: 'permissions' in navigator && navigator.permissions !== undefined,
          querySupported: 'permissions' in navigator && 
                         navigator.permissions && 
                         typeof navigator.permissions.query === 'function',
          microphoneQuerySupported: false, // Will be checked separately
        }
      }

      const support = checkPermissionAPISupport()

      expect(support.available).toBe(false)
      expect(support.querySupported).toBe(false)
    })

    it('should detect when microphone permission query is not supported', async () => {
      // Mock permissions API without microphone support
      const mockPermissions = {
        query: vi.fn().mockImplementation((descriptor: PermissionDescriptor) => {
          if (descriptor.name === 'microphone') {
            return Promise.reject(new TypeError('Permission name not supported'))
          }
          return Promise.resolve({ state: 'granted' })
        }),
      }

      Object.defineProperty(navigator, 'permissions', {
        value: mockPermissions,
        writable: true,
        configurable: true,
      })

      const checkMicrophonePermissionSupport = async () => {
        try {
          await navigator.permissions.query({ name: 'microphone' as PermissionName })
          return { supported: true, error: null }
        } catch (error) {
          return {
            supported: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            fallbackRequired: true,
          }
        }
      }

      const result = await checkMicrophonePermissionSupport()

      expect(result.supported).toBe(false)
      expect(result.fallbackRequired).toBe(true)
      expect(result.error).toContain('Permission name not supported')
    })

    it('should implement fallback to getUserMedia for permission checking', async () => {
      // Mock environment without Permission API
      Object.defineProperty(navigator, 'permissions', {
        value: undefined,
        writable: true,
      })

      const mockGetUserMedia = vi.fn()
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
      })

      class PermissionManager {
        async checkMicrophonePermission(): Promise<{
          state: 'granted' | 'denied' | 'prompt'
          method: 'permission_api' | 'getUserMedia_fallback'
          reliable: boolean
        }> {
          // Try Permission API first
          if (this.isPermissionAPIAvailable()) {
            try {
              const permission = await navigator.permissions.query({ 
                name: 'microphone' as PermissionName 
              })
              return {
                state: permission.state,
                method: 'permission_api',
                reliable: true,
              }
            } catch (error) {
              // Fall through to getUserMedia fallback
            }
          }

          // Fallback to getUserMedia
          return this.checkWithGetUserMedia()
        }

        private isPermissionAPIAvailable(): boolean {
          return 'permissions' in navigator && 
                 navigator.permissions !== undefined &&
                 typeof navigator.permissions.query === 'function'
        }

        private async checkWithGetUserMedia(): Promise<{
          state: 'granted' | 'denied' | 'prompt'
          method: 'getUserMedia_fallback'
          reliable: boolean
        }> {
          try {
            // Attempt to get media stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            
            // If successful, permission is granted
            // Important: Stop tracks immediately
            stream.getTracks().forEach(track => track.stop())
            
            return {
              state: 'granted',
              method: 'getUserMedia_fallback',
              reliable: true,
            }
          } catch (error) {
            if (error instanceof DOMException) {
              switch (error.name) {
                case 'NotAllowedError':
                  return {
                    state: 'denied',
                    method: 'getUserMedia_fallback',
                    reliable: true,
                  }
                case 'NotFoundError':
                  // No device found - can't determine permission state
                  return {
                    state: 'prompt',
                    method: 'getUserMedia_fallback',
                    reliable: false,
                  }
                default:
                  // Other errors - assume prompt state
                  return {
                    state: 'prompt',
                    method: 'getUserMedia_fallback',
                    reliable: false,
                  }
              }
            }
            
            return {
              state: 'prompt',
              method: 'getUserMedia_fallback',
              reliable: false,
            }
          }
        }
      }

      const manager = new PermissionManager()

      // Test permission granted scenario
      mockGetUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      })

      const grantedResult = await manager.checkMicrophonePermission()
      expect(grantedResult.state).toBe('granted')
      expect(grantedResult.method).toBe('getUserMedia_fallback')

      // Test permission denied scenario
      mockGetUserMedia.mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError')
      )

      const deniedResult = await manager.checkMicrophonePermission()
      expect(deniedResult.state).toBe('denied')
      expect(deniedResult.method).toBe('getUserMedia_fallback')
    })

    it('should handle browser-specific permission API limitations', () => {
      const detectBrowserPermissionSupport = () => {
        const userAgent = navigator.userAgent.toLowerCase()
        
        const browserSupport = {
          chrome: {
            permissionAPI: true,
            microphoneQuery: true,
            notes: 'Full support for Permission API',
          },
          firefox: {
            permissionAPI: true,
            microphoneQuery: false, // Firefox doesn't support microphone permission query
            notes: 'Permission API available but microphone query not supported',
            fallbackRequired: true,
          },
          safari: {
            permissionAPI: false, // Safari has limited Permission API support
            microphoneQuery: false,
            notes: 'Limited Permission API support, getUserMedia fallback required',
            fallbackRequired: true,
          },
          edge: {
            permissionAPI: true,
            microphoneQuery: true,
            notes: 'Full support for Permission API (Chromium-based)',
          },
        }

        let detectedBrowser = 'unknown'
        if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
          detectedBrowser = 'chrome'
        } else if (userAgent.includes('firefox')) {
          detectedBrowser = 'firefox'
        } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
          detectedBrowser = 'safari'
        } else if (userAgent.includes('edg')) {
          detectedBrowser = 'edge'
        }

        return {
          browser: detectedBrowser,
          support: browserSupport[detectedBrowser] || {
            permissionAPI: false,
            microphoneQuery: false,
            notes: 'Unknown browser, fallback recommended',
            fallbackRequired: true,
          },
        }
      }

      // Mock Firefox user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0',
        writable: true,
      })

      const firefoxSupport = detectBrowserPermissionSupport()
      expect(firefoxSupport.browser).toBe('firefox')
      expect(firefoxSupport.support.permissionAPI).toBe(true)
      expect(firefoxSupport.support.microphoneQuery).toBe(false)
      expect(firefoxSupport.support.fallbackRequired).toBe(true)

      // Mock Safari user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        writable: true,
      })

      const safariSupport = detectBrowserPermissionSupport()
      expect(safariSupport.browser).toBe('safari')
      expect(safariSupport.support.permissionAPI).toBe(false)
      expect(safariSupport.support.fallbackRequired).toBe(true)
    })

    it('should implement robust permission checking with multiple fallbacks', async () => {
      class RobustPermissionChecker {
        async checkPermission(): Promise<{
          state: 'granted' | 'denied' | 'prompt'
          method: string
          confidence: 'high' | 'medium' | 'low'
          browserSupport: any
        }> {
          const browserSupport = this.detectBrowserSupport()
          
          // Strategy 1: Try Permission API if supported
          if (browserSupport.permissionAPI && browserSupport.microphoneQuery) {
            try {
              const permission = await navigator.permissions.query({ 
                name: 'microphone' as PermissionName 
              })
              return {
                state: permission.state,
                method: 'permission_api',
                confidence: 'high',
                browserSupport,
              }
            } catch (error) {
              // Fall through to next strategy
            }
          }

          // Strategy 2: Try getUserMedia probe
          try {
            const result = await this.probeWithGetUserMedia()
            return {
              ...result,
              browserSupport,
            }
          } catch (error) {
            // Strategy 3: Browser-specific detection
            return this.browserSpecificFallback(browserSupport)
          }
        }

        private detectBrowserSupport() {
          const hasPermissionAPI = 'permissions' in navigator && 
                                  navigator.permissions !== undefined
          
          const userAgent = navigator.userAgent.toLowerCase()
          const isFirefox = userAgent.includes('firefox')
          const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome')
          
          return {
            permissionAPI: hasPermissionAPI && !isSafari,
            microphoneQuery: hasPermissionAPI && !isFirefox && !isSafari,
            browser: isFirefox ? 'firefox' : isSafari ? 'safari' : 'other',
          }
        }

        private async probeWithGetUserMedia(): Promise<{
          state: 'granted' | 'denied' | 'prompt'
          method: string
          confidence: 'high' | 'medium' | 'low'
        }> {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: { 
                // Use minimal constraints to avoid constraint errors
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
              } 
            })
            
            // Clean up immediately
            stream.getTracks().forEach(track => track.stop())
            
            return {
              state: 'granted',
              method: 'getUserMedia_probe',
              confidence: 'high',
            }
          } catch (error) {
            if (error instanceof DOMException) {
              switch (error.name) {
                case 'NotAllowedError':
                  return {
                    state: 'denied',
                    method: 'getUserMedia_probe',
                    confidence: 'high',
                  }
                case 'NotFoundError':
                  return {
                    state: 'prompt',
                    method: 'getUserMedia_probe_no_device',
                    confidence: 'low',
                  }
                default:
                  throw error
              }
            }
            throw error
          }
        }

        private browserSpecificFallback(browserSupport: any): {
          state: 'granted' | 'denied' | 'prompt'
          method: string
          confidence: 'high' | 'medium' | 'low'
          browserSupport: any
        } {
          // For browsers without reliable permission checking,
          // default to prompt state and let user interaction determine
          return {
            state: 'prompt',
            method: `browser_fallback_${browserSupport.browser}`,
            confidence: 'low',
            browserSupport,
          }
        }
      }

      const checker = new RobustPermissionChecker()

      // Mock getUserMedia for testing
      const mockGetUserMedia = vi.fn()
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
      })

      // Test successful permission check
      mockGetUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      })

      const result = await checker.checkPermission()
      expect(result.state).toBe('granted')
      expect(result.method).toBe('getUserMedia_probe')
      expect(result.confidence).toBe('high')
    })

    it('should provide permission state caching for performance', () => {
      class PermissionCache {
        private cache = new Map<string, {
          state: string
          timestamp: number
          method: string
          ttl: number
        }>()

        private readonly DEFAULT_TTL = 60000 // 1 minute
        private readonly PERMISSION_API_TTL = 300000 // 5 minutes (more reliable)
        private readonly FALLBACK_TTL = 30000 // 30 seconds (less reliable)

        setCachedPermission(
          permission: string, 
          state: string, 
          method: string
        ) {
          const ttl = method === 'permission_api' ? 
                     this.PERMISSION_API_TTL : 
                     this.FALLBACK_TTL

          this.cache.set(permission, {
            state,
            timestamp: Date.now(),
            method,
            ttl,
          })
        }

        getCachedPermission(permission: string): {
          state: string
          method: string
          fromCache: boolean
        } | null {
          const cached = this.cache.get(permission)
          
          if (!cached) {
            return null
          }

          const isExpired = Date.now() - cached.timestamp > cached.ttl
          if (isExpired) {
            this.cache.delete(permission)
            return null
          }

          return {
            state: cached.state,
            method: cached.method,
            fromCache: true,
          }
        }

        clearCache(permission?: string) {
          if (permission) {
            this.cache.delete(permission)
          } else {
            this.cache.clear()
          }
        }

        invalidateOnPermissionChange() {
          // Listen for permission changes if Permission API is available
          if ('permissions' in navigator && navigator.permissions) {
            navigator.permissions.query({ name: 'microphone' as PermissionName })
              .then(permission => {
                permission.addEventListener('change', () => {
                  this.clearCache('microphone')
                })
              })
              .catch(() => {
                // Permission API not supported, rely on TTL
              })
          }
        }

        getStats() {
          const now = Date.now()
          const entries = Array.from(this.cache.entries())
          
          return {
            totalEntries: entries.length,
            validEntries: entries.filter(([, cached]) => 
              now - cached.timestamp <= cached.ttl
            ).length,
            expiredEntries: entries.filter(([, cached]) => 
              now - cached.timestamp > cached.ttl
            ).length,
            cacheHitRate: this.calculateHitRate(),
          }
        }

        private calculateHitRate() {
          // This would be tracked in a real implementation
          return 0.75 // Mock 75% hit rate
        }
      }

      const cache = new PermissionCache()

      // Test caching
      cache.setCachedPermission('microphone', 'granted', 'permission_api')
      
      const cached = cache.getCachedPermission('microphone')
      expect(cached).not.toBeNull()
      expect(cached!.state).toBe('granted')
      expect(cached!.fromCache).toBe(true)

      // Test expiration (mock with immediate expiry)
      cache.setCachedPermission('microphone', 'denied', 'getUserMedia_fallback')
      
      // Mock time passage
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 60000) // 1 minute later
      
      const expired = cache.getCachedPermission('microphone')
      expect(expired).toBeNull() // Should be expired

      // Test stats
      const stats = cache.getStats()
      expect(stats).toHaveProperty('totalEntries')
      expect(stats).toHaveProperty('cacheHitRate')
    })

    it('should handle graceful degradation when both APIs fail', async () => {
      // Mock complete API failure
      Object.defineProperty(navigator, 'permissions', {
        value: undefined,
        writable: true,
      })

      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
      })

      const gracefulPermissionManager = {
        async checkWithGracefulDegradation() {
          const capabilities = this.detectCapabilities()
          
          if (!capabilities.hasMediaDevices) {
            return {
              state: 'unsupported',
              method: 'no_media_devices_api',
              fallback: 'user_instruction',
              message: 'Your browser does not support microphone access',
              instructions: [
                'Please use a modern browser like Chrome, Firefox, or Safari',
                'Ensure your browser is up to date',
              ],
            }
          }

          if (!capabilities.hasGetUserMedia) {
            return {
              state: 'unsupported',
              method: 'no_getUserMedia',
              fallback: 'user_instruction',
              message: 'Your browser does not support getUserMedia',
            }
          }

          return {
            state: 'prompt',
            method: 'user_interaction_required',
            fallback: 'click_to_activate',
            message: 'Click the microphone button to enable voice input',
          }
        },

        detectCapabilities() {
          return {
            hasMediaDevices: 'mediaDevices' in navigator && 
                           navigator.mediaDevices !== undefined,
            hasGetUserMedia: 'mediaDevices' in navigator && 
                           navigator.mediaDevices &&
                           typeof navigator.mediaDevices.getUserMedia === 'function',
            hasPermissionAPI: 'permissions' in navigator && 
                            navigator.permissions !== undefined,
            secureContext: 'isSecureContext' in window ? 
                          window.isSecureContext : 
                          location.protocol === 'https:',
          }
        },
      }

      const result = await gracefulPermissionManager.checkWithGracefulDegradation()
      
      expect(result.state).toBe('unsupported')
      expect(result.method).toBe('no_media_devices_api')
      expect(result.fallback).toBe('user_instruction')
      expect(result.instructions).toHaveLength(2)
    })
  })
})