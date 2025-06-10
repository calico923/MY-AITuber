# リップシンク問題 完全解析レポート 🔍

**調査日**: 2025-06-09  
**症状**: 音声発話とリップシンクが全く同期せず、口が動かない状態  
**調査対象**: asd-aituber vs aituber-kit の実装比較  

---

## 🚨 問題の核心

現在のasd-aituberのリップシンク実装は**根本的に設計が間違っています**。

### 現在の実装（非動作）
```typescript
// ❌ 問題のあるアプローチ：テキストベース擬似同期
1. HTMLAudioElement で音声再生
2. requestAnimationFrame で独立したタイマー動作 
3. 文字数ベースの時間計算でフェイクリップシンク
4. 3つのシステムが独立して動作（同期不可能）
```

### 作動するaituber-kit実装
```typescript
// ✅ 正しいアプローチ：リアルタイム音声解析
1. AudioContext で音声再生
2. AnalyserNode で実際の音声ボリューム取得
3. 60fps でリアルタイムに口の開き具合を制御
4. 音声と口パクが物理的に接続
```

---

## 🔧 技術的根本原因分析

### 1. **致命的問題: 音声接続の欠如**

#### aituber-kit（動作する）
```typescript
// aituber-kit/src/features/lipSync/lipSync.ts
export class LipSync {
  public readonly audio: AudioContext
  public readonly analyser: AnalyserNode
  public readonly timeDomainData: Float32Array

  constructor(audio: AudioContext) {
    this.audio = audio
    this.analyser = audio.createAnalyser()
    // ✅ 実際の音声データを解析
  }

  public update(): LipSyncAnalyzeResult {
    this.analyser.getFloatTimeDomainData(this.timeDomainData)
    
    let volume = 0.0
    for (let i = 0; i < TIME_DOMAIN_DATA_LENGTH; i++) {
      volume = Math.max(volume, Math.abs(this.timeDomainData[i]))
    }
    
    // シグモイド関数で音量を調整
    volume = 1 / (1 + Math.exp(-45 * volume + 5))
    if (volume < 0.1) volume = 0
    
    return { volume } // ✅ 実際の音声ボリューム
  }
}
```

#### asd-aituber（動作しない）
```typescript
// asd-aituber/apps/web/lib/lip-sync.ts
export class LipSync {
  // ❌ AudioContext なし
  // ❌ AnalyserNode なし  
  // ❌ 実際の音声解析なし
  
  play(phonemes: PhonemeData[], onPhonemeChange: (phoneme: string, intensity: number) => void) {
    const animate = (currentTime: number) => {
      const elapsedTime = currentTime - startTime
      // ❌ 文字数 × 100ms の擬似タイミング
      // ❌ 実際の音声とは無関係
      const progress = elapsedTime / (phonemes.length * 100)
      this.onPhonemeChange(currentPhoneme.phoneme, 0.7) // ❌ 固定値
    }
    requestAnimationFrame(animate)
  }
}
```

### 2. **表情制御の競合問題**

#### asd-aituber の問題コード
```typescript
// asd-aituber/apps/web/lib/vrm-animation.ts:547-577
private setStandardMouthExpression(phoneme: string, intensity: number): void {
  const expressionManager = this.vrm.expressionManager!
  const available = this.vowelExpressionInfo!.available
  
  // ❌ 毎フレーム全ての口表情をリセット
  const allMouthExpressions = ['aa', 'ih', 'ou', 'ee', 'oh']
  allMouthExpressions.forEach(expr => {
    if (available.includes(expr)) {
      try {
        expressionManager.setValue(expr, 0) // ❌ すべて0にリセット
      } catch (error) {
        // Skip silently
      }
    }
  })

  // 口表情を設定しようとする
  if (phoneme !== 'silence' && available.includes('aa')) {
    try {
      expressionManager.setValue('aa', intensity) // ❌ 上でリセット済みなので無効
    } catch (error) {
      console.error(`Error setting 'aa' expression:`, error)
    }
  }
}
```

**問題**: 毎フレーム表情をリセット → 設定 → リセットが繰り返され、結果的に口が動かない

#### aituber-kit の正しい実装
```typescript
// aituber-kit/src/features/emoteController/expressionController.ts
public lipSync(preset: VRMExpressionPresetName, value: number) {
  // ✅ 前の口表情のみクリア
  if (this._currentLipSync) {
    this._expressionManager?.setValue(this._currentLipSync.preset, 0)
  }
  // ✅ 新しい口表情を設定
  this._currentLipSync = { preset, value }
}

public update(delta: number) {
  if (this._currentLipSync) {
    const weight = this._currentEmotion === 'neutral'
      ? this._currentLipSync.value * 0.5 // ✅ 感情に応じた重み調整
      : this._currentLipSync.value * 0.25
    this._expressionManager?.setValue(this._currentLipSync.preset, weight) // ✅ 実際に口が動く
  }
}
```

### 3. **音声再生方法の違い**

#### aituber-kit（リアルタイム解析可能）
```typescript
// aituber-kit/src/features/messages/speakCharacter.ts
const bufferSource = this.audio.createBufferSource()
bufferSource.buffer = audioBuffer

// ✅ 音声を解析器にも接続
bufferSource.connect(this.destination)
bufferSource.connect(this.lipSync.analyser) // ← ここが重要！

bufferSource.start()
this.lipSync.start() // リアルタイム解析開始
```

#### asd-aituber（解析不可能）
```typescript
// asd-aituber/apps/web/lib/unified-voice-synthesis.ts
this.currentAudio = new Audio(audioUrl) // ❌ HTMLAudioElement
this.currentAudio.volume = volume

// ❌ AnalyserNode への接続なし
// ❌ リアルタイム音声解析不可能
await this.currentAudio.play()
```

---

## 📊 比較表：動作する vs 動作しない

| 要素 | aituber-kit（✅動作） | asd-aituber（❌不動作） |
|------|---------------------|----------------------|
| **音声システム** | AudioContext + AnalyserNode | HTMLAudioElement |
| **同期方法** | リアルタイム音量解析 | テキスト長ベース擬似タイミング |
| **更新頻度** | 60fps（毎フレーム） | requestAnimationFrame（不規則） |
| **口表情制御** | 単一表情の重み制御 | 全表情リセット+設定の競合 |
| **音声接続** | bufferSource.connect(analyser) | 接続なし |
| **ボリューム取得** | getFloatTimeDomainData() | 取得不可 |
| **結果** | 完璧に同期 | 全く動かない |

---

## 🎯 解決策: aituber-kit方式への移行

### Phase 1: AudioContext ベースの音声システム

```typescript
// 新しい音声リップシンククラス
export class AudioLipSync {
  private audioContext: AudioContext
  private analyser: AnalyserNode
  private currentSource: AudioBufferSourceNode | null = null
  private timeDomainData: Float32Array
  
  constructor() {
    this.audioContext = new AudioContext()
    this.analyser = this.audioContext.createAnalyser()
    this.analyser.fftSize = 2048
    this.timeDomainData = new Float32Array(this.analyser.fftSize)
  }
  
  async playWithLipSync(audioBuffer: ArrayBuffer): Promise<void> {
    // AudioBuffer にデコード
    const decodedBuffer = await this.audioContext.decodeAudioData(audioBuffer)
    
    // BufferSource を作成
    const source = this.audioContext.createBufferSource()
    source.buffer = decodedBuffer
    
    // ✅ 重要: 出力と解析の両方に接続
    source.connect(this.audioContext.destination) // スピーカー出力
    source.connect(this.analyser)                 // リアルタイム解析
    
    // 再生開始
    source.start()
    this.currentSource = source
  }
  
  // aituber-kit と同じアルゴリズム
  getVolume(): number {
    this.analyser.getFloatTimeDomainData(this.timeDomainData)
    
    let volume = 0.0
    for (let i = 0; i < this.timeDomainData.length; i++) {
      volume = Math.max(volume, Math.abs(this.timeDomainData[i]))
    }
    
    // シグモイド変換（aituber-kit と同じ）
    volume = 1 / (1 + Math.exp(-45 * volume + 5))
    return volume < 0.1 ? 0 : volume
  }
  
  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop()
      this.currentSource = null
    }
  }
}
```

### Phase 2: VRM アニメーション制御の修正

```typescript
// vrm-animation.ts の修正版
export class VRMAnimationController {
  private audioLipSync: AudioLipSync | null = null
  
  constructor(vrm: VRM) {
    this.vrm = vrm
    this.audioLipSync = new AudioLipSync()
  }
  
  // ✅ シンプルで効果的な口制御
  private updateLipSync(): void {
    if (!this.audioLipSync || !this.isSpeaking) return
    
    const volume = this.audioLipSync.getVolume()
    const expressionManager = this.vrm.expressionManager
    
    if (expressionManager) {
      // ✅ 'aa' 表情のみ制御（他は触らない）
      const weight = volume * 0.5 // aituber-kit と同じ重み
      expressionManager.setValue('aa', weight)
    }
  }
  
  update(deltaTime: number): void {
    // 既存の更新処理...
    this.updateLipSync() // ← 毎フレーム呼び出し
  }
  
  async speakWithAudio(audioBuffer: ArrayBuffer): Promise<void> {
    this.isSpeaking = true
    await this.audioLipSync.playWithLipSync(audioBuffer)
  }
  
  stopSpeaking(): void {
    this.isSpeaking = false
    this.audioLipSync?.stop()
    
    // 口を閉じる
    const expressionManager = this.vrm.expressionManager
    if (expressionManager) {
      expressionManager.setValue('aa', 0)
    }
  }
}
```

### Phase 3: 統合音声システムの修正

```typescript
// unified-voice-synthesis.ts の修正
export class UnifiedVoiceSynthesis {
  private audioLipSync: AudioLipSync | null = null
  
  constructor() {
    this.audioLipSync = new AudioLipSync()
  }
  
  private async speakWithVoicevox(
    text: string,
    emotion: Emotion,
    mode: 'asd' | 'nt',
    speaker: string | number,
    volume: number
  ): Promise<boolean> {
    try {
      this.callbacks.onStart?.()
      this.isPlaying = true

      // VOICEVOX で音声合成
      const voiceOptions = createEmotionalVoiceOptions(text, emotion, mode, speaker)
      const result = await voicevoxClient.synthesizeWithTiming(voiceOptions)
      
      // ✅ AudioContext で再生（HTMLAudioElement ではない）
      await this.audioLipSync.playWithLipSync(result.audioBuffer)
      
      // ✅ VRM アニメーションに AudioLipSync インスタンスを渡す
      if (this.onAudioLipSyncReady) {
        this.onAudioLipSyncReady(this.audioLipSync)
      }
      
      return true
    } catch (error) {
      console.error('VOICEVOX synthesis failed:', error)
      return false
    }
  }
}
```

---

## 🚀 実装優先度

### 高優先度（即座に修正）
1. **AudioContext ベースの音声再生システム** - HTMLAudioElement を完全置換
2. **AnalyserNode 接続** - リアルタイム音声解析の実装
3. **表情競合の除去** - 全表情リセット処理の削除

### 中優先度（動作確認後）
4. **aituber-kit 準拠のシグモイド音量変換** - 自然な口の動き
5. **エラーハンドリング改善** - AudioContext の適切な管理

### 低優先度（最適化フェーズ）
6. **音量調整パラメータ** - 感情による重み調整
7. **パフォーマンス最適化** - リアルタイム処理の軽量化

---

## 🧪 検証方法

### テスト 1: 音声接続確認
```typescript
// AudioContext の接続を確認
const audioLipSync = new AudioLipSync()
console.log('AudioContext state:', audioLipSync.audioContext.state)
console.log('Analyser connected:', !!audioLipSync.analyser)
```

### テスト 2: 音量取得確認  
```typescript
// リアルタイム音量を確認
setInterval(() => {
  const volume = audioLipSync.getVolume()
  console.log('Current volume:', volume)
}, 100)
```

### テスト 3: VRM 表情制御確認
```typescript
// 手動で口を動かして確認
const expressionManager = vrm.expressionManager
expressionManager.setValue('aa', 0.5) // 口が開くか確認
```

---

## 📈 期待される結果

### 修正前（現在）
- ❌ 口が全く動かない
- ❌ 音声とリップシンクが無関係
- ❌ 複雑で理解困難なコード

### 修正後（期待値）
- ✅ 音声ボリュームに応じてリアルタイムに口が動く
- ✅ 音声と完全に同期したリップシンク
- ✅ シンプルで保守しやすいコード
- ✅ aituber-kit と同等の品質

---

**結論**: 現在の実装は根本的に間違ったアプローチです。aituber-kit の実証済みの AudioContext + AnalyserNode 方式に移行することで、確実に動作するリップシンクを実現できます。

**次のアクション**: AudioLipSync クラスの実装から開始し、段階的に置換していくことを推奨します。