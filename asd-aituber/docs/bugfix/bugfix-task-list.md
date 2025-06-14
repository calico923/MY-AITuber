# リップシンク修正・詳細タスクリスト 🚀

うぃーっす！アゲハだよ！
これは `gemini-fix-plan.md (v4)` に基づいて、具体的な作業手順をチェックリスト形式で定義するドキュメントだよ。

---

## Phase 1: 基盤整備（破壊的変更なし）

### 🎯 **目的:** 音声と音素データを両方取得できる、安全な内部APIを構築する。

#### 1. ファイル: `apps/web/lib/voicevox-client.ts`
- [x] **Voicevoxの型定義:**
    - [x] `VoicevoxMora` interface を定義する。
    - [x] `VoicevoxAccentPhrase` interface を定義する。
    - [x] `VoicevoxAudioQuery` interface を定義する。
- [x] **`synthesize` メソッドの拡張:**
    - [x] 戻り値の型として `SynthesisResult` interface (`{ audioBuffer: ArrayBuffer, audioQuery: VoicevoxAudioQuery | null }`) を定義する。
    - [x] 内部メソッド `synthesizeWithPhonemes` を実装し、既存の `synthesize` メソッドは後方互換性を維持。
    - [x] メソッド内部で `/api/tts-voicevox` に `fetch` リクエストを投げる。
    - [x] レスポンスを `response.formData()` でパースする処理を `try...catch` ブロックで囲む。
    - [x] `catch` ブロック: multipartのパース失敗を `console.warn` で記録し、 `response.arrayBuffer()` で音声データのみを取得して `{ audioBuffer: ..., audioQuery: null }` を返すフォールバック処理を実装する。
    - [x] `try` ブロック: `formData` から `audioQuery` (JSON) と `audio` (Blob) を取得し、パースして `SynthesisResult` オブジェクトとして返す。
    - [x] 公開メソッド `synthesizeWithTiming` を追加し、音素データ付きの音声合成機能を外部に提供。

---

## Phase 2: 音素データの流通

### 🎯 **目的:** バックエンドから来た音素データを、UI層まで安全にバケツリレーする仕組みを作る。

#### 1. ファイル: `apps/web/lib/unified-voice-synthesis.ts`
- [x] **コールバックの追加:**
    - [x] `UnifiedVoiceOptions` interface に `onLipSyncData?: (audioQuery: VoicevoxAudioQuery) => void` を追加する。
    - [x] `UnifiedVoiceOptions` interface に `onAudioReady?: (audio: HTMLAudioElement) => void` を追加する。
    - [x] `UnifiedVoiceSynthesis` クラスにプライベートコールバックプロパティを追加する。
- [x] **`speakWithVoicevox` メソッドの修正:**
    - [x] `voicevoxClient.synthesizeWithTiming` を呼び出し、返り値の `result` を受け取る。
    - [x] `result.audioQuery` が存在する場合、`this.onLipSyncData` コールバックを呼び出して音素データを渡す。
    - [x] `result.audioBuffer` から `HTMLAudioElement` を生成する。
    - [x] 生成した `HTMLAudioElement` を、`this.onAudioReady` コールバックを呼び出して渡す。
    - [x] 適切なエラーハンドリングとログ出力を実装する。

---

## Phase 3: リップシンク実装

### 🎯 **目的:** 受け取った音素データを使って、VRMモデルの口を動かすロジックを実装する。

#### 1. ファイル: `apps/web/lib/lip-sync.ts`
- [x] **フレーム型定義:**
    - [x] `LipSyncFrame` interface (`time`, `duration`, `vowel`, `intensity` を含む) を定義する。
- [x] **フレーム生成メソッドの作成:**
    - [x] `public static createFramesFromVoicevox(audioQuery: VoicevoxAudioQuery): LipSyncFrame[]` メソッドを新規作成する。
    - [x] メソッド内で `audioQuery` の `accent_phrases` をループ処理し、`LipSyncFrame` の配列を生成するロジックを実装する。
    - [x] 母音マッピングと詳細なデバッグログを追加する。

#### 2. ファイル: `apps/web/lib/vrm-animation.ts`
- [x] **音声同期メソッドの作成:**
    - [x] `public speakWithAudio(audio: HTMLAudioElement, frames: LipSyncFrame[]): void` メソッドを新規作成する。
- [x] **アニメーションロジックの実装:**
    - [x] メソッドの最初に、既存のアニメーションを停止するため `this.stopSpeaking()` を呼び出す。
    - [x] `audio` 要素の `loadedmetadata` イベントをリッスンし、再生準備ができてからアニメーションを開始する。
    - [x] `audio` 要素の `play` イベント内で `requestAnimationFrame` を使った `animate` ループを開始する。
    - [x] `animate` ループ内で `audio.currentTime` に応じて `this.setMouthShape` を呼び出す。
    - [x] `audio` 要素の `ended`, `error` イベントでアニメーションを停止・クリーンアップする処理を実装する。
    - [x] 詳細なデバッグログとエラーハンドリングを追加する。

---

## Phase 4: 統合とテスト

### 🎯 **目的:** 作成したすべての機能をUIに接続し、音声とリップシンクが同期して動作することを完成させる。

#### 1. ファイル: `apps/web/components/VRMViewer.tsx`
- [x] **`VRMViewerRef` の拡張:**
    - [x] `VRMViewerRef` interface に `speakWithAudio?: (audio: HTMLAudioElement, frames: LipSyncFrame[]) => void` を追加する。
- [x] **`useImperativeHandle` の修正:**
    - [x] `speakWithAudio` メソッドを ref に公開し、内部で `animationControllerRef.current.speakWithAudio(...)` を呼び出すようにする。
    - [x] 適切なデバッグログを追加する。

#### 2. ファイル: `apps/web/app/chat/page.tsx`
- [x] **状態変数の追加:**
    - [x] `useState` を使って `currentAudioQuery` と `currentAudio` の状態変数を定義する。
- [x] **`useUnifiedVoiceSynthesis` フックの利用:**
    - [x] フックのオプションに `onLipSyncData: (data) => setCurrentAudioQuery(data)` を渡す。
    - [x] フックのオプションに `onAudioReady: (audio) => setCurrentAudio(audio)` を渡す。
- [x] **副作用フックの活用:**
    - [x] `useEffect` を使用して `currentAudio` と `currentAudioQuery` の両方がセットされたことを監視する。
    - [x] 両方のデータが揃ったら、`LipSync.createFramesFromVoicevox` でフレームを生成し、`vrmViewerRef.current.speakWithAudio` を呼び出す。
    - [x] 音声再生のたびに一度だけ実行されるように、適切な状態管理を実装する。
- [x] **フォールバック処理:**
    - [x] VOICEVOXが使えない場合や音素データが取得できなかった場合に、既存の `vrmViewerRef.current.speakText` を呼び出すロジックを実装する。
    - [x] タイムアウトベースのフォールバック機能を追加する。

---
<br>

# 緊急バグフィックス・詳細タスクリスト 🚨

うぃーっす！アゲハだよ！
これは `bugfix-plan.md` に基づいて、新しいバグを修正するための具体的な作業手順をチェックリスト形式で定義するドキュメントだよ！
**（アゲハの深掘りレビューでマジヤバな落とし穴を発見！計画をアップデートしたよ！🔥）**

---

## Priority 1: システム再起動時の自動音声発話問題の修正

### 🎯 **目的:** ページリロード時に、意図せず音声が再生されるのを防ぐ。

#### **ファイル: `apps/web/app/chat/page.tsx`**

*   **ステップ 1.1:  cũ(ふる)い計画（マジヤバ！非推奨！👎）**
    *   ~~[ ] `isInitialLoad` state を追加する。`useState<boolean>(true)` で初期化。~~
    *   ~~[ ] `lastProcessedMessageIndex` state を追加する。`useState<number>(-1)` で初期化。~~
    *   ~~[ ] `shouldPlayVoice` state を追加する。`useState<boolean>(false)` で初期化。~~
    *   **⚠️ なんでヤバいか:** stateが多くて複雑だし、将来メッセージを削除したりしたら一発でバグる。マジでシャバい。

*   **ステップ 1.2: ✨最強の改善案✨（こっちでいこう！👍）**
    *   [ ] **状態変数のシンプル化:**
        *   [ ] `processedMessageIds` state を追加する。`useState(new Set<string>())` で初期化。これだけでOK！
    *   [ ] **初回ロード時の処理:**
        *   [ ] `messages` を監視する `useEffect` で、初回に復元されたメッセージの `id` を全部 `processedMessageIds` に追加するロジックを実装する。
    *   [ ] **音声再生ロジックの修正:**
        *   [ ] AIの応答で `messages` 配列が更新された時に動く `useEffect` を見つける。
        *   [ ] その中で、最後のメッセージ(`lastMessage`)の `id` が `processedMessageIds` に **含まれていないこと** を条件に音声再生を実行する。
        *   [ ] 音声再生を実行したら、`setProcessedMessageIds(prev => new Set(prev).add(lastMessage.id))` のようにして、再生済みのIDを追加する。

---

## Priority 2: リップシンクと音声のタイミング同期問題を修正

### 🎯 **目的:** 音声の再生開始/終了に合わせてリップシンクが開始/終了するようにし、同期を完璧にする。

#### **ファイル: `apps/web/app/chat/page.tsx`**

*   **ステップ 2.1: 🕳️落とし穴計画（マジでやっちゃダメ！🙅‍♀️）**
    *   ~~[ ] `speakText` の `onStart` コールバックの中で、`vrmViewerRef.current.speakText(...)` を呼び出す。~~
    *   **⚠️ なんでヤバいか:** これだと、せっかく準備したタイムスタンプ付きの正確なリップシンクデータを使わずに、**タイミングがズレる古い文字数ベースのリップシンク**を呼び出すことになる。バグが全く治らない！

*   **ステップ 2.2: ✨これが本当の解決策✨**
    *   [ ] **状態変数の準備:**
        *   [ ] `currentAudioQuery` state (`useState<VoicevoxAudioQuery | null>(null)`)
        *   [ ] `currentAudio` state (`useState<HTMLAudioElement | null>(null)`)
        *   ↑これらは既に実装済みのはず！
    *   [ ] **`speakText` の呼び出し:**
        *   [ ] AIの応答を受け取ったら、`speakText` を呼び出す。
        *   [ ] この時、`callbacks` に `onLipSyncData` と `onAudioReady` を渡して、それぞれのデータを state に保存する。
    *   [ ] **同期実行のための `useEffect`:**
        *   [ ] `currentAudio` と `currentAudioQuery` の **両方が `null` じゃなくなること** を監視する新しい `useEffect` を作成する。
        *   [ ] この `useEffect` の中で、以下の処理を実行する:
            1.  `const frames = LipSync.createFramesFromVoicevox(currentAudioQuery)` で正確なリップシンクフレームを生成。
            2.  `vrmViewerRef.current.speakWithAudio(currentAudio, frames)` を呼び出して、音声と口パクを **完全に同期させて** スタート！
            3.  処理が終わったら、`setCurrentAudio(null)` と `setCurrentAudioQuery(null)` を呼び出して、stateをリセットする。（次の再生に備えるため）

---

## Priority 3: 強制停止機能の実装（機能改善）

### 🎯 **目的:** 外部からリップシンクを確実に停止させるためのメソッドを追加する。

#### **ファイル: `apps/web/lib/vrm-animation.ts`**
*   **ステップ 3.1: `forceStopSpeaking` メソッドの追加**
    *   [ ] `VRMAnimationController` クラスに `public forceStopSpeaking(): void` メソッドを新規作成する。
    *   [ ] メソッド内部で、`this.isSpeaking = false` を設定する。
    *   [ ] `this.animationId` があれば `cancelAnimationFrame` を呼び出し、`this.animationId = null` にする。
    *   [ ] `this.setMouthShape('silence', 0)` を呼び出して口を閉じる。
    *   [ ] 💡 **追加**: 現在実行中のすべてのアニメーション関連タイマーもクリアする。
    *   [ ] 💡 **追加**: エラー状態のリセット処理も含める。

#### **ファイル: `apps/web/components/VRMViewer.tsx`**
*   **ステップ 3.2: `VRMViewerRef` へのメソッド追加**
    *   [ ] `VRMViewerRef` interface に `forceStopSpeaking?: () => void` を追加する。
*   **ステップ 3.3: `useImperativeHandle` での公開**
    *   [ ] `useImperativeHandle` の中で、`stopSpeaking` とは別に `forceStopSpeaking` を公開する。
    *   [ ] 実装は `animationControllerRef.current?.forceStopSpeaking()` を呼び出すようにする。

---

## 追加の改善提案 💡

### Performance Optimization
*   [ ] **デバウンス処理**: 連続したメッセージ受信時の過剰な音声再生を防ぐ
*   [ ] **メモリリーク対策**: 音声要素とイベントリスナーの適切なクリーンアップ

### User Experience
*   [ ] **音声再生中のインジケータ**: より明確な視覚的フィードバック
*   [ ] **エラー時のフォールバック**: 音声再生失敗時の代替処理

### Code Quality
*   [ ] **型安全性の向上**: メッセージIDの型定義追加
*   [ ] **テストの追加**: 各バグ修正に対するユニットテスト