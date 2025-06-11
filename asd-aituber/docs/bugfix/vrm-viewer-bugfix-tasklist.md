# VRM Viewer バグフィックス TDDタスクリスト

## 🎯 TDD (Test-Driven Development) アプローチ

各タスクは以下の順序で実行します：
1. **Red**: 失敗するテストを書く
2. **Green**: テストを通過する最小限の実装
3. **Refactor**: コードの品質向上

---

## 🔴 Phase A: 緊急調査・環境確認テスト (1-2時間)

### A.1: WebGL対応確認テスト
```typescript
// __tests__/utils/webgl-check.test.ts
describe('WebGL Support Check', () => {
  test('should detect WebGL support in browser', () => {
    const isWebGLSupported = checkWebGLSupport()
    expect(isWebGLSupported).toBeDefined()
    expect(typeof isWebGLSupported).toBe('boolean')
  })
  
  test('should provide fallback for non-WebGL environments', () => {
    // Mock WebGL不対応環境
    const mockCanvas = { getContext: jest.fn(() => null) }
    const result = checkWebGLSupport(mockCanvas)
    expect(result).toBe(false)
  })
})
```

**実装タスク**:
- [ ] `utils/webgl-check.ts` を作成
- [ ] WebGL対応チェック関数を実装
- [ ] ChatPageで使用できるようにexport

### A.2: VRMファイル存在確認テスト
```typescript
// __tests__/utils/vrm-loader.test.ts
describe('VRM File Loader', () => {
  test('should check if VRM file exists', async () => {
    const exists = await checkVRMFileExists('/models/MyAvatar01_20241125134913.vrm')
    expect(exists).toBeDefined()
  })
  
  test('should handle missing VRM file gracefully', async () => {
    const exists = await checkVRMFileExists('/models/non-existent.vrm')
    expect(exists).toBe(false)
  })
  
  test('should provide file size information', async () => {
    const info = await getVRMFileInfo('/models/MyAvatar01_20241125134913.vrm')
    expect(info).toHaveProperty('size')
    expect(info.size).toBeGreaterThan(0)
  })
  
  // 新規追加: AbortSignal.timeout()互換性テスト
  test('should handle browsers without AbortSignal.timeout support', async () => {
    // AbortSignal.timeoutをundefinedにモック
    const originalTimeout = AbortSignal.timeout
    ;(AbortSignal as any).timeout = undefined
    
    // 関数が正常に動作することを確認
    const exists = await checkVRMFileExists('/models/test.vrm')
    expect(exists).toBeDefined()
    
    // 元に戻す
    ;(AbortSignal as any).timeout = originalTimeout
  })
  
  test('should timeout correctly with fallback implementation', async () => {
    // 遅いレスポンスをシミュレート
    global.fetch = jest.fn(() => 
      new Promise(resolve => setTimeout(resolve, 10000))
    )
    
    const startTime = Date.now()
    const exists = await checkVRMFileExists('/models/slow.vrm')
    const duration = Date.now() - startTime
    
    expect(exists).toBe(false)
    expect(duration).toBeLessThan(6000) // 5秒 + 余裕
  })
})
```

**実装タスク**:
- [ ] `utils/vrm-loader.ts` を作成
- [ ] VRMファイル存在確認関数を実装（AbortController使用）
- [ ] AbortSignal.timeout()のフォールバック実装
- [ ] タイムアウト処理の適切な実装
- [ ] ファイル情報取得関数を実装

### A.3: 依存関係バージョンテスト
```typescript
// __tests__/utils/dependency-check.test.ts
describe('Dependency Version Check', () => {
  test('should verify Three.js version compatibility', () => {
    const threeVersion = getThreeJsVersion()
    expect(threeVersion).toMatch(/^0\.1[567]\d\./)
  })
  
  test('should verify @pixiv/three-vrm version', () => {
    const vrmVersion = getVRMLibVersion()
    expect(vrmVersion).toMatch(/^2\.\d+\.\d+/)
  })
  
  // 新規追加: package.json直接アクセス回避テスト
  test('should not use dynamic require for package.json', () => {
    // getThreeJsVersion内でrequire()を使用していないことを確認
    const fnString = getThreeJsVersion.toString()
    expect(fnString).not.toContain('require(')
    expect(fnString).not.toContain('package.json')
  })
  
  test('should handle SSR environment correctly', () => {
    // SSR環境をシミュレート
    const originalWindow = global.window
    delete (global as any).window
    
    const version = getThreeJsVersion()
    expect(version).toBeDefined()
    expect(version).not.toBe('unknown')
    
    // 環境を復元
    global.window = originalWindow
  })
})
```

**実装タスク**:
- [ ] `utils/dependency-check.ts` を作成
- [ ] パッケージバージョン確認関数を実装（動的require()を使用しない）
- [ ] SSR/CSR環境対応の実装
- [ ] 環境変数フォールバックの追加
- [ ] 互換性チェック機能を追加

### A.4: ブラウザ互換性チェックテスト
```typescript
// __tests__/utils/browser-compat.test.ts
describe('Browser Compatibility Check', () => {
  test('should detect AbortSignal.timeout support', () => {
    const hasSupport = checkAbortSignalTimeoutSupport()
    expect(typeof hasSupport).toBe('boolean')
  })
  
  test('should create timeout signal with fallback', async () => {
    const signal = createTimeoutSignal(1000)
    expect(signal).toBeInstanceOf(AbortSignal)
    
    // タイムアウト後にabortedがtrueになることを確認
    await new Promise(resolve => setTimeout(resolve, 1100))
    expect(signal.aborted).toBe(true)
  })
  
  test('should detect browser features correctly', () => {
    const features = detectBrowserFeatures()
    expect(features).toHaveProperty('webgl')
    expect(features).toHaveProperty('abortSignalTimeout')
    expect(features).toHaveProperty('dynamicImport')
  })
})
```

**実装タスク**:
- [ ] `utils/browser-compat.ts` を作成
- [ ] AbortSignal.timeout サポート検出関数
- [ ] タイムアウトシグナル作成関数（フォールバック付き）
- [ ] ブラウザ機能検出ユーティリティ

---

## 🟡 Phase B: コンポーネント単体テスト (2-3時間)

### B.1: Fallback UIコンポーネントテスト
```typescript
// __tests__/components/VRMViewerFallback.test.tsx
describe('VRMViewerFallback Component', () => {
  test('should render fallback UI when VRM is not supported', () => {
    render(<VRMViewerFallback reason="WebGL not supported" />)
    expect(screen.getByText(/WebGL not supported/i)).toBeInTheDocument()
  })
  
  test('should show loading state', () => {
    render(<VRMViewerFallback loading={true} />)
    expect(screen.getByText(/Loading/i)).toBeInTheDocument()
  })
  
  test('should display error message', () => {
    render(<VRMViewerFallback error="Failed to load VRM file" />)
    expect(screen.getByText(/Failed to load VRM file/i)).toBeInTheDocument()
  })
})
```

**実装タスク**:
- [ ] `components/VRMViewerFallback.tsx` を作成
- [ ] 各状態（loading, error, not-supported）のUI実装
- [ ] アクセシビリティ対応（ARIA属性）

### B.2: VRMViewerエラーハンドリングテスト
```typescript
// __tests__/components/VRMViewer.error.test.tsx
describe('VRMViewer Error Handling', () => {
  test('should handle Three.js initialization errors', async () => {
    // Mock Three.js initialization failure
    jest.spyOn(THREE, 'WebGLRenderer').mockImplementation(() => {
      throw new Error('WebGL context lost')
    })
    
    const { getByText } = render(<VRMViewer />)
    await waitFor(() => {
      expect(getByText(/WebGL context lost/i)).toBeInTheDocument()
    })
  })
  
  test('should handle VRM loading errors', async () => {
    // Mock VRM loading failure
    mockVRMLoader.mockRejectedValue(new Error('Invalid VRM format'))
    
    const { getByText } = render(<VRMViewer modelUrl="/invalid.vrm" />)
    await waitFor(() => {
      expect(getByText(/Invalid VRM format/i)).toBeInTheDocument()
    })
  })
  
  test('should retry loading on error', async () => {
    const { getByRole } = render(<VRMViewer />)
    const retryButton = await screen.findByRole('button', { name: /retry/i })
    
    fireEvent.click(retryButton)
    expect(mockVRMLoader).toHaveBeenCalledTimes(2)
  })
})
```

**実装タスク**:
- [ ] VRMViewerにエラー境界を追加
- [ ] エラー状態の管理とUI表示
- [ ] リトライ機能の実装

### B.3: VRMViewer初期化プロセステスト
```typescript
// __tests__/components/VRMViewer.init.test.tsx
describe('VRMViewer Initialization Process', () => {
  test('should initialize in correct order', async () => {
    const initOrder: string[] = []
    
    // Mock各初期化ステップ
    jest.spyOn(console, 'log').mockImplementation((msg) => {
      if (msg.includes('Initializing')) initOrder.push(msg)
    })
    
    render(<VRMViewer />)
    
    await waitFor(() => {
      expect(initOrder).toEqual([
        'Initializing Three.js scene...',
        'Creating WebGL renderer...',
        'Loading VRM model...',
        'Setting up animation controller...',
        'VRM initialization complete'
      ])
    })
  })
  
  test('should expose imperative handle methods', async () => {
    const ref = React.createRef<VRMViewerRef>()
    render(<VRMViewer ref={ref} />)
    
    await waitFor(() => {
      expect(ref.current).toBeDefined()
      expect(ref.current).toHaveProperty('lipSync')
      expect(ref.current).toHaveProperty('changeExpression')
      expect(ref.current).toHaveProperty('lookAt')
    })
  })
})
```

**実装タスク**:
- [ ] 初期化プロセスのステップ化
- [ ] 各ステップでのログ出力
- [ ] useImperativeHandleの適切な設定

---

## 🟢 Phase C: 統合テスト (3-4時間)

### C.1: ChatPageとVRMViewer統合テスト
```typescript
// __tests__/pages/ChatPage.integration.test.tsx
describe('ChatPage VRMViewer Integration', () => {
  test('should render VRMViewer when conditions are met', async () => {
    // Mock成功条件
    mockWebGLSupport.mockReturnValue(true)
    mockVRMFileExists.mockResolvedValue(true)
    
    render(<ChatPage />)
    
    await waitFor(() => {
      expect(screen.queryByText(/Loading VRM Viewer/i)).not.toBeInTheDocument()
      expect(screen.getByTestId('vrm-viewer')).toBeInTheDocument()
    })
  })
  
  test('should show fallback when WebGL is not supported', async () => {
    mockWebGLSupport.mockReturnValue(false)
    
    render(<ChatPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/WebGL is not supported/i)).toBeInTheDocument()
    })
  })
  
  test('should handle VRM file missing', async () => {
    mockWebGLSupport.mockReturnValue(true)
    mockVRMFileExists.mockResolvedValue(false)
    
    render(<ChatPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/VRM file not found/i)).toBeInTheDocument()
    })
  })
})
```

**実装タスク**:
- [ ] ChatPageにWebGL/VRMチェックロジックを追加
- [ ] 条件分岐でVRMViewer/Fallbackを表示
- [ ] エラー状態の適切な管理

### C.2: 動的インポートテスト
```typescript
// __tests__/components/DynamicVRMViewer.test.tsx
describe('Dynamic VRMViewer Import', () => {
  test('should load VRMViewer dynamically on client side', async () => {
    const { container } = render(<DynamicVRMViewer />)
    
    // 初期状態はローディング
    expect(screen.getByText(/Loading/i)).toBeInTheDocument()
    
    // 動的インポート完了後
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument()
      expect(container.querySelector('canvas')).toBeInTheDocument()
    })
  })
  
  test('should not render on server side', () => {
    // SSR環境をシミュレート
    const isServer = typeof window === 'undefined'
    if (isServer) {
      const { container } = render(<DynamicVRMViewer />)
      expect(container.innerHTML).toBe('')
    }
  })
})
```

**実装タスク**:
- [ ] Next.js dynamic importの設定
- [ ] SSR無効化オプションの追加
- [ ] ローディング状態の実装

### C.3: パフォーマンステスト
```typescript
// __tests__/performance/VRMViewer.perf.test.tsx
describe('VRMViewer Performance', () => {
  test('should initialize within acceptable time', async () => {
    const startTime = performance.now()
    
    render(<VRMViewer />)
    
    await waitFor(() => {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      expect(loadTime).toBeLessThan(3000) // 3秒以内
    })
  })
  
  test('should maintain 30+ FPS', async () => {
    const { container } = render(<VRMViewer />)
    
    await waitFor(() => {
      const stats = container.querySelector('.fps-stats')
      const fps = parseInt(stats?.textContent || '0')
      expect(fps).toBeGreaterThanOrEqual(30)
    })
  })
  
  test('should not exceed memory limit', async () => {
    if ('memory' in performance) {
      render(<VRMViewer />)
      
      await waitFor(() => {
        const memoryUsage = (performance as any).memory.usedJSHeapSize
        const limitMB = 200
        expect(memoryUsage / 1024 / 1024).toBeLessThan(limitMB)
      })
    }
  })
})
```

**実装タスク**:
- [ ] パフォーマンス測定機能の追加
- [ ] FPSカウンターの実装
- [ ] メモリ使用量監視

---

## 🔵 Phase D: E2Eテスト・回帰テスト (2-3時間)

### D.1: E2Eシナリオテスト
```typescript
// __tests__/e2e/chat-vrm-flow.test.ts
describe('Chat with VRM Avatar E2E', () => {
  test('should complete full chat interaction with avatar', async () => {
    // ページ読み込み
    await page.goto('/chat')
    
    // VRMビューアーの表示確認
    await page.waitForSelector('[data-testid="vrm-viewer"]', { timeout: 5000 })
    
    // チャット入力
    await page.type('[data-testid="chat-input"]', 'こんにちは')
    await page.click('[data-testid="send-button"]')
    
    // リップシンク動作確認
    await page.waitForFunction(() => {
      const viewer = document.querySelector('[data-testid="vrm-viewer"]')
      return viewer?.getAttribute('data-speaking') === 'true'
    })
    
    // 表情変化確認
    await page.waitForFunction(() => {
      const viewer = document.querySelector('[data-testid="vrm-viewer"]')
      return viewer?.getAttribute('data-expression') === 'happy'
    })
  })
  
  test('should handle network errors gracefully', async () => {
    // ネットワークエラーをシミュレート
    await page.setOfflineMode(true)
    
    await page.goto('/chat')
    await page.waitForSelector('[data-testid="error-message"]')
    
    // オンラインに戻す
    await page.setOfflineMode(false)
    await page.click('[data-testid="retry-button"]')
    
    // 復旧確認
    await page.waitForSelector('[data-testid="vrm-viewer"]')
  })
})
```

**実装タスク**:
- [ ] E2Eテスト環境のセットアップ
- [ ] データ属性の追加（テスト用）
- [ ] エラー復旧フローの実装

### D.2: 回帰テストスイート
```typescript
// __tests__/regression/vrm-viewer.regression.test.ts
describe('VRM Viewer Regression Tests', () => {
  const testCases = [
    { browser: 'chrome', version: 'latest' },
    { browser: 'firefox', version: 'latest' },
    { browser: 'safari', version: '15+' },
    { browser: 'edge', version: 'latest' }
  ]
  
  testCases.forEach(({ browser, version }) => {
    test(`should work in ${browser} ${version}`, async () => {
      // ブラウザ別テスト実行
      const result = await runInBrowser(browser, version, async () => {
        await page.goto('/chat')
        return await page.evaluate(() => {
          const viewer = document.querySelector('[data-testid="vrm-viewer"]')
          return viewer !== null
        })
      })
      
      expect(result).toBe(true)
    })
  })
  
  test('should maintain backward compatibility', async () => {
    // 旧バージョンのVRMファイルテスト
    const oldVRMFiles = [
      '/models/vrm-0.0-test.vrm',
      '/models/vrm-1.0-test.vrm'
    ]
    
    for (const file of oldVRMFiles) {
      const { container } = render(<VRMViewer modelUrl={file} />)
      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument()
      })
    }
  })
})
```

**実装タスク**:
- [ ] クロスブラウザテスト環境構築
- [ ] 後方互換性の確保
- [ ] テストレポートの自動生成

---

## 📊 テストカバレッジ目標

### 単体テスト
- [ ] WebGL対応チェック: 100%
- [ ] VRMファイル処理: 95%+
- [ ] エラーハンドリング: 90%+
- [ ] UI コンポーネント: 85%+

### 統合テスト
- [ ] ChatPage統合: 80%+
- [ ] 動的インポート: 90%+
- [ ] パフォーマンス: 基準値達成

### E2Eテスト
- [ ] 主要シナリオ: 100%
- [ ] エラー復旧: 100%
- [ ] クロスブラウザ: 4ブラウザ対応

---

## 🚀 実行順序と優先度（改訂版）

### 🔥 Day 0: 緊急修正 (1-2時間) - 即座実行
1. **Critical Fixes (1h)**
   - [ ] AbortSignal.timeout()フォールバック実装
   - [ ] package.json直接アクセス除去
   - [ ] 動作確認とビルドテスト

### Day 1: 基盤構築
1. **Morning (2-3h)**
   - [ ] Phase A.1-A.4: 環境確認テスト作成・実装（ブラウザ互換性含む）
   - [ ] Phase B.1: Fallback UIテスト・実装

2. **Afternoon (3-4h)**
   - [ ] Phase B.2: エラーハンドリングテスト・実装
   - [ ] Phase B.3: 初期化プロセステスト・実装

### Day 2: 統合と最適化
3. **Morning (2-3h)**
   - [ ] Phase C.1: ChatPage統合テスト・実装
   - [ ] Phase C.2: 動的インポートテスト・実装

4. **Afternoon (3-4h)**
   - [ ] Phase C.3: パフォーマンステスト・実装
   - [ ] Phase D.1: E2Eテスト作成

### Day 3: 品質保証
5. **Morning (2h)**
   - [ ] Phase D.2: 回帰テスト実行
   - [ ] バグ修正とリファクタリング

6. **Afternoon (2h)**
   - [ ] ドキュメント更新
   - [ ] デプロイ準備

---

## ✅ 完了基準

### Red-Green-Refactor サイクル完了
- [ ] 全テストが最初は失敗（Red）
- [ ] 最小限の実装で通過（Green）
- [ ] コード品質向上（Refactor）

### 品質基準
- [ ] テストカバレッジ 80%以上
- [ ] 全てのテストが通過
- [ ] パフォーマンス基準を満たす
- [ ] ドキュメントが最新

### デリバリー基準
- [ ] VRMViewerが正常に表示される
- [ ] エラー時はFallback UIが表示される
- [ ] 全主要ブラウザで動作確認済み
- [ ] ユーザー体験が損なわれない

---

## 📝 注意事項

1. **TDDの厳守**
   - 必ずテストを先に書く
   - テストが失敗することを確認
   - 最小限の実装で通過させる

2. **段階的な実装**
   - 一度に多くを実装しない
   - 各段階で動作確認
   - リファクタリングは別ステップで

3. **継続的な検証**
   - CIでテスト自動実行
   - コードレビューの実施
   - パフォーマンス監視

4. **ドキュメント更新**
   - テストケースの説明
   - 実装の判断理由
   - 今後の改善点

5. **ブラウザ互換性考慮**
   - 新しいAPIの使用前にサポート確認
   - フォールバック実装の提供
   - Can I Useでの確認習慣化

6. **Next.js制約への対応**
   - 動的require()の回避
   - ES Module準拠の実装
   - SSR/CSR環境の考慮

---

## 🚨 緊急修正タスク (2025/01/06 追加)

### 🔥 Critical: AbortSignal.timeout()互換性修正

**問題**: 古いブラウザで`AbortSignal.timeout()`が未対応のため、VRM読み込みチェックで処理が停止

**修正テスト**:
```typescript
// __tests__/utils/vrm-loader.hotfix.test.ts
describe('VRM Loader Hotfix', () => {
  test('should use AbortController fallback when timeout not supported', async () => {
    // timeoutメソッドを削除してテスト
    const original = AbortSignal.timeout
    delete (AbortSignal as any).timeout
    
    const result = await checkVRMFileExists('/models/test.vrm')
    expect(result).toBeDefined()
    
    // 復元
    (AbortSignal as any).timeout = original
  })
})
```

**即座実装タスク**:
- [ ] createTimeoutSignal関数の実装（30分）
- [ ] checkVRMFileExists修正（15分）
- [ ] getVRMFileInfo修正（15分）
- [ ] 動作確認（15分）

### 🔧 High Priority: package.json直接アクセス除去

**問題**: Next.js 14.2.29でpackage.jsonへの動的require()が禁止

**修正テスト**:
```typescript
// __tests__/pages/ChatPage.compile.test.tsx
describe('ChatPage Compilation Fix', () => {
  test('should not contain direct package.json imports', () => {
    const chatPageSource = fs.readFileSync('./app/chat/page.tsx', 'utf-8')
    expect(chatPageSource).not.toContain("require('three/package.json')")
    expect(chatPageSource).not.toContain("require('@pixiv/three-vrm/package.json')")
  })
})
```

**実装タスク**:
- [ ] getThreeJsVersion関数実装（完了済み）
- [ ] getVRMLibVersion関数実装（30分）
- [ ] ChatPage修正適用（15分）
- [ ] ビルド確認（15分）
