# Architecture Decision Record 002: ハイブリッドアーキテクチャ

## ADR-002: TypeScript + Pythonハイブリッドアーキテクチャの採用

### ステータス
Accepted (2024-06-06)

### コンテキスト
TypeScriptをメイン言語として選定したが、以下の要件への対応が必要でした：
- 高度な日本語自然言語処理（形態素解析、感情分析）
- ASD/NT認知モデルの実装
- PCMパーソナリティエンジン
- 既存の日本語NLPライブラリの活用

調査の結果、日本語NLPに関しては：
- TypeScript/JavaScript: 成熟したライブラリが少ない
- Python: SudachiPy、GiNZA、oseti等の充実したエコシステム

### 決定
**TypeScriptメイン + Python API**のハイブリッドアーキテクチャを採用する：

```
[TypeScript/Node.js]
- フロントエンド（Next.js）
- リアルタイム通信（Socket.IO）
- LLM API呼び出し
- 音声合成連携（VOICEVOX）
- 3D/2D描画（Three.js/Live2D）

[Python/FastAPI]
- 日本語形態素解析
- 感情分析
- ASD/NT認知処理
- PCMパーソナリティエンジン
```

### 根拠
1. **適材適所**: 各言語の強みを最大限活用
2. **既存資産の活用**: 日本語NLPの成熟したPythonライブラリ
3. **マイクロサービス**: 疎結合で独立したスケーリング可能
4. **開発効率**: 専門分野ごとに最適な言語を使用

### 代替案
1. **TypeScriptのみ（NLP自作）**
   - 却下理由: 開発工数が膨大、精度の保証が困難

2. **Pythonのみ（リアルタイム性能妥協）**
   - 却下理由: レイテンシ要件（50ms以下）を満たせない

3. **gRPCによる緊密結合**
   - 却下理由: 複雑性が増し、開発速度が低下

### 結果
**良い面:**
- 各言語の強みを活かした最適なパフォーマンス
- 独立したサービスとして開発・テスト可能
- 将来的な言語変更も容易

**課題:**
- サービス間通信のオーバーヘッド（最大200ms）
- デプロイメントの複雑性増加
- 型定義の同期が必要

**対策:**
- 通信の最適化（バッチ処理、キャッシング）
- Docker Composeによる統合管理
- 共有型定義パッケージの作成

### 実装詳細

**通信プロトコル:**
```typescript
// TypeScript側
interface EmotionAnalysisRequest {
  text: string;
  mode: "ASD" | "NT";
  context?: ConversationContext;
}

// Python側（Pydantic）
class EmotionAnalysisRequest(BaseModel):
    text: str
    mode: Literal["ASD", "NT"]
    context: Optional[Dict[str, Any]] = None
```

**API設計原則:**
1. RESTful設計（将来的にgRPC移行も検討）
2. 冪等性の確保
3. エラーハンドリングの標準化
4. レスポンスキャッシング

### 参考資料
- [Microservices Architecture Pattern](https://microservices.io/)
- [FastAPI Performance Benchmarks](https://www.techempower.com/benchmarks/)
- [TypeScript + Python Integration Best Practices](../guides/integration.md)

### 更新履歴
- 2024-06-06: 初版作成
