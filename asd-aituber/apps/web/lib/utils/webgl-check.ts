/**
 * WebGL対応チェックユーティリティ
 * VRMViewerの表示可否を判定するために使用
 */

/**
 * ブラウザがWebGLをサポートしているかチェック
 * @param canvas - 指定された場合はそのcanvasを使用、未指定の場合は新規作成
 * @returns WebGL対応の場合true、非対応の場合false
 */
export function checkWebGLSupport(canvas?: HTMLCanvasElement): boolean {
  try {
    // SSR環境やテスト環境での対応
    if (typeof document === 'undefined') {
      console.warn('checkWebGLSupport: document is not available (SSR environment)')
      return false
    }

    // canvasが指定されていない場合は新規作成
    const testCanvas = canvas || document.createElement('canvas')
    
    // WebGLコンテキストを取得試行
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
    
    // コンテキストが取得できればWebGL対応
    return gl !== null && gl !== undefined
  } catch (error) {
    // エラーが発生した場合は非対応
    console.warn('WebGL support check failed:', error)
    return false
  }
}

/**
 * WebGLの詳細情報を取得
 * @returns WebGLの対応状況と詳細情報
 */
export function getWebGLInfo(): {
  supported: boolean
  version?: string
  renderer?: string
  vendor?: string
  error?: string
} {
  try {
    if (!checkWebGLSupport()) {
      return { supported: false, error: 'WebGL not supported' }
    }

    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    
    if (!gl) {
      return { supported: false, error: 'WebGL context creation failed' }
    }

    // WebGLRenderingContextにキャストして型エラーを回避
    const webglContext = gl as WebGLRenderingContext

    return {
      supported: true,
      version: webglContext.getParameter(webglContext.VERSION),
      renderer: webglContext.getParameter(webglContext.RENDERER),
      vendor: webglContext.getParameter(webglContext.VENDOR)
    }
  } catch (error) {
    return { 
      supported: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}