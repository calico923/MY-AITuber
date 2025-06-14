/**
 * ブラウザ互換性ユーティリティ
 * モダンAPIのフォールバック実装を提供
 */

/**
 * AbortSignal.timeout のサポートを確認
 * @returns サポートされている場合true
 */
export function checkAbortSignalTimeoutSupport(): boolean {
  return typeof AbortSignal !== 'undefined' && 
         typeof (AbortSignal as any).timeout === 'function'
}

/**
 * タイムアウト付きAbortSignalを作成（フォールバック付き）
 * @param ms タイムアウト時間（ミリ秒）
 * @returns AbortSignal
 */
export function createTimeoutSignal(ms: number): AbortSignal {
  // モダンブラウザでAbortSignal.timeoutが利用可能な場合
  if (checkAbortSignalTimeoutSupport()) {
    return (AbortSignal as any).timeout(ms)
  }
  
  // フォールバック実装
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, ms)
  
  // cleanup用にtimeoutIdを保存（ガベージコレクション対応）
  const signal = controller.signal
  ;(signal as any)._timeoutId = timeoutId
  
  return signal
}

/**
 * ブラウザ機能の検出
 * @returns 機能サポート状況
 */
export function detectBrowserFeatures(): {
  webgl: boolean
  webgl2: boolean
  abortSignalTimeout: boolean
  dynamicImport: boolean
  asyncAwait: boolean
  worker: boolean
} {
  return {
    webgl: checkWebGLSupport(),
    webgl2: checkWebGL2Support(),
    abortSignalTimeout: checkAbortSignalTimeoutSupport(),
    dynamicImport: checkDynamicImportSupport(),
    asyncAwait: checkAsyncAwaitSupport(),
    worker: checkWorkerSupport()
  }
}

/**
 * WebGLサポートの簡易チェック
 */
function checkWebGLSupport(): boolean {
  try {
    if (typeof document === 'undefined') return false
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    return gl !== null
  } catch {
    return false
  }
}

/**
 * WebGL2サポートの簡易チェック
 */
function checkWebGL2Support(): boolean {
  try {
    if (typeof document === 'undefined') return false
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    return gl !== null
  } catch {
    return false
  }
}

/**
 * 動的importサポートの確認
 */
function checkDynamicImportSupport(): boolean {
  try {
    // 動的importの構文チェック（Function constructor使用）
    return typeof Function('return import("")') === 'function'
  } catch {
    return false
  }
}

/**
 * async/awaitサポートの確認
 */
function checkAsyncAwaitSupport(): boolean {
  try {
    // async関数の構文チェック
    return typeof (async () => {}) === 'function'
  } catch {
    return false
  }
}

/**
 * Web Workerサポートの確認
 */
function checkWorkerSupport(): boolean {
  return typeof Worker !== 'undefined'
}

/**
 * ブラウザ情報の取得
 */
export function getBrowserInfo(): {
  userAgent: string
  isChrome: boolean
  isFirefox: boolean
  isSafari: boolean
  isEdge: boolean
  version?: string
} {
  if (typeof navigator === 'undefined') {
    return {
      userAgent: 'Server-side',
      isChrome: false,
      isFirefox: false,
      isSafari: false,
      isEdge: false
    }
  }

  const userAgent = navigator.userAgent
  
  return {
    userAgent,
    isChrome: /Chrome/.test(userAgent) && !/Edge/.test(userAgent),
    isFirefox: /Firefox/.test(userAgent),
    isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
    isEdge: /Edge/.test(userAgent),
    version: extractVersionNumber(userAgent)
  }
}

/**
 * User Agentからバージョン番号を抽出
 */
function extractVersionNumber(userAgent: string): string | undefined {
  const chromeMatch = userAgent.match(/Chrome\/(\d+\.\d+)/)
  if (chromeMatch) return chromeMatch[1]
  
  const firefoxMatch = userAgent.match(/Firefox\/(\d+\.\d+)/)
  if (firefoxMatch) return firefoxMatch[1]
  
  const safariMatch = userAgent.match(/Version\/(\d+\.\d+).*Safari/)
  if (safariMatch) return safariMatch[1]
  
  return undefined
}