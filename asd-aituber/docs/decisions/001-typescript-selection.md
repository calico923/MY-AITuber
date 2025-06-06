# Architecture Decision Record 001: TypeScript選定

## ADR-001: メイン開発言語としてTypeScript選択

### ステータス
Accepted (2024-06-06)

### コンテキスト
ASD/NT模倣AITuberシステムの開発において、以下の要件を満たす必要がありました：
- リアルタイム対話（レイテンシ50ms以下）
- WebSocket通信での安定した接続
- 3D/2Dキャラクター（VRM/Live2D）のブラウザ描画
- 大規模な同時接続（将来的に1000+ユーザー）

パフォーマンス調査の結果、Node.js/TypeScriptとPython/FastAPIで以下の差が確認されました：
- WebSocketスループット: Node.js 20,000-45,000 req/sec vs Python 5,400-15,000 req/sec
- レイテンシ: Node.js 7ms vs Python 32-54ms
- 同時接続数: Node.js 60,000+ vs Python 10,000-20,000

### 決定
メインシステムの開発言語として**TypeScript (Node.js)**を採用し、高度なNLP処理が必要な部分のみPython APIとして切り出すハイブリッドアーキテクチャを採用する。

### 根拠
1. **リアルタイム性能**: AITuberの自然な会話には低遅延が必須
2. **フロントエンド統合**: TypeScriptで統一することで開発効率向上
3. **エコシステム**: Three.js、Socket.IO等の成熟したライブラリ
4. **スケーラビリティ**: イベント駆動型で高い同時接続性能

### 代替案
1. **Python (FastAPI)フルスタック**
   - 却下理由: リアルタイム性能が要件を満たさない
   
2. **Go言語**
   - 却下理由: フロントエンドとの統合が複雑、3Dライブラリが限定的

3. **Rust + WebAssembly**
   - 却下理由: 開発速度が遅い、学習コストが高い

### 結果
**良い面:**
- 期待通りの低遅延を実現
- フロントエンド/バックエンドの型共有による開発効率向上
- 単一言語による保守性向上

**課題:**
- 日本語NLP処理のためPython連携が必要
- AI/ML系ライブラリが少ない（→ Python APIで解決）

### 参考資料
- [Node.js vs Python Performance Benchmark](../research/performance-comparison.md)
- [WebSocket Performance Analysis](../research/websocket-benchmark.md)

### 更新履歴
- 2024-06-06: 初版作成
