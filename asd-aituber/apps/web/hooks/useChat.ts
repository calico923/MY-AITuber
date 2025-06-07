import { useState, useCallback } from 'react'
import type { ChatMessage } from '@asd-aituber/types'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback((content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      emotion: 'neutral',
    }
    
    setMessages(prev => [...prev, newMessage])
    setIsLoading(true)
    
    // TODO: Send to API and handle response
  }, [])

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
    setIsLoading(false)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    isLoading,
    sendMessage,
    addMessage,
    clearMessages,
  }
}