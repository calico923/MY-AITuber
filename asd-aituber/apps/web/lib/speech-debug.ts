/**
 * Chrome Web Speech API の詳細デバッグ機能
 * APIキー不要だが接続できない原因を特定
 */

export interface SpeechAPIDebugInfo {
  apiKeyRequired: boolean
  authMethod: string
  possibleIssues: Array<{
    issue: string
    description: string
    solution: string
    priority: 'high' | 'medium' | 'low'
  }>
  networkTests: Array<{
    test: string
    status: 'pass' | 'fail' | 'unknown'
    details: string
  }>
}

/**
 * Chrome Web Speech API の認証とネットワーク問題を詳細分析
 */
export async function debugSpeechAPI(): Promise<SpeechAPIDebugInfo> {
  const issues: SpeechAPIDebugInfo['possibleIssues'] = []
  const networkTests: SpeechAPIDebugInfo['networkTests'] = []

  // 1. HTTPS チェック
  const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost'
  networkTests.push({
    test: 'HTTPS Protocol',
    status: isHTTPS ? 'pass' : 'fail',
    details: `Current: ${location.protocol}//${location.hostname}`
  })

  if (!isHTTPS) {
    issues.push({
      issue: 'HTTP接続',
      description: 'Web Speech APIはセキュアな接続でのみ動作',
      solution: 'https:// または localhost でアクセス',
      priority: 'high'
    })
  }

  // 2. Google サービスへの接続テスト
  try {
    const response = await fetch('https://www.google.com/favicon.ico', { 
      method: 'HEAD', 
      mode: 'no-cors',
      cache: 'no-cache'
    })
    networkTests.push({
      test: 'Google Services Connectivity',
      status: 'pass',
      details: 'Google サーバーに接続可能'
    })
  } catch (error) {
    networkTests.push({
      test: 'Google Services Connectivity', 
      status: 'fail',
      details: `Google サーバーに接続できません: ${error}`
    })
    
    issues.push({
      issue: 'Google サーバー接続失敗',
      description: 'ファイアウォール、VPN、プロキシがGoogleをブロック',
      solution: 'VPN無効化、ファイアウォール設定確認、別ネットワーク試行',
      priority: 'high'
    })
  }

  // 3. WebRTC 機能チェック
  const hasWebRTC = !!(window as any).RTCPeerConnection
  networkTests.push({
    test: 'WebRTC Support',
    status: hasWebRTC ? 'pass' : 'fail', 
    details: hasWebRTC ? 'WebRTC対応' : 'WebRTC非対応'
  })

  if (!hasWebRTC) {
    issues.push({
      issue: 'WebRTC 非対応',
      description: '音声ストリーミングにWebRTCが必要',
      solution: 'モダンブラウザに更新、WebRTC無効化設定を確認',
      priority: 'medium'
    })
  }

  // 4. メディアデバイス権限チェック
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const audioInputs = devices.filter(device => device.kind === 'audioinput')
    
    networkTests.push({
      test: 'Audio Input Devices',
      status: audioInputs.length > 0 ? 'pass' : 'fail',
      details: `${audioInputs.length} 個のマイクデバイス検出`
    })

    if (audioInputs.length === 0) {
      issues.push({
        issue: 'マイクデバイス未検出',
        description: 'システムにマイクが認識されていない',
        solution: 'マイク接続確認、デバイス設定確認',
        priority: 'high'
      })
    }
  } catch (error) {
    networkTests.push({
      test: 'Media Devices Access',
      status: 'fail',
      details: `メディアデバイスアクセス失敗: ${error}`
    })
  }

  // 5. Chrome の実験的機能チェック
  const userAgent = navigator.userAgent
  const chromeVersion = userAgent.match(/Chrome\/(\d+)/)
  const isChrome = !!chromeVersion
  
  networkTests.push({
    test: 'Chrome Browser',
    status: isChrome ? 'pass' : 'fail',
    details: isChrome ? `Chrome ${chromeVersion![1]}` : `非Chrome: ${userAgent}`
  })

  if (!isChrome) {
    issues.push({
      issue: '非Chrome ブラウザ',
      description: 'Web Speech API の対応が制限的',
      solution: 'Chrome ブラウザで試行',
      priority: 'medium'
    })
  }

  // 6. ネットワーク品質チェック
  const connection = (navigator as any).connection
  if (connection) {
    const slowConnection = connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'
    
    networkTests.push({
      test: 'Network Speed',
      status: slowConnection ? 'fail' : 'pass',
      details: `接続タイプ: ${connection.effectiveType}, ダウンリンク: ${connection.downlink}Mbps`
    })

    if (slowConnection) {
      issues.push({
        issue: '低速ネットワーク',
        description: 'リアルタイム音声認識には高速接続が必要',
        solution: 'より高速なネットワークに接続',
        priority: 'medium'
      })
    }
  }

  // 7. Content Security Policy チェック
  const hasCSP = !!document.querySelector('meta[http-equiv="Content-Security-Policy"]')
  if (hasCSP) {
    networkTests.push({
      test: 'Content Security Policy',
      status: 'unknown',
      details: 'CSP設定あり - connect-src の確認が必要'
    })
    
    issues.push({
      issue: 'CSP制限の可能性',
      description: 'Content Security Policy が外部接続をブロック',
      solution: 'CSP設定で *.google.com への接続を許可',
      priority: 'low'
    })
  }

  return {
    apiKeyRequired: false, // Chrome Web Speech API はAPIキー不要
    authMethod: 'Browser-managed Anonymous/Account-based Authentication',
    possibleIssues: issues.sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 }
      return priority[b.priority] - priority[a.priority]
    }),
    networkTests
  }
}

/**
 * Web Speech API が APIキー不要である理由
 */
export function explainWebSpeechAPIAuth(): {
  mechanism: string
  browserRole: string
  limitations: string[]
  differences: Array<{
    api: string
    authMethod: string
    keyRequired: boolean
  }>
} {
  return {
    mechanism: `Chrome の Web Speech API は以下の仕組みで動作：
1. ブラウザが Google の音声認識サーバーに接続
2. Chrome のユーザーアカウント または 匿名認証 を使用
3. API制限はブラウザレベルで管理（1日の利用回数など）
4. 開発者がAPIキーを管理する必要なし`,

    browserRole: `ブラウザ（Chrome）の役割：
• Google アカウントとの連携管理
• 音声データの暗号化送信  
• レート制限の管理
• ユーザープライバシー設定の適用`,

    limitations: [
      '1日の利用回数制限（詳細は非公開）',
      'インターネット接続必須',
      '音声データはGoogleサーバーに送信',
      'ブラウザ依存（Chrome以外は制限的）',
      'エンタープライズ利用には不向き'
    ],

    differences: [
      {
        api: 'Web Speech API (Chrome)',
        authMethod: 'ブラウザ管理の自動認証',
        keyRequired: false
      },
      {
        api: 'Google Cloud Speech-to-Text',
        authMethod: 'API キー または サービスアカウント',
        keyRequired: true
      },
      {
        api: 'OpenAI Whisper API', 
        authMethod: 'API キー認証',
        keyRequired: true
      },
      {
        api: 'Azure Speech Services',
        authMethod: 'Subscription Key',
        keyRequired: true
      }
    ]
  }
}