import { ChatMessage } from '@/../../packages/types/src/index'

describe('Message Type Definition', () => {
  test('ChatMessageインターフェースにセッション関連フラグが存在する', () => {
    const message: ChatMessage = {
      id: '1',
      content: 'test',
      role: 'user',
      timestamp: new Date(),
      isFromSession: true,
      hasBeenSpoken: false
    }
    
    expect(message.isFromSession).toBeDefined()
    expect(message.hasBeenSpoken).toBeDefined()
    expect(typeof message.isFromSession).toBe('boolean')
    expect(typeof message.hasBeenSpoken).toBe('boolean')
  })

  test('セッション関連フラグはオプショナルである', () => {
    const messageWithoutFlags: ChatMessage = {
      id: '2', 
      content: 'test without flags',
      role: 'assistant',
      timestamp: new Date()
    }
    
    expect(messageWithoutFlags).toBeDefined()
    expect(messageWithoutFlags.isFromSession).toBeUndefined()
    expect(messageWithoutFlags.hasBeenSpoken).toBeUndefined()
  })

  test('isFromSession=trueの場合、復元されたメッセージを示す', () => {
    const sessionMessage: ChatMessage = {
      id: '3',
      content: 'restored from session',
      role: 'assistant', 
      timestamp: new Date(),
      isFromSession: true,
      hasBeenSpoken: true
    }
    
    expect(sessionMessage.isFromSession).toBe(true)
    expect(sessionMessage.hasBeenSpoken).toBe(true)
  })

  test('新規メッセージはデフォルトでisFromSession=falseとして扱われる', () => {
    const newMessage: ChatMessage = {
      id: '4',
      content: 'new message',
      role: 'user',
      timestamp: new Date(),
      isFromSession: false,
      hasBeenSpoken: false
    }
    
    expect(newMessage.isFromSession).toBe(false)
    expect(newMessage.hasBeenSpoken).toBe(false)
  })
})