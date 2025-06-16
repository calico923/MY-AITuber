import { SessionManager } from '@/lib/session-manager'
import type { ChatMessage } from '@asd-aituber/types'

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

describe('SessionManager.loadSession', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  test('復元されたメッセージにisFromSessionフラグが付与される', () => {
    // セッションデータを保存
    const originalMessages: ChatMessage[] = [
      { 
        id: '1', 
        content: 'test message', 
        role: 'assistant',
        timestamp: new Date()
      }
    ]
    
    // SessionManagerを使って保存
    SessionManager.saveSession({
      messages: originalMessages
    })
    
    // 読み込み
    const session = SessionManager.loadSession()
    
    expect(session).not.toBeNull()
    expect(session!.messages).toHaveLength(1)
    expect(session!.messages[0].isFromSession).toBe(true)
    expect(session!.messages[0].hasBeenSpoken).toBe(true)
  })

  test('複数のメッセージ全てにフラグが付与される', () => {
    const originalMessages: ChatMessage[] = [
      { 
        id: '1', 
        content: 'user message', 
        role: 'user',
        timestamp: new Date()
      },
      { 
        id: '2', 
        content: 'assistant response', 
        role: 'assistant',
        timestamp: new Date(),
        emotion: 'joy'
      },
      { 
        id: '3', 
        content: 'another user message', 
        role: 'user',
        timestamp: new Date()
      }
    ]
    
    SessionManager.saveSession({
      messages: originalMessages
    })
    
    const session = SessionManager.loadSession()
    
    expect(session).not.toBeNull()
    expect(session!.messages).toHaveLength(3)
    
    // 全てのメッセージにフラグが付与されていることを確認
    session!.messages.forEach((message, index) => {
      expect(message.isFromSession).toBe(true)
      expect(message.hasBeenSpoken).toBe(true)
      expect(message.id).toBe(originalMessages[index].id)
      expect(message.content).toBe(originalMessages[index].content)
    })
  })

  test('既存のセッションデータとの互換性を維持する', () => {
    // 古い形式のデータ（フラグなし）を直接localStorageに保存
    const oldFormatData = {
      sessionId: 'test-session',
      messages: [
        {
          id: '1',
          content: 'old format message',
          role: 'assistant',
          timestamp: new Date().toISOString()
        }
      ],
      preferences: {
        mode: 'ASD'
      },
      metadata: {
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        messageCount: 1,
        emotionHistory: []
      }
    }
    
    localStorage.setItem('asd-aituber-session', JSON.stringify(oldFormatData))
    
    // 読み込み
    const session = SessionManager.loadSession()
    
    expect(session).not.toBeNull()
    expect(session!.messages).toHaveLength(1)
    // 古いデータでもフラグが付与されることを確認
    expect(session!.messages[0].isFromSession).toBe(true)
    expect(session!.messages[0].hasBeenSpoken).toBe(true)
  })

  test('セッションデータが存在しない場合はnullを返す', () => {
    const session = SessionManager.loadSession()
    expect(session).toBeNull()
  })

  test('無効なJSONの場合はnullを返し、エラーをログに出力する', () => {
    localStorage.setItem('asd-aituber-session', 'invalid json')
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    const session = SessionManager.loadSession()
    
    expect(session).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load session:', expect.any(Error))
    
    consoleSpy.mockRestore()
  })
})