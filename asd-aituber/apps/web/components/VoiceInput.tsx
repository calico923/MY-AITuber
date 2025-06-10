'use client'

import { useState, useEffect } from 'react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { diagnoseNetworkEnvironment } from '@/lib/speech-recognition'
import { debugSpeechAPI, explainWebSpeechAPIAuth } from '@/lib/speech-debug'

interface VoiceInputProps {
  onTranscript: (transcript: string) => void
  isDisabled?: boolean
  disabled?: boolean  // ✅ Task 1.1.2: disabled prop追加
  onStateChange?: (isListening: boolean) => void  // ✅ Task 1.1.4: 状態変化通知
  placeholder?: string
  className?: string
}

export default function VoiceInput({ 
  onTranscript, 
  isDisabled = false,
  disabled = false,  // ✅ Task 1.1.2: disabled prop受け取り
  onStateChange,  // ✅ Task 1.1.4: 状態変化通知受け取り
  placeholder = "マイクボタンを押して話してください...",
  className = ""
}: VoiceInputProps) {
  const [isActive, setIsActive] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [showPermissionRequest, setShowPermissionRequest] = useState(false)
  const [networkStatus, setNetworkStatus] = useState(typeof navigator !== 'undefined' ? navigator.onLine : false)
  const [showDiagnostic, setShowDiagnostic] = useState(false)

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
    onError: (errorMessage) => {
      console.error('Voice input error:', errorMessage)
      setIsActive(false)
      // ネットワークエラーが続く場合は音声認識を完全に停止
      if (errorMessage.includes('ネットワークエラーが続いています')) {
        stopListening()
      }
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

  // 権限チェック
  useEffect(() => {
    if (hasPermission === false) {
      setShowPermissionRequest(true)
    } else {
      setShowPermissionRequest(false)
    }
  }, [hasPermission])

  // 音声認識の切り替え
  const handleToggleListening = async () => {
    clearError()
    
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
  }

  // 権限要求
  const handleRequestPermission = async () => {
    const granted = await requestPermission()
    if (granted) {
      setShowPermissionRequest(false)
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
    return (
      <div className={`p-4 border rounded-lg bg-blue-50 border-blue-200 ${className}`}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">🎤</span>
            <p className="text-sm font-medium text-blue-800">マイクロフォンの権限が必要です</p>
          </div>
          <p className="text-xs text-blue-600">
            音声入力を使用するには、マイクロフォンへのアクセスを許可してください。
          </p>
          <button
            onClick={handleRequestPermission}
            className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            権限を許可
          </button>
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
              {error.includes('ネットワークエラー') && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                  <p className="font-medium">🔧 トラブルシューティング:</p>
                  <p>• Wi-Fi/インターネット接続を確認</p>
                  <p>• VPNを一時的に無効化</p>
                  <p>• ブラウザの再起動</p>
                  <p>• 別のブラウザで試す（Chrome推奨）</p>
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
          disabled={isDisabled || disabled}  // ✅ Task 1.1.2: disabledの適用
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

      {/* 使用方法のヒント */}
      {!isListening && hasPermission && !error && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          💡 マイクボタンを押して話すと、音声が文字に変換されます。話し終わったら再度ボタンを押してください。
        </div>
      )}
    </div>
  )
}