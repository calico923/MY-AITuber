import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useChat } from './useChat'
import type { ChatMessage } from '@asd-aituber/types'

describe('useChat hook', () => {
  it('should initialize with empty messages', () => {
    const { result } = renderHook(() => useChat())
    
    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('should add user message', () => {
    const { result } = renderHook(() => useChat())
    
    act(() => {
      result.current.sendMessage('Hello!')
    })
    
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0]).toMatchObject({
      role: 'user',
      content: 'Hello!',
      emotion: 'neutral',
    })
  })

  it('should set loading state when sending message', () => {
    const { result } = renderHook(() => useChat())
    
    act(() => {
      result.current.sendMessage('Test message')
    })
    
    expect(result.current.isLoading).toBe(true)
  })

  it('should handle assistant response', async () => {
    const { result } = renderHook(() => useChat())
    
    const mockResponse: ChatMessage = {
      id: '123',
      role: 'assistant',
      content: 'Hello! How can I help you?',
      timestamp: new Date(),
      emotion: 'joy',
    }
    
    act(() => {
      result.current.addMessage(mockResponse)
    })
    
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0]).toEqual(mockResponse)
  })

  it('should clear messages', () => {
    const { result } = renderHook(() => useChat())
    
    // Add some messages
    act(() => {
      result.current.sendMessage('Message 1')
      result.current.sendMessage('Message 2')
    })
    
    expect(result.current.messages).toHaveLength(2)
    
    // Clear messages
    act(() => {
      result.current.clearMessages()
    })
    
    expect(result.current.messages).toEqual([])
  })
})