import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudioPlaybackState } from '@/hooks/useAudioPlaybackState'

describe('useAudioPlaybackState', () => {
  let mockAudio: HTMLAudioElement

  beforeEach(() => {
    // HTMLAudioElementをモック化
    mockAudio = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      dispatchEvent: vi.fn(),
      paused: true  // 初期状態は一時停止
    } as unknown as HTMLAudioElement

    vi.clearAllMocks()
  })

  // ❌ Red Phase: このテストは失敗することを期待
  it('HTMLAudioElementの再生開始時にisPlayingがtrueになる', async () => {
    const { result } = renderHook(() => useAudioPlaybackState(mockAudio))
    
    // 初期状態: 再生していない
    expect(result.current.isPlaying).toBe(false)
    
    // play イベントをシミュレート
    act(() => {
      // addEventListener で登録されたハンドラーを取得して実行
      const playHandler = vi.mocked(mockAudio.addEventListener).mock.calls
        .find(call => call[0] === 'play')?.[1] as EventListener
      
      if (playHandler) {
        playHandler(new Event('play'))
      }
    })
    
    // 再生状態になることを確認
    expect(result.current.isPlaying).toBe(true)
  })

  // ❌ Red Phase: このテストは失敗することを期待
  it('HTMLAudioElement再生終了時にisPlayingがfalseになる', async () => {
    const { result } = renderHook(() => useAudioPlaybackState(mockAudio))
    
    // 最初にplay状態にする
    act(() => {
      const playHandler = vi.mocked(mockAudio.addEventListener).mock.calls
        .find(call => call[0] === 'play')?.[1] as EventListener
      
      if (playHandler) {
        playHandler(new Event('play'))
      }
    })
    
    // 再生中であることを確認
    expect(result.current.isPlaying).toBe(true)
    
    // ended イベントをシミュレート
    act(() => {
      const endedHandler = vi.mocked(mockAudio.addEventListener).mock.calls
        .find(call => call[0] === 'ended')?.[1] as EventListener
      
      if (endedHandler) {
        endedHandler(new Event('ended'))
      }
    })
    
    // 再生終了状態になることを確認
    expect(result.current.isPlaying).toBe(false)
  })

  // ❌ Red Phase: このテストは失敗することを期待
  it('HTMLAudioElement一時停止時にisPlayingがfalseになる', async () => {
    const { result } = renderHook(() => useAudioPlaybackState(mockAudio))
    
    // 最初にplay状態にする
    act(() => {
      const playHandler = vi.mocked(mockAudio.addEventListener).mock.calls
        .find(call => call[0] === 'play')?.[1] as EventListener
      
      if (playHandler) {
        playHandler(new Event('play'))
      }
    })
    
    expect(result.current.isPlaying).toBe(true)
    
    // pause イベントをシミュレート
    act(() => {
      const pauseHandler = vi.mocked(mockAudio.addEventListener).mock.calls
        .find(call => call[0] === 'pause')?.[1] as EventListener
      
      if (pauseHandler) {
        pauseHandler(new Event('pause'))
      }
    })
    
    // 一時停止状態になることを確認
    expect(result.current.isPlaying).toBe(false)
  })

  // ❌ Red Phase: このテストは失敗することを期待
  it('audioがnullの場合はisPlayingがfalseを返す', () => {
    const { result } = renderHook(() => useAudioPlaybackState(null))
    
    // audioがnullの場合は常にfalse
    expect(result.current.isPlaying).toBe(false)
  })

  // ❌ Red Phase: このテストは失敗することを期待
  it('コンポーネントアンマウント時にイベントリスナーが削除される', () => {
    const { unmount } = renderHook(() => useAudioPlaybackState(mockAudio))
    
    // イベントリスナーが登録されていることを確認
    expect(mockAudio.addEventListener).toHaveBeenCalledWith('play', expect.any(Function))
    expect(mockAudio.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function))
    expect(mockAudio.addEventListener).toHaveBeenCalledWith('pause', expect.any(Function))
    expect(mockAudio.addEventListener).toHaveBeenCalledWith('error', expect.any(Function))
    
    // アンマウント
    unmount()
    
    // イベントリスナーが削除されることを確認
    expect(mockAudio.removeEventListener).toHaveBeenCalledWith('play', expect.any(Function))
    expect(mockAudio.removeEventListener).toHaveBeenCalledWith('ended', expect.any(Function))
    expect(mockAudio.removeEventListener).toHaveBeenCalledWith('pause', expect.any(Function))
    expect(mockAudio.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function))
  })

  // ❌ Red Phase: このテストは失敗することを期待
  it('audioオブジェクトが変更された場合、古いリスナーが削除され新しいリスナーが追加される', () => {
    const newMockAudio = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLAudioElement

    const { rerender } = renderHook(
      ({ audio }) => useAudioPlaybackState(audio),
      { initialProps: { audio: mockAudio } }
    )
    
    // 最初のaudioでイベントリスナー登録確認
    expect(mockAudio.addEventListener).toHaveBeenCalledTimes(4)
    
    // audioを変更
    rerender({ audio: newMockAudio })
    
    // 古いaudioのリスナー削除確認
    expect(mockAudio.removeEventListener).toHaveBeenCalledTimes(4)
    
    // 新しいaudioのリスナー追加確認
    expect(newMockAudio.addEventListener).toHaveBeenCalledTimes(4)
  })
})