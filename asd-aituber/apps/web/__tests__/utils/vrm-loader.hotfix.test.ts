import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkVRMFileExists, getVRMFileInfo } from '@/lib/utils/vrm-loader'

// fetch をモック化
global.fetch = vi.fn()

describe('VRM Loader Hotfix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should use AbortController fallback when timeout not supported', async () => {
    // Mock successful response
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200
    } as Response)

    // timeoutメソッドを削除してテスト
    const original = (AbortSignal as any).timeout
    Object.defineProperty(AbortSignal, 'timeout', {
      value: undefined,
      writable: true,
      configurable: true
    })
    
    const result = await checkVRMFileExists('/models/test.vrm')
    expect(result).toBeDefined()
    expect(result).toBe(true)
    
    // 復元
    if (original) {
      ;(AbortSignal as any).timeout = original
    }
  })

  it('should handle timeout correctly with fallback implementation', async () => {
    // 遅いレスポンスをシミュレート（abortシグナルに反応）
    vi.mocked(fetch).mockImplementationOnce((url, options) => 
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => resolve({
          ok: true,
          status: 200
        } as Response), 10000) // 10秒遅延

        // AbortSignalがあればabortイベントを監視
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            clearTimeout(timeout)
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
        }
      })
    )

    // timeoutメソッドを削除
    const original = (AbortSignal as any).timeout
    Object.defineProperty(AbortSignal, 'timeout', {
      value: undefined,
      writable: true,
      configurable: true
    })
    
    const startTime = Date.now()
    const result = await checkVRMFileExists('/models/slow.vrm')
    const duration = Date.now() - startTime
    
    expect(result).toBe(false) // タイムアウトで失敗
    expect(duration).toBeLessThan(6000) // 5秒 + 余裕
    
    // 復元
    if (original) {
      ;(AbortSignal as any).timeout = original
    }
  }, 10000)

  it('should work with AbortSignal.timeout when available', async () => {
    // Mock successful response
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200
    } as Response)

    // AbortSignal.timeoutが利用可能な場合のテスト
    if (typeof (AbortSignal as any).timeout === 'function') {
      const result = await checkVRMFileExists('/models/test.vrm')
      expect(result).toBe(true)
    } else {
      // フォールバック実装のテスト
      const result = await checkVRMFileExists('/models/test.vrm')
      expect(result).toBe(true)
    }
  })

  it('should handle network errors gracefully with fallback', async () => {
    // timeoutメソッドを削除
    const original = (AbortSignal as any).timeout
    Object.defineProperty(AbortSignal, 'timeout', {
      value: undefined,
      writable: true,
      configurable: true
    })

    // Mock network error
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const result = await checkVRMFileExists('/models/error.vrm')
    expect(result).toBe(false)
    
    // 復元
    if (original) {
      ;(AbortSignal as any).timeout = original
    }
  })

  it('should work with getVRMFileInfo fallback implementation', async () => {
    // timeoutメソッドを削除
    const original = (AbortSignal as any).timeout
    Object.defineProperty(AbortSignal, 'timeout', {
      value: undefined,
      writable: true,
      configurable: true
    })

    // Mock successful response with headers
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn().mockImplementation((header: string) => {
          if (header === 'content-length') return '1024'
          if (header === 'content-type') return 'application/octet-stream'
          return null
        })
      }
    } as unknown as Response)

    const info = await getVRMFileInfo('/models/test.vrm')
    expect(info.exists).toBe(true)
    expect(info.size).toBe(1024)
    
    // 復元
    if (original) {
      ;(AbortSignal as any).timeout = original
    }
  })
})