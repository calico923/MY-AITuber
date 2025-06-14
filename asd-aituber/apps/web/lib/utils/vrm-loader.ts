/**
 * VRMファイル読み込みユーティリティ
 * VRMViewerでのモデル読み込み前の事前チェック用
 */

import { createTimeoutSignal } from './browser-compat'

// Constants
const MAX_VRM_FILE_SIZE = 100 * 1024 * 1024 // 100MB limit for mobile memory constraints

export interface VRMFileInfo {
  exists: boolean
  size?: number
  contentType?: string
  error?: string
  lastModified?: Date
}

/**
 * VRMファイルが存在するかチェック
 * @param url VRMファイルのURL（相対パス推奨）
 * @returns ファイルが存在する場合true
 */
export async function checkVRMFileExists(url: string): Promise<boolean> {
  try {
    // URLの基本的なバリデーション
    if (!isValidVRMUrl(url)) {
      console.warn('Invalid VRM URL:', url)
      return false
    }

    // HEADリクエストで存在確認（ダウンロードせずに）
    const response = await fetch(url, { 
      method: 'HEAD',
      // タイムアウト設定（ブラウザ互換性考慮）
      signal: createTimeoutSignal(5000) // 5秒
    })
    
    return response.ok
  } catch (error) {
    console.warn('VRM file existence check failed:', error)
    return false
  }
}

/**
 * VRMファイルの詳細情報を取得
 * @param url VRMファイルのURL
 * @returns ファイル情報オブジェクト
 */
export async function getVRMFileInfo(url: string): Promise<VRMFileInfo> {
  try {
    if (!isValidVRMUrl(url)) {
      return { 
        exists: false, 
        error: 'Invalid VRM URL format' 
      }
    }

    const response = await fetch(url, { 
      method: 'HEAD',
      signal: createTimeoutSignal(5000)
    })
    
    if (!response.ok) {
      return { 
        exists: false, 
        error: `File not found (${response.status})` 
      }
    }

    // ヘッダーから情報を取得
    const contentLength = response.headers.get('content-length')
    const contentType = response.headers.get('content-type')
    const lastModified = response.headers.get('last-modified')

    return {
      exists: true,
      size: contentLength ? parseInt(contentLength, 10) : undefined,
      contentType: contentType || undefined,
      lastModified: lastModified ? new Date(lastModified) : undefined
    }
  } catch (error) {
    return { 
      exists: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * VRM URLの妥当性をチェック
 * @param url チェックするURL
 * @returns 妥当な場合true
 */
function isValidVRMUrl(url: string): boolean {
  // 空文字チェック
  if (!url || url.trim() === '') {
    return false
  }

  // .vrm拡張子チェック
  if (!url.toLowerCase().endsWith('.vrm')) {
    return false
  }

  // 相対パス（ローカル）のみ許可（セキュリティ上の理由）
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // 外部URLは拒否（必要に応じて例外を追加）
    return false
  }

  // 基本的なパス形式チェック
  if (!url.startsWith('/')) {
    return false
  }

  return true
}

/**
 * VRMファイルのプリロード
 * @param url VRMファイルのURL
 * @returns プリロード成功の場合true
 */
export async function preloadVRMFile(url: string): Promise<boolean> {
  try {
    const info = await getVRMFileInfo(url)
    
    if (!info.exists) {
      console.warn('VRM file preload failed: file does not exist')
      return false
    }

    // ファイルサイズチェック
    if (info.size && info.size > MAX_VRM_FILE_SIZE) {
      console.warn('VRM file is too large:', info.size, 'bytes')
      return false
    }

    console.log('VRM file preload successful:', {
      url,
      size: info.size,
      contentType: info.contentType
    })
    
    return true
  } catch (error) {
    console.error('VRM file preload error:', error)
    return false
  }
}