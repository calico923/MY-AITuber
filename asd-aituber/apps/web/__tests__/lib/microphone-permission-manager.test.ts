import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import { MicrophonePermissionManager } from '@/lib/microphone-permission-manager'

// LocalStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Global mocks
const mockPermissionsQuery = vi.fn()
const mockGetUserMedia = vi.fn()

// Setup global mocks
Object.defineProperty(global.navigator, 'permissions', {
  value: { query: mockPermissionsQuery },
  writable: true,
  configurable: true
})

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
  configurable: true
})

describe('MicrophonePermissionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  afterEach(() => {
    // Reset global objects
    Object.defineProperty(global.navigator, 'permissions', {
      value: { query: mockPermissionsQuery },
      writable: true,
      configurable: true
    })
  })

  test('Permissions APIが利用可能な場合、正確な権限状態を返す - granted', async () => {
    mockPermissionsQuery.mockResolvedValue({ state: 'granted' })
    
    const status = await MicrophonePermissionManager.checkPermissionStatus()
    
    expect(status).toEqual({
      granted: true,
      persistent: true,
      browserSupport: true
    })
    expect(mockPermissionsQuery).toHaveBeenCalledWith({ name: 'microphone' })
  })

  test('Permissions APIが利用可能な場合、正確な権限状態を返す - denied', async () => {
    mockPermissionsQuery.mockResolvedValue({ state: 'denied' })
    
    const status = await MicrophonePermissionManager.checkPermissionStatus()
    
    expect(status).toEqual({
      granted: false,
      persistent: true,
      browserSupport: true
    })
  })

  test('Permissions APIが利用可能な場合、正確な権限状態を返す - prompt', async () => {
    mockPermissionsQuery.mockResolvedValue({ state: 'prompt' })
    
    const status = await MicrophonePermissionManager.checkPermissionStatus()
    
    expect(status).toEqual({
      granted: false,
      persistent: true,
      browserSupport: true
    })
  })

  test('Permissions APIが利用不可の場合、getUserMediaにフォールバック - 成功', async () => {
    // Permissions APIを無効化
    delete global.navigator.permissions
    
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
    }
    mockGetUserMedia.mockResolvedValue(mockStream)
    
    const status = await MicrophonePermissionManager.checkPermissionStatus()
    
    expect(status).toEqual({
      granted: true,
      persistent: false,
      browserSupport: false
    })
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(mockStream.getTracks()[0].stop).toHaveBeenCalled()
  })

  test('Permissions APIが利用不可の場合、getUserMediaにフォールバック - 失敗', async () => {
    delete global.navigator.permissions
    
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
    
    const status = await MicrophonePermissionManager.checkPermissionStatus()
    
    expect(status).toEqual({
      granted: false,
      persistent: false,
      browserSupport: false
    })
  })

  test('mediaDevicesが利用不可の場合、適切にハンドリング', async () => {
    delete global.navigator.permissions
    delete global.navigator.mediaDevices
    
    const status = await MicrophonePermissionManager.checkPermissionStatus()
    
    expect(status).toEqual({
      granted: false,
      persistent: false,
      browserSupport: false
    })
  })

  test('Permissions APIでエラーが発生した場合、フォールバックする', async () => {
    // Permissions APIは存在するがエラーを投げる
    mockPermissionsQuery.mockRejectedValue(new Error('Permissions API error'))
    
    // フォールバック用のmediaDevicesは正常に動作する
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
    }
    mockGetUserMedia.mockResolvedValue(mockStream)
    
    // mediaDevicesを確実に設定
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
      configurable: true
    })
    
    const status = await MicrophonePermissionManager.checkPermissionStatus()
    
    expect(status).toEqual({
      granted: true,
      persistent: false,
      browserSupport: false
    })
  })

  describe('Local Storage Integration', () => {
    test('マイク権限の最終確認状態をローカルに保存する - granted', async () => {
      mockGetUserMedia.mockResolvedValue({
        getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
      })
      
      const result = await MicrophonePermissionManager.testMicrophoneAccess()
      
      expect(result.granted).toBe(true)
      
      // localStorage に保存されていることを確認
      const stored = localStorage.getItem('microphone-permission-status')
      expect(stored).not.toBeNull()
      
      const parsedData = JSON.parse(stored!)
      expect(parsedData.granted).toBe(true)
      expect(parsedData.timestamp).toBeDefined()
      expect(typeof parsedData.timestamp).toBe('number')
      expect(parsedData.timestamp).toBeCloseTo(Date.now(), -3) // 3桁の誤差を許可
    })

    test('マイク権限の最終確認状態をローカルに保存する - denied', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'))
      
      const result = await MicrophonePermissionManager.testMicrophoneAccess()
      
      expect(result.granted).toBe(false)
      
      const stored = localStorage.getItem('microphone-permission-status')
      expect(stored).not.toBeNull()
      
      const parsedData = JSON.parse(stored!)
      expect(parsedData.granted).toBe(false)
      expect(parsedData.timestamp).toBeDefined()
    })

    test('保存された権限状態を取得できる', () => {
      const mockData = {
        granted: true,
        timestamp: Date.now(),
        userAgent: 'Test Browser'
      }
      localStorage.setItem('microphone-permission-status', JSON.stringify(mockData))
      
      const status = MicrophonePermissionManager.getLastKnownStatus()
      
      expect(status).toEqual({
        granted: true,
        timestamp: mockData.timestamp,
        userAgent: 'Test Browser'
      })
    })

    test('保存された権限状態が存在しない場合はnullを返す', () => {
      const status = MicrophonePermissionManager.getLastKnownStatus()
      expect(status).toBeNull()
    })

    test('無効なJSONの場合はnullを返し、エラーをログに出力する', () => {
      localStorage.setItem('microphone-permission-status', 'invalid json')
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const status = MicrophonePermissionManager.getLastKnownStatus()
      
      expect(status).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse stored microphone permission status:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    test('testMicrophoneAccess - mediaDevicesが利用不可の場合', async () => {
      delete global.navigator.mediaDevices
      
      const result = await MicrophonePermissionManager.testMicrophoneAccess()
      
      expect(result.granted).toBe(false)
      expect(result.error).toBe('MediaDevices API not available')
      
      const stored = localStorage.getItem('microphone-permission-status')
      expect(stored).not.toBeNull()
      
      const parsedData = JSON.parse(stored!)
      expect(parsedData.granted).toBe(false)
    })
  })
})