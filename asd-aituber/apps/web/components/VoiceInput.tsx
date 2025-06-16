'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { diagnoseNetworkEnvironment } from '@/lib/speech-recognition'
import { debugSpeechAPI, explainWebSpeechAPIAuth } from '@/lib/speech-debug'
import { AudioContextManager } from '@/libs/audio-context-manager'
import { 
  MicrophonePermissionManager,
  type MicrophonePermissionStatus,
  type BrowserInfo 
} from '@/lib/microphone-permission-manager'

interface VoiceInputProps {
  onTranscript: (transcript: string) => void
  isDisabled?: boolean
  disabled?: boolean  // ✅ Task 1.1.2: disabled prop追加
  audioPlaybackState?: { isPlaying: boolean }  // ✅ Task 2.1.2: 音声発話状態監視
  onStateChange?: (isListening: boolean) => void  // ✅ Task 1.1.4: 状態変化通知
  placeholder?: string
  className?: string
}

export default function VoiceInput({ 
  onTranscript, 
  isDisabled = false,
  disabled = false,  // ✅ Task 1.1.2: disabled prop受け取り
  audioPlaybackState,  // ✅ Task 2.1.2: 音声発話状態受け取り
  onStateChange,  // ✅ Task 1.1.4: 状態変化通知受け取り
  placeholder = "マイクボタンを押して話してください...",
  className = ""
}: VoiceInputProps) {
  const [isActive, setIsActive] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [showPermissionRequest, setShowPermissionRequest] = useState(false)
  const [networkStatus, setNetworkStatus] = useState(typeof navigator !== 'undefined' ? navigator.onLine : false)
  const [showDiagnostic, setShowDiagnostic] = useState(false)
  // ✅ エコーループ修正: 音声認識の前回状態を記憶
  const [wasListeningBeforeDisabled, setWasListeningBeforeDisabled] = useState(false)
  // ✅ Task 2.1.2: 音声発話状態の前回値を記憶
  const prevIsPlayingRef = useRef(false)
  // ✅ Task 2.1.2: タイマーのrefを追加
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // AudioContextManager統合用の状態
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioManagerRef = useRef<AudioContextManager | null>(null)
  
  // フォールバック機能用の状態
  const [showTextFallback, setShowTextFallback] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [networkErrorCount, setNetworkErrorCount] = useState(0)
  
  // MicrophonePermissionManager統合用の状態
  const [permissionStatus, setPermissionStatus] = useState<MicrophonePermissionStatus | null>(null)
  const [permissionBrowserInfo, setPermissionBrowserInfo] = useState<BrowserInfo | null>(null)

  const {
    isSupported,
    isListening,
    isInitializing,
    hasPermission,
    transcript,
    interimTranscript,
    confidence,
    error,
    startListening,
    stopListening,
    requestPermission,
    clearError,
    clearTranscript,
    retryStatus,
    browserInfo
  } = useSpeechRecognition({
    language: 'ja-JP',
    continuous: true,
    interimResults: true,
    onFinalResult: (finalTranscript, conf) => {
      if (finalTranscript.trim()) {
        onTranscript(finalTranscript.trim())
        clearTranscript()
        setCurrentTranscript('')
      }
    },
    onInterimResult: (interimText) => {
      setCurrentTranscript(interimText)
    },
    onError: (errorMessage, errorType) => {
      console.error('Voice input error:', errorMessage, 'Type:', errorType)
      setIsActive(false)
      
      // ネットワークエラーの場合、カウントを更新してフォールバック表示を検討
      if (errorType === 'network' || errorMessage.includes('Google音声認識サービスへの接続に失敗')) {
        setNetworkErrorCount(prev => {
          const newCount = prev + 1
          // 3回連続でネットワークエラーが発生したらフォールバック機能を表示
          if (newCount >= 3) {
            setShowTextFallback(true)
          }
          return newCount
        })
      }
      
      // MicrophonePermissionManagerのエラーハンドリングを活用
      MicrophonePermissionManager.showErrorToast(errorMessage)
    }
  })

  // ネットワーク状態の監視
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleOnline = () => setNetworkStatus(true)
    const handleOffline = () => setNetworkStatus(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // MicrophonePermissionManager統合
  useEffect(() => {
    const initializePermissionManager = async () => {
      try {
        // ブラウザ情報を取得
        const browser = MicrophonePermissionManager.getBrowserInfo()
        setPermissionBrowserInfo(browser)
        
        // 権限状態をチェック
        const status = await MicrophonePermissionManager.checkAndAssist()
        setPermissionStatus(status)
        
      } catch (error) {
        console.error('[VoiceInput] Permission manager initialization failed:', error)
        MicrophonePermissionManager.showErrorToast(
          error instanceof Error ? error.message : 'Unknown permission error'
        )
      }
    }
    
    initializePermissionManager()
  }, [])

  // AudioContextManager統合 - 最適化されたエラーハンドリング付き
  useEffect(() => {
    try {
      // AudioContextManagerのインスタンスを取得
      audioManagerRef.current = AudioContextManager.getInstance()
      
      // VoiceInputControllerを登録（エラーハンドリング付き）
      const controller = {
        forceStop: () => {
          try {
            console.log('[VoiceInput] Force stop called by AudioContextManager')
            setWasListeningBeforeDisabled(isListening)
            stopListening()
            setIsActive(false)
          } catch (error) {
            console.error('[VoiceInput] Error in forceStop:', error)
          }
        },
        autoRestart: () => {
          try {
            console.log('[VoiceInput] Auto restart called by AudioContextManager')
            if (wasListeningBeforeDisabled && hasPermission && !disabled && !isDisabled) {
              const restartAsync = async () => {
                try {
                  const success = await startListening()
                  if (success) {
                    setIsActive(true)
                    setWasListeningBeforeDisabled(false)
                    console.log('[VoiceInput] Auto restart successful')
                  } else {
                    console.warn('[VoiceInput] Auto restart failed')
                  }
                } catch (error) {
                  console.error('[VoiceInput] Error during auto restart:', error)
                }
              }
              restartAsync()
            }
          } catch (error) {
            console.error('[VoiceInput] Error in autoRestart:', error)
          }
        }
      }
      
      audioManagerRef.current.registerVoiceInput(controller)
      console.log('[VoiceInput] Registered with AudioContextManager')
    } catch (error) {
      console.error('[VoiceInput] Failed to initialize AudioContextManager integration:', error)
    }
    
    return () => {
      try {
        console.log('[VoiceInput] Cleanup AudioContextManager integration')
        // 将来的にunregisterメソッドが追加される場合のプレースホルダー
      } catch (error) {
        console.error('[VoiceInput] Error during cleanup:', error)
      }
    }
  }, [isListening, hasPermission, disabled, isDisabled, startListening, stopListening, wasListeningBeforeDisabled])

  // 音声合成状態の監視 - 最適化されたエラーハンドリング付き
  useEffect(() => {
    const checkSpeakingState = () => {
      try {
        if (audioManagerRef.current) {
          const currentIsSpeaking = audioManagerRef.current.getIsSpeaking()
          setIsSpeaking(currentIsSpeaking)
        }
      } catch (error) {
        console.error('[VoiceInput] Error checking speaking state:', error)
        // エラー時は安全側に倒して音声合成中ではないと判断
        setIsSpeaking(false)
      }
    }
    
    // 初回実行（即座に状態を反映）
    checkSpeakingState()
    
    // 100msごとに音声合成状態をチェック
    const interval = setInterval(checkSpeakingState, 100)
    
    return () => {
      try {
        clearInterval(interval)
      } catch (error) {
        console.error('[VoiceInput] Error clearing speaking state interval:', error)
      }
    }
  }, [])

  // 権限チェック
  useEffect(() => {
    if (hasPermission === false) {
      setShowPermissionRequest(true)
    } else {
      setShowPermissionRequest(false)
    }
  }, [hasPermission])

  // ✅ エコーループ修正: disabled状態変化の監視
  useEffect(() => {
    const isCurrentlyDisabled = isDisabled || disabled
    
    if (isCurrentlyDisabled && isListening) {
      // disabled=trueになったとき、進行中の音声認識を自動停止
      console.log('[VoiceInput] 🔇 音声合成開始検出: 音声認識を自動停止します')
      setWasListeningBeforeDisabled(true)  // 前回の状態を記憶
      stopListening()
      setIsActive(false)
      onStateChange?.(false)  // 状態変化を通知
    } else if (!isCurrentlyDisabled && !isListening && wasListeningBeforeDisabled && !audioPlaybackState?.isPlaying) {
      // ✅ Task 2.1.2: 音声発話中でない場合のみ自動再開
      // disabled=falseになったとき、前回聞いていた場合は自動再開（ただし音声発話中は除く）
      console.log('[VoiceInput] 🎤 音声合成終了検出: 音声認識を自動再開します')
      setWasListeningBeforeDisabled(false)  // 状態をリセット
      const autoRestart = async () => {
        const success = await startListening()
        setIsActive(success)
        if (success) {
          onStateChange?.(true)
        }
      }
      autoRestart()
    }
  }, [isDisabled, disabled, isListening, stopListening, startListening, onStateChange, wasListeningBeforeDisabled, audioPlaybackState?.isPlaying])

  // ✅ Task 2.1.2: 音声発話終了1秒後にマイク自動ON
  useEffect(() => {
    if (!audioPlaybackState) {
      return // audioPlaybackStateが未定義の場合は何もしない
    }
    
    const currentIsPlaying = audioPlaybackState.isPlaying
    const prevIsPlaying = prevIsPlayingRef.current
    
    // 既存タイマーをクリア
    if (audioTimerRef.current) {
      clearTimeout(audioTimerRef.current)
      audioTimerRef.current = null
    }
    
    // 音声発話が終了した場合（playing → not playing）
    if (prevIsPlaying && !currentIsPlaying && wasListeningBeforeDisabled) {
      console.log('[VoiceInput] 🔇 音声発話終了検出: 1秒後にマイク自動再開を設定')
      
      audioTimerRef.current = setTimeout(() => {
        console.log('[VoiceInput] 🎤 音声発話終了1秒後: マイク自動再開')
        const autoRestart = async () => {
          const success = await startListening()
          setIsActive(success)
          if (success) {
            onStateChange?.(true)
          }
        }
        autoRestart()
        setWasListeningBeforeDisabled(false) // 状態をリセット
        audioTimerRef.current = null // タイマーをクリア
      }, 1000)
    }
    
    // 現在の状態を保存
    prevIsPlayingRef.current = currentIsPlaying
  }, [audioPlaybackState?.isPlaying, wasListeningBeforeDisabled, startListening, onStateChange])

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (audioTimerRef.current) {
        clearTimeout(audioTimerRef.current)
      }
    }
  }, [])

  // 音声認識の切り替え - 最適化されたエラーハンドリング付き
  const handleToggleListening = async () => {
    try {
      clearError()
      
      // ボタンのdisabled状態で音声合成中はブロックされるため、ここでの追加チェックは不要
      if (isListening) {
        stopListening()
        setIsActive(false)
        onStateChange?.(false)  // ✅ Task 1.1.4: 停止時の状態変化通知
      } else {
        const success = await startListening()
        setIsActive(success)
        if (success) {
          onStateChange?.(true)  // ✅ Task 1.1.4: 開始時の状態変化通知
        }
      }
    } catch (error) {
      console.error('[VoiceInput] Error in handleToggleListening:', error)
      setIsActive(false)
      onStateChange?.(false)
    }
  }

  // マイクボタンの無効状態を最適化されたメモ化で計算
  const isButtonDisabled = useMemo(() => {
    return isDisabled || disabled || isSpeaking
  }, [isDisabled, disabled, isSpeaking])

  // 権限要求
  const handleRequestPermission = async () => {
    try {
      // 既存のhookの権限要求を使用
      const granted = await requestPermission()
      
      if (granted) {
        setShowPermissionRequest(false)
        // 権限取得後、権限状態を更新
        const status = await MicrophonePermissionManager.checkPermissionStatus()
        setPermissionStatus(status)
      } else {
        // 権限拒否時の詳細なエラーハンドリング
        if (permissionBrowserInfo) {
          const recovery = MicrophonePermissionManager.getRecoveryInstructions('Permission denied')
          MicrophonePermissionManager.showErrorToast('NotAllowedError: Permission denied')
        }
      }
    } catch (error) {
      console.error('Permission request failed:', error)
      MicrophonePermissionManager.showErrorToast(
        error instanceof Error ? error.message : 'Permission request failed'
      )
    }
  }

  // ネットワーク診断実行
  const handleRunDiagnostic = async () => {
    console.log('🔍 Starting comprehensive speech API diagnosis...')
    
    try {
      const [diagnostic, debugInfo, authInfo] = await Promise.all([
        Promise.resolve(diagnoseNetworkEnvironment()),
        debugSpeechAPI(),
        Promise.resolve(explainWebSpeechAPIAuth())
      ])
      
      console.log('📊 Diagnostic Results:', { diagnostic, debugInfo, authInfo })
      setShowDiagnostic(true)
      
      // 詳細な診断結果を表示
      const failedTests = debugInfo.networkTests.filter(test => test.status === 'fail')
      const highPriorityIssues = debugInfo.possibleIssues.filter(issue => issue.priority === 'high')
      
      alert(`🔍 音声認識API詳細診断

🔐 認証について:
• APIキー: ${debugInfo.apiKeyRequired ? '必要' : '不要（ブラウザ自動管理）'}
• 認証方式: ${debugInfo.authMethod}

📊 接続テスト結果:
${debugInfo.networkTests.map(test => 
  `• ${test.test}: ${test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⚠️'} ${test.details}`
).join('\n')}

🚨 高優先度の問題:
${highPriorityIssues.length > 0 ? 
  highPriorityIssues.map(issue => `• ${issue.issue}: ${issue.solution}`).join('\n') :
  '問題は検出されませんでした'
}

💡 重要: Chrome Web Speech API は Google のサーバーを使用しますが、APIキーは不要です。
ブラウザが自動で認証を処理します。`)
      
    } catch (error) {
      console.error('Diagnostic failed:', error)
      alert('診断実行中にエラーが発生しました。コンソールを確認してください。')
    }
  }

  // サポートされていない場合の表示
  if (!isSupported) {
    return (
      <div className={`p-4 border rounded-lg bg-yellow-50 border-yellow-200 ${className}`}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            <div>
              <p className="text-sm font-medium text-yellow-800">音声入力が利用できません</p>
              <p className="text-xs text-yellow-600 mt-1">
                {browserInfo.recommendedMessage || 'ブラウザが音声認識をサポートしていません'}
              </p>
              {browserInfo.securityWarning && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  🔒 {browserInfo.securityWarning}
                </p>
              )}
            </div>
          </div>
          
          {browserInfo.troubleshooting && browserInfo.troubleshooting.length > 0 && (
            <div className="bg-yellow-100 p-3 rounded-lg">
              <p className="text-xs font-medium text-yellow-800 mb-2">💡 解決方法:</p>
              <ul className="text-xs text-yellow-700 space-y-1">
                {browserInfo.troubleshooting.map((tip, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span>•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 初期化中
  if (isInitializing) {
    return (
      <div className={`p-4 border rounded-lg bg-gray-50 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-sm text-gray-600">音声認識を初期化中...</span>
        </div>
      </div>
    )
  }

  // 権限要求
  if (showPermissionRequest) {
    const browserSpecificMessage = permissionBrowserInfo ? permissionStatus?.recommendedAction || 
      `${permissionBrowserInfo.name}でのマイク権限を許可してください` : 
      '音声入力を使用するには、マイクロフォンへのアクセスを許可してください。'
    
    return (
      <div className={`p-4 border rounded-lg bg-blue-50 border-blue-200 ${className}`}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">🎤</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">マイクロフォンの権限が必要です</p>
              {permissionBrowserInfo && (
                <p className="text-xs text-blue-500 mt-1">
                  検出されたブラウザ: {permissionBrowserInfo.name} {permissionBrowserInfo.version}
                </p>
              )}
            </div>
          </div>
          
          <p className="text-xs text-blue-600">
            {browserSpecificMessage}
          </p>
          
          {permissionBrowserInfo && !permissionBrowserInfo.microphoneQuerySupported && (
            <div className="p-2 bg-yellow-100 rounded text-xs text-yellow-800">
              <p className="font-medium">🔔 {permissionBrowserInfo.name}での注意事項:</p>
              <p>このブラウザでは、マイクボタンをクリック時に権限ダイアログが表示されます。</p>
            </div>
          )}
          
          {permissionBrowserInfo && permissionBrowserInfo.requiresHTTPS && location.protocol !== 'https:' && (
            <div className="p-2 bg-red-100 rounded text-xs text-red-800">
              <p className="font-medium">🔒 セキュリティ要件:</p>
              <p>HTTPS接続が必要です。https://localhost:3002 でアクセスしてください。</p>
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={handleRequestPermission}
              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              権限を許可
            </button>
            
            {permissionBrowserInfo && (
              <button
                onClick={() => {
                  const recovery = MicrophonePermissionManager.getRecoveryInstructions('権限設定')
                  alert(`
【${recovery.browserName}での詳細手順】

🔧 権限許可の手順:
${recovery.instructions.map(step => `• ${step}`).join('\n')}

💡 トラブルシューティング:
${recovery.troubleshooting?.map(step => `• ${step}`).join('\n') || 'なし'}
                  `.trim())
                }}
                className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
              >
                詳細手順
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ネットワーク状態警告 */}
      {!networkStatus && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-orange-500">📶</span>
            <div className="flex-1">
              <p className="text-sm text-orange-800">
                オフライン状態です。音声認識にはインターネット接続が必要な場合があります。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-red-500">❌</span>
            <div className="flex-1">
              <div className="text-sm text-red-800 whitespace-pre-line">{error}</div>
              {error.includes('HTTPS接続') && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                  <p className="font-medium">🔧 解決方法:</p>
                  <p>• ブラウザのアドレスバーで「https://」でアクセス</p>
                  <p>• または「localhost」でアクセス</p>
                  <button
                    onClick={handleRunDiagnostic}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    🔍 詳細診断を実行
                  </button>
                </div>
              )}
              {(error.includes('ネットワークエラー') || error.includes('Google音声認識サービスへの接続に失敗')) && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                  <p className="font-medium">🔧 トラブルシューティング:</p>
                  <p>• インターネット接続を確認してください</p>
                  <p>• VPNを使用している場合は一時的に無効にしてください</p>
                  <p>• ブラウザを再起動してページを再読み込みしてください</p>
                  <p>• 別のネットワーク（モバイルホットスポット等）で試してください</p>
                  <button
                    onClick={handleRunDiagnostic}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    🔍 詳細診断を実行
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 音声入力コントロール */}
      <div className="flex items-center gap-3 p-4 border rounded-lg bg-white">
        {/* マイクボタン */}
        <button
          onClick={handleToggleListening}
          disabled={isButtonDisabled}  // ✅ Task 3.1.3: 最適化されたメモ化による無効状態管理
          aria-label="microphone"  // ✅ マイクボタンのアクセシビリティ向上
          className={`
            relative w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            ${isListening 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'
            }
          `}
        >
          {isListening ? (
            <span className="text-lg">⏹️</span>
          ) : (
            <span className="text-lg">🎤</span>
          )}
          
          {/* 音声レベルインジケーター */}
          {isListening && (
            <div className="absolute -inset-1 rounded-full border-2 border-red-300 animate-ping"></div>
          )}
        </button>

        {/* テキスト表示エリア */}
        <div className="flex-1">
          <div className="min-h-[24px]">
            {isListening ? (
              <div className="space-y-1">
                {/* 中間結果 */}
                {(currentTranscript || interimTranscript) ? (
                  <p className="text-sm text-gray-600 italic">
                    "{currentTranscript || interimTranscript}"
                  </p>
                ) : (
                  <p className="text-sm text-blue-600 animate-pulse">
                    🎵 聞いています...
                  </p>
                )}
                
                {/* 信頼度表示 */}
                {confidence > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">信頼度:</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-green-500 h-1 rounded-full transition-all"
                        style={{ width: `${confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{Math.round(confidence * 100)}%</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{placeholder}</p>
            )}
          </div>
        </div>

        {/* 状態インジケーター */}
        <div className="flex flex-col items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${
            isListening ? 'bg-red-500 animate-pulse' : 
            hasPermission ? 'bg-green-500' : 'bg-gray-300'
          }`}></div>
          <span className="text-xs text-gray-500">
            {isListening ? '録音中' : hasPermission ? '準備完了' : '権限なし'}
          </span>
        </div>
      </div>

      {/* Auto-retry 状態表示（ネットワークエラー以外） */}
      {retryStatus.hasActiveTimer && retryStatus.lastRetryReason !== 'network' && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-yellow-500">🔄</span>
            <div className="flex-1">
              <p className="text-sm text-yellow-800">
                接続を再試行中... ({Math.max(retryStatus.retryCount, 1)}/{retryStatus.maxRetries})
              </p>
              <p className="text-xs text-yellow-600">
                {retryStatus.lastRetryReason === 'network' 
                  ? 'Google音声認識サービスへの接続エラー' 
                  : retryStatus.lastRetryReason} | 残り: {retryStatus.remainingRetries}回
              </p>
            </div>
          </div>
        </div>
      )}

      {/* テキスト入力フォールバック（ネットワークエラー時） */}
      {showTextFallback && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-blue-600">⌨️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">音声認識の代替入力</p>
                <p className="text-xs text-blue-600 mt-1">
                  ネットワークエラーが継続しています。テキストで入力してください。
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTextFallback(false)
                  setNetworkErrorCount(0)
                }}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && textInput.trim()) {
                    onTranscript(textInput.trim())
                    setTextInput('')
                  }
                }}
                placeholder="メッセージを入力してください..."
                className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => {
                  if (textInput.trim()) {
                    onTranscript(textInput.trim())
                    setTextInput('')
                  }
                }}
                disabled={!textInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                送信
              </button>
            </div>
            
            <div className="text-xs text-blue-600">
              💡 音声認識を再試行するには、上記の✕ボタンで閉じてからマイクボタンをお試しください。
            </div>
          </div>
        </div>
      )}

      {/* 使用方法のヒント */}
      {!isListening && hasPermission && !error && !retryStatus.hasActiveTimer && !showTextFallback && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          💡 マイクボタンを押して話すと、音声が文字に変換されます。話し終わったら再度ボタンを押してください。
        </div>
      )}
      
      {/* リトライ情報（デバッグ用） */}
      {retryStatus.retryCount > 0 && !retryStatus.hasActiveTimer && (
        <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
          🔄 自動リトライ履歴: {retryStatus.retryCount}回実行済み (最終理由: {retryStatus.lastRetryReason})
        </div>
      )}
    </div>
  )
}