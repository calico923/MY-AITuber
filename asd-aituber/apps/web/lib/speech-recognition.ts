/**
 * Web Speech API Wrapper for Japanese Voice Recognition
 * 日本語音声認識のためのWeb Speech APIラッパー
 */

// Web Speech API型定義
declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  serviceURI: string
  grammars: any
  start(): void
  stop(): void
  abort(): void
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
  onerror: ((this: SpeechRecognition, ev: any) => any) | null
  onnomatch: ((this: SpeechRecognition, ev: any) => any) | null
  onresult: ((this: SpeechRecognition, ev: any) => any) | null
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
}

interface SpeechRecognitionEvent extends Event {
  results: any
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

export interface SpeechRecognitionOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  maxAlternatives?: number
  serviceURI?: string
  grammars?: any
}

export interface SpeechRecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

export interface SpeechRecognitionCallbacks {
  onResult?: (result: SpeechRecognitionResult) => void
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
  onAudioStart?: () => void
  onAudioEnd?: () => void
}

export class SpeechRecognitionManager {
  private recognition: SpeechRecognition | null = null
  private isSupported: boolean = false
  private isListening: boolean = false
  private callbacks: SpeechRecognitionCallbacks = {}
  private options: SpeechRecognitionOptions
  private networkErrorCount: number = 0
  private maxNetworkRetries: number = 2
  private retryTimeoutId: number | null = null

  constructor(options: SpeechRecognitionOptions = {}) {
    this.options = {
      language: 'ja-JP',
      continuous: true,
      interimResults: true,
      maxAlternatives: 1,
      ...options
    }

    this.initializeSpeechRecognition()
  }

  /**
   * Web Speech APIの初期化と対応チェック
   */
  private initializeSpeechRecognition(): void {
    // ブラウザ対応チェック
    const SpeechRecognition = typeof window !== 'undefined' ?
      ((window as any).SpeechRecognition || 
       (window as any).webkitSpeechRecognition) : null

    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser')
      this.isSupported = false
      return
    }

    this.isSupported = true
    this.recognition = new SpeechRecognition()
    this.setupRecognitionConfig()
    this.setupEventHandlers()
  }

  /**
   * 音声認識の設定
   */
  private setupRecognitionConfig(): void {
    if (!this.recognition) return

    this.recognition.lang = this.options.language || 'ja-JP'
    this.recognition.continuous = this.options.continuous || true
    this.recognition.interimResults = this.options.interimResults || true
    this.recognition.maxAlternatives = this.options.maxAlternatives || 1
    
    // サービスURIが指定されている場合（通常はオフライン用）
    if (this.options.serviceURI && (this.recognition as any).serviceURI !== undefined) {
      (this.recognition as any).serviceURI = this.options.serviceURI
    }
    
    // 文法が指定されている場合
    if (this.options.grammars && this.recognition.grammars !== undefined) {
      this.recognition.grammars = this.options.grammars
    }
  }

  /**
   * イベントハンドラーの設定
   */
  private setupEventHandlers(): void {
    if (!this.recognition) return

    this.recognition.onstart = () => {
      this.isListening = true
      this.networkErrorCount = 0 // 成功時にエラーカウンターをリセット
      this.callbacks.onStart?.()
    }

    this.recognition.onend = () => {
      this.isListening = false
      this.callbacks.onEnd?.()
    }

    this.recognition.onaudiostart = () => {
      this.callbacks.onAudioStart?.()
    }

    this.recognition.onaudioend = () => {
      this.callbacks.onAudioEnd?.()
    }

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = Array.from(event.results as any)
      const latestResult = results[results.length - 1] as any
      
      if (latestResult) {
        const transcript = latestResult[0].transcript
        const confidence = latestResult[0].confidence
        const isFinal = latestResult.isFinal

        const result: SpeechRecognitionResult = {
          transcript: transcript.trim(),
          confidence,
          isFinal
        }

        this.callbacks.onResult?.(result)
      }
    }

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error event:', event)
      let errorMessage = 'Speech recognition error'
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = '音声が検出されませんでした。もう一度お試しください。'
          break
        case 'audio-capture':
          errorMessage = 'マイクロフォンにアクセスできません。デバイス設定を確認してください。'
          break
        case 'not-allowed':
          errorMessage = 'マイクロフォンの権限が拒否されました。ブラウザ設定で許可してください。'
          break
        case 'network':
          this.networkErrorCount++
          if (process.env.NODE_ENV === 'development') {
            console.warn('🌐 Speech recognition network error:', {
              error: event.error,
              message: event.message,
              errorCount: this.networkErrorCount,
              isHTTPS: typeof location !== 'undefined' ? (location.protocol === 'https:' || location.hostname === 'localhost') : false
            })
          }
          
          // ネットワークエラーの場合、限定的な自動リトライを許可
          this.isListening = false
          
          // HTTPSチェック
          const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost'
          
          if (!isHTTPS) {
            errorMessage = '🔒 音声認識にはHTTPS接続が必要です。https://でアクセスするか、localhostを使用してください。'
            // HTTPS以外では自動リトライを無効化
            if (this.retryTimeoutId !== null) {
              clearTimeout(this.retryTimeoutId)
              this.retryTimeoutId = null
            }
          } else if (!navigator.onLine) {
            errorMessage = '📡 インターネット接続がありません。接続を確認してからもう一度お試しください。'
          } else if (this.networkErrorCount <= 2) {
            // 初回〜2回目のネットワークエラーは自動リトライ対象とする
            errorMessage = `🌐 Google音声認識サービスへの接続に失敗しました。自動でリトライします... (${this.networkErrorCount}/3)`
          } else {
            // 3回以上の場合は手動対応を促す
            errorMessage = `🌐 Google音声認識サービスへの接続が安定しません。以下をお試しください：
• インターネット接続を確認
• VPNを一時的に無効化
• ブラウザを再起動してページを再読み込み
• しばらく時間をおいて再試行

手動でマイクボタンを押し直してください。`
            // 3回以上では自動リトライを無効化
            if (this.retryTimeoutId !== null) {
              clearTimeout(this.retryTimeoutId)
              this.retryTimeoutId = null
            }
          }
          break
        case 'service-not-allowed':
          errorMessage = '音声認識サービスが利用できません。'
          break
        case 'bad-grammar':
          errorMessage = '音声認識の設定に問題があります。'
          break
        case 'language-not-supported':
          errorMessage = '指定された言語がサポートされていません。'
          break
        default:
          errorMessage = `音声認識エラー: ${event.error}`
          console.warn('Unknown speech recognition error:', event)
      }

      this.callbacks.onError?.(errorMessage)
    }
  }

  /**
   * 音声認識を開始
   */
  start(): boolean {
    if (!this.isSupported) {
      this.callbacks.onError?.('Speech recognition is not supported')
      return false
    }

    if (this.isListening) {
      this.callbacks.onError?.('Speech recognition is already running')
      return false
    }

    try {
      this.recognition?.start()
      return true
    } catch (error) {
      this.callbacks.onError?.(`Failed to start speech recognition: ${error}`)
      return false
    }
  }

  /**
   * 音声認識を停止
   */
  stop(): void {
    // 再試行タイマーをクリア
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId)
      this.retryTimeoutId = null
    }
    
    // 手動停止時はエラーカウンターをリセット
    this.networkErrorCount = 0
    
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
  }

  /**
   * 音声認識を中断
   */
  abort(): void {
    // 再試行タイマーをクリア
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId)
      this.retryTimeoutId = null
    }
    
    if (this.recognition && this.isListening) {
      this.recognition.abort()
    }
  }

  /**
   * コールバック関数を設定
   */
  setCallbacks(callbacks: SpeechRecognitionCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  /**
   * 対応状況を取得
   */
  getIsSupported(): boolean {
    return this.isSupported
  }

  /**
   * 現在の状態を取得
   */
  getIsListening(): boolean {
    return this.isListening
  }

  /**
   * 設定を更新
   */
  updateOptions(newOptions: Partial<SpeechRecognitionOptions>): void {
    this.options = { ...this.options, ...newOptions }
    this.setupRecognitionConfig()
  }

  /**
   * リソースをクリーンアップ
   */
  destroy(): void {
    // 再試行タイマーをクリア
    if (this.retryTimeoutId !== null) {
      clearTimeout(this.retryTimeoutId)
      this.retryTimeoutId = null
    }
    
    this.stop()
    this.recognition = null
    this.callbacks = {}
    this.networkErrorCount = 0
  }
}

/**
 * マイクロフォンの権限を要求
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    // 権限取得後、ストリームを停止
    stream.getTracks().forEach(track => track.stop())
    return true
  } catch (error) {
    console.error('Microphone permission denied:', error)
    return false
  }
}

/**
 * ネットワーク環境の緊急診断
 */
export function diagnoseNetworkEnvironment(): {
  protocol: string
  hostname: string
  isHTTPS: boolean
  isOnline: boolean
  userAgent: string
  recommendedAction: string
  severity: 'error' | 'warning' | 'info'
} {
  const protocol = location.protocol
  const hostname = location.hostname
  const isHTTPS = protocol === 'https:' || hostname === 'localhost'
  const isOnline = navigator.onLine
  const userAgent = navigator.userAgent
  
  let recommendedAction = ''
  let severity: 'error' | 'warning' | 'info' = 'info'
  
  if (!isHTTPS) {
    severity = 'error'
    recommendedAction = `🔒 HTTPS接続が必要です。以下をお試しください：
• ブラウザで https://${hostname} にアクセス
• または localhost でアクセス
• 開発サーバーをHTTPS対応に設定`
  } else if (!isOnline) {
    severity = 'error'
    recommendedAction = `📡 インターネット接続がありません：
• Wi-Fi接続を確認
• 有線LAN接続を確認
• モバイルデータ接続を確認`
  } else {
    severity = 'warning'
    recommendedAction = `🌐 接続環境は正常ですが、音声認識サーバーに接続できません：
• Google音声認識サービスがブロックされている可能性
• VPNやプロキシを一時的に無効化
• ファイアウォール設定を確認
• 別のネットワーク（モバイルホットスポットなど）で試行`
  }
  
  return {
    protocol,
    hostname,
    isHTTPS,
    isOnline,
    userAgent,
    recommendedAction,
    severity
  }
}

/**
 * ブラウザの音声認識対応状況をチェック
 */
export function checkSpeechRecognitionSupport(): {
  isSupported: boolean
  browserName: string
  recommendedMessage?: string
  securityWarning?: string
  troubleshooting?: string[]
} {
  const userAgent = navigator.userAgent
  let browserName = 'Unknown'
  
  if (userAgent.includes('Chrome')) {
    browserName = 'Chrome'
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari'
  } else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox'
  } else if (userAgent.includes('Edge')) {
    browserName = 'Edge'
  }

  const SpeechRecognition = 
    (window as any).SpeechRecognition || 
    (window as any).webkitSpeechRecognition

  const isSupported = !!SpeechRecognition
  
  // HTTPSチェック
  const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost'
  
  let recommendedMessage
  let securityWarning
  let troubleshooting: string[] = []
  
  if (!isSupported) {
    if (browserName === 'Firefox') {
      recommendedMessage = 'Chrome、Edge、またはSafariをお使いください。'
    } else {
      recommendedMessage = 'ブラウザが最新版かご確認ください。'
    }
  }
  
  if (!isHTTPS) {
    securityWarning = 'HTTPS接続が必要です。音声認識はセキュアな接続でのみ動作します。'
  }
  
  // トラブルシューティングガイド
  if (!isSupported || !isHTTPS) {
    troubleshooting = [
      'HTTPSでアクセスしているか確認してください',
      'マイクロフォンの権限を許可してください',
      'インターネット接続を確認してください',
      'ブラウザを最新版に更新してください',
      'シークレットモードでお試しください'
    ]
  }

  return {
    isSupported,
    browserName,
    recommendedMessage,
    securityWarning,
    troubleshooting
  }
}