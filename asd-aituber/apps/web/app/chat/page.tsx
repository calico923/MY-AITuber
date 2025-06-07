'use client'

import dynamic from 'next/dynamic'

const VRMViewer = dynamic(() => import('@/components/VRMViewer'), {
  ssr: false,
})

export default function ChatPage() {
  return (
    <div className="flex h-screen">
      <div className="flex-1 relative">
        <VRMViewer modelUrl="/models/MyAvatar01_20241125134913.vrm" />
      </div>
      <div className="w-96 bg-gray-100 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Chat</h2>
        <div className="flex-1 overflow-y-auto mb-4 bg-white p-3 rounded border">
          <p className="text-gray-600">Chat messages will appear here</p>
        </div>
        <input
          type="text"
          placeholder="Type a message..."
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}