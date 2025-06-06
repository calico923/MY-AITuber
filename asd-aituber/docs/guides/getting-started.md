# プロジェクト開始ガイド

最終更新: 2024-06-06

## 前提条件

- Node.js 18以上
- Python 3.10以上
- pnpm 8以上
- Git
- VOICEVOX（音声合成用）

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/YOUR_USERNAME/asd-aituber.git
cd asd-aituber
```

### 2. セットアップスクリプトの実行

```bash
./scripts/setup.sh
```

このスクリプトは以下を実行します：
- pnpmのインストール確認
- Node.js/Pythonバージョン確認
- 依存関係のインストール
- Python仮想環境の作成
- 環境変数ファイルの作成

### 3. 環境変数の設定

`.env`ファイルを編集して、必要なAPIキーを設定：

```env
ANTHROPIC_API_KEY=your_api_key_here
# または
OPENAI_API_KEY=your_api_key_here
```

### 4. VOICEVOXの起動

[VOICEVOX公式サイト](https://voicevox.hiroshiba.jp/)からダウンロードして起動。

### 5. 開発サーバーの起動

```bash
pnpm dev
# または
./scripts/dev.sh
```

アクセス先：
- フロントエンド: http://localhost:3000
- API: http://localhost:8000
- APIドキュメント: http://localhost:8000/docs

## プロジェクト構造

```
asd-aituber/
├── apps/
│   ├── web/        # Next.js フロントエンド
│   └── api/        # Python FastAPI
├── packages/       # 共有パッケージ
├── services/       # マイクロサービス（将来用）
├── models/         # 3Dモデル・アセット
└── docs/          # ドキュメント
```

## 次のステップ

1. [開発ガイド](./development.md)を読む
2. [アーキテクチャ概要](../architecture/overview.md)を理解する
3. 最初のPRを作成する

## トラブルシューティング

### VOICEVOXが接続できない

```bash
# VOICEVOXが起動しているか確認
curl http://localhost:50021/version
```

### pnpmが見つからない

```bash
npm install -g pnpm
```

### Python仮想環境のエラー

```bash
cd apps/api
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# または
venv\Scripts\activate  # Windows
```

## ヘルプ

問題が解決しない場合は、GitHubのIssueを作成してください。
