import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkWebGLSupport } from '@/lib/utils/webgl-check'

describe('WebGL Support Check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect WebGL support in browser', () => {
    const isWebGLSupported = checkWebGLSupport()
    expect(isWebGLSupported).toBeDefined()
    expect(typeof isWebGLSupported).toBe('boolean')
  })
  
  it('should provide fallback for non-WebGL environments', () => {
    // Mock WebGL不対応環境
    const mockCanvas = { 
      getContext: vi.fn(() => null) 
    } as unknown as HTMLCanvasElement
    
    const result = checkWebGLSupport(mockCanvas)
    expect(result).toBe(false)
  })

  it('should detect WebGL context creation success', () => {
    // Mock WebGL対応環境
    const mockContext = {}
    const mockCanvas = { 
      getContext: vi.fn(() => mockContext) 
    } as unknown as HTMLCanvasElement
    
    const result = checkWebGLSupport(mockCanvas)
    expect(result).toBe(true)
  })

  it('should handle experimental-webgl fallback', () => {
    // Mock webgl失敗、experimental-webgl成功
    const mockContext = {}
    const mockCanvas = { 
      getContext: vi.fn()
        .mockReturnValueOnce(null) // 'webgl'で失敗
        .mockReturnValueOnce(mockContext) // 'experimental-webgl'で成功
    } as unknown as HTMLCanvasElement
    
    const result = checkWebGLSupport(mockCanvas)
    expect(result).toBe(true)
    expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl')
    expect(mockCanvas.getContext).toHaveBeenCalledWith('experimental-webgl')
  })

  it('should return false when both webgl and experimental-webgl fail', () => {
    // Mock 両方失敗
    const mockCanvas = { 
      getContext: vi.fn(() => null) 
    } as unknown as HTMLCanvasElement
    
    const result = checkWebGLSupport(mockCanvas)
    expect(result).toBe(false)
    expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl')
    expect(mockCanvas.getContext).toHaveBeenCalledWith('experimental-webgl')
  })
})