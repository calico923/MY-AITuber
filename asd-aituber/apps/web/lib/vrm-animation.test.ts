import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VRMAnimationController } from './vrm-animation'
import type { VRM } from '@pixiv/three-vrm'

// Mock LipSync
vi.mock('./lip-sync', () => ({
  LipSync: vi.fn().mockImplementation(() => ({
    playText: vi.fn(),
    stop: vi.fn(),
    isActive: vi.fn(() => false)
  }))
}))

// Mock VRM and its dependencies
const mockExpressionManager = {
  setValue: vi.fn(),
  getExpressionTrackName: vi.fn(),
}

const mockHumanoid = {
  getNormalizedBoneNode: vi.fn(),
}

const mockVRM: Partial<VRM> = {
  expressionManager: mockExpressionManager as any,
  humanoid: mockHumanoid as any,
  update: vi.fn(),
  scene: {} as any,
}

// Mock bone nodes
const mockBoneNode = {
  scale: { setScalar: vi.fn() },
  rotation: { 
    x: 0, 
    y: 0, 
    z: 0,
    set: vi.fn()
  },
  position: {
    set: vi.fn()
  }
}

describe('VRMAnimationController', () => {
  let controller: VRMAnimationController

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock responses
    mockExpressionManager.getExpressionTrackName.mockReturnValue('mock-track')
    mockHumanoid.getNormalizedBoneNode.mockReturnValue(mockBoneNode)
    
    controller = new VRMAnimationController(mockVRM as VRM)
  })

  describe('initialization', () => {
    it('should create controller with VRM instance', () => {
      expect(controller).toBeInstanceOf(VRMAnimationController)
    })

    it('should get available expressions', () => {
      const expressions = controller.getAvailableExpressions()
      expect(Array.isArray(expressions)).toBe(true)
      expect(mockExpressionManager.getExpressionTrackName).toHaveBeenCalled()
    })

    it('should set initial pose on creation', () => {
      expect(mockHumanoid.getNormalizedBoneNode).toHaveBeenCalledWith('leftUpperArm')
      expect(mockHumanoid.getNormalizedBoneNode).toHaveBeenCalledWith('rightUpperArm')
      expect(mockHumanoid.getNormalizedBoneNode).toHaveBeenCalledWith('hips')
    })
  })

  describe('emotion setting', () => {
    it('should set emotion to joy', () => {
      controller.setEmotion('joy')
      controller.update(1/60) // Simulate one frame
      
      expect(mockExpressionManager.setValue).toHaveBeenCalledWith('happy', 0.8)
    })

    it('should set emotion to sadness', () => {
      controller.setEmotion('sadness')
      controller.update(1/60)
      
      expect(mockExpressionManager.setValue).toHaveBeenCalledWith('sad', 0.7)
    })

    it('should set emotion to anger', () => {
      controller.setEmotion('anger')
      controller.update(1/60)
      
      expect(mockExpressionManager.setValue).toHaveBeenCalledWith('angry', 0.6)
    })

    it('should handle neutral emotion', () => {
      controller.setEmotion('neutral')
      controller.update(1/60)
      
      expect(mockExpressionManager.setValue).toHaveBeenCalledWith('neutral', 0.1)
    })
  })

  describe('speaking animation', () => {
    it('should set isSpeaking flag with high intensity', () => {
      controller.setSpeaking(1.0)
      
      // setSpeaking now only sets the isSpeaking flag and gestures
      // Mouth shapes are handled by lip sync system
      expect(controller['isSpeaking']).toBe(true)
    })

    it('should set isSpeaking flag with low intensity', () => {
      controller.setSpeaking(0.5)
      
      expect(controller['isSpeaking']).toBe(true)
    })

    it('should stop speaking animation', () => {
      controller.setSpeaking(0)
      
      expect(controller['isSpeaking']).toBe(false)
      // Should reset mouth to silence
      expect(mockExpressionManager.setValue).toHaveBeenCalledWith('aa', 0)
      // Note: Only 'aa' expression is used in new AudioLipSync system
    })
  })

  describe('animation updates', () => {
    it('should update without errors', () => {
      expect(() => {
        controller.update(1/60)
      }).not.toThrow()
    })

    it('should handle breathing animation', () => {
      controller.update(1/60)
      
      expect(mockHumanoid.getNormalizedBoneNode).toHaveBeenCalledWith('chest')
      expect(mockBoneNode.scale.setScalar).toHaveBeenCalled()
    })

    it('should handle multiple updates', () => {
      for (let i = 0; i < 10; i++) {
        controller.update(1/60)
      }
      
      expect(mockBoneNode.scale.setScalar).toHaveBeenCalledTimes(10)
    })
  })

  describe('error handling', () => {
    it('should handle missing expression manager', () => {
      const vrmWithoutExpressions = { ...mockVRM, expressionManager: null }
      const controllerWithoutExpressions = new VRMAnimationController(vrmWithoutExpressions as VRM)
      
      expect(() => {
        controllerWithoutExpressions.setEmotion('joy')
        controllerWithoutExpressions.update(1/60)
      }).not.toThrow()
    })

    it('should handle missing humanoid', () => {
      const vrmWithoutHumanoid = { ...mockVRM, humanoid: null }
      const controllerWithoutHumanoid = new VRMAnimationController(vrmWithoutHumanoid as VRM)
      
      expect(() => {
        controllerWithoutHumanoid.update(1/60)
      }).not.toThrow()
    })

    it('should handle expression setting errors gracefully', () => {
      mockExpressionManager.setValue.mockImplementation(() => {
        throw new Error('Expression not found')
      })
      
      expect(() => {
        controller.setEmotion('joy')
        controller.update(1/60)
      }).not.toThrow()
    })

    it('should handle missing bone nodes', () => {
      mockHumanoid.getNormalizedBoneNode.mockReturnValue(null)
      
      expect(() => {
        controller.update(1/60)
      }).not.toThrow()
    })
  })

  describe('reset functionality', () => {
    it('should reset animation state', () => {
      controller.setEmotion('joy')
      controller.setSpeaking(1.0)
      
      controller.reset()
      
      // After reset, should set neutral emotion and stop speaking
      controller.update(1/60)
      expect(mockExpressionManager.setValue).toHaveBeenCalledWith('neutral', 0.1)
      expect(mockExpressionManager.setValue).toHaveBeenCalledWith('aa', 0)
    })
  })

  describe('lip sync functionality', () => {
    it('should start lip sync when speaking text', () => {
      controller.speakText('こんにちは')
      
      // Check that isSpeaking flag is set
      expect(controller['isSpeaking']).toBe(true)
    })

    it('should stop lip sync when stopSpeaking is called', () => {
      controller.stopSpeaking()
      
      expect(controller['isSpeaking']).toBe(false)
      // Should reset mouth to silence
      expect(mockExpressionManager.setValue).toHaveBeenCalledWith('aa', 0)
      // Note: Only 'aa' expression is used in new AudioLipSync system
    })

    it('should handle mouth shape setting', () => {
      // Directly test the setMouthShape method via speaking
      controller.speakText('あ')
      
      expect(controller['isSpeaking']).toBe(true)
    })

    it('should reset mouth when stopping speech', () => {
      controller.speakText('あ')
      controller.stopSpeaking()
      
      expect(controller['isSpeaking']).toBe(false)
      // All vowels should be reset
      expect(mockExpressionManager.setValue).toHaveBeenCalledWith('aa', 0)
      // Note: Only 'aa' expression is used in new AudioLipSync system
    })
  })

  describe('available expressions', () => {
    it('should return empty array when no expression manager', () => {
      const vrmWithoutExpressions = { ...mockVRM, expressionManager: null }
      const controllerWithoutExpressions = new VRMAnimationController(vrmWithoutExpressions as VRM)
      
      const expressions = controllerWithoutExpressions.getAvailableExpressions()
      expect(expressions).toEqual([])
    })

    it('should filter available expressions', () => {
      mockExpressionManager.getExpressionTrackName.mockImplementation((name: string) => {
        return ['happy', 'sad', 'blink'].includes(name) ? `track_${name}` : null
      })
      
      const expressions = controller.getAvailableExpressions()
      expect(expressions).toContain('happy')
      expect(expressions).toContain('sad')
      expect(expressions).toContain('blink')
      expect(expressions).not.toContain('nonexistent')
    })
  })
})