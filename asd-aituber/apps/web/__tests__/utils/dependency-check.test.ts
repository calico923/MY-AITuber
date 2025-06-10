import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getThreeJsVersion, getVRMLibVersion, checkDependencyCompatibility } from '@/lib/utils/dependency-check'

// パッケージのバージョン情報をモック
vi.mock('three/package.json', () => ({
  default: { version: '0.159.0' }
}))

vi.mock('@pixiv/three-vrm/package.json', () => ({
  default: { version: '2.1.0' }
}))

describe('Dependency Version Check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should verify Three.js version compatibility', () => {
    const threeVersion = getThreeJsVersion()
    expect(threeVersion).toMatch(/^0\.1[5-9]\d\./)
    expect(threeVersion).toBeDefined()
  })
  
  it('should verify @pixiv/three-vrm version', () => {
    const vrmVersion = getVRMLibVersion()
    expect(vrmVersion).toMatch(/^2\.\d+\.\d+/)
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
    // Mock古いバージョン
    vi.doMock('three/package.json', () => ({
      default: { version: '0.140.0' }
    }))

    const compatibility = checkDependencyCompatibility()
    
    expect(compatibility.isCompatible).toBe(false)
    expect(compatibility.warnings).toContain(expect.stringMatching(/three\.js version.*not compatible/i))
  })

  it('should detect incompatible VRM library versions', () => {
    // Mock古いバージョン
    vi.doMock('@pixiv/three-vrm/package.json', () => ({
      default: { version: '1.0.0' }
    }))

    const compatibility = checkDependencyCompatibility()
    
    expect(compatibility.isCompatible).toBe(false)
    expect(compatibility.warnings).toContain(expect.stringMatching(/vrm library version.*not compatible/i))
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
    // Mock パッケージが見つからない場合
    vi.doMock('three/package.json', () => {
      throw new Error('Package not found')
    })

    const threeVersion = getThreeJsVersion()
    expect(threeVersion).toBe('unknown')
  })

  it('should provide compatibility recommendations', () => {
    const compatibility = checkDependencyCompatibility()
    
    if (!compatibility.isCompatible) {
      expect(compatibility).toHaveProperty('recommendations')
      expect(Array.isArray(compatibility.recommendations)).toBe(true)
    }
  })
})