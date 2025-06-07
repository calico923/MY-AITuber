import { describe, it, expect } from 'vitest'
import type {
  Emotion,
  ASDNTMode,
  ChatMessage,
  VRMAnimation,
  EmotionState,
  SystemState,
} from './index'

describe('Type Definitions', () => {
  describe('Emotion type', () => {
    it('should accept valid emotion values', () => {
      const validEmotions: Emotion[] = ['joy', 'anger', 'sadness', 'surprise', 'fear', 'disgust', 'neutral']
      expect(validEmotions).toHaveLength(7)
    })
  })

  describe('ASDNTMode type', () => {
    it('should accept valid mode values', () => {
      const modes: ASDNTMode[] = ['ASD', 'NT']
      expect(modes).toHaveLength(2)
    })
  })

  describe('ChatMessage interface', () => {
    it('should create valid chat message', () => {
      const message: ChatMessage = {
        id: '123',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
        emotion: 'neutral',
      }
      expect(message.id).toBe('123')
      expect(message.role).toBe('user')
      expect(message.content).toBe('Hello')
      expect(message.emotion).toBe('neutral')
    })

    it('should accept assistant role', () => {
      const message: ChatMessage = {
        id: '456',
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date(),
        emotion: 'joy',
        internalEmotion: 'neutral',
      }
      expect(message.role).toBe('assistant')
      expect(message.internalEmotion).toBe('neutral')
    })
  })

  describe('VRMAnimation interface', () => {
    it('should create valid animation', () => {
      const animation: VRMAnimation = {
        name: 'wave',
        emotion: 'joy',
        duration: 2000,
        loop: false,
      }
      expect(animation.name).toBe('wave')
      expect(animation.emotion).toBe('joy')
      expect(animation.duration).toBe(2000)
      expect(animation.loop).toBe(false)
    })
  })

  describe('EmotionState interface', () => {
    it('should create valid emotion state', () => {
      const state: EmotionState = {
        current: 'neutral',
        intensity: 0.5,
        internal: 'joy',
        expressed: 'neutral',
      }
      expect(state.current).toBe('neutral')
      expect(state.intensity).toBe(0.5)
      expect(state.internal).toBe('joy')
      expect(state.expressed).toBe('neutral')
    })
  })

  describe('SystemState interface', () => {
    it('should create valid system state', () => {
      const state: SystemState = {
        mode: 'ASD',
        emotion: {
          current: 'neutral',
          intensity: 0,
          internal: 'neutral',
          expressed: 'neutral',
        },
        isConnected: true,
        isLoading: false,
      }
      expect(state.mode).toBe('ASD')
      expect(state.isConnected).toBe(true)
      expect(state.isLoading).toBe(false)
    })
  })
})