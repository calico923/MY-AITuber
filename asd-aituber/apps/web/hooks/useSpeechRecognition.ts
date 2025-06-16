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
  // Auto-retry configuration
  enableAutoRetry?: boolean
  maxRetries?: number
  retryDelay?: number
  retryBackoffMultiplier?: number
  maxRetryDelay?: number
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
  
  // Auto-retry status
  retryStatus: {
    retryCount: number
    maxRetries: number
    remainingRetries: number
    currentDelay: number
    hasActiveTimer: boolean
    lastRetryReason: string | null
  }
  
  // ブラウザ情報
  browserInfo: {
    isSupported: boolean
    browserName: string
    recommendedMessage?: string
    securityWarning?: string
    troubleshooting?: string[]
  }
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  // Auto-retry configuration with defaults
  const {
    enableAutoRetry = true,
    maxRetries = 3,
    retryDelay = 1000,
    retryBackoffMultiplier = 1.5,
    maxRetryDelay = 5000,
    ...speechOptions
  } = options
  
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
  
  // Auto-retry state
  const [retryStatus, setRetryStatus] = useState({
    retryCount: 0,
    maxRetries,
    remainingRetries: maxRetries,
    currentDelay: retryDelay,
    hasActiveTimer: false,
    lastRetryReason: null as string | null
  })
  
  // ブラウザ情報
  const [browserInfo] = useState(() => checkSpeechRecognitionSupport())
  
  // マネージャーのref
  const managerRef = useRef<SpeechRecognitionManager | null>(null)
  
  // Auto-retry timer ref
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // startListening function ref (循環依存回避用)
  const startListeningRef = useRef<(() => Promise<boolean>) | null>(null)
  
  /**
   * Auto-retry timer をクリア
   */
  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
      setRetryStatus(prev => ({ ...prev, hasActiveTimer: false }))
    }
  }, [])
  
  /**
   * リトライ状態をリセット
   */
  const resetRetryStatus = useCallback(() => {
    clearRetryTimer()
    setRetryStatus({
      retryCount: 0,
      maxRetries,
      remainingRetries: maxRetries,
      currentDelay: retryDelay,
      hasActiveTimer: false,
      lastRetryReason: null
    })
  }, [clearRetryTimer, maxRetries, retryDelay])
  
  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  /**
   * auto-retry を実行すべきかどうかを判定
   */
  const shouldRetryError = useCallback((errorType: string): boolean => {
    if (!enableAutoRetry) return false
    
    // 自動リトライすべきでないエラータイプ
    const noRetryErrors = ['not-allowed', 'service-not-allowed', 'network']
    if (noRetryErrors.includes(errorType)) return false
    
    // リトライ回数が上限に達している場合はリトライしない
    return retryStatus.retryCount < retryStatus.maxRetries
  }, [enableAutoRetry, retryStatus.retryCount, retryStatus.maxRetries])
  
  /**
   * auto-retry を実行
   */
  const executeRetryRef = useRef<(reason: string) => Promise<boolean>>()
  
  const executeRetry = useCallback(async (reason: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[useSpeechRecognition] Executing auto-retry for: ${reason}, attempt: ${retryStatus.retryCount + 1}`)
    }
    
    try {
      // リトライカウントを更新
      const newRetryCount = retryStatus.retryCount + 1
      const newDelay = Math.min(retryStatus.currentDelay * retryBackoffMultiplier, maxRetryDelay)
      
      setRetryStatus(prev => ({
        ...prev,
        retryCount: newRetryCount,
        remainingRetries: prev.maxRetries - newRetryCount,
        currentDelay: newDelay,
        hasActiveTimer: false,
        lastRetryReason: reason
      }))
      
      // 音声認識を再開始 - startListeningRefを使用して循環依存を回避
      if (!startListeningRef.current) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useSpeechRecognition] startListening not available for retry')
        }
        return false
      }
      
      const success = await startListeningRef.current()
      
      if (success) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[useSpeechRecognition] Auto-retry successful for: ${reason}`)
        }
        return true
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[useSpeechRecognition] Auto-retry failed for: ${reason}`)
        }
        return false
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[useSpeechRecognition] Auto-retry error:`, error)
      }
      return false
    }
  }, [retryStatus, retryBackoffMultiplier, maxRetryDelay])
  
  // RefでexecuteRetryを保存
  executeRetryRef.current = executeRetry
  
  /**
   * auto-retry をスケジュール
   */
  const scheduleRetry = useCallback((reason: string) => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
    }
    
    setRetryStatus(prev => ({ ...prev, hasActiveTimer: true }))
    
    const delay = retryStatus.currentDelay
    if (process.env.NODE_ENV === 'development') {
      console.log(`[useSpeechRecognition] Scheduling auto-retry for "${reason}" in ${delay}ms`)
    }
    
    retryTimerRef.current = setTimeout(() => {
      executeRetryRef.current?.(reason)
    }, delay)
  }, [retryStatus.currentDelay])
  
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
    } else {
      // 成功時はリトライ状態をリセット
      resetRetryStatus()
    }
    
    return success
  }, [isSupported, isListening, hasPermission, requestPermission, clearError, resetRetryStatus])
  
  // startListeningRefに代入 (循環依存回避用)
  startListeningRef.current = startListening
  
  /**
   * 音声認識を停止
   */
  const stopListening = useCallback(() => {
    // 自動リトライを停止
    clearRetryTimer()
    
    if (managerRef.current && isListening) {
      managerRef.current.stop()
    }
  }, [isListening, clearRetryTimer])
  
  /**
   * 音声認識のトグル
   */
  const toggleListening = useCallback(async (): Promise<boolean> => {
    if (isListening) {
      stopListening()
      return false
    } else {
      // startListeningRefを使用して循環依存を回避
      if (!startListeningRef.current) {
        return false
      }
      return await startListeningRef.current()
    }
  }, [isListening, stopListening])
  
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
    const manager = new SpeechRecognitionManager(speechOptions)
    
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
      
      onError: (errorMessage: string, rawErrorType?: string) => {
        setError(errorMessage)
        setIsListening(false)
        
        // Use raw error type from Web Speech API if available, otherwise extract from message
        let errorType = rawErrorType || 'unknown'
        
        // Fallback to message parsing if rawErrorType is not provided
        if (!rawErrorType) {
          if (errorMessage.includes('no-speech')) {
            errorType = 'no-speech'
          } else if (errorMessage.includes('not-allowed') || errorMessage.includes('Permission denied')) {
            errorType = 'not-allowed'
          } else if (errorMessage.includes('network') || errorMessage.includes('Google音声認識サービスへの接続に失敗')) {
            errorType = 'network'
          } else if (errorMessage.includes('service-not-allowed')) {
            errorType = 'service-not-allowed'
          }
        }
        
        // Auto-retry logic
        if (shouldRetryError(errorType)) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[useSpeechRecognition] Auto-retry will be attempted for error: ${errorType}`)
          }
          scheduleRetry(errorType)
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[useSpeechRecognition] No auto-retry for error: ${errorType} (disabled or max retries reached)`)
          }
          if (retryStatus.retryCount >= retryStatus.maxRetries) {
            setError(prevError => `${prevError}\n\n最大リトライ回数（${retryStatus.maxRetries}回）に達しました。手動でマイクボタンをクリックしてください。`)
          }
        }
        
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
    if (speechOptions.autoStart && manager.getIsSupported()) {
      // 少し遅延してから開始（権限取得のため）
      setTimeout(() => {
        startListeningRef.current?.()
      }, 1000)
    }
    
    // クリーンアップ
    return () => {
      clearRetryTimer()
      manager.destroy()
      managerRef.current = null
    }
  }, []) // 依存配列は空にしてマウント時のみ実行
  
  /**
   * オプション変更時の更新
   */
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateOptions(speechOptions)
    }
  }, [speechOptions.language, speechOptions.continuous, speechOptions.interimResults, speechOptions.maxAlternatives])
  
  /**
   * コンポーネントアンマウント時のクリーンアップ
   */
  useEffect(() => {
    return () => {
      clearRetryTimer()
    }
  }, [])
  
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
    
    // Auto-retry status
    retryStatus,
    
    // ブラウザ情報
    browserInfo
  }
}