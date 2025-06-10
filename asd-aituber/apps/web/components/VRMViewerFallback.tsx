'use client'

import { Button } from '@/components/ui/button'

interface TechnicalDetails {
  webglSupported?: boolean
  threeJsVersion?: string
  vrmLibVersion?: string
  userAgent?: string
}

interface VRMViewerFallbackProps {
  loading?: boolean
  error?: string
  reason?: string
  onRetry?: () => void
  className?: string
  technicalDetails?: TechnicalDetails
  showTechnicalDetails?: boolean
}

export default function VRMViewerFallback({
  loading = false,
  error,
  reason,
  onRetry,
  className = '',
  technicalDetails,
  showTechnicalDetails = false
}: VRMViewerFallbackProps) {
  
  // ローディング状態
  if (loading) {
    return (
      <div 
        data-testid="vrm-fallback-loading"
        className={`flex flex-col items-center justify-center h-full bg-gray-100 ${className}`}
      >
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-600">Loading VRM Avatar...</p>
        <p className="text-sm text-gray-500 mt-2">Initializing 3D environment</p>
      </div>
    )
  }

  // エラー状態
  if (error) {
    return (
      <div 
        data-testid="vrm-fallback-error"
        role="alert"
        aria-live="polite"
        className={`flex flex-col items-center justify-center h-full bg-red-50 ${className}`}
      >
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            VRM Loading Error
          </h3>
          <p className="text-red-600 mb-4">{error}</p>
          
          {onRetry && (
            <Button 
              onClick={onRetry}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              🔄 Retry
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ファイルが見つからない場合
  if (reason === 'VRM file not found') {
    return (
      <div 
        data-testid="vrm-fallback-file-error"
        className={`flex flex-col items-center justify-center h-full bg-orange-50 ${className}`}
      >
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📁</span>
          </div>
          <h3 className="text-lg font-semibold text-orange-800 mb-2">
            VRM File Not Found
          </h3>
          <p className="text-orange-600 mb-4">
            The VRM avatar file could not be found. Please check the file path.
          </p>
        </div>
      </div>
    )
  }

  // WebGL非対応の場合
  const isWebGLIssue = reason?.toLowerCase().includes('webgl')
  
  return (
    <div 
      data-testid="vrm-fallback"
      className={`flex flex-col items-center justify-center h-full bg-gray-50 ${className}`}
    >
      <div className="text-center max-w-md">
        {/* アバタープレースホルダー */}
        <div 
          data-testid="avatar-placeholder"
          className="w-32 h-32 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg"
        >
          <span className="text-4xl text-white">👤</span>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          VRM Avatar Unavailable
        </h3>
        
        {reason && (
          <p className="text-gray-600 mb-4">{reason}</p>
        )}
        
        {isWebGLIssue && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-blue-700 mb-2">
              <strong>WebGL is not supported</strong> in your current browser.
            </p>
            <p className="text-sm text-blue-600">
              Please try using Chrome, Edge, or Safari for the best experience.
            </p>
          </div>
        )}
        
        <p className="text-sm text-gray-500">
          The chat functionality will continue to work normally.
        </p>
        
        {showTechnicalDetails && technicalDetails && (
          <details className="mt-6 text-left">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-600">
              <div>WebGL Supported: {technicalDetails.webglSupported ? 'Yes' : 'No'}</div>
              {technicalDetails.threeJsVersion && (
                <div>Three.js Version: {technicalDetails.threeJsVersion}</div>
              )}
              {technicalDetails.vrmLibVersion && (
                <div>VRM Library Version: {technicalDetails.vrmLibVersion}</div>
              )}
              {technicalDetails.userAgent && (
                <div className="mt-1">User Agent: {technicalDetails.userAgent}</div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}