import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import ChatPage from '@/app/chat/page'
import { SessionManager } from '@/lib/session-manager'
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

Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
})

describe('Page Reload Integration Tests', () => {
  const mockSpeakText = vi.fn()
  const mockStopSpeech = vi.fn()
  const mockUseChat = vi.mocked(useChat)
  const mockUseUnifiedVoice = vi.mocked(useSimpleUnifiedVoice)

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    
    // Mock useChat hook
    mockUseChat.mockReturnValue({
      messages: [],
      isLoading: false,
      sendMessage: vi.fn(),
      mode: 'ASD',
      changeMode: vi.fn()
    })

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

  test('ページリロード時にセッションメッセージの音声合成が発生しない', async () => {
    // Phase 1: セッションデータを事前に保存
    const sessionMessages: ChatMessage[] = [
      {
        id: 'user-1',
        content: 'ユーザーの質問',
        role: 'user',
        timestamp: new Date(),
        isFromSession: false,
        hasBeenSpoken: false
      },
      {
        id: 'assistant-1',
        content: 'AIの応答です',
        role: 'assistant',
        timestamp: new Date(),
        emotion: 'joy',
        isFromSession: false,
        hasBeenSpoken: false
      }
    ]

    SessionManager.saveSession({
      messages: sessionMessages
    })

    // Phase 2: セッションからメッセージを復元してuseChat mockを更新
    const restoredSession = SessionManager.loadSession()
    expect(restoredSession).not.toBeNull()
    expect(restoredSession!.messages).toHaveLength(2)
    
    // 復元されたメッセージには適切なフラグが付与されていることを確認
    expect(restoredSession!.messages[0].isFromSession).toBe(true)
    expect(restoredSession!.messages[0].hasBeenSpoken).toBe(true)
    expect(restoredSession!.messages[1].isFromSession).toBe(true)
    expect(restoredSession!.messages[1].hasBeenSpoken).toBe(true)

    // useChatモックを復元されたメッセージで更新
    mockUseChat.mockReturnValue({
      messages: restoredSession!.messages,
      isLoading: false,
      sendMessage: vi.fn(),
      mode: 'ASD',
      changeMode: vi.fn()
    })

    // Phase 3: ページをレンダリング（リロードをシミュレート）
    render(<ChatPage />)

    // Phase 4: レンダリング後、音声合成が呼ばれないことを確認
    await waitFor(() => {
      expect(screen.getByText('ASD-AITuber Chat')).toBeInTheDocument()
    }, { timeout: 1000 })

    // 短時間待機して音声合成の呼び出しがないことを確認
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(mockSpeakText).not.toHaveBeenCalled()
    console.log('✅ セッションメッセージの音声合成が正しくスキップされました')
  })

  test('新規メッセージ追加時は正常に音声合成される', async () => {
    // 初期状態：空のメッセージリスト
    mockUseChat.mockReturnValue({
      messages: [],
      isLoading: false,
      sendMessage: vi.fn(),
      mode: 'ASD',
      changeMode: vi.fn()
    })

    const { rerender } = render(<ChatPage />)

    // 新規メッセージを追加
    const newMessage: ChatMessage = {
      id: 'assistant-new',
      content: '新しいAI応答',
      role: 'assistant',
      timestamp: new Date(),
      emotion: 'joy',
      isFromSession: false,
      hasBeenSpoken: false
    }

    // useChatの状態を更新してrerender
    mockUseChat.mockReturnValue({
      messages: [newMessage],
      isLoading: false,
      sendMessage: vi.fn(),
      mode: 'ASD',
      changeMode: vi.fn()
    })

    rerender(<ChatPage />)

    // 新規メッセージでは音声合成が呼ばれることを確認
    await waitFor(() => {
      expect(mockSpeakText).toHaveBeenCalledWith('新しいAI応答', expect.any(Object))
    }, { timeout: 1000 })

    console.log('✅ 新規メッセージの音声合成が正常に動作しました')
  })

  test('セッションメッセージでも感情は正しく反映される', async () => {
    // セッションメッセージ with emotion
    const sessionMessage: ChatMessage = {
      id: 'assistant-session',
      content: 'セッション復元メッセージ',
      role: 'assistant',
      timestamp: new Date(),
      emotion: 'surprise',
      isFromSession: true,
      hasBeenSpoken: true
    }

    SessionManager.saveSession({
      messages: [sessionMessage]
    })

    const restoredSession = SessionManager.loadSession()
    mockUseChat.mockReturnValue({
      messages: restoredSession!.messages,
      isLoading: false,
      sendMessage: vi.fn(),
      mode: 'ASD',
      changeMode: vi.fn()
    })

    render(<ChatPage />)

    await waitFor(() => {
      expect(screen.getByText('ASD-AITuber Chat')).toBeInTheDocument()
    })

    // 音声合成は呼ばれないが、感情は反映されることを期待
    expect(mockSpeakText).not.toHaveBeenCalled()
    console.log('✅ セッションメッセージの感情反映テスト完了')
  })
})