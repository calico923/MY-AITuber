/**
 * Web Speech Synthesis API Wrapper
 * 音声合成のための包括的なシステム
 */

export interface SpeechSynthesisOptions {
  voice?: SpeechSynthesisVoice | null
  voiceName?: string
  lang?: string
  pitch?: number      // 0.0 - 2.0
  rate?: number       // 0.1 - 10.0
  volume?: number     // 0.0 - 1.0
}

export interface SpeechSynthesisCallbacks {
  onStart?: () => void
  onEnd?: () => void
  onPause?: () => void
  onResume?: () => void
  onError?: (error: string) => void
  onBoundary?: (charIndex: number, charLength: number) => void
  onWord?: (charIndex: number) => void
}

export interface VoiceInfo {
  voice: SpeechSynthesisVoice
  isJapanese: boolean
  quality: 'high' | 'medium' | 'low'
  type: 'local' | 'remote'
}

export class SpeechSynthesisManager {
  private synthesis: SpeechSynthesis
  private isSupported: boolean = false
  private voices: SpeechSynthesisVoice[] = []
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private isSpeaking: boolean = false
  private callbacks: SpeechSynthesisCallbacks = {}
  private options: SpeechSynthesisOptions
  private voicesLoaded: boolean = false

  constructor(options: SpeechSynthesisOptions = {}) {
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null as any
    this.isSupported = !!this.synthesis
    
    this.options = {
      lang: 'ja-JP',
      pitch: 1.0,
      rate: 1.0,
      volume: 1.0,
      ...options
    }

    if (this.isSupported) {
      this.initializeVoices()
    }
  }

  /**
   * 利用可能な音声を初期化
   */
  private initializeVoices(): void {
    // 音声リストの読み込み
    const loadVoices = () => {
      this.voices = this.synthesis.getVoices()
      this.voicesLoaded = this.voices.length > 0
      console.log(`Loaded ${this.voices.length} voices`)
    }

    loadVoices()

    // 一部のブラウザでは非同期で音声が読み込まれる
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices
    }

    // フォールバック: 1秒後に再チェック
    setTimeout(loadVoices, 1000)
  }

  /**
   * 日本語音声を取得
   */
  getJapaneseVoices(): VoiceInfo[] {
    return this.voices
      .filter(voice => voice.lang.includes('ja') || voice.lang.includes('JP'))
      .map(voice => ({
        voice,
        isJapanese: true,
        quality: this.evaluateVoiceQuality(voice),
        type: (voice.localService ? 'local' : 'remote') as 'local' | 'remote'
      }))
      .sort((a, b) => {
        // 品質の高い順にソート
        const qualityOrder = { high: 3, medium: 2, low: 1 }
        return qualityOrder[b.quality] - qualityOrder[a.quality]
      })
  }

  /**
   * 音声の品質を評価
   */
  private evaluateVoiceQuality(voice: SpeechSynthesisVoice): 'high' | 'medium' | 'low' {
    const name = voice.name.toLowerCase()
    
    // 高品質な音声の判定
    if (name.includes('premium') || 
        name.includes('enhanced') || 
        name.includes('neural') ||
        name.includes('wavenet') ||
        name.includes('kyoko') ||  // macOS高品質日本語音声
        name.includes('otoya')) {   // macOS高品質日本語音声
      return 'high'
    }
    
    // ローカル音声は中品質
    if (voice.localService) {
      return 'medium'
    }
    
    // その他は低品質
    return 'low'
  }

  /**
   * 最適な日本語音声を自動選択
   */
  selectBestJapaneseVoice(): SpeechSynthesisVoice | null {
    const japaneseVoices = this.getJapaneseVoices()
    
    if (japaneseVoices.length === 0) {
      console.warn('No Japanese voices available')
      return null
    }

    // 最高品質の音声を選択
    return japaneseVoices[0].voice
  }

  /**
   * テキストを音声で再生
   */
  speak(text: string, options?: SpeechSynthesisOptions): boolean {
    if (!this.isSupported) {
      this.callbacks.onError?.('Speech synthesis is not supported')
      return false
    }

    // 既存の音声を停止
    if (this.isSpeaking) {
      this.stop()
    }

    // 音声が未読み込みの場合
    if (!this.voicesLoaded) {
      console.warn('Voices not loaded yet, retrying...')
      setTimeout(() => this.speak(text, options), 500)
      return false
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text)
      const mergedOptions = { ...this.options, ...options }

      // 音声の設定
      if (mergedOptions.voice) {
        utterance.voice = mergedOptions.voice
      } else if (mergedOptions.voiceName) {
        const voice = this.voices.find(v => v.name === mergedOptions.voiceName)
        if (voice) utterance.voice = voice
      } else {
        // 日本語の場合は最適な音声を自動選択
        if (mergedOptions.lang?.includes('ja')) {
          const bestVoice = this.selectBestJapaneseVoice()
          if (bestVoice) utterance.voice = bestVoice
        }
      }

      utterance.lang = mergedOptions.lang || 'ja-JP'
      utterance.pitch = mergedOptions.pitch || 1.0
      utterance.rate = mergedOptions.rate || 1.0
      utterance.volume = mergedOptions.volume || 1.0

      // イベントハンドラーの設定
      this.setupUtteranceHandlers(utterance)

      this.currentUtterance = utterance
      this.synthesis.speak(utterance)
      this.isSpeaking = true

      console.log('Speaking:', {
        text: text.substring(0, 50) + '...',
        voice: utterance.voice?.name,
        lang: utterance.lang,
        rate: utterance.rate
      })

      return true
    } catch (error) {
      console.error('Speech synthesis error:', error)
      this.callbacks.onError?.(`Failed to speak: ${error}`)
      return false
    }
  }

  /**
   * 発話イベントハンドラーの設定
   */
  private setupUtteranceHandlers(utterance: SpeechSynthesisUtterance): void {
    utterance.onstart = () => {
      this.isSpeaking = true
      this.callbacks.onStart?.()
    }

    utterance.onend = () => {
      this.isSpeaking = false
      this.currentUtterance = null
      this.callbacks.onEnd?.()
    }

    utterance.onpause = () => {
      this.callbacks.onPause?.()
    }

    utterance.onresume = () => {
      this.callbacks.onResume?.()
    }

    utterance.onerror = (event) => {
      this.isSpeaking = false
      this.currentUtterance = null
      
      let errorMessage = 'Speech synthesis error'
      switch (event.error) {
        case 'canceled':
          errorMessage = '音声合成がキャンセルされました'
          break
        case 'interrupted':
          errorMessage = '音声合成が中断されました'
          break
        case 'audio-busy':
          errorMessage = 'オーディオデバイスが使用中です'
          break
        case 'audio-hardware':
          errorMessage = 'オーディオハードウェアエラー'
          break
        case 'network':
          errorMessage = 'ネットワークエラー'
          break
        case 'synthesis-unavailable':
          errorMessage = '音声合成が利用できません'
          break
        case 'synthesis-failed':
          errorMessage = '音声合成に失敗しました'
          break
        case 'language-unavailable':
          errorMessage = '指定された言語が利用できません'
          break
        case 'voice-unavailable':
          errorMessage = '指定された音声が利用できません'
          break
        case 'text-too-long':
          errorMessage = 'テキストが長すぎます'
          break
        default:
          errorMessage = `音声合成エラー: ${event.error}`
      }

      this.callbacks.onError?.(errorMessage)
    }

    // 境界イベント（単語ごと）
    utterance.onboundary = (event) => {
      this.callbacks.onBoundary?.(event.charIndex, event.charLength || 0)
      
      if (event.name === 'word') {
        this.callbacks.onWord?.(event.charIndex)
      }
    }
  }

  /**
   * 音声合成を停止
   */
  stop(): void {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.cancel()
      this.isSpeaking = false
      this.currentUtterance = null
    }
  }

  /**
   * 音声合成を一時停止
   */
  pause(): void {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.pause()
    }
  }

  /**
   * 音声合成を再開
   */
  resume(): void {
    if (this.synthesis) {
      this.synthesis.resume()
    }
  }

  /**
   * コールバック関数を設定
   */
  setCallbacks(callbacks: SpeechSynthesisCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  /**
   * 利用可能な全音声を取得
   */
  getAllVoices(): SpeechSynthesisVoice[] {
    return this.voices
  }

  /**
   * 対応状況を取得
   */
  getIsSupported(): boolean {
    return this.isSupported
  }

  /**
   * 現在の発話状態を取得
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking
  }

  /**
   * オプションを更新
   */
  updateOptions(newOptions: Partial<SpeechSynthesisOptions>): void {
    this.options = { ...this.options, ...newOptions }
  }

  /**
   * リソースをクリーンアップ
   */
  destroy(): void {
    this.stop()
    this.callbacks = {}
    this.currentUtterance = null
  }
}

/**
 * 簡易音声合成関数
 */
export function speakText(
  text: string, 
  options?: SpeechSynthesisOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    const manager = new SpeechSynthesisManager(options)
    
    manager.setCallbacks({
      onEnd: () => {
        manager.destroy()
        resolve()
      },
      onError: (error) => {
        manager.destroy()
        reject(new Error(error))
      }
    })

    const success = manager.speak(text)
    if (!success) {
      manager.destroy()
      reject(new Error('Failed to start speech synthesis'))
    }
  })
}