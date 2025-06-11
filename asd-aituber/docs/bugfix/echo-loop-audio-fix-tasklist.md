# エコーループ音声修正 TDDタスクリスト

## 🎯 TDD (Test-Driven Development) アプローチ

各タスクは以下の順序で実行します：
1. **Red**: 失敗するテストを書く
2. **Green**: テストを通過する最小限の実装
3. **Refactor**: コードの品質向上

---

## 🔥 Critical Priority: Core Infrastructure

### 📋 Task 1: AudioContextManager基盤実装

#### Task 1.1: AudioContextManagerシングルトンテスト作成

##### 1.1.1 ❌ Red: シングルトンパターンテスト
```typescript
// __tests__/libs/audio-context-manager.test.ts
describe('AudioContextManager', () => {
  test('シングルトンパターンで同一インスタンスを返す', () => {
    const instance1 = AudioContextManager.getInstance()
    const instance2 = AudioContextManager.getInstance()
    
    expect(instance1).toBe(instance2)
  })
  
  test('初期状態でisSpeakingがfalse', () => {
    const manager = AudioContextManager.getInstance()
    
    expect(manager.getIsSpeaking()).toBe(false)
  })
})
```
- **推定時間**: 15分
- **完了条件**: テストが失敗することを確認

##### 1.1.2 ✅ Green: AudioContextManager基本実装
```typescript
// libs/audio-context-manager.ts
export class AudioContextManager {
  private static instance: AudioContextManager
  private isSpeaking = false
  
  private constructor() {}
  
  static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager()
    }
    return AudioContextManager.instance
  }
  
  getIsSpeaking(): boolean {
    return this.isSpeaking
  }
}
```
- **推定時間**: 10分
- **完了条件**: Task 1.1.1のテストがパス

##### 1.1.3 🔄 Refactor: 型安全性とエラーハンドリング追加
- **推定時間**: 10分
- **完了条件**: テストが継続してパス

---

#### Task 1.2: VoiceInputController連携テスト

##### 1.2.1 ❌ Red: VoiceInputController登録テスト
```typescript
// __tests__/libs/audio-context-manager.test.ts (追加)
describe('AudioContextManager VoiceInput Integration', () => {
  test('VoiceInputControllerの登録ができる', () => {
    const manager = AudioContextManager.getInstance()
    const mockController = {
      forceStop: vi.fn(),
      autoRestart: vi.fn()
    }
    
    manager.registerVoiceInput(mockController)
    
    expect(manager.hasVoiceInputRegistered()).toBe(true)
  })
  
  test('未登録状態での操作はエラーを投げない', () => {
    const manager = AudioContextManager.getInstance()
    
    expect(() => manager.setIsSpeaking(true)).not.toThrow()
  })
})
```
- **推定時間**: 20分
- **完了条件**: テストが失敗することを確認

##### 1.2.2 ✅ Green: VoiceInputController連携実装
```typescript
// libs/audio-context-manager.ts (追加)
interface VoiceInputController {
  forceStop(): void
  autoRestart(): void
}

export class AudioContextManager {
  private voiceInputRef: VoiceInputController | null = null
  
  registerVoiceInput(controller: VoiceInputController): void {
    this.voiceInputRef = controller
  }
  
  hasVoiceInputRegistered(): boolean {
    return this.voiceInputRef !== null
  }
  
  setIsSpeaking(speaking: boolean): void {
    this.isSpeaking = speaking
    // 基本実装（タイマー機能は次のタスクで）
  }
}
```
- **推定時間**: 15分
- **完了条件**: Task 1.2.1のテストがパス

##### 1.2.3 🔄 Refactor: インターフェース型定義を別ファイルに分離
- **推定時間**: 10分
- **完了条件**: テストが継続してパス

---

#### Task 1.3: 音声状態制御テスト

##### 1.3.1 ❌ Red: 音声合成開始時マイク停止テスト
```typescript
// __tests__/libs/audio-context-manager.test.ts (追加)
describe('AudioContextManager Speech Control', () => {
  test('音声合成開始時にVoiceInputが即座に停止される', () => {
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
```
- **推定時間**: 15分
- **完了条件**: テストが失敗することを確認

##### 1.3.2 ✅ Green: 音声合成開始時の制御実装
```typescript
// libs/audio-context-manager.ts (修正)
setIsSpeaking(speaking: boolean): void {
  this.isSpeaking = speaking
  
  if (speaking) {
    // 音声合成開始: 即座にマイク停止
    this.voiceInputRef?.forceStop()
  }
}
```
- **推定時間**: 10分
- **完了条件**: Task 1.3.1のテストがパス

##### 1.3.3 🔄 Refactor: ログ出力とデバッグ情報追加
- **推定時間**: 5分
- **完了条件**: テストが継続してパス

---

#### Task 1.4: 300ms遅延マイク再開テスト

##### 1.4.1 ❌ Red: 300ms後マイク自動再開テスト
```typescript
// __tests__/libs/audio-context-manager.test.ts (追加)
describe('AudioContextManager Auto Restart', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  
  afterEach(() => {
    vi.useRealTimers()
  })
  
  test('音声合成終了300ms後にマイクが自動再開される', async () => {
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
})
```
- **推定時間**: 25分
- **完了条件**: テストが失敗することを確認

##### 1.4.2 ✅ Green: 300ms遅延マイク再開実装
```typescript
// libs/audio-context-manager.ts (修正)
setIsSpeaking(speaking: boolean): void {
  this.isSpeaking = speaking
  
  if (speaking) {
    // 音声合成開始: 即座にマイク停止
    this.voiceInputRef?.forceStop()
  } else {
    // 音声合成終了: 300ms後にマイク再開
    setTimeout(() => {
      this.voiceInputRef?.autoRestart()
    }, 300)
  }
}
```
- **推定時間**: 15分
- **完了条件**: Task 1.4.1のテストがパス

##### 1.4.3 🔄 Refactor: タイマーのクリーンアップ機能追加
- **推定時間**: 20分
- **完了条件**: テストが継続してパス

---

### 📋 Task 2: 緊急停止機能実装

#### Task 2.1: emergencyStop機能テスト

##### 2.1.1 ❌ Red: 緊急停止機能テスト
```typescript
// __tests__/libs/audio-context-manager.test.ts (追加)
describe('AudioContextManager Emergency Stop', () => {
  test('emergencyStopで全ての音声出力が停止される', () => {
    const manager = AudioContextManager.getInstance()
    
    // speechSynthesis.cancelのモック
    const mockCancel = vi.fn()
    global.speechSynthesis = { cancel: mockCancel } as any
    
    // audio要素のモック
    const mockAudio = { pause: vi.fn(), currentTime: 0 }
    document.querySelectorAll = vi.fn().mockReturnValue([mockAudio])
    
    manager.setIsSpeaking(true)
    manager.emergencyStop()
    
    expect(mockCancel).toHaveBeenCalled()
    expect(mockAudio.pause).toHaveBeenCalled()
    expect(manager.getIsSpeaking()).toBe(false)
  })
})
```
- **推定時間**: 30分
- **完了条件**: テストが失敗することを確認

##### 2.1.2 ✅ Green: emergencyStop実装
```typescript
// libs/audio-context-manager.ts (追加)
emergencyStop(): void {
  // 全ての音声出力を即座に停止
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel()
  }
  
  // 全てのaudio要素を停止
  if (typeof document !== 'undefined') {
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })
  }
  
  this.setIsSpeaking(false)
}
```
- **推定時間**: 20分
- **完了条件**: Task 2.1.1のテストがパス

##### 2.1.3 🔄 Refactor: ブラウザ環境チェックとエラーハンドリング
- **推定時間**: 15分
- **完了条件**: テストが継続してパス

---

## 🔧 Medium Priority: VoiceInput統合

### 📋 Task 3: VoiceInput統合実装

#### Task 3.1: VoiceInputControllerインターフェーステスト

##### 3.1.1 ❌ Red: VoiceInputとAudioContextManager統合テスト
```typescript
// __tests__/components/VoiceInput.audioManager.test.tsx
describe('VoiceInput AudioContextManager Integration', () => {
  test('コンポーネントマウント時にAudioContextManagerに登録される', () => {
    const mockRegister = vi.fn()
    AudioContextManager.getInstance = vi.fn().mockReturnValue({
      registerVoiceInput: mockRegister,
      getIsSpeaking: () => false
    })
    
    render(<VoiceInput onTranscript={vi.fn()} />)
    
    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        forceStop: expect.any(Function),
        autoRestart: expect.any(Function)
      })
    )
  })
})
```
- **推定時間**: 25分
- **完了条件**: テストが失敗することを確認

##### 3.1.2 ✅ Green: VoiceInput AudioContextManager統合実装
```typescript
// components/VoiceInput.tsx (修正)
import { AudioContextManager } from '@/libs/audio-context-manager'

export default function VoiceInput({ onTranscript }: VoiceInputProps) {
  const audioManager = AudioContextManager.getInstance()
  
  useEffect(() => {
    const controller = {
      forceStop: () => {
        stopListening()
        setIsActive(false)
      },
      autoRestart: () => {
        if (wasListeningBeforeStop) {
          startListening()
          setIsActive(true)
        }
      }
    }
    
    audioManager.registerVoiceInput(controller)
  }, [])
  
  // 既存のロジック...
}
```
- **推定時間**: 30分
- **完了条件**: Task 3.1.1のテストがパス

##### 3.1.3 🔄 Refactor: 状態管理の最適化とエラーハンドリング
- **推定時間**: 20分
- **完了条件**: テストが継続してパス

---

#### Task 3.2: 音声合成中の操作制限テスト

##### 3.2.1 ❌ Red: 音声合成中の操作制限テスト
```typescript
// __tests__/components/VoiceInput.audioManager.test.tsx (追加)
describe('VoiceInput Speaking State Control', () => {
  test('音声合成中はマイクボタンが無効化される', () => {
    AudioContextManager.getInstance = vi.fn().mockReturnValue({
      registerVoiceInput: vi.fn(),
      getIsSpeaking: () => true // 音声合成中
    })
    
    render(<VoiceInput onTranscript={vi.fn()} />)
    
    const micButton = screen.getByRole('button', { name: /microphone/i })
    expect(micButton).toBeDisabled()
  })
  
  test('音声合成終了後はマイクボタンが有効になる', () => {
    AudioContextManager.getInstance = vi.fn().mockReturnValue({
      registerVoiceInput: vi.fn(),
      getIsSpeaking: () => false // 音声合成終了
    })
    
    render(<VoiceInput onTranscript={vi.fn()} />)
    
    const micButton = screen.getByRole('button', { name: /microphone/i })
    expect(micButton).not.toBeDisabled()
  })
})
```
- **推定時間**: 30分
- **完了条件**: テストが失敗することを確認

##### 3.2.2 ✅ Green: 音声合成中の操作制限実装
```typescript
// components/VoiceInput.tsx (修正)
export default function VoiceInput({ onTranscript }: VoiceInputProps) {
  const audioManager = AudioContextManager.getInstance()
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  useEffect(() => {
    // AudioContextManagerの状態を監視
    const checkSpeakingState = () => {
      setIsSpeaking(audioManager.getIsSpeaking())
    }
    
    const interval = setInterval(checkSpeakingState, 100)
    return () => clearInterval(interval)
  }, [])
  
  const handleToggle = async () => {
    if (isSpeaking) {
      // 音声合成中は操作不可
      return
    }
    
    // 既存のトグルロジック...
  }
  
  return (
    <button
      onClick={handleToggle}
      disabled={isSpeaking}
      aria-label="microphone"
    >
      {/* マイクアイコン */}
    </button>
  )
}
```
- **推定時間**: 25分
- **完了条件**: Task 3.2.1のテストがパス

##### 3.2.3 🔄 Refactor: リアクティブな状態管理への変更
- **推定時間**: 25分
- **完了条件**: テストが継続してパス

---

## 🎙️ High Priority: Voice Synthesis統合

### 📋 Task 4: useUnifiedVoiceSynthesis統合

#### Task 4.1: 音声合成とAudioContextManager統合テスト

##### 4.1.1 ❌ Red: 音声合成開始時の状態更新テスト
```typescript
// __tests__/hooks/useUnifiedVoiceSynthesis.audioManager.test.ts
describe('useUnifiedVoiceSynthesis AudioContextManager Integration', () => {
  test('speakText開始時にAudioContextManagerのisSpeakingがtrueになる', async () => {
    const mockSetIsSpeaking = vi.fn()
    AudioContextManager.getInstance = vi.fn().mockReturnValue({
      setIsSpeaking: mockSetIsSpeaking
    })
    
    const { result } = renderHook(() => useUnifiedVoiceSynthesis())
    
    act(() => {
      result.current.speakText('テストメッセージ')
    })
    
    expect(mockSetIsSpeaking).toHaveBeenCalledWith(true)
  })
  
  test('speakText完了時にAudioContextManagerのisSpeakingがfalseになる', async () => {
    const mockSetIsSpeaking = vi.fn()
    AudioContextManager.getInstance = vi.fn().mockReturnValue({
      setIsSpeaking: mockSetIsSpeaking
    })
    
    const { result } = renderHook(() => useUnifiedVoiceSynthesis())
    
    await act(async () => {
      await result.current.speakText('テストメッセージ')
    })
    
    expect(mockSetIsSpeaking).toHaveBeenCalledWith(false)
  })
})
```
- **推定時間**: 35分
- **完了条件**: テストが失敗することを確認

##### 4.1.2 ✅ Green: useUnifiedVoiceSynthesis AudioContextManager統合実装
```typescript
// hooks/useUnifiedVoiceSynthesis.ts (修正)
import { AudioContextManager } from '@/libs/audio-context-manager'

export function useUnifiedVoiceSynthesis() {
  const audioManager = AudioContextManager.getInstance()
  
  const speakText = async (text: string) => {
    try {
      // Step 1: グローバル状態更新
      audioManager.setIsSpeaking(true)
      
      // Step 2: 音声合成実行
      const audio = await synthesizeVoice(text)
      await playAudio(audio)
    } catch (error) {
      console.error('Voice synthesis failed:', error)
    } finally {
      // Step 3: 確実な状態リセット
      audioManager.setIsSpeaking(false)
    }
  }
  
  const stopSpeaking = () => {
    audioManager.emergencyStop()
  }
  
  return { speakText, stopSpeaking }
}
```
- **推定時間**: 30分
- **完了条件**: Task 4.1.1のテストがパス

##### 4.1.3 🔄 Refactor: エラーハンドリングとロギング強化
- **推定時間**: 20分
- **完了条件**: テストが継続してパス

---

#### Task 4.2: エラー時の確実な状態リセットテスト

##### 4.2.1 ❌ Red: 音声合成エラー時の状態リセットテスト
```typescript
// __tests__/hooks/useUnifiedVoiceSynthesis.audioManager.test.ts (追加)
describe('useUnifiedVoiceSynthesis Error Handling', () => {
  test('音声合成エラー時でもisSpeakingがfalseにリセットされる', async () => {
    const mockSetIsSpeaking = vi.fn()
    AudioContextManager.getInstance = vi.fn().mockReturnValue({
      setIsSpeaking: mockSetIsSpeaking
    })
    
    // 音声合成でエラーを発生させる
    vi.mocked(synthesizeVoice).mockRejectedValue(new Error('Synthesis failed'))
    
    const { result } = renderHook(() => useUnifiedVoiceSynthesis())
    
    await act(async () => {
      await result.current.speakText('テストメッセージ')
    })
    
    // エラーが発生してもfalseにリセットされる
    expect(mockSetIsSpeaking).toHaveBeenCalledWith(true)
    expect(mockSetIsSpeaking).toHaveBeenCalledWith(false)
  })
})
```
- **推定時間**: 25分
- **完了条件**: テストが失敗することを確認

##### 4.2.2 ✅ Green: エラー時の状態リセット実装
- **推定時間**: 15分（既にfinally句で実装済み）
- **完了条件**: Task 4.2.1のテストがパス

##### 4.2.3 🔄 Refactor: 詳細なエラー分類とログ出力
- **推定時間**: 15分
- **完了条件**: テストが継続してパス

---

## 🔧 Medium Priority: Hardware Echo Cancellation

### 📋 Task 5: 音声制約最適化

#### Task 5.1: OPTIMAL_AUDIO_CONSTRAINTSテスト

##### 5.1.1 ❌ Red: 最適音声制約定義テスト
```typescript
// __tests__/libs/audio-constraints.test.ts
describe('OPTIMAL_AUDIO_CONSTRAINTS', () => {
  test('必須のエコーキャンセレーション設定が含まれている', () => {
    expect(OPTIMAL_AUDIO_CONSTRAINTS.echoCancellation).toBe(true)
    expect(OPTIMAL_AUDIO_CONSTRAINTS.noiseSuppression).toBe(true)
    expect(OPTIMAL_AUDIO_CONSTRAINTS.autoGainControl).toBe(true)
  })
  
  test('最適なサンプリング設定が含まれている', () => {
    expect(OPTIMAL_AUDIO_CONSTRAINTS.channelCount).toBe(1)
    expect(OPTIMAL_AUDIO_CONSTRAINTS.sampleRate).toBe(16000)
  })
  
  test('ブラウザ固有のエコー対策設定が含まれている', () => {
    expect(OPTIMAL_AUDIO_CONSTRAINTS.googEchoCancellation).toBe(true)
    expect(OPTIMAL_AUDIO_CONSTRAINTS.googAudioMirroring).toBe(false)
  })
})
```
- **推定時間**: 20分
- **完了条件**: テストが失敗することを確認

##### 5.1.2 ✅ Green: OPTIMAL_AUDIO_CONSTRAINTS実装
```typescript
// libs/audio-constraints.ts
export const OPTIMAL_AUDIO_CONSTRAINTS = {
  // aituber-kit実証済み設定
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 16000,
  
  // Chrome専用の高度なエコー対策
  googEchoCancellation: true,
  googNoiseSuppression: true,
  googAutoGainControl: true,
  googHighpassFilter: true,
  googAudioMirroring: false,
  
  // Firefox専用設定
  mozEchoCancellation: true,
  mozNoiseSuppression: true,
  mozAutoGainControl: true
} as const
```
- **推定時間**: 15分
- **完了条件**: Task 5.1.1のテストがパス

##### 5.1.3 🔄 Refactor: TypeScript型定義の強化
- **推定時間**: 10分
- **完了条件**: テストが継続してパス

---

#### Task 5.2: useSpeechRecognition音声制約統合テスト

##### 5.2.1 ❌ Red: 最適化された音声制約の適用テスト
```typescript
// __tests__/hooks/useSpeechRecognition.constraints.test.ts
describe('useSpeechRecognition Audio Constraints', () => {
  test('startListening時に最適化された音声制約が適用される', async () => {
    const mockGetUserMedia = vi.fn().mockResolvedValue({})
    navigator.mediaDevices.getUserMedia = mockGetUserMedia
    
    const { result } = renderHook(() => useSpeechRecognition())
    
    await act(async () => {
      await result.current.startListening()
    })
    
    expect(mockGetUserMedia).toHaveBeenCalledWith({
      audio: expect.objectContaining({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 16000
      })
    })
  })
})
```
- **推定時間**: 30分
- **完了条件**: テストが失敗することを確認

##### 5.2.2 ✅ Green: useSpeechRecognition音声制約統合実装
```typescript
// hooks/useSpeechRecognition.ts (修正)
import { OPTIMAL_AUDIO_CONSTRAINTS } from '@/libs/audio-constraints'

export function useSpeechRecognition() {
  const startListening = async () => {
    try {
      // 最適化された音声制約を適用
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: OPTIMAL_AUDIO_CONSTRAINTS
      })
      
      // 音声認識開始
      recognition.start()
      return true
    } catch (error) {
      console.error('Echo-optimized audio setup failed:', error)
      return false
    }
  }
  
  // 既存のロジック...
}
```
- **推定時間**: 25分
- **完了条件**: Task 5.2.1のテストがパス

##### 5.2.3 🔄 Refactor: ブラウザ互換性チェック機能追加
- **推定時間**: 20分
- **完了条件**: テストが継続してパス

---

## 🧪 Integration Priority: E2E統合テスト

### 📋 Task 6: 統合エコー防止テスト

#### Task 6.1: 完全なエコー防止フローテスト

##### 6.1.1 ❌ Red: エコー防止E2Eテスト
```typescript
// __tests__/integration/echo-prevention.integration.test.tsx
describe('Echo Prevention E2E', () => {
  test('完全なエコー防止フロー', async () => {
    render(<ChatPage />)
    
    // 1. ユーザー発話開始
    const micButton = screen.getByRole('button', { name: /microphone/i })
    fireEvent.click(micButton)
    
    // 2. 音声合成開始をシミュレート
    act(() => {
      // メッセージ送信で音声合成がトリガーされる
      fireEvent.submit(screen.getByRole('form'))
    })
    
    // 3. マイクが無効化されることを確認
    expect(micButton).toBeDisabled()
    
    // 4. 音声終了後300ms後にマイク再開
    await waitFor(() => {
      expect(micButton).not.toBeDisabled()
    }, { timeout: 1000 })
  })
  
  test('emergencyStop機能でマイクが即座に再開される', async () => {
    render(<ChatPage />)
    
    // 音声合成中状態にする
    act(() => {
      AudioContextManager.getInstance().setIsSpeaking(true)
    })
    
    // 停止ボタンをクリック
    const stopButton = screen.getByRole('button', { name: /停止/i })
    fireEvent.click(stopButton)
    
    // マイクが即座に再開される
    const micButton = screen.getByRole('button', { name: /microphone/i })
    expect(micButton).not.toBeDisabled()
  })
})
```
- **推定時間**: 45分
- **完了条件**: テストが失敗することを確認

##### 6.1.2 ✅ Green: ChatPage統合実装
```typescript
// app/chat/page.tsx (修正)
export default function ChatPage() {
  const { speakText, stopSpeaking } = useUnifiedVoiceSynthesis()
  
  const handleSendMessage = async (message: string) => {
    const response = await generateResponse(message)
    await speakText(response)
  }
  
  const handleInterrupt = () => {
    stopSpeaking()
  }
  
  return (
    <div>
      <VoiceInput onTranscript={handleSendMessage} />
      <button onClick={handleInterrupt}>停止</button>
    </div>
  )
}
```
- **推定時間**: 30分
- **完了条件**: Task 6.1.1のテストがパス

##### 6.1.3 🔄 Refactor: パフォーマンス最適化と安定性向上
- **推定時間**: 25分
- **完了条件**: テストが継続してパス

---

## 🚀 実行順序と優先度

### **Day 1: Core Infrastructure (4-5時間)**
1. **Task 1.1**: AudioContextManagerシングルトン (35分)
2. **Task 1.2**: VoiceInputController連携 (45分)
3. **Task 1.3**: 音声状態制御 (30分)
4. **Task 1.4**: 300ms遅延再開 (60分)
5. **Task 2.1**: 緊急停止機能 (65分)

### **Day 2: Component Integration (4-5時間)**
6. **Task 3.1**: VoiceInput統合 (75分)
7. **Task 3.2**: 音声合成中操作制限 (80分)
8. **Task 4.1**: useUnifiedVoiceSynthesis統合 (85分)
9. **Task 4.2**: エラー時状態リセット (55分)

### **Day 3: Hardware Optimization (3-4時間)**
10. **Task 5.1**: 音声制約最適化 (45分)
11. **Task 5.2**: useSpeechRecognition統合 (75分)
12. **Task 6.1**: E2E統合テスト (100分)

### **Day 4: Polish & Testing (2-3時間)**
13. 全体リファクタリング
14. パフォーマンス最適化
15. ブラウザ間互換性確認

---

## ✅ 完了基準

### **Technical Success Metrics**
- [ ] 全TDDテストがパス（Red→Green→Refactor完了）
- [ ] エコーループの完全根絶（実動作確認）
- [ ] 音声合成→マイク停止遅延 < 50ms
- [ ] 音声終了→マイク再開遅延 = 300ms±50ms
- [ ] emergencyStop機能の即座応答

### **Code Quality Metrics**
- [ ] TypeScript型安全性確保
- [ ] 単体テストカバレッジ > 90%
- [ ] 統合テストカバレッジ > 80%
- [ ] ESLintエラー0件
- [ ] 循環依存なし

### **User Experience Metrics**
- [ ] 自然な会話フロー維持
- [ ] マイクボタンの直感的な動作
- [ ] エラー時の適切なフォールバック
- [ ] 複数ブラウザでの安定動作

この新しいTDDアプローチにより、aituber-kit実証済みの確実な方法でエコーループを根絶できます。