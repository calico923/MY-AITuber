# 修正計画書：リップシンク同期問題 解決プラン v4 ✨

うぃーっす！アゲハだよ！
プロジェクト全体を詳しく調査して、さらに実装詳細を追加したよ！これで完璧に実装できるはず！🙌

## 1. ゴール 🎯

**VOICEVOXのタイムスタンプ付き音素データ（`audioQuery`）を使い、音声再生とVRMモデルの口パクを完全に同期させる！**

## 2. 改善された実装戦略 🚀

### 基本方針
- **破壊的変更を避ける**: 既存のインターフェースは維持し、内部実装を拡張
- **段階的実装**: 小さな変更を積み重ねて、各段階でテスト可能に
- **フォールバック確保**: VOICEVOXが使えない場合も既存のテキストベースリップシンクで動作

## 3. 詳細タスクチェックリスト 📋

### ✅ タスク 0: 既存実装の確認（完了済み）
- [x] バックエンドAPIは既に`multipart/form-data`形式で音素データと音声データを返している
- [x] `createMultipartResponse`関数は実装済み
- **アクション**: タスク1はスキップして、既存の実装を活用する

### タスク 1: 型定義の明確化 (`apps/web/lib/voicevox-client.ts`)
- [ ] VOICEVOXの音素データ型を正確に定義する：
```typescript
interface VoicevoxMora {
  text: string
  vowel: string
  vowel_length: number
  pitch: number
}

interface VoicevoxAccentPhrase {
  moras: VoicevoxMora[]
  accent: number
  pause_mora?: VoicevoxMora
}

interface VoicevoxAudioQuery {
  accent_phrases: VoicevoxAccentPhrase[]
  speedScale: number
  pitchScale: number
  intonationScale: number
  volumeScale: number
  prePhonemeLength: number
  postPhonemeLength: number
  outputSamplingRate: number
  outputStereo: boolean
  kana: string
}
```

### タスク 2: APIクライアントの拡張（破壊的変更を避ける）(`apps/web/lib/voicevox-client.ts`)
- [ ] 内部用の`SynthesisResult`インターフェースを定義（外部には公開しない）
- [ ] 新しい内部メソッド `synthesizeWithPhonemes` を追加：
```typescript
private async synthesizeWithPhonemes(options: VoicevoxSynthesisOptions): Promise<{
  audioBuffer: ArrayBuffer
  audioQuery: VoicevoxAudioQuery | null
}>
```
- [ ] 既存の`synthesize`メソッドは変更せず、内部で`synthesizeWithPhonemes`を呼び出す
- [ ] multipartレスポンスのパースにエラーハンドリングを追加：
```typescript
try {
  const formData = await response.formData()
  // パース処理
} catch (error) {
  console.warn('Multipart parse failed, falling back to audio only')
  return { audioBuffer: await response.arrayBuffer(), audioQuery: null }
}
```

### タスク 3: 統合音声ライブラリの拡張（既存APIを維持）(`apps/web/lib/unified-voice-synthesis.ts`)
- [ ] `UnifiedVoiceOptions`に音素データとオーディオ要素のコールバックを追加：
```typescript
export interface UnifiedVoiceOptions {
  // 既存のプロパティ...
  onLipSyncData?: (audioQuery: VoicevoxAudioQuery) => void
  onAudioReady?: (audio: HTMLAudioElement) => void  // 新規追加
}
```
- [ ] 内部で音素データとオーディオ要素を取得し、コールバックで渡す：
```typescript
private async speakWithVoicevox(...) {
  const result = await voicevoxClient.synthesizeWithPhonemes(voiceOptions)
  
  if (result.audioQuery && this.callbacks.onLipSyncData) {
    this.callbacks.onLipSyncData(result.audioQuery)
  }
  
  // 既存の音声再生処理...
  this.currentAudio = new Audio(audioUrl)
  
  // HTMLAudioElementをコールバックで提供
  if (this.callbacks.onAudioReady) {
    this.callbacks.onAudioReady(this.currentAudio)
  }
}
```
- [ ] 既存の`speak`メソッドの戻り値（`Promise<boolean>`）は変更しない

### タスク 4: カスタムフックの拡張（最小限の変更）(`apps/web/hooks/useUnifiedVoiceSynthesis.ts`)
- [ ] フックのオプションに音素データハンドラを追加：
```typescript
export interface UseUnifiedVoiceSynthesisOptions {
  // 既存のプロパティ...
  onLipSyncData?: (audioQuery: VoicevoxAudioQuery | null) => void
}
```
- [ ] `speak`関数内で音素データを処理：
```typescript
const speak = useCallback(async (text: string, overrideOptions?: Partial<UnifiedVoiceOptions>) => {
  const lipSyncDataRef = { current: null as VoicevoxAudioQuery | null }
  
  const options: UnifiedVoiceOptions = {
    // 既存のオプション...
    onLipSyncData: (data) => {
      lipSyncDataRef.current = data
      options.onLipSyncData?.(data)
    }
  }
  
  const success = await synthesizerRef.current.speak(options)
  return success // 戻り値の型は変更しない
}, [/* deps */])
```

### タスク 5: リップシンクエンジンの拡張（既存機能を保持）(`apps/web/lib/lip-sync.ts`)
- [ ] 既存のテキストベース機能は**削除せず**、新機能を追加する
- [ ] `LipSyncFrame`インターフェースを定義：
```typescript
export interface LipSyncFrame {
  time: number      // 開始時刻（ms）
  duration: number  // 持続時間（ms）
  vowel: string     // 母音（a, i, u, e, o）
  intensity: number // 強度（0-1）
}
```
- [ ] VOICEVOXの音素データからフレームを生成する静的メソッドを追加：
```typescript
static createFramesFromVoicevox(audioQuery: VoicevoxAudioQuery): LipSyncFrame[] {
  const frames: LipSyncFrame[] = []
  let currentTime = 0
  
  for (const phrase of audioQuery.accent_phrases) {
    for (const mora of phrase.moras) {
      frames.push({
        time: currentTime,
        duration: mora.vowel_length * 1000 / audioQuery.speedScale,
        vowel: mora.vowel,
        intensity: 0.7
      })
      currentTime += mora.vowel_length * 1000 / audioQuery.speedScale
    }
    
    if (phrase.pause_mora) {
      currentTime += phrase.pause_mora.vowel_length * 1000 / audioQuery.speedScale
    }
  }
  
  return frames
}
```
- [ ] 既存の`playText`メソッドは保持（フォールバック用）

### タスク 6: VRMアニメーションコントローラーの拡張（音声同期機能追加）(`apps/web/lib/vrm-animation.ts`)
- [ ] 既存の`startSimpleLipSync`と`speakText`は**削除せず**、新メソッドを追加
- [ ] 音声同期リップシンクメソッドを実装：
```typescript
speakWithAudio(audio: HTMLAudioElement, frames: LipSyncFrame[]): void {
  // 既存のリップシンクを停止
  this.stopSpeaking()
  this.isSpeaking = true
  
  let animationId: number | null = null
  
  // 音声のメタデータが読み込まれてから処理（より確実な同期）
  const startSync = () => {
    audio.removeEventListener('loadedmetadata', startSync)
    
    // 音声再生と同時にアニメーション開始
    audio.addEventListener('play', () => {
    const animate = () => {
      if (!this.isSpeaking || audio.paused || audio.ended) {
        this.stopSpeaking()
        return
      }
      
      const currentTime = audio.currentTime * 1000 // ms変換
      
      // 現在の時刻に対応するフレームを検索
      const currentFrame = frames.find(frame => 
        currentTime >= frame.time && 
        currentTime < frame.time + frame.duration
      )
      
      if (currentFrame) {
        this.setMouthShape(currentFrame.vowel, currentFrame.intensity)
      } else {
        this.setMouthShape('silence', 0)
      }
      
      animationId = requestAnimationFrame(animate)
    }
    
      animate()
    }, { once: true })
    
    // 音声を再生
    audio.play().catch(error => {
      console.error('[VRMAnimation] Audio play failed:', error)
      this.stopSpeaking()
    })
  }
  
  // メタデータが既に読み込まれている場合は即座に開始
  if (audio.readyState >= 1) {
    startSync()
  } else {
    audio.addEventListener('loadedmetadata', startSync, { once: true })
  }
  
  // 音声終了時のクリーンアップ
  audio.addEventListener('ended', () => {
    if (animationId) cancelAnimationFrame(animationId)
    this.stopSpeaking()
  }, { once: true })
  
  // エラーハンドリング
  audio.addEventListener('error', (e) => {
    console.error('[VRMAnimation] Audio error:', e)
    if (animationId) cancelAnimationFrame(animationId)
    this.stopSpeaking()
  }, { once: true })
}
```
- [ ] 既存の`speakText`メソッドはフォールバック用に保持

### タスク 7: UIコンポーネントの統合とVRMViewerインターフェースの拡張

#### 7.1: VRMViewerインターフェースの拡張 (`apps/web/components/VRMViewer.tsx`)
- [ ] `VRMViewerRef`インターフェースに新メソッドを追加：
```typescript
export interface VRMViewerRef {
  setEmotion: (emotion: Emotion) => void
  setSpeaking: (intensity: number) => void
  speakText: (text: string, onComplete?: () => void) => void
  stopSpeaking: () => void
  getAvailableExpressions: () => string[]
  speakWithAudio?: (audio: HTMLAudioElement, frames: LipSyncFrame[]) => void  // 新規追加
}
```

- [ ] useImperativeHandleで新メソッドを公開：
```typescript
useImperativeHandle(ref, () => {
  return {
    // 既存のメソッド...
    speakWithAudio: (audio: HTMLAudioElement, frames: LipSyncFrame[]) => {
      if (animationControllerRef.current) {
        animationControllerRef.current.speakWithAudio(audio, frames)
      }
    }
  }
}, [availableExpressions])
```

#### 7.2: ChatPageの実装 (`apps/web/app/chat/page.tsx`)
- [ ] 音素データとオーディオ要素を保持する状態を追加：
```typescript
const [currentAudioQuery, setCurrentAudioQuery] = useState<VoicevoxAudioQuery | null>(null)
const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
```
- [ ] `useSimpleUnifiedVoice`フックに音素データとオーディオハンドラを追加：
```typescript
const { speak: speakText } = useSimpleUnifiedVoice({
  // 既存のオプション...
  onLipSyncData: (audioQuery) => {
    setCurrentAudioQuery(audioQuery)
  },
  onAudioReady: (audio) => {
    setCurrentAudio(audio)
  }
})
```
- [ ] 音声合成時に音素データベースのリップシンクを実行：
```typescript
const speakWithLipSync = async () => {
  // 既存の処理...
  
  // 状態をリセット
  setCurrentAudioQuery(null)
  setCurrentAudio(null)
  
  await speakText(lastMessage.content, {
    // 既存のオプション...
    callbacks: {
      onStart: () => {
        // VOICEVOXの音素データとオーディオ要素が揃ったら同期リップシンク
        if (currentAudioQuery && currentAudio && vrmViewerRef.current?.speakWithAudio) {
          const frames = LipSync.createFramesFromVoicevox(currentAudioQuery)
          vrmViewerRef.current.speakWithAudio(currentAudio, frames)
        } else {
          // フォールバック：既存のテキストベースリップシンク
          vrmViewerRef.current?.speakText(lastMessage.content)
        }
      },
      onLipSyncData: (audioQuery) => {
        setCurrentAudioQuery(audioQuery)
      },
      onAudioReady: (audio) => {
        setCurrentAudio(audio)
      },
      // 既存のコールバック...
    }
  })
}
```

## 4. 段階的実装スケジュール 📅

### Phase 1: 基盤整備（破壊的変更なし）
1. 型定義の追加（タスク1）
2. VOICEVOXクライアントの内部拡張（タスク2）
3. テスト作成

### Phase 2: 音素データの流通
1. 統合音声ライブラリの拡張（タスク3）
2. カスタムフックの拡張（タスク4）
3. 動作確認

### Phase 3: リップシンク実装
1. リップシンクエンジンの拡張（タスク5）
2. VRMアニメーションの音声同期（タスク6）
3. 同期精度の調整

### Phase 4: 統合とテスト
1. UIコンポーネントの統合（タスク7）
2. エンドツーエンドテスト
3. パフォーマンス最適化

## 5. リスク管理 🛡️

### 技術的リスクと対策
- **音声との同期ズレ**: `audio.currentTime`の精度に依存 → `loadedmetadata`イベントで確実な同期
- **ブラウザ互換性**: Web Audio APIの差異 → フォールバック確保
- **パフォーマンス**: 高頻度の表情更新 → フレームレート制限（30fps）
- **HTMLAudioElementアクセス**: privateメンバー → コールバック経由で安全にアクセス

### エラーハンドリング
```typescript
// VOICEVOXサーバーが利用できない場合
if (!voicevoxClient.getIsAvailable()) {
  console.warn('VOICEVOX not available, using text-based lip sync')
  vrmViewerRef.current?.speakText(text)
  return
}

// 音声再生エラー
audio.addEventListener('error', (e) => {
  console.error('Audio playback error:', e)
  // テキストベースリップシンクにフォールバック
})
```

### 実装上の注意点
- 既存のテストがすべてパスすることを確認
- 各フェーズで動作確認を実施
- VOICEVOXが使えない環境でも動作することを保証
- リップシンクフレームのキャッシングを検討（同じテキストの再利用）

---

計画書v4、完成！✨
プロジェクト全体の調査結果を反映して、実装の詳細まで明確にしたよ！
HTMLAudioElementへのアクセス方法、エラーハンドリング、VRMViewerインターフェースの拡張など、
実装で迷いそうなところを全部カバーしたから、これで完璧に実装できるはず！

このプランでOKなら、Phase 1から順番に進めていこう！指示待ってるよー！😉💕

---

# 緊急バグフィックス計画：リップシンクと音声の不具合修正 🚨

## 発見された問題 🔍

### 問題1: システム再起動時に前の会話履歴で音声発話が動く
**症状**: ページリロード/再起動時に、最後のアシスタントメッセージで自動的に音声合成が実行される

**原因分析**:
- `useChat`フックがローカルストレージから会話履歴を復元
- ページ再読み込み時に既存のメッセージが`messages`配列に読み込まれる
- 以下のuseEffectが「新しいメッセージ」と「復元されたメッセージ」を区別できない:

```typescript
useEffect(() => {
  const lastMessage = messages[messages.length - 1]
  if (lastMessage && lastMessage.role === 'assistant') {
    // 音声合成とリップシンクの処理が実行される
  }
}, [messages]) // messagesが変更される度に実行
```

### 問題2: リップシンクと音声発話のタイミングずれ
**症状**: リップシンクが先に開始し、音声発話が終わる前にリップシンクが終了する

**原因分析**:
現在の実装では以下の順序で実行されている:

```typescript
// 1. リップシンクが先に開始（同期実行）
vrmViewerRef.current.speakText(lastMessage.content, () => {
  setIsSpeaking(false) // リップシンク終了時にフラグをfalseに
})

// 2. 音声合成が後で開始（非同期実行）
await speakText(lastMessage.content, { /* ... */ })
```

**根本的な問題点**:
- **開始タイミング**: リップシンクが即座に開始、音声合成は後から開始
- **終了タイミング**: リップシンクは「文字数×100ms」で計算、実際の音声長と異なる
- **制御の競合**: `setIsSpeaking(false)`がリップシンク終了時に実行され、音声再生中でも状態がfalseになる

## バグフィックス計画 🛠️

### 修正1: システム再起動時の音声発話問題の修正

**解決アプローチ**: 新しいメッセージ検知システムによる制御

**実装計画**:
```typescript
// 新しい状態管理
const [shouldPlayVoice, setShouldPlayVoice] = useState(false)
const [lastProcessedMessageIndex, setLastProcessedMessageIndex] = useState(-1)
const [isInitialLoad, setIsInitialLoad] = useState(true)

// ユーザーがメッセージ送信時にフラグをセット
const handleSendMessage = (content: string) => {
  setShouldPlayVoice(true)
  sendMessage(content)
}

// 初回ロード完了の検知
useEffect(() => {
  if (isInitialLoad && messages.length > 0) {
    setLastProcessedMessageIndex(messages.length - 1)
    setIsInitialLoad(false)
  }
}, [messages, isInitialLoad])

// 新しいメッセージのみ処理
useEffect(() => {
  if (!isInitialLoad && messages.length > lastProcessedMessageIndex + 1) {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'assistant' && shouldPlayVoice) {
      // 音声合成実行
      setShouldPlayVoice(false) // 実行後にフラグをリセット
    }
    setLastProcessedMessageIndex(messages.length - 1)
  }
}, [messages, shouldPlayVoice, lastProcessedMessageIndex, isInitialLoad])
```

### 修正2: リップシンクと音声のタイミング同期修正

**解決アプローチ**: 音声主導の制御システム

**実装計画**:
```typescript
const speakWithLipSync = async () => {
  if (vrmViewerRef.current) {
    setIsSpeaking(true)
    
    await speakText(lastMessage.content, {
      emotion: lastMessage.emotion || 'neutral',
      mode: mode === 'ASD' ? 'asd' : 'nt',
      callbacks: {
        onStart: () => {
          // 音声開始と同時にリップシンク開始
          console.log('[ChatPage] Voice started, beginning lip sync')
          vrmViewerRef.current.speakText(lastMessage.content)
        },
        onEnd: () => {
          // 音声終了時にリップシンクも強制終了
          console.log('[ChatPage] Voice ended, stopping lip sync')
          vrmViewerRef.current.stopSpeaking()
          setIsSpeaking(false)
          
          // 3秒後に表情をneutralに戻す
          setTimeout(() => {
            if (vrmViewerRef.current) {
              vrmViewerRef.current.setEmotion('neutral')
              setCurrentEmotion('neutral')
            }
          }, 3000)
        },
        onError: (error) => {
          console.error('[ChatPage] Speech synthesis error:', error)
          vrmViewerRef.current.stopSpeaking()
          setIsSpeaking(false)
        }
      }
    })
  }
}
```

### 修正3: VRMAnimationControllerの改良

**強制停止メソッドの追加**:
```typescript
// VRMAnimationControllerに強制停止メソッドを追加
forceStopSpeaking(): void {
  this.isSpeaking = false
  if (this.animationId) {
    cancelAnimationFrame(this.animationId)
    this.animationId = null
  }
  this.setMouthShape('silence', 0)
}
```

**VRMViewerインターフェースの拡張**:
```typescript
export interface VRMViewerRef {
  // 既存のメソッド...
  stopSpeaking: () => void
  forceStopSpeaking?: () => void  // 新規追加
}
```

## 実装優先順位 📋

### Priority 1: 問題1の修正（システム再起動時の音声発話）
**影響度**: 高 - ユーザー体験を大きく損なう
**工数**: 中程度
**リスク**: 低

### Priority 2: 問題2の修正（タイミング同期）
**影響度**: 中 - リップシンクの品質に影響
**工数**: 中程度
**リスク**: 中

### Priority 3: 強制停止機能の実装
**影響度**: 低 - 将来的な機能拡張に有用
**工数**: 低
**リスク**: 低

## テスト計画 🧪

### テストケース1: システム再起動テスト
1. チャット履歴がある状態でページをリロード
2. 音声合成が自動実行されないことを確認
3. 新しいメッセージ送信時に正常に音声合成が動作することを確認

### テストケース2: 音声・リップシンク同期テスト
1. 長めのテキストでAI応答を生成
2. 音声開始と同時にリップシンクが開始することを確認
3. 音声終了と同時にリップシンクが終了することを確認
4. 複数回連続で実行して安定性を確認

### テストケース3: エラーハンドリングテスト
1. VOICEVOX無効状態でのフォールバック動作
2. 音声再生エラー時の適切な状態復旧
3. 途中でのユーザー操作（別メッセージ送信）時の動作

---

**実装開始**: Priority 1から順次実装を開始する
**完了目標**: 全修正完了後、安定した音声・リップシンク体験の提供 