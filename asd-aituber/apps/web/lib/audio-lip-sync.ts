/**
 * AudioLipSync - Real-time audio analysis for VRM lip sync
 * Based on aituber-kit implementation with real AudioContext + AnalyserNode
 */

export class AudioLipSync {
  public readonly audioContext: AudioContext
  public readonly analyser: AnalyserNode
  public readonly timeDomainData: Float32Array
  private currentSource: AudioBufferSourceNode | null = null
  private isPlaying: boolean = false

  constructor() {
    // ✅ Phase 1.2: Enhanced AudioContext initialization with error handling
    this.audioContext = this.initializeAudioContext()
    
    // Create analyser node for real-time audio analysis
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 2048 // aituber-kit standard
    this.analyser.smoothingTimeConstant = 0.8 // Smooth volume changes
    
    // Create buffer for time domain data
    this.timeDomainData = new Float32Array(this.analyser.fftSize)
    
    console.log('[AudioLipSync] Initialized with AudioContext state:', this.audioContext.state)
  }

  /**
   * ✅ Phase 1.2: Initialize AudioContext with browser compatibility and error handling
   */
  private initializeAudioContext(): AudioContext {
    try {
      // Try modern AudioContext first
      const context = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Handle suspended context (required for Chrome autoplay policy)
      if (context.state === 'suspended') {
        console.warn('[AudioLipSync] AudioContext suspended, will resume on first interaction')
        
        // Resume context on user interaction
        const resumeContext = async () => {
          try {
            await context.resume()
            console.log('[AudioLipSync] AudioContext resumed successfully')
            document.removeEventListener('click', resumeContext)
            document.removeEventListener('touchstart', resumeContext)
          } catch (error) {
            console.error('[AudioLipSync] Failed to resume AudioContext:', error)
          }
        }
        
        document.addEventListener('click', resumeContext, { once: true })
        document.addEventListener('touchstart', resumeContext, { once: true })
      }
      
      return context
    } catch (error) {
      console.error('[AudioLipSync] Failed to initialize AudioContext:', error)
      throw new Error('AudioContext not supported or failed to initialize')
    }
  }

  /**
   * ✅ Phase 1.4: Get current volume level from AnalyserNode
   * ✅ Phase 1.5: Apply sigmoid transformation for natural lip sync volume
   * Returns 0-1 range value based on actual audio playback
   * Uses same algorithm as aituber-kit
   */
  getVolume(): number {
    if (!this.isPlaying) {
      return 0
    }
    
    // ✅ Phase 1.4: Get current audio data from AnalyserNode
    this.analyser.getFloatTimeDomainData(this.timeDomainData)
    
    // Calculate maximum volume from time domain data (RMS would be alternative)
    let volume = 0.0
    for (let i = 0; i < this.timeDomainData.length; i++) {
      volume = Math.max(volume, Math.abs(this.timeDomainData[i]))
    }
    
    // ✅ Phase 1.5: Apply sigmoid transformation (same as aituber-kit)
    // This makes the volume response more natural and responsive
    // Formula: 1 / (1 + exp(-45 * volume + 5))
    volume = 1 / (1 + Math.exp(-45 * volume + 5))
    
    // Filter out very small values to prevent micro-movements
    if (volume < 0.1) {
      volume = 0
    }
    
    return volume
  }

  /**
   * ✅ Phase 1.3: Decode ArrayBuffer to AudioBuffer with enhanced error handling
   */
  async decodeAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('Invalid or empty audio buffer provided')
    }
    
    try {
      console.log(`[AudioLipSync] Decoding audio buffer of ${arrayBuffer.byteLength} bytes`)
      
      // Clone the buffer to avoid "detached ArrayBuffer" errors
      const clonedBuffer = arrayBuffer.slice(0)
      const audioBuffer = await this.audioContext.decodeAudioData(clonedBuffer)
      
      console.log(`[AudioLipSync] Successfully decoded audio: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz, ${audioBuffer.numberOfChannels} channels`)
      
      return audioBuffer
    } catch (error) {
      console.error('[AudioLipSync] Audio decode failed:', error)
      
      // Enhanced error reporting
      if (error instanceof DOMException) {
        if (error.name === 'EncodingError') {
          throw new Error('Invalid audio format - ensure the audio is in a supported format (WAV, MP3, etc.)')
        } else if (error.name === 'NotSupportedError') {
          throw new Error('Audio format not supported by this browser')
        }
      }
      
      throw new Error(`Failed to decode audio buffer: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Create and setup BufferSourceNode
   */
  private createBufferSource(audioBuffer: AudioBuffer): AudioBufferSourceNode {
    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    
    // Connect to both destination (speakers) and analyser (for volume detection)
    source.connect(this.audioContext.destination)
    source.connect(this.analyser)
    
    return source
  }

  /**
   * Play audio with real-time lip sync analysis
   */
  async playWithLipSync(arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      // Stop any current playback
      this.stop()
      
      // Resume AudioContext if needed (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
      
      // Decode audio data
      const audioBuffer = await this.decodeAudioBuffer(arrayBuffer)
      
      // Create and setup source
      this.currentSource = this.createBufferSource(audioBuffer)
      
      // Setup event handlers
      this.currentSource.onended = () => {
        this.isPlaying = false
        this.currentSource = null
      }
      
      // Start playback
      this.currentSource.start()
      this.isPlaying = true
      
    } catch (error) {
      console.error('AudioLipSync playback failed:', error)
      this.isPlaying = false
      this.currentSource = null
      throw error
    }
  }

  /**
   * Stop current audio playback
   */
  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop()
      } catch (error) {
        // Ignore InvalidStateError from stopping already stopped source
      }
      this.currentSource = null
    }
    this.isPlaying = false
  }

  /**
   * Check if audio is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * Resume AudioContext (needed for user interaction compliance)
   */
  async resume(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop()
    
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close()
    }
  }
}