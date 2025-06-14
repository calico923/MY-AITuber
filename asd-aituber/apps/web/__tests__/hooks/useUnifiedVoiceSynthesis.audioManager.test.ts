/**
 * useUnifiedVoiceSynthesis AudioContextManager統合テスト
 * TDD Red Phase: 失敗するテストケース
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUnifiedVoiceSynthesis } from '@/hooks/useUnifiedVoiceSynthesis'
import { AudioContextManager } from '@/libs/audio-context-manager'

// AudioContextManagerをモック
vi.mock('@/libs/audio-context-manager', () => ({
  AudioContextManager: {
    getInstance: vi.fn()
  }
}))

// UnifiedVoiceSynthesisをモック - エラーケースに対応
let mockSpeakImplementation: any

vi.mock('@/lib/unified-voice-synthesis', () => ({
  UnifiedVoiceSynthesis: vi.fn().mockImplementation(() => ({
    speak: vi.fn().mockImplementation(async (options) => {
      // カスタム実装がある場合はそれを使用
      if (mockSpeakImplementation) {
        return mockSpeakImplementation(options)
      }
      
      // デフォルト実装
      // onStartコールバックを呼び出し
      if (options.callbacks?.onStart) {
        options.callbacks.onStart()
      }
      // onEndコールバックを呼び出し
      if (options.callbacks?.onEnd) {
        setTimeout(() => options.callbacks.onEnd(), 0)
      }
      return true
    }),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    destroy: vi.fn(),
    getEngineStatus: vi.fn().mockResolvedValue({
      voicevox: { available: true, speakers: [] },
      webspeech: { available: true, voices: [] }
    }),
    setPreferredEngine: vi.fn()
  })),
  unifiedVoiceSynthesis: null
}))

describe('useUnifiedVoiceSynthesis AudioContextManager Integration', () => {
  const mockAudioManager = {
    setIsSpeaking: vi.fn(),
    getIsSpeaking: vi.fn().mockReturnValue(false),
    emergencyStop: vi.fn()
  }

  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks()
    mockSpeakImplementation = null
    
    // AudioContextManager.getInstanceが毎回モックを返すように設定
    vi.mocked(AudioContextManager.getInstance).mockReturnValue(mockAudioManager as any)
  })

  afterEach(() => {
    // クリーンアップ
  })

  test('speakText開始時にAudioContextManagerのisSpeakingがtrueになる', async () => {
    const { result } = renderHook(() => useUnifiedVoiceSynthesis())
    
    await act(async () => {
      await result.current.speak('テストメッセージ')
    })
    
    // AudioContextManagerのsetIsSpeakingがtrueで呼ばれることを確認
    expect(mockAudioManager.setIsSpeaking).toHaveBeenCalledWith(true)
  })

  test('speakText完了時にAudioContextManagerのisSpeakingがfalseになる', async () => {
    const { result } = renderHook(() => useUnifiedVoiceSynthesis())
    
    await act(async () => {
      await result.current.speak('テストメッセージ')
      // onEndコールバックが非同期で呼ばれるのを待つ
      await new Promise(resolve => setTimeout(resolve, 10))
    })
    
    // 音声合成開始時にtrueが呼ばれることを確認
    expect(mockAudioManager.setIsSpeaking).toHaveBeenCalledWith(true)
    // 音声合成完了後にfalseが呼ばれることを確認
    expect(mockAudioManager.setIsSpeaking).toHaveBeenCalledWith(false)
  })

  test('音声合成エラー時でもisSpeakingがfalseにリセットされる', async () => {
    // エラーを発生させるモック実装を設定
    mockSpeakImplementation = async (options: any) => {
      // onStartコールバックを呼び出し
      if (options.callbacks?.onStart) {
        options.callbacks.onStart()
      }
      // エラーコールバックを呼び出し
      if (options.callbacks?.onError) {
        options.callbacks.onError('Synthesis failed')
      }
      throw new Error('Synthesis failed')
    }
    
    const { result } = renderHook(() => useUnifiedVoiceSynthesis())
    
    await act(async () => {
      await result.current.speak('テストメッセージ')
    })
    
    // エラーが発生してもfalseにリセットされることを確認
    expect(mockAudioManager.setIsSpeaking).toHaveBeenCalledWith(true)
    expect(mockAudioManager.setIsSpeaking).toHaveBeenCalledWith(false)
  })

  test('stop実行時にemergencyStopが呼ばれる', () => {
    const { result } = renderHook(() => useUnifiedVoiceSynthesis())
    
    act(() => {
      result.current.stop()
    })
    
    // AudioContextManagerのemergencyStopが呼ばれることを確認
    expect(mockAudioManager.emergencyStop).toHaveBeenCalled()
  })

  test('コンポーネントアンマウント時にisSpeakingがfalseにリセットされる', () => {
    const { unmount } = renderHook(() => useUnifiedVoiceSynthesis())
    
    // アンマウント実行
    unmount()
    
    // アンマウント時にfalseにリセットされることを確認
    expect(mockAudioManager.setIsSpeaking).toHaveBeenCalledWith(false)
  })
})