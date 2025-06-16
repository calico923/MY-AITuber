# VRM Viewer バグフィックス計画

## 🔍 問題の現状

**症状**: ChatPageで「Loading VRM Viewer...」が表示され続け、VRMViewerが正常に表示されない

**影響**: 
- VRMアバターが表示されない
- リップシンクや表情変化の動作確認ができない
- エコーループ修正の効果検証ができない
- 実際のユーザー体験が提供できない

## 📊 原因分析

### A. 直近の変更による影響
- `mounted` 状態管理を削除したが問題解消せず
- VRMViewerを直接レンダリングに変更
- 根本原因は別のところにある可能性

### B. 考えられる原因カテゴリ

#### 1. VRMViewerコンポーネント内部の問題
- **Three.js初期化エラー**: WebGLContext作成失敗
- **VRM読み込みエラー**: モデルファイルの読み込み失敗
- **アニメーションコントローラーエラー**: VRMAnimationControllerの初期化失敗
- **useImperativeHandle設定問題**: 外部参照の設定失敗

#### 2. 依存関係・ライブラリ問題
- **@pixiv/three-vrm**: VRMライブラリのバージョン不整合
- **three.js**: Three.jsのバージョン問題
- **Next.js**: SSR/CSRの問題
- **TypeScript**: 型定義の問題

#### 3. ファイル・リソース問題
- **VRMファイル**: `/models/MyAvatar01_20241125134913.vrm` の存在/破損
- **public配置**: publicディレクトリの構成問題
- **ファイルサイズ**: 大きなVRMファイルの読み込みタイムアウト

#### 4. ブラウザ・環境問題
- **WebGL対応**: ブラウザのWebGL無効/未対応
- **CORS問題**: ローカルファイルアクセス制限
- **メモリ不足**: 3D処理のメモリ不足
- **セキュリティ制限**: ブラウザのセキュリティ制限

#### 5. 開発環境問題
- **開発サーバー**: Next.js dev serverの問題
- **ホットリロード**: コンポーネント更新の問題
- **モジュール解決**: ES6 modulesの問題

## 🔬 調査フェーズ

### Phase A: 基本環境確認
1. **ブラウザコンソール確認**
   - エラーログの詳細確認
   - 警告メッセージの分析
   - ネットワークタブでの読み込み状況確認

2. **VRMファイル確認**
   ```bash
   ls -la /Users/kuniaki-k/Code/MY-AITuber/asd-aituber/apps/web/public/models/
   file /Users/kuniaki-k/Code/MY-AITuber/asd-aituber/apps/web/public/models/MyAvatar01_20241125134913.vrm
   ```

3. **WebGL対応確認**
   ```javascript
   // ブラウザでWebGL確認
   const canvas = document.createElement('canvas');
   const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
   console.log('WebGL対応:', !!gl);
   ```

### Phase B: コンポーネント詳細分析
1. **VRMViewerコンポーネント読み込み確認**
   - useEffect内でのロード処理確認
   - Three.jsシーン初期化の状況確認
   - VRM読み込み処理の進行状況確認

2. **依存関係バージョン確認**
   ```bash
   npm list three @pixiv/three-vrm
   ```

3. **最小限テストコンポーネント作成**
   - Three.jsのみの最小限コンポーネント
   - VRM読み込みなしのテスト

### Phase C: 段階的デバッグ
1. **ログ追加による詳細トレース**
   - VRMViewer内の各段階でのコンソールログ
   - エラー発生箇所の特定

2. **fallback UI実装**
   - VRM読み込み失敗時の代替表示
   - エラー情報の表示

## 🛠 修正計画

### Stage 1: 緊急回避策 (1-2時間)
**目標**: 最低限の画面表示を実現

1. **簡単なfallback実装**
   ```tsx
   // VRMViewerの代わりに簡易3Dシーン
   const SimpleFallbackViewer = () => (
     <div className="flex items-center justify-center h-full bg-gray-200">
       <div className="text-center">
         <div className="w-32 h-32 bg-blue-500 rounded-full mx-auto mb-4"></div>
         <p>VRM Avatar (Fallback Mode)</p>
       </div>
     </div>
   )
   ```

2. **条件付きVRMViewer読み込み**
   ```tsx
   const [vrmSupported, setVrmSupported] = useState(true)
   
   return vrmSupported ? <VRMViewer /> : <SimpleFallbackViewer />
   ```

### Stage 2: 根本原因修正 (2-4時間)
**目標**: VRMViewerの完全復旧

#### Option A: VRMファイル・リソース問題の場合
1. **代替VRMファイル使用**
   - より小さなテスト用VRMファイル
   - または外部CDNからの読み込み

2. **プリロード機能追加**
   ```tsx
   const preloadVRM = useCallback(async () => {
     try {
       const response = await fetch('/models/MyAvatar01_20241125134913.vrm')
       if (!response.ok) throw new Error('VRM file not found')
       setVrmReady(true)
     } catch (error) {
       setVrmError(error.message)
     }
   }, [])
   ```

#### Option B: Three.js/VRM初期化問題の場合
1. **段階的初期化**
   ```tsx
   useEffect(() => {
     let mounted = true
     
     const initializeScene = async () => {
       try {
         // Step 1: Three.jsシーン作成
         console.log('Initializing Three.js scene...')
         const scene = new THREE.Scene()
         
         // Step 2: レンダラー作成
         console.log('Creating WebGL renderer...')
         const renderer = new THREE.WebGLRenderer()
         
         // Step 3: VRM読み込み
         console.log('Loading VRM...')
         // VRM読み込み処理
         
         if (mounted) {
           setInitialized(true)
         }
       } catch (error) {
         console.error('VRMViewer initialization failed:', error)
         setError(error.message)
       }
     }
     
     initializeScene()
     return () => { mounted = false }
   }, [])
   ```

2. **エラーハンドリング強化**
   ```tsx
   const [error, setError] = useState<string | null>(null)
   const [loadingStage, setLoadingStage] = useState<string>('Initializing...')
   
   if (error) {
     return <ErrorDisplay error={error} />
   }
   
   if (!initialized) {
     return <LoadingDisplay stage={loadingStage} />
   }
   ```

#### Option C: Next.js SSR/CSR問題の場合
1. **動的インポート**
   ```tsx
   import dynamic from 'next/dynamic'
   
   const VRMViewer = dynamic(() => import('@/components/VRMViewer'), {
     ssr: false,
     loading: () => <LoadingDisplay />
   })
   ```

2. **クライアントサイド限定レンダリング**
   ```tsx
   const [isClient, setIsClient] = useState(false)
   
   useEffect(() => {
     setIsClient(true)
   }, [])
   
   if (!isClient) {
     return <LoadingDisplay />
   }
   ```

### Stage 3: 堅牢性向上 (2-3時間)
**目標**: 再発防止と信頼性向上

1. **包括的エラーハンドリング**
   - WebGL対応チェック
   - VRMファイル存在チェック
   - メモリ使用量監視

2. **パフォーマンス最適化**
   - VRMファイルの圧縮
   - テクスチャ最適化
   - レンダリング負荷軽減

3. **デバッグツール追加**
   - VRMViewer状態表示パネル
   - リアルタイムログ表示
   - パフォーマンス監視

## 📋 実装タスクリスト

### 🔴 Phase A: 緊急調査 (即座実行)
- [ ] A.1: ブラウザコンソールエラー確認
- [ ] A.2: VRMファイル存在確認
- [ ] A.3: WebGL対応確認
- [ ] A.4: 依存関係バージョン確認

### 🟡 Phase B: 根本原因特定 (1-2時間)
- [ ] B.1: VRMViewerコンポーネント詳細ログ追加
- [ ] B.2: 最小限テストコンポーネント作成
- [ ] B.3: 段階的初期化実装
- [ ] B.4: エラー発生箇所特定

### 🟢 Phase C: 修正実装 (2-4時間)
- [ ] C.1: fallback UI実装
- [ ] C.2: エラーハンドリング強化
- [ ] C.3: 動的インポート実装
- [ ] C.4: プリロード機能追加
- [ ] C.5: 段階的初期化完成

### 🔵 Phase D: 検証・最適化 (1-2時間)
- [ ] D.1: 全ブラウザでの動作確認
- [ ] D.2: パフォーマンス測定
- [ ] D.3: エラー復旧テスト
- [ ] D.4: ドキュメント更新

## 🎯 成功指標

### 最低限成功ライン
- [ ] VRMViewer（またはfallback）が表示される
- [ ] エラーメッセージが適切に表示される
- [ ] ページクラッシュが発生しない

### 理想的成功ライン
- [ ] VRMアバターが正常に表示される
- [ ] 表情変化が動作する
- [ ] リップシンクが動作する
- [ ] パフォーマンスが良好

### 完全成功ライン
- [ ] 全ての機能が安定動作
- [ ] エラー復旧機能が動作
- [ ] 他のブラウザでも動作
- [ ] ドキュメントが完備

## ⚠️ リスク要因

### 高リスク
- **VRMファイル破損**: 代替ファイル必要
- **WebGL非対応環境**: fallback UI必須
- **メモリ不足**: 軽量化対応必要

### 中リスク
- **ライブラリ非互換**: バージョン調整必要
- **Next.js制約**: SSR/CSR対応必要

### 低リスク
- **設定問題**: 設定調整で解決
- **パス問題**: パス修正で解決

## 📈 実装優先度

1. **Priority 1 (Critical)**: Phase A調査 → C.1 fallback UI
2. **Priority 2 (High)**: B根本原因特定 → C.2-C.3 エラーハンドリング  
3. **Priority 3 (Medium)**: C.4-C.5 完全復旧
4. **Priority 4 (Low)**: D最適化・ドキュメント

この計画に基づき、まずPhase Aの調査から開始し、段階的に問題を解決していきます。

---

## 🔍 コンパイルエラー調査結果 (2025/01/06 実施)

### エラー発生状況
- **発生日時**: 2025/01/06 17:13頃
- **エラー種類**: Build Error - "Failed to compile"
- **影響範囲**: Next.js開発サーバー起動時
- **エラーファイル**: `./app/chat/page.tsx:360:31`

### エラー詳細分析

#### 🚨 主要エラーメッセージ
```
Module not found: Package path ./package.json is not exported from package 
/Users/kuniaki-k/Code/MY-AITuber/asd-aituber/apps/web/node_modules/three 
(see exports field in /Users/kuniaki-k/Code/MY-AITuber/asd-aituber/apps/web/node_modules/three/package.json)
```

#### 🔬 根本原因
1. **動的require()使用**: ChatPage.tsxで `require('three/package.json')` を使用
2. **Next.js ES Module制約**: Webpack設定によりpackage.json直接アクセスが禁止
3. **Export Field制限**: Three.jsパッケージがpackage.jsonをexportしていない
4. **ビルド時解決失敗**: 動的モジュール解決がビルド時に失敗

#### 🧩 問題の発生箇所
```typescript
// エラー発生コード (360行目)
technicalDetails={{
  webglSupported: checkWebGLSupport(),
  threeJsVersion: require('three/package.json').version,      // ❌ エラー原因
  vrmLibVersion: require('@pixiv/three-vrm/package.json').version  // ❌ エラー原因
}}
```

#### 🔧 技術的背景
- **Next.js 14.2.29**: ES Modules優先、CommonJS require()制限強化
- **Webpack Module Federation**: 動的require()の制限
- **Package.json Export Maps**: モジュールのexport制御により直接アクセス不可
- **SSR/CSR差異**: サーバーサイドとクライアントサイドでの異なる解決方法

### 修正実装

#### ✅ 修正内容
1. **動的require()除去**
   ```typescript
   // 修正前 (❌)
   threeJsVersion: require('three/package.json').version
   
   // 修正後 (✅)
   threeJsVersion: getThreeJsVersion()
   ```

2. **環境対応バージョン取得**
   ```typescript
   export function getThreeJsVersion(): string {
     if (typeof window !== 'undefined') {
       return '0.159.x'  // ブラウザ環境
     }
     return process.env.THREE_JS_VERSION || 'unknown'  // SSR環境
   }
   ```

3. **フォールバック実装**
   ```typescript
   try {
     // バージョン取得試行
   } catch (error) {
     console.warn('Could not determine version:', error)
     return 'unknown'
   }
   ```

#### 🛡 追加対策
- **エラーハンドリング強化**: 全ての動的アクセスにtry-catch
- **環境変数対応**: BUILD時にバージョン情報注入可能
- **デグレード対応**: バージョン不明時も正常動作

### 学習事項

#### 🎓 Next.js開発でのベストプラクティス
1. **動的require()は避ける**: 静的import推奨
2. **package.json直接アクセス禁止**: 代替手段の検討必要
3. **環境差異を考慮**: SSR/CSRでの実装分岐
4. **フォールバック必須**: 外部依存に頼らない設計

#### ⚠️ 今後の注意点
- **依存関係バージョン取得**: ビルド時情報活用
- **モジュール解決**: Webpack設定確認
- **テスト環境**: 実際のビルド環境でのテスト必須
- **ES Module対応**: 新しいモジュールシステムに準拠

### 解決状況
- **即座修正**: 動的require()を関数化
- **テスト実施**: ビルドエラー解消確認予定
- **監視継続**: 同様のパターンの予防

### 今後の改善案
1. **環境変数活用**: `THREE_JS_VERSION=0.159.0` 等の設定
2. **ビルド時情報注入**: Webpack DefinePlugin活用
3. **バージョン監視**: 依存関係の自動チェック実装
4. **エラー監視**: Sentry等でのランタイムエラー監視

この問題により、Next.js環境での動的モジュール解決の制約が明確になり、より堅牢な実装パターンが確立されました。

---

## 🔍 ローディング停止問題調査結果 (2025/01/06 続報)

### 問題発生状況
- **症状**: 「Loading VRM Avatar...」で処理が停止
- **表示内容**: VRMViewerFallbackのローディング状態
- **状況**: 初期化チェック処理が完了しない

### 根本原因分析

#### 🚨 特定された問題
**`AbortSignal.timeout(5000)` ブラウザ互換性問題**

```typescript
// 問題のコード (vrm-loader.ts:31)
const response = await fetch(url, { 
  method: 'HEAD',
  signal: AbortSignal.timeout(5000) // ❌ 古いブラウザで未対応
})
```

#### 🔬 技術的詳細
1. **APIサポート状況**:
   - Chrome 103+ (2022年7月)
   - Firefox 100+ (2022年5月)  
   - Safari 16.0+ (2022年9月)
   - **古いブラウザ**: 未対応

2. **エラー発生パターン**:
   ```
   TypeError: AbortSignal.timeout is not a function
   ```

3. **処理フロー問題**:
   ```
   checkVRMViewerRequirements() → 
   checkVRMFileExists() → 
   AbortSignal.timeout() エラー → 
   処理停止 (try-catchでキャッチできない場合)
   ```

#### 🧩 影響箇所
- **VRMファイル存在確認**: `checkVRMFileExists()`
- **VRM詳細情報取得**: `getVRMFileInfo()`  
- **プリロード機能**: `preloadVRMFile()`

### 調査で判明した事実

#### ✅ 正常動作部分
1. **コンパイルエラー**: 解決済み
2. **VRMViewerFallback**: 正常表示
3. **WebGLチェック**: 動作中
4. **初期化開始**: ログ出力確認

#### ❌ 問題箇所
1. **AbortSignal.timeout()**: ブラウザ互換性
2. **非同期処理**: 例外処理で停止
3. **タイムアウト機能**: 代替実装必要

### 修正が必要な実装

#### 🛠 互換性のあるタイムアウト実装
```typescript
// 修正前 (❌)
signal: AbortSignal.timeout(5000)

// 修正後 (✅)
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 5000)
signal: controller.signal
```

#### 🛡 フォールバック戦略
1. **AbortController対応**: 従来手法を使用
2. **タイムアウト実装**: setTimeoutとの組み合わせ
3. **エラーハンドリング**: より包括的なtry-catch
4. **ブラウザ検出**: 機能検出ベース実装

### 緊急度評価

#### 🔥 Critical Priority
- **ユーザー影響**: ページが使用不能
- **発生頻度**: 古いブラウザ環境で100%
- **回避手段**: なし
- **修正緊急度**: 最高

#### 📊 影響範囲
- **開発環境**: 特定ブラウザで発生
- **本番環境**: 古いブラウザユーザーに影響
- **機能**: VRM表示の可否判定
- **UX**: 完全に機能停止

### 推奨修正アプローチ

#### 1. 即座対応 (30分)
```typescript
// AbortSignal.timeout()を従来手法に置換
function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}
```

#### 2. 段階的改善 (1時間)
- ブラウザ機能検出の追加
- より堅牢なエラーハンドリング
- フォールバック戦略の実装

#### 3. 長期改善 (2時間)
- ポリフィル実装
- ブラウザ互換性テスト
- 包括的なエラー監視

### 学習事項

#### 🎓 ブラウザ互換性の重要性
1. **新しいAPI使用時**: Can I Use等での確認必須
2. **フォールバック実装**: 常に代替手段を用意
3. **プログレッシブ・エンハンスメント**: 基本機能から段階的に
4. **互換性テスト**: 複数ブラウザでの動作確認

#### ⚠️ 今後の予防策
- **API使用前チェック**: ブラウザサポート状況確認
- **Polyfill検討**: 必要に応じて追加
- **機能検出**: typeof チェック実装
- **段階的フォールバック**: 複数の代替手段

この調査により、モダンAPIの使用時における互換性考慮の重要性が明確になりました。