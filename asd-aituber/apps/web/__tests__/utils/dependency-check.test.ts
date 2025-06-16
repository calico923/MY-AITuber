import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getThreeJsVersion, getVRMLibVersion, checkDependencyCompatibility } from '@/lib/utils/dependency-check'

describe('Dependency Version Check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window object for SSR tests
    vi.stubGlobal('window', global.window)
  })

  it('should verify Three.js version compatibility', () => {
    const threeVersion = getThreeJsVersion()
    expect(threeVersion).toMatch(/^0\.1[5-9]\d\./)
    expect(threeVersion).toBeDefined()
  })
  
  it('should verify @pixiv/three-vrm version', () => {
    const vrmVersion = getVRMLibVersion()
    expect(vrmVersion).toMatch(/^2\.\d+\./)
    expect(vrmVersion).toBeDefined()
  })

  it('should check overall compatibility', () => {
    const compatibility = checkDependencyCompatibility()
    
    expect(compatibility).toHaveProperty('isCompatible')
    expect(compatibility).toHaveProperty('threeJs')
    expect(compatibility).toHaveProperty('vrmLib')
    expect(compatibility).toHaveProperty('warnings')
    
    expect(typeof compatibility.isCompatible).toBe('boolean')
    expect(Array.isArray(compatibility.warnings)).toBe(true)
  })

  it('should detect incompatible Three.js versions', () => {
    // SSR環境で古いバージョンをシミュレート
    const originalWindow = global.window
    const originalEnv = process.env.THREE_JS_VERSION
    
    vi.stubGlobal('window', undefined)
    process.env.THREE_JS_VERSION = '0.140.0'

    const compatibility = checkDependencyCompatibility()
    
    expect(compatibility.isCompatible).toBe(false)
    expect(compatibility.warnings.length).toBeGreaterThan(0)
    expect(compatibility.warnings.some(w => w.toLowerCase().includes('three.js') && w.toLowerCase().includes('not compatible'))).toBe(true)
    
    // 環境変数を復元
    vi.stubGlobal('window', originalWindow)
    process.env.THREE_JS_VERSION = originalEnv
  })

  it('should detect incompatible VRM library versions', () => {
    // SSR環境で古いバージョンをシミュレート
    const originalWindow = global.window
    const originalEnv = process.env.VRM_LIB_VERSION
    
    vi.stubGlobal('window', undefined)
    process.env.VRM_LIB_VERSION = '1.0.0'

    const compatibility = checkDependencyCompatibility()
    
    expect(compatibility.isCompatible).toBe(false)
    expect(compatibility.warnings.length).toBeGreaterThan(0)
    expect(compatibility.warnings.some(w => w.toLowerCase().includes('vrm library') && w.toLowerCase().includes('not compatible'))).toBe(true)
    
    // 環境変数を復元
    vi.stubGlobal('window', originalWindow)
    process.env.VRM_LIB_VERSION = originalEnv
  })

  it('should provide detailed version information', () => {
    const compatibility = checkDependencyCompatibility()
    
    expect(compatibility.threeJs).toHaveProperty('version')
    expect(compatibility.threeJs).toHaveProperty('isCompatible')
    expect(compatibility.threeJs).toHaveProperty('minimumRequired')

    expect(compatibility.vrmLib).toHaveProperty('version')
    expect(compatibility.vrmLib).toHaveProperty('isCompatible')
    expect(compatibility.vrmLib).toHaveProperty('minimumRequired')
  })

  it('should handle missing package.json gracefully', () => {
    // Mock 環境変数が未設定の場合（サーバーサイド環境）
    const originalWindow = global.window
    const originalThreeEnv = process.env.THREE_JS_VERSION
    const originalVrmEnv = process.env.VRM_LIB_VERSION
    
    vi.stubGlobal('window', undefined) // SSR環境
    delete process.env.THREE_JS_VERSION
    delete process.env.VRM_LIB_VERSION

    const threeVersion = getThreeJsVersion()
    expect(threeVersion).toBe('unknown')
    
    // 環境変数を復元
    vi.stubGlobal('window', originalWindow)
    process.env.THREE_JS_VERSION = originalThreeEnv
    process.env.VRM_LIB_VERSION = originalVrmEnv
  })

  it('should provide compatibility recommendations', () => {
    const compatibility = checkDependencyCompatibility()
    
    if (!compatibility.isCompatible) {
      expect(compatibility).toHaveProperty('recommendations')
      expect(Array.isArray(compatibility.recommendations)).toBe(true)
    }
  })

  it('should handle SSR environment correctly', () => {
    // SSR環境をシミュレート（環境変数が設定されている場合）
    const originalWindow = global.window
    vi.stubGlobal('window', undefined)
    process.env.THREE_JS_VERSION = '0.159.0'
    
    const version = getThreeJsVersion()
    expect(version).toBeDefined()
    expect(version).toBe('0.159.0')
    
    // 環境を復元
    vi.stubGlobal('window', originalWindow)
    delete process.env.THREE_JS_VERSION
  })

  it('should not use dynamic require for package.json', () => {
    // getThreeJsVersion内でrequire()を使用していないことを確認
    const fnString = getThreeJsVersion.toString()
    expect(fnString).not.toContain('require(')
    expect(fnString).not.toContain('package.json')
  })
})