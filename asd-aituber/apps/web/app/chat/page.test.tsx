import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import ChatPage from './page'

// モック設定
vi.mock('@/hooks/useChat', () => ({
  useChat: vi.fn()
}))

vi.mock('@/hooks/useUnifiedVoiceSynthesis', () => ({
  useSimpleUnifiedVoice: vi.fn()
}))

vi.mock('@/components/VRMViewer', () => ({
  default: vi.fn().mockImplementation(({ ref, ...props }) => (
    <div data-testid="vrm-viewer" {...props} />
  ))
}))

vi.mock('@/components/ChatPanel', () => ({
  default: vi.fn().mockImplementation((props) => (
    <div data-testid="chat-panel">
      <input 
        data-testid="voice-input" 
        disabled={props.isVoiceDisabled}  // ✅ Task 1.2.2: isVoiceDisabled propを反映
      />
      <button onClick={() => props.onSendMessage('test message')}>Send</button>
    </div>
  ))
}))

vi.mock('@/components/ModeToggle', () => ({
  ModeToggle: vi.fn().mockImplementation(() => (
    <div data-testid="mode-toggle" />
  ))
}))

import { useChat } from '@/hooks/useChat'
import { useSimpleUnifiedVoice } from '@/hooks/useUnifiedVoiceSynthesis'

const mockUseChat = useChat as any
const mockUseSimpleUnifiedVoice = useSimpleUnifiedVoice as any

describe('ChatPage', () => {
  const mockSendMessage = vi.fn()
  const mockSpeakText = vi.fn()
  const mockStopSpeech = vi.fn()
  const mockChangeMode = vi.fn()

  const defaultChatMock = {
    messages: [],
    isLoading: false,
    sendMessage: mockSendMessage,
    mode: 'NT',
    changeMode: mockChangeMode
  }

  const defaultVoiceMock = {
    speak: mockSpeakText,
    stop: mockStopSpeech,
    isSpeaking: false,
    currentEngine: 'voicevox'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChat.mockReturnValue(defaultChatMock)
    mockUseSimpleUnifiedVoice.mockReturnValue(defaultVoiceMock)
  })

  it('正常にレンダリングされる', () => {
    render(<ChatPage />)
    
    expect(screen.getByTestId('vrm-viewer')).toBeInTheDocument()
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument()
    expect(screen.getByTestId('mode-toggle')).toBeInTheDocument()
  })

  // ❌ Task 1.2.1: 音声合成開始時のマイク無効化テスト
  it('アシスタントの発話開始時にマイクが無効化される', async () => {
    // 新しいアシスタントメッセージを含むメッセージリストをモック
    const messagesWithNewAssistant = [
      {
        id: '1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date(),
        emotion: 'neutral' as const
      },
      {
        id: '2',
        role: 'assistant' as const,
        content: 'Hi there!',
        timestamp: new Date(),
        emotion: 'joy' as const
      }
    ]

    // 最初は空のメッセージでレンダリング
    const { rerender } = render(<ChatPage />)
    
    // 新しいアシスタントメッセージが追加された状態に更新し、音声合成中状態もモック
    mockUseChat.mockReturnValue({
      ...defaultChatMock,
      messages: messagesWithNewAssistant
    })
    
    // 音声合成が開始された状態をモック
    mockUseSimpleUnifiedVoice.mockReturnValue({
      ...defaultVoiceMock,
      isSpeaking: true  // ✅ Task 1.2.2: 音声合成中状態を模擬
    })
    
    rerender(<ChatPage />)
    
    // 音声合成が開始されることを確認
    await waitFor(() => {
      expect(mockSpeakText).toHaveBeenCalledWith('Hi there!', expect.any(Object))
    })
    
    // マイクが無効化されることを確認（VoiceInputのdisabled属性）
    // Note: isSpeaking状態でVoiceInputが無効化される
    const voiceInput = screen.getByTestId('voice-input')
    expect(voiceInput).toBeDisabled()  // ✅ Task 1.2.2: disabled属性の存在チェック
  })

  // ✅ Task 1.2.3: 音声合成終了時のマイク有効化テスト
  it('アシスタントの発話終了時にマイクが有効化される', async () => {
    // 通常状態（音声合成なし）でレンダリング
    const { rerender } = render(<ChatPage />)
    
    // 最初はマイクが有効であることを確認
    let voiceInput = screen.getByTestId('voice-input')
    expect(voiceInput).not.toBeDisabled()
    
    // 音声合成中の状態をモック（isSpeaking: true）
    mockUseSimpleUnifiedVoice.mockReturnValue({
      ...defaultVoiceMock,
      isSpeaking: true  // 音声合成中
    })
    
    rerender(<ChatPage />)
    
    // マイクが無効化されていることを確認
    voiceInput = screen.getByTestId('voice-input')
    expect(voiceInput).toBeDisabled()
    
    // 音声合成が終了した状態をモック（isSpeaking: false）
    mockUseSimpleUnifiedVoice.mockReturnValue({
      ...defaultVoiceMock,
      isSpeaking: false  // 音声合成終了
    })
    
    rerender(<ChatPage />)
    
    // マイクが有効化されることを確認
    voiceInput = screen.getByTestId('voice-input')
    expect(voiceInput).not.toBeDisabled()  // ✅ Task 1.2.4: マイク有効化の確認
  })

  // ❌ Task 1.3.1: タイムアウト保護機能のテスト作成
  it('音声合成が30秒以上続く場合、タイムアウトでマイクが有効化される', async () => {
    // タイマーをモック化
    vi.useFakeTimers()
    
    try {
      // 新しいアシスタントメッセージを含むメッセージリストをモック
      const messagesWithNewAssistant = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Hello',
          timestamp: new Date(),
          emotion: 'neutral' as const
        },
        {
          id: '2',
          role: 'assistant' as const,
          content: 'Hi there!',
          timestamp: new Date(),
          emotion: 'joy' as const
        }
      ]

      // 最初は空のメッセージでレンダリング
      const { rerender } = render(<ChatPage />)
      
      // 音声合成が開始されて永続的に続く状態をモック
      mockUseChat.mockReturnValue({
        ...defaultChatMock,
        messages: messagesWithNewAssistant
      })
      
      mockUseSimpleUnifiedVoice.mockReturnValue({
        ...defaultVoiceMock,
        isSpeaking: true  // 音声合成が継続中（終了しない状態）
      })
      
      rerender(<ChatPage />)
      
      // マイクが無効化されていることを確認
      let voiceInput = screen.getByTestId('voice-input')
      expect(voiceInput).toBeDisabled()
      
      // 30秒経過をシミュレート
      act(() => {
        vi.advanceTimersByTime(30000)  // 30秒
      })
      
      // タイムアウト後もまだ音声合成中の場合、マイクが強制有効化されることを確認
      // Note: 実装では、タイムアウト保護によりisSpeakingに関係なくマイクが有効化される
      voiceInput = screen.getByTestId('voice-input')
      expect(voiceInput).not.toBeDisabled()  // ✅ Task 1.3.1: タイムアウト保護の確認
      
    } finally {
      vi.useRealTimers()
    }
  })
})