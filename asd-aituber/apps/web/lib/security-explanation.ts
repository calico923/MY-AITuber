/**
 * Chrome セキュリティフラグの詳細説明
 * unsafely-treat-insecure-origin-as-secure の意味と影響
 */

export interface SecurityFlagInfo {
  flagName: string
  purpose: string
  risks: string[]
  benefits: string[]
  alternatives: string[]
  recommendedUsage: string
}

/**
 * unsafely-treat-insecure-origin-as-secure フラグの詳細解説
 */
export function explainSecurityFlag(): SecurityFlagInfo {
  return {
    flagName: 'unsafely-treat-insecure-origin-as-secure',
    
    purpose: `このフラグは、HTTP（非暗号化）サイトを、HTTPS（暗号化）サイトと同等に扱うためのものです。
    
通常の動作:
• HTTP サイト → 音声認識、カメラ、位置情報などの機能が制限
• HTTPS サイト → すべての機能が利用可能

フラグ有効化後:
• 指定したHTTP サイト → HTTPS サイトと同等の権限`,

    risks: [
      '🚨 セキュリティリスクの増大',
      '🎭 中間者攻撃（Man-in-the-Middle）の可能性',
      '🕵️ 通信内容の盗聴リスク',
      '🔓 データの改ざん可能性',
      '📡 音声データの非暗号化送信',
      '⚠️ 本番環境での誤用リスク',
      '🔒 他のサイトへの影響（設定ミス時）'
    ],

    benefits: [
      '🛠️ 開発環境でのHTTPS設定不要',
      '⚡ 開発速度の向上',
      '🔧 HTTPS証明書設定の回避',
      '🧪 ローカル開発での機能テスト可能',
      '💻 開発者の作業効率向上'
    ],

    alternatives: [
      '🔐 mkcert で信頼できるローカル証明書作成',
      '🌐 ngrok でHTTPSトンネル作成',
      '🔒 local-ssl-proxy でHTTPSプロキシ',
      '☁️ Vercel/Netlify でのHTTPS展開',
      '🐳 Docker + Traefik でのHTTPS化'
    ],

    recommendedUsage: `✅ 適切な使用例:
• ローカル開発環境（localhost のみ）
• 特定のポート（例: localhost:3002）のみ指定
• 開発完了後は無効化

❌ 避けるべき使用例:
• 本番ドメインの指定
• ワイルドカード（*）の使用  
• 公開サイトでの使用
• 長期間の有効化`
  }
}

/**
 * Web Speech API のセキュリティ要件
 */
export interface WebSpeechAPISecurity {
  requirement: string
  reason: string
  exceptions: string[]
  technicalDetails: {
    protocol: string
    dataTransmission: string
    encryption: string
  }
}

export function explainWebSpeechAPISecurity(): WebSpeechAPISecurity {
  return {
    requirement: 'HTTPS接続またはlocalhostが必須',
    
    reason: `音声認識では以下の理由でセキュア接続が必要:
    
1. 🎤 音声データの機密性
   • 会話内容は非常にプライベートな情報
   • 暗号化なしでは第三者に筒抜け
   
2. 🔐 データ送信の保護  
   • 音声データはGoogleサーバーに送信
   • HTTP では通信経路で盗聴される可能性
   
3. 🛡️ ユーザーの同意と信頼
   • ブラウザがユーザーを保護するため
   • 悪意のあるサイトからの無断録音防止`,

    exceptions: [
      'localhost（開発環境として認識）',
      '127.0.0.1（ローカルループバック）',
      'file:// プロトコル（ローカルファイル）',
      'Chrome フラグによる明示的な例外設定'
    ],

    technicalDetails: {
      protocol: 'Web Speech API は Secure Context でのみ動作',
      dataTransmission: '音声データは WebRTC またはHTTPS経由でサーバーに送信',
      encryption: 'HTTPS により音声データが暗号化されて送信される'
    }
  }
}

/**
 * 開発環境でのセキュリティ設定ガイドライン
 */
export interface DevelopmentSecurityGuidelines {
  bestPractices: string[]
  commonMistakes: string[]
  securityChecklist: Array<{
    item: string
    status: 'required' | 'recommended' | 'optional'
    description: string
  }>
}

export function getDevelopmentSecurityGuidelines(): DevelopmentSecurityGuidelines {
  return {
    bestPractices: [
      '🔒 本番環境では必ずHTTPS使用',
      '🏠 開発環境でも可能な限りHTTPS化',
      '⚙️ セキュリティフラグは開発時のみ使用',
      '🗂️ 環境ごとの設定分離',
      '🔄 定期的なセキュリティ設定見直し',
      '📝 セキュリティ設定の文書化'
    ],

    commonMistakes: [
      '❌ 本番環境でセキュリティフラグを有効のまま',
      '❌ ワイルドカード（*）での例外設定',
      '❌ 不要なドメインの例外追加',
      '❌ 長期間のセキュリティフラグ有効化',
      '❌ チーム共有時の設定説明不足'
    ],

    securityChecklist: [
      {
        item: 'HTTPS証明書の設定',
        status: 'required',
        description: '本番環境では必須、開発環境でも推奨'
      },
      {
        item: 'セキュリティヘッダーの設定',
        status: 'recommended', 
        description: 'CSP, HSTS等のセキュリティヘッダー'
      },
      {
        item: 'Chromeセキュリティフラグの管理',
        status: 'required',
        description: '開発時のみ使用、本番では無効化'
      },
      {
        item: '環境変数での設定分離',
        status: 'recommended',
        description: '開発・本番環境での設定切り替え'
      },
      {
        item: 'セキュリティ設定の文書化',
        status: 'optional',
        description: 'チーム共有とメンテナンスのため'
      }
    ]
  }
}