/**
 * VoiceInput AudioContextManager統合テスト
 * TDD Red Phase: 失敗するテストケース
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import VoiceInput from '@/components/VoiceInput'
import { AudioContextManager } from '@/libs/audio-context-manager'

// AudioContextManagerをモック
vi.mock('@/libs/audio-context-manager', () => ({
  AudioContextManager: {
    getInstance: vi.fn()
  }
}))

// useSpeechRecognitionをモック
vi.mock('@/hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: () => ({
    isSupported: true,
    isListening: false,
    isInitializing: false,
    hasPermission: true,
    transcript: '',
    interimTranscript: '',
    confidence: 0,
    error: null,
    startListening: vi.fn().mockResolvedValue(true),
    stopListening: vi.fn(),
    requestPermission: vi.fn().mockResolvedValue(true),
    clearError: vi.fn(),
    clearTranscript: vi.fn(),
    browserInfo: {
      isSupported: true,
      browserName: 'Chrome',
      recommendedMessage: 'Test message',
      securityWarning: '',
      troubleshooting: []
    }
  })
}))

describe('VoiceInput AudioContextManager Integration', () => {
  const mockAudioManager = {
    registerVoiceInput: vi.fn(),
    getIsSpeaking: vi.fn().mockReturnValue(false),
    hasVoiceInputRegistered: vi.fn().mockReturnValue(false)
  }

  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks()
    
    // AudioContextManager.getInstanceが毎回モックを返すように設定
    vi.mocked(AudioContextManager.getInstance).mockReturnValue(mockAudioManager as any)
  })

  afterEach(() => {
    cleanup()
  })

  test('コンポーネントマウント時にAudioContextManagerに登録される', () => {
    render(<VoiceInput onTranscript={vi.fn()} />)
    
    // AudioContextManagerのgetInstanceが呼ばれる
    expect(AudioContextManager.getInstance).toHaveBeenCalled()
    
    // registerVoiceInputが適切なコントローラーで呼ばれる
    expect(mockAudioManager.registerVoiceInput).toHaveBeenCalledWith(
      expect.objectContaining({
        forceStop: expect.any(Function),
        autoRestart: expect.any(Function)
      })
    )
  })

  test('登録されるコントローラーのforceStopメソッドが正しく動作する', () => {
    render(<VoiceInput onTranscript={vi.fn()} />)
    
    // 登録されたコントローラーを取得
    const registeredController = vi.mocked(mockAudioManager.registerVoiceInput).mock.calls[0][0]
    
    // forceStopメソッドが存在し、関数であることを確認
    expect(registeredController).toHaveProperty('forceStop')
    expect(typeof registeredController.forceStop).toBe('function')
    
    // forceStopを呼び出してもエラーが発生しないことを確認
    expect(() => {
      registeredController.forceStop()
    }).not.toThrow()
  })

  test('登録されるコントローラーのautoRestartメソッドが正しく動作する', () => {
    render(<VoiceInput onTranscript={vi.fn()} />)
    
    // 登録されたコントローラーを取得
    const registeredController = vi.mocked(mockAudioManager.registerVoiceInput).mock.calls[0][0]
    
    // autoRestartメソッドが存在し、関数であることを確認
    expect(registeredController).toHaveProperty('autoRestart')
    expect(typeof registeredController.autoRestart).toBe('function')
    
    // autoRestartを呼び出してもエラーが発生しないことを確認
    expect(() => {
      registeredController.autoRestart()
    }).not.toThrow()
  })

  test('音声合成中はマイクボタンが無効化される', async () => {
    // AudioContextManagerが音声合成中を返すように設定
    mockAudioManager.getIsSpeaking.mockReturnValue(true)
    
    // タイマーをモック化
    vi.useFakeTimers()
    
    render(<VoiceInput onTranscript={vi.fn()} />)
    
    // 100ms経過させて状態監視の間隔をトリガー
    act(() => {
      vi.advanceTimersByTime(100)
    })
    
    // マイクボタンを探す（aria-labelまたはroleで）
    const micButton = screen.getByRole('button')
    
    // ボタンが無効化されていることを確認
    expect(micButton).toBeDisabled()
    
    vi.useRealTimers()
  })

  test('音声合成終了後はマイクボタンが有効になる', () => {
    // AudioContextManagerが音声合成終了を返すように設定
    mockAudioManager.getIsSpeaking.mockReturnValue(false)
    
    render(<VoiceInput onTranscript={vi.fn()} />)
    
    // マイクボタンを探す
    const micButton = screen.getByRole('button')
    
    // ボタンが有効になっていることを確認
    expect(micButton).not.toBeDisabled()
  })

  test('コンポーネントアンマウント時に適切にクリーンアップされる', () => {
    const { unmount } = render(<VoiceInput onTranscript={vi.fn()} />)
    
    // コンポーネントがマウントされた状態で登録が確認される
    expect(mockAudioManager.registerVoiceInput).toHaveBeenCalled()
    
    // アンマウント実行
    unmount()
    
    // アンマウント後に特定のクリーンアップ処理があれば確認
    // 現在の実装では特別なクリーンアップは不要だが、将来的に追加される可能性がある
  })

  test('音声入力状態の変化に応じてUIが更新される', async () => {
    // タイマーをモック化
    vi.useFakeTimers()
    
    // 初期状態は音声合成なし
    mockAudioManager.getIsSpeaking.mockReturnValue(false)
    
    render(<VoiceInput onTranscript={vi.fn()} />)
    
    // 100ms経過させて状態監視をトリガー
    act(() => {
      vi.advanceTimersByTime(100)
    })
    
    let micButton = screen.getByRole('button')
    expect(micButton).not.toBeDisabled()
    
    // 音声合成中に変更
    mockAudioManager.getIsSpeaking.mockReturnValue(true)
    
    // 再度100ms経過させて状態変化を検出
    act(() => {
      vi.advanceTimersByTime(100)
    })
    
    micButton = screen.getByRole('button')
    expect(micButton).toBeDisabled()
    
    vi.useRealTimers()
  })
})