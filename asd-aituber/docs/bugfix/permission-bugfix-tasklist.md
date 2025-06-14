# Permission & Session Management Bugfix - TDD Task List

## 🎯 TDD実装タスクリスト

### 📋 タスク実行ルール
- 各タスクは **テスト作成 → 実装 → リファクタリング** の順で実行
- 1タスクは最大2時間で完了する規模
- 各タスクは独立してテスト・実行可能
- ✅ = 完了、🚧 = 進行中、⏸️ = 待機中

---

## Phase 1: 会話永続化問題の解決（Critical）

### 1.1 メッセージ型定義の拡張 [⏸️]
**所要時間**: 30分

#### 1.1.1 失敗するテストの作成
```typescript
// __tests__/types/message.test.ts
test('Messageインターフェースにセッション関連フラグが存在する', () => {
  const message: Message = {
    id: '1',
    content: 'test',
    role: 'user',
    timestamp: Date.now(),
    isFromSession: true,
    hasBeenSpoken: false
  }
  
  expect(message.isFromSession).toBeDefined()
  expect(message.hasBeenSpoken).toBeDefined()
})
```

#### 1.1.2 最小実装
- [ ] `types/message.ts`にフラグを追加
- [ ] TypeScript型エラーの解消

#### 1.1.3 完了条件
- [ ] テストが全てグリーン
- [ ] 既存コードへの影響なし

---

### 1.2 SessionManager - フラグ付与機能 [⏸️]
**所要時間**: 1時間

#### 1.2.1 失敗するテストの作成
```typescript
// __tests__/lib/session-manager.test.ts
describe('SessionManager.loadSession', () => {
  test('復元されたメッセージにisFromSessionフラグが付与される', () => {
    // セッションデータを保存
    const originalMessages = [
      { id: '1', content: 'test', role: 'assistant' }
    ]
    localStorage.setItem('session-key', JSON.stringify({
      messages: originalMessages
    }))
    
    // 読み込み
    const session = SessionManager.loadSession()
    
    expect(session.messages[0].isFromSession).toBe(true)
    expect(session.messages[0].hasBeenSpoken).toBe(true)
  })
})
```

#### 1.2.2 最小実装
- [ ] `loadSession`メソッドの修正
- [ ] フラグ付与ロジックの実装

#### 1.2.3 完了条件
- [ ] 復元時に適切なフラグが付与される
- [ ] 既存のセッションデータとの互換性維持

---

### 1.3 音声合成制御 - セッションメッセージのスキップ [⏸️]
**所要時間**: 1.5時間

#### 1.3.1 失敗するテストの作成
```typescript
// __tests__/hooks/use-speech-synthesis.test.ts
test('isFromSessionフラグがtrueのメッセージは音声合成されない', async () => {
  const mockSpeakText = vi.fn()
  const { result } = renderHook(() => useSpeechSynthesis())
  
  const sessionMessage = {
    id: '1',
    content: 'セッションから復元',
    role: 'assistant',
    isFromSession: true
  }
  
  await act(async () => {
    await result.current.processMessage(sessionMessage)
  })
  
  expect(mockSpeakText).not.toHaveBeenCalled()
})

test('新規メッセージは音声合成される', async () => {
  const mockSpeakText = vi.fn()
  const { result } = renderHook(() => useSpeechSynthesis())
  
  const newMessage = {
    id: '2',
    content: '新規メッセージ',
    role: 'assistant',
    isFromSession: false
  }
  
  await act(async () => {
    await result.current.processMessage(newMessage)
  })
  
  expect(mockSpeakText).toHaveBeenCalledWith('新規メッセージ')
})
```

#### 1.3.2 最小実装
- [ ] 音声合成フックの条件分岐追加
- [ ] フラグチェックロジックの実装

#### 1.3.3 完了条件
- [ ] セッションメッセージがスキップされる
- [ ] 新規メッセージのみ音声合成される

---

### 1.4 統合テスト - ページリロードシナリオ [⏸️]
**所要時間**: 1時間

#### 1.4.1 失敗するテストの作成
```typescript
// __tests__/integration/page-reload.test.tsx
test('ページリロード時に音声合成が発生しない', async () => {
  // 初回レンダリング
  const { unmount } = render(<ChatPage />)
  
  // メッセージを追加
  await userEvent.type(screen.getByRole('textbox'), 'テスト')
  await userEvent.click(screen.getByRole('button', { name: '送信' }))
  
  // レスポンスを待機
  await waitFor(() => {
    expect(screen.getByText(/AIの応答/)).toBeInTheDocument()
  })
  
  // アンマウント（ページ離脱）
  unmount()
  
  // 再マウント（ページリロード）
  const mockSpeakText = vi.fn()
  render(<ChatPage speakTextMock={mockSpeakText} />)
  
  // 音声合成が呼ばれないことを確認
  expect(mockSpeakText).not.toHaveBeenCalled()
})
```

#### 1.4.2 最小実装
- [ ] ChatPageコンポーネントの修正
- [ ] useEffectの条件分岐実装

#### 1.4.3 完了条件
- [ ] リロード時の自動音声合成なし
- [ ] 通常フローは正常動作

---

## Phase 2: マイク権限管理の改善（High）

### 2.1 MicrophonePermissionManager基本実装 [⏸️]
**所要時間**: 1.5時間

#### 2.1.1 失敗するテストの作成
```typescript
// __tests__/lib/microphone-permission-manager.test.ts
describe('MicrophonePermissionManager', () => {
  test('Permissions APIが利用可能な場合、正確な権限状態を返す', async () => {
    global.navigator.permissions = {
      query: vi.fn().mockResolvedValue({ state: 'granted' })
    }
    
    const status = await MicrophonePermissionManager.checkPermissionStatus()
    
    expect(status).toEqual({
      granted: true,
      persistent: true,
      browserSupport: true
    })
  })
  
  test('Permissions APIが利用不可の場合、getUserMediaにフォールバック', async () => {
    delete global.navigator.permissions
    
    global.navigator.mediaDevices.getUserMedia = vi.fn()
      .mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }]
      })
    
    const status = await MicrophonePermissionManager.checkPermissionStatus()
    
    expect(status).toEqual({
      granted: true,
      persistent: false,
      browserSupport: false
    })
  })
})
```

#### 2.1.2 最小実装
- [ ] `MicrophonePermissionManager`クラスの作成
- [ ] `checkPermissionStatus`メソッドの実装

#### 2.1.3 完了条件
- [ ] Permissions APIとフォールバックの両対応
- [ ] 適切なステータスオブジェクトの返却

---

### 2.2 権限状態のローカル保存 [⏸️]
**所要時間**: 45分

#### 2.2.1 失敗するテストの作成
```typescript
test('マイク権限の最終確認状態をローカルに保存する', async () => {
  const mockSetItem = vi.spyOn(Storage.prototype, 'setItem')
  
  global.navigator.mediaDevices.getUserMedia = vi.fn()
    .mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }]
    })
  
  await MicrophonePermissionManager.testMicrophoneAccess()
  
  expect(mockSetItem).toHaveBeenCalledWith(
    'microphone-permission-status',
    expect.stringContaining('"granted":true')
  )
})

test('保存された権限状態を取得できる', () => {
  const mockData = {
    granted: true,
    timestamp: Date.now()
  }
  localStorage.setItem('microphone-permission-status', JSON.stringify(mockData))
  
  const status = MicrophonePermissionManager.getLastKnownStatus()
  
  expect(status.granted).toBe(true)
  expect(status.timestamp).toBeDefined()
})
```

#### 2.2.2 最小実装
- [ ] `testMicrophoneAccess`プライベートメソッド
- [ ] `getLastKnownStatus`メソッド

#### 2.2.3 完了条件
- [ ] 権限状態の保存・読み込み機能
- [ ] エラーハンドリング実装

---

### 2.3 VoiceInput UI改善 - 権限状態表示 [⏸️]
**所要時間**: 1.5時間

#### 2.3.1 失敗するテストの作成
```typescript
// __tests__/components/VoiceInput.test.tsx
test('マイク権限がない場合、権限要求UIを表示', async () => {
  vi.mocked(MicrophonePermissionManager.checkPermissionStatus)
    .mockResolvedValue({
      granted: false,
      persistent: false,
      browserSupport: true
    })
  
  render(<VoiceInput />)
  
  await waitFor(() => {
    expect(screen.getByText(/マイクロフォンの権限が必要です/))
      .toBeInTheDocument()
    expect(screen.getByRole('button', { name: /マイク権限を許可/ }))
      .toBeInTheDocument()
  })
})

test('開発環境の場合、追加の警告メッセージを表示', async () => {
  vi.mocked(isDevelopmentEnvironment).mockReturnValue(true)
  vi.mocked(MicrophonePermissionManager.checkPermissionStatus)
    .mockResolvedValue({
      granted: false,
      persistent: false,
      browserSupport: false
    })
  
  render(<VoiceInput />)
  
  await waitFor(() => {
    expect(screen.getByText(/開発環境のため/)).toBeInTheDocument()
  })
})
```

#### 2.3.2 最小実装
- [ ] VoiceInputコンポーネントの権限チェック追加
- [ ] 条件付きUI表示ロジック

#### 2.3.3 完了条件
- [ ] 権限状態に応じたUI切り替え
- [ ] 開発環境警告の表示

---

### 2.4 開発環境ヘルパー実装 [⏸️]
**所要時間**: 30分

#### 2.4.1 失敗するテストの作成
```typescript
// __tests__/lib/development-helpers.test.ts
describe('isDevelopmentEnvironment', () => {
  test('localhost環境をtrueと判定', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost', protocol: 'http:' }
    })
    
    expect(isDevelopmentEnvironment()).toBe(true)
  })
  
  test('HTTPS本番環境をfalseと判定', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', protocol: 'https:' }
    })
    process.env.NODE_ENV = 'production'
    
    expect(isDevelopmentEnvironment()).toBe(false)
  })
})

test('開発環境で警告をコンソールに出力', () => {
  const consoleSpy = vi.spyOn(console, 'warn')
  vi.mocked(isDevelopmentEnvironment).mockReturnValue(true)
  
  showDevelopmentWarnings()
  
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('開発環境での注意事項')
  )
})
```

#### 2.4.2 最小実装
- [ ] `isDevelopmentEnvironment`関数
- [ ] `showDevelopmentWarnings`関数

#### 2.4.3 完了条件
- [ ] 環境判定の正確性
- [ ] 適切な警告メッセージ出力

---

## Phase 3: エラーハンドリングとユーザビリティ（Medium）

### 3.1 エラーバウンダリー実装 [⏸️]
**所要時間**: 1時間

#### 3.1.1 失敗するテストの作成
```typescript
// __tests__/components/ErrorBoundary.test.tsx
test('音声合成エラー時にフォールバックUIを表示', () => {
  const ThrowError = () => {
    throw new Error('音声合成に失敗しました')
  }
  
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  )
  
  expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /再試行/ })).toBeInTheDocument()
})
```

#### 3.1.2 最小実装
- [ ] ErrorBoundaryコンポーネント作成
- [ ] エラー時のフォールバックUI

#### 3.1.3 完了条件
- [ ] エラーのキャッチと表示
- [ ] 再試行機能の実装

---

### 3.2 手動セッションクリア機能 [⏸️]
**所要時間**: 45分

#### 3.2.1 失敗するテストの作成
```typescript
// __tests__/hooks/useChat.test.ts
test('clearConversation呼び出しでセッションがクリアされる', () => {
  const { result } = renderHook(() => useChat())
  
  // メッセージを追加
  act(() => {
    result.current.setMessages([
      { id: '1', content: 'test', role: 'user' }
    ])
  })
  
  // クリア実行
  act(() => {
    result.current.clearConversation()
  })
  
  expect(result.current.messages).toHaveLength(0)
  expect(SessionManager.loadSession()).toBeNull()
})
```

#### 3.2.2 最小実装
- [ ] `clearConversation`関数の追加
- [ ] SessionManagerとの連携

#### 3.2.3 完了条件
- [ ] メッセージとセッションの同時クリア
- [ ] UIからのアクセス可能

---

## 📊 進捗サマリー

### Phase 1: 会話永続化問題（4タスク）
- [ ] 1.1 メッセージ型定義の拡張
- [ ] 1.2 SessionManagerフラグ付与
- [ ] 1.3 音声合成制御
- [ ] 1.4 統合テスト

### Phase 2: マイク権限管理（4タスク）
- [ ] 2.1 PermissionManager基本実装
- [ ] 2.2 権限状態の保存
- [ ] 2.3 VoiceInput UI改善
- [ ] 2.4 開発環境ヘルパー

### Phase 3: エラーハンドリング（2タスク）
- [ ] 3.1 エラーバウンダリー
- [ ] 3.2 手動セッションクリア

---

## 🚀 実行順序の推奨

1. **Day 1**: Phase 1のタスク1.1〜1.3（基本機能）
2. **Day 2**: Phase 1のタスク1.4 + Phase 2のタスク2.1（統合テスト＋権限管理開始）
3. **Day 3**: Phase 2のタスク2.2〜2.4（権限管理完成）
4. **Day 4**: Phase 3の全タスク（品質向上）

各タスクは独立実行可能なため、優先度や依存関係に応じて順序を調整可能です。