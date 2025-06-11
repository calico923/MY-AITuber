# エコーループ音声修正計画 - Ultra Think Analysis

## 🚨 根本問題の再分析

### **従来のアプローチの限界**

私が実装していた`HTMLAudioElement.onended`監視アプローチは以下の問題があります：

```
❌ 複雑すぎる実装
- 音声API完了 vs 実際の音声発話完了の監視
- 複数のuseEffectとタイマー管理
- 状態競合とタイミング問題

❌ 不確実な検出
- HTMLAudioElementの状態監視の信頼性
- ブラウザ間の実装差異
- 音声エンジンの多様性（VOICEVOX, WebSpeech, etc）
```

### **AITuber-Kit の洞察**

aituber-kitプロジェクトの調査により判明した**真の解決策**：

#### 🎯 **1. Hardware-First Echo Cancellation**
```javascript
// ブラウザ標準のエコーキャンセレーション
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,  // 最重要
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 16000
  }
})
```

#### 🎯 **2. State-Driven Separation**
```javascript
// グローバル状態による完全分離
const isSpeaking = useGlobalState('isSpeaking')

// 音声合成開始時
const startSpeaking = () => {
  setIsSpeaking(true)
  voiceInput.stopAll() // 即座にマイク停止
}

// 音声合成終了時
const stopSpeaking = () => {
  setIsSpeaking(false)
  setTimeout(() => {
    voiceInput.restart() // 固定遅延後に再開
  }, 300) // 重要: 300ms固定遅延
}
```

#### 🎯 **3. Queue-Based Audio Management**
```javascript
// 音声出力キューによる確実な制御
class SpeakQueue {
  static stopAll() {
    // 全ての音声出力を即座に停止
    synthInstance?.cancel()
    audioElements.forEach(audio => audio.pause())
    setIsSpeaking(false)
  }
}
```

---

## 🔬 Ultra Think: 新しい解決戦略

### **戦略転換の必要性**

従来：`複雑な音声状態監視` → 新戦略：`シンプルな状態分離`

```
旧アプローチ：
音声API → HTMLAudio監視 → onended検出 → タイマー → マイク再開
        ↑ 複雑で不安定

新アプローチ：
音声API → グローバル状態管理 → 固定遅延 → マイク再開
        ↑ シンプルで確実
```

### **新しいアーキテクチャ設計**

#### **Phase 1: Audio Context Manager (最重要)**

```typescript
// libs/audio-context-manager.ts
export class AudioContextManager {
  private static instance: AudioContextManager
  private isSpeaking = false
  private voiceInputRef: VoiceInputController | null = null
  
  // グローバル音声状態管理
  setIsSpeaking(speaking: boolean) {
    this.isSpeaking = speaking
    
    if (speaking) {
      // 音声合成開始: 即座にマイク停止
      this.voiceInputRef?.forceStop()
    } else {
      // 音声合成終了: 300ms後にマイク再開
      setTimeout(() => {
        this.voiceInputRef?.autoRestart()
      }, 300) // aituber-kit実証済みの最適値
    }
  }
  
  // 緊急停止機能
  emergencyStop() {
    // 全音声出力を即座に停止
    speechSynthesis.cancel()
    document.querySelectorAll('audio').forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })
    this.setIsSpeaking(false)
  }
}
```

#### **Phase 2: Hardware Echo Cancellation**

```typescript
// hooks/useSpeechRecognition.ts (修正)
const audioConstraints = {
  audio: {
    // ✅ aituber-kit実証済み設定
    echoCancellation: true,    // 最重要
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 16000,
    
    // ✅ 追加の物理的エコー対策
    googEchoCancellation: true,
    googNoiseSuppression: true,
    googAutoGainControl: true,
    googHighpassFilter: true,
    googAudioMirroring: false  // 音声フィードバック防止
  }
}
```

#### **Phase 3: Unified Voice Controller**

```typescript
// components/VoiceController.tsx (新規)
export function VoiceController() {
  const audioManager = AudioContextManager.getInstance()
  
  // 音声合成の統一制御
  const handleVoiceSynthesis = async (text: string) => {
    // Step 1: 即座にマイク停止
    audioManager.setIsSpeaking(true)
    
    try {
      // Step 2: 音声合成実行
      await voiceSynthesis.speak(text)
    } finally {
      // Step 3: 確実に状態をリセット（エラー時も含む）
      audioManager.setIsSpeaking(false)
    }
  }
  
  // ユーザー発話中断機能
  const handleUserInterrupt = () => {
    audioManager.emergencyStop() // 即座に全停止
  }
}
```

---

## 🎯 具体的実装計画

### **Priority 1: Core Infrastructure (Day 1)**

#### **Task 1.1: AudioContextManager実装**
```typescript
// libs/audio-context-manager.ts
export class AudioContextManager {
  private constructor() {
    // シングルトンパターン
  }
  
  // VoiceInputとの連携
  registerVoiceInput(controller: VoiceInputController) {
    this.voiceInputRef = controller
  }
  
  // 確実な状態同期
  async setIsSpeaking(speaking: boolean) {
    this.isSpeaking = speaking
    
    if (speaking) {
      await this.voiceInputRef?.forceStop()
    } else {
      setTimeout(async () => {
        await this.voiceInputRef?.autoRestart()
      }, 300)
    }
  }
}
```

#### **Task 1.2: VoiceInput統合**
```typescript
// components/VoiceInput.tsx (大幅修正)
export default function VoiceInput({ onTranscript }: VoiceInputProps) {
  const audioManager = AudioContextManager.getInstance()
  
  useEffect(() => {
    // AudioContextManagerに登録
    const controller = {
      forceStop: () => {
        stopListening()
        setIsActive(false)
      },
      autoRestart: async () => {
        if (wasListeningBeforeStop) {
          const success = await startListening()
          setIsActive(success)
        }
      }
    }
    
    audioManager.registerVoiceInput(controller)
  }, [])
  
  // シンプルな制御ロジック
  const handleToggle = async () => {
    if (audioManager.isSpeaking) {
      // 音声合成中は操作不可
      return
    }
    
    if (isListening) {
      stopListening()
    } else {
      await startListening()
    }
  }
}
```

### **Priority 2: Voice Synthesis Integration (Day 2)**

#### **Task 2.1: useUnifiedVoiceSynthesis修正**
```typescript
// hooks/useUnifiedVoiceSynthesis.ts (修正)
export function useUnifiedVoiceSynthesis() {
  const audioManager = AudioContextManager.getInstance()
  
  const speakText = async (text: string) => {
    // Step 1: グローバル状態更新
    audioManager.setIsSpeaking(true)
    
    try {
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

#### **Task 2.2: ChatPage統合**
```typescript
// app/chat/page.tsx (修正)
export default function ChatPage() {
  const { speakText, stopSpeaking } = useUnifiedVoiceSynthesis()
  
  const handleSendMessage = async (message: string) => {
    // AI応答生成
    const response = await generateResponse(message)
    
    // 統合音声制御で発話
    await speakText(response)
  }
  
  const handleInterrupt = () => {
    // ユーザー中断: 即座に全停止
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

### **Priority 3: Hardware Echo Cancellation (Day 3)**

#### **Task 3.1: 音声制約の最適化**
```typescript
// libs/audio-constraints.ts (新規)
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

#### **Task 3.2: useSpeechRecognition修正**
```typescript
// hooks/useSpeechRecognition.ts (修正)
import { OPTIMAL_AUDIO_CONSTRAINTS } from '@/libs/audio-constraints'

export function useSpeechRecognition() {
  const startListening = async () => {
    try {
      // 最適化された音声制約
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
}
```

---

## 🧪 検証戦略

### **Unit Tests**
```typescript
// __tests__/audio-context-manager.test.ts
describe('AudioContextManager', () => {
  test('音声合成開始時にマイクが即座に停止される', async () => {
    const manager = AudioContextManager.getInstance()
    const mockController = { forceStop: jest.fn(), autoRestart: jest.fn() }
    
    manager.registerVoiceInput(mockController)
    manager.setIsSpeaking(true)
    
    expect(mockController.forceStop).toHaveBeenCalled()
  })
  
  test('音声合成終了300ms後にマイクが自動再開される', async () => {
    const manager = AudioContextManager.getInstance()
    const mockController = { forceStop: jest.fn(), autoRestart: jest.fn() }
    
    manager.registerVoiceInput(mockController)
    manager.setIsSpeaking(false)
    
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(mockController.autoRestart).toHaveBeenCalled()
  })
})
```

### **Integration Tests**
```typescript
// __tests__/echo-prevention.integration.test.ts
describe('Echo Prevention Integration', () => {
  test('完全なエコー防止フロー', async () => {
    // 1. ユーザー発話
    fireEvent.click(getByTestId('mic-button'))
    
    // 2. 音声合成開始
    await speakText('テスト応答')
    
    // 3. マイクが停止されていることを確認
    expect(getByTestId('mic-button')).toBeDisabled()
    
    // 4. 音声終了後300ms後にマイク再開
    await waitFor(() => {
      expect(getByTestId('mic-button')).not.toBeDisabled()
    }, { timeout: 400 })
  })
})
```

---

## 📊 成功指標

### **Technical Metrics**
- [ ] エコーループの完全根絶（0件）
- [ ] 音声合成→マイク停止遅延 < 50ms
- [ ] 音声終了→マイク再開遅延 = 300ms±50ms
- [ ] 音声認識精度の維持（> 95%）

### **User Experience Metrics**
- [ ] 自然な会話フロー
- [ ] 中断機能の即座応答
- [ ] 複数ブラウザでの安定動作
- [ ] 長時間使用での性能維持

---

## 🚀 実装順序

### **Week 1: Core Infrastructure**
1. AudioContextManager実装
2. VoiceInput統合
3. Unit Tests

### **Week 2: Voice Integration**
4. useUnifiedVoiceSynthesis修正
5. ChatPage統合
6. Integration Tests

### **Week 3: Hardware Optimization**
7. 音声制約最適化
8. ブラウザ間互換性確保
9. Performance Testing

### **Week 4: Polish & Deployment**
10. Edge Cases処理
11. Error Handling強化
12. Production Deployment

---

## 🔑 重要な技術的洞察

### **1. Simplicity Over Complexity**
HTMLAudioElement監視ではなく、**シンプルな状態管理**が正解

### **2. Hardware-First Approach**
ソフトウェア的な解決より**ブラウザ標準のエコーキャンセレーション**を最優先

### **3. Timing is Everything**
300msの固定遅延は**aituber-kit実証済み**の最適値

### **4. Global State Management**
コンポーネント間の連携より**中央集権的な音声状態管理**

### **5. Fail-Safe Design**
エラー時も**確実に状態をリセット**する仕組み

この新しいアプローチにより、エコーループ問題を根本的かつ確実に解決できます。