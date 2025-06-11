# 音声入力エコーループ問題の修正計画

## 🚨 問題の概要

### 現在の問題
音声入力時に、システムが発話中もマイクが聞き取り状態のままになっており、システムの音声出力をそのまま聞き取ってしまい、無限ループが発生している。

```
ユーザー: "こんにちは" 
  ↓ (音声認識)
システム: "こんにちは！元気ですか？" 🔊
  ↓ (マイクが聞き取り継続中)
システム: "こんにちは！元気ですか？" (自分の声を認識)
  ↓ (無限ループ)
システム: "こんにちは！元気ですか？" 🔊
```

### 期待する動作
```
ユーザー: "こんにちは" 
  ↓ (音声認識)
システム: マイク停止 🎤❌
  ↓
システム: "こんにちは！元気ですか？" 🔊
  ↓ (音声出力完了後)
システム: マイク再開 🎤✅
```

## 🔍 根本原因分析

### 1. 音声認識の継続状態
- `SpeechRecognition.continuous = true` により常時聞き取り
- システム発話中もマイクが活性状態
- 出力音声がマイクに戻り込む（エコー現象）

### 2. 音声出力との非同期性
- 音声合成開始/終了の状態管理が不完全
- 音声認識との連携機能なし
- 複数の音声エンジン（VOICEVOX/Web Speech）の状態統合なし

### 3. ハードウェア的要因
- スピーカーとマイクの物理的距離
- エコーキャンセレーション機能の不備
- システム音量設定の影響

---

## 🔥 追加調査: 音声合成API vs 実際の音声発話のタイミング差問題 (2025/01/06)

### 🚨 **現在の実装の致命的欠陥**

#### 問題の核心: **音声合成API完了 ≠ 実際の音声発話完了**

```typescript
// ❌ 現在の実装（問題あり）
useEffect(() => {
  if (isSpeaking) {
    // 音声合成API開始時にマイクOFF
    stopListening()
  } else {
    // 音声合成API終了時にマイクON ← これが問題！
    startListening()  // まだスピーカーから音が出ている可能性
  }
}, [isSpeaking])
```

#### **タイムライン分析**:
```
T=0s   ユーザー: "こんにちは"
T=1s   音声合成API呼び出し開始 → isSpeaking=true → マイクOFF ✅
T=2s   音声合成API処理完了 → isSpeaking=false → マイクON ❌ (問題発生点)
T=3s   実際の音声発話開始 🔊 "こんにちは！元気ですか？"
T=6s   実際の音声発話継続中 🔊 + マイクON → エコーループ発生 ❌
T=8s   実際の音声発話終了
```

#### **エコーループの具体的発生メカニズム**:
1. **T=2s**: 音声合成APIが完了 → `isSpeaking=false`
2. **T=2s**: VoiceInputがマイクを自動ONにする
3. **T=3s-T=8s**: スピーカーから実際の音声が出力中
4. **T=3s-T=8s**: マイクがスピーカー音声を拾い続ける
5. **T=8s**: 音声認識が「こんにちは！元気ですか？」として認識
6. **T=9s**: 新たな音声合成が開始される → エコーループ完成

#### **タイムアウト保護の副作用**:
```typescript
// 30秒タイムアウト保護も問題を悪化
setTimeout(() => {
  setMicTimeoutOverride(true) // 音声発話中でも強制マイクON
}, 30000)
```

### 🎯 **真の解決策の要件**

#### **必要な制御フロー**:
```
1. ユーザー音声入力
2. 音声合成API開始 → マイクOFF
3. 音声合成API完了
4. 実際の音声発話開始 (HTMLAudioElement.play())
5. 実際の音声発話終了 (HTMLAudioElement.onended)
6. 1秒間の安全マージン
7. マイクON
```

#### **監視すべき実際の状態**:
- `isSpeaking` (音声合成API状態) ❌
- `isActuallyPlayingAudio` (HTMLAudioElement再生状態) ✅

#### **実装すべき機能**:
1. **HTMLAudioElementのライフサイクル監視**
   ```typescript
   audio.onplay = () => setIsActuallyPlaying(true)
   audio.onended = () => {
     setIsActuallyPlaying(false)
     setTimeout(() => startListening(), 1000) // 1秒後にマイクON
   }
   ```

2. **音声発話中のタイムアウト保護無効化**
   ```typescript
   // 実際の音声発話中はタイムアウト保護を停止
   if (isActuallyPlayingAudio) {
     clearTimeout(micTimeoutRef.current)
   }
   ```

3. **複数音声エンジン対応**
   - VOICEVOX: HTMLAudioElement経由
   - WebSpeechAPI: SpeechSynthesis.speaking監視

### 📊 **修正優先度**

#### **Critical Priority (即座修正必要)**:
1. HTMLAudioElement.onended イベント監視
2. 音声発話完了から1秒後のマイクON
3. 音声発話中のタイムアウト保護無効化

#### **High Priority**:
1. 複数音声エンジンの統一制御
2. エラー時のフォールバック機能

#### **Medium Priority**:
1. 音声発話の重複制御
2. ユーザビリティ向上

## 🎯 修正戦略

### Phase 1: 基本的なマイク制御
1. **音声出力連動マイク制御**
   - 音声合成開始時に自動的にマイク停止
   - 音声合成終了時に自動的にマイク再開
   - タイムアウト保護（最大30秒後に強制再開）

### Phase 2: 統合音声状態管理
2. **UnifiedVoiceController の実装**
   - 音声認識と音声合成の統合状態管理
   - `isSpeaking` フラグによる排他制御
   - エラー時の自動復旧機能

### Phase 3: 高度なエコー対策
3. **音響エコーキャンセレーション**
   - Web Audio API による音響処理
   - 適応フィルタによるエコー除去
   - 音量レベル監視による動的制御

## 📋 実装計画（TDD）

### Phase 1.1: 基本マイク制御実装

#### Task 1.1.1: VoiceInputコンポーネントの拡張
```typescript
interface VoiceInputProps {
  // 既存のprops...
  disabled?: boolean // 外部からの無効化制御
  onStateChange?: (isListening: boolean) => void // 状態変化通知
}
```

#### Task 1.1.2: 音声合成開始時のマイク停止
```typescript
// useChat.ts内
const handleSendMessage = async (message: string) => {
  // マイクを停止
  setMicrophoneDisabled(true)
  
  // メッセージ送信処理...
  await sendMessage(message)
}
```

#### Task 1.1.3: 音声合成終了時のマイク再開
```typescript
// UnifiedVoiceSynthesis callbacks
onEnd: () => {
  // 音声合成終了
  setMicrophoneDisabled(false) // マイク再開
},
onError: () => {
  // エラー時も必ず再開
  setMicrophoneDisabled(false)
}
```

### Phase 1.2: タイムアウト保護機能

#### Task 1.2.1: 強制マイク再開タイマー
```typescript
useEffect(() => {
  if (microphoneDisabled) {
    // 30秒後に強制的にマイク再開
    const timer = setTimeout(() => {
      console.warn('[VoiceInput] 強制マイク再開（タイムアウト）')
      setMicrophoneDisabled(false)
    }, 30000)
    
    return () => clearTimeout(timer)
  }
}, [microphoneDisabled])
```

### Phase 2.1: 統合音声状態管理

#### Task 2.1.1: VoiceStateManager の作成
```typescript
interface VoiceState {
  isListening: boolean    // 音声認識中
  isSpeaking: boolean     // 音声合成中
  isProcessing: boolean   // AI処理中
  microphoneEnabled: boolean
}

class VoiceStateManager {
  private state: VoiceState
  private listeners: ((state: VoiceState) => void)[]
  
  startSpeaking() {
    this.setState({
      isSpeaking: true,
      microphoneEnabled: false // 自動でマイク停止
    })
  }
  
  stopSpeaking() {
    this.setState({
      isSpeaking: false,
      microphoneEnabled: true // 自動でマイク再開
    })
  }
}
```

#### Task 2.1.2: React Hook統合
```typescript
export function useVoiceState() {
  const [state, setState] = useState<VoiceState>(defaultState)
  
  const startSpeaking = useCallback(() => {
    voiceStateManager.startSpeaking()
  }, [])
  
  const stopSpeaking = useCallback(() => {
    voiceStateManager.stopSpeaking()
  }, [])
  
  return { state, startSpeaking, stopSpeaking }
}
```

### Phase 2.2: 統合コンポーネント更新

#### Task 2.2.1: ChatPage の統合
```typescript
export default function ChatPage() {
  const { state, startSpeaking, stopSpeaking } = useVoiceState()
  
  // 音声合成開始時
  useEffect(() => {
    if (newAssistantMessage) {
      startSpeaking() // マイクを自動停止
      
      speakText(message.content, {
        callbacks: {
          onEnd: () => {
            stopSpeaking() // マイクを自動再開
          },
          onError: () => {
            stopSpeaking() // エラー時も再開
          }
        }
      })
    }
  }, [messages])
  
  return (
    <VoiceInput 
      disabled={state.isSpeaking || state.isProcessing}
      onStateChange={(listening) => {
        // 状態変化を統合管理
      }}
    />
  )
}
```

### Phase 3.1: 高度なエコー対策

#### Task 3.1.1: AudioContext エコーキャンセレーション
```typescript
class EchoCancellation {
  private audioContext: AudioContext
  private microphoneStream: MediaStream
  private outputMonitor: AnalyserNode
  
  async initialize() {
    // マイク入力の取得
    this.microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,  // ブラウザ標準のエコーキャンセル
        noiseSuppression: true,
        autoGainControl: true
      }
    })
    
    // 出力音声の監視
    this.outputMonitor = this.audioContext.createAnalyser()
    // システム音声出力と連携...
  }
  
  isEchoDetected(): boolean {
    // 出力音声レベルと入力音声レベルの相関分析
    // 閾値を超えた場合はエコーと判定
  }
}
```

#### Task 3.1.2: 動的音量制御
```typescript
class AdaptiveVolumeControl {
  adjustSystemVolume(inputLevel: number) {
    // 入力音声レベルに応じてシステム音量を動的調整
    // 高い入力 → 低い出力音量でエコーを防止
  }
  
  detectFeedbackLoop(): boolean {
    // 音声パターンの周期性分析
    // ループ検出時は緊急停止
  }
}
```

## 🧪 テスト計画

### Unit Tests
```typescript
describe('VoiceStateManager', () => {
  test('音声合成開始時にマイクが停止される', () => {
    const manager = new VoiceStateManager()
    manager.startSpeaking()
    expect(manager.getState().microphoneEnabled).toBe(false)
  })
  
  test('音声合成終了時にマイクが再開される', () => {
    const manager = new VoiceStateManager()
    manager.startSpeaking()
    manager.stopSpeaking()
    expect(manager.getState().microphoneEnabled).toBe(true)
  })
  
  test('タイムアウト時に強制的にマイクが再開される', async () => {
    const manager = new VoiceStateManager()
    manager.startSpeaking()
    
    // 30秒待機をシミュレート
    jest.advanceTimersByTime(30000)
    
    expect(manager.getState().microphoneEnabled).toBe(true)
  })
})
```

### Integration Tests
```typescript
describe('VoiceInput Integration', () => {
  test('システム発話中はマイクが無効化される', async () => {
    const { getByTestId } = render(<ChatPage />)
    
    // メッセージ送信
    fireEvent.click(getByTestId('send-button'))
    
    // マイクボタンが無効化されることを確認
    expect(getByTestId('microphone-button')).toBeDisabled()
  })
  
  test('音声合成終了後にマイクが再開される', async () => {
    // 音声合成の完了をシミュレート
    // マイクの再開を確認
  })
})
```

### Manual Tests
1. **基本エコー防止テスト**
   - ユーザーが話す → システムが応答 → マイクが自動停止/再開を確認

2. **エラー耐性テスト**
   - 音声合成エラー時のマイク状態復旧を確認
   - ネットワークエラー時の動作確認

3. **パフォーマンステスト**
   - 長時間の対話でのメモリリークチェック
   - 複数回の停止/再開サイクルの安定性

## 📁 ファイル構成

```
apps/web/
├── lib/
│   ├── voice-state-manager.ts          # 統合音声状態管理
│   ├── echo-cancellation.ts            # エコーキャンセレーション
│   └── adaptive-volume-control.ts      # 動的音量制御
├── hooks/
│   ├── useVoiceState.ts                # 音声状態管理Hook
│   └── useEchoPrevention.ts            # エコー防止Hook
├── components/
│   └── VoiceInput.tsx                  # マイク制御強化
└── test/
    ├── lib/
    │   ├── voice-state-manager.test.ts
    │   └── echo-cancellation.test.ts
    └── integration/
        └── voice-echo-prevention.test.ts
```

## 🎯 優先順位と実装順序

### 🔥 緊急度: High (Phase 1)
**目標**: エコーループの即座停止
- Task 1.1.1-1.1.3: 基本マイク制御
- Task 1.2.1: タイムアウト保護

### 🔧 重要度: Medium (Phase 2) 
**目標**: 堅牢な状態管理
- Task 2.1.1-2.1.2: VoiceStateManager
- Task 2.2.1: 統合UI更新

### ⚡ 改善度: Low (Phase 3)
**目標**: 高度なエコー対策
- Task 3.1.1-3.1.2: AudioContext活用

## 🚀 Phase 1 実装開始

**即座に取り組むべき最小限の修正:**

1. `VoiceInput` コンポーネントに `disabled` prop 追加
2. `ChatPage` で音声合成状態と連動
3. タイムアウト保護の実装

これにより、エコーループ問題を根本的に解決し、安定した音声対話システムを実現できます。