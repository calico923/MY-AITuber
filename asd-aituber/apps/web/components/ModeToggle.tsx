'use client'

import { useState } from 'react'
import type { ASDNTMode } from '@asd-aituber/types'

interface ModeToggleProps {
  currentMode: ASDNTMode
  onModeChange: (mode: ASDNTMode) => void
  className?: string
}

export function ModeToggle({ currentMode, onModeChange, className = '' }: ModeToggleProps) {
  const [isToggling, setIsToggling] = useState(false)

  const handleToggle = async () => {
    setIsToggling(true)
    const newMode: ASDNTMode = currentMode === 'ASD' ? 'NT' : 'ASD'
    
    // Add a small delay for visual feedback
    setTimeout(() => {
      onModeChange(newMode)
      setIsToggling(false)
    }, 150)
  }

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      <label htmlFor="mode-toggle" className="text-sm font-medium text-gray-700">
        コミュニケーションモード
      </label>
      
      <div className="relative">
        <button
          id="mode-toggle"
          onClick={handleToggle}
          disabled={isToggling}
          className={`
            relative w-20 h-10 rounded-full border-2 transition-all duration-200 ease-in-out
            ${currentMode === 'ASD' 
              ? 'bg-blue-100 border-blue-300 hover:bg-blue-200' 
              : 'bg-green-100 border-green-300 hover:bg-green-200'
            }
            ${isToggling ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
            focus:outline-none focus:ring-2 focus:ring-offset-2
            ${currentMode === 'ASD' ? 'focus:ring-blue-500' : 'focus:ring-green-500'}
          `}
          aria-label={`現在のモード: ${currentMode}。クリックして${currentMode === 'ASD' ? 'NT' : 'ASD'}モードに切り替え`}
          role="switch"
          aria-checked={currentMode === 'NT'}
        >
          {/* Toggle slider */}
          <div 
            className={`
              absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out
              ${currentMode === 'ASD' ? 'left-1 translate-x-0' : 'left-1 translate-x-10'}
              ${isToggling ? 'scale-90' : 'scale-100'}
            `}
          />
          
          {/* Mode labels */}
          <span 
            className={`
              absolute left-2 top-1/2 transform -translate-y-1/2 text-xs font-bold
              ${currentMode === 'ASD' ? 'text-blue-700' : 'text-gray-400'}
            `}
          >
            ASD
          </span>
          <span 
            className={`
              absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-bold
              ${currentMode === 'NT' ? 'text-green-700' : 'text-gray-400'}
            `}
          >
            NT
          </span>
        </button>
      </div>

      {/* Mode description */}
      <div className="text-center max-w-xs">
        <p className="text-xs text-gray-600">
          {currentMode === 'ASD' ? (
            <>
              <span className="font-semibold text-blue-700">ASDモード</span>
              <br />
              直接的で字義通りの解釈
            </>
          ) : (
            <>
              <span className="font-semibold text-green-700">NTモード</span>
              <br />
              文脈と社会的手がかりを考慮
            </>
          )}
        </p>
      </div>

      {/* Hidden text for screen readers */}
      <div className="sr-only">
        現在のコミュニケーションモードは{currentMode}です。
        {currentMode === 'ASD' 
          ? 'このモードでは、直接的で字義通りの解釈を行います。' 
          : 'このモードでは、文脈と社会的手がかりを考慮した解釈を行います。'
        }
        ボタンを押すと{currentMode === 'ASD' ? 'NT' : 'ASD'}モードに切り替わります。
      </div>
    </div>
  )
}