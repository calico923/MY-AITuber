import type { Emotion } from '@asd-aituber/types'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ASDSettings {
  mode: 'asd' | 'nt'
  directCommunication: boolean
  patternRecognition: boolean
  literalInterpretation: boolean
}

interface ChatResponse {
  message: string
  emotion: Emotion
  confidence: number
}

class OpenAIClient {
  private initialized = true // APIルート経由なので常に初期化済みとする

  constructor() {
    console.log('OpenAI client initialized (using API route)')
  }

  async generateResponse(
    messages: ChatMessage[],
    settings: ASDSettings
  ): Promise<ChatResponse> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          settings
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data: ChatResponse = await response.json()
      return data
    } catch (error) {
      console.error('OpenAI API error:', error)
      throw new Error('Failed to generate AI response')
    }
  }


  isInitialized(): boolean {
    return this.initialized
  }
}

// シングルトンインスタンス
const openaiClient = new OpenAIClient()

export { openaiClient, type ChatMessage, type ASDSettings, type ChatResponse }