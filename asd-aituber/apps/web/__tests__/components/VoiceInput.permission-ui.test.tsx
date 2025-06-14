import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import VoiceInput from '@/components/VoiceInput'
import { MicrophonePermissionManager } from '@/lib/microphone-permission-manager'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'

// Mock dependencies
vi.mock('@/hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: vi.fn()
}))

vi.mock('@/lib/microphone-permission-manager', () => ({
  MicrophonePermissionManager: {
    checkPermissionStatus: vi.fn(),
    testMicrophoneAccess: vi.fn(),
    getLastKnownStatus: vi.fn()
  }
}))

vi.mock('@/lib/speech-recognition', () => ({
  diagnoseNetworkEnvironment: vi.fn().mockReturnValue('online')
}))

vi.mock('@/lib/speech-debug', () => ({
  debugSpeechAPI: vi.fn(),
  explainWebSpeechAPIAuth: vi.fn()
}))

vi.mock('@/libs/audio-context-manager', () => ({
  AudioContextManager: vi.fn().mockImplementation(() => ({
    setIsSpeaking: vi.fn(),
    emergencyStop: vi.fn()
  }))
}))

// Mock isDevelopmentEnvironment function
const mockIsDevelopmentEnvironment = vi.fn()
vi.mock('@/lib/development-helpers', () => ({
  isDevelopmentEnvironment: mockIsDevelopmentEnvironment
}))

describe('VoiceInput - Permission UI Integration', () => {
  const mockOnTranscript = vi.fn()
  const mockUseSpeechRecognition = vi.mocked(useSpeechRecognition)
  const mockCheckPermissionStatus = vi.mocked(MicrophonePermissionManager.checkPermissionStatus)
  const mockTestMicrophoneAccess = vi.mocked(MicrophonePermissionManager.testMicrophoneAccess)

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock for useSpeechRecognition
    mockUseSpeechRecognition.mockReturnValue({
      isSupported: true,
      isListening: false,
      isInitializing: false,
      hasPermission: null,
      transcript: '',
      interimTranscript: '',
      error: null,
      startListening: vi.fn(),
      stopListening: vi.fn(),
      resetTranscript: vi.fn()
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('マイク権限がない場合、権限要求UIを表示', async () => {
    // Permission not granted
    mockCheckPermissionStatus.mockResolvedValue({
      granted: false,
      persistent: false,
      browserSupport: true
    })

    mockUseSpeechRecognition.mockReturnValue({
      isSupported: true,
      isListening: false,
      isInitializing: false,
      hasPermission: false,
      transcript: '',
      interimTranscript: '',
      error: null,
      startListening: vi.fn(),
      stopListening: vi.fn(),
      resetTranscript: vi.fn()
    })

    render(<VoiceInput onTranscript={mockOnTranscript} />)

    await waitFor(() => {
      expect(screen.getByText(/マイクロフォンの権限が必要です/)).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /マイク権限を許可/ })).toBeInTheDocument()
  })

  test('開発環境の場合、追加の警告メッセージを表示', async () => {
    mockIsDevelopmentEnvironment.mockReturnValue(true)
    
    mockCheckPermissionStatus.mockResolvedValue({
      granted: false,
      persistent: false,
      browserSupport: false
    })

    mockUseSpeechRecognition.mockReturnValue({
      isSupported: true,
      isListening: false,
      isInitializing: false,
      hasPermission: false,
      transcript: '',
      interimTranscript: '',
      error: null,
      startListening: vi.fn(),
      stopListening: vi.fn(),
      resetTranscript: vi.fn()
    })

    render(<VoiceInput onTranscript={mockOnTranscript} />)

    await waitFor(() => {
      expect(screen.getByText(/開発環境のため/)).toBeInTheDocument()
    })
  })

  test('権限許可ボタンクリック時に権限テストが実行される', async () => {
    mockCheckPermissionStatus.mockResolvedValue({
      granted: false,
      persistent: false,
      browserSupport: true
    })

    mockTestMicrophoneAccess.mockResolvedValue({
      granted: true,
      timestamp: Date.now()
    })

    mockUseSpeechRecognition.mockReturnValue({
      isSupported: true,
      isListening: false,
      isInitializing: false,
      hasPermission: false,
      transcript: '',
      interimTranscript: '',
      error: null,
      startListening: vi.fn(),
      stopListening: vi.fn(),
      resetTranscript: vi.fn()
    })

    render(<VoiceInput onTranscript={mockOnTranscript} />)

    const allowButton = await screen.findByRole('button', { name: /マイク権限を許可/ })
    fireEvent.click(allowButton)

    await waitFor(() => {
      expect(mockTestMicrophoneAccess).toHaveBeenCalled()
    })
  })

  test('権限が許可されている場合、通常のマイクボタンを表示', async () => {
    mockCheckPermissionStatus.mockResolvedValue({
      granted: true,
      persistent: true,
      browserSupport: true
    })

    mockUseSpeechRecognition.mockReturnValue({
      isSupported: true,
      isListening: false,
      isInitializing: false,
      hasPermission: true,
      transcript: '',
      interimTranscript: '',
      error: null,
      startListening: vi.fn(),
      stopListening: vi.fn(),
      resetTranscript: vi.fn()
    })

    render(<VoiceInput onTranscript={mockOnTranscript} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /音声入力を開始/ })).toBeInTheDocument()
    })

    // 権限要求UIは表示されない
    expect(screen.queryByText(/マイクロフォンの権限が必要です/)).not.toBeInTheDocument()
  })

  test('Permissions APIが利用不可の場合、フォールバック説明を表示', async () => {
    mockCheckPermissionStatus.mockResolvedValue({
      granted: false,
      persistent: false,
      browserSupport: false
    })

    mockUseSpeechRecognition.mockReturnValue({
      isSupported: true,
      isListening: false,
      isInitializing: false,
      hasPermission: false,
      transcript: '',
      interimTranscript: '',
      error: null,
      startListening: vi.fn(),
      stopListening: vi.fn(),
      resetTranscript: vi.fn()
    })

    render(<VoiceInput onTranscript={mockOnTranscript} />)

    await waitFor(() => {
      expect(screen.getByText(/ブラウザの制限により/)).toBeInTheDocument()
    })
  })
})