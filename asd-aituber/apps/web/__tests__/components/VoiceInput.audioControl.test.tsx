import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import VoiceInput from '@/components/VoiceInput'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

// モック設定
vi.mock('@/hooks/useSpeechRecognition')
vi.mock('@/lib/speech-recognition')
vi.mock('@/lib/speech-debug')

const mockUseSpeechRecognition = useSpeechRecognition as any

describe('VoiceInput Audio Control', () => {
  const defaultMockReturn = {
    isSupported: true,
    isListening: false,
    isInitializing: false,
    hasPermission: true,
    transcript: '',
    interimTranscript: '',
    confidence: 0,
    error: null,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    requestPermission: vi.fn(),
    clearError: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    mockUseSpeechRecognition.mockReturnValue(defaultMockReturn)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ❌ Red Phase: このテストは失敗することを期待
  it('音声発話終了1秒後にマイクが自動ONになる', async () => {
    const mockStartListening = vi.fn().mockResolvedValue(true)
    const mockStopListening = vi.fn()
    const onStateChange = vi.fn()
    
    // 最初は音声認識が動作中状態をセット
    mockUseSpeechRecognition.mockReturnValue({
      ...defaultMockReturn,
      isListening: true,
      startListening: mockStartListening,
      stopListening: mockStopListening
    })
    
    const { rerender } = render(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        disabled={false}
        audioPlaybackState={{ isPlaying: false }}
      />
    )
    
    // disabled=trueでマイクを停止
    rerender(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        disabled={true}
        audioPlaybackState={{ isPlaying: false }}
      />
    )
    
    // 音声認識停止状態をモック
    mockUseSpeechRecognition.mockReturnValue({
      ...defaultMockReturn,
      isListening: false,
      startListening: mockStartListening,
      stopListening: mockStopListening
    })
    
    // 音声発話開始 (playing: true)
    rerender(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        disabled={false}
        audioPlaybackState={{ isPlaying: true }}
      />
    )
    
    // 音声発話終了 (playing: false)
    rerender(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        disabled={false}
        audioPlaybackState={{ isPlaying: false }}
      />
    )
    
    // 1秒経過でマイク自動ON
    act(() => {
      console.log('TEST: Advancing timers by 1000ms')
      vi.advanceTimersByTime(1000)
      console.log('TEST: Timers advanced')
    })
    
    // より多くの時間を進める
    act(() => {
      console.log('TEST: Advancing timers by additional 2000ms')
      vi.advanceTimersByTime(2000)
    })
    
    await waitFor(() => {
      expect(mockStartListening).toHaveBeenCalled()
      expect(onStateChange).toHaveBeenCalledWith(true)
    }, { timeout: 1000 })
  })

  // ❌ Red Phase: このテストは失敗することを期待
  it('音声発話中から発話終了への状態変化でのみマイク自動ONが動作する', async () => {
    const mockStartListening = vi.fn().mockResolvedValue(true)
    const onStateChange = vi.fn()
    
    mockUseSpeechRecognition.mockReturnValue({
      ...defaultMockReturn,
      startListening: mockStartListening
    })
    
    // 最初から音声発話していない状態でレンダリング
    render(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        audioPlaybackState={{ isPlaying: false }}  // 最初から発話終了状態
        disabled={false}
      />
    )
    
    // 1秒経過
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    
    // 音声発話していない状態では自動ONしない
    expect(mockStartListening).not.toHaveBeenCalled()
  })

  // ❌ Red Phase: このテストは失敗することを期待
  it('音声発話終了前にタイマーがクリアされる場合、マイク自動ONが動作しない', async () => {
    const mockStartListening = vi.fn().mockResolvedValue(true)
    const onStateChange = vi.fn()
    
    mockUseSpeechRecognition.mockReturnValue({
      ...defaultMockReturn,
      startListening: mockStartListening
    })
    
    const { rerender, unmount } = render(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        audioPlaybackState={{ isPlaying: true }}  // 音声発話中
        disabled={false}
      />
    )
    
    // 音声発話終了
    rerender(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        audioPlaybackState={{ isPlaying: false }}  // 音声発話終了
        disabled={false}
      />
    )
    
    // 500ms経過（まだタイマー実行前）
    act(() => {
      vi.advanceTimersByTime(500)
    })
    
    // コンポーネントアンマウント（タイマークリア）
    unmount()
    
    // 残り500ms経過
    act(() => {
      vi.advanceTimersByTime(500)
    })
    
    // タイマーがクリアされているため、マイク自動ONしない
    expect(mockStartListening).not.toHaveBeenCalled()
  })

  // ❌ Red Phase: このテストは失敗することを期待
  it('wasListeningBeforeDisabledがtrueの場合のみマイク自動ONが動作する', async () => {
    const mockStartListening = vi.fn().mockResolvedValue(true)
    const mockStopListening = vi.fn()
    const onStateChange = vi.fn()
    
    // 最初は音声認識が動作中
    mockUseSpeechRecognition.mockReturnValue({
      ...defaultMockReturn,
      isListening: true,
      startListening: mockStartListening,
      stopListening: mockStopListening
    })
    
    const { rerender } = render(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        disabled={false}
      />
    )
    
    // 音声合成開始（マイク無効化）
    rerender(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        disabled={true}  // 音声合成中
      />
    )
    
    // マイクが停止されることを確認
    await waitFor(() => {
      expect(mockStopListening).toHaveBeenCalled()
    })
    
    // 音声認識が停止状態になったことをモック
    mockUseSpeechRecognition.mockReturnValue({
      ...defaultMockReturn,
      isListening: false,
      startListening: mockStartListening,
      stopListening: mockStopListening
    })
    
    // 音声発話終了（audioPlaybackState変化）
    rerender(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        disabled={false}  // 音声合成終了
        audioPlaybackState={{ isPlaying: false }}  // 音声発話終了
      />
    )
    
    // 1秒経過
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    
    // wasListeningBeforeDisabledがtrueのため、マイク自動ON
    await waitFor(() => {
      expect(mockStartListening).toHaveBeenCalled()
      expect(onStateChange).toHaveBeenCalledWith(true)
    })
  })

  // ❌ Red Phase: このテストは失敗することを期待
  it('マイク自動ON後、wasListeningBeforeDisabledがfalseにリセットされる', async () => {
    const mockStartListening = vi.fn().mockResolvedValue(true)
    const mockStopListening = vi.fn()
    const onStateChange = vi.fn()
    
    // 音声認識動作中→停止→自動再開のフローをテスト
    mockUseSpeechRecognition.mockReturnValue({
      ...defaultMockReturn,
      isListening: true,
      startListening: mockStartListening,
      stopListening: mockStopListening
    })
    
    const { rerender } = render(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        disabled={false}
      />
    )
    
    // Step 1: 音声合成開始（マイク停止）
    rerender(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        disabled={true}
      />
    )
    
    await waitFor(() => {
      expect(mockStopListening).toHaveBeenCalled()
    })
    
    // Step 2: 音声認識停止状態をモック
    mockUseSpeechRecognition.mockReturnValue({
      ...defaultMockReturn,
      isListening: false,
      startListening: mockStartListening,
      stopListening: mockStopListening
    })
    
    // Step 3: 音声発話終了（自動再開トリガー）
    rerender(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        disabled={false}
        audioPlaybackState={{ isPlaying: false }}
      />
    )
    
    // Step 4: 1秒経過で自動再開
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    
    await waitFor(() => {
      expect(mockStartListening).toHaveBeenCalled()
    })
    
    // Step 5: 再度音声発話終了をシミュレート（wasListeningBeforeDisabledはfalse）
    vi.clearAllMocks()
    
    rerender(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        disabled={false}
        audioPlaybackState={{ isPlaying: false }}
      />
    )
    
    // 1秒経過
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    
    // wasListeningBeforeDisabledがfalseなので、マイク自動ONしない
    expect(mockStartListening).not.toHaveBeenCalled()
  })

  // ❌ Red Phase: このテストは失敗することを期待
  it('audioPlaybackStateがundefinedの場合、マイク自動ONが動作しない', async () => {
    const mockStartListening = vi.fn().mockResolvedValue(true)
    const onStateChange = vi.fn()
    
    mockUseSpeechRecognition.mockReturnValue({
      ...defaultMockReturn,
      startListening: mockStartListening
    })
    
    render(
      <VoiceInput 
        onTranscript={vi.fn()} 
        onStateChange={onStateChange}
        // audioPlaybackStateを渡さない
        disabled={false}
      />
    )
    
    // 1秒経過
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    
    // audioPlaybackStateがundefinedなので、マイク自動ONしない
    expect(mockStartListening).not.toHaveBeenCalled()
  })
})