import { vi, describe, test, expect, beforeEach } from 'vitest'
import type { ChatMessage } from '../../../../packages/types/src/index'
import { shouldSynthesizeMessage, getSynthesisSkipReason } from '@/lib/speech-message-filter'

describe('Speech Synthesis - Session Message Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('isFromSessionフラグがtrueのメッセージは音声合成判定がfalse', () => {
    const sessionMessage: ChatMessage = {
      id: '1',
      content: 'セッションから復元されたメッセージ',
      role: 'assistant',
      timestamp: new Date(),
      isFromSession: true,
      hasBeenSpoken: true
    }
    
    expect(shouldSynthesizeMessage(sessionMessage)).toBe(false)
  })

  test('新規メッセージ（isFromSession=false）は音声合成判定がtrue', () => {
    const newMessage: ChatMessage = {
      id: '2',
      content: '新規メッセージです',
      role: 'assistant',
      timestamp: new Date(),
      isFromSession: false,
      hasBeenSpoken: false
    }
    
    expect(shouldSynthesizeMessage(newMessage)).toBe(true)
  })

  test('isFromSessionフラグが未定義（undefined）の新規メッセージは音声合成判定がtrue', () => {
    const newMessage: ChatMessage = {
      id: '3',
      content: 'フラグ未定義のメッセージ',
      role: 'assistant',
      timestamp: new Date()
      // isFromSession and hasBeenSpoken are undefined
    }
    
    expect(shouldSynthesizeMessage(newMessage)).toBe(true)
  })

  test('hasBeenSpokenフラグがtrueのメッセージは音声合成判定がfalse', () => {
    const spokenMessage: ChatMessage = {
      id: '4',
      content: '既に話されたメッセージ',
      role: 'assistant',
      timestamp: new Date(),
      isFromSession: false,
      hasBeenSpoken: true
    }
    
    expect(shouldSynthesizeMessage(spokenMessage)).toBe(false)
  })

  test('userロールのメッセージは音声合成判定がfalse', () => {
    const userMessage: ChatMessage = {
      id: '5',
      content: 'ユーザーのメッセージ',
      role: 'user',
      timestamp: new Date(),
      isFromSession: false,
      hasBeenSpoken: false
    }
    
    expect(shouldSynthesizeMessage(userMessage)).toBe(false)
  })

  test('getSynthesisSkipReason - セッションメッセージの場合', () => {
    const sessionMessage: ChatMessage = {
      id: '1',
      content: 'セッションメッセージ',
      role: 'assistant',
      timestamp: new Date(),
      isFromSession: true,
      hasBeenSpoken: true
    }
    
    expect(getSynthesisSkipReason(sessionMessage)).toBe('Message is from session (isFromSession=true)')
  })

  test('getSynthesisSkipReason - 音声合成すべきメッセージの場合はnull', () => {
    const newMessage: ChatMessage = {
      id: '2',
      content: '新規メッセージ',
      role: 'assistant',
      timestamp: new Date(),
      isFromSession: false,
      hasBeenSpoken: false
    }
    
    expect(getSynthesisSkipReason(newMessage)).toBeNull()
  })
})