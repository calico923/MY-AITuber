import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  SpeechRecognitionManager,
  requestMicrophonePermission,
  checkSpeechRecognitionSupport
} from './speech-recognition'

// Web Speech APIのモック
const mockSpeechRecognition = {
  lang: '',
  continuous: false,
  interimResults: false,
  maxAlternatives: 1,
  onstart: null as (() => void) | null,
  onend: null as (() => void) | null,
  onresult: null as ((event: any) => void) | null,
  onerror: null as ((event: any) => void) | null,
  onaudiostart: null as (() => void) | null,
  onaudioend: null as (() => void) | null,
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn()
}

// グローバルオブジェクトのモック
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

describe('SpeechRecognitionManager', () => {
  beforeEach(() => {
    // mockSpeechRecognitionをリセット
    mockSpeechRecognition.lang = ''
    mockSpeechRecognition.continuous = false
    mockSpeechRecognition.interimResults = false
    mockSpeechRecognition.maxAlternatives = 1
    
    // Web Speech APIをモック
    window.SpeechRecognition = vi.fn(() => mockSpeechRecognition)
    window.webkitSpeechRecognition = vi.fn(() => mockSpeechRecognition)
    
    // mediaDevicesのモック
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn()
      }
    })
    
    // userAgentのモック
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: 'Chrome'
    })
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(window, 'SpeechRecognition', {
      value: undefined,
      writable: true,
      configurable: true
    })
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      writable: true,
      configurable: true
    })
  })

  describe('初期化', () => {
    it('対応ブラウザでは正常に初期化される', () => {
      const manager = new SpeechRecognitionManager()
      
      expect(manager.getIsSupported()).toBe(true)
      expect(window.SpeechRecognition).toHaveBeenCalled()
    })

    it('非対応ブラウザでは対応状況がfalseになる', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        value: undefined,
        writable: true,
        configurable: true
      })
      Object.defineProperty(window, 'webkitSpeechRecognition', {
        value: undefined,
        writable: true,
        configurable: true
      })
      
      const manager = new SpeechRecognitionManager()
      
      expect(manager.getIsSupported()).toBe(false)
    })

    it('オプションが正しく設定される', () => {
      const options = {
        language: 'en-US',
        continuous: false,
        interimResults: false,
        maxAlternatives: 2
      }
      
      new SpeechRecognitionManager(options)
      
      expect(mockSpeechRecognition.lang).toBe('en-US')
      expect(mockSpeechRecognition.continuous).toBe(false)
      expect(mockSpeechRecognition.interimResults).toBe(false)
      expect(mockSpeechRecognition.maxAlternatives).toBe(2)
    })
  })

  describe('音声認識の制御', () => {
    let manager: SpeechRecognitionManager

    beforeEach(() => {
      manager = new SpeechRecognitionManager()
    })

    afterEach(() => {
      manager.destroy()
    })

    it('start()で音声認識が開始される', () => {
      const result = manager.start()
      
      expect(result).toBe(true)
      expect(mockSpeechRecognition.start).toHaveBeenCalled()
    })

    it('非対応ブラウザではstart()がfalseを返す', () => {
      const unsupportedManager = new SpeechRecognitionManager()
      // 強制的にサポート状況をfalseに
      ;(unsupportedManager as any).isSupported = false
      
      const result = unsupportedManager.start()
      
      expect(result).toBe(false)
    })

    it('stop()で音声認識が停止される', () => {
      manager.start()
      // リスニング状態をシミュレート
      ;(manager as any).isListening = true
      
      manager.stop()
      
      expect(mockSpeechRecognition.stop).toHaveBeenCalled()
    })

    it('abort()で音声認識が中断される', () => {
      manager.start()
      ;(manager as any).isListening = true
      
      manager.abort()
      
      expect(mockSpeechRecognition.abort).toHaveBeenCalled()
    })
  })

  describe('コールバック処理', () => {
    let manager: SpeechRecognitionManager
    let callbacks: any

    beforeEach(() => {
      callbacks = {
        onStart: vi.fn(),
        onEnd: vi.fn(),
        onResult: vi.fn(),
        onError: vi.fn(),
        onAudioStart: vi.fn(),
        onAudioEnd: vi.fn()
      }
      
      manager = new SpeechRecognitionManager()
      manager.setCallbacks(callbacks)
    })

    afterEach(() => {
      manager.destroy()
    })

    it('onstart イベントでコールバックが呼ばれる', () => {
      mockSpeechRecognition.onstart?.()
      
      expect(callbacks.onStart).toHaveBeenCalled()
      expect(manager.getIsListening()).toBe(true)
    })

    it('onend イベントでコールバックが呼ばれる', () => {
      mockSpeechRecognition.onend?.()
      
      expect(callbacks.onEnd).toHaveBeenCalled()
      expect(manager.getIsListening()).toBe(false)
    })

    it('onresult イベントで結果が正しく処理される', () => {
      const mockEvent = {
        results: [
          {
            0: { transcript: 'こんにちは', confidence: 0.9 },
            isFinal: true
          }
        ]
      }
      
      mockSpeechRecognition.onresult?.(mockEvent)
      
      expect(callbacks.onResult).toHaveBeenCalledWith({
        transcript: 'こんにちは',
        confidence: 0.9,
        isFinal: true
      })
    })

    it('onerror イベントでエラーが正しく処理される', () => {
      const mockError = { error: 'no-speech' }
      
      mockSpeechRecognition.onerror?.(mockError)
      
      expect(callbacks.onError).toHaveBeenCalledWith('No speech detected')
    })
  })

  describe('設定の更新', () => {
    it('updateOptions()で設定が更新される', () => {
      const manager = new SpeechRecognitionManager({
        language: 'ja-JP',
        continuous: true
      })
      
      manager.updateOptions({
        language: 'en-US',
        interimResults: true
      })
      
      expect(mockSpeechRecognition.lang).toBe('en-US')
      expect(mockSpeechRecognition.interimResults).toBe(true)
      expect(mockSpeechRecognition.continuous).toBe(true) // 既存設定は保持
    })
  })
})

describe('requestMicrophonePermission', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn()
      }
    })
  })

  it('権限が許可された場合はtrueを返す', async () => {
    const mockStream = {
      getTracks: vi.fn(() => [{ stop: vi.fn() }])
    }
    ;(navigator.mediaDevices.getUserMedia as any).mockResolvedValue(mockStream)
    
    const result = await requestMicrophonePermission()
    
    expect(result).toBe(true)
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
  })

  it('権限が拒否された場合はfalseを返す', async () => {
    ;(navigator.mediaDevices.getUserMedia as any).mockRejectedValue(new Error('Permission denied'))
    
    const result = await requestMicrophonePermission()
    
    expect(result).toBe(false)
  })
})

describe('checkSpeechRecognitionSupport', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: ''
    })
  })

  it('Chrome で対応している場合', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    })
    window.SpeechRecognition = vi.fn()
    
    const result = checkSpeechRecognitionSupport()
    
    expect(result.isSupported).toBe(true)
    expect(result.browserName).toBe('Chrome')
    expect(result.recommendedMessage).toBeUndefined()
  })

  it('Firefox で非対応の場合', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
    })
    Object.defineProperty(window, 'SpeechRecognition', {
      value: undefined,
      writable: true,
      configurable: true
    })
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      writable: true,
      configurable: true
    })
    
    const result = checkSpeechRecognitionSupport()
    
    expect(result.isSupported).toBe(false)
    expect(result.browserName).toBe('Firefox')
    expect(result.recommendedMessage).toBe('Chrome、Edge、またはSafariをお使いください。')
  })

  it('Safari で対応している場合', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
    })
    window.webkitSpeechRecognition = vi.fn()
    
    const result = checkSpeechRecognitionSupport()
    
    expect(result.isSupported).toBe(true)
    expect(result.browserName).toBe('Safari')
  })
})