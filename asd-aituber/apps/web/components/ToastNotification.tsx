'use client'

import { useState, useEffect } from 'react'
import { ToastNotification as ToastNotificationType } from '@/lib/microphone-permission-manager'

interface ToastNotificationProps {
  notification: ToastNotificationType
  onClose: () => void
}

export function ToastNotification({ notification, onClose }: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    
    if (notification.duration) {
      const timer = setTimeout(() => {
        handleClose()
      }, notification.duration)
      
      return () => clearTimeout(timer)
    }
  }, [notification.duration])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Animation time
  }

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getTypeIcon = () => {
    switch (notification.type) {
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      case 'success':
        return '✅'
      default:
        return '💬'
    }
  }

  return (
    <div 
      className={`
        fixed top-4 right-4 max-w-md w-full z-50 p-4 border rounded-lg shadow-lg
        transition-all duration-300 transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getTypeStyles()}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{getTypeIcon()}</span>
        
        <div className="flex-1 space-y-1">
          <div className="font-medium text-sm">
            {notification.message}
          </div>
          
          {notification.details && (
            <div className="text-xs opacity-80">
              {notification.details}
            </div>
          )}
          
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 mt-2">
              {notification.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-70 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={handleClose}
          className="text-lg leading-none opacity-70 hover:opacity-100 transition-opacity"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
    </div>
  )
}

interface ToastManagerProps {
  children: React.ReactNode
}

export function ToastManager({ children }: ToastManagerProps) {
  const [toasts, setToasts] = useState<Array<ToastNotificationType & { id: string }>>([])

  const addToast = (notification: ToastNotificationType) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { ...notification, id }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // Global toast callback setup
  useEffect(() => {
    const { MicrophonePermissionManager } = require('@/lib/microphone-permission-manager')
    MicrophonePermissionManager.setToastCallback(addToast)
  }, [])

  return (
    <>
      {children}
      
      <div className="fixed top-0 right-0 z-50">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            notification={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  )
}