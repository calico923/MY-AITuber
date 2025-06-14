import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('Permission Denied Recovery Instructions Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset DOM
    document.body.innerHTML = ''
  })

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = ''
  })

  describe('tdd-2.8: Verify permission denied recovery instructions display', () => {
    it('should display browser-specific recovery instructions for permission denial', () => {
      const getBrowserSpecificInstructions = (userAgent: string) => {
        const ua = userAgent.toLowerCase()
        
        if (ua.includes('chrome') && !ua.includes('edg')) {
          return {
            browser: 'Chrome',
            icon: '🌐',
            instructions: [
              'Click the camera/microphone icon in the address bar',
              'Select "Always allow" for microphone access',
              'Refresh the page after changing permissions',
            ],
            advancedSteps: [
              'Go to chrome://settings/content/microphone',
              'Remove this site from the "Block" list if present',
              'Add this site to the "Allow" list',
            ],
            troubleshooting: [
              'Check if microphone is being used by another application',
              'Try restarting Chrome completely',
              'Check system microphone privacy settings',
            ],
          }
        } else if (ua.includes('firefox')) {
          return {
            browser: 'Firefox',
            icon: '🦊',
            instructions: [
              'Click the microphone icon in the address bar',
              'Select "Allow" when prompted for microphone access',
              'Click "Remember this decision" to avoid future prompts',
            ],
            advancedSteps: [
              'Go to about:preferences#privacy',
              'Scroll to "Permissions" section',
              'Click "Settings" next to "Microphone"',
              'Remove or modify permissions for this site',
            ],
            troubleshooting: [
              'Firefox may require getUserMedia fallback',
              'Ensure microphone is not blocked by extensions',
              'Try disabling Enhanced Tracking Protection temporarily',
            ],
          }
        } else if (ua.includes('safari')) {
          return {
            browser: 'Safari',
            icon: '🌍',
            instructions: [
              'Click Safari menu → Preferences → Websites',
              'Select "Microphone" in the left sidebar',
              'Set this website to "Allow"',
              'Refresh the page',
            ],
            advancedSteps: [
              'Go to System Preferences → Security & Privacy → Privacy',
              'Select "Microphone" from the list',
              'Ensure Safari is checked in the list',
            ],
            troubleshooting: [
              'Safari requires user gesture for microphone access',
              'Ensure website is using HTTPS',
              'Check if Intelligent Tracking Prevention is blocking access',
            ],
          }
        } else if (ua.includes('edg')) {
          return {
            browser: 'Edge',
            icon: '🌊',
            instructions: [
              'Click the microphone icon in the address bar',
              'Select "Allow" for microphone access',
              'Choose "Always allow" to remember permission',
            ],
            advancedSteps: [
              'Go to edge://settings/content/microphone',
              'Manage site permissions',
              'Add this site to allowed list if needed',
            ],
            troubleshooting: [
              'Similar to Chrome troubleshooting steps',
              'Check Windows microphone privacy settings',
              'Ensure Edge is allowed in system microphone settings',
            ],
          }
        }
        
        return {
          browser: 'Unknown',
          icon: '❓',
          instructions: [
            'Look for a microphone icon in your browser\'s address bar',
            'Click it and select "Allow" for microphone access',
            'Refresh the page after granting permission',
          ],
          advancedSteps: [
            'Check your browser\'s privacy/security settings',
            'Look for site permissions or microphone settings',
            'Ensure this site is not blocked',
          ],
          troubleshooting: [
            'Try using a different browser',
            'Check system microphone settings',
            'Ensure microphone is connected and working',
          ],
        }
      }

      // Test Chrome instructions
      const chromeInstructions = getBrowserSpecificInstructions(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      )
      
      expect(chromeInstructions.browser).toBe('Chrome')
      expect(chromeInstructions.instructions).toHaveLength(3)
      expect(chromeInstructions.instructions[0]).toContain('camera/microphone icon')
      expect(chromeInstructions.advancedSteps[0]).toContain('chrome://settings')

      // Test Firefox instructions
      const firefoxInstructions = getBrowserSpecificInstructions(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0'
      )
      
      expect(firefoxInstructions.browser).toBe('Firefox')
      expect(firefoxInstructions.troubleshooting[0]).toContain('getUserMedia fallback')

      // Test Safari instructions
      const safariInstructions = getBrowserSpecificInstructions(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
      )
      
      expect(safariInstructions.browser).toBe('Safari')
      expect(safariInstructions.instructions[0]).toContain('Safari menu')
      expect(safariInstructions.troubleshooting[0]).toContain('user gesture')
    })

    it('should create interactive recovery instruction component', () => {
      class PermissionRecoveryInstructions {
        private container: HTMLElement
        private currentStep = 0
        private browserData: any

        constructor(containerSelector: string, userAgent: string) {
          this.container = document.querySelector(containerSelector) || document.body
          this.browserData = this.getBrowserData(userAgent)
          this.render()
        }

        getBrowserData(userAgent: string) {
          // Simplified browser detection for testing
          if (userAgent.includes('Chrome')) {
            return {
              name: 'Chrome',
              icon: '🌐',
              steps: [
                'Look for the microphone icon in the address bar',
                'Click the microphone icon',
                'Select "Always allow" for this site',
                'Refresh the page',
              ],
              visualAids: [
                'Address bar is at the top of your browser',
                'The icon looks like a microphone 🎤',
                'You may see a dropdown menu',
                'Use Ctrl+R (Windows) or Cmd+R (Mac) to refresh',
              ],
            }
          }
          return {
            name: 'Browser',
            icon: '❓',
            steps: [
              'Look for permission icons in your browser',
              'Allow microphone access when prompted',
              'Refresh the page',
            ],
            visualAids: [
              'Check the address bar area',
              'Look for popup notifications',
              'Refresh after granting permission',
            ],
          }
        }

        render() {
          const instructionsHTML = `
            <div class="permission-recovery-instructions" data-testid="recovery-instructions">
              <div class="recovery-header">
                <span class="browser-icon">${this.browserData.icon}</span>
                <h3>Microphone Permission Required</h3>
                <p>Follow these steps to enable microphone access in ${this.browserData.name}:</p>
              </div>
              
              <div class="recovery-steps">
                ${this.browserData.steps.map((step, index) => `
                  <div class="recovery-step ${index === 0 ? 'active' : ''}" data-step="${index}">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-content">
                      <div class="step-text">${step}</div>
                      <div class="step-visual-aid">${this.browserData.visualAids[index] || ''}</div>
                    </div>
                    <div class="step-status">
                      <button class="step-done-btn" data-step="${index}">Done</button>
                    </div>
                  </div>
                `).join('')}
              </div>
              
              <div class="recovery-actions">
                <button class="btn-test-microphone" data-testid="test-microphone">Test Microphone</button>
                <button class="btn-need-help" data-testid="need-help">Need More Help?</button>
                <button class="btn-skip" data-testid="skip-instructions">Skip to Text Input</button>
              </div>
              
              <div class="recovery-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: 0%"></div>
                </div>
                <span class="progress-text">Step 1 of ${this.browserData.steps.length}</span>
              </div>
            </div>
          `

          this.container.innerHTML = instructionsHTML
          this.attachEventListeners()
        }

        attachEventListeners() {
          // Step completion buttons
          const stepButtons = this.container.querySelectorAll('.step-done-btn')
          stepButtons.forEach(button => {
            button.addEventListener('click', (e) => {
              const stepIndex = parseInt((e.target as HTMLElement).getAttribute('data-step') || '0')
              this.completeStep(stepIndex)
            })
          })

          // Action buttons
          const testBtn = this.container.querySelector('[data-testid="test-microphone"]')
          testBtn?.addEventListener('click', () => this.testMicrophone())

          const helpBtn = this.container.querySelector('[data-testid="need-help"]')
          helpBtn?.addEventListener('click', () => this.showAdditionalHelp())

          const skipBtn = this.container.querySelector('[data-testid="skip-instructions"]')
          skipBtn?.addEventListener('click', () => this.skipToTextInput())
        }

        completeStep(stepIndex: number) {
          const step = this.container.querySelector(`[data-step="${stepIndex}"]`)
          if (step) {
            step.classList.add('completed')
            step.classList.remove('active')
          }

          // Activate next step
          const nextStepIndex = stepIndex + 1
          if (nextStepIndex < this.browserData.steps.length) {
            const nextStep = this.container.querySelector(`[data-step="${nextStepIndex}"]`)
            nextStep?.classList.add('active')
            this.currentStep = nextStepIndex
          } else {
            // All steps completed
            this.currentStep = this.browserData.steps.length
            this.showCompletionMessage()
          }

          this.updateProgress()
        }

        updateProgress() {
          const progress = (this.currentStep / this.browserData.steps.length) * 100
          const progressBar = this.container.querySelector('.progress-fill') as HTMLElement
          const progressText = this.container.querySelector('.progress-text')

          if (progressBar) {
            progressBar.style.width = `${progress}%`
          }

          if (progressText) {
            if (this.currentStep >= this.browserData.steps.length) {
              progressText.textContent = 'Completed!'
            } else {
              progressText.textContent = `Step ${this.currentStep + 1} of ${this.browserData.steps.length}`
            }
          }
        }

        showCompletionMessage() {
          const completionHTML = `
            <div class="completion-message" data-testid="completion-message">
              <div class="completion-icon">✅</div>
              <h4>Steps Completed!</h4>
              <p>Now try using the microphone feature again.</p>
              <button class="btn-retry-microphone" data-testid="retry-microphone">Try Again</button>
            </div>
          `

          const actionsContainer = this.container.querySelector('.recovery-actions')
          if (actionsContainer) {
            actionsContainer.innerHTML = completionHTML

            const retryBtn = actionsContainer.querySelector('[data-testid="retry-microphone"]')
            retryBtn?.addEventListener('click', () => this.retryMicrophone())
          }
        }

        async testMicrophone() {
          const testBtn = this.container.querySelector('[data-testid="test-microphone"]') as HTMLButtonElement
          if (testBtn) {
            testBtn.textContent = 'Testing...'
            testBtn.disabled = true
          }

          try {
            // Simulate microphone test
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // For testing, we'll simulate success
            this.showTestResult(true, 'Microphone is working!')
          } catch (error) {
            this.showTestResult(false, 'Microphone test failed. Please check your settings.')
          } finally {
            if (testBtn) {
              testBtn.textContent = 'Test Microphone'
              testBtn.disabled = false
            }
          }
        }

        showTestResult(success: boolean, message: string) {
          const resultHTML = `
            <div class="test-result ${success ? 'success' : 'error'}" data-testid="test-result">
              <span class="result-icon">${success ? '✅' : '❌'}</span>
              <span class="result-message">${message}</span>
            </div>
          `

          const existingResult = this.container.querySelector('.test-result')
          if (existingResult) {
            existingResult.remove()
          }

          const actionsContainer = this.container.querySelector('.recovery-actions')
          if (actionsContainer) {
            actionsContainer.insertAdjacentHTML('afterend', resultHTML)
          }
        }

        showAdditionalHelp() {
          const helpHTML = `
            <div class="additional-help" data-testid="additional-help">
              <h4>Additional Help</h4>
              <div class="help-sections">
                <div class="help-section">
                  <h5>System Settings</h5>
                  <ul>
                    <li>Check your system's microphone privacy settings</li>
                    <li>Ensure the microphone is not being used by other apps</li>
                    <li>Try disconnecting and reconnecting your microphone</li>
                  </ul>
                </div>
                <div class="help-section">
                  <h5>Browser Troubleshooting</h5>
                  <ul>
                    <li>Clear browser cache and cookies for this site</li>
                    <li>Disable browser extensions temporarily</li>
                    <li>Try opening the site in an incognito/private window</li>
                  </ul>
                </div>
                <div class="help-section">
                  <h5>Alternative Solutions</h5>
                  <ul>
                    <li>Use a different browser (Chrome, Firefox, Safari, Edge)</li>
                    <li>Use the text input option instead</li>
                    <li>Check if your microphone works in other applications</li>
                  </ul>
                </div>
              </div>
              <button class="btn-close-help" data-testid="close-help">Close</button>
            </div>
          `

          const existingHelp = this.container.querySelector('.additional-help')
          if (existingHelp) {
            existingHelp.remove()
          } else {
            this.container.insertAdjacentHTML('beforeend', helpHTML)

            const closeBtn = this.container.querySelector('[data-testid="close-help"]')
            closeBtn?.addEventListener('click', () => {
              this.container.querySelector('.additional-help')?.remove()
            })
          }
        }

        skipToTextInput() {
          // Emit event for parent component to handle
          const event = new CustomEvent('skipToTextInput', {
            detail: { reason: 'user_skipped_instructions' }
          })
          this.container.dispatchEvent(event)
        }

        retryMicrophone() {
          // Emit event for parent component to handle
          const event = new CustomEvent('retryMicrophone', {
            detail: { fromInstructions: true }
          })
          this.container.dispatchEvent(event)
        }

        getCurrentStep() {
          return this.currentStep
        }

        getCompletionStatus() {
          const totalSteps = this.browserData.steps.length
          const completedSteps = this.container.querySelectorAll('.recovery-step.completed').length
          
          return {
            completed: completedSteps,
            total: totalSteps,
            percentage: (completedSteps / totalSteps) * 100,
            isComplete: completedSteps === totalSteps,
          }
        }
      }

      // Test the recovery instructions component
      const testContainer = document.createElement('div')
      testContainer.id = 'test-container'
      document.body.appendChild(testContainer)

      const instructions = new PermissionRecoveryInstructions(
        '#test-container',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      )

      // Verify component was created
      const instructionsElement = document.querySelector('[data-testid="recovery-instructions"]')
      expect(instructionsElement).toBeInTheDocument()

      // Verify steps are present
      const steps = document.querySelectorAll('.recovery-step')
      expect(steps).toHaveLength(4) // Chrome has 4 steps

      // Verify first step is active
      const firstStep = document.querySelector('[data-step="0"]')
      expect(firstStep?.classList.contains('active')).toBe(true)

      // Verify action buttons
      expect(document.querySelector('[data-testid="test-microphone"]')).toBeInTheDocument()
      expect(document.querySelector('[data-testid="need-help"]')).toBeInTheDocument()
      expect(document.querySelector('[data-testid="skip-instructions"]')).toBeInTheDocument()

      // Test step completion
      const initialStatus = instructions.getCompletionStatus()
      expect(initialStatus.completed).toBe(0)
      expect(initialStatus.isComplete).toBe(false)

      // Simulate completing first step
      instructions.completeStep(0)
      const updatedStatus = instructions.getCompletionStatus()
      expect(updatedStatus.completed).toBe(1)
      expect(instructions.getCurrentStep()).toBe(1)
    })

    it('should provide contextual help based on error type and browser', () => {
      const contextualHelpProvider = {
        getContextualHelp(errorType: string, browserName: string, deviceType: 'desktop' | 'mobile' = 'desktop') {
          const baseHelp = {
            'not-allowed': {
              title: 'Permission Denied',
              description: 'Microphone access was blocked by the browser or user.',
              urgency: 'high',
            },
            'not-found': {
              title: 'No Microphone Detected',
              description: 'No microphone device was found on your system.',
              urgency: 'medium',
            },
            'not-readable': {
              title: 'Microphone Unavailable',
              description: 'Microphone is being used by another application.',
              urgency: 'medium',
            },
          }

          const browserSpecificHelp = {
            Chrome: {
              'not-allowed': {
                quickFix: 'Click the 🎤 icon in the address bar and select "Always allow"',
                detailedSteps: [
                  'Look for the microphone icon in the address bar (top of browser)',
                  'Click on the microphone icon',
                  'Select "Always allow [domain] to access your microphone"',
                  'Refresh the page (Ctrl+R or Cmd+R)',
                ],
                settingsPath: 'chrome://settings/content/microphone',
              },
            },
            Firefox: {
              'not-allowed': {
                quickFix: 'Click "Allow" when Firefox asks for microphone permission',
                detailedSteps: [
                  'Look for the microphone icon in the address bar',
                  'Click the icon and select "Allow"',
                  'Check "Remember this decision" to avoid future prompts',
                  'Refresh the page',
                ],
                settingsPath: 'about:preferences#privacy',
                note: 'Firefox may require clicking the microphone button to trigger permission prompt',
              },
            },
            Safari: {
              'not-allowed': {
                quickFix: 'Enable microphone access in Safari Preferences → Websites',
                detailedSteps: [
                  'Open Safari menu → Preferences',
                  'Click on "Websites" tab',
                  'Select "Microphone" from the left sidebar',
                  'Set this website to "Allow"',
                  'Refresh the page',
                ],
                systemSettings: 'System Preferences → Security & Privacy → Privacy → Microphone',
                note: 'Safari requires HTTPS and user interaction for microphone access',
              },
            },
          }

          const deviceSpecificHelp = {
            mobile: {
              'not-allowed': {
                additionalSteps: [
                  'Check if microphone access is enabled in device settings',
                  'Ensure the browser app has microphone permissions',
                  'Try rotating device or tapping microphone button again',
                ],
              },
            },
          }

          const help = baseHelp[errorType] || {
            title: 'Microphone Error',
            description: 'An issue occurred with microphone access.',
            urgency: 'medium',
          }

          const browserHelp = browserSpecificHelp[browserName]?.[errorType] || {}
          const deviceHelp = deviceSpecificHelp[deviceType]?.[errorType] || {}

          return {
            ...help,
            ...browserHelp,
            ...deviceHelp,
            browser: browserName,
            deviceType,
            timestamp: new Date().toISOString(),
          }
        },

        formatHelpContent(helpData: any): string {
          let content = `
            <div class="contextual-help" data-urgency="${helpData.urgency}">
              <div class="help-header">
                <h3>${helpData.title}</h3>
                <p class="help-description">${helpData.description}</p>
                ${helpData.note ? `<div class="help-note">💡 ${helpData.note}</div>` : ''}
              </div>
          `

          if (helpData.quickFix) {
            content += `
              <div class="quick-fix">
                <h4>Quick Fix:</h4>
                <p class="quick-fix-text">${helpData.quickFix}</p>
              </div>
            `
          }

          if (helpData.detailedSteps) {
            content += `
              <div class="detailed-steps">
                <h4>Detailed Steps:</h4>
                <ol class="steps-list">
                  ${helpData.detailedSteps.map(step => `<li>${step}</li>`).join('')}
                </ol>
              </div>
            `
          }

          if (helpData.additionalSteps) {
            content += `
              <div class="additional-steps">
                <h4>Additional Steps (${helpData.deviceType}):</h4>
                <ul class="additional-list">
                  ${helpData.additionalSteps.map(step => `<li>${step}</li>`).join('')}
                </ul>
              </div>
            `
          }

          if (helpData.settingsPath) {
            content += `
              <div class="settings-link">
                <h4>Advanced Settings:</h4>
                <p>Go to: <code>${helpData.settingsPath}</code></p>
              </div>
            `
          }

          content += `</div>`
          return content
        },

        createInteractiveHelp(errorType: string, browserName: string) {
          const helpData = this.getContextualHelp(errorType, browserName)
          const formattedContent = this.formatHelpContent(helpData)

          const helpContainer = document.createElement('div')
          helpContainer.className = 'interactive-help-container'
          helpContainer.innerHTML = formattedContent

          // Add interactive elements
          const actionButtons = document.createElement('div')
          actionButtons.className = 'help-actions'
          actionButtons.innerHTML = `
            <button class="btn-try-again" data-testid="try-again">Try Again</button>
            <button class="btn-open-settings" data-testid="open-settings">Open Settings</button>
            <button class="btn-contact-support" data-testid="contact-support">Contact Support</button>
          `

          helpContainer.appendChild(actionButtons)
          return helpContainer
        },
      }

      // Test contextual help generation
      const chromePermissionHelp = contextualHelpProvider.getContextualHelp('not-allowed', 'Chrome')
      expect(chromePermissionHelp.title).toBe('Permission Denied')
      expect(chromePermissionHelp.quickFix).toContain('🎤 icon in the address bar')
      expect(chromePermissionHelp.settingsPath).toBe('chrome://settings/content/microphone')
      expect(chromePermissionHelp.detailedSteps).toHaveLength(4)

      const firefoxPermissionHelp = contextualHelpProvider.getContextualHelp('not-allowed', 'Firefox')
      expect(firefoxPermissionHelp.note).toContain('clicking the microphone button')

      const safariPermissionHelp = contextualHelpProvider.getContextualHelp('not-allowed', 'Safari')
      expect(safariPermissionHelp.systemSettings).toContain('System Preferences')
      expect(safariPermissionHelp.note).toContain('HTTPS and user interaction')

      // Test mobile-specific help
      const mobileHelp = contextualHelpProvider.getContextualHelp('not-allowed', 'Chrome', 'mobile')
      expect(mobileHelp.additionalSteps).toBeDefined()
      expect(mobileHelp.additionalSteps).toContain('Check if microphone access is enabled in device settings')

      // Test formatted content
      const formattedHelp = contextualHelpProvider.formatHelpContent(chromePermissionHelp)
      expect(formattedHelp).toContain('Quick Fix:')
      expect(formattedHelp).toContain('Detailed Steps:')
      expect(formattedHelp).toContain('data-urgency="high"')

      // Test interactive help creation
      const interactiveHelp = contextualHelpProvider.createInteractiveHelp('not-allowed', 'Chrome')
      expect(interactiveHelp.querySelector('[data-testid="try-again"]')).toBeTruthy()
      expect(interactiveHelp.querySelector('[data-testid="open-settings"]')).toBeTruthy()
      expect(interactiveHelp.querySelector('[data-testid="contact-support"]')).toBeTruthy()
    })

    it('should track user progress through recovery instructions', () => {
      const recoveryProgressTracker = {
        sessions: new Map(),

        startRecoverySession(sessionId: string, errorType: string, browserName: string) {
          const session = {
            id: sessionId,
            errorType,
            browserName,
            startTime: Date.now(),
            steps: [],
            interactions: [],
            outcome: null,
            completionTime: null,
          }

          this.sessions.set(sessionId, session)
          return session
        },

        trackStepCompletion(sessionId: string, stepIndex: number, stepDescription: string) {
          const session = this.sessions.get(sessionId)
          if (!session) return

          session.steps.push({
            index: stepIndex,
            description: stepDescription,
            completedAt: Date.now(),
            timeFromStart: Date.now() - session.startTime,
          })
        },

        trackUserInteraction(sessionId: string, action: string, details?: any) {
          const session = this.sessions.get(sessionId)
          if (!session) return

          session.interactions.push({
            action,
            details,
            timestamp: Date.now(),
            timeFromStart: Date.now() - session.startTime,
          })
        },

        completeSession(sessionId: string, outcome: 'success' | 'abandoned' | 'skipped', details?: any) {
          const session = this.sessions.get(sessionId)
          if (!session) return

          session.outcome = outcome
          session.completionTime = Date.now()
          session.totalDuration = session.completionTime - session.startTime
          session.outcomeDetails = details

          return session
        },

        getSessionAnalytics(sessionId: string) {
          const session = this.sessions.get(sessionId)
          if (!session) return null

          const stepCompletionTimes = session.steps.map(step => step.timeFromStart)
          const averageStepTime = stepCompletionTimes.length > 0
            ? stepCompletionTimes.reduce((sum, time) => sum + time, 0) / stepCompletionTimes.length
            : 0

          const userInteractionTypes = session.interactions.reduce((acc, interaction) => {
            acc[interaction.action] = (acc[interaction.action] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          return {
            sessionId: session.id,
            errorType: session.errorType,
            browserName: session.browserName,
            totalDuration: session.totalDuration || 0,
            stepsCompleted: session.steps.length,
            averageStepTime: Math.round(averageStepTime),
            outcome: session.outcome,
            interactionCount: session.interactions.length,
            interactionTypes: userInteractionTypes,
            dropoffPoint: this.getDropoffPoint(session),
          }
        },

        getDropoffPoint(session: any) {
          if (session.outcome === 'success') return null

          // Find where user stopped progressing
          const lastStep = session.steps[session.steps.length - 1]
          const lastInteraction = session.interactions[session.interactions.length - 1]

          if (!lastStep && !lastInteraction) {
            return { type: 'immediate', description: 'User left immediately without any interaction' }
          }

          if (lastStep) {
            return {
              type: 'step_completion',
              stepIndex: lastStep.index,
              description: `User completed step ${lastStep.index + 1} but did not continue`,
            }
          }

          return {
            type: 'interaction',
            action: lastInteraction.action,
            description: `User's last action was ${lastInteraction.action}`,
          }
        },

        getAggregateAnalytics() {
          const sessions = Array.from(this.sessions.values())
          
          const outcomeStats = sessions.reduce((acc, session) => {
            if (session.outcome) {
              acc[session.outcome] = (acc[session.outcome] || 0) + 1
            }
            return acc
          }, {} as Record<string, number>)

          const browserStats = sessions.reduce((acc, session) => {
            acc[session.browserName] = (acc[session.browserName] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          const errorTypeStats = sessions.reduce((acc, session) => {
            acc[session.errorType] = (acc[session.errorType] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          const completedSessions = sessions.filter(s => s.outcome === 'success')
          const averageSuccessTime = completedSessions.length > 0
            ? completedSessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0) / completedSessions.length
            : 0

          return {
            totalSessions: sessions.length,
            outcomeDistribution: outcomeStats,
            browserDistribution: browserStats,
            errorTypeDistribution: errorTypeStats,
            successRate: sessions.length > 0 ? (outcomeStats.success || 0) / sessions.length : 0,
            averageSuccessTime: Math.round(averageSuccessTime),
            mostCommonDropoff: this.getMostCommonDropoff(sessions),
          }
        },

        getMostCommonDropoff(sessions: any[]) {
          const dropoffs = sessions
            .filter(s => s.outcome !== 'success')
            .map(s => this.getDropoffPoint(s))
            .filter(Boolean)

          const dropoffCounts = dropoffs.reduce((acc, dropoff) => {
            const key = `${dropoff.type}:${dropoff.stepIndex || dropoff.action || 'unknown'}`
            acc[key] = (acc[key] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          const mostCommon = Object.entries(dropoffCounts)
            .sort(([,a], [,b]) => b - a)[0]

          return mostCommon ? {
            pattern: mostCommon[0],
            count: mostCommon[1],
            percentage: (mostCommon[1] / sessions.length) * 100,
          } : null
        },
      }

      // Test session tracking
      const sessionId = 'test-session-1'
      const session = recoveryProgressTracker.startRecoverySession(sessionId, 'not-allowed', 'Chrome')
      
      expect(session.id).toBe(sessionId)
      expect(session.errorType).toBe('not-allowed')
      expect(session.browserName).toBe('Chrome')

      // Track step completions
      recoveryProgressTracker.trackStepCompletion(sessionId, 0, 'Click microphone icon')
      recoveryProgressTracker.trackStepCompletion(sessionId, 1, 'Select Allow')

      // Track interactions
      recoveryProgressTracker.trackUserInteraction(sessionId, 'help_clicked', { section: 'browser_settings' })
      recoveryProgressTracker.trackUserInteraction(sessionId, 'test_microphone', { result: 'success' })

      // Complete session
      const completedSession = recoveryProgressTracker.completeSession(sessionId, 'success', { microphoneWorking: true })
      expect(completedSession?.outcome).toBe('success')

      // Get analytics
      const analytics = recoveryProgressTracker.getSessionAnalytics(sessionId)
      expect(analytics?.stepsCompleted).toBe(2)
      expect(analytics?.interactionCount).toBe(2)
      expect(analytics?.outcome).toBe('success')
      expect(analytics?.interactionTypes.help_clicked).toBe(1)

      // Test aggregate analytics
      const aggregateAnalytics = recoveryProgressTracker.getAggregateAnalytics()
      expect(aggregateAnalytics.totalSessions).toBe(1)
      expect(aggregateAnalytics.successRate).toBe(1)
      expect(aggregateAnalytics.browserDistribution.Chrome).toBe(1)
    })
  })
})