/**
 * Microphone Permission Manager
 * マイクロフォン権限の管理と状態チェックを行うユーティリティクラス
 */

export interface MicrophonePermissionStatus {
  granted: boolean      // 権限が許可されているか
  persistent: boolean   // 永続的な権限状態か（Permissions API利用時はtrue）
  browserSupport: boolean // ブラウザがPermissions APIをサポートしているか
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
}

export class MicrophonePermissionManager {
  private static readonly STORAGE_KEY = 'microphone-permission-status'
  /**
   * マイクロフォン権限の現在の状態をチェックする
   * Permissions APIが利用可能な場合は優先的に使用し、
   * 利用不可の場合はgetUserMediaでフォールバック
   */
  static async checkPermissionStatus(): Promise<MicrophonePermissionStatus> {
    // Permissions APIが利用可能かチェック
    if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions) {
      try {
        const permissionResult = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        
        return {
          granted: permissionResult.state === 'granted',
          persistent: true,
          browserSupport: true
        }
      } catch (error) {
        console.warn('Permissions API failed, falling back to getUserMedia:', error)
        // Permissions APIが失敗した場合はフォールバック
        return await this.fallbackPermissionCheck()
      }
    }
    
    // Permissions APIが利用不可の場合はフォールバック
    return await this.fallbackPermissionCheck()
  }

  /**
   * getUserMediaを使用したフォールバック権限チェック
   * 実際にマイクへのアクセスを試行して権限状態を判定
   */
  private static async fallbackPermissionCheck(): Promise<MicrophonePermissionStatus> {
    // mediaDevicesが利用可能かチェック
    if (typeof navigator === 'undefined' || !('mediaDevices' in navigator) || !navigator.mediaDevices) {
      return {
        granted: false,
        persistent: false,
        browserSupport: false
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
        browserSupport: false
      }
    } catch (error) {
      return {
        granted: false,
        persistent: false,
        browserSupport: false
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
        error: result.error
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(statusData))
    } catch (error) {
      console.warn('Failed to save microphone permission status to localStorage:', error)
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
      console.error('Failed to parse stored microphone permission status:', error)
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
      console.warn('Failed to clear stored microphone permission status:', error)
    }
  }
}