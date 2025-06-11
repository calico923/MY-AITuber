# ドキュメント

このディレクトリには、プロジェクトに関するすべてのドキュメントが含まれています。

## 主要ドキュメント

### 📅 development-phases.md
開発フェーズ計画書
- 6フェーズの開発計画
- 各フェーズの成果物とタスク
- リスク管理と成功指標

### 📋 requirements.md
要件定義書
- プロジェクト概要
- 機能要件・非機能要件
- 技術仕様

## 構成

### 📐 architecture/
システム設計に関するドキュメント
- `overview.md` - システム全体の概要
- `frontend.md` - フロントエンド設計
- `backend.md` - バックエンド設計
- `integration.md` - システム統合設計

### 🔌 api/
API仕様書
- `rest-api.md` - REST API仕様
- `websocket.md` - WebSocket仕様
- `schemas/` - JSONスキーマ定義

### 📚 guides/
開発者向けガイド
- `getting-started.md` - プロジェクトの開始方法
- `development.md` - 開発ガイドライン
- `testing.md` - テスト戦略
- `deployment.md` - デプロイメント手順

### ⚡ features/
機能仕様書
- `asd-nt-mode.md` - ASD/NTモードの仕様
- `pcm-personality.md` - PCMパーソナリティシステム
- `emotion-analysis.md` - 感情分析機能
- `voice-synthesis.md` - 音声合成機能

### 🔬 research/
調査・研究資料
- `asd-characteristics.md` - ASD特性の研究
- `pcm-theory.md` - PCM理論の解説
- `references.md` - 参考文献リスト

### 📝 meeting-notes/
開発会議の記録（日付別）

### 🎯 decisions/
アーキテクチャ決定記録（ADR）

## ドキュメント作成ガイドライン

1. **Markdown形式**を使用
2. **図表**はMermaidまたはPlantUMLで作成
3. **コード例**は実際に動作するものを記載
4. **更新日時**を各ドキュメントに記載
5. **レビュー済み**マークを付ける

## テンプレート

新しいドキュメントを作成する際は、`decisions/template.md`を参考にしてください。
