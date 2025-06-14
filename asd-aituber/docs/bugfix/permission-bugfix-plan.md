# Permission & Session Management Bugfix Plan

## 🎯 問題の概要

### 問題1: 会話永続化による自動音声合成
- **現象**: ページリロード/再起動時に保存された最後の会話が自動で音声合成される
- **原因**: SessionManagerがlocalStorageから会話を復元する際、新規メッセージと誤認される
- **影響**: ユーザー体験の悪化、意図しない音声再生

### 問題2: マイク権限の永続化不足
- **現象**: ページリロード/再起動時にマイク権限が毎回リセットされる
- **原因**: ブラウザの権限管理とローカル開発環境の制約
- **影響**: 毎回権限要求ダイアログが表示される

---

## 🔍 aituber-kit実装分析

### ✅ aituber-kitの優れた実装パターン

#### 1. 会話管理システム
```typescript
// Zustandのpersistミドルウェア使用
export const useHomeStore = create(
  persist(
    (set, get) => ({
      chatLog: [],
      // ページロード時の自動音声合成を防ぐ制御機能
    }),
    { name: 'aitube-kit-home' }
  )
)
```

#### 2. セッション管理による音声制御
```typescript
// 音声合成キューシステム
export class SpeakQueue {
  // セッションIDによる適切な音声順序制御
  // 新規メッセージのみを音声合成対象とする
}
```

#### 3. 明確な権限管理
```typescript
const checkMicrophonePermission = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
    return true
  } catch (error) {
    // トースト通知による明確なフィードバック
    showToast(t('ErrorCouldNotGetMicrophonePermission'))
    return false
  }
}
```

---

## 🛠️ 修正計画

### Phase 1: 会話永続化問題の解決 (Priority: Critical)

#### 1.1 メッセージ状態フラグの追加
```typescript
interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: number
  emotion?: Emotion
  isFromSession?: boolean  // ← 新規追加: セッション復元メッセージフラグ
  hasBeenSpoken?: boolean  // ← 新規追加: 音声合成済みフラグ
}
```

#### 1.2 SessionManager修正
```typescript
// lib/session-manager.ts
export class SessionManager {
  static loadSession(): SessionData | null {
    const data = localStorage.getItem(this.SESSION_KEY)
    if (data) {
      const session = JSON.parse(data)
      // 復元されたメッセージにフラグを付与
      session.messages = session.messages.map(msg => ({
        ...msg,
        isFromSession: true,
        hasBeenSpoken: true
      }))
      return session
    }
    return null
  }
}
```

#### 1.3 音声合成制御の修正
```typescript
// app/chat/page.tsx
useEffect(() => {
  const lastMessage = messages[messages.length - 1]
  
  // セッション復元メッセージまたは音声合成済みメッセージはスキップ
  if (!lastMessage || 
      lastMessage.isFromSession || 
      lastMessage.hasBeenSpoken ||
      lastMessage.role !== 'assistant') {
    return
  }
  
  // 新規メッセージのみ音声合成実行
  performSpeechSynthesis(lastMessage)
}, [messages])
```

#### 1.4 手動クリア機能の追加
```typescript
// hooks/useChat.ts
export function useChat() {
  const clearConversation = useCallback(() => {
    setMessages([])
    SessionManager.clearSession()
    console.log('Conversation cleared due to page reload')
  }, [])
  
  // リロード検出時の自動クリア（オプション）
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 設定によってはセッションクリア
      if (settings.clearOnReload) {
        SessionManager.clearSession()
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])
  
  return { clearConversation, /* ... */ }
}
```

### Phase 2: マイク権限管理の改善 (Priority: High)

#### 2.1 Permissions API統合
```typescript
// lib/microphone-permissions.ts
export class MicrophonePermissionManager {
  private static PERMISSION_KEY = 'microphone-permission-status'
  
  static async checkPermissionStatus(): Promise<{
    granted: boolean
    persistent: boolean
    browserSupport: boolean
  }> {
    try {
      // Permissions APIサポートチェック
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ 
          name: 'microphone' as PermissionName 
        })
        
        return {
          granted: result.state === 'granted',
          persistent: true,
          browserSupport: true
        }
      }
      
      // フォールバック: getUserMediaテスト
      const testResult = await this.testMicrophoneAccess()
      return {
        granted: testResult,
        persistent: false,
        browserSupport: false
      }
    } catch (error) {
      return {
        granted: false,
        persistent: false,
        browserSupport: false
      }
    }
  }
  
  private static async testMicrophoneAccess(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      
      // 成功状態をローカルに記録（参考程度）
      localStorage.setItem(this.PERMISSION_KEY, JSON.stringify({
        granted: true,
        timestamp: Date.now()
      }))
      
      return true
    } catch (error) {
      localStorage.setItem(this.PERMISSION_KEY, JSON.stringify({
        granted: false,
        timestamp: Date.now(),
        error: error.message
      }))
      return false
    }
  }
  
  static getLastKnownStatus(): { granted: boolean, timestamp: number } | null {
    try {
      const stored = localStorage.getItem(this.PERMISSION_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }
}
```

#### 2.2 VoiceInput権限UI改善
```typescript
// components/VoiceInput.tsx に追加
const [permissionStatus, setPermissionStatus] = useState<{
  granted: boolean
  persistent: boolean
  lastChecked?: number
}>({ granted: false, persistent: false })

useEffect(() => {
  const checkPermissions = async () => {
    const status = await MicrophonePermissionManager.checkPermissionStatus()
    setPermissionStatus({
      granted: status.granted,
      persistent: status.persistent,
      lastChecked: Date.now()
    })
  }
  
  checkPermissions()
}, [])

// 改善されたUIメッセージ
if (!permissionStatus.granted) {
  return (
    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-blue-600">🎤</span>
          <p className="text-sm font-medium text-blue-800">
            マイクロフォンの権限が必要です
          </p>
        </div>
        
        {!permissionStatus.persistent && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-800">
              ⚠️ 開発環境のため、ブラウザが権限を記憶しない場合があります。
              本番環境（HTTPS）では改善されます。
            </p>
          </div>
        )}
        
        <button
          onClick={handleRequestPermission}
          className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          🔓 マイク権限を許可
        </button>
      </div>
    </div>
  )
}
```

#### 2.3 開発環境向け改善
```typescript
// lib/development-helpers.ts
export const isDevelopmentEnvironment = () => {
  return process.env.NODE_ENV === 'development' || 
         window.location.hostname === 'localhost' ||
         window.location.protocol === 'http:'
}

export const showDevelopmentWarnings = () => {
  if (isDevelopmentEnvironment()) {
    console.warn(`
🚨 開発環境での注意事項:
- マイク権限がページリロード時にリセットされる場合があります
- HTTPS環境では改善されます
- 本番デプロイ時は https:// を使用してください
    `)
  }
}
```

### Phase 3: テスト実装 (Priority: Medium)

#### 3.1 統合テスト
```typescript
// __tests__/integration/session-management.test.tsx
describe('Session Management Integration', () => {
  test('ページリロード時に音声合成が自動実行されない', async () => {
    // セッションに既存メッセージを保存
    SessionManager.saveSession({
      messages: [{ role: 'assistant', content: 'テストメッセージ' }]
    })
    
    // コンポーネントを再マウント（リロードシミュレート）
    const { unmount, rerender } = render(<ChatPage />)
    unmount()
    
    const mockSpeakText = vi.fn()
    rerender(<ChatPage speakTextMock={mockSpeakText} />)
    
    // 音声合成が呼ばれないことを確認
    expect(mockSpeakText).not.toHaveBeenCalled()
  })
  
  test('新規メッセージのみ音声合成される', async () => {
    // 新しいメッセージを追加
    const { result } = renderHook(() => useChat())
    
    await act(async () => {
      await result.current.sendMessage('新しいメッセージ')
    })
    
    // 新規メッセージの音声合成は実行される
    expect(mockSpeakText).toHaveBeenCalledWith('AI応答')
  })
})
```

#### 3.2 マイク権限テスト
```typescript
// __tests__/unit/microphone-permissions.test.ts
describe('MicrophonePermissionManager', () => {
  test('Permissions APIサポート環境での権限チェック', async () => {
    // Permissions APIのモック
    global.navigator.permissions = {
      query: vi.fn().mockResolvedValue({ state: 'granted' })
    }
    
    const status = await MicrophonePermissionManager.checkPermissionStatus()
    
    expect(status.granted).toBe(true)
    expect(status.browserSupport).toBe(true)
    expect(status.persistent).toBe(true)
  })
  
  test('getUserMediaフォールバック', async () => {
    // Permissions API未サポート環境
    delete global.navigator.permissions
    
    global.navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }]
    })
    
    const status = await MicrophonePermissionManager.checkPermissionStatus()
    
    expect(status.granted).toBe(true)
    expect(status.browserSupport).toBe(false)
    expect(status.persistent).toBe(false)
  })
})
```

---

## 📋 実装スケジュール

### Week 1: Critical Issues (2-3日)
- [ ] Message状態フラグ追加
- [ ] SessionManager修正 
- [ ] 音声合成制御修正
- [ ] 基本テスト実装

### Week 2: User Experience (2-3日)
- [ ] MicrophonePermissionManager実装
- [ ] VoiceInput UI改善
- [ ] 開発環境向け警告実装
- [ ] 統合テスト完備

### Week 3: Polish & Documentation (1-2日)
- [ ] エラーハンドリング強化
- [ ] ユーザー向けドキュメント更新
- [ ] 本番環境テスト

---

## 🎯 成功指標

### Problem 1 Resolution
- [ ] ページリロード時に音声合成が自動実行されない
- [ ] 新規メッセージのみ音声合成される
- [ ] セッション復元が正常に動作する

### Problem 2 Resolution  
- [ ] マイク権限の状態が適切に表示される
- [ ] 開発環境の制約が明確に説明される
- [ ] HTTPS環境で権限が永続化される

### Quality Metrics
- [ ] テストカバレッジ > 90%
- [ ] TypeScript型安全性確保
- [ ] パフォーマンス劣化なし
- [ ] ユーザビリティ向上

---

## 🚨 リスク要因

### Technical Risks
1. **ブラウザ互換性**: Permissions API対応状況の差異
2. **セッション管理**: 既存データとの互換性問題  
3. **音声制御**: 既存の音声合成システムとの競合

### Mitigation Strategies
1. **段階的実装**: フィーチャーフラグによる段階的ロールアウト
2. **フォールバック**: 古いブラウザ向けの代替実装
3. **データ移行**: 既存セッションデータの適切な移行

---

## 📚 参考実装

### aituber-kit Best Practices
- Zustandの`persist`ミドルウェア活用
- 音声合成キューシステム
- セッション管理による適切な順序制御
- トースト通知による明確なフィードバック

### 追加考慮事項
- PWA対応時の権限管理
- モバイルブラウザでの動作確認
- 音声合成とマイク入力の競合回避