import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { ChatMessage } from '@asd-aituber/types'
import { ApiClient } from './api-client'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ApiClient', () => {
  let apiClient: ApiClient

  beforeEach(() => {
    apiClient = new ApiClient('http://localhost:8000')
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockResponse = {
        message: 'Hello! How can I help you?',
        emotion: 'joy',
        internal_emotion: 'joy',
        timestamp: new Date().toISOString(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await apiClient.sendMessage('Hello!', 'neutral')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/chat/message',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: 'Hello!',
            emotion: 'neutral',
          }),
        }
      )

      expect(result).toEqual(mockResponse)
    })

    it('should send message with ASD mode', async () => {
      const mockResponse = {
        message: 'I understand you said: "Hello". How can I help you?',
        emotion: 'neutral',
        internal_emotion: 'neutral',
        timestamp: new Date().toISOString(),
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await apiClient.sendMessage('Hello!', 'neutral', 'ASD')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/chat/message',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: 'Hello!',
            emotion: 'neutral',
            mode: 'ASD',
          }),
        }
      )

      expect(result.emotion).toBe(result.internal_emotion) // Same in ASD mode
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(
        apiClient.sendMessage('Hello!', 'neutral')
      ).rejects.toThrow('API request failed: 500 Internal Server Error')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        apiClient.sendMessage('Hello!', 'neutral')
      ).rejects.toThrow('Network error')
    })
  })

  describe('getChatHistory', () => {
    it('should get chat history successfully', async () => {
      const mockHistory = {
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Hello',
            timestamp: new Date().toISOString(),
            emotion: 'neutral',
          },
          {
            id: '2',
            role: 'assistant',
            content: 'Hi there!',
            timestamp: new Date().toISOString(),
            emotion: 'joy',
            internal_emotion: 'joy',
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHistory),
      })

      const result = await apiClient.getChatHistory()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/chat/history',
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      expect(result.messages).toHaveLength(2)
      expect(result.messages[0].role).toBe('user')
      expect(result.messages[1].role).toBe('assistant')
    })
  })

  describe('clearChatHistory', () => {
    it('should clear chat history successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Chat history cleared',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await apiClient.clearChatHistory()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/chat/history',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      expect(result.success).toBe(true)
    })
  })

  describe('analyzeEmotion', () => {
    it('should analyze emotion successfully', async () => {
      const mockResponse = {
        emotion: 'joy',
        confidence: 0.85,
        scores: {
          joy: 0.85,
          sadness: 0.05,
          anger: 0.03,
          fear: 0.02,
          surprise: 0.03,
          disgust: 0.02,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await apiClient.analyzeEmotion('I am so happy today!')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/chat/analyze-emotion',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: 'I am so happy today!',
          }),
        }
      )

      expect(result.emotion).toBe('joy')
      expect(result.confidence).toBe(0.85)
    })
  })

  describe('healthCheck', () => {
    it('should check API health', async () => {
      const mockResponse = {
        status: 'healthy',
        service: 'asd-aituber-api',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await apiClient.healthCheck()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/health',
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      expect(result.status).toBe('healthy')
    })
  })
})