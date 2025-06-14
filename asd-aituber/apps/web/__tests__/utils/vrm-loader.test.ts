import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkVRMFileExists, getVRMFileInfo } from '@/lib/utils/vrm-loader'

// fetch をモック化
global.fetch = vi.fn()

describe('VRM File Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should check if VRM file exists', async () => {
    // Mock successful response
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200
    } as Response)

    const exists = await checkVRMFileExists('/models/MyAvatar01_20241125134913.vrm')
    expect(exists).toBe(true)
    expect(fetch).toHaveBeenCalledWith('/models/MyAvatar01_20241125134913.vrm', { 
      method: 'HEAD',
      signal: expect.any(AbortSignal)
    })
  })
  
  it('should handle missing VRM file gracefully', async () => {
    // Mock 404 response
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404
    } as Response)

    const exists = await checkVRMFileExists('/models/non-existent.vrm')
    expect(exists).toBe(false)
    expect(fetch).toHaveBeenCalledWith('/models/non-existent.vrm', { 
      method: 'HEAD',
      signal: expect.any(AbortSignal)
    })
  })
  
  it('should provide file size information', async () => {
    const mockFileSize = 1024 * 1024 // 1MB
    
    // Mock successful response with content-length
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn().mockImplementation((header: string) => {
          if (header === 'content-length') return mockFileSize.toString()
          if (header === 'content-type') return 'application/octet-stream'
          return null
        })
      }
    } as unknown as Response)

    const info = await getVRMFileInfo('/models/MyAvatar01_20241125134913.vrm')
    expect(info).toHaveProperty('size')
    expect(info.size).toBe(mockFileSize)
    expect(info.exists).toBe(true)
  })

  it('should handle network errors gracefully', async () => {
    // Mock network error
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const exists = await checkVRMFileExists('/models/test.vrm')
    expect(exists).toBe(false)
  })

  it('should return proper error info when file not found', async () => {
    // Mock 404 response
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: {
        get: vi.fn(() => null)
      }
    } as unknown as Response)

    const info = await getVRMFileInfo('/models/missing.vrm')
    expect(info.exists).toBe(false)
    expect(info.error).toBe('File not found (404)')
    expect(info.size).toBeUndefined()
  })

  it('should validate VRM file URL format', async () => {
    // テスト無効なURL
    const invalidUrls = [
      '',
      'not-a-url',
      'http://external.com/model.vrm', // 外部URLは拒否
      '/models/model.txt' // .vrm以外は拒否
    ]

    for (const url of invalidUrls) {
      const exists = await checkVRMFileExists(url)
      expect(exists).toBe(false)
    }
  })

  it('should handle timeout errors', async () => {
    // Mock timeout
    vi.mocked(fetch).mockImplementationOnce(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 100)
      )
    )

    const exists = await checkVRMFileExists('/models/slow.vrm')
    expect(exists).toBe(false)
  })
})