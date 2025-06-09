# HTTPS開発環境セットアップガイド

## 🔍 現在の問題
音声認識にはHTTPS接続が必要ですが、開発サーバーがHTTPで動作しています。

## 🚀 緊急解決策

### 方法1: Chromeフラグでローカル例外設定
1. Chrome で `chrome://flags/#unsafely-treat-insecure-origin-as-secure` にアクセス
2. "Insecure origins treated as secure" を **Enabled** に設定
3. テキストボックスに `http://localhost:3002` を入力
4. Chrome を再起動

### 方法2: ngrokを使用したHTTPS化
```bash
# ngrokをインストール（未インストールの場合）
brew install ngrok

# 開発サーバーをHTTPS化
ngrok http 3002
```

### 方法3: 自己署名証明書 + local-ssl-proxy
```bash
# local-ssl-proxyをインストール
npm install -g local-ssl-proxy

# HTTPS プロキシを起動（別ターミナル）
local-ssl-proxy --source 3443 --target 3002 --cert cert.pem --key key.pem

# アクセス: https://localhost:3443
```

### 方法4: mkcertを使用した信頼できる証明書
```bash
# mkcertをインストール
brew install mkcert

# ローカル認証局を設定
mkcert -install

# localhost用証明書を生成
mkcert localhost 127.0.0.1 ::1

# 証明書を使用してHTTPSサーバーを起動
```

## 🎯 推奨手順

**最も簡単な方法:**
1. **方法1のChromeフラグ設定**を試す
2. 効果がない場合は**方法2のngrok**を使用

**本格的な開発環境:**
- **方法4のmkcert**で信頼できる証明書を作成

## 📊 各方法の比較

| 方法 | 難易度 | セキュリティ | 外部アクセス | 推奨度 |
|------|--------|--------------|--------------|--------|
| Chromeフラグ | ⭐ | ⚠️ | ❌ | 開発のみ |
| ngrok | ⭐⭐ | ✅ | ✅ | テスト |
| local-ssl-proxy | ⭐⭐⭐ | ✅ | ❌ | 開発 |
| mkcert | ⭐⭐⭐⭐ | ✅ | ❌ | 本格開発 |

## ⚡ 現在のサーバー情報
- URL: http://localhost:3002
- 必要: https://localhost:3002 または https://localhost:3443
- 証明書: cert.pem, key.pem (作成済み)

## 🚨 重要
音声認識が動作しない主な原因は**HTTPS要件**です。
上記のいずれかの方法でHTTPS化すれば解決する可能性が高いです。