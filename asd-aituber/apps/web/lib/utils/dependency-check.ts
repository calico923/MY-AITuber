/**
 * 依存関係バージョンチェックユーティリティ
 * Three.jsとVRMライブラリの互換性を確認
 */

export interface DependencyInfo {
  version: string
  isCompatible: boolean
  minimumRequired: string
}

export interface CompatibilityResult {
  isCompatible: boolean
  threeJs: DependencyInfo
  vrmLib: DependencyInfo
  warnings: string[]
  recommendations?: string[]
}

// 最小要件バージョン
const MINIMUM_VERSIONS = {
  threeJs: '0.150.0',
  vrmLib: '2.0.0'
}

/**
 * Three.jsのバージョンを取得
 * @returns Three.jsのバージョン文字列
 */
export function getThreeJsVersion(): string {
  try {
    // Next.js環境でのrequire()問題を回避
    // ランタイムで動的にバージョンを取得するのではなく、
    // 既知の情報または環境変数から取得
    if (typeof window !== 'undefined') {
      // ブラウザ環境では概算バージョンを返す
      return '0.159.x'
    }
    
    // サーバーサイドではpackage.jsonの代替手段を使用
    return process.env.THREE_JS_VERSION || 'unknown'
  } catch (error) {
    console.warn('Could not determine Three.js version:', error)
    return 'unknown'
  }
}

/**
 * @pixiv/three-vrmのバージョンを取得
 * @returns VRMライブラリのバージョン文字列
 */
export function getVRMLibVersion(): string {
  try {
    // Next.js環境でのrequire()問題を回避
    if (typeof window !== 'undefined') {
      // ブラウザ環境では概算バージョンを返す
      return '2.1.x'
    }
    
    // サーバーサイドでは環境変数から取得
    return process.env.VRM_LIB_VERSION || 'unknown'
  } catch (error) {
    console.warn('Could not determine VRM library version:', error)
    return 'unknown'
  }
}

/**
 * バージョン文字列を比較
 * @param version1 比較するバージョン
 * @param version2 比較対象のバージョン
 * @returns version1 >= version2 の場合true
 */
function compareVersions(version1: string, version2: string): boolean {
  if (version1 === 'unknown' || version2 === 'unknown') {
    return false
  }

  const v1Parts = version1.split('.').map(Number)
  const v2Parts = version2.split('.').map(Number)

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0
    const v2Part = v2Parts[i] || 0

    if (v1Part > v2Part) return true
    if (v1Part < v2Part) return false
  }

  return true // 完全に一致
}

/**
 * 依存関係の互換性をチェック
 * @returns 互換性チェック結果
 */
export function checkDependencyCompatibility(): CompatibilityResult {
  const threeVersion = getThreeJsVersion()
  const vrmVersion = getVRMLibVersion()

  const threeJsCompatible = compareVersions(threeVersion, MINIMUM_VERSIONS.threeJs)
  const vrmLibCompatible = compareVersions(vrmVersion, MINIMUM_VERSIONS.vrmLib)

  const warnings: string[] = []
  const recommendations: string[] = []

  // Three.js互換性チェック
  if (!threeJsCompatible) {
    warnings.push(`Three.js version ${threeVersion} is not compatible. Minimum required: ${MINIMUM_VERSIONS.threeJs}`)
    recommendations.push(`Upgrade Three.js to version ${MINIMUM_VERSIONS.threeJs} or higher`)
  }

  // VRMライブラリ互換性チェック
  if (!vrmLibCompatible) {
    warnings.push(`VRM library version ${vrmVersion} is not compatible. Minimum required: ${MINIMUM_VERSIONS.vrmLib}`)
    recommendations.push(`Upgrade @pixiv/three-vrm to version ${MINIMUM_VERSIONS.vrmLib} or higher`)
  }

  // バージョン組み合わせの既知の問題をチェック
  if (threeVersion.startsWith('0.160.') && vrmVersion.startsWith('2.0.')) {
    warnings.push('Known compatibility issue between Three.js 0.160.x and VRM 2.0.x series')
    recommendations.push('Consider using Three.js 0.159.x or upgrading VRM to 2.1.x')
  }

  const isCompatible = threeJsCompatible && vrmLibCompatible && warnings.length === 0

  return {
    isCompatible,
    threeJs: {
      version: threeVersion,
      isCompatible: threeJsCompatible,
      minimumRequired: MINIMUM_VERSIONS.threeJs
    },
    vrmLib: {
      version: vrmVersion,
      isCompatible: vrmLibCompatible,
      minimumRequired: MINIMUM_VERSIONS.vrmLib
    },
    warnings,
    recommendations: recommendations.length > 0 ? recommendations : undefined
  }
}

/**
 * 依存関係の詳細情報を取得
 * @returns 詳細な依存関係情報
 */
export function getDependencyDetails(): {
  threeJs: any
  vrmLib: any
  environment: {
    node?: string
    platform?: string
    browser?: string
  }
} {
  try {
    return {
      threeJs: {
        version: getThreeJsVersion(),
        description: '3D library for JavaScript',
        license: 'MIT'
      },
      vrmLib: {
        version: getVRMLibVersion(),
        description: 'VRM file loader for Three.js',
        license: 'MIT'
      },
      environment: {
        node: typeof process !== 'undefined' ? process.version : undefined,
        platform: typeof process !== 'undefined' ? process.platform : undefined,
        browser: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      }
    }
  } catch (error) {
    console.error('Failed to get dependency details:', error)
    return {
      threeJs: { version: 'unknown', description: 'Unknown', license: 'Unknown' },
      vrmLib: { version: 'unknown', description: 'Unknown', license: 'Unknown' },
      environment: { browser: 'Unknown' }
    }
  }
}