import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

describe('InvalidStateError Handling Tests', () => {
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

  describe('tdd-2.9: Verify InvalidStateError handling when recognition already running', () => {
    it('should detect and handle InvalidStateError when recognition is already active', () => {
      class SpeechRecognitionStateManager {
        private recognition: any
        private isRecognitionActive = false
        private pendingStart = false
        private stateChangeListeners: Function[] = []

        constructor() {
          this.recognition = new (global as any).SpeechRecognition()
          this.setupStateTracking()
        }

        setupStateTracking() {
          this.recognition.onstart = () => {
            this.isRecognitionActive = true
            this.pendingStart = false
            this.notifyStateChange('started')
          }

          this.recognition.onend = () => {
            this.isRecognitionActive = false
            this.pendingStart = false
            this.notifyStateChange('ended')
          }

          this.recognition.onerror = (event: any) => {
            if (event.error === 'InvalidStateError' || event.error.includes('already')) {
              this.handleInvalidStateError(event)
            } else {
              this.notifyStateChange('error', event)
            }
          }
        }

        async start(): Promise<{
          success: boolean
          action: string
          message: string
          previousState?: string
        }> {
          // Check current state before attempting to start
          if (this.isRecognitionActive) {
            return {
              success: false,
              action: 'ignored',
              message: 'Recognition is already active',
              previousState: 'active',
            }
          }

          if (this.pendingStart) {
            return {
              success: false,
              action: 'queued',
              message: 'Start request is already pending',
              previousState: 'pending',
            }
          }

          try {
            this.pendingStart = true
            this.recognition.start()
            
            return {
              success: true,
              action: 'started',
              message: 'Recognition started successfully',
            }
          } catch (error) {
            this.pendingStart = false
            
            if (error instanceof Error && this.isInvalidStateError(error)) {
              return this.handleStartInvalidState(error)
            }

            return {
              success: false,
              action: 'error',
              message: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        }

        isInvalidStateError(error: Error): boolean {
          return error.name === 'InvalidStateError' || 
                 error.message.includes('already started') ||
                 error.message.includes('recognition is running')
        }

        handleInvalidStateError(event: any) {
          return {
            action: 'invalid_state_detected',
            errorType: 'InvalidStateError',
            currentState: this.isRecognitionActive ? 'active' : 'inactive',
            resolution: this.resolveInvalidState(),
          }
        }

        handleStartInvalidState(error: Error) {
          // Force state synchronization
          this.synchronizeState()

          return {
            success: false,
            action: 'state_synchronized',
            message: 'Recognition state was out of sync. State has been synchronized.',
            resolution: 'wait_and_retry',
            suggestedDelay: 100,
          }
        }

        synchronizeState() {
          // Force stop to ensure clean state
          try {
            this.recognition.stop()
          } catch (e) {
            // Ignore errors when stopping
          }

          // Reset our tracking state
          this.isRecognitionActive = false
          this.pendingStart = false
          
          this.notifyStateChange('synchronized')
        }

        resolveInvalidState() {
          if (this.isRecognitionActive) {
            // Stop current recognition and prepare for restart
            this.stop()
            return {
              action: 'stopped_current',
              nextAction: 'restart_after_delay',
              delay: 100,
            }
          }

          // State is inconsistent - force synchronization
          this.synchronizeState()
          return {
            action: 'synchronized_state',
            nextAction: 'ready_to_start',
          }
        }

        stop() {
          if (!this.isRecognitionActive && !this.pendingStart) {
            return {
              success: true,
              action: 'already_stopped',
              message: 'Recognition was not active',
            }
          }

          try {
            this.recognition.stop()
            return {
              success: true,
              action: 'stopped',
              message: 'Recognition stopped successfully',
            }
          } catch (error) {
            this.synchronizeState() // Force clean state
            return {
              success: true,
              action: 'force_stopped',
              message: 'Recognition forcibly stopped and state synchronized',
            }
          }
        }

        getState() {
          return {
            isActive: this.isRecognitionActive,
            isPending: this.pendingStart,
            canStart: !this.isRecognitionActive && !this.pendingStart,
          }
        }

        onStateChange(listener: Function) {
          this.stateChangeListeners.push(listener)
        }

        notifyStateChange(state: string, data?: any) {
          this.stateChangeListeners.forEach(listener => listener(state, data))
        }
      }

      const stateManager = new SpeechRecognitionStateManager()
      const mockRecognition = stateManager['recognition']

      // Test normal start
      const initialState = stateManager.getState()
      expect(initialState.canStart).toBe(true)
      expect(initialState.isActive).toBe(false)

      const startResult = stateManager.start()
      expect(startResult).resolves.toMatchObject({
        success: true,
        action: 'started',
      })

      // Simulate recognition starting
      mockRecognition.onstart()
      const activeState = stateManager.getState()
      expect(activeState.isActive).toBe(true)
      expect(activeState.canStart).toBe(false)

      // Test attempting to start when already active
      const duplicateStartResult = stateManager.start()
      expect(duplicateStartResult).resolves.toMatchObject({
        success: false,
        action: 'ignored',
        previousState: 'active',
      })
    })

    it('should implement state recovery mechanisms for InvalidStateError', async () => {
      class RecognitionStateRecovery {
        private recognition: any
        private stateHistory: any[] = []
        private recoveryAttempts = 0
        private maxRecoveryAttempts = 3

        constructor() {
          this.recognition = new (global as any).SpeechRecognition()
          this.setupRecoveryHandling()
        }

        setupRecoveryHandling() {
          // Track all state changes
          this.recognition.onstart = () => this.recordStateChange('started')
          this.recognition.onend = () => this.recordStateChange('ended')
          this.recognition.onerror = (event: any) => {
            this.recordStateChange('error', { error: event.error, recovery: false })
            
            if (this.isStateError(event.error)) {
              this.initiateStateRecovery(event)
            }
          }
        }

        recordStateChange(state: string, metadata?: any) {
          this.stateHistory.push({
            state,
            timestamp: Date.now(),
            metadata,
          })

          // Keep only last 10 state changes
          if (this.stateHistory.length > 10) {
            this.stateHistory.shift()
          }
        }

        isStateError(errorType: string): boolean {
          const stateErrors = [
            'InvalidStateError',
            'already-started',
            'already running',
            'not allowed',
          ]
          
          return stateErrors.some(pattern => 
            errorType.toLowerCase().includes(pattern.toLowerCase())
          )
        }

        async initiateStateRecovery(errorEvent: any): Promise<{
          success: boolean
          strategy: string
          attempts: number
          nextAction?: string
        }> {
          if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
            return {
              success: false,
              strategy: 'max_attempts_reached',
              attempts: this.recoveryAttempts,
              nextAction: 'manual_intervention_required',
            }
          }

          this.recoveryAttempts++
          const strategy = this.selectRecoveryStrategy()
          
          try {
            await this.executeRecoveryStrategy(strategy)
            
            this.recordStateChange('recovery_success', { 
              strategy, 
              attempt: this.recoveryAttempts 
            })
            
            return {
              success: true,
              strategy,
              attempts: this.recoveryAttempts,
              nextAction: 'ready_to_retry',
            }
          } catch (error) {
            this.recordStateChange('recovery_failed', { 
              strategy, 
              attempt: this.recoveryAttempts,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            
            // Try next strategy
            return this.initiateStateRecovery(errorEvent)
          }
        }

        selectRecoveryStrategy(): string {
          const recentStates = this.stateHistory.slice(-5)
          const recentErrors = recentStates.filter(s => s.state === 'error')
          
          // If multiple recent errors, use aggressive recovery
          if (recentErrors.length >= 2) {
            return 'aggressive_reset'
          }

          // If last state was 'started', use gentle stop
          const lastState = recentStates[recentStates.length - 1]
          if (lastState?.state === 'started') {
            return 'gentle_stop_restart'
          }

          // Default strategy
          return 'force_stop_restart'
        }

        async executeRecoveryStrategy(strategy: string): Promise<void> {
          switch (strategy) {
            case 'gentle_stop_restart':
              return this.gentleStopRestart()
            
            case 'force_stop_restart':
              return this.forceStopRestart()
            
            case 'aggressive_reset':
              return this.aggressiveReset()
            
            default:
              throw new Error(`Unknown recovery strategy: ${strategy}`)
          }
        }

        async gentleStopRestart(): Promise<void> {
          // Try to stop gracefully
          try {
            this.recognition.stop()
            await this.waitForState('ended', 1000)
          } catch (e) {
            // If gentle stop fails, fall back to force stop
            throw new Error('Gentle stop failed')
          }
          
          // Wait a bit before restart
          await this.delay(100)
        }

        async forceStopRestart(): Promise<void> {
          // Force stop without waiting for graceful end
          try {
            this.recognition.abort()
          } catch (e) {
            // Ignore abort errors
          }
          
          // Wait for internal state to clear
          await this.delay(200)
        }

        async aggressiveReset(): Promise<void> {
          // Create new recognition instance
          const newRecognition = new (global as any).SpeechRecognition()
          
          // Copy settings from old instance
          newRecognition.continuous = this.recognition.continuous
          newRecognition.interimResults = this.recognition.interimResults
          newRecognition.lang = this.recognition.lang
          
          // Replace old instance
          this.recognition = newRecognition
          this.setupRecoveryHandling()
          
          await this.delay(300)
        }

        async waitForState(expectedState: string, timeout: number): Promise<void> {
          return new Promise((resolve, reject) => {
            const startTime = Date.now()
            
            const checkState = () => {
              const lastState = this.stateHistory[this.stateHistory.length - 1]
              
              if (lastState?.state === expectedState) {
                resolve()
                return
              }
              
              if (Date.now() - startTime > timeout) {
                reject(new Error(`Timeout waiting for state: ${expectedState}`))
                return
              }
              
              setTimeout(checkState, 50)
            }
            
            checkState()
          })
        }

        delay(ms: number): Promise<void> {
          return new Promise(resolve => setTimeout(resolve, ms))
        }

        getRecoveryStatus() {
          return {
            attempts: this.recoveryAttempts,
            maxAttempts: this.maxRecoveryAttempts,
            remainingAttempts: this.maxRecoveryAttempts - this.recoveryAttempts,
            stateHistory: this.stateHistory.slice(-5), // Last 5 states
            canRecover: this.recoveryAttempts < this.maxRecoveryAttempts,
          }
        }

        resetRecoveryCounter() {
          this.recoveryAttempts = 0
        }
      }

      const recovery = new RecognitionStateRecovery()
      
      // Test initial state
      const initialStatus = recovery.getRecoveryStatus()
      expect(initialStatus.attempts).toBe(0)
      expect(initialStatus.canRecover).toBe(true)

      // Simulate state error and recovery
      const mockErrorEvent = { error: 'InvalidStateError', message: 'Already running' }
      const recoveryResult = await recovery.initiateStateRecovery(mockErrorEvent)
      
      expect(recoveryResult.success).toBe(true)
      expect(recoveryResult.attempts).toBe(1)
      expect(['gentle_stop_restart', 'force_stop_restart', 'aggressive_reset'])
        .toContain(recoveryResult.strategy)

      // Test recovery status after attempt
      const statusAfterRecovery = recovery.getRecoveryStatus()
      expect(statusAfterRecovery.attempts).toBe(1)
      expect(statusAfterRecovery.remainingAttempts).toBe(2)
    })

    it('should prevent race conditions in speech recognition state management', () => {
      class RaceConditionPrevention {
        private recognition: any
        private operationQueue: any[] = []
        private isProcessingQueue = false
        private currentOperation: any = null
        private operationTimeout = 5000

        constructor() {
          this.recognition = new (global as any).SpeechRecognition()
          this.setupQueueProcessing()
        }

        setupQueueProcessing() {
          this.recognition.onstart = () => this.completeOperation('start', { success: true })
          this.recognition.onend = () => this.completeOperation('stop', { success: true })
          this.recognition.onerror = (event: any) => {
            this.completeOperation(this.currentOperation?.type, { 
              success: false, 
              error: event.error 
            })
          }
        }

        async queueOperation(type: 'start' | 'stop' | 'restart', priority: 'high' | 'normal' = 'normal'): Promise<any> {
          const operation = {
            type,
            priority,
            timestamp: Date.now(),
            id: `${type}-${Date.now()}-${Math.random()}`,
            promise: null as any,
            resolve: null as any,
            reject: null as any,
          }

          // Create promise for this operation
          operation.promise = new Promise((resolve, reject) => {
            operation.resolve = resolve
            operation.reject = reject
          })

          // Add to queue with priority handling
          if (priority === 'high') {
            this.operationQueue.unshift(operation)
          } else {
            this.operationQueue.push(operation)
          }

          // Start processing if not already processing
          if (!this.isProcessingQueue) {
            this.processQueue()
          }

          return operation.promise
        }

        async processQueue() {
          if (this.isProcessingQueue || this.operationQueue.length === 0) {
            return
          }

          this.isProcessingQueue = true

          while (this.operationQueue.length > 0) {
            const operation = this.operationQueue.shift()
            if (!operation) continue

            try {
              await this.executeOperation(operation)
            } catch (error) {
              operation.reject(error)
            }
          }

          this.isProcessingQueue = false
        }

        async executeOperation(operation: any): Promise<void> {
          this.currentOperation = operation

          // Set timeout for operation
          const timeoutId = setTimeout(() => {
            this.completeOperation(operation.type, {
              success: false,
              error: 'Operation timeout',
            })
          }, this.operationTimeout)

          try {
            switch (operation.type) {
              case 'start':
                await this.executeStart()
                break
              case 'stop':
                await this.executeStop()
                break
              case 'restart':
                await this.executeRestart()
                break
              default:
                throw new Error(`Unknown operation type: ${operation.type}`)
            }
          } finally {
            clearTimeout(timeoutId)
          }
        }

        async executeStart(): Promise<void> {
          // Check for conflicting operations
          if (this.hasConflictingOperation('start')) {
            throw new Error('Conflicting start operation already in queue')
          }

          this.recognition.start()
          // Completion will be handled by onstart event
        }

        async executeStop(): Promise<void> {
          if (this.hasConflictingOperation('stop')) {
            throw new Error('Conflicting stop operation already in queue')
          }

          this.recognition.stop()
          // Completion will be handled by onend event
        }

        async executeRestart(): Promise<void> {
          // Restart is composed of stop + start
          try {
            this.recognition.stop()
            await this.waitForCompletion('stop')
            
            // Small delay to ensure clean state
            await new Promise(resolve => setTimeout(resolve, 100))
            
            this.recognition.start()
            await this.waitForCompletion('start')
          } catch (error) {
            throw new Error(`Restart failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }

        hasConflictingOperation(operationType: string): boolean {
          return this.operationQueue.some(op => {
            // Start conflicts with start, restart conflicts with start/stop
            if (operationType === 'start') {
              return op.type === 'start' || op.type === 'restart'
            }
            if (operationType === 'stop') {
              return op.type === 'stop' || op.type === 'restart'
            }
            if (operationType === 'restart') {
              return true // Restart conflicts with everything
            }
            return false
          })
        }

        completeOperation(operationType: string, result: any) {
          if (this.currentOperation?.type === operationType) {
            if (result.success) {
              this.currentOperation.resolve(result)
            } else {
              this.currentOperation.reject(new Error(result.error || 'Operation failed'))
            }
            this.currentOperation = null
          }
        }

        async waitForCompletion(operationType: string): Promise<void> {
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`Timeout waiting for ${operationType} completion`))
            }, this.operationTimeout)

            const checkCompletion = () => {
              if (!this.currentOperation || this.currentOperation.type !== operationType) {
                clearTimeout(timeout)
                resolve()
              } else {
                setTimeout(checkCompletion, 50)
              }
            }

            checkCompletion()
          })
        }

        getQueueStatus() {
          return {
            queueLength: this.operationQueue.length,
            isProcessing: this.isProcessingQueue,
            currentOperation: this.currentOperation?.type || null,
            pendingOperations: this.operationQueue.map(op => ({
              type: op.type,
              priority: op.priority,
              age: Date.now() - op.timestamp,
            })),
          }
        }

        clearQueue() {
          // Reject all pending operations
          this.operationQueue.forEach(op => {
            op.reject(new Error('Operation cancelled - queue cleared'))
          })
          
          this.operationQueue = []
          this.isProcessingQueue = false
        }
      }

      const racePreventor = new RaceConditionPrevention()

      // Test normal operation queueing
      const startPromise = racePreventor.queueOperation('start')
      const status = racePreventor.getQueueStatus()
      
      expect(status.queueLength).toBeGreaterThan(0)
      expect(status.isProcessing).toBe(true)

      // Test high priority operation
      const highPriorityStop = racePreventor.queueOperation('stop', 'high')
      const statusWithPriority = racePreventor.getQueueStatus()
      
      // High priority operation should be at front
      expect(statusWithPriority.pendingOperations[0]?.type).toBe('stop')
      expect(statusWithPriority.pendingOperations[0]?.priority).toBe('high')

      // Test conflicting operations
      const conflictingStart = racePreventor.queueOperation('start')
      expect(conflictingStart).rejects.toThrow('Conflicting start operation')
    })

    it('should provide detailed state transition logging for debugging', () => {
      const stateTransitionLogger = {
        transitions: [] as any[],
        maxLogSize: 100,

        logTransition(fromState: string, toState: string, trigger: string, metadata?: any) {
          const transition = {
            id: `transition-${Date.now()}-${Math.random()}`,
            timestamp: Date.now(),
            fromState,
            toState,
            trigger,
            metadata: metadata || {},
            stackTrace: this.captureStackTrace(),
          }

          this.transitions.push(transition)

          // Trim log if too large
          if (this.transitions.length > this.maxLogSize) {
            this.transitions.shift()
          }

          return transition
        },

        captureStackTrace(): string[] {
          const stack = new Error().stack?.split('\n') || []
          return stack.slice(2, 6) // Skip Error() and captureStackTrace() lines
        },

        analyzeTransitions(timeWindow?: number): {
          totalTransitions: number
          uniqueStates: string[]
          transitionFrequency: Record<string, number>
          invalidTransitions: any[]
          recentErrors: any[]
          stateLoops: any[]
        } {
          const relevantTransitions = timeWindow
            ? this.transitions.filter(t => Date.now() - t.timestamp <= timeWindow)
            : this.transitions

          const transitionCounts = relevantTransitions.reduce((acc, t) => {
            const key = `${t.fromState} -> ${t.toState}`
            acc[key] = (acc[key] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          const uniqueStates = [...new Set([
            ...relevantTransitions.map(t => t.fromState),
            ...relevantTransitions.map(t => t.toState),
          ])]

          const invalidTransitions = this.findInvalidTransitions(relevantTransitions)
          const recentErrors = this.findErrorTransitions(relevantTransitions)
          const stateLoops = this.findStateLoops(relevantTransitions)

          return {
            totalTransitions: relevantTransitions.length,
            uniqueStates,
            transitionFrequency: transitionCounts,
            invalidTransitions,
            recentErrors,
            stateLoops,
          }
        },

        findInvalidTransitions(transitions: any[]): any[] {
          const validTransitions = new Set([
            'idle -> starting',
            'starting -> active',
            'active -> stopping',
            'stopping -> idle',
            'active -> error',
            'starting -> error',
            'error -> idle',
            'error -> recovering',
            'recovering -> idle',
          ])

          return transitions.filter(t => {
            const transitionKey = `${t.fromState} -> ${t.toState}`
            return !validTransitions.has(transitionKey)
          })
        },

        findErrorTransitions(transitions: any[]): any[] {
          return transitions
            .filter(t => t.toState === 'error' || t.trigger.includes('error'))
            .slice(-10) // Last 10 errors
        },

        findStateLoops(transitions: any[]): any[] {
          const loops = []
          
          for (let i = 0; i < transitions.length - 2; i++) {
            const t1 = transitions[i]
            const t2 = transitions[i + 1]
            const t3 = transitions[i + 2]
            
            // Detect A -> B -> A pattern
            if (t1.fromState === t3.toState && t1.toState === t3.fromState) {
              loops.push({
                pattern: `${t1.fromState} -> ${t1.toState} -> ${t3.toState}`,
                occurrences: [t1, t2, t3],
                timespan: t3.timestamp - t1.timestamp,
              })
            }
          }
          
          return loops
        },

        exportLog(format: 'json' | 'csv' | 'timeline' = 'json') {
          switch (format) {
            case 'json':
              return {
                metadata: {
                  exportTime: new Date().toISOString(),
                  transitionCount: this.transitions.length,
                  timeRange: {
                    start: this.transitions[0]?.timestamp,
                    end: this.transitions[this.transitions.length - 1]?.timestamp,
                  },
                },
                transitions: this.transitions,
                analysis: this.analyzeTransitions(),
              }

            case 'csv':
              const headers = 'Timestamp,From State,To State,Trigger,Metadata\n'
              const rows = this.transitions.map(t => 
                `${new Date(t.timestamp).toISOString()},${t.fromState},${t.toState},${t.trigger},"${JSON.stringify(t.metadata)}"`
              ).join('\n')
              return headers + rows

            case 'timeline':
              return this.transitions.map(t => ({
                time: new Date(t.timestamp).toISOString(),
                event: `${t.fromState} → ${t.toState}`,
                trigger: t.trigger,
                details: t.metadata,
              }))

            default:
              return this.transitions
          }
        },

        generateDiagram(): string {
          const states = new Set()
          const edges = new Map()

          this.transitions.forEach(t => {
            states.add(t.fromState)
            states.add(t.toState)
            
            const edgeKey = `${t.fromState}->${t.toState}`
            edges.set(edgeKey, (edges.get(edgeKey) || 0) + 1)
          })

          let diagram = 'State Transition Diagram:\n'
          diagram += 'States: ' + Array.from(states).join(', ') + '\n\n'
          diagram += 'Transitions:\n'
          
          edges.forEach((count, edge) => {
            diagram += `  ${edge} (${count} times)\n`
          })

          return diagram
        },

        clear() {
          this.transitions = []
        },
      }

      // Test transition logging
      stateTransitionLogger.logTransition('idle', 'starting', 'user_action', { userAgent: 'Chrome' })
      stateTransitionLogger.logTransition('starting', 'active', 'onstart_event')
      stateTransitionLogger.logTransition('active', 'error', 'invalid_state', { error: 'InvalidStateError' })
      stateTransitionLogger.logTransition('error', 'recovering', 'auto_recovery')
      stateTransitionLogger.logTransition('recovering', 'idle', 'recovery_complete')

      // Test analysis
      const analysis = stateTransitionLogger.analyzeTransitions()
      expect(analysis.totalTransitions).toBe(5)
      expect(analysis.uniqueStates).toContain('idle')
      expect(analysis.uniqueStates).toContain('starting')
      expect(analysis.uniqueStates).toContain('active')
      expect(analysis.uniqueStates).toContain('error')
      expect(analysis.recentErrors).toHaveLength(1)
      expect(analysis.recentErrors[0].toState).toBe('error')

      // Test export formats
      const jsonExport = stateTransitionLogger.exportLog('json')
      expect(jsonExport.metadata.transitionCount).toBe(5)
      expect(jsonExport.transitions).toHaveLength(5)

      const csvExport = stateTransitionLogger.exportLog('csv')
      expect(csvExport).toContain('Timestamp,From State,To State,Trigger,Metadata')
      expect(csvExport).toContain('idle,starting,user_action')

      const timelineExport = stateTransitionLogger.exportLog('timeline')
      expect(timelineExport).toHaveLength(5)
      expect(timelineExport[0].event).toBe('idle → starting')

      // Test diagram generation
      const diagram = stateTransitionLogger.generateDiagram()
      expect(diagram).toContain('State Transition Diagram:')
      expect(diagram).toContain('idle->starting (1 times)')
    })
  })
})