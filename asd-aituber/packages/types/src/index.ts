// Emotion types based on the six basic emotions + neutral
export type Emotion = 'joy' | 'anger' | 'sadness' | 'surprise' | 'fear' | 'disgust' | 'neutral'

// ASD/NT mode types
export type ASDNTMode = 'ASD' | 'NT'

// Message roles
export type MessageRole = 'user' | 'assistant' | 'system'

// Chat message interface
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  emotion?: Emotion
  // For NT mode: internal emotion might differ from expressed emotion
  internalEmotion?: Emotion
}

// VRM Animation interface
export interface VRMAnimation {
  name: string
  emotion: Emotion
  duration: number
  loop: boolean
}

// Emotion state interface
export interface EmotionState {
  current: Emotion
  intensity: number // 0-1
  internal: Emotion // Internal emotion (shown in ASD mode)
  expressed: Emotion // Expressed emotion (may differ in NT mode)
}

// System state interface
export interface SystemState {
  mode: ASDNTMode
  emotion: EmotionState
  isConnected: boolean
  isLoading: boolean
}

// WebSocket event types
export interface WebSocketEvents {
  'message:send': {
    content: string
    emotion?: Emotion
  }
  'message:receive': {
    message: ChatMessage
  }
  'emotion:update': {
    state: EmotionState
  }
  'mode:change': {
    mode: ASDNTMode
  }
  'connection:status': {
    connected: boolean
  }
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Chat response from API
export interface ChatResponse {
  message: string
  emotion: Emotion
  internalEmotion?: Emotion
  animations?: VRMAnimation[]
}

// Scenario interface for learning system
export interface Scenario {
  id: string
  title: string
  description: string
  mode: ASDNTMode
  dialogues: ScenarioDialogue[]
  tags: string[]
}

export interface ScenarioDialogue {
  speaker: 'user' | 'assistant'
  content: string
  emotion: Emotion
  internalEmotion?: Emotion
  explanation?: string // Explanation of communication pattern
}