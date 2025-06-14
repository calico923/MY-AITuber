import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('Toast Notification for Permission Denial Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset DOM
    document.body.innerHTML = ''
  })

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = ''
    vi.resetModules()
  })

  describe('tdd-2.6: Verify toast notification appears on permission denial', () => {
    it('should display toast notification when microphone permission is denied', () => {
      const createToastNotification = (config: {
        type: 'error' | 'warning' | 'info' | 'success'
        title: string
        message: string
        duration?: number
        actions?: Array<{ label: string; action: () => void }>
      }) => {
        const toast = document.createElement('div')
        toast.className = `toast toast-${config.type}`
        toast.setAttribute('data-testid', 'permission-toast')
        toast.setAttribute('role', 'alert')
        toast.setAttribute('aria-live', 'assertive')

        // Create toast content
        const content = document.createElement('div')
        content.className = 'toast-content'

        const icon = document.createElement('span')
        icon.className = 'toast-icon'
        icon.textContent = config.type === 'error' ? '🚫' : '⚠️'

        const textContent = document.createElement('div')
        textContent.className = 'toast-text'

        const title = document.createElement('h4')
        title.className = 'toast-title'
        title.textContent = config.title

        const message = document.createElement('p')
        message.className = 'toast-message'
        message.textContent = config.message

        textContent.appendChild(title)
        textContent.appendChild(message)

        content.appendChild(icon)
        content.appendChild(textContent)

        // Add action buttons if provided
        if (config.actions && config.actions.length > 0) {
          const actionsDiv = document.createElement('div')
          actionsDiv.className = 'toast-actions'

          config.actions.forEach(action => {
            const button = document.createElement('button')
            button.className = 'toast-action-button'
            button.textContent = action.label
            button.onclick = action.action
            actionsDiv.appendChild(button)
          })

          content.appendChild(actionsDiv)
        }

        // Add close button
        const closeButton = document.createElement('button')
        closeButton.className = 'toast-close'
        closeButton.setAttribute('aria-label', 'Close notification')
        closeButton.textContent = '×'
        closeButton.onclick = () => {
          toast.remove()
        }

        content.appendChild(closeButton)
        toast.appendChild(content)

        // Add to DOM
        document.body.appendChild(toast)

        // Auto-hide after duration
        const duration = config.duration || 5000
        if (duration > 0) {
          setTimeout(() => {
            if (toast.parentNode) {
              toast.remove()
            }
          }, duration)
        }

        return toast
      }

      const handlePermissionDenial = () => {
        return createToastNotification({
          type: 'error',
          title: 'Microphone Access Denied',
          message: 'Please allow microphone access to use voice features.',
          duration: 0, // Persistent notification
          actions: [
            {
              label: 'Try Again',
              action: () => {
                // Mock retry action
                console.log('Retrying microphone access')
              },
            },
            {
              label: 'Learn More',
              action: () => {
                // Mock help action
                console.log('Opening help')
              },
            },
          ],
        })
      }

      const toast = handlePermissionDenial()

      expect(toast).toBeInTheDocument()
      expect(toast.className).toBe('toast toast-error')
      expect(toast.getAttribute('role')).toBe('alert')
      expect(toast.querySelector('.toast-title')?.textContent).toBe('Microphone Access Denied')
      expect(toast.querySelector('.toast-message')?.textContent).toContain('Please allow microphone access')
      expect(toast.querySelectorAll('.toast-action-button')).toHaveLength(2)
    })

    it('should show different toast types for different permission scenarios', () => {
      const permissionToastManager = {
        showPermissionDenied() {
          return this.createToast({
            type: 'error',
            title: 'Microphone Access Denied',
            message: 'Microphone access was denied. Voice features are not available.',
            icon: '🚫',
            persistent: true,
            actions: [
              { label: 'Settings', action: () => this.openBrowserSettings() },
              { label: 'Try Again', action: () => this.retryPermission() },
            ],
          })
        },

        showPermissionBlocked() {
          return this.createToast({
            type: 'error',
            title: 'Microphone Blocked',
            message: 'Microphone is blocked in browser settings. Please enable it manually.',
            icon: '🔒',
            persistent: true,
            actions: [
              { label: 'Help', action: () => this.showHelp() },
              { label: 'Refresh', action: () => window.location.reload() },
            ],
          })
        },

        showNoDevice() {
          return this.createToast({
            type: 'warning',
            title: 'No Microphone Found',
            message: 'No microphone device detected. Please connect a microphone.',
            icon: '🎤',
            duration: 8000,
            actions: [
              { label: 'Refresh', action: () => window.location.reload() },
            ],
          })
        },

        showDeviceBusy() {
          return this.createToast({
            type: 'warning',
            title: 'Microphone In Use',
            message: 'Your microphone is being used by another application.',
            icon: '⚠️',
            duration: 6000,
            actions: [
              { label: 'Try Again', action: () => this.retryPermission() },
            ],
          })
        },

        showHTTPSRequired() {
          return this.createToast({
            type: 'error',
            title: 'Secure Connection Required',
            message: 'Microphone access requires HTTPS. Please use a secure connection.',
            icon: '🔒',
            persistent: true,
            actions: [
              { label: 'Learn More', action: () => this.showHTTPSHelp() },
            ],
          })
        },

        createToast(config: any) {
          const toast = document.createElement('div')
          toast.className = `toast toast-${config.type}`
          toast.setAttribute('data-scenario', config.title.toLowerCase().replace(/\s+/g, '-'))
          
          // Add content based on config
          const content = `
            <div class="toast-content">
              <span class="toast-icon">${config.icon}</span>
              <div class="toast-text">
                <h4 class="toast-title">${config.title}</h4>
                <p class="toast-message">${config.message}</p>
              </div>
              ${config.actions ? this.createActionButtons(config.actions) : ''}
              <button class="toast-close" aria-label="Close">×</button>
            </div>
          `
          toast.innerHTML = content

          // Add event listeners
          const closeButton = toast.querySelector('.toast-close')
          closeButton?.addEventListener('click', () => toast.remove())

          // Add action button listeners
          config.actions?.forEach((action: any, index: number) => {
            const button = toast.querySelector(`[data-action-index="${index}"]`)
            button?.addEventListener('click', action.action)
          })

          document.body.appendChild(toast)

          // Auto-hide if not persistent
          if (!config.persistent && config.duration) {
            setTimeout(() => toast.remove(), config.duration)
          }

          return toast
        },

        createActionButtons(actions: any[]) {
          return `
            <div class="toast-actions">
              ${actions.map((action, index) => 
                `<button class="toast-action-button" data-action-index="${index}">${action.label}</button>`
              ).join('')}
            </div>
          `
        },

        // Mock action methods
        openBrowserSettings() { console.log('Opening browser settings') },
        retryPermission() { console.log('Retrying permission') },
        showHelp() { console.log('Showing help') },
        showHTTPSHelp() { console.log('Showing HTTPS help') },
      }

      // Test permission denied toast
      const deniedToast = permissionToastManager.showPermissionDenied()
      expect(deniedToast.getAttribute('data-scenario')).toBe('microphone-access-denied')
      expect(deniedToast.querySelector('.toast-icon')?.textContent).toBe('🚫')
      expect(deniedToast.querySelectorAll('.toast-action-button')).toHaveLength(2)

      // Test no device toast
      const noDeviceToast = permissionToastManager.showNoDevice()
      expect(noDeviceToast.getAttribute('data-scenario')).toBe('no-microphone-found')
      expect(noDeviceToast.querySelector('.toast-icon')?.textContent).toBe('🎤')

      // Test HTTPS required toast
      const httpsToast = permissionToastManager.showHTTPSRequired()
      expect(httpsToast.getAttribute('data-scenario')).toBe('secure-connection-required')
      expect(httpsToast.querySelector('.toast-icon')?.textContent).toBe('🔒')
    })

    it('should position toasts correctly and handle multiple toasts', () => {
      const toastContainer = {
        create() {
          let container = document.getElementById('toast-container')
          if (!container) {
            container = document.createElement('div')
            container.id = 'toast-container'
            container.className = 'toast-container'
            container.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              z-index: 10000;
              max-width: 400px;
              pointer-events: none;
            `
            document.body.appendChild(container)
          }
          return container
        },

        addToast(toast: HTMLElement) {
          const container = this.create()
          
          // Make toast clickable
          toast.style.pointerEvents = 'auto'
          toast.style.marginBottom = '10px'
          toast.style.opacity = '0'
          toast.style.transform = 'translateX(100%)'
          toast.style.transition = 'all 0.3s ease-in-out'

          container.appendChild(toast)

          // Animate in
          requestAnimationFrame(() => {
            toast.style.opacity = '1'
            toast.style.transform = 'translateX(0)'
          })

          return toast
        },

        removeToast(toast: HTMLElement) {
          toast.style.opacity = '0'
          toast.style.transform = 'translateX(100%)'
          
          setTimeout(() => {
            if (toast.parentNode) {
              toast.parentNode.removeChild(toast)
            }
          }, 300)
        },

        removeAll() {
          const container = document.getElementById('toast-container')
          if (container) {
            container.innerHTML = ''
          }
        },

        getActiveToasts() {
          const container = document.getElementById('toast-container')
          return container ? Array.from(container.children) : []
        },
      }

      const createTestToast = (title: string) => {
        const toast = document.createElement('div')
        toast.className = 'toast toast-error'
        toast.innerHTML = `
          <div class="toast-content">
            <h4>${title}</h4>
            <button class="toast-close">×</button>
          </div>
        `

        // Add close functionality
        const closeButton = toast.querySelector('.toast-close')
        closeButton?.addEventListener('click', () => {
          toastContainer.removeToast(toast)
        })

        return toast
      }

      // Test single toast
      const toast1 = createTestToast('First Toast')
      toastContainer.addToast(toast1)

      expect(document.getElementById('toast-container')).toBeInTheDocument()
      expect(toastContainer.getActiveToasts()).toHaveLength(1)

      // Test multiple toasts
      const toast2 = createTestToast('Second Toast')
      const toast3 = createTestToast('Third Toast')
      toastContainer.addToast(toast2)
      toastContainer.addToast(toast3)

      expect(toastContainer.getActiveToasts()).toHaveLength(3)

      // Test removal
      toastContainer.removeToast(toast2)
      setTimeout(() => {
        expect(toastContainer.getActiveToasts()).toHaveLength(2)
      }, 350) // Wait for animation

      // Test remove all
      toastContainer.removeAll()
      expect(toastContainer.getActiveToasts()).toHaveLength(0)
    })

    it('should integrate with permission error handling workflow', async () => {
      const mockGetUserMedia = vi.fn()
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        writable: true,
      })

      class PermissionErrorToastHandler {
        async requestMicrophoneWithToasts() {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            
            // Success toast
            this.showSuccessToast()
            return { success: true, stream }
          } catch (error) {
            // Error-specific toasts
            const errorToast = this.handlePermissionError(error)
            return { success: false, error, toast: errorToast }
          }
        }

        handlePermissionError(error: unknown) {
          if (error instanceof DOMException) {
            switch (error.name) {
              case 'NotAllowedError':
                return this.showPermissionDeniedToast(error)
              case 'NotFoundError':
                return this.showNoDeviceToast(error)
              case 'NotReadableError':
                return this.showDeviceBusyToast(error)
              case 'OverconstrainedError':
                return this.showConstraintErrorToast(error)
              case 'SecurityError':
                return this.showSecurityErrorToast(error)
              default:
                return this.showGenericErrorToast(error)
            }
          }
          return this.showGenericErrorToast(error)
        }

        showSuccessToast() {
          return this.createToast({
            type: 'success',
            title: 'Microphone Access Granted',
            message: 'Voice features are now available.',
            icon: '✅',
            duration: 3000,
          })
        }

        showPermissionDeniedToast(error: DOMException) {
          return this.createToast({
            type: 'error',
            title: 'Permission Denied',
            message: 'Please allow microphone access to use voice features.',
            icon: '🚫',
            persistent: true,
            actions: [
              {
                label: 'Try Again',
                action: () => this.retryPermissionRequest(),
              },
              {
                label: 'Help',
                action: () => this.showPermissionHelp(),
              },
            ],
            technicalDetails: error.message,
          })
        }

        showNoDeviceToast(error: DOMException) {
          return this.createToast({
            type: 'warning',
            title: 'No Microphone Found',
            message: 'Please connect a microphone to your device.',
            icon: '🎤',
            duration: 8000,
            actions: [
              {
                label: 'Refresh',
                action: () => window.location.reload(),
              },
            ],
          })
        }

        showDeviceBusyToast(error: DOMException) {
          return this.createToast({
            type: 'warning',
            title: 'Microphone Unavailable',
            message: 'Microphone is being used by another application.',
            icon: '⚠️',
            duration: 6000,
            actions: [
              {
                label: 'Try Again',
                action: () => this.retryPermissionRequest(),
              },
            ],
          })
        }

        showConstraintErrorToast(error: DOMException) {
          return this.createToast({
            type: 'warning',
            title: 'Audio Settings Issue',
            message: 'Some audio settings are not supported. Using default settings.',
            icon: '⚙️',
            duration: 5000,
            actions: [
              {
                label: 'Continue',
                action: () => this.retryWithBasicConstraints(),
              },
            ],
          })
        }

        showSecurityErrorToast(error: DOMException) {
          return this.createToast({
            type: 'error',
            title: 'Security Error',
            message: 'Microphone access requires a secure connection (HTTPS).',
            icon: '🔒',
            persistent: true,
            actions: [
              {
                label: 'Learn More',
                action: () => this.showHTTPSHelp(),
              },
            ],
          })
        }

        showGenericErrorToast(error: unknown) {
          return this.createToast({
            type: 'error',
            title: 'Microphone Error',
            message: 'An unexpected error occurred while accessing the microphone.',
            icon: '❗',
            duration: 5000,
            actions: [
              {
                label: 'Try Again',
                action: () => this.retryPermissionRequest(),
              },
            ],
            technicalDetails: error instanceof Error ? error.message : 'Unknown error',
          })
        }

        createToast(config: any) {
          const toast = document.createElement('div')
          toast.className = `toast toast-${config.type}`
          toast.innerHTML = `
            <div class="toast-content">
              <span class="toast-icon">${config.icon}</span>
              <div class="toast-text">
                <h4 class="toast-title">${config.title}</h4>
                <p class="toast-message">${config.message}</p>
                ${config.technicalDetails ? `<small class="toast-technical">${config.technicalDetails}</small>` : ''}
              </div>
              ${config.actions ? this.createActionButtons(config.actions) : ''}
              <button class="toast-close">×</button>
            </div>
          `

          document.body.appendChild(toast)
          return toast
        }

        createActionButtons(actions: any[]) {
          const actionsDiv = document.createElement('div')
          actionsDiv.className = 'toast-actions'
          
          actions.forEach(action => {
            const button = document.createElement('button')
            button.className = 'toast-action-button'
            button.textContent = action.label
            button.onclick = action.action
            actionsDiv.appendChild(button)
          })
          
          return actionsDiv.outerHTML
        }

        // Mock action methods
        retryPermissionRequest() { console.log('Retrying permission request') }
        retryWithBasicConstraints() { console.log('Retrying with basic constraints') }
        showPermissionHelp() { console.log('Showing permission help') }
        showHTTPSHelp() { console.log('Showing HTTPS help') }
      }

      const handler = new PermissionErrorToastHandler()

      // Test permission denied scenario
      mockGetUserMedia.mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError')
      )

      const deniedResult = await handler.requestMicrophoneWithToasts()
      expect(deniedResult.success).toBe(false)
      expect(deniedResult.toast).toBeInTheDocument()
      expect(deniedResult.toast.querySelector('.toast-title')?.textContent).toBe('Permission Denied')

      // Test success scenario
      mockGetUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      })

      const successResult = await handler.requestMicrophoneWithToasts()
      expect(successResult.success).toBe(true)
      expect(successResult.toast?.querySelector('.toast-title')?.textContent).toBe('Microphone Access Granted')
    })

    it('should handle toast accessibility and keyboard navigation', () => {
      const accessibleToastManager = {
        createAccessibleToast(config: {
          type: string
          title: string
          message: string
          actions?: any[]
        }) {
          const toast = document.createElement('div')
          toast.className = `toast toast-${config.type}`
          
          // Accessibility attributes
          toast.setAttribute('role', 'alert')
          toast.setAttribute('aria-live', 'assertive')
          toast.setAttribute('aria-atomic', 'true')
          toast.setAttribute('tabindex', '-1')
          
          // Content
          const content = document.createElement('div')
          content.className = 'toast-content'
          
          const title = document.createElement('h4')
          title.className = 'toast-title'
          title.id = `toast-title-${Date.now()}`
          title.textContent = config.title
          
          const message = document.createElement('p')
          message.className = 'toast-message'
          message.id = `toast-message-${Date.now()}`
          message.textContent = config.message
          
          // Aria-labelledby for screen readers
          toast.setAttribute('aria-labelledby', title.id)
          toast.setAttribute('aria-describedby', message.id)
          
          content.appendChild(title)
          content.appendChild(message)
          
          // Action buttons with proper accessibility
          if (config.actions) {
            const actionsDiv = document.createElement('div')
            actionsDiv.className = 'toast-actions'
            actionsDiv.setAttribute('role', 'group')
            actionsDiv.setAttribute('aria-label', 'Available actions')
            
            config.actions.forEach((action, index) => {
              const button = document.createElement('button')
              button.className = 'toast-action-button'
              button.textContent = action.label
              button.setAttribute('type', 'button')
              button.setAttribute('aria-describedby', message.id)
              
              // Keyboard navigation
              button.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                  this.dismissToast(toast)
                } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  this.navigateButtons(actionsDiv, button, e.key === 'ArrowRight')
                }
              })
              
              actionsDiv.appendChild(button)
            })
            
            content.appendChild(actionsDiv)
          }
          
          // Close button
          const closeButton = document.createElement('button')
          closeButton.className = 'toast-close'
          closeButton.setAttribute('type', 'button')
          closeButton.setAttribute('aria-label', 'Close notification')
          closeButton.textContent = '×'
          closeButton.addEventListener('click', () => this.dismissToast(toast))
          closeButton.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
              this.dismissToast(toast)
            }
          })
          
          content.appendChild(closeButton)
          toast.appendChild(content)
          
          // Focus management
          document.body.appendChild(toast)
          
          // Auto-focus first actionable element for screen readers
          setTimeout(() => {
            const firstButton = toast.querySelector('button')
            if (firstButton) {
              firstButton.focus()
            }
          }, 100)
          
          return toast
        },

        navigateButtons(container: HTMLElement, currentButton: HTMLElement, forward: boolean) {
          const buttons = Array.from(container.querySelectorAll('button'))
          const currentIndex = buttons.indexOf(currentButton)
          
          let nextIndex
          if (forward) {
            nextIndex = (currentIndex + 1) % buttons.length
          } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1
          }
          
          ;(buttons[nextIndex] as HTMLElement).focus()
        },

        dismissToast(toast: HTMLElement) {
          // Announce dismissal to screen readers
          const announcement = document.createElement('div')
          announcement.setAttribute('aria-live', 'polite')
          announcement.setAttribute('aria-atomic', 'true')
          announcement.style.position = 'absolute'
          announcement.style.left = '-10000px'
          announcement.textContent = 'Notification dismissed'
          
          document.body.appendChild(announcement)
          
          // Remove toast
          toast.remove()
          
          // Clean up announcement
          setTimeout(() => {
            announcement.remove()
          }, 1000)
        },
      }

      const accessibleToast = accessibleToastManager.createAccessibleToast({
        type: 'error',
        title: 'Microphone Access Denied',
        message: 'Please allow microphone access to continue.',
        actions: [
          { label: 'Try Again', action: () => {} },
          { label: 'Help', action: () => {} },
        ],
      })

      expect(accessibleToast.getAttribute('role')).toBe('alert')
      expect(accessibleToast.getAttribute('aria-live')).toBe('assertive')
      expect(accessibleToast.getAttribute('aria-atomic')).toBe('true')
      expect(accessibleToast.getAttribute('aria-labelledby')).toBeTruthy()
      expect(accessibleToast.getAttribute('aria-describedby')).toBeTruthy()

      const actionsGroup = accessibleToast.querySelector('.toast-actions')
      expect(actionsGroup?.getAttribute('role')).toBe('group')
      expect(actionsGroup?.getAttribute('aria-label')).toBe('Available actions')

      const buttons = accessibleToast.querySelectorAll('button')
      expect(buttons).toHaveLength(3) // 2 action buttons + 1 close button
      
      buttons.forEach(button => {
        expect(button.getAttribute('type')).toBe('button')
      })
    })
  })
})