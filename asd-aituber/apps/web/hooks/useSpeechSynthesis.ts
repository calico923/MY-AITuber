/**
 * Speech Synthesis React Hook
 * 音声合成機能のためのReact Hook
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  SpeechSynthesisManager, 
  SpeechSynthesisOptions,
  SpeechSynthesisCallbacks,
  VoiceInfo 
} from '@/lib/speech-synthesis'

export interface UseSpeechSynthesisOptions extends SpeechSynthesisOptions {
  autoSelectJapanese?: boolean
  callbacks?: SpeechSynthesisCallbacks
}

export interface UseSpeechSynthesisReturn {
  speak: (text: string, options?: SpeechSynthesisOptions) => void
  stop: () => void
  pause: () => void
  resume: () => void
  isSpeaking: boolean
  isPaused: boolean
  isSupported: boolean
  voices: VoiceInfo[]
  selectedVoice: SpeechSynthesisVoice | null
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void
  error: string | null
  volume: number
  setVolume: (volume: number) => void
  rate: number
  setRate: (rate: number) => void
  pitch: number
  setPitch: (pitch: number) => void
}

export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisReturn {
  const {
    autoSelectJapanese = true,
    callbacks: externalCallbacks = {},
    ...synthesisOptions
  } = options

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(synthesisOptions.volume || 1.0)
  const [rate, setRate] = useState(synthesisOptions.rate || 1.0)
  const [pitch, setPitch] = useState(synthesisOptions.pitch || 1.0)

  const managerRef = useRef<SpeechSynthesisManager | null>(null)
  const isMountedRef = useRef(true)

  // マネージャーの初期化
  useEffect(() => {
    const manager = new SpeechSynthesisManager({
      ...synthesisOptions,
      volume,
      rate,
      pitch
    })

    managerRef.current = manager
    setIsSupported(manager.getIsSupported())

    // コールバックの設定
    const callbacks: SpeechSynthesisCallbacks = {
      onStart: () => {
        if (isMountedRef.current) {
          setIsSpeaking(true)
          setIsPaused(false)
          setError(null)
        }
        externalCallbacks.onStart?.()
      },
      onEnd: () => {
        if (isMountedRef.current) {
          setIsSpeaking(false)
          setIsPaused(false)
        }
        externalCallbacks.onEnd?.()
      },
      onPause: () => {
        if (isMountedRef.current) {
          setIsPaused(true)
        }
        externalCallbacks.onPause?.()
      },
      onResume: () => {
        if (isMountedRef.current) {
          setIsPaused(false)
        }
        externalCallbacks.onResume?.()
      },
      onError: (errorMessage) => {
        if (isMountedRef.current) {
          setError(errorMessage)
          setIsSpeaking(false)
          setIsPaused(false)
        }
        externalCallbacks.onError?.(errorMessage)
      },
      onBoundary: externalCallbacks.onBoundary,
      onWord: externalCallbacks.onWord
    }

    manager.setCallbacks(callbacks)

    // 音声リストの更新
    const updateVoices = () => {
      const japaneseVoices = manager.getJapaneseVoices()
      if (isMountedRef.current) {
        setVoices(japaneseVoices)
        
        // 自動選択が有効で、まだ選択されていない場合
        if (autoSelectJapanese && !selectedVoice && japaneseVoices.length > 0) {
          const bestVoice = manager.selectBestJapaneseVoice()
          if (bestVoice) {
            setSelectedVoice(bestVoice)
          }
        }
      }
    }

    // 初回と音声リスト更新時に実行
    const timeoutId = setTimeout(updateVoices, 500)
    const intervalId = setInterval(updateVoices, 1000)
    
    // 5秒後にインターバルをクリア（音声リストは通常すぐに読み込まれる）
    setTimeout(() => clearInterval(intervalId), 5000)

    return () => {
      isMountedRef.current = false
      clearTimeout(timeoutId)
      clearInterval(intervalId)
      manager.destroy()
    }
  }, [])

  // オプションの更新
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateOptions({
        voice: selectedVoice,
        volume,
        rate,
        pitch
      })
    }
  }, [selectedVoice, volume, rate, pitch])

  // 音声再生
  const speak = useCallback((text: string, overrideOptions?: SpeechSynthesisOptions) => {
    if (!managerRef.current) {
      setError('Speech synthesis manager not initialized')
      return
    }

    const options: SpeechSynthesisOptions = {
      voice: selectedVoice,
      volume,
      rate,
      pitch,
      ...overrideOptions
    }

    const success = managerRef.current.speak(text, options)
    if (!success && isMountedRef.current) {
      setError('Failed to start speech synthesis')
    }
  }, [selectedVoice, volume, rate, pitch])

  // 停止
  const stop = useCallback(() => {
    managerRef.current?.stop()
    if (isMountedRef.current) {
      setIsSpeaking(false)
      setIsPaused(false)
    }
  }, [])

  // 一時停止
  const pause = useCallback(() => {
    managerRef.current?.pause()
  }, [])

  // 再開
  const resume = useCallback(() => {
    managerRef.current?.resume()
  }, [])

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
    error,
    volume,
    setVolume,
    rate,
    setRate,
    pitch,
    setPitch
  }
}

/**
 * 簡易音声合成フック
 * テキストを即座に音声で再生するためのシンプルなフック
 */
export function useSimpleSpeech(defaultOptions?: SpeechSynthesisOptions) {
  const { speak, stop, isSpeaking, isSupported, error } = useSpeechSynthesis({
    autoSelectJapanese: true,
    ...defaultOptions
  })

  return { speak, stop, isSpeaking, isSupported, error }
}