'use client'

import dynamic from 'next/dynamic'
import ChatPanel from '@/components/ChatPanel'
import { useChat } from '@/hooks/useChat'

const VRMViewer = dynamic(() => import('@/components/VRMViewer'), {
  ssr: false,
})

export default function ChatPage() {
  const { messages, isLoading, sendMessage } = useChat()

  return (
    <div className="flex h-screen">
      <div className="flex-1 relative">
        <VRMViewer modelUrl="/models/MyAvatar01_20241125134913.vrm" />
      </div>
      <div className="w-96 bg-gray-100">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b bg-white">
            <h2 className="text-xl font-bold">ASD-AITuber Chat</h2>
          </div>
          <div className="flex-1 bg-white">
            <ChatPanel 
              messages={messages} 
              onSendMessage={sendMessage}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}