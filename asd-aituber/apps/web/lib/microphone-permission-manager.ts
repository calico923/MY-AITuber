/**
 * Microphone Permission Manager
 * マイクロフォン権限の管理と状態チェックを行うユーティリティクラス
 * ブラウザ別対応とトースト通知機能を含む
 */

export interface BrowserInfo {
  name: string
  version: string
  supportsPermissionsAPI: boolean
  supportsWebSpeechAPI: boolean
  requiresHTTPS: boolean
  requiresUserGesture: boolean
  microphoneQuerySupported: boolean
}

export interface MicrophonePermissionStatus {
  granted: boolean      // 権限が許可されているか
  persistent: boolean   // 永続的な権限状態か（Permissions API利用時はtrue）
  browserSupport: boolean // ブラウザがPermissions APIをサポートしているか
  browserInfo?: BrowserInfo // ブラウザ情報
  recommendedAction?: string // 推奨アクション
}

export interface MicrophoneTestResult {
  granted: boolean
  error?: string
  timestamp?: number
}

export interface StoredPermissionStatus {
  granted: boolean
  timestamp: number
  userAgent?: string
  error?: string
  browserName?: string
}

export interface ToastNotification {
  type: 'error' | 'warning' | 'info' | 'success'
  message: string
  details?: string
  duration?: number
  actions?: Array<{
    label: string
    action: () => void
  }>
}

export interface RecoveryInstructions {
  browserName: string
  error: string
  instructions: string[]
  troubleshooting?: string[]
  securityNotes?: string[]
}

export class MicrophonePermissionManager {
  private static readonly STORAGE_KEY = 'microphone-permission-status'
  private static toastCallback?: (notification: ToastNotification) => void
  /**
   * トースト通知のコールバックを設定
   */
  static setToastCallback(callback: (notification: ToastNotification) => void) {
    this.toastCallback = callback
  }

  /**
   * ブラウザ情報を取得
   */
  static getBrowserInfo(): BrowserInfo {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    
    // ブラウザ判定
    const isChrome = /Chrome/.test(userAgent) && !/Edge/.test(userAgent)
    const isFirefox = /Firefox/.test(userAgent)
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)
    const isEdge = /Edge/.test(userAgent)
    
    let browserName = 'Unknown'
    let version = ''
    
    if (isChrome) {
      browserName = 'Chrome'
      const match = userAgent.match(/Chrome\/([0-9.]+)/)
      version = match ? match[1] : ''
    } else if (isFirefox) {
      browserName = 'Firefox'
      const match = userAgent.match(/Firefox\/([0-9.]+)/)
      version = match ? match[1] : ''
    } else if (isSafari) {
      browserName = 'Safari'
      const match = userAgent.match(/Version\/([0-9.]+)/)
      version = match ? match[1] : ''
    } else if (isEdge) {
      browserName = 'Edge'
      const match = userAgent.match(/Edge\/([0-9.]+)/)
      version = match ? match[1] : ''
    }

    return {
      name: browserName,
      version,
      supportsPermissionsAPI: typeof navigator !== 'undefined' && 'permissions' in navigator,
      supportsWebSpeechAPI: typeof window !== 'undefined' && 'webkitSpeechRecognition' in window,
      requiresHTTPS: browserName !== 'Chrome' || location.protocol !== 'https:',
      requiresUserGesture: browserName === 'Safari',
      microphoneQuerySupported: browserName === 'Chrome' || browserName === 'Edge',
    }
  }

  /**
   * マイクロフォン権限の現在の状態をチェックする
   * Permissions APIが利用可能な場合は優先的に使用し、
   * 利用不可の場合はgetUserMediaでフォールバック
   */
  static async checkPermissionStatus(): Promise<MicrophonePermissionStatus> {
    const browserInfo = this.getBrowserInfo()
    
    // Permissions APIが利用可能かチェック
    if (browserInfo.supportsPermissionsAPI && browserInfo.microphoneQuerySupported) {
      try {
        const permissionResult = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        
        return {
          granted: permissionResult.state === 'granted',
          persistent: true,
          browserSupport: true,
          browserInfo,
          recommendedAction: this.getRecommendedAction(browserInfo, permissionResult.state)
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Permissions API failed, falling back to getUserMedia:', error)
        }
        // Permissions APIが失敗した場合はフォールバック
        return await this.fallbackPermissionCheck(browserInfo)
      }
    }
    
    // Permissions APIが利用不可の場合はフォールバック
    return await this.fallbackPermissionCheck(browserInfo)
  }

  /**
   * 推奨アクションを取得
   */
  private static getRecommendedAction(browserInfo: BrowserInfo, permissionState?: string): string {
    if (browserInfo.name === 'Firefox') {
      return 'マイクボタンをクリックして権限を許可してください'
    }
    
    if (browserInfo.name === 'Safari') {
      if (location.protocol !== 'https:') {
        return 'HTTPS接続が必要です。https://localhost でアクセスしてください'
      }
      return 'マイクボタンをクリックして権限を許可してください'
    }
    
    if (permissionState === 'denied') {
      return 'ブラウザ設定でマイク権限を許可してください'
    }
    
    return 'マイクボタンをクリックして音声入力を開始してください'
  }

  /**
   * getUserMediaを使用したフォールバック権限チェック
   * 実際にマイクへのアクセスを試行して権限状態を判定
   */
  private static async fallbackPermissionCheck(browserInfo: BrowserInfo): Promise<MicrophonePermissionStatus> {
    // mediaDevicesが利用可能かチェック
    if (typeof navigator === 'undefined' || !('mediaDevices' in navigator) || !navigator.mediaDevices) {
      return {
        granted: false,
        persistent: false,
        browserSupport: false,
        browserInfo,
        recommendedAction: 'ブラウザがMediaDevices APIをサポートしていません'
      }
    }

    try {
      // 一時的にマイクアクセスを試行
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // ストリームを即座に停止
      const tracks = stream.getTracks()
      tracks.forEach(track => track.stop())
      
      return {
        granted: true,
        persistent: false,
        browserSupport: false,
        browserInfo,
        recommendedAction: this.getRecommendedAction(browserInfo)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      return {
        granted: false,
        persistent: false,
        browserSupport: false,
        browserInfo,
        recommendedAction: this.getRecommendedAction(browserInfo, 'denied')
      }
    }
  }

  /**
   * マイクロフォンアクセスをテストして結果をローカルストレージに保存
   * 実際にユーザーの操作として権限をテストする場合に使用
   */
  static async testMicrophoneAccess(): Promise<MicrophoneTestResult> {
    const timestamp = Date.now()
    
    // mediaDevicesが利用可能かチェック
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('mediaDevices' in navigator) || !navigator.mediaDevices) {
      const result: MicrophoneTestResult = {
        granted: false,
        error: 'MediaDevices API not available',
        timestamp
      }
      
      this.savePermissionStatus(result)
      return result
    }

    try {
      // 一時的にマイクアクセスを試行
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // ストリームを即座に停止
      const tracks = stream.getTracks()
      tracks.forEach(track => track.stop())
      
      const result: MicrophoneTestResult = {
        granted: true,
        timestamp
      }
      
      this.savePermissionStatus(result)
      return result
    } catch (error) {
      const result: MicrophoneTestResult = {
        granted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      }
      
      this.savePermissionStatus(result)
      return result
    }
  }

  /**
   * 権限テスト結果をローカルストレージに保存
   */
  private static savePermissionStatus(result: MicrophoneTestResult): void {
    if (typeof window === 'undefined') return

    try {
      const statusData: StoredPermissionStatus = {
        granted: result.granted,
        timestamp: result.timestamp || Date.now(),
        userAgent: navigator.userAgent,
        error: result.error,
        browserName: this.getBrowserInfo().name
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(statusData))
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to save microphone permission status to localStorage:', error)
      }
    }
  }

  /**
   * 保存された権限状態を取得
   */
  static getLastKnownStatus(): StoredPermissionStatus | null {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return null

      return JSON.parse(stored)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to parse stored microphone permission status:', error)
      }
      return null
    }
  }

  /**
   * 保存された権限状態をクリア
   */
  static clearStoredStatus(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to clear stored microphone permission status:', error)
      }
    }
  }

  /**
   * ブラウザ別の復旧指示を取得
   */
  static getRecoveryInstructions(error: string): RecoveryInstructions {
    const browserInfo = this.getBrowserInfo()
    
    if (browserInfo.name === 'Chrome') {
      return {
        browserName: 'Chrome',
        error,
        instructions: [
          'アドレスバーの左側の鍵アイコン（または情報アイコン）をクリック',
          '「マイクロフォン」の設定を「許可」に変更',
          'ページを更新してから再度お試しください'
        ],
        troubleshooting: [
          'chrome://settings/content/microphone でマイク設定を確認',
          'このサイトがブロックリストに追加されていないか確認',
          'Chrome を再起動してから再試行'
        ],
        securityNotes: [
          'HTTPSサイトでのみマイクアクセスが可能です',
          'プライベートブラウジングモードでは設定が保持されません'
        ]
      }
    }
    
    if (browserInfo.name === 'Firefox') {
      return {
        browserName: 'Firefox',
        error,
        instructions: [
          'アドレスバーの左側のマイクアイコンをクリック',
          '「一時的に許可」または「記憶して許可」を選択',
          'マイクボタンをクリックして権限ダイアログを再表示'
        ],
        troubleshooting: [
          'about:preferences#privacy の「許可設定」でマイク設定を確認',
          'このサイトの例外設定を削除して再設定',
          'Firefox を再起動してから再試行'
        ],
        securityNotes: [
          'HTTPSサイトでのみマイクアクセスが可能です',
          'プライベートブラウジングでは権限設定が保持されません'
        ]
      }
    }
    
    if (browserInfo.name === 'Safari') {
      return {
        browserName: 'Safari',
        error,
        instructions: [
          'Safari メニュー → 環境設定 → Webサイト',
          '「マイク」を選択',
          `このサイト（${location.hostname}）の設定を「許可」に変更`,
          'ページを更新してからマイクボタンをクリック'
        ],
        troubleshooting: [
          'HTTPS接続でアクセスしているか確認（必須）',
          'システム環境設定でSafariのマイクアクセスが許可されているか確認',
          'Safari を再起動してから再試行'
        ],
        securityNotes: [
          'HTTPSでのアクセスが必須です',
          'ユーザーの操作（ボタンクリック）なしではマイクアクセスできません',
          'プライベートブラウジングでは権限設定が保持されません'
        ]
      }
    }
    
    if (browserInfo.name === 'Edge') {
      return {
        browserName: 'Edge',
        error,
        instructions: [
          'アドレスバーの左側の鍵アイコンをクリック',
          '「マイクロフォン」の設定を「許可」に変更',
          'ページを更新してから再度お試しください'
        ],
        troubleshooting: [
          'edge://settings/content/microphone でマイク設定を確認',
          'このサイトがブロックリストに追加されていないか確認',
          'Microsoft Edge を再起動してから再試行'
        ],
        securityNotes: [
          'HTTPSサイトでのみマイクアクセスが可能です',
          'InPrivateブラウジングでは設定が保持されません'
        ]
      }
    }
    
    // 不明なブラウザ
    return {
      browserName: 'Unknown',
      error,
      instructions: [
        'ブラウザの設定でマイクロフォンのアクセスを許可してください',
        'ページを更新してから再度お試しください'
      ],
      troubleshooting: [
        'HTTPSでアクセスしているか確認',
        'ブラウザを再起動してから再試行',
        'Chrome または Firefox の使用を推奨します'
      ],
      securityNotes: [
        'HTTPSサイトでのみマイクアクセスが可能です'
      ]
    }
  }

  /**
   * エラーに基づいてトースト通知を表示
   */
  static showErrorToast(error: string) {
    if (!this.toastCallback) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Toast callback not set, cannot show notification')
      }
      return
    }

    const browserInfo = this.getBrowserInfo()
    const recovery = this.getRecoveryInstructions(error)
    
    if (error.includes('NotAllowedError') || error.includes('Permission denied')) {
      this.toastCallback({
        type: 'error',
        message: `マイクロフォンのアクセスが拒否されました（${browserInfo.name}）`,
        details: '設定を変更して権限を許可してください',
        duration: 8000,
        actions: [
          {
            label: '解決方法を表示',
            action: () => this.showRecoveryDialog(recovery)
          }
        ]
      })
    } else if (error.includes('NotFoundError')) {
      this.toastCallback({
        type: 'warning',
        message: 'マイクロフォンが見つかりません',
        details: 'マイクが接続されているか確認してください',
        duration: 5000
      })
    } else if (error.includes('NotReadableError')) {
      this.toastCallback({
        type: 'warning',
        message: 'マイクロフォンが使用中です',
        details: '他のアプリケーションがマイクを使用している可能性があります',
        duration: 5000
      })
    } else if (error.includes('HTTPS') || error.includes('SecurityError')) {
      this.toastCallback({
        type: 'error',
        message: 'セキュリティエラー',
        details: 'HTTPS接続が必要です',
        duration: 8000,
        actions: [
          {
            label: 'HTTPS版に移動',
            action: () => {
              const httpsUrl = location.href.replace('http://', 'https://')
              location.href = httpsUrl
            }
          }
        ]
      })
    } else {
      this.toastCallback({
        type: 'error',
        message: 'マイクロフォンエラー',
        details: error,
        duration: 5000
      })
    }
  }

  /**
   * 開発環境向けの警告を表示
   */
  static showDevelopmentWarning() {
    if (!this.toastCallback) return
    
    const browserInfo = this.getBrowserInfo()
    
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      this.toastCallback({
        type: 'warning',
        message: '開発環境での制限',
        details: `${browserInfo.name}では音声認識にHTTPS接続が必要です`,
        duration: 10000,
        actions: [
          {
            label: 'HTTPS版で開く',
            action: () => {
              const httpsUrl = `https://localhost:3002${location.pathname}${location.search}`
              location.href = httpsUrl
            }
          }
        ]
      })
    }
  }

  /**
   * 復旧ダイアログを表示（簡易実装）
   */
  private static showRecoveryDialog(recovery: RecoveryInstructions) {
    const message = `
【${recovery.browserName} での解決方法】

🔧 基本的な手順:
${recovery.instructions.map(step => `• ${step}`).join('\n')}

💡 追加のトラブルシューティング:
${recovery.troubleshooting?.map(step => `• ${step}`).join('\n') || 'なし'}

🔒 セキュリティに関する注意:
${recovery.securityNotes?.map(note => `• ${note}`).join('\n') || 'なし'}
    `.trim()
    
    alert(message)
  }

  /**
   * 包括的な権限チェックとユーザー支援
   */
  static async checkAndAssist(): Promise<MicrophonePermissionStatus> {
    try {
      const status = await this.checkPermissionStatus()
      
      if (!status.granted && status.browserInfo) {
        // 開発環境での警告
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
          this.showDevelopmentWarning()
        }
        
        // ブラウザ別のガイダンスを提供
        if (this.toastCallback) {
          const action = status.recommendedAction || 'マイク権限を許可してください'
          this.toastCallback({
            type: 'info',
            message: `${status.browserInfo.name}でのマイク設定`,
            details: action,
            duration: 6000,
            actions: [
              {
                label: '詳細な解決方法',
                action: () => this.showRecoveryDialog(this.getRecoveryInstructions('権限設定'))
              }
            ]
          })
        }
      }
      
      return status
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.showErrorToast(errorMessage)
      throw error
    }
  }
}