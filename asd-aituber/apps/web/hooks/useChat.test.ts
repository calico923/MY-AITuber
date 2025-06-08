import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useChat } from './useChat'
import type { ChatMessageResponse, ChatHistoryResponse } from '../lib/api-client'

// Mock the ApiClient
vi.mock('../lib/api-client', () => ({
  ApiClient: vi.fn().mockImplementation(() => ({
    sendMessage: vi.fn(),
    clearChatHistory: vi.fn(),
    getChatHistory: vi.fn(),
  })),
}))

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should initialize with empty messages and ASD mode', () => {
    const { result } = renderHook(() => useChat())

    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.mode).toBe('ASD')
  })

  it('should send message with correct state updates', async () => {
    const { result } = renderHook(() => useChat())

    // Send a message
    await act(async () => {
      await result.current.sendMessage('Hello')
    })

    // Should have user message + error message (since API is mocked and returns undefined)
    expect(result.current.messages).toHaveLength(2)
    expect(result.current.messages[0].role).toBe('user')
    expect(result.current.messages[0].content).toBe('Hello')
    expect(result.current.messages[0].emotion).toBe('neutral')
    expect(result.current.messages[1].role).toBe('assistant')
    expect(result.current.messages[1].content).toBe('エラーが発生しました。もう一度お試しください。')
    expect(result.current.isLoading).toBe(false)
  })

  it('should change mode correctly', () => {
    const { result } = renderHook(() => useChat())

    act(() => {
      result.current.changeMode('NT')
    })

    expect(result.current.mode).toBe('NT')
  })

  it('should add message manually', () => {
    const { result } = renderHook(() => useChat())

    const testMessage = {
      id: '1',
      role: 'assistant' as const,
      content: 'Test response',
      timestamp: new Date(),
      emotion: 'joy' as const,
      internal_emotion: 'joy' as const,
    }

    act(() => {
      result.current.addMessage(testMessage)
    })

    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0]).toEqual(testMessage)
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle emotions correctly in sendMessage', async () => {
    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('Happy message', 'joy')
    })

    expect(result.current.messages[0].emotion).toBe('joy')
    expect(result.current.messages).toHaveLength(2) // User message + error message
  })
})