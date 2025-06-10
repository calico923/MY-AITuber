'use client'

import { useRef, useEffect, useState } from 'react'
import ChatPanel from '@/components/ChatPanel'
import { ModeToggle } from '@/components/ModeToggle'
import { useChat } from '@/hooks/useChat'
import VRMViewer from '@/components/VRMViewer'
import type { VRMViewerRef } from '@/components/VRMViewer'
import type { Emotion } from '@asd-aituber/types'
import { useSimpleUnifiedVoice } from '@/hooks/useUnifiedVoiceSynthesis'
import type { VoicevoxAudioQuery } from '@/lib/voicevox-client'
// Removed direct import to avoid webpack chunk issues
// import { LipSync } from '@/lib/lip-sync'

export default function ChatPage() {
  const { messages, isLoading, sendMessage, mode, changeMode } = useChat()
  const vrmViewerRef = useRef<VRMViewerRef>(null)
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [mounted, setMounted] = useState(false)
  // Priority 1: 処理済みメッセージIDを追跡して重複音声再生を防ぐ
  const [processedMessageIds, setProcessedMessageIds] = useState(new Set<string>())
  const [isInitialized, setIsInitialized] = useState(false) // 初期化フラグ
  // Priority 2: 音声とリップシンクの同期のための状態変数
  const [currentAudioQuery, setCurrentAudioQuery] = useState<any>(null)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  
  
  // 音声合成機能（✅ AudioLipSync方式に更新）
  const { speak: speakText, stop: stopSpeech, isSpeaking: isVoiceSpeaking, currentEngine } = useSimpleUnifiedVoice({
    preferredEngine: 'auto', // VOICEVOXが利用可能なら自動選択
    defaultMode: mode === 'ASD' ? 'asd' : 'nt', // チャットモードと連動
    volume: 0.8,
    // ✅ AudioLipSync方式: AudioBufferを直接VRMに渡す
    onAudioBufferReady: (audioBuffer: ArrayBuffer) => {
      console.log('[ChatPage] ✅ AudioBuffer received for AudioLipSync')
      if (vrmViewerRef.current?.playAudioWithLipSync) {
        vrmViewerRef.current.playAudioWithLipSync(audioBuffer)
      }
    }
  })
  
  // クライアントサイドでのみマウント
  useEffect(() => {
    setMounted(true)
  }, [])

  // Priority 1: 初回ロード時に既存メッセージを全て処理済みとしてマーク
  useEffect(() => {
    if (!isInitialized) {
      console.log('[ChatPage] 初期化開始: 既存メッセージをチェック')
      if (messages.length > 0) {
        console.log('[ChatPage] 既存メッセージが見つかりました。処理済みとしてマーク')
        const existingIds = new Set(messages.map(msg => msg.id))
        setProcessedMessageIds(existingIds)
        console.log(`[ChatPage] 処理済みとしてマークしたメッセージ数: ${existingIds.size}`)
      } else {
        console.log('[ChatPage] 既存メッセージはありません')
      }
      setIsInitialized(true)
      console.log('[ChatPage] 初期化完了')
    }
  }, [messages, isInitialized])

  // ✅ 古い複雑な同期処理は削除 - AudioLipSync方式では不要

  // 最新メッセージに基づいて感情を推定とリップシンク
  useEffect(() => {
    // 初期化が完了するまで待つ
    if (!isInitialized) {
      console.log('[ChatPage] 初期化が完了していません。メッセージ処理をスキップします。')
      return
    }
    
    if (messages.length === 0) return

    const lastMessage = messages[messages.length - 1]
    console.log('[ChatPage] ===== 新しいメッセージ検出 =====')
    console.log('[ChatPage] 初期化済み:', isInitialized)
    console.log('[ChatPage] Role:', lastMessage.role)
    console.log('[ChatPage] Content:', lastMessage.content)
    console.log('[ChatPage] Emotion:', lastMessage.emotion)
    console.log('[ChatPage] Message ID:', lastMessage.id)
    console.log('[ChatPage] 処理済みIDの数:', processedMessageIds.size)
    
    // Priority 1: 処理済みメッセージのチェック
    if (processedMessageIds.has(lastMessage.id)) {
      console.log('[ChatPage] このメッセージは既に処理済みです。音声再生をスキップします。')
      return
    }
    
    // 新しいアシスタントメッセージかどうかを確認
    if (lastMessage.role === 'assistant') {
      console.log('[ChatPage] 新しいアシスタントメッセージを検出しました。音声合成を開始します。')
      // assistantメッセージの感情を反映
      if (lastMessage.emotion) {
        setCurrentEmotion(lastMessage.emotion)
      }
      
      // Priority 1: メッセージを処理済みとしてマーク
      setProcessedMessageIds(prev => new Set(prev).add(lastMessage.id))
      console.log('[ChatPage] メッセージIDを処理済みとしてマークしました:', lastMessage.id)
      
      // Priority 2: 音声合成のみを開始（リップシンクは別のuseEffectで同期実行）
      const startVoiceSynthesis = async () => {
        console.log('[ChatPage] Priority 2: 音声合成を開始します')
        
        // 既存の音声を停止
        stopSpeech()
        
        // 表情を設定
        setIsSpeaking(true)
        
        // タイムアウト処理: 5秒以内にリップシンクデータが来なければフォールバック
        const fallbackTimeout = setTimeout(() => {
          console.warn('[ChatPage] VOICEVOX データ取得タイムアウト。フォールバック処理を実行します')
          if (vrmViewerRef.current) {
            vrmViewerRef.current.speakText(lastMessage.content, () => {
              console.log('[ChatPage] フォールバック リップシンク完了')
              setIsSpeaking(false)
            })
          }
        }, 5000)
        
        // 音声合成を実行（コールバックでリップシンクデータと音声要素を受け取る）
        try {
          await speakText(lastMessage.content, {
            emotion: lastMessage.emotion || 'neutral',
            mode: mode === 'ASD' ? 'asd' : 'nt',
            callbacks: {
              onStart: () => {
                console.log('[ChatPage] Voice synthesis started')
                clearTimeout(fallbackTimeout) // 成功したらタイムアウトをクリア
              },
              onEnd: () => {
                console.log('[ChatPage] Voice synthesis ended')
                clearTimeout(fallbackTimeout)
                setIsSpeaking(false)
                // 話し終わったら3秒後に表情をneutralに戻す
                setTimeout(() => {
                  if (vrmViewerRef.current) {
                    vrmViewerRef.current.setEmotion('neutral')
                    setCurrentEmotion('neutral')
                  }
                }, 3000)
              },
              onError: (error) => {
                console.error('[ChatPage] Speech synthesis error:', error)
                clearTimeout(fallbackTimeout)
                setIsSpeaking(false)
                // エラー時もフォールバック実行
                if (vrmViewerRef.current) {
                  vrmViewerRef.current.speakText(lastMessage.content, () => {
                    console.log('[ChatPage] エラー時フォールバック リップシンク完了')
                    setIsSpeaking(false)
                  })
                }
              }
            }
          })
        } catch (error) {
          console.error('[ChatPage] Voice synthesis failed:', error)
          clearTimeout(fallbackTimeout)
          setIsSpeaking(false)
          // 例外時もフォールバック実行
          if (vrmViewerRef.current) {
            vrmViewerRef.current.speakText(lastMessage.content, () => {
              console.log('[ChatPage] 例外時フォールバック リップシンク完了')
              setIsSpeaking(false)
            })
          }
        }
      }
      
      // 音声合成を開始
      startVoiceSynthesis()
    } else {
      console.log('[ChatPage] Not an assistant message, skipping voice synthesis')
    }
  }, [messages, processedMessageIds, isInitialized])


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