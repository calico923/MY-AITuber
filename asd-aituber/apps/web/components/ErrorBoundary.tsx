'use client'

import { Component, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  showDetails: boolean
}

interface ErrorInfo {
  componentStack: string
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      showDetails: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      showDetails: false
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // エラー情報をローカルストレージに保存（開発環境でのデバッグ用）
    if (process.env.NODE_ENV === 'development') {
      const errorLog = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      }
      
      try {
        const existingLogs = JSON.parse(localStorage.getItem('error-boundary-logs') || '[]')
        existingLogs.push(errorLog)
        
        // 最新50件のみ保持
        if (existingLogs.length > 50) {
          existingLogs.splice(0, existingLogs.length - 50)
        }
        
        localStorage.setItem('error-boundary-logs', JSON.stringify(existingLogs))
      } catch (storageError) {
        console.warn('Failed to save error log to localStorage:', storageError)
      }
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      showDetails: false
    })
  }

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }))
  }

  handleReportError = async () => {
    if (!this.state.error) return

    try {
      const errorReport = {
        message: this.state.error.message,
        stack: this.state.error.stack,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href
      }

      await fetch('/api/error-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      })

      alert('エラーレポートが送信されました。ご協力ありがとうございます。')
    } catch (reportError) {
      console.error('Failed to report error:', reportError)
      alert('エラーレポートの送信に失敗しました。')
    }
  }

  getErrorType = (error: Error | null): string => {
    if (!error) return 'unknown'
    
    const message = error.message.toLowerCase()
    
    if (message.includes('networkerror') || message.includes('fetch')) {
      return 'network'
    }
    
    if (message.includes('notallowederror') || message.includes('permission')) {
      return 'permission'
    }
    
    if (message.includes('音声合成') || message.includes('speech')) {
      return 'speech'
    }
    
    return 'generic'
  }

  getErrorMessage = (errorType: string): { title: string; description: string } => {
    switch (errorType) {
      case 'network':
        return {
          title: 'ネットワークエラーが発生しました',
          description: 'インターネット接続を確認して、再度お試しください。'
        }
      case 'permission':
        return {
          title: '権限エラーが発生しました',
          description: 'マイクロフォンの権限を確認して、再度お試しください。'
        }
      case 'speech':
        return {
          title: '音声処理エラーが発生しました',
          description: '音声合成または音声認識でエラーが発生しました。再度お試しください。'
        }
      default:
        return {
          title: 'エラーが発生しました',
          description: '予期しないエラーが発生しました。再度お試しください。'
        }
    }
  }

  render() {
    if (this.state.hasError) {
      const errorType = this.getErrorType(this.state.error)
      const { title, description } = this.getErrorMessage(errorType)

      // カスタムフォールバックUIが提供されている場合はそれを使用
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50 max-w-md mx-auto mt-8">
          <div className="space-y-4">
            {/* エラータイトル */}
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xl">⚠️</span>
              <h2 className="text-lg font-semibold text-red-800">{title}</h2>
            </div>

            {/* エラー説明 */}
            <p className="text-sm text-red-700">{description}</p>

            {/* アクションボタン */}
            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleRetry}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                再試行
              </button>

              <div className="flex gap-2">
                <button
                  onClick={this.toggleDetails}
                  className="flex-1 px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-100 transition-colors"
                >
                  {this.state.showDetails ? '詳細を非表示' : '詳細を表示'}
                </button>

                <button
                  onClick={this.handleReportError}
                  className="flex-1 px-3 py-1 text-sm border border-red-300 text-red-700 rounded hover:bg-red-100 transition-colors"
                >
                  エラーを報告
                </button>
              </div>
            </div>

            {/* エラー詳細（展開時のみ） */}
            {this.state.showDetails && this.state.error && (
              <div className="mt-4 p-3 bg-red-100 rounded text-xs">
                <div className="font-mono text-red-800 break-all">
                  <div className="font-semibold mb-1">エラーメッセージ:</div>
                  <div className="mb-2">{this.state.error.message}</div>
                  
                  {this.state.error.stack && (
                    <>
                      <div className="font-semibold mb-1">スタックトレース:</div>
                      <pre className="whitespace-pre-wrap text-xs">
                        {this.state.error.stack}
                      </pre>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 追加のヘルプ情報 */}
            <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
              💡 問題が続く場合は、ページを再読み込みするか、ブラウザの設定を確認してください。
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}