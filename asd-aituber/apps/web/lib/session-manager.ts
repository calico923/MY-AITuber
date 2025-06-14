import type { ChatMessage, ASDNTMode } from '@asd-aituber/types'

interface SessionData {
  sessionId: string
  userId?: string
  messages: ChatMessage[]
  preferences: {
    mode: ASDNTMode
    voiceSettings?: {
      speed: number
      pitch: number
      volume: number
    }
    avatarSettings?: {
      modelUrl?: string
      cameraPosition?: [number, number, number]
    }
  }
  metadata: {
    createdAt: Date
    lastActiveAt: Date
    messageCount: number
    emotionHistory: Array<{
      emotion: string
      timestamp: Date
    }>
  }
}

export class SessionManager {
  private static readonly SESSION_KEY = 'asd-aituber-session'
  private static readonly SESSION_ID_KEY = 'asd-aituber-session-id'
  
  /**
   * セッションIDを生成または取得
   */
  static getSessionId(): string {
    if (typeof window === 'undefined') return 'server-session'
    
    let sessionId = sessionStorage.getItem(this.SESSION_ID_KEY)
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem(this.SESSION_ID_KEY, sessionId)
    }
    return sessionId
  }

  /**
   * セッションデータを保存
   */
  static saveSession(data: Partial<SessionData>): void {
    if (typeof window === 'undefined') return
    
    const sessionId = this.getSessionId()
    const existingData = this.loadSession()
    
    const updatedData: SessionData = {
      sessionId,
      messages: data.messages || existingData?.messages || [],
      preferences: {
        mode: 'ASD' as ASDNTMode, // Default mode
        ...existingData?.preferences,
        ...data.preferences
      },
      metadata: {
        createdAt: existingData?.metadata.createdAt || new Date(),
        lastActiveAt: new Date(),
        messageCount: data.messages?.length || existingData?.metadata.messageCount || 0,
        emotionHistory: existingData?.metadata.emotionHistory || []
      }
    }
    
    // LocalStorageに保存（後でDBに移行可能）
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(updatedData))
  }

  /**
   * セッションデータを読み込み
   */
  static loadSession(): SessionData | null {
    if (typeof window === 'undefined') return null
    
    try {
      const data = localStorage.getItem(this.SESSION_KEY)
      if (!data) return null
      
      const parsed = JSON.parse(data)
      // 日付文字列をDateオブジェクトに変換
      if (parsed.messages) {
        parsed.messages = parsed.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          // 復元されたメッセージにセッション関連フラグを付与
          isFromSession: true,
          hasBeenSpoken: true
        }))
      }
      if (parsed.metadata) {
        parsed.metadata.createdAt = new Date(parsed.metadata.createdAt)
        parsed.metadata.lastActiveAt = new Date(parsed.metadata.lastActiveAt)
      }
      
      return parsed
    } catch (error) {
      console.error('Failed to load session:', error)
      return null
    }
  }

  /**
   * セッションをクリア
   */
  static clearSession(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem(this.SESSION_KEY)
    sessionStorage.removeItem(this.SESSION_ID_KEY)
  }

  /**
   * 会話履歴をエクスポート
   */
  static exportSession(): string {
    const session = this.loadSession()
    if (!session) return '{}'
    
    return JSON.stringify(session, null, 2)
  }

  /**
   * 会話履歴をインポート
   */
  static importSession(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData)
      this.saveSession(data)
      return true
    } catch (error) {
      console.error('Failed to import session:', error)
      return false
    }
  }

  /**
   * 感情履歴を追加
   */
  static addEmotionToHistory(emotion: string): void {
    const session = this.loadSession()
    if (!session) return
    
    const emotionEntry = {
      emotion,
      timestamp: new Date()
    }
    
    session.metadata.emotionHistory.push(emotionEntry)
    
    // 最新100件のみ保持
    if (session.metadata.emotionHistory.length > 100) {
      session.metadata.emotionHistory = session.metadata.emotionHistory.slice(-100)
    }
    
    this.saveSession(session)
  }

  /**
   * ユーザーIDを設定（将来の認証システム用）
   */
  static setUserId(userId: string): void {
    const session = this.loadSession()
    if (!session) return
    
    session.userId = userId
    this.saveSession(session)
  }
}