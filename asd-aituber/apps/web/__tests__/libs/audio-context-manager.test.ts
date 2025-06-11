import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioContextManager } from '@/libs/audio-context-manager'

describe('AudioContextManager', () => {
  beforeEach(() => {
    // 各テストの前にインスタンスをリセット
    AudioContextManager.resetInstance()
  })

  it('シングルトンパターンで同一インスタンスを返す', () => {
    const instance1 = AudioContextManager.getInstance()
    const instance2 = AudioContextManager.getInstance()
    
    expect(instance1).toBe(instance2)
  })
  
  it('初期状態でisSpeakingがfalse', () => {
    const manager = AudioContextManager.getInstance()
    
    expect(manager.getIsSpeaking()).toBe(false)
  })
})

describe('AudioContextManager VoiceInput Integration', () => {
  beforeEach(() => {
    AudioContextManager.resetInstance()
  })

  it('VoiceInputControllerの登録ができる', () => {
    const manager = AudioContextManager.getInstance()
    const mockController = {
      forceStop: vi.fn(),
      autoRestart: vi.fn()
    }
    
    manager.registerVoiceInput(mockController)
    
    expect(manager.hasVoiceInputRegistered()).toBe(true)
  })
  
  it('未登録状態での操作はエラーを投げない', () => {
    const manager = AudioContextManager.getInstance()
    
    expect(() => manager.setIsSpeaking(true)).not.toThrow()
  })
})

describe('AudioContextManager Speech Control', () => {
  beforeEach(() => {
    AudioContextManager.resetInstance()
  })

  it('音声合成開始時にVoiceInputが即座に停止される', () => {
    const manager = AudioContextManager.getInstance()
    const mockController = {
      forceStop: vi.fn(),
      autoRestart: vi.fn()
    }
    
    manager.registerVoiceInput(mockController)
    manager.setIsSpeaking(true)
    
    expect(mockController.forceStop).toHaveBeenCalled()
    expect(manager.getIsSpeaking()).toBe(true)
  })
})

describe('AudioContextManager Auto Restart', () => {
  beforeEach(() => {
    AudioContextManager.resetInstance()
    vi.useFakeTimers()
  })
  
  afterEach(() => {
    vi.useRealTimers()
  })
  
  it('音声合成終了300ms後にマイクが自動再開される', async () => {
    const manager = AudioContextManager.getInstance()
    const mockController = {
      forceStop: vi.fn(),
      autoRestart: vi.fn()
    }
    
    manager.registerVoiceInput(mockController)
    manager.setIsSpeaking(false)
    
    // まだ再開されていない
    expect(mockController.autoRestart).not.toHaveBeenCalled()
    
    // 300ms経過
    vi.advanceTimersByTime(300)
    
    // 再開される
    expect(mockController.autoRestart).toHaveBeenCalled()
  })
  
  it('音声合成開始時に既存の再開タイマーがキャンセルされる', async () => {
    const manager = AudioContextManager.getInstance()
    const mockController = {
      forceStop: vi.fn(),
      autoRestart: vi.fn()
    }
    
    manager.registerVoiceInput(mockController)
    
    // 最初の音声終了でタイマー開始
    manager.setIsSpeaking(false)
    
    // 300ms経過前に新しい音声開始
    vi.advanceTimersByTime(100)
    manager.setIsSpeaking(true)
    
    // 残り200ms経過しても自動再開されない
    vi.advanceTimersByTime(200)
    expect(mockController.autoRestart).not.toHaveBeenCalled()
  })
  
  it('emergencyStop時にタイマーがクリアされる', async () => {
    const manager = AudioContextManager.getInstance()
    const mockController = {
      forceStop: vi.fn(),
      autoRestart: vi.fn()
    }
    
    manager.registerVoiceInput(mockController)
    manager.setIsSpeaking(false)
    
    // 緊急停止
    manager.emergencyStop()
    
    // 300ms経過しても自動再開されない
    vi.advanceTimersByTime(300)
    expect(mockController.autoRestart).not.toHaveBeenCalled()
    expect(manager.getIsSpeaking()).toBe(false)
  })
})