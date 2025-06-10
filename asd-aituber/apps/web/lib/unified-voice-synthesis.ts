/**
 * Unified Voice Synthesis System
 * VOICEVOX と Web Speech API の統合音声合成システム
 */

import type { Emotion } from '@asd-aituber/types'
import { voicevoxClient, type VoicevoxSpeaker, type VoicevoxSynthesisOptions, type VoicevoxAudioQuery } from './voicevox-client'
import { createEmotionalVoiceOptions } from './emotion-voice-mapping'
import { SpeechSynthesisManager, type SpeechSynthesisOptions, type SpeechSynthesisCallbacks } from './speech-synthesis'

export type VoiceEngine = 'voicevox' | 'webspeech' | 'auto'

export interface UnifiedVoiceOptions {
  text: string
  emotion?: Emotion
  mode?: 'asd' | 'nt'
  engine?: VoiceEngine
  speaker?: string | number  // VOICEVOX speaker ID
  // Web Speech API options
  voice?: SpeechSynthesisVoice | null
  lang?: string
  // Common options
  volume?: number
  callbacks?: SpeechSynthesisCallbacks
  // 新規追加: 音素データとオーディオ要素のコールバック
  onLipSyncData?: (audioQuery: VoicevoxAudioQuery) => void
  onAudioReady?: (audio: HTMLAudioElement) => void
  // ✅ AudioLipSync対応のコールバック
  onAudioBufferReady?: (audioBuffer: ArrayBuffer) => void
}

export interface VoiceEngineStatus {
  voicevox: {
    available: boolean
    speakers: VoicevoxSpeaker[]
    serverUrl: string
    error?: string
  }
  webspeech: {
    available: boolean
    voices: SpeechSynthesisVoice[]
    error?: string
  }
}

/**
 * 統合音声合成マネージャー
 */
export class UnifiedVoiceSynthesis {
  private webSpeechManager: SpeechSynthesisManager
  private preferredEngine: VoiceEngine = 'auto'
  private currentAudio: HTMLAudioElement | null = null
  private isPlaying: boolean = false
  private callbacks: SpeechSynthesisCallbacks = {}
  // 新規追加: 音素データとオーディオ要素のコールバック
  private onLipSyncData?: (audioQuery: VoicevoxAudioQuery) => void
  private onAudioReady?: (audio: HTMLAudioElement) => void
  // ✅ AudioLipSync対応のコールバック
  private onAudioBufferReady?: (audioBuffer: ArrayBuffer) => void

  constructor() {
    this.webSpeechManager = new SpeechSynthesisManager()
    this.initializeVoicevox()
  }

  /**
   * VOICEVOXの初期化
   */
  private async initializeVoicevox(): Promise<void> {
    try {
      await voicevoxClient.checkAvailability()
      if (voicevoxClient.getIsAvailable()) {
        console.log('✅ VOICEVOX engine initialized successfully')
      } else {
        console.warn('⚠️ VOICEVOX engine not available, falling back to Web Speech API')
      }
    } catch (error) {
      console.error('Failed to initialize VOICEVOX:', error)
    }
  }

  /**
   * 音声エンジンの状態を取得
   */
  async getEngineStatus(): Promise<VoiceEngineStatus> {
    const status: VoiceEngineStatus = {
      voicevox: {
        available: false,
        speakers: [],
        serverUrl: 'http://localhost:50021'
      },
      webspeech: {
        available: false,
        voices: []
      }
    }

    // VOICEVOX状態チェック
    try {
      status.voicevox.available = await voicevoxClient.checkAvailability()
      status.voicevox.speakers = voicevoxClient.getSpeakers()
      status.voicevox.serverUrl = 'http://localhost:50021' // TODO: 設定から取得
    } catch (error) {
      status.voicevox.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Web Speech API状態チェック
    try {
      status.webspeech.available = this.webSpeechManager.getIsSupported()
      status.webspeech.voices = this.webSpeechManager.getAllVoices()
    } catch (error) {
      status.webspeech.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return status
  }

  /**
   * 最適な音声エンジンを自動選択
   */
  private async selectBestEngine(requestedEngine: VoiceEngine): Promise<'voicevox' | 'webspeech'> {
    if (requestedEngine === 'voicevox') {
      return voicevoxClient.getIsAvailable() ? 'voicevox' : 'webspeech'
    }
    
    if (requestedEngine === 'webspeech') {
      return 'webspeech'
    }

    // auto の場合
    const isVoicevoxAvailable = voicevoxClient.getIsAvailable()
    
    // VOICEVOXが利用可能な場合は優先
    if (isVoicevoxAvailable) {
      return 'voicevox'
    }
    
    return 'webspeech'
  }

  /**
   * 音声合成を実行
   */
  async speak(options: UnifiedVoiceOptions): Promise<boolean> {
    const {
      text,
      emotion = 'neutral',
      mode = 'nt',
      engine = 'auto',
      speaker = '46',
      voice,
      lang = 'ja-JP',
      volume = 1.0,
      callbacks = {},
      onLipSyncData,
      onAudioReady,
      onAudioBufferReady
    } = options

    // 既存の再生を停止
    this.stop()

    // コールバックを保存
    this.callbacks = callbacks
    this.onLipSyncData = onLipSyncData
    this.onAudioReady = onAudioReady
    this.onAudioBufferReady = onAudioBufferReady

    try {
      const selectedEngine = await this.selectBestEngine(engine)
      console.log(`🎵 Using ${selectedEngine} engine for synthesis`)

      if (selectedEngine === 'voicevox') {
        return await this.speakWithVoicevox(text, emotion, mode, speaker, volume)
      } else {
        return await this.speakWithWebSpeech(text, emotion, mode, voice, lang, volume)
      }
    } catch (error) {
      console.error('Unified voice synthesis error:', error)
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Voice synthesis failed')
      return false
    }
  }

  /**
   * VOICEVOXで音声合成
   */
  private async speakWithVoicevox(
    text: string,
    emotion: Emotion,
    mode: 'asd' | 'nt',
    speaker: string | number,
    volume: number
  ): Promise<boolean> {
    try {
      this.callbacks.onStart?.()
      this.isPlaying = true

      // 感情に基づいたパラメータを取得
      const voiceOptions = createEmotionalVoiceOptions(text, emotion, mode, speaker)
      
      console.log('🎵 VOICEVOX synthesis with emotion:', {
        emotion,
        mode,
        parameters: {
          speed: voiceOptions.speed,
          pitch: voiceOptions.pitch,
          intonation: voiceOptions.intonation
        }
      })

      // 音声合成を実行（音素データ付き）
      const result = await voicevoxClient.synthesizeWithTiming(voiceOptions)
      
      // 音素データがある場合はコールバックで渡す
      if (result.audioQuery && this.onLipSyncData) {
        console.log('📊 Passing audioQuery data to lip sync callback')
        this.onLipSyncData(result.audioQuery)
      }
      
      // ✅ AudioBuffer を直接コールバックで提供（aituber-kit方式）
      if (this.onAudioBufferReady) {
        console.log('🎵 Passing ArrayBuffer directly for AudioLipSync')
        this.onAudioBufferReady(result.audioBuffer)
        // AudioLipSync を使う場合は、HTMLAudioElement は作成しない
        return true
      }
      
      // 従来方式（HTMLAudioElement）のフォールバック
      const audioBlob = new Blob([result.audioBuffer], { type: 'audio/wav' })
      const audioUrl = URL.createObjectURL(audioBlob)

      // HTMLAudioElementで再生
      this.currentAudio = new Audio(audioUrl)
      this.currentAudio.volume = volume

      // HTMLAudioElementをコールバックで提供
      if (this.onAudioReady) {
        console.log('🎧 Passing HTMLAudioElement to callback')
        this.onAudioReady(this.currentAudio)
      }

      this.currentAudio.onended = () => {
        this.isPlaying = false
        this.callbacks.onEnd?.()
        URL.revokeObjectURL(audioUrl)
      }

      this.currentAudio.onerror = (error) => {
        this.isPlaying = false
        this.callbacks.onError?.('Audio playback failed')
        URL.revokeObjectURL(audioUrl)
      }

      await this.currentAudio.play()
      return true

    } catch (error) {
      this.isPlaying = false
      console.error('VOICEVOX synthesis failed:', error)
      
      // フォールバックとしてWeb Speech APIを試行
      console.log('🔄 Falling back to Web Speech API')
      return await this.speakWithWebSpeech(text, emotion, mode, undefined, 'ja-JP', volume)
    }
  }

  /**
   * Web Speech APIで音声合成
   */
  private async speakWithWebSpeech(
    text: string,
    emotion: Emotion,
    mode: 'asd' | 'nt',
    voice?: SpeechSynthesisVoice | null,
    lang: string = 'ja-JP',
    volume: number = 1.0
  ): Promise<boolean> {
    // 感情に基づいたパラメータを取得（Web Speech API用に変換）
    const emotionParams = this.getWebSpeechParamsForEmotion(emotion, mode)
    
    const options: SpeechSynthesisOptions = {
      voice,
      lang,
      volume,
      rate: emotionParams.rate,
      pitch: emotionParams.pitch
    }

    this.webSpeechManager.setCallbacks(this.callbacks)
    return this.webSpeechManager.speak(text, options)
  }

  /**
   * 感情をWeb Speech APIパラメータに変換
   */
  private getWebSpeechParamsForEmotion(emotion: Emotion, mode: 'asd' | 'nt') {
    // emotion-voice-mappingの値をWeb Speech API用に調整
    const baseRate = 1.0
    const basePitch = 1.0

    const adjustments = {
      asd: {
        joy: { rate: 1.05, pitch: 1.02 },
        sadness: { rate: 0.95, pitch: 0.98 },
        anger: { rate: 1.0, pitch: 1.01 },
        surprise: { rate: 1.15, pitch: 1.05 },
        fear: { rate: 0.9, pitch: 1.03 }
      },
      nt: {
        joy: { rate: 1.2, pitch: 1.08 },
        sadness: { rate: 0.8, pitch: 0.92 },
        anger: { rate: 1.1, pitch: 1.02 },
        surprise: { rate: 1.4, pitch: 1.12 },
        fear: { rate: 0.85, pitch: 1.08 }
      }
    }

    const modeAdjustments = adjustments[mode]
    const emotionAdjustment = modeAdjustments[emotion as keyof typeof modeAdjustments] || 
                              { rate: baseRate, pitch: basePitch }

    return {
      rate: emotionAdjustment.rate,
      pitch: emotionAdjustment.pitch
    }
  }

  /**
   * 音声再生を停止
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }
    
    this.webSpeechManager.stop()
    this.isPlaying = false
  }

  /**
   * 音声再生を一時停止
   */
  pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause()
      this.callbacks.onPause?.()
    } else {
      this.webSpeechManager.pause()
    }
  }

  /**
   * 音声再生を再開
   */
  resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play()
      this.callbacks.onResume?.()
    } else {
      this.webSpeechManager.resume()
    }
  }

  /**
   * 再生状態を取得
   */
  getIsSpeaking(): boolean {
    return this.isPlaying || this.webSpeechManager.getIsSpeaking()
  }

  /**
   * 優先エンジンを設定
   */
  setPreferredEngine(engine: VoiceEngine): void {
    this.preferredEngine = engine
  }

  /**
   * 優先エンジンを取得
   */
  getPreferredEngine(): VoiceEngine {
    return this.preferredEngine
  }

  /**
   * 利用可能なVOICEVOX話者を取得
   */
  getVoicevoxSpeakers(): VoicevoxSpeaker[] {
    return voicevoxClient.getSpeakers()
  }

  /**
   * Web Speech API音声を取得
   */
  getWebSpeechVoices(): SpeechSynthesisVoice[] {
    return this.webSpeechManager.getAllVoices()
  }

  /**
   * リソースのクリーンアップ
   */
  destroy(): void {
    this.stop()
    this.webSpeechManager.destroy()
    this.callbacks = {}
  }
}

/**
 * デフォルトの統合音声合成インスタンス
 */
export const unifiedVoiceSynthesis = typeof window !== 'undefined' ? new UnifiedVoiceSynthesis() : null

/**
 * 便利関数：感情を込めた音声合成
 */
export async function speakWithEmotion(
  text: string,
  emotion: Emotion = 'neutral',
  mode: 'asd' | 'nt' = 'nt',
  engine: VoiceEngine = 'auto'
): Promise<boolean> {
  if (!unifiedVoiceSynthesis) {
    console.warn('Voice synthesis not available on server side')
    return false
  }
  return await unifiedVoiceSynthesis.speak({
    text,
    emotion,
    mode,
    engine
  })
}