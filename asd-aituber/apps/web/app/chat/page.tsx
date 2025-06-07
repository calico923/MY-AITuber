'use client'

import { useRef, useEffect, useState } from 'react'
import ChatPanel from '@/components/ChatPanel'
import { ModeToggle } from '@/components/ModeToggle'
import { useChat } from '@/hooks/useChat'
import VRMViewer from '@/components/VRMViewer'
import type { VRMViewerRef } from '@/components/VRMViewer'
import type { Emotion } from '@asd-aituber/types'

export default function ChatPage() {
  const { messages, isLoading, sendMessage, mode, changeMode } = useChat()
  const vrmViewerRef = useRef<VRMViewerRef>(null)
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // クライアントサイドでのみマウント
  useEffect(() => {
    setMounted(true)
  }, [])

  // 最新メッセージに基づいて感情を推定とリップシンク
  useEffect(() => {
    if (messages.length === 0) return

    const lastMessage = messages[messages.length - 1]
    
    if (lastMessage.role === 'assistant') {
      // assistantメッセージの感情を反映
      if (lastMessage.emotion) {
        setCurrentEmotion(lastMessage.emotion)
      }
      
      // リップシンク付きで話す
      const attemptLipSync = () => {
        if (vrmViewerRef.current) {
          vrmViewerRef.current.speakText(lastMessage.content, () => {
            setIsSpeaking(false)
            // 話し終わったら3秒後に表情をneutralに戻す
            setTimeout(() => {
              if (vrmViewerRef.current) {
                vrmViewerRef.current.setEmotion('neutral')
                setCurrentEmotion('neutral')
              }
            }, 3000)
          })
          setIsSpeaking(true)
        } else {
          // VRMViewerが利用できない場合のフォールバック
          setIsSpeaking(true)
          const speakingDuration = Math.max(1000, lastMessage.content.length * 50)
          setTimeout(() => {
            setIsSpeaking(false)
            // フォールバックでも3秒後に表情をリセット
            setTimeout(() => {
              setCurrentEmotion('neutral')
            }, 3000)
          }, speakingDuration)
        }
      }
      
      // VRMViewerの準備ができるまで少し待つ
      if (vrmViewerRef.current) {
        attemptLipSync()
      } else {
        setTimeout(attemptLipSync, 500)
      }
    }
  }, [messages])

  // ローディング状態に基づいて表情を更新
  useEffect(() => {
    if (isLoading) {
      setCurrentEmotion('neutral')
      setIsSpeaking(false)
      // 進行中のリップシンクを停止
      if (vrmViewerRef.current) {
        vrmViewerRef.current.stopSpeaking()
      }
    }
  }, [isLoading])

  return (
    <div className="flex h-screen">
      {/* VRM表示エリア */}
      <div className="flex-1 relative">
        {mounted ? (
          <VRMViewer 
            ref={vrmViewerRef}
            modelUrl="/models/MyAvatar01_20241125134913.vrm"
            emotion={currentEmotion}
            isSpeaking={isSpeaking}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div>Loading VRM Viewer...</div>
          </div>
        )}
      </div>
      
      {/* チャットエリア - VRMと同じ高さに固定 */}
      <div className="w-96 bg-gray-100 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b bg-white shrink-0">
          <h2 className="text-xl font-bold">ASD-AITuber Chat</h2>
          <div className="text-sm text-gray-500 mt-1">
            Mode: {mode} | Emotion: {currentEmotion}
          </div>
        </div>
        
        {/* モード切り替え */}
        <div className="p-4 bg-white border-b shrink-0">
          <ModeToggle 
            currentMode={mode}
            onModeChange={changeMode}
          />
        </div>
        
        {/* チャットパネル - 残りの高さを使用 */}
        <div className="flex-1 min-h-0 bg-white">
          <ChatPanel 
            messages={messages} 
            onSendMessage={sendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}