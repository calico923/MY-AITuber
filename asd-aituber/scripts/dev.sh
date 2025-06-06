#!/bin/bash

# 開発環境起動スクリプト

echo "🚀 開発環境を起動します..."

# VOICEVOXチェック
if ! curl -s http://localhost:50021/version > /dev/null; then
    echo "⚠️  VOICEVOXが起動していません。起動してから再実行してください。"
    exit 1
fi

# tmuxがインストールされているか確認
if command -v tmux &> /dev/null; then
    echo "📺 tmuxで各サービスを起動します..."
    
    # tmuxセッション作成
    tmux new-session -d -s asd-aituber
    
    # Web (Next.js)
    tmux rename-window -t asd-aituber:0 'web'
    tmux send-keys -t asd-aituber:0 'cd apps/web && pnpm dev' C-m
    
    # API (FastAPI)
    tmux new-window -t asd-aituber:1 -n 'api'
    tmux send-keys -t asd-aituber:1 'cd apps/api && source venv/bin/activate && uvicorn app.main:app --reload --port 8000' C-m
    
    # ログ表示
    tmux new-window -t asd-aituber:2 -n 'logs'
    tmux send-keys -t asd-aituber:2 'tail -f apps/web/.next/server/app-paths-manifest.json' C-m
    
    # tmuxセッションにアタッチ
    tmux attach-session -t asd-aituber
else
    echo "📋 通常モードで起動します..."
    echo "Ctrl+Cで停止できます"
    
    # バックグラウンドでサービス起動
    trap 'kill $(jobs -p)' EXIT
    
    # Web
    (cd apps/web && pnpm dev) &
    
    # API
    (cd apps/api && source venv/bin/activate && uvicorn app.main:app --reload --port 8000) &
    
    # 待機
    wait
fi
