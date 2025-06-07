# Phase 1: 基盤構築 タスクリスト

期間: 3週間（Day 1-21）

## Week 1: 環境構築

### Day 1-2: プロジェクト初期化
- [ ] GitHubリポジトリ作成
  - [ ] READMEテンプレート作成
  - [ ] .gitignore設定（Node.js, Python, IDE）
  - [ ] ライセンス選択（MIT）
  - [ ] Issue/PRテンプレート作成
- [ ] モノレポ構造作成
  ```
  asd-aituber/
  ├── apps/
  │   ├── web/       # Next.js
  │   └── api/       # Python FastAPI
  ├── packages/      # 共有コード
  │   ├── types/     # TypeScript型定義
  │   └── utils/     # 共通ユーティリティ
  ├── docker/
  └── scripts/
  ```
- [ ] pnpm workspace設定
  ```yaml
  # pnpm-workspace.yaml
  packages:
    - 'apps/*'
    - 'packages/*'
  ```

### Day 3-4: Docker環境構築
- [ ] docker-compose.yml作成
  ```yaml
  services:
    web:
      build: ./apps/web
      ports: ["3000:3000"]
    api:
      build: ./apps/api
      ports: ["8000:8000"]
    db:
      image: postgres:15
  ```
- [ ] 各サービスのDockerfile作成
  - [ ] Next.js用（マルチステージビルド）
  - [ ] FastAPI用（Python 3.11ベース）
  - [ ] 開発用ボリュームマウント設定
- [ ] 環境変数管理
  - [ ] .env.example作成
  - [ ] docker-compose.override.yml（ローカル用）

### Day 5: TypeScript/Node.js環境
- [ ] Next.js 14プロジェクト作成
  ```bash
  pnpm create next-app apps/web --typescript --app --tailwind
  ```
- [ ] TypeScript設定最適化
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "paths": {
        "@/*": ["./src/*"],
        "@packages/*": ["../../packages/*"]
      }
    }
  }
  ```
- [ ] ESLint/Prettier設定
  - [ ] .eslintrc.json（Airbnb設定ベース）
  - [ ] .prettierrc（セミコロンあり、シングルクォート）
  - [ ] husky + lint-staged設定

### Day 6-7: Python/FastAPI環境
- [ ] FastAPIプロジェクト初期化
  ```
  apps/api/
  ├── app/
  │   ├── __init__.py
  │   ├── main.py
  │   ├── routers/
  │   └── models/
  ├── tests/
  ├── requirements.txt
  └── pyproject.toml
  ```
- [ ] Poetry設定（依存関係管理）
  ```toml
  [tool.poetry]
  python = "^3.11"
  dependencies = {
    fastapi = "^0.104.0",
    uvicorn = "^0.24.0",
    pydantic = "^2.5.0"
  }
  ```
- [ ] 開発ツール設定
  - [ ] Black（コードフォーマッター）
  - [ ] Ruff（高速リンター）
  - [ ] pytest設定
  - [ ] mypy（型チェック）

## Week 2: 通信基盤

### Day 8-9: WebSocketサーバー実装
- [ ] Socket.IOサーバー初期化（apps/web/src/lib/socket/）
  ```typescript
  // server.ts
  export const initSocketServer = (httpServer: Server) => {
    const io = new SocketIOServer(httpServer, {
      cors: { origin: process.env.NEXT_PUBLIC_APP_URL },
      transports: ['websocket', 'polling']
    });
  };
  ```
- [ ] 接続管理システム
  ```typescript
  class ConnectionManager {
    private connections = new Map<string, SocketConnection>();
    
    handleConnection(socket: Socket) {
      const connection = new SocketConnection(socket);
      this.connections.set(socket.id, connection);
    }
  }
  ```
- [ ] イベントハンドラー基盤
  - [ ] メッセージイベント
  - [ ] 状態同期イベント
  - [ ] エラーハンドリング
  - [ ] 再接続ロジック

### Day 10-11: TypeScript⇔Python API連携
- [ ] 共有型定義パッケージ作成（packages/types/）
  ```typescript
  // packages/types/src/api.ts
  export interface EmotionAnalysisRequest {
    text: string;
    mode: 'ASD' | 'NT';
    context?: ConversationContext;
  }
  ```
- [ ] OpenAPI自動生成設定
  ```python
  # FastAPIからOpenAPI仕様生成
  @app.get("/openapi.json")
  async def openapi():
      return app.openapi()
  ```
- [ ] TypeScript APIクライアント生成
  ```bash
  pnpm openapi-typescript http://localhost:8000/openapi.json --output ./src/lib/api/types.ts
  ```
- [ ] Axios/Fetchラッパー実装
  ```typescript
  class APIClient {
    async analyzeEmotion(request: EmotionAnalysisRequest) {
      return this.post<EmotionAnalysisResponse>('/emotion/analyze', request);
    }
  }
  ```

### Day 12-13: エラーハンドリングとロギング
- [ ] 統一エラー型定義
  ```typescript
  interface APIError {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
  }
  ```
- [ ] グローバルエラーハンドラー（Next.js）
  - [ ] app/error.tsx実装
  - [ ] ErrorBoundary設定
  - [ ] Sentryintegration（オプション）
- [ ] ロギングシステム構築
  - [ ] Winston（Node.js）/structlog（Python）設定
  - [ ] ログレベル管理
  - [ ] リクエストIDトラッキング

### Day 14: CI/CD基盤
- [ ] GitHub Actions設定
  ```yaml
  # .github/workflows/ci.yml
  jobs:
    lint:
      - TypeScript/ESLint
      - Python/Ruff
    test:
      - Jest（単体テスト）
      - pytest（APIテスト）
    build:
      - Next.jsビルド
      - Dockerイメージビルド
  ```
- [ ] 自動デプロイ設定（develop→staging）
- [ ] ブランチ保護ルール設定

## Week 3: フロントエンド基盤

### Day 15-16: Next.js基本実装
- [ ] アプリケーション構造設計
  ```
  apps/web/src/
  ├── app/
  │   ├── (auth)/
  │   ├── (main)/
  │   │   ├── layout.tsx
  │   │   └── page.tsx
  │   └── api/
  ├── components/
  │   ├── ui/        # 基本UIコンポーネント
  │   └── features/  # 機能別コンポーネント
  └── lib/
      ├── hooks/
      └── utils/
  ```
- [ ] レイアウトシステム実装
  - [ ] ヘッダー/フッター
  - [ ] サイドバー（設定パネル）
  - [ ] レスポンシブ対応
- [ ] ルーティング設計
  - [ ] /chat - メインチャット画面
  - [ ] /scenarios - シナリオ一覧
  - [ ] /settings - 設定画面

### Day 17-18: UIコンポーネントライブラリ
- [ ] 基本コンポーネント実装
  ```typescript
  // Button, Input, Select, Toggle, Card, Modal等
  export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', ...props }, ref) => {
      return <button ref={ref} className={cn(variants[variant], sizes[size])} {...props} />;
    }
  );
  ```
- [ ] Tailwind CSS設定
  ```js
  // tailwind.config.js
  theme: {
    extend: {
      colors: {
        asd: { /* ASDモード用カラー */ },
        nt: { /* NTモード用カラー */ }
      }
    }
  }
  ```
- [ ] Storybookセットアップ
  - [ ] コンポーネントカタログ
  - [ ] インタラクションテスト

### Day 19-20: アクセシビリティ基盤
- [ ] WCAG 2.1 AA準拠チェックリスト作成
- [ ] アクセシビリティコンポーネント実装
  ```typescript
  // SkipLinks, LiveRegion, FocusTrap等
  export const SkipLinks = () => (
    <nav aria-label="スキップリンク">
      <a href="#main" className="sr-only focus:not-sr-only">
        メインコンテンツへスキップ
      </a>
    </nav>
  );
  ```
- [ ] キーボードナビゲーション実装
  - [ ] Tab順序管理
  - [ ] ショートカットキー定義
  - [ ] フォーカス管理hooks
- [ ] スクリーンリーダー対応
  - [ ] ARIA属性の適切な使用
  - [ ] 動的コンテンツのaria-live
  - [ ] 画像の代替テキスト

### Day 21: 状態管理セットアップ
- [ ] Zustand store設計
  ```typescript
  // stores/chatStore.ts
  interface ChatState {
    mode: 'ASD' | 'NT';
    messages: Message[];
    isConnected: boolean;
    
    // Actions
    setMode: (mode: 'ASD' | 'NT') => void;
    addMessage: (message: Message) => void;
  }
  ```
- [ ] 永続化設定（localStorage）
- [ ] DevTools統合

## 成果物チェックリスト

### 必須成果物
- [ ] 動作する開発環境（Docker Compose）
- [ ] TypeScript⇔Python間の通信確認
- [ ] WebSocketによるリアルタイム通信
- [ ] 基本的なUIフレームワーク
- [ ] アクセシビリティ対応の基盤

### ドキュメント
- [ ] セットアップ手順書
- [ ] アーキテクチャ図
- [ ] API仕様書（OpenAPI）
- [ ] コンポーネントカタログ（Storybook）

### テスト
- [ ] ユニットテスト環境構築
- [ ] E2Eテスト環境準備
- [ ] CI/CDパイプライン動作確認

## リスクと対策

| リスク | 対策 |
|--------|------|
| モノレポ設定の複雑性 | 段階的に設定を追加、ドキュメント化 |
| TypeScript/Python間の型不整合 | OpenAPI経由での自動生成を活用 |
| WebSocket接続の不安定性 | 再接続ロジックとフォールバック実装 |

## 次のフェーズへの準備

Phase 2（VRM統合）に向けて：
- [ ] Three.jsの基本動作確認
- [ ] VRMサンプルモデルの準備
- [ ] WebGLコンテキストの設定確認