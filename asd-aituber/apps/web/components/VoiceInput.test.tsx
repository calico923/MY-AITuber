import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import VoiceInput from './VoiceInput'

// useSpeechRecognition フックのモック
vi.mock('@/hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: vi.fn()
}))

import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

const mockUseSpeechRecognition = useSpeechRecognition as any

describe('VoiceInput', () => {
  const mockOnTranscript = vi.fn()

  const defaultMockReturn = {
    isSupported: true,
    isListening: false,
    isInitializing: false,
    hasPermission: true,
    transcript: '',
    interimTranscript: '',
    confidence: 0,
    error: null,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    toggleListening: vi.fn(),
    requestPermission: vi.fn(),
    clearError: vi.fn(),
    clearTranscript: vi.fn(),
    browserInfo: {
      isSupported: true,
      browserName: 'Chrome'
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSpeechRecognition.mockReturnValue(defaultMockReturn)
  })

  describe('基本的な表示', () => {
    it('正常な状態で適切にレンダリングされる', () => {
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('マイクボタンを押して話してください...')).toBeInTheDocument()
      expect(screen.getByText('準備完了')).toBeInTheDocument()
    })

    it('カスタムプレースホルダーが表示される', () => {
      render(
        <VoiceInput 
          onTranscript={mockOnTranscript} 
          placeholder="カスタムメッセージ"
        />
      )
      
      expect(screen.getByText('カスタムメッセージ')).toBeInTheDocument()
    })

    it('disabled状態でボタンが無効になる', () => {
      render(<VoiceInput onTranscript={mockOnTranscript} isDisabled={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    // ✅ Task 1.1.1: VoiceInput disabled propのテスト作成
    it('disabled propがtrueの場合、マイクボタンが無効化される', () => {
      render(<VoiceInput onTranscript={mockOnTranscript} disabled={true} />)
      const button = screen.getByRole('button', { name: /mic/i })
      expect(button).toBeDisabled()
    })

    // ❌ Task 1.1.3: VoiceInput状態変化通知のテスト作成
    it('音声認識状態が変化した時にonStateChangeが呼ばれる', async () => {
      const mockStartListening = vi.fn().mockResolvedValue(true)  // 成功を返すようにモック
      const onStateChange = vi.fn()
      
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockReturn,
        startListening: mockStartListening
      })
      
      const { getByRole } = render(<VoiceInput onTranscript={mockOnTranscript} onStateChange={onStateChange} />)
      
      fireEvent.click(getByRole('button'))
      
      // async処理が完了するまで待機
      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith(true)
      })
    })
  })

  describe('音声認識がサポートされていない場合', () => {
    it('サポート外のメッセージが表示される', () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockReturn,
        isSupported: false,
        browserInfo: {
          isSupported: false,
          browserName: 'Firefox',
          recommendedMessage: 'Chrome、Edge、またはSafariをお使いください。'
        }
      })
      
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      expect(screen.getByText('音声入力が利用できません')).toBeInTheDocument()
      expect(screen.getByText('Chrome、Edge、またはSafariをお使いください。')).toBeInTheDocument()
    })
  })

  describe('初期化中の表示', () => {
    it('初期化中のメッセージが表示される', () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockReturn,
        isInitializing: true
      })
      
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      expect(screen.getByText('音声認識を初期化中...')).toBeInTheDocument()
    })
  })

  describe('権限要求', () => {
    it('権限がない場合に権限要求画面が表示される', () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockReturn,
        hasPermission: false
      })
      
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      expect(screen.getByText('マイクロフォンの権限が必要です')).toBeInTheDocument()
      expect(screen.getByText('権限を許可')).toBeInTheDocument()
    })

    it('権限許可ボタンをクリックすると権限要求される', async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue(true)
      
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockReturn,
        hasPermission: false,
        requestPermission: mockRequestPermission
      })
      
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      const permissionButton = screen.getByText('権限を許可')
      fireEvent.click(permissionButton)
      
      expect(mockRequestPermission).toHaveBeenCalled()
    })
  })

  describe('エラー表示', () => {
    it('エラーが発生した場合にエラーメッセージが表示される', () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockReturn,
        error: 'マイクロフォンにアクセスできません'
      })
      
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      expect(screen.getByText('マイクロフォンにアクセスできません')).toBeInTheDocument()
    })

    it('エラーの閉じるボタンをクリックするとエラーがクリアされる', () => {
      const mockClearError = vi.fn()
      
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockReturn,
        error: 'エラーメッセージ',
        clearError: mockClearError
      })
      
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      const closeButton = screen.getByText('✕')
      fireEvent.click(closeButton)
      
      expect(mockClearError).toHaveBeenCalled()
    })
  })

  describe('音声認識の制御', () => {
    it('マイクボタンをクリックすると音声認識が開始される', async () => {
      const mockToggleListening = vi.fn().mockResolvedValue(true)
      
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockReturn,
        toggleListening: mockToggleListening
      })
      
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      const micButton = screen.getByRole('button')
      fireEvent.click(micButton)
      
      expect(mockToggleListening).toHaveBeenCalled()
    })

    it('録音中は停止ボタンが表示される', () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockReturn,
        isListening: true
      })
      
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      expect(screen.getByText('⏹️')).toBeInTheDocument()
      expect(screen.getByText('録音中')).toBeInTheDocument()
      expect(screen.getByText('🎵 聞いています...')).toBeInTheDocument()
    })

    it('録音していない時はマイクボタンが表示される', () => {
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      expect(screen.getByText('🎤')).toBeInTheDocument()
    })
  })

  describe('中間結果の表示', () => {
    it('中間結果が表示される', () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockReturn,
        isListening: true,
        interimTranscript: 'こんにち'
      })
      
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      expect(screen.getByText('"こんにち"')).toBeInTheDocument()
    })

    it('信頼度が表示される', () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockReturn,
        isListening: true,
        confidence: 0.85
      })
      
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      expect(screen.getByText('信頼度:')).toBeInTheDocument()
      expect(screen.getByText('85%')).toBeInTheDocument()
    })
  })

  describe('コールバック処理', () => {
    it('最終結果が得られた時にonTranscriptが呼ばれる', () => {
      // onFinalResult コールバックをシミュレート
      let onFinalResultCallback: ((transcript: string, confidence: number) => void) | undefined
      
      mockUseSpeechRecognition.mockImplementation((options) => {
        onFinalResultCallback = options?.onFinalResult
        return defaultMockReturn
      })
      
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      // コールバックが設定されていることを確認
      expect(onFinalResultCallback).toBeDefined()
      
      // 最終結果をシミュレート
      onFinalResultCallback?.('こんにちは', 0.9)
      
      expect(mockOnTranscript).toHaveBeenCalledWith('こんにちは')
    })

    it('空の文字列では onTranscript が呼ばれない', () => {
      let onFinalResultCallback: ((transcript: string, confidence: number) => void) | undefined
      
      mockUseSpeechRecognition.mockImplementation((options) => {
        onFinalResultCallback = options?.onFinalResult
        return defaultMockReturn
      })
      
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      // 空の結果をシミュレート
      onFinalResultCallback?.('   ', 0.9)
      
      expect(mockOnTranscript).not.toHaveBeenCalled()
    })

    it('ローディング中は onTranscript が呼ばれない', () => {
      let onFinalResultCallback: ((transcript: string, confidence: number) => void) | undefined
      
      mockUseSpeechRecognition.mockImplementation((options) => {
        onFinalResultCallback = options?.onFinalResult
        return defaultMockReturn
      })
      
      render(<VoiceInput onTranscript={mockOnTranscript} isDisabled={true} />)
      
      // 結果をシミュレート
      onFinalResultCallback?.('こんにちは', 0.9)
      
      expect(mockOnTranscript).not.toHaveBeenCalled()
    })
  })

  describe('ヒント表示', () => {
    it('使用方法のヒントが適切に表示される', () => {
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      expect(screen.getByText(/マイクボタンを押して話すと、音声が文字に変換されます/)).toBeInTheDocument()
    })

    it('録音中やエラー時はヒントが表示されない', () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultMockReturn,
        isListening: true
      })
      
      render(<VoiceInput onTranscript={mockOnTranscript} />)
      
      expect(screen.queryByText(/マイクボタンを押して話すと/)).not.toBeInTheDocument()
    })
  })
})