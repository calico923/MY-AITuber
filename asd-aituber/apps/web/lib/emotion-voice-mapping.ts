/**
 * Emotion to Voice Parameter Mapping
 * 感情に応じた音声パラメータマッピングシステム
 */

import type { Emotion } from '@asd-aituber/types'
import type { VoicevoxSynthesisOptions } from './voicevox-client'

export interface EmotionVoiceMapping {
  speed: number      // 話速 (0.5 - 2.0)
  pitch: number      // 音の高さ (-0.15 - 0.15)
  intonation: number // イントネーション (0.0 - 2.0)
}

/**
 * ASD/NTモードと感情に応じた音声パラメータマッピング
 */
export class EmotionVoiceMapper {
  
  /**
   * ASDモード用の感情音声マッピング
   * 控えめで一貫性のある感情表現
   */
  private static readonly ASD_EMOTION_MAPPING: Record<Emotion, EmotionVoiceMapping> = {
    // 基本感情
    neutral: {
      speed: 1.0,
      pitch: 0.0,
      intonation: 1.0
    },
    
    // ポジティブな感情 - 控えめな表現
    joy: {
      speed: 1.05,      // わずかに早く
      pitch: 0.02,      // わずかに高く
      intonation: 1.1   // 少し豊かに
    },
    
    // ネガティブな感情 - 直接的だが控えめ
    sadness: {
      speed: 0.95,      // わずかに遅く
      pitch: -0.02,     // わずかに低く
      intonation: 0.9   // 平坦に
    },
    
    anger: {
      speed: 1.0,       // 速度は維持
      pitch: 0.01,      // わずかに上げる
      intonation: 1.05  // 少し強調
    },
    
    fear: {
      speed: 0.9,       // 遅く
      pitch: 0.03,      // 高く
      intonation: 0.8   // 控えめに
    },
    
    surprise: {
      speed: 1.15,      // 早く
      pitch: 0.05,      // 高く
      intonation: 1.3   // 驚きを表現
    },
    
    disgust: {
      speed: 0.95,
      pitch: -0.01,
      intonation: 0.85
    }
  }

  /**
   * NTモード用の感情音声マッピング
   * 豊かで表現力のある感情表現
   */
  private static readonly NT_EMOTION_MAPPING: Record<Emotion, EmotionVoiceMapping> = {
    // 基本感情
    neutral: {
      speed: 1.0,
      pitch: 0.0,
      intonation: 1.0
    },
    
    // ポジティブな感情 - 豊かな表現
    joy: {
      speed: 1.2,       // 明るく早く
      pitch: 0.08,      // 明るく高く
      intonation: 1.4   // 豊かな表現
    },
    
    // ネガティブな感情 - 感情的な表現
    sadness: {
      speed: 0.8,       // ゆっくりと
      pitch: -0.08,     // 低く沈んだ声
      intonation: 0.6   // 平坦で悲しげ
    },
    
    anger: {
      speed: 1.1,       // やや早く
      pitch: 0.02,      // 少し高く
      intonation: 1.5   // 強い抑揚
    },
    
    fear: {
      speed: 0.85,      // 震え声風に遅く
      pitch: 0.08,      // 高い声
      intonation: 0.7   // 不安定な抑揚
    },
    
    surprise: {
      speed: 1.4,       // 驚いて早く
      pitch: 0.12,      // 高い声
      intonation: 1.8   // 大きな抑揚
    },
    
    disgust: {
      speed: 0.9,
      pitch: -0.03,
      intonation: 0.8
    }
  }

  /**
   * 感情とモードに基づいて音声パラメータを取得
   */
  static getVoiceParameters(
    emotion: Emotion = 'neutral',
    mode: 'asd' | 'nt' = 'nt'
  ): EmotionVoiceMapping {
    const mapping = mode === 'asd' 
      ? this.ASD_EMOTION_MAPPING 
      : this.NT_EMOTION_MAPPING
    
    return mapping[emotion] || mapping.neutral
  }

  /**
   * VOICEVOX用の音声オプションを生成
   */
  static createVoicevoxOptions(
    text: string,
    emotion: Emotion = 'neutral',
    mode: 'asd' | 'nt' = 'nt',
    speaker: string | number = '46',
    baseOptions?: Partial<VoicevoxSynthesisOptions>
  ): Omit<VoicevoxSynthesisOptions, 'serverUrl'> {
    const emotionParams = this.getVoiceParameters(emotion, mode)
    
    return {
      text,
      speaker,
      speed: baseOptions?.speed ?? emotionParams.speed,
      pitch: baseOptions?.pitch ?? emotionParams.pitch,
      intonation: baseOptions?.intonation ?? emotionParams.intonation,
      ...baseOptions
    }
  }

  /**
   * 感情の強度に基づいてパラメータを調整
   */
  static adjustForIntensity(
    baseParams: EmotionVoiceMapping,
    intensity: number = 1.0 // 0.0 - 2.0
  ): EmotionVoiceMapping {
    const clampedIntensity = Math.max(0.0, Math.min(2.0, intensity))
    
    return {
      speed: this.interpolateValue(1.0, baseParams.speed, clampedIntensity),
      pitch: this.interpolateValue(0.0, baseParams.pitch, clampedIntensity),
      intonation: this.interpolateValue(1.0, baseParams.intonation, clampedIntensity)
    }
  }

  /**
   * 値を線形補間
   */
  private static interpolateValue(
    neutralValue: number,
    targetValue: number,
    intensity: number
  ): number {
    return neutralValue + (targetValue - neutralValue) * intensity
  }

  /**
   * パラメータの安全範囲チェック
   */
  static validateParameters(params: EmotionVoiceMapping): EmotionVoiceMapping {
    return {
      speed: Math.max(0.5, Math.min(2.0, params.speed)),
      pitch: Math.max(-0.15, Math.min(0.15, params.pitch)),
      intonation: Math.max(0.0, Math.min(2.0, params.intonation))
    }
  }

  /**
   * デバッグ用：感情マッピングの可視化
   */
  static getEmotionMappingTable(mode: 'asd' | 'nt' = 'nt'): string {
    const mapping = mode === 'asd' 
      ? this.ASD_EMOTION_MAPPING 
      : this.NT_EMOTION_MAPPING
    
    let table = `=== ${mode.toUpperCase()} Mode Emotion Mapping ===\n`
    table += 'Emotion         | Speed | Pitch | Intonation\n'
    table += '---------------|-------|-------|------------\n'
    
    Object.entries(mapping).forEach(([emotion, params]) => {
      const emotionPadded = emotion.padEnd(14)
      const speed = params.speed.toFixed(2).padStart(5)
      const pitch = params.pitch.toFixed(2).padStart(5)
      const intonation = params.intonation.toFixed(2).padStart(10)
      
      table += `${emotionPadded} | ${speed} | ${pitch} | ${intonation}\n`
    })
    
    return table
  }
}

/**
 * 便利関数：感情に基づいた音声パラメータ取得
 */
export function getEmotionVoiceParams(
  emotion: Emotion,
  mode: 'asd' | 'nt' = 'nt'
): EmotionVoiceMapping {
  return EmotionVoiceMapper.getVoiceParameters(emotion, mode)
}

/**
 * 便利関数：VOICEVOX用オプション生成
 */
export function createEmotionalVoiceOptions(
  text: string,
  emotion: Emotion,
  mode: 'asd' | 'nt' = 'nt',
  speaker: string | number = '46'
): Omit<VoicevoxSynthesisOptions, 'serverUrl'> {
  return EmotionVoiceMapper.createVoicevoxOptions(text, emotion, mode, speaker)
}