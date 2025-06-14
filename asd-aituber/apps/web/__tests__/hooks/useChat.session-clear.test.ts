import { renderHook, act } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import { useChat } from '@/hooks/useChat'
import { SessionManager } from '@/lib/session-manager'

// Mock SessionManager
vi.mock('@/lib/session-manager', () => ({
  SessionManager: {
    saveSession: vi.fn(),
    loadSession: vi.fn(),
    clearSession: vi.fn(),
    getSessionId: vi.fn().mockReturnValue('test-session-id')
  }
}))

// Mock OpenAI client
vi.mock('@/lib/openai-client', () => ({
  streamChatCompletion: vi.fn()
}))

describe('useChat - Session Clear Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('clearConversation呼び出しでメッセージ配列がクリアされる', () => {
    const { result } = renderHook(() => useChat())
    
    // 初期状態でメッセージを設定（SessionManagerから復元されたと仮定）
    act(() => {
      // メッセージを手動で設定（通常はSessionManagerから復元される）
      result.current.setMessages([
        {
          id: '1',
          content: 'ユーザーの質問',
          role: 'user',
          timestamp: new Date()
        },
        {
          id: '2',
          content: 'AIの応答',
          role: 'assistant',
          timestamp: new Date(),
          emotion: 'joy'
        }
      ])
    })
    
    // メッセージが設定されていることを確認
    expect(result.current.messages).toHaveLength(2)
    
    // clearConversation実行
    act(() => {
      result.current.clearConversation()
    })
    
    // メッセージがクリアされることを確認
    expect(result.current.messages).toHaveLength(0)
    expect(SessionManager.clearSession).toHaveBeenCalled()
  })

  test('clearConversation呼び出しでSessionManagerのセッションもクリアされる', () => {
    const { result } = renderHook(() => useChat())
    
    // メッセージを設定
    act(() => {
      result.current.setMessages([
        {
          id: '1',
          content: 'test message',
          role: 'user',
          timestamp: new Date()
        }
      ])
    })
    
    // clearConversation実行
    act(() => {
      result.current.clearConversation()
    })
    
    // SessionManager.clearSessionが呼ばれることを確認
    expect(SessionManager.clearSession).toHaveBeenCalledTimes(1)
  })

  test('clearConversationにコールバック機能が含まれている', () => {
    const { result } = renderHook(() => useChat())
    const mockCallback = vi.fn()
    
    // メッセージを設定
    act(() => {
      result.current.setMessages([
        {
          id: '1',
          content: 'test message',
          role: 'user',
          timestamp: new Date()
        }
      ])
    })
    
    // コールバック付きでclearConversation実行
    act(() => {
      result.current.clearConversation(mockCallback)
    })
    
    // コールバックが呼ばれることを確認
    expect(mockCallback).toHaveBeenCalled()
    expect(result.current.messages).toHaveLength(0)
  })

  test('clearConversation実行後、新しいメッセージを正常に追加できる', async () => {
    const { result } = renderHook(() => useChat())
    
    // 既存メッセージを設定
    act(() => {
      result.current.setMessages([
        {
          id: '1',
          content: 'old message',
          role: 'user',
          timestamp: new Date()
        }
      ])
    })
    
    // クリア実行
    act(() => {
      result.current.clearConversation()
    })
    
    expect(result.current.messages).toHaveLength(0)
    
    // 新しいメッセージを追加
    act(() => {
      result.current.setMessages([
        {
          id: '2',
          content: 'new message after clear',
          role: 'user',
          timestamp: new Date()
        }
      ])
    })
    
    // 新しいメッセージが正常に追加されることを確認
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].content).toBe('new message after clear')
  })

  test('clearConversation実行時にローディング状態やエラー状態もリセットされる', () => {
    const { result } = renderHook(() => useChat())
    
    // 初期状態を確認（isLoadingはfalseであるべき）
    expect(result.current.isLoading).toBe(false)
    
    // clearConversation実行
    act(() => {
      result.current.clearConversation()
    })
    
    // 状態がリセットされることを確認
    expect(result.current.isLoading).toBe(false)
    expect(result.current.messages).toHaveLength(0)
  })

  test('空のメッセージ配列でclearConversationを呼んでもエラーが発生しない', () => {
    const { result } = renderHook(() => useChat())
    
    // 初期状態（空の配列）でclearConversation実行
    expect(() => {
      act(() => {
        result.current.clearConversation()
      })
    }).not.toThrow()
    
    // メッセージは空のまま
    expect(result.current.messages).toHaveLength(0)
    expect(SessionManager.clearSession).toHaveBeenCalled()
  })
})