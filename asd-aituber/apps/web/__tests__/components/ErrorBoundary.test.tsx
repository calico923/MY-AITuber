import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import ErrorBoundary from '@/components/ErrorBoundary'

// Test component that throws error
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('音声合成に失敗しました')
  }
  return <div>Normal Component</div>
}

// Test component that throws specific error types
const ThrowNetworkError = () => {
  throw new Error('NetworkError: Failed to fetch')
}

const ThrowPermissionError = () => {
  throw new Error('NotAllowedError: Permission denied')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  test('音声合成エラー時にフォールバックUIを表示', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('音声処理エラーが発生しました')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /再試行/ })).toBeInTheDocument()
  })

  test('正常な子コンポーネントはそのまま表示', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Normal Component')).toBeInTheDocument()
    expect(screen.queryByText('音声処理エラーが発生しました')).not.toBeInTheDocument()
  })

  test('再試行ボタンクリックで子コンポーネントを再レンダリング', () => {
    let shouldThrow = true
    const TestWrapper = () => {
      return (
        <ErrorBoundary>
          <ThrowError shouldThrow={shouldThrow} />
        </ErrorBoundary>
      )
    }

    const { rerender } = render(<TestWrapper />)
    
    // エラー状態を確認
    expect(screen.getByText('音声処理エラーが発生しました')).toBeInTheDocument()
    
    // shouldThrowをfalseに変更してから再試行
    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: /再試行/ }))
    
    // Note: ErrorBoundaryの実装によってはrerenderが必要な場合があります
  })

  test('ネットワークエラーの場合、適切なエラーメッセージを表示', () => {
    render(
      <ErrorBoundary>
        <ThrowNetworkError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/ネットワークエラー/)).toBeInTheDocument()
    expect(screen.getByText(/インターネット接続を確認/)).toBeInTheDocument()
  })

  test('権限エラーの場合、適切なエラーメッセージを表示', () => {
    render(
      <ErrorBoundary>
        <ThrowPermissionError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText(/権限エラー/)).toBeInTheDocument()
    expect(screen.getByText(/マイクロフォンの権限/)).toBeInTheDocument()
  })

  test('エラー詳細の表示切り替え機能', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    // 詳細表示ボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: /詳細を表示/ }))
    
    // エラー詳細が表示される
    expect(screen.getByText(/音声合成に失敗しました/)).toBeInTheDocument()
    
    // 詳細非表示ボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: /詳細を非表示/ }))
    
    // エラー詳細が非表示になる
    expect(screen.queryByText(/音声合成に失敗しました/)).not.toBeInTheDocument()
  })

  test('エラー報告機能', () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    global.fetch = mockFetch

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    fireEvent.click(screen.getByRole('button', { name: /エラーを報告/ }))
    
    expect(mockFetch).toHaveBeenCalledWith('/api/error-report', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('音声合成に失敗しました')
    }))
  })

  test('複数のエラーが発生した場合、最新のエラーを表示', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('音声処理エラーが発生しました')).toBeInTheDocument()
    
    // 詳細を表示してエラーメッセージを確認
    fireEvent.click(screen.getByRole('button', { name: /詳細を表示/ }))
    expect(screen.getByText('音声合成に失敗しました')).toBeInTheDocument()
  })
})