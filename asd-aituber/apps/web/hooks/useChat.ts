import { useState, useCallback, useEffect } from 'react'
import type { ChatMessage, ASDNTMode, Emotion } from '@asd-aituber/types'
import { ApiClient } from '../lib/api-client'
import { openaiClient, type ChatMessage as OpenAIMessage, type ASDSettings } from '../lib/openai-client'
import { SessionManager } from '../lib/session-manager'

const apiClient = new ApiClient()

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<ASDNTMode>('ASD')
  
  // セッションからデータを読み込み
  useEffect(() => {
    const session = SessionManager.loadSession()
    if (session) {
      setMessages(session.messages)
      setMode(session.preferences.mode)
      console.log('Session loaded:', session.sessionId)
    }
  }, [])

  const sendMessage = useCallback(async (content: string, emotion: Emotion = 'neutral') => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      emotion,
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    
    try {
      let assistantMessage: ChatMessage

      // OpenAI統合が利用可能かチェック
      if (openaiClient.isInitialized()) {
        console.log('Using OpenAI integration for response generation')
        // OpenAI直接統合を使用
        const asdSettings: ASDSettings = {
          mode: mode.toLowerCase() as 'asd' | 'nt',
          directCommunication: mode === 'ASD',
          patternRecognition: mode === 'ASD',
          literalInterpretation: mode === 'ASD'
        }

        // メッセージ履歴をOpenAI形式に変換
        const openaiMessages: OpenAIMessage[] = messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
        openaiMessages.push({ role: 'user', content })

        console.log('Sending request to OpenAI with settings:', asdSettings)
        const response = await openaiClient.generateResponse(openaiMessages, asdSettings)
        console.log('Received response from OpenAI:', response)
        
        assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
          emotion: response.emotion,
          internalEmotion: response.emotion, // OpenAI統合では内部感情も同じに設定
        }
      } else {
        // フォールバック: 従来のAPIクライアント
        const response = await apiClient.sendMessage(content, emotion, mode)
        
        assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date(response.timestamp),
          emotion: response.emotion,
          internalEmotion: response.internal_emotion,
        }
      }
      
      const newMessages = [...messages, userMessage, assistantMessage]
      setMessages(newMessages)
      
      // セッションに保存
      SessionManager.saveSession({
        messages: newMessages,
        preferences: { mode }
      })
      
      // 感情履歴に追加
      if (assistantMessage.emotion) {
        SessionManager.addEmotionToHistory(assistantMessage.emotion)
      }
      
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
        emotion: 'neutral',
      }
      const newMessages = [...messages, userMessage, errorMessage]
      setMessages(newMessages)
      
      // エラー時もセッションに保存
      SessionManager.saveSession({
        messages: newMessages,
        preferences: { mode }
      })
    } finally {
      setIsLoading(false)
    }
  }, [mode, messages])

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message])
    setIsLoading(false)
  }, [])

  const clearMessages = useCallback(async () => {
    try {
      await apiClient.clearChatHistory()
      setMessages([])
      SessionManager.clearSession()
      console.log('Session cleared')
    } catch (error) {
      console.error('Failed to clear chat history:', error)
    }
  }, [])

  const changeMode = useCallback((newMode: ASDNTMode) => {
    setMode(newMode)
    
    // モード変更をセッションに保存
    const session = SessionManager.loadSession()
    if (session) {
      SessionManager.saveSession({
        ...session,
        preferences: { ...session.preferences, mode: newMode }
      })
    }
  }, [])

  const loadChatHistory = useCallback(async () => {
    try {
      const response = await apiClient.getChatHistory()
      setMessages(response.messages)
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }, [])

  return {
    messages,
    isLoading,
    mode,
    sendMessage,
    addMessage,
    clearMessages,
    changeMode,
    loadChatHistory,
  }
}