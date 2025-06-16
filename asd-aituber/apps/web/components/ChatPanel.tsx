'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import type { ChatMessage } from '@asd-aituber/types'
import VoiceInput from './VoiceInput'

interface ChatPanelProps {
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  isLoading?: boolean
  isVoiceDisabled?: boolean  // ✅ Task 1.2.2: 音声入力無効化用プロパティ追加
}

export default function ChatPanel({ messages, onSendMessage, isLoading = false, isVoiceDisabled = false }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('')
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  const handleVoiceTranscript = (transcript: string) => {
    if (transcript.trim() && !isLoading) {
      onSendMessage(transcript.trim())
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* メッセージエリア - 固定高さでスクロール */}
      <div className="flex-1 overflow-hidden">
        <div
          ref={messagesContainerRef}
          data-testid="messages-container"
          className="h-full overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              Start a conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.emotion && message.emotion !== 'neutral' && (
                    <span className="text-xs opacity-75 mt-1 block">
                      {getEmotionEmoji(message.emotion)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-800 p-3 rounded-lg">
                <p className="italic">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* 入力エリア - 固定位置 */}
      <div className="shrink-0 bg-white border-t">
        {/* 入力モード切り替え */}
        <div className="p-2 border-b">
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode('text')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                inputMode === 'text' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📝 テキスト
            </button>
            <button
              onClick={() => setInputMode('voice')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                inputMode === 'voice' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🎤 音声
            </button>
          </div>
        </div>

        {/* テキスト入力 */}
        {inputMode === 'text' && (
          <form onSubmit={handleSubmit} className="p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message..."
                disabled={isLoading}
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </form>
        )}

        {/* 音声入力 */}
        {inputMode === 'voice' && (
          <div className="p-4">
            <VoiceInput
              onTranscript={handleVoiceTranscript}
              isDisabled={isLoading}
              disabled={isVoiceDisabled}  // ✅ Task 1.2.2: 音声合成中のマイク無効化
              placeholder="マイクボタンを押して話してください..."
            />
          </div>
        )}
      </div>
    </div>
  )
}

function getEmotionEmoji(emotion: string): string {
  const emojiMap: Record<string, string> = {
    joy: '😊',
    anger: '😠',
    sadness: '😢',
    surprise: '😮',
    fear: '😨',
    disgust: '🤢',
    neutral: '😐',
  }
  return emojiMap[emotion] || ''
}