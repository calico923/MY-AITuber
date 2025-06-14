#!/bin/bash

# セットアップスクリプト

echo "🚀 ASD-AITuber セットアップを開始します..."

# 1. pnpmのチェック
if ! command -v pnpm &> /dev/null; then
    echo "📦 pnpmをインストールしています..."
    npm install -g pnpm
fi

# 2. Node.jsバージョンチェック
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18以上が必要です。"
    exit 1
fi

# 3. Python バージョンチェック
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
if [ $(echo "$PYTHON_VERSION < 3.10" | bc) -eq 1 ]; then
    echo "❌ Python 3.10以上が必要です。"
    exit 1
fi

# 4. 依存関係のインストール
echo "📦 Node.js依存関係をインストールしています..."
pnpm install

# 5. Python仮想環境のセットアップ
echo "🐍 Python環境をセットアップしています..."
cd apps/api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt 2>/dev/null || echo "⚠️  requirements.txtがまだありません"
cd ../..

# 6. 環境変数ファイルのコピー
if [ ! -f .env ]; then
    echo "📝 環境変数ファイルを作成しています..."
    cp .env.example .env
    echo "⚠️  .envファイルを編集してAPIキーを設定してください"
fi

# 7. HTTPS証明書のセットアップ
echo "🔒 HTTPS証明書をセットアップしています..."
node scripts/setup-https.js

# 8. VOICEVOXのチェック
echo "🎤 VOICEVOXの確認..."
if ! curl -s http://localhost:50021/version > /dev/null; then
    echo "⚠️  VOICEVOXが起動していません。"
    echo "   https://voicevox.hiroshiba.jp/ からダウンロードして起動してください。"
fi

# 9. Git hooks のセットアップ
if [ -d .git ]; then
    echo "🔗 Git hooksをセットアップしています..."
    # pre-commit hook
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
pnpm lint
EOF
    chmod +x .git/hooks/pre-commit
fi

echo "✅ セットアップが完了しました！"
echo ""
echo "次のステップ:"
echo "1. .envファイルを編集してAPIキーを設定"
echo "2. VOICEVOXを起動"
echo "3. HTTP版: 'pnpm dev' で開発サーバーを起動"
echo "4. HTTPS版: 'pnpm dev:https' でHTTPS開発サーバーを起動"
echo "   (音声認識機能にはHTTPS版が必要です)"
