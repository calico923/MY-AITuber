/**
 * AudioLipSync Test Suite
 * TDD approach for implementing aituber-kit style real-time lip sync
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock AudioContext for testing
const mockAudioContext = {
  state: 'suspended',
  createAnalyser: vi.fn(() => ({
    fftSize: 2048,
    connect: vi.fn(),
    getFloatTimeDomainData: vi.fn()
  })),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  })),
  decodeAudioData: vi.fn(),
  destination: {},
  resume: vi.fn()
}

// Mock global AudioContext
global.AudioContext = vi.fn(() => mockAudioContext) as any

describe('AudioLipSync', () => {
  let AudioLipSync: any

  beforeEach(async () => {
    // Dynamic import to ensure mocks are in place
    const module = await import('@/lib/audio-lip-sync')
    AudioLipSync = module.AudioLipSync
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Phase 1.1: AudioLipSyncクラスの骨組み作成', () => {
    test('TEST: AudioLipSyncクラスが存在することを確認', () => {
      expect(AudioLipSync).toBeDefined()
      expect(typeof AudioLipSync).toBe('function') // constructor function
    })

    test('TEST: コンストラクタでAudioContextが作成されることを確認', () => {
      const lipSync = new AudioLipSync()
      
      expect(global.AudioContext).toHaveBeenCalled()
      expect(lipSync.audioContext).toBeDefined()
    })

    test('TEST: コンストラクタでAnalyserNodeが作成されることを確認', () => {
      const lipSync = new AudioLipSync()
      
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled()
      expect(lipSync.analyser).toBeDefined()
    })
  })

  describe('Phase 1.2: AudioContext初期化', () => {
    test('TEST: AudioContextの状態が"running"または"suspended"であることを確認', () => {
      const lipSync = new AudioLipSync()
      
      expect(['running', 'suspended']).toContain(lipSync.audioContext.state)
    })

    test('TEST: AnalyserNodeのfftSizeが2048に設定されていることを確認', () => {
      const lipSync = new AudioLipSync()
      
      expect(lipSync.analyser.fftSize).toBe(2048)
    })

    test('TEST: timeDomainData配列のサイズがfftSizeと一致することを確認', () => {
      const lipSync = new AudioLipSync()
      
      expect(lipSync.timeDomainData).toBeDefined()
      expect(lipSync.timeDomainData.length).toBe(2048)
    })
  })

  describe('Phase 1.6: 音量取得機能（コア機能）', () => {
    test('TEST: getVolumeメソッドが0-1の範囲の値を返すことを確認', () => {
      const lipSync = new AudioLipSync()
      
      // Mock the analyser data
      const mockData = new Float32Array(2048)
      mockData.fill(0.5) // Set some volume
      lipSync.analyser.getFloatTimeDomainData.mockImplementation((data: Float32Array) => {
        data.set(mockData)
      })
      
      const volume = lipSync.getVolume()
      
      expect(volume).toBeGreaterThanOrEqual(0)
      expect(volume).toBeLessThanOrEqual(1)
    })

    test('TEST: 無音時に0を返すことを確認', () => {
      const lipSync = new AudioLipSync()
      
      // Mock silent data
      const mockData = new Float32Array(2048)
      mockData.fill(0) // Silent
      lipSync.analyser.getFloatTimeDomainData.mockImplementation((data: Float32Array) => {
        data.set(mockData)
      })
      
      const volume = lipSync.getVolume()
      
      expect(volume).toBe(0)
    })

    test('TEST: 音声再生中に0より大きい値を返すことを確認', () => {
      const lipSync = new AudioLipSync()
      
      // Set playing state to true (simulate audio playback)
      lipSync['isPlaying'] = true
      
      // Mock audio data with some volume
      const mockData = new Float32Array(2048)
      for (let i = 0; i < mockData.length; i++) {
        mockData[i] = Math.sin(i * 0.1) * 0.5 // Sine wave with amplitude 0.5
      }
      lipSync.analyser.getFloatTimeDomainData.mockImplementation((data: Float32Array) => {
        data.set(mockData)
      })
      
      const volume = lipSync.getVolume()
      
      expect(volume).toBeGreaterThan(0)
    })
  })
})