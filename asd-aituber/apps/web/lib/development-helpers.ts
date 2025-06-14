/**
 * Development Environment Helpers
 * 開発環境での動作支援とデバッグ用ユーティリティ
 */

/**
 * 現在の環境が開発環境かどうかを判定する
 * @returns 開発環境の場合は true
 */
export function isDevelopmentEnvironment(): boolean {
  // SSR環境（window未定義）の場合はNODE_ENVで判定
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'development'
  }

  // ブラウザ環境での判定
  const { hostname, protocol } = window.location

  // 明示的な開発環境指定
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // ローカル開発環境の判定
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true
  }

  // file:// プロトコル（ローカルファイル）
  if (protocol === 'file:') {
    return true
  }

  // その他の条件（開発用ドメイン等）
  if (hostname.includes('dev.') || hostname.includes('staging.')) {
    return true
  }

  // 本番環境
  return false
}

/**
 * 開発環境特有の警告やヒントをコンソールに出力する
 */
export function showDevelopmentWarnings(): void {
  if (!isDevelopmentEnvironment()) {
    return
  }

  console.warn(
    '🚧 開発環境での注意事項',
    '\n\n' +
    '📝 マイクロフォンの権限について:\n' +
    '• HTTPSが必要: 本番環境では必ずHTTPSを使用してください\n' +
    '• localhost以外では動作しない可能性があります\n' +
    '• ブラウザのセキュリティポリシーにより制限されます\n' +
    '\n' +
    '🔧 トラブルシューティング:\n' +
    '• ブラウザの設定でマイク権限を確認\n' +
    '• 別のブラウザで試行してみてください\n' +
    '• 開発者ツールのコンソールでエラーを確認\n' +
    '\n' +
    '📚 詳細: https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia'
  )
}

/**
 * 開発環境で有用なデバッグ情報を出力する
 */
export function logDevelopmentInfo(): void {
  if (!isDevelopmentEnvironment()) {
    return
  }

  const info = {
    環境: '開発環境',
    ホスト: typeof window !== 'undefined' ? window.location.hostname : 'SSR',
    プロトコル: typeof window !== 'undefined' ? window.location.protocol : 'N/A',
    ユーザーエージェント: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    言語: typeof navigator !== 'undefined' ? navigator.language : 'N/A',
    オンライン状態: typeof navigator !== 'undefined' ? navigator.onLine : 'N/A'
  }

  console.table(info)
}

/**
 * 開発環境でのマイク関連のデバッグ情報を出力する
 */
export function logMicrophoneDebugInfo(): void {
  if (!isDevelopmentEnvironment()) {
    return
  }

  console.group('🎤 マイクロフォン デバッグ情報')

  // MediaDevices API の対応状況
  if (typeof navigator !== 'undefined' && 'mediaDevices' in navigator) {
    console.log('✅ MediaDevices API: 対応')

    // Permissions API の対応状況
    if ('permissions' in navigator) {
      console.log('✅ Permissions API: 対応')
    } else {
      console.warn('⚠️ Permissions API: 非対応')
    }

    // getUserMedia の対応状況
    if ('getUserMedia' in navigator.mediaDevices) {
      console.log('✅ getUserMedia: 対応')
    } else {
      console.error('❌ getUserMedia: 非対応')
    }
  } else {
    console.error('❌ MediaDevices API: 非対応')
  }

  // セキュリティコンテキストの確認
  if (typeof window !== 'undefined') {
    if (window.isSecureContext) {
      console.log('✅ セキュリティコンテキスト: 安全')
    } else {
      console.warn('⚠️ セキュリティコンテキスト: 非安全（HTTPSが必要）')
    }
  }

  console.groupEnd()
}

/**
 * 開発環境の初期化処理
 * アプリケーション起動時に一度呼び出すことを推奨
 */
export function initDevelopmentEnvironment(): void {
  if (!isDevelopmentEnvironment()) {
    return
  }

  console.log('🚀 開発環境で起動しました')
  
  // 基本情報をログ出力
  logDevelopmentInfo()
  
  // マイク関連のデバッグ情報
  logMicrophoneDebugInfo()
  
  // 警告の表示
  showDevelopmentWarnings()
}