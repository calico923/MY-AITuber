import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LipSync } from './lip-sync'

// requestAnimationFrameをモック
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 16) // 60fps相当
})

global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id)
})

// performanceをモック
global.performance = {
  now: vi.fn(() => Date.now())
} as any

describe('LipSync', () => {
  let lipSync: LipSync

  beforeEach(() => {
    vi.clearAllMocks()
    lipSync = new LipSync()
  })

  afterEach(() => {
    lipSync.stop()
  })

  describe('textToPhonemes', () => {
    it('should convert Japanese text to phonemes', () => {
      const phonemes = LipSync.textToPhonemes('こんにちは', {
        speed: 10,
        intensity: 0.5,
        pauseDuration: 200
      })

      expect(phonemes).toHaveLength(5)
      expect(phonemes[0]).toEqual({
        phoneme: 'o',
        duration: 100,
        intensity: 0.5
      })
      expect(phonemes[1]).toEqual({
        phoneme: 'a',
        duration: 100,
        intensity: 0.5
      })
    })

    it('should handle punctuation with pauses', () => {
      const phonemes = LipSync.textToPhonemes('こんにちは。', {
        speed: 10,
        intensity: 0.5,
        pauseDuration: 300
      })

      const lastPhoneme = phonemes[phonemes.length - 1]
      expect(lastPhoneme).toEqual({
        phoneme: 'silence',
        duration: 300,
        intensity: 0
      })
    })

    it('should handle spaces with short pauses', () => {
      const phonemes = LipSync.textToPhonemes('こんに ちは', {
        speed: 10,
        intensity: 0.5,
        pauseDuration: 300
      })

      // スペースに対応する短い休止があることを確認
      const spacePhoneme = phonemes.find(p => p.phoneme === 'silence' && p.duration === 50)
      expect(spacePhoneme).toBeDefined()
    })

    it('should reduce intensity for consecutive same phonemes', () => {
      const phonemes = LipSync.textToPhonemes('ああ', {
        speed: 10,
        intensity: 1.0,
        pauseDuration: 300
      })

      expect(phonemes[0].intensity).toBe(1.0)
      expect(phonemes[1].intensity).toBe(0.8) // 0.8倍に減少
    })
  })

  describe('playText', () => {
    it('should start lip sync animation', () => {
      const onPhonemeChange = vi.fn()
      const onComplete = vi.fn()

      lipSync.playText('あ', onPhonemeChange, onComplete)

      expect(lipSync.isActive()).toBe(true)
      expect(requestAnimationFrame).toHaveBeenCalled()
    })

    it('should call onPhonemeChange during animation', async () => {
      const onPhonemeChange = vi.fn()
      const onComplete = vi.fn()

      // performance.nowをモック
      let currentTime = 0
      vi.mocked(performance.now).mockImplementation(() => currentTime)

      lipSync.playText('あ', onPhonemeChange, onComplete, {
        speed: 10,
        intensity: 0.5,
        pauseDuration: 100
      })

      // アニメーションフレームを手動で進める
      currentTime = 50 // 50ms経過
      const animationCallback = vi.mocked(requestAnimationFrame).mock.calls[0][0]
      animationCallback(currentTime)

      expect(onPhonemeChange).toHaveBeenCalledWith('a', 0.5)
    })

    it('should stop animation and call onComplete when finished', async () => {
      const onPhonemeChange = vi.fn()
      const onComplete = vi.fn()

      let currentTime = 0
      vi.mocked(performance.now).mockImplementation(() => currentTime)

      lipSync.playText('あ', onPhonemeChange, onComplete, {
        speed: 10, // 100ms per character
        intensity: 0.5,
        pauseDuration: 100
      })

      // アニメーション終了後の時間に進める
      currentTime = 200 // 文字時間（100ms）を超過
      const animationCallback = vi.mocked(requestAnimationFrame).mock.calls[0][0]
      animationCallback(currentTime)

      expect(lipSync.isActive()).toBe(false)
      expect(onComplete).toHaveBeenCalled()
    })
  })

  describe('stop', () => {
    it('should stop animation and close mouth', () => {
      const onPhonemeChange = vi.fn()

      lipSync.playText('あいうえお', onPhonemeChange)
      expect(lipSync.isActive()).toBe(true)

      lipSync.stop()

      expect(lipSync.isActive()).toBe(false)
      expect(onPhonemeChange).toHaveBeenLastCalledWith('silence', 0)
      expect(cancelAnimationFrame).toHaveBeenCalled()
    })
  })

  describe('play with custom phonemes', () => {
    it('should play custom phoneme sequence', () => {
      const onPhonemeChange = vi.fn()
      const onComplete = vi.fn()

      const customPhonemes = [
        { phoneme: 'a', duration: 100, intensity: 0.8 },
        { phoneme: 'i', duration: 150, intensity: 0.6 },
        { phoneme: 'silence', duration: 200, intensity: 0 }
      ]

      lipSync.play(customPhonemes, onPhonemeChange, onComplete)

      expect(lipSync.isActive()).toBe(true)
      expect(requestAnimationFrame).toHaveBeenCalled()
    })
  })
})