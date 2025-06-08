import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  SpeechRecognitionManager, 
  SpeechRecognitionOptions, 
  SpeechRecognitionResult,
  requestMicrophonePermission,
  checkSpeechRecognitionSupport
} from '@/lib/speech-recognition'

export interface UseSpeechRecognitionOptions extends SpeechRecognitionOptions {
  autoStart?: boolean
  onFinalResult?: (transcript: string, confidence: number) => void
  onInterimResult?: (transcript: string) => void
  onError?: (error: string) => void
}

export interface UseSpeechRecognitionReturn {
  // 状態
  isSupported: boolean
  isListening: boolean
  isInitializing: boolean
  hasPermission: boolean | null
  
  // 現在の認識結果
  transcript: string
  interimTranscript: string
  confidence: number
  
  // エラー情報
  error: string | null
  
  // 制御関数
  startListening: () => Promise<boolean>
  stopListening: () => void
  toggleListening: () => Promise<boolean>
  requestPermission: () => Promise<boolean>
  clearError: () => void
  clearTranscript: () => void
  
  // ブラウザ情報
  browserInfo: {
    isSupported: boolean
    browserName: string
    recommendedMessage?: string
  }
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  // 状態管理
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  
  // 認識結果
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [confidence, setConfidence] = useState(0)
  
  // エラー状態
  const [error, setError] = useState<string | null>(null)
  
  // ブラウザ情報
  const [browserInfo] = useState(() => checkSpeechRecognitionSupport())
  
  // マネージャーのref
  const managerRef = useRef<SpeechRecognitionManager | null>(null)
  
  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  /**
   * 認識結果をクリア
   */
  const clearTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setConfidence(0)
  }, [])
  
  /**
   * マイクロフォン権限を要求
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await requestMicrophonePermission()
      setHasPermission(granted)
      if (!granted) {
        setError('マイクロフォンの権限が必要です。ブラウザの設定で許可してください。')
      }
      return granted
    } catch (err) {
      setError('マイクロフォンの権限取得に失敗しました。')
      setHasPermission(false)
      return false
    }
  }, [])
  
  /**
   * 音声認識を開始
   */
  const startListening = useCallback(async (): Promise<boolean> => {
    clearError()
    
    if (!managerRef.current || !isSupported) {
      setError('音声認識がサポートされていません。')
      return false
    }
    
    if (isListening) {
      return true
    }
    
    // 権限がない場合は要求
    if (hasPermission === null || hasPermission === false) {
      const granted = await requestPermission()
      if (!granted) {
        return false
      }
    }
    
    const success = managerRef.current.start()
    if (!success) {
      setError('音声認識の開始に失敗しました。')
    }
    
    return success
  }, [isSupported, isListening, hasPermission, requestPermission, clearError])
  
  /**
   * 音声認識を停止
   */
  const stopListening = useCallback(() => {
    if (managerRef.current && isListening) {
      managerRef.current.stop()
    }
  }, [isListening])
  
  /**
   * 音声認識のトグル
   */
  const toggleListening = useCallback(async (): Promise<boolean> => {
    if (isListening) {
      stopListening()
      return false
    } else {
      return await startListening()
    }
  }, [isListening, startListening, stopListening])
  
  /**
   * 初期化処理
   */
  useEffect(() => {
    setIsInitializing(true)
    
    // ブラウザ対応チェック
    if (!browserInfo.isSupported) {
      setIsSupported(false)
      setError(`音声認識がサポートされていません。${browserInfo.recommendedMessage || ''}`)
      setIsInitializing(false)
      return
    }
    
    // マネージャーを作成
    const manager = new SpeechRecognitionManager(options)
    
    // コールバック設定
    manager.setCallbacks({
      onStart: () => {
        setIsListening(true)
        clearError()
      },
      
      onEnd: () => {
        setIsListening(false)
      },
      
      onResult: (result: SpeechRecognitionResult) => {
        if (result.isFinal) {
          // 最終結果
          setTranscript(result.transcript)
          setConfidence(result.confidence)
          setInterimTranscript('')
          options.onFinalResult?.(result.transcript, result.confidence)
        } else {
          // 中間結果
          setInterimTranscript(result.transcript)
          options.onInterimResult?.(result.transcript)
        }
      },
      
      onError: (errorMessage: string) => {
        setError(errorMessage)
        setIsListening(false)
        options.onError?.(errorMessage)
      },
      
      onAudioStart: () => {
        // 音声入力開始時の処理
      },
      
      onAudioEnd: () => {
        // 音声入力終了時の処理
      }
    })
    
    managerRef.current = manager
    setIsSupported(manager.getIsSupported())
    setIsInitializing(false)
    
    // 自動開始
    if (options.autoStart && manager.getIsSupported()) {
      // 少し遅延してから開始（権限取得のため）
      setTimeout(() => {
        startListening()
      }, 1000)
    }
    
    // クリーンアップ
    return () => {
      manager.destroy()
      managerRef.current = null
    }
  }, []) // 依存配列は空にしてマウント時のみ実行
  
  /**
   * オプション変更時の更新
   */
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateOptions(options)
    }
  }, [options.language, options.continuous, options.interimResults, options.maxAlternatives])
  
  return {
    // 状態
    isSupported,
    isListening,
    isInitializing,
    hasPermission,
    
    // 現在の認識結果
    transcript,
    interimTranscript,
    confidence,
    
    // エラー情報
    error,
    
    // 制御関数
    startListening,
    stopListening,
    toggleListening,
    requestPermission,
    clearError,
    clearTranscript,
    
    // ブラウザ情報
    browserInfo
  }
}