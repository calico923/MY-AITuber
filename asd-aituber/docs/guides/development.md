# 開発ガイドライン

最終更新: 2024-06-06

## 開発環境のセットアップ

### 必要なツール

1. **Node.js** (v18以上)
   ```bash
   # nodebrewやnvmでインストール
   nvm install 18
   nvm use 18
   ```

2. **Python** (3.10以上)
   ```bash
   # pyenvでインストール
   pyenv install 3.11.0
   pyenv local 3.11.0
   ```

3. **pnpm** (v8以上)
   ```bash
   npm install -g pnpm
   ```

4. **Docker** (オプション)
   - Docker Desktop推奨

### VSCode拡張機能（推奨）

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-python.python",
    "ms-python.vscode-pylance",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "mikestead.dotenv"
  ]
}
```

## コーディング規約

### TypeScript/JavaScript

1. **命名規則**
   ```typescript
   // インターフェース: PascalCase
   interface UserProfile { }
   
   // 型エイリアス: PascalCase
   type ConversationMode = "ASD" | "NT";
   
   // クラス: PascalCase
   class EmotionProcessor { }
   
   // 関数・変数: camelCase
   const processMessage = (text: string) => { };
   
   // 定数: UPPER_SNAKE_CASE
   const MAX_MESSAGE_LENGTH = 1000;
   
   // Reactコンポーネント: PascalCase
   const ChatInterface: React.FC = () => { };
   ```

2. **ファイル構成**
   ```typescript
   // 1ファイル1エクスポートを推奨
   // components/ChatMessage.tsx
   export const ChatMessage: React.FC<Props> = () => { };
   
   // hooks/useWebSocket.ts
   export const useWebSocket = () => { };
   
   // utils/emotionAnalysis.ts
   export const analyzeEmotion = () => { };
   ```

3. **型定義**
   ```typescript
   // 明示的な型定義を推奨
   const processInput = (text: string): ProcessedInput => {
     // 処理
   };
   
   // anyの使用は禁止
   // unknown を使って型ガードで絞り込む
   const handleUnknownData = (data: unknown) => {
     if (isValidData(data)) {
       // 処理
     }
   };
   ```

### Python

1. **命名規則（PEP 8準拠）**
   ```python
   # クラス: PascalCase
   class EmotionAnalyzer:
       pass
   
   # 関数・変数: snake_case
   def analyze_emotion(text: str) -> EmotionResult:
       pass
   
   # 定数: UPPER_SNAKE_CASE
   MAX_TOKEN_LENGTH = 512
   
   # プライベート: 先頭アンダースコア
   def _internal_process(self):
       pass
   ```

2. **型ヒント**
   ```python
   from typing import List, Dict, Optional, Union
   from pydantic import BaseModel
   
   class EmotionRequest(BaseModel):
       text: str
       mode: Literal["ASD", "NT"]
       context: Optional[Dict[str, Any]] = None
   
   async def process_request(
       request: EmotionRequest
   ) -> EmotionResponse:
       # 処理
       pass
   ```

### Git コミットメッセージ

```bash
# フォーマット: <type>(<scope>): <subject>

feat(chat): AITuberの基本会話機能を実装
fix(vrm): モデル読み込み時のメモリリークを修正
docs(api): REST APIのエンドポイント仕様を追加
style(components): コードフォーマットを統一
refactor(emotion): 感情分析ロジックを最適化
test(pcm): PCMパーソナリティのユニットテストを追加
chore(deps): 依存関係を更新
```

## プロジェクト構造のルール

### ディレクトリ構成の原則

1. **機能別整理**
   ```
   src/
   ├── features/        # 機能別モジュール
   │   ├── chat/       # チャット機能
   │   ├── avatar/     # アバター機能
   │   └── emotion/    # 感情機能
   ├── components/     # 共通UIコンポーネント
   ├── hooks/         # カスタムフック
   └── utils/         # ユーティリティ
   ```

2. **各機能モジュールの構成**
   ```
   features/chat/
   ├── components/    # この機能専用のコンポーネント
   ├── hooks/        # この機能専用のフック
   ├── services/     # APIクライアント等
   ├── types.ts      # 型定義
   └── index.ts      # エクスポート
   ```

## 開発フロー

### 1. ブランチ戦略

```bash
main                 # 本番環境
├── develop         # 開発環境
    ├── feature/*   # 新機能開発
    ├── fix/*       # バグ修正
    └── refactor/*  # リファクタリング
```

### 2. 開発手順

1. **Issue作成**
   - 実装内容を明確に記載
   - ラベル付け（enhancement, bug等）

2. **ブランチ作成**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/issue-123-chat-interface
   ```

3. **開発**
   - TDD（テスト駆動開発）を推奨
   - 定期的にコミット

4. **プルリクエスト**
   - developブランチへPR作成
   - セルフレビューチェックリスト確認
   - CIのパスを確認

### 3. レビューチェックリスト

- [ ] コードが要件を満たしている
- [ ] テストが追加/更新されている
- [ ] ドキュメントが更新されている
- [ ] 型定義が適切
- [ ] エラーハンドリングが実装されている
- [ ] パフォーマンスへの影響を考慮
- [ ] アクセシビリティを考慮

## テスト戦略

### 1. テストの種類

```typescript
// ユニットテスト (*.test.ts)
describe('EmotionAnalyzer', () => {
  test('should detect literal interpretation need', () => {
    const result = analyzeEmotion('時間が飛ぶ', 'ASD');
    expect(result.needsLiteralInterpretation).toBe(true);
  });
});

// 統合テスト (*.integration.test.ts)
describe('Chat API Integration', () => {
  test('should process message through full pipeline', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'こんにちは', mode: 'ASD' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('response');
  });
});
```

### 2. テストカバレッジ目標

- ユニットテスト: 80%以上
- 統合テスト: 主要フローをカバー
- E2Eテスト: クリティカルパスのみ

## パフォーマンス最適化

### 1. フロントエンド

```typescript
// メモ化の活用
const MemoizedComponent = React.memo(({ data }) => {
  // レンダリング最適化
});

// 遅延読み込み
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// デバウンス
const debouncedSearch = useMemo(
  () => debounce(searchFunction, 300),
  []
);
```

### 2. バックエンド

```python
# 非同期処理の活用
async def process_multiple_requests(requests: List[Request]):
    tasks = [process_single(req) for req in requests]
    results = await asyncio.gather(*tasks)
    return results

# キャッシング
from functools import lru_cache

@lru_cache(maxsize=1000)
def expensive_calculation(input_data: str) -> Result:
    # 重い処理
    pass
```

## セキュリティガイドライン

### 1. 環境変数

```typescript
// 絶対にコミットしない
// .env.local
ANTHROPIC_API_KEY=sk-xxx
DATABASE_URL=postgresql://...

// 環境変数の型定義
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ANTHROPIC_API_KEY: string;
      DATABASE_URL: string;
    }
  }
}
```

### 2. 入力検証

```typescript
// Zodによるスキーマ検証
import { z } from 'zod';

const MessageSchema = z.object({
  text: z.string().min(1).max(1000),
  mode: z.enum(['ASD', 'NT']),
});

// 使用例
const validateInput = (data: unknown) => {
  return MessageSchema.parse(data);
};
```

## トラブルシューティング

### よくある問題と解決方法

1. **pnpm install が失敗する**
   ```bash
   # キャッシュクリア
   pnpm store prune
   # node_modules削除
   rm -rf node_modules
   pnpm install
   ```

2. **Python仮想環境の問題**
   ```bash
   # 仮想環境を作り直す
   cd apps/api
   rm -rf venv
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **TypeScriptの型エラー**
   ```bash
   # 型定義の再生成
   pnpm run generate-types
   # TypeScriptキャッシュクリア
   rm -rf .next
   ```

## リソース

- [TypeScript公式ドキュメント](https://www.typescriptlang.org/docs/)
- [FastAPI公式ドキュメント](https://fastapi.tiangolo.com/)
- [React公式ドキュメント](https://react.dev/)
- [Next.js公式ドキュメント](https://nextjs.org/docs)
