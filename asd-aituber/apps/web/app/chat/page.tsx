'use client'

import { useRef, useEffect, useState } from 'react'
import ChatPanel from '@/components/ChatPanel'
import { ModeToggle } from '@/components/ModeToggle'
import { useChat } from '@/hooks/useChat'
import VRMViewer from '@/components/VRMViewer'
import type { VRMViewerRef } from '@/components/VRMViewer'
import type { Emotion } from '@asd-aituber/types'
import { useSimpleUnifiedVoice } from '@/hooks/useUnifiedVoiceSynthesis'

export default function ChatPage() {
  const { messages, isLoading, sendMessage, mode, changeMode } = useChat()
  const vrmViewerRef = useRef<VRMViewerRef>(null)
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // 音声合成機能（VOICEVOX統合）
  const { speak: speakText, stop: stopSpeech, isSpeaking: isVoiceSpeaking, currentEngine } = useSimpleUnifiedVoice({
    preferredEngine: 'auto', // VOICEVOXが利用可能なら自動選択
    defaultMode: mode === 'asd' ? 'asd' : 'nt', // チャットモードと連動
    volume: 0.8,
    callbacks: {} // コールバックは speak 時に個別に設定
  })
  
  // クライアントサイドでのみマウント
  useEffect(() => {
    setMounted(true)
  }, [])

  // 最新メッセージに基づいて感情を推定とリップシンク
  useEffect(() => {
    if (messages.length === 0) return

    const lastMessage = messages[messages.length - 1]
    console.log('[ChatPage] ===== 新しいメッセージ検出 =====')
    console.log('[ChatPage] Role:', lastMessage.role)
    console.log('[ChatPage] Content:', lastMessage.content)
    console.log('[ChatPage] Emotion:', lastMessage.emotion)
    
    if (lastMessage.role === 'assistant') {
      console.log('[ChatPage] アシスタントメッセージのため、音声合成を開始します')
      // assistantメッセージの感情を反映
      if (lastMessage.emotion) {
        setCurrentEmotion(lastMessage.emotion)
      }
      
      // 音声合成とリップシンク
      const speakWithLipSync = async () => {
        console.log('[ChatPage] Starting speakWithLipSync')
        console.log('[ChatPage] Message content:', lastMessage.content)
        console.log('[ChatPage] Current engine:', currentEngine)
        
        // 既存の音声を停止
        stopSpeech()
        
        // VRMリップシンクを開始
        if (vrmViewerRef.current) {
          console.log('[ChatPage] VRMViewer is available')
          setIsSpeaking(true)
          
          // 先にリップシンクを開始
          console.log('[ChatPage] Starting VRM lip sync first')
          if (vrmViewerRef.current.speakText) {
            vrmViewerRef.current.speakText(lastMessage.content, () => {
              console.log('[ChatPage] VRM lip sync completed')
            })
          }
          
          // 音声合成で話す（感情とモードを考慮）
          console.log('[ChatPage] Starting voice synthesis with options:', {
            emotion: lastMessage.emotion || 'neutral',
            mode: mode === 'asd' ? 'asd' : 'nt'
          })
          
          await speakText(lastMessage.content, {
            emotion: lastMessage.emotion || 'neutral',
            mode: mode === 'asd' ? 'asd' : 'nt',
            callbacks: {
              onStart: () => {
                console.log('[ChatPage] Voice synthesis started callback triggered')
              },
              onEnd: () => {
                console.log('[ChatPage] Voice synthesis ended callback triggered')
                console.log('[ChatPage] ===== 音声会話完了 =====')
                setIsSpeaking(false)
                // 話し終わったら3秒後に表情をneutralに戻す
                setTimeout(() => {
                  if (vrmViewerRef.current) {
                    console.log('[ChatPage] Resetting emotion to neutral')
                    vrmViewerRef.current.setEmotion('neutral')
                    setCurrentEmotion('neutral')
                  }
                }, 3000)
              },
              onError: (error) => {
                console.error('[ChatPage] Speech synthesis error:', error)
                setIsSpeaking(false)
              }
            }
          })
        } else {
          console.log('[ChatPage] VRMViewer not available, playing voice only')
          // VRMViewerが利用できない場合は音声のみ再生
          await speakText(lastMessage.content, {
            emotion: lastMessage.emotion || 'neutral',
            mode: mode === 'asd' ? 'asd' : 'nt',
            callbacks: {
              onStart: () => {
                console.log('[ChatPage] Voice-only: synthesis started')
                setIsSpeaking(true)
              },
              onEnd: () => {
                console.log('[ChatPage] Voice-only: synthesis ended')
                setIsSpeaking(false)
                setTimeout(() => setCurrentEmotion('neutral'), 3000)
              }
            }
          })
        }
      }
      
      // VRMViewerの準備ができるまで少し待つ
      if (vrmViewerRef.current) {
        console.log('[ChatPage] VRMViewer is ready, executing speakWithLipSync immediately')
        speakWithLipSync()
      } else {
        console.log('[ChatPage] VRMViewer not ready, waiting 500ms')
        setTimeout(speakWithLipSync, 500)
      }
    } else {
      console.log('[ChatPage] Not an assistant message, skipping voice synthesis')
    }
  }, [messages])

  // ローディング状態に基づいて表情を更新
  useEffect(() => {
    if (isLoading) {
      setCurrentEmotion('neutral')
      setIsSpeaking(false)
      // 進行中の音声合成を停止
      stopSpeech()
      // 進行中のリップシンクを停止
      if (vrmViewerRef.current) {
        vrmViewerRef.current.stopSpeaking()
      }
    }
  }, [isLoading, stopSpeech])

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
            {(isSpeaking || isVoiceSpeaking) && ` | 🔊 Speaking (${currentEngine})`}
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