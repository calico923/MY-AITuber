# 音声入力エコーループ問題 - TDDタスクリスト

## 🎯 修正計画の検証結果

### ✅ 正しい点
1. **問題分析が的確** - エコーループの根本原因を正確に把握
2. **段階的アプローチ** - 基本的な対策から高度な対策へ順次実装
3. **フォールバック機能** - タイムアウト保護で安全性を確保

### ⚠️ 改善すべき点
1. **タスクが大きすぎる** - TDDには更に細かい分割が必要
2. **テストファースト未徹底** - 各タスクにテスト先行が明記されていない
3. **依存関係が不明瞭** - タスク間の依存を明確化が必要

---

## 📋 TDD方式タスクリスト

### 🔴 Phase 1: 基本的なマイク制御実装（緊急度: HIGH）

#### Task 1.1: VoiceInputコンポーネントのdisabled機能追加

##### 1.1.1 ❌ VoiceInput disabled propのテスト作成
```typescript
// VoiceInput.test.tsx
test('disabled propがtrueの場合、マイクボタンが無効化される', () => {
  const { getByRole } = render(<VoiceInput disabled={true} />)
  expect(getByRole('button', { name: /mic/i })).toBeDisabled()
})
```
- **推定時間**: 15分
- **完了条件**: テストが失敗することを確認

##### 1.1.2 ✅ VoiceInput disabled propの実装
```typescript
interface VoiceInputProps {
  disabled?: boolean
}
```
- **推定時間**: 10分
- **完了条件**: Task 1.1.1のテストがパス

##### 1.1.3 ❌ VoiceInput状態変化通知のテスト作成
```typescript
test('音声認識状態が変化した時にonStateChangeが呼ばれる', () => {
  const onStateChange = jest.fn()
  const { getByRole } = render(<VoiceInput onStateChange={onStateChange} />)
  
  fireEvent.click(getByRole('button'))
  expect(onStateChange).toHaveBeenCalledWith(true)
})
```
- **推定時間**: 20分
- **完了条件**: テストが失敗することを確認

##### 1.1.4 ✅ VoiceInput状態変化通知の実装
```typescript
interface VoiceInputProps {
  onStateChange?: (isListening: boolean) => void
}
```
- **推定時間**: 15分
- **完了条件**: Task 1.1.3のテストがパス

##### 1.1.5 ❌ disabled時の音声認識中断テスト
```typescript
test('disabled propがtrueに変更されたら音声認識が停止する', async () => {
  const { rerender } = render(<VoiceInput disabled={false} />)
  // 音声認識を開始
  // disabledをtrueに変更
  rerender(<VoiceInput disabled={true} />)
  // 音声認識が停止することを確認
})
```
- **推定時間**: 25分
- **完了条件**: テストが失敗することを確認

##### 1.1.6 ✅ disabled時の音声認識中断実装
- **推定時間**: 20分
- **完了条件**: Task 1.1.5のテストがパス

---

#### Task 1.2: ChatPageでのマイク制御統合

##### 1.2.1 ❌ 音声合成開始時のマイク無効化テスト
```typescript
// ChatPage.test.tsx
test('アシスタントの発話開始時にマイクが無効化される', async () => {
  const { getByTestId } = render(<ChatPage />)
  
  // メッセージ送信をシミュレート
  await act(async () => {
    // アシスタントメッセージ受信
  })
  
  expect(getByTestId('voice-input')).toHaveAttribute('disabled', 'true')
})
```
- **推定時間**: 30分
- **完了条件**: テストが失敗することを確認

##### 1.2.2 ✅ 音声合成開始時のマイク無効化実装
- **推定時間**: 25分
- **完了条件**: Task 1.2.1のテストがパス

##### 1.2.3 ❌ 音声合成終了時のマイク有効化テスト
```typescript
test('アシスタントの発話終了時にマイクが有効化される', async () => {
  // 音声合成終了イベントをシミュレート
  // マイクが有効化されることを確認
})
```
- **推定時間**: 25分
- **完了条件**: テストが失敗することを確認

##### 1.2.4 ✅ 音声合成終了時のマイク有効化実装
- **推定時間**: 20分
- **完了条件**: Task 1.2.3のテストがパス

---

#### Task 1.3: タイムアウト保護機能

##### 1.3.1 ❌ 30秒タイムアウトのテスト作成
```typescript
test('マイク無効化から30秒後に自動で有効化される', () => {
  jest.useFakeTimers()
  const { getByTestId } = render(<ChatPage />)
  
  // マイクを無効化
  act(() => {
    // マイク無効化をトリガー
  })
  
  // 30秒経過
  jest.advanceTimersByTime(30000)
  
  expect(getByTestId('voice-input')).not.toHaveAttribute('disabled')
})
```
- **推定時間**: 30分
- **完了条件**: テストが失敗することを確認

##### 1.3.2 ✅ タイムアウト保護の実装
- **推定時間**: 20分
- **完了条件**: Task 1.3.1のテストがパス

##### 1.3.3 ❌ タイムアウトキャンセルのテスト
```typescript
test('正常に音声合成が終了したらタイムアウトがキャンセルされる', () => {
  // タイムアウトが設定されないことを確認
})
```
- **推定時間**: 20分
- **完了条件**: テストが失敗することを確認

##### 1.3.4 ✅ タイムアウトキャンセルの実装
- **推定時間**: 15分
- **完了条件**: Task 1.3.3のテストがパス

---

### 🟡 Phase 2: 統合音声状態管理（重要度: MEDIUM）

#### Task 2.1: VoiceStateManager クラスの実装

##### 2.1.1 ❌ VoiceStateManager基本機能のテスト
```typescript
// voice-state-manager.test.ts
describe('VoiceStateManager', () => {
  test('初期状態が正しく設定される', () => {
    const manager = new VoiceStateManager()
    expect(manager.getState()).toEqual({
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      microphoneEnabled: true
    })
  })
})
```
- **推定時間**: 15分
- **完了条件**: テストが失敗することを確認

##### 2.1.2 ✅ VoiceStateManager基本実装
- **推定時間**: 20分
- **完了条件**: Task 2.1.1のテストがパス

##### 2.1.3 ❌ startSpeaking時の状態変更テスト
```typescript
test('startSpeaking()でisSpeakingがtrueになりmicrophoneEnabledがfalseになる', () => {
  const manager = new VoiceStateManager()
  manager.startSpeaking()
  
  expect(manager.getState().isSpeaking).toBe(true)
  expect(manager.getState().microphoneEnabled).toBe(false)
})
```
- **推定時間**: 15分
- **完了条件**: テストが失敗することを確認

##### 2.1.4 ✅ startSpeaking実装
- **推定時間**: 10分
- **完了条件**: Task 2.1.3のテストがパス

##### 2.1.5 ❌ stopSpeaking時の状態変更テスト
- **推定時間**: 15分
- **完了条件**: テストが失敗することを確認

##### 2.1.6 ✅ stopSpeaking実装
- **推定時間**: 10分
- **完了条件**: Task 2.1.5のテストがパス

##### 2.1.7 ❌ 状態変更リスナーのテスト
```typescript
test('状態変更時にリスナーが呼ばれる', () => {
  const manager = new VoiceStateManager()
  const listener = jest.fn()
  
  manager.subscribe(listener)
  manager.startSpeaking()
  
  expect(listener).toHaveBeenCalledWith(manager.getState())
})
```
- **推定時間**: 20分
- **完了条件**: テストが失敗することを確認

##### 2.1.8 ✅ リスナー機能の実装
- **推定時間**: 25分
- **完了条件**: Task 2.1.7のテストがパス

---

#### Task 2.2: useVoiceState Hookの実装

##### 2.2.1 ❌ useVoiceState基本機能のテスト
```typescript
// useVoiceState.test.ts
test('初期状態が正しく設定される', () => {
  const { result } = renderHook(() => useVoiceState())
  
  expect(result.current.state).toEqual({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    microphoneEnabled: true
  })
})
```
- **推定時間**: 20分
- **完了条件**: テストが失敗することを確認

##### 2.2.2 ✅ useVoiceState基本実装
- **推定時間**: 25分
- **完了条件**: Task 2.2.1のテストがパス

##### 2.2.3 ❌ startSpeaking関数のテスト
```typescript
test('startSpeaking()で状態が更新される', () => {
  const { result } = renderHook(() => useVoiceState())
  
  act(() => {
    result.current.startSpeaking()
  })
  
  expect(result.current.state.isSpeaking).toBe(true)
  expect(result.current.state.microphoneEnabled).toBe(false)
})
```
- **推定時間**: 20分
- **完了条件**: テストが失敗することを確認

##### 2.2.4 ✅ startSpeaking関数の実装
- **推定時間**: 15分
- **完了条件**: Task 2.2.3のテストがパス

---

### 🟢 Phase 3: 高度なエコー対策（改善度: LOW）

#### Task 3.1: EchoCancellationクラスの実装（オプション）

##### 3.1.1 ❌ AudioContext初期化テスト
```typescript
test('AudioContextが正しく初期化される', async () => {
  const echoCancellation = new EchoCancellation()
  await echoCancellation.initialize()
  
  expect(echoCancellation.isInitialized()).toBe(true)
})
```
- **推定時間**: 30分
- **完了条件**: テストが失敗することを確認

##### 3.1.2 ✅ AudioContext初期化実装
- **推定時間**: 40分
- **完了条件**: Task 3.1.1のテストがパス

---

## 📊 実装優先順位とスケジュール

### Week 1: Phase 1実装（必須）
- **Day 1-2**: Task 1.1（VoiceInput拡張）- 約2.5時間
- **Day 3-4**: Task 1.2（ChatPage統合）- 約2時間  
- **Day 5**: Task 1.3（タイムアウト保護）- 約1.5時間

### Week 2: Phase 2実装（推奨）
- **Day 6-7**: Task 2.1（VoiceStateManager）- 約2.5時間
- **Day 8-9**: Task 2.2（useVoiceState Hook）- 約2時間

### Week 3: Phase 3実装（オプション）
- **Day 10+**: Task 3.1（高度なエコー対策）- 約3時間

---

## ✅ 完了基準

### Phase 1完了条件
- [ ] すべてのPhase 1テストがグリーン
- [ ] エコーループが発生しないことを手動確認
- [ ] タイムアウト保護が動作することを確認

### Phase 2完了条件  
- [ ] すべてのPhase 2テストがグリーン
- [ ] 状態管理が正しく動作することを確認
- [ ] UIとの統合が完了

### Phase 3完了条件
- [ ] 高度なエコー対策の実装（オプション）
- [ ] パフォーマンステストの実施

---

## 🚀 開始方法

1. **最初のテストを書く**: Task 1.1.1から開始
2. **テストが失敗することを確認**
3. **最小限の実装でテストをパス**
4. **リファクタリング**
5. **次のテストへ進む**

このTDD方式により、確実に動作する修正を段階的に実装できます。