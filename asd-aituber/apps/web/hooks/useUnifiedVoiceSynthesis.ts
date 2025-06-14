/**
 * Unified Voice Synthesis React Hook
 * VOICEVOX と Web Speech API を統合した音声合成フック
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Emotion } from '@asd-aituber/types'
import { performanceMonitor } from '@/lib/performance-monitor'
import { 
  UnifiedVoiceSynthesis,
  unifiedVoiceSynthesis,
  type VoiceEngine,
  type UnifiedVoiceOptions,
  type VoiceEngineStatus
} from '@/lib/unified-voice-synthesis'
import { type VoicevoxSpeaker, type VoicevoxAudioQuery } from '@/lib/voicevox-client'
import { type SpeechSynthesisCallbacks } from '@/lib/speech-synthesis'
import { AudioContextManager } from '@/libs/audio-context-manager'

export interface UseUnifiedVoiceSynthesisOptions {
  preferredEngine?: VoiceEngine
  defaultSpeaker?: string | number
  defaultEmotion?: Emotion
  defaultMode?: 'asd' | 'nt'
  volume?: number
  callbacks?: SpeechSynthesisCallbacks
  // Phase 4: 音素データとオーディオ要素のコールバック
  onLipSyncData?: (audioQuery: VoicevoxAudioQuery) => void
  onAudioReady?: (audio: HTMLAudioElement) => void
  // ✅ AudioLipSync対応のコールバック
  onAudioBufferReady?: (audioBuffer: ArrayBuffer) => void
}

export interface UseUnifiedVoiceSynthesisReturn {
  // 音声合成制御
  speak: (text: string, options?: Partial<UnifiedVoiceOptions>) => Promise<boolean>
  stop: () => void
  pause: () => void
  resume: () => void
  
  // 状態
  isSpeaking: boolean
  isLoading: boolean
  error: string | null
  
  // エンジン設定
  currentEngine: VoiceEngine
  setPreferredEngine: (engine: VoiceEngine) => void
  engineStatus: VoiceEngineStatus | null
  
  // VOICEVOX設定
  voicevoxSpeakers: VoicevoxSpeaker[]
  selectedSpeaker: string | number
  setSelectedSpeaker: (speaker: string | number) => void
  
  // Web Speech API設定
  webSpeechVoices: SpeechSynthesisVoice[]
  selectedWebVoice: SpeechSynthesisVoice | null
  setSelectedWebVoice: (voice: SpeechSynthesisVoice | null) => void
  
  // 共通設定
  volume: number
  setVolume: (volume: number) => void
  emotion: Emotion
  setEmotion: (emotion: Emotion) => void
  mode: 'asd' | 'nt'
  setMode: (mode: 'asd' | 'nt') => void
  
  // ユーティリティ
  refreshEngines: () => Promise<void>
  testVoice: (text?: string) => Promise<boolean>
}

export function useUnifiedVoiceSynthesis(
  options: UseUnifiedVoiceSynthesisOptions = {}
): UseUnifiedVoiceSynthesisReturn {
  const {
    preferredEngine = 'auto',
    defaultSpeaker = '46',
    defaultEmotion = 'neutral',
    defaultMode = 'nt',
    volume: initialVolume = 1.0,
    callbacks: externalCallbacks = {},
    onLipSyncData,
    onAudioReady,
    onAudioBufferReady
  } = options

  // 状態管理
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentEngine, setCurrentEngine] = useState<VoiceEngine>(preferredEngine)
  const [engineStatus, setEngineStatus] = useState<VoiceEngineStatus | null>(null)
  
  // VOICEVOX設定
  const [voicevoxSpeakers, setVoicevoxSpeakers] = useState<VoicevoxSpeaker[]>([])
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | number>(defaultSpeaker)
  
  // Web Speech API設定
  const [webSpeechVoices, setWebSpeechVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedWebVoice, setSelectedWebVoice] = useState<SpeechSynthesisVoice | null>(null)
  
  // 共通設定
  const [volume, setVolume] = useState(initialVolume)
  const [emotion, setEmotion] = useState<Emotion>(defaultEmotion)
  const [mode, setMode] = useState<'asd' | 'nt'>(defaultMode)

  const isMountedRef = useRef(true)
  const synthesizerRef = useRef<UnifiedVoiceSynthesis | null>(unifiedVoiceSynthesis)
  const audioManagerRef = useRef<AudioContextManager | null>(null)

  // 初期化
  useEffect(() => {
    // AudioContextManagerの初期化
    audioManagerRef.current = AudioContextManager.getInstance()
    
    if (!synthesizerRef.current) {
      // クライアントサイドで初期化
      if (typeof window !== 'undefined') {
        synthesizerRef.current = new UnifiedVoiceSynthesis()
      } else {
        return
      }
    }

    const initializeEngines = async () => {
      setIsLoading(true)
      try {
        await refreshEngines()
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to initialize voice engines:', error)
        }
        setError('Failed to initialize voice engines')
      } finally {
        setIsLoading(false)
      }
    }

    initializeEngines()

    return () => {
      isMountedRef.current = false
      synthesizerRef.current?.destroy()
      // AudioContextManagerの状態をリセット
      audioManagerRef.current?.setIsSpeaking(false)
    }
  }, [])

  // コールバックの設定
  useEffect(() => {
    const callbacks: SpeechSynthesisCallbacks = {
      onStart: () => {
        if (isMountedRef.current) {
          setIsSpeaking(true)
          setError(null)
          // AudioContextManagerに音声合成開始を通知
          audioManagerRef.current?.setIsSpeaking(true)
        }
        externalCallbacks.onStart?.()
      },
      onEnd: () => {
        if (isMountedRef.current) {
          setIsSpeaking(false)
          // AudioContextManagerに音声合成終了を通知
          audioManagerRef.current?.setIsSpeaking(false)
        }
        externalCallbacks.onEnd?.()
      },
      onPause: () => {
        externalCallbacks.onPause?.()
      },
      onResume: () => {
        externalCallbacks.onResume?.()
      },
      onError: (errorMessage) => {
        if (isMountedRef.current) {
          setError(errorMessage)
          setIsSpeaking(false)
          // AudioContextManagerにエラー時の状態リセットを通知
          audioManagerRef.current?.setIsSpeaking(false)
        }
        externalCallbacks.onError?.(errorMessage)
      },
      onBoundary: externalCallbacks.onBoundary,
      onWord: externalCallbacks.onWord
    }

    // コールバックは speak 関数内で設定されるため、ここでは保存のみ
  }, [externalCallbacks])

  // エンジン状態の更新
  const refreshEngines = useCallback(async () => {
    try {
      if (!synthesizerRef.current) return
      const status = await synthesizerRef.current.getEngineStatus()
      
      if (isMountedRef.current) {
        setEngineStatus(status)
        setVoicevoxSpeakers(status.voicevox.speakers)
        setWebSpeechVoices(status.webspeech.voices)
        
        // デフォルト音声の設定
        if (status.webspeech.voices.length > 0 && !selectedWebVoice) {
          const japaneseVoice = status.webspeech.voices.find(v => 
            v.lang.includes('ja') || v.lang.includes('JP')
          )
          setSelectedWebVoice(japaneseVoice || status.webspeech.voices[0])
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to refresh voice engines:', error)
      }
      if (isMountedRef.current) {
        setError('Failed to refresh voice engines')
      }
    }
  }, [selectedWebVoice])

  // 音声合成実行
  const speak = useCallback(async (
    text: string, 
    overrideOptions: Partial<UnifiedVoiceOptions> = {}
  ): Promise<boolean> => {
    if (!text.trim()) {
      setError('Text cannot be empty')
      return false
    }

    setError(null)

    const options: UnifiedVoiceOptions = {
      text,
      emotion,
      mode,
      engine: currentEngine,
      speaker: selectedSpeaker,
      voice: selectedWebVoice,
      lang: 'ja-JP',
      volume,
      callbacks: {
        onStart: () => {
          performanceMonitor.startMeasure('voice-synthesis-processing')
          if (isMountedRef.current) {
            setIsSpeaking(true)
            setError(null)
            // AudioContextManagerに音声合成開始を通知
            audioManagerRef.current?.setIsSpeaking(true)
          }
          externalCallbacks.onStart?.()
        },
        onEnd: () => {
          performanceMonitor.endMeasure('voice-synthesis-processing')
          if (isMountedRef.current) {
            setIsSpeaking(false)
            // AudioContextManagerに音声合成終了を通知
            audioManagerRef.current?.setIsSpeaking(false)
          }
          externalCallbacks.onEnd?.()
        },
        onError: (errorMessage) => {
          if (isMountedRef.current) {
            setError(errorMessage)
            setIsSpeaking(false)
            // AudioContextManagerにエラー時の状態リセットを通知
            audioManagerRef.current?.setIsSpeaking(false)
          }
          externalCallbacks.onError?.(errorMessage)
        },
        onPause: externalCallbacks.onPause,
        onResume: externalCallbacks.onResume,
        onBoundary: externalCallbacks.onBoundary,
        onWord: externalCallbacks.onWord
      },
      // Phase 4: 音素データとオーディオ要素のコールバックを追加
      onLipSyncData,
      onAudioReady,
      // ✅ AudioLipSync対応のコールバックを追加
      onAudioBufferReady,
      ...overrideOptions
    }

    try {
      if (!synthesizerRef.current) {
        setError('Voice synthesis not available')
        // AudioContextManagerに状態リセットを通知
        audioManagerRef.current?.setIsSpeaking(false)
        return false
      }
      
      const result = await synthesizerRef.current.speak(options)
      
      // 成功・失敗に関わらず、finally節で状態をリセット
      if (!result) {
        audioManagerRef.current?.setIsSpeaking(false)
      }
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Voice synthesis failed'
      setError(errorMessage)
      setIsSpeaking(false)
      // AudioContextManagerにエラー時の状態リセットを通知
      audioManagerRef.current?.setIsSpeaking(false)
      return false
    }
  }, [
    emotion, 
    mode, 
    currentEngine, 
    selectedSpeaker, 
    selectedWebVoice, 
    volume, 
    externalCallbacks,
    onLipSyncData,
    onAudioReady,
    onAudioBufferReady
  ])

  // 停止
  const stop = useCallback(() => {
    synthesizerRef.current?.stop()
    setIsSpeaking(false)
    // AudioContextManagerに状態リセットを通知
    audioManagerRef.current?.setIsSpeaking(false)
    // Emergency stop for downstream consumers
    audioManagerRef.current?.emergencyStop()
  }, [])

  // 一時停止
  const pause = useCallback(() => {
    synthesizerRef.current?.pause()
  }, [])

  // 再開
  const resume = useCallback(() => {
    synthesizerRef.current?.resume()
  }, [])

  // 優先エンジンの設定
  const setPreferredEngine = useCallback((engine: VoiceEngine) => {
    setCurrentEngine(engine)
    synthesizerRef.current?.setPreferredEngine(engine)
  }, [])

  // 音声テスト
  const testVoice = useCallback(async (text: string = 'こんにちは。音声テストです。') => {
    return await speak(text)
  }, [speak])

  return {
    // 音声合成制御
    speak,
    stop,
    pause,
    resume,
    
    // 状態
    isSpeaking,
    isLoading,
    error,
    
    // エンジン設定
    currentEngine,
    setPreferredEngine,
    engineStatus,
    
    // VOICEVOX設定
    voicevoxSpeakers,
    selectedSpeaker,
    setSelectedSpeaker,
    
    // Web Speech API設定
    webSpeechVoices,
    selectedWebVoice,
    setSelectedWebVoice,
    
    // 共通設定
    volume,
    setVolume,
    emotion,
    setEmotion,
    mode,
    setMode,
    
    // ユーティリティ
    refreshEngines,
    testVoice
  }
}

/**
 * 簡易統合音声合成フック
 */
export function useSimpleUnifiedVoice(defaultOptions?: UseUnifiedVoiceSynthesisOptions) {
  const { speak, stop, isSpeaking, error, currentEngine } = useUnifiedVoiceSynthesis({
    preferredEngine: 'auto',
    ...defaultOptions
  })

  return { speak, stop, isSpeaking, error, currentEngine }
}