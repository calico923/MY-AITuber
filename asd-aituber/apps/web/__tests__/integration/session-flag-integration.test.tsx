import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import ChatPage from '@/app/chat/page'
import type { ChatMessage } from '../../../../packages/types/src/index'
import { useChat } from '@/hooks/useChat'
import { useSimpleUnifiedVoice } from '@/hooks/useUnifiedVoiceSynthesis'

// Mock dependencies
vi.mock('@/hooks/useChat', () => ({
  useChat: vi.fn()
}))

vi.mock('@/hooks/useUnifiedVoiceSynthesis', () => ({
  useSimpleUnifiedVoice: vi.fn()
}))

vi.mock('@/lib/utils/webgl-check', () => ({
  checkWebGLSupport: vi.fn().mockReturnValue({ supported: false, error: 'Mock WebGL not supported' })
}))

vi.mock('@/lib/utils/vrm-loader', () => ({
  checkVRMFileExists: vi.fn().mockResolvedValue(false)
}))

vi.mock('@/lib/utils/dependency-check', () => ({
  checkDependencyCompatibility: vi.fn().mockReturnValue(true),
  getThreeJsVersion: vi.fn().mockReturnValue('0.159.x'),
  getVRMLibVersion: vi.fn().mockReturnValue('2.1.x')
}))

describe('Session Flag Integration Tests', () => {
  const mockSpeakText = vi.fn()
  const mockStopSpeech = vi.fn()
  const mockUseChat = vi.mocked(useChat)
  const mockUseUnifiedVoice = vi.mocked(useSimpleUnifiedVoice)

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useSimpleUnifiedVoice hook
    mockUseUnifiedVoice.mockReturnValue({
      speak: mockSpeakText,
      stop: mockStopSpeech,
      isSpeaking: false,
      error: null,
      currentEngine: 'auto'
    })
  })

  afterEach(() => {
    cleanup()
  })

  test('セッションフラグによる音声合成制御の確認', async () => {
    // Fresh message with session flags - no processed IDs yet
    const sessionMessage: ChatMessage = {
      id: 'session-msg-unique',
      content: 'Session flag test message',
      role: 'assistant',
      timestamp: new Date(),
      emotion: 'joy',
      isFromSession: true,
      hasBeenSpoken: true
    }

    // Start with empty messages, then add session message
    mockUseChat.mockReturnValue({
      messages: [],
      isLoading: false,
      sendMessage: vi.fn(),
      mode: 'ASD',
      changeMode: vi.fn()
    })

    const { rerender } = render(<ChatPage />)
    
    // Wait for initialization
    await waitFor(() => {
      expect(screen.getByText('ASD-AITuber Chat')).toBeInTheDocument()
    })

    // Add the session message
    mockUseChat.mockReturnValue({
      messages: [sessionMessage],
      isLoading: false,
      sendMessage: vi.fn(),
      mode: 'ASD',
      changeMode: vi.fn()
    })

    rerender(<ChatPage />)

    // Give time for processing
    await new Promise(resolve => setTimeout(resolve, 100))

    // Speech synthesis should NOT be called for session message
    expect(mockSpeakText).not.toHaveBeenCalled()
    console.log('✅ セッションフラグによる音声合成制御が動作')
  })

  test('新規メッセージ（セッションフラグfalse）の音声合成実行確認', async () => {
    const newMessage: ChatMessage = {
      id: 'new-msg-unique',
      content: 'New message test',
      role: 'assistant',
      timestamp: new Date(),
      emotion: 'joy',
      isFromSession: false,
      hasBeenSpoken: false
    }

    mockUseChat.mockReturnValue({
      messages: [],
      isLoading: false,
      sendMessage: vi.fn(),
      mode: 'ASD',
      changeMode: vi.fn()
    })

    const { rerender } = render(<ChatPage />)
    
    await waitFor(() => {
      expect(screen.getByText('ASD-AITuber Chat')).toBeInTheDocument()
    })

    // Add new message
    mockUseChat.mockReturnValue({
      messages: [newMessage],
      isLoading: false,
      sendMessage: vi.fn(),
      mode: 'ASD',
      changeMode: vi.fn()
    })

    rerender(<ChatPage />)

    // Speech synthesis SHOULD be called for new message
    await waitFor(() => {
      expect(mockSpeakText).toHaveBeenCalledWith('New message test', expect.any(Object))
    }, { timeout: 1000 })

    console.log('✅ 新規メッセージの音声合成が正常実行')
  })

  test('hasBeenSpokenフラグによる制御確認', async () => {
    const spokenMessage: ChatMessage = {
      id: 'spoken-msg-unique',
      content: 'Already spoken message',
      role: 'assistant',
      timestamp: new Date(),
      emotion: 'joy',
      isFromSession: false,
      hasBeenSpoken: true
    }

    mockUseChat.mockReturnValue({
      messages: [],
      isLoading: false,
      sendMessage: vi.fn(),
      mode: 'ASD',
      changeMode: vi.fn()
    })

    const { rerender } = render(<ChatPage />)
    
    await waitFor(() => {
      expect(screen.getByText('ASD-AITuber Chat')).toBeInTheDocument()
    })

    mockUseChat.mockReturnValue({
      messages: [spokenMessage],
      isLoading: false,
      sendMessage: vi.fn(),
      mode: 'ASD',
      changeMode: vi.fn()
    })

    rerender(<ChatPage />)

    await new Promise(resolve => setTimeout(resolve, 100))

    // Speech synthesis should NOT be called due to hasBeenSpoken flag
    expect(mockSpeakText).not.toHaveBeenCalled()
    console.log('✅ hasBeenSpokenフラグによる制御が動作')
  })
})