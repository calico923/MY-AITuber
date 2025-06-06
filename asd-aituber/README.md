# ASD/NT模倣AITuberシステム

AI技術を活用して、ASD（自閉症スペクトラム障害）と定型発達（NT）のコミュニケーション特性を模倣し、相互理解を促進する教育プラットフォームです。

## 特徴

- 🤖 リアルタイムAITuber対話システム
- 🧠 ASD/NTモード切り替え機能
- 💭 PCM（Process Communication Model）6つのパーソナリティタイプ
- 🎤 VOICEVOX音声合成
- 🎨 VRMアバター表示
- 📊 感情分析と可視化

## 技術スタック

### フロントエンド
- Next.js 14 (App Router)
- TypeScript
- Three.js + @pixiv/three-vrm
- Socket.IO Client
- Tailwind CSS + shadcn/ui
- Zustand

### バックエンド
- Python FastAPI
- 日本語NLP（asari, oseti）
- WebSocket
- Docker

## セットアップ

### 必要な環境
- Node.js 18+
- Python 3.10+
- pnpm 8+
- Docker (オプション)

### インストール

```bash
# pnpmのインストール
npm install -g pnpm

# 依存関係のインストール
pnpm install

# 環境変数の設定
cp .env.example .env
```

### 開発サーバーの起動

```bash
# すべてのサービスを起動
pnpm dev

# 個別に起動
pnpm dev:web    # Next.js (http://localhost:3000)
pnpm dev:api    # FastAPI (http://localhost:8000)
```

## プロジェクト構造

```
asd-aituber/
├── apps/
│   ├── web/        # Next.js フロントエンド
│   └── api/        # Python FastAPI
├── packages/       # 共有パッケージ
├── services/       # マイクロサービス
├── models/         # 3Dモデル・アセット
└── docs/          # ドキュメント
```

## 開発ロードマップ

- [x] Phase 1: 基本構造のセットアップ
- [ ] Phase 2: AITuber基盤構築
- [ ] Phase 3: ASD/NT模倣実装
- [ ] Phase 4: PCMパーソナリティ実装

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを作成して変更内容を議論してください。

## 連絡先

質問や提案がある場合は、Issueを作成してください。
