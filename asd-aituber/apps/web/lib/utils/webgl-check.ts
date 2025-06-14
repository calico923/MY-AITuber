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
  let testCanvas: HTMLCanvasElement | null = null
  
  try {
    // SSR環境やテスト環境での対応
    if (typeof document === 'undefined') {
      return false
    }

    // canvasが指定されていない場合は新規作成
    testCanvas = canvas || document.createElement('canvas')
    
    // WebGLコンテキストを取得試行
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
    
    // コンテキストが取得できればWebGL対応
    const isSupported = gl !== null && gl !== undefined
    
    // メモリリーク防止: 新規作成したcanvasのみクリーンアップ
    if (!canvas && testCanvas) {
      testCanvas.width = 0
      testCanvas.height = 0
    }
    
    return isSupported
  } catch (error) {
    // メモリリーク防止: エラー時でもクリーンアップ
    if (!canvas && testCanvas) {
      testCanvas.width = 0
      testCanvas.height = 0
    }
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
  let canvas: HTMLCanvasElement | null = null
  
  try {
    if (!checkWebGLSupport()) {
      return { supported: false, error: 'WebGL not supported' }
    }

    canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    
    if (!gl) {
      // メモリリーク防止: canvas をクリーンアップ
      canvas.width = 0
      canvas.height = 0
      return { supported: false, error: 'WebGL context creation failed' }
    }

    // WebGLRenderingContextにキャストして型エラーを回避
    const webglContext = gl as WebGLRenderingContext

    const result = {
      supported: true,
      version: webglContext.getParameter(webglContext.VERSION),
      renderer: webglContext.getParameter(webglContext.RENDERER),
      vendor: webglContext.getParameter(webglContext.VENDOR)
    }
    
    // メモリリーク防止: canvas をクリーンアップ
    canvas.width = 0
    canvas.height = 0
    
    return result
  } catch (error) {
    // メモリリーク防止: エラー時でもクリーンアップ
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
    return { 
      supported: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}