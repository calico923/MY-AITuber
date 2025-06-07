import type { 
  Emotion, 
  ASDNTMode,
  ChatMessage 
} from '@asd-aituber/types'

export interface ChatMessageResponse {
  message: string
  emotion: Emotion
  internal_emotion: Emotion
  timestamp: string
}

export interface ChatHistoryResponse {
  messages: ChatMessage[]
}

export interface ClearHistoryResponse {
  success: boolean
  message: string
}

export interface EmotionAnalysisResponse {
  emotion: Emotion
  confidence: number
  scores: Record<string, number>
}

export interface HealthCheckResponse {
  status: string
  service: string
}

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Unknown API error')
    }
  }

  async sendMessage(
    content: string, 
    emotion: Emotion = 'neutral',
    mode?: ASDNTMode
  ): Promise<ChatMessageResponse> {
    const body: any = {
      content,
      emotion,
    }

    if (mode) {
      body.mode = mode
    }

    return this.request<ChatMessageResponse>('/api/v1/chat/message', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async getChatHistory(): Promise<ChatHistoryResponse> {
    return this.request<ChatHistoryResponse>('/api/v1/chat/history')
  }

  async clearChatHistory(): Promise<ClearHistoryResponse> {
    return this.request<ClearHistoryResponse>('/api/v1/chat/history', {
      method: 'DELETE',
    })
  }

  async analyzeEmotion(text: string): Promise<EmotionAnalysisResponse> {
    return this.request<EmotionAnalysisResponse>('/api/v1/chat/analyze-emotion', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/health')
  }
}