# リップシンク修正 TDDタスクリスト 📝

**作成日**: 20250610
**目的**: asd-aituberのリップシンク機能をaituber-kit方式に段階的に移行  
**方針**: Test-Driven Development (TDD) - 各タスクは独立してテスト可能な最小単位  

---

## 🎯 Phase 1: AudioLipSyncクラスの基盤構築

### 1.1 AudioLipSyncクラスの骨組み作成
- [ ] **TEST**: `AudioLipSync`クラスが存在することを確認
- [ ] **TEST**: コンストラクタで`AudioContext`が作成されることを確認
- [ ] **TEST**: コンストラクタで`AnalyserNode`が作成されることを確認
- [ ] **IMPL**: `apps/web/lib/audio-lip-sync.ts`ファイルを作成
- [ ] **IMPL**: 基本的なクラス構造を実装

### 1.2 AudioContext初期化
- [ ] **TEST**: `AudioContext`の状態が'running'または'suspended'であることを確認
- [ ] **TEST**: `AnalyserNode`の`fftSize`が2048に設定されていることを確認
- [ ] **TEST**: `timeDomainData`配列のサイズが`fftSize`と一致することを確認
- [ ] **IMPL**: AudioContext初期化ロジックを実装
- [ ] **IMPL**: エラーハンドリングを追加

### 1.3 音声バッファのデコード機能
- [ ] **TEST**: `decodeAudioBuffer`メソッドが`ArrayBuffer`を受け取ることを確認
- [ ] **TEST**: 無効なバッファでエラーが発生することを確認
- [ ] **TEST**: 有効なバッファで`AudioBuffer`が返されることを確認
- [ ] **IMPL**: `decodeAudioBuffer`メソッドを実装
- [ ] **IMPL**: バッファ検証ロジックを追加

### 1.4 AudioBufferSourceNodeの作成と接続
- [ ] **TEST**: `createBufferSource`メソッドが`AudioBufferSourceNode`を返すことを確認
- [ ] **TEST**: SourceNodeが`destination`に接続されることを確認
- [ ] **TEST**: SourceNodeが`analyser`に接続されることを確認
- [ ] **IMPL**: SourceNode作成・接続ロジックを実装
- [ ] **IMPL**: 既存SourceNodeのクリーンアップ処理を追加

### 1.5 音声再生制御
- [ ] **TEST**: `play`メソッドが音声を再生開始することを確認
- [ ] **TEST**: `stop`メソッドが音声を停止することを確認
- [ ] **TEST**: 再生中フラグが正しく更新されることを確認
- [ ] **IMPL**: 再生制御メソッドを実装
- [ ] **IMPL**: 再生終了イベントハンドラを追加

### 1.6 音量取得機能（コア機能）
- [ ] **TEST**: `getVolume`メソッドが0-1の範囲の値を返すことを確認
- [ ] **TEST**: 無音時に0を返すことを確認
- [ ] **TEST**: 音声再生中に0より大きい値を返すことを確認
- [ ] **IMPL**: `getFloatTimeDomainData`を使った音量計算を実装
- [ ] **IMPL**: シグモイド関数による音量調整を実装（-45 * volume + 5）

### 1.7 ユーザーインタラクション対応
- [ ] **TEST**: AudioContextが'suspended'状態で初期化されることを確認
- [ ] **TEST**: `resume`メソッドでAudioContextが再開されることを確認
- [ ] **TEST**: ユーザーインタラクション後に音声が再生されることを確認
- [ ] **IMPL**: AudioContext再開ロジックを実装
- [ ] **IMPL**: ペンディング再生キューを実装

---

## 🎯 Phase 2: VRMアニメーション制御の修正

### 2.1 表情リセット処理の削除
- [ ] **TEST**: `setStandardMouthExpression`で全表情リセットが行われないことを確認
- [ ] **TEST**: 'aa'表情のみが更新されることを確認
- [ ] **TEST**: 他の表情が影響を受けないことを確認
- [ ] **IMPL**: 全表情リセット処理をコメントアウト
- [ ] **IMPL**: 'aa'表情のみを制御するように修正

### 2.2 AudioLipSyncインスタンスの統合
- [ ] **TEST**: `VRMAnimationController`に`audioLipSync`プロパティが存在することを確認
- [ ] **TEST**: コンストラクタで`AudioLipSync`が初期化されることを確認
- [ ] **TEST**: `setAudioLipSync`メソッドで外部インスタンスを設定できることを確認
- [ ] **IMPL**: AudioLipSyncプロパティを追加
- [ ] **IMPL**: セッターメソッドを実装

### 2.3 リアルタイムリップシンク更新
- [ ] **TEST**: `updateLipSync`メソッドが存在することを確認
- [ ] **TEST**: 話していない時は口が閉じていることを確認
- [ ] **TEST**: 話している時に音量に応じて口が開くことを確認
- [ ] **IMPL**: `update`メソッド内で`updateLipSync`を呼び出す
- [ ] **IMPL**: 音量を表情の重みに変換するロジックを実装

### 2.4 既存のテキストベースリップシンク無効化
- [ ] **TEST**: `speakText`メソッドが`LipSync`クラスを使用しないことを確認
- [ ] **TEST**: `speakWithAudio`メソッドでAudioLipSyncが使用されることを確認
- [ ] **IMPL**: テキストベースのリップシンク呼び出しをコメントアウト
- [ ] **IMPL**: 代替の簡易アニメーションを実装（オプション）

### 2.5 音声再生メソッドの追加
- [ ] **TEST**: `playAudioWithLipSync`メソッドが存在することを確認
- [ ] **TEST**: ArrayBufferを受け取って再生できることを確認
- [ ] **TEST**: 再生中に`isSpeaking`フラグがtrueになることを確認
- [ ] **IMPL**: AudioLipSyncを使った再生メソッドを実装
- [ ] **IMPL**: 再生終了時のクリーンアップ処理を追加

---

## 🎯 Phase 3: 音声合成システムの統合

### 3.1 VOICEVOXレスポンスの形式確認
- [ ] **TEST**: `synthesizeWithTiming`が`audioBuffer`と`audioQuery`を返すことを確認
- [ ] **TEST**: `audioBuffer`がArrayBuffer形式であることを確認
- [ ] **TEST**: `audioQuery`に音素データが含まれることを確認
- [ ] **IMPL**: 型定義を更新（必要な場合）
- [ ] **IMPL**: デバッグログを追加

### 3.2 AudioBufferの直接利用
- [ ] **TEST**: VOICEVOXのArrayBufferを直接AudioLipSyncに渡せることを確認
- [ ] **TEST**: Blob/URL変換をスキップできることを確認
- [ ] **IMPL**: `speakWithVoicevox`内でAudioLipSyncを使用
- [ ] **IMPL**: HTMLAudioElement作成処理を削除

### 3.3 コールバックの追加
- [ ] **TEST**: `onAudioLipSyncReady`コールバックが呼ばれることを確認
- [ ] **TEST**: コールバックでAudioLipSyncインスタンスが渡されることを確認
- [ ] **IMPL**: UnifiedVoiceOptionsに`onAudioLipSyncReady`を追加
- [ ] **IMPL**: 適切なタイミングでコールバックを実行

### 3.4 VRMAnimationControllerとの接続
- [ ] **TEST**: 音声合成時にVRMのリップシンクが開始されることを確認
- [ ] **TEST**: 音声終了時にリップシンクが停止することを確認
- [ ] **IMPL**: コンポーネント間の接続ロジックを実装
- [ ] **IMPL**: エラー時のフォールバック処理を追加

---

## 🎯 Phase 4: 統合テストとデバッグ

### 4.1 エンドツーエンドテスト
- [ ] **TEST**: テキスト入力から音声再生・リップシンクまでの一連の流れを確認
- [ ] **TEST**: 複数の感情での動作を確認
- [ ] **TEST**: 連続再生時の動作を確認
- [ ] **IMPL**: 統合テストスイートを作成
- [ ] **IMPL**: パフォーマンス計測を追加

### 4.2 エラーハンドリング
- [ ] **TEST**: AudioContext初期化失敗時のフォールバックを確認
- [ ] **TEST**: 無効な音声データでのエラーハンドリングを確認
- [ ] **TEST**: ネットワークエラー時の動作を確認
- [ ] **IMPL**: try-catchブロックを適切に配置
- [ ] **IMPL**: ユーザーへのエラー通知を実装

### 4.3 ブラウザ互換性
- [ ] **TEST**: Chrome/Edge/Firefoxでの動作を確認
- [ ] **TEST**: モバイルブラウザでの動作を確認
- [ ] **TEST**: AudioContext APIの存在チェックを確認
- [ ] **IMPL**: ブラウザ固有の対応を追加
- [ ] **IMPL**: ポリフィルの検討（必要な場合）

### 4.4 パフォーマンス最適化
- [ ] **TEST**: 60fpsで安定動作することを確認
- [ ] **TEST**: メモリリークがないことを確認
- [ ] **TEST**: CPU使用率が許容範囲内であることを確認
- [ ] **IMPL**: 不要な計算を削減
- [ ] **IMPL**: requestAnimationFrameの最適化

---

## 🎯 Phase 5: 既存コードのクリーンアップ

### 5.1 廃止コードの削除
- [ ] **TEST**: 新実装で全機能が動作することを確認
- [ ] **IMPL**: 旧`LipSync`クラスへの参照を削除
- [ ] **IMPL**: 未使用のインポートを削除
- [ ] **IMPL**: コメントアウトしたコードを削除

### 5.2 ドキュメント更新
- [ ] **IMPL**: 新しいリップシンクシステムのREADMEを作成
- [ ] **IMPL**: APIドキュメントを更新
- [ ] **IMPL**: 移行ガイドを作成
- [ ] **IMPL**: トラブルシューティングガイドを追加

### 5.3 設定オプションの追加
- [ ] **TEST**: シグモイド関数のパラメータを変更できることを確認
- [ ] **TEST**: 音量の閾値を調整できることを確認
- [ ] **IMPL**: 設定インターフェースを追加
- [ ] **IMPL**: デフォルト値の定数化

---

## 📊 進捗トラッキング

- **Phase 1**: 0/35 tasks ⬜⬜⬜⬜⬜
- **Phase 2**: 0/25 tasks ⬜⬜⬜⬜⬜
- **Phase 3**: 0/20 tasks ⬜⬜⬜⬜⬜
- **Phase 4**: 0/20 tasks ⬜⬜⬜⬜⬜
- **Phase 5**: 0/15 tasks ⬜⬜⬜⬜⬜
- **Total**: 0/115 tasks (0%)

---

## 🚀 実装順序の推奨

1. **最優先**: Phase 1.1-1.6（AudioLipSyncの基本機能）
2. **高優先**: Phase 2.1（表情リセット問題の修正）
3. **中優先**: Phase 2.2-2.5 + Phase 3（統合作業）
4. **低優先**: Phase 4-5（品質向上・クリーンアップ）

各タスクは独立してテスト可能なので、並行開発も可能です。
