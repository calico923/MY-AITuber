/**
 * AudioContextManager緊急停止機能テスト
 * TDD Red Phase: 失敗するテストケース
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioContextManager } from '@/libs/audio-context-manager'

// モック設定
const mockSpeechSynthesis = {
  cancel: vi.fn()
}

const mockAudioElement = {
  pause: vi.fn(),
  currentTime: 0
}

const mockDocument = {
  querySelectorAll: vi.fn()
}

// グローバルオブジェクトのモック
Object.defineProperty(global, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
  configurable: true
})

Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true,
  configurable: true
})

describe('AudioContextManager Emergency Stop', () => {
  beforeEach(() => {
    // 各テスト前にインスタンスをリセット
    AudioContextManager.resetInstance()
    
    // タイマーモックを設定
    vi.useFakeTimers()
    
    // モックをリセット
    vi.clearAllMocks()
    mockDocument.querySelectorAll.mockReturnValue([mockAudioElement])
  })

  afterEach(() => {
    // テスト後のクリーンアップ
    AudioContextManager.resetInstance()
    vi.useRealTimers()
  })

  test('emergencyStopで全ての音声出力が停止される', () => {
    const manager = AudioContextManager.getInstance()
    
    // 音声合成中状態にセット
    manager.setIsSpeaking(true)
    
    // emergencyStopを実行
    manager.emergencyStop()
    
    // 検証1: speechSynthesis.cancelが呼ばれる
    expect(mockSpeechSynthesis.cancel).toHaveBeenCalled()
    
    // 検証2: 全てのaudio要素が停止される
    expect(mockDocument.querySelectorAll).toHaveBeenCalledWith('audio')
    expect(mockAudioElement.pause).toHaveBeenCalled()
    expect(mockAudioElement.currentTime).toBe(0)
    
    // 検証3: isSpeakingがfalseになる
    expect(manager.getIsSpeaking()).toBe(false)
  })

  test('emergencyStop後は再開タイマーも停止される', () => {
    const manager = AudioContextManager.getInstance()
    
    // モックコントローラーを登録
    const mockController = {
      forceStop: vi.fn(),
      autoRestart: vi.fn()
    }
    manager.registerVoiceInput(mockController)
    
    // 音声合成を終了して300ms待機タイマーを開始
    manager.setIsSpeaking(false)
    
    // 即座にemergencyStopを実行
    manager.emergencyStop()
    
    // 300ms経過してもautoRestartが呼ばれないことを確認
    vi.advanceTimersByTime(500)
    expect(mockController.autoRestart).not.toHaveBeenCalled()
    
    // 状態がfalseのまま維持される
    expect(manager.getIsSpeaking()).toBe(false)
  })

  test('emergencyStopはブラウザ環境でなくてもエラーを投げない', () => {
    // グローバルオブジェクトを一時的に無効化
    const originalSpeechSynthesis = global.speechSynthesis
    const originalDocument = global.document
    
    // @ts-expect-error Testing undefined globals
    delete global.speechSynthesis
    // @ts-expect-error Testing undefined globals
    delete global.document
    
    const manager = AudioContextManager.getInstance()
    
    // emergencyStopがエラーを投げないことを確認
    expect(() => {
      manager.emergencyStop()
    }).not.toThrow()
    
    // 状態は正しくfalseになる
    expect(manager.getIsSpeaking()).toBe(false)
    
    // グローバルオブジェクトを復元
    global.speechSynthesis = originalSpeechSynthesis
    global.document = originalDocument
  })

  test('複数のaudio要素が存在する場合、全て停止される', () => {
    const mockAudio1 = { pause: vi.fn(), currentTime: 0 }
    const mockAudio2 = { pause: vi.fn(), currentTime: 5.5 }
    const mockAudio3 = { pause: vi.fn(), currentTime: 2.1 }
    
    mockDocument.querySelectorAll.mockReturnValue([mockAudio1, mockAudio2, mockAudio3])
    
    const manager = AudioContextManager.getInstance()
    manager.emergencyStop()
    
    // 全てのaudio要素が停止される
    expect(mockAudio1.pause).toHaveBeenCalled()
    expect(mockAudio2.pause).toHaveBeenCalled()
    expect(mockAudio3.pause).toHaveBeenCalled()
    
    // 全てのaudio要素の再生位置がリセットされる
    expect(mockAudio1.currentTime).toBe(0)
    expect(mockAudio2.currentTime).toBe(0)
    expect(mockAudio3.currentTime).toBe(0)
  })
})