import { VRM } from '@pixiv/three-vrm'
import type { Emotion } from '@asd-aituber/types'
import { LipSync } from './lip-sync'

/**
 * VRMアニメーションコントローラー
 * まばたき、呼吸、表情制御を管理
 */
export class VRMAnimationController {
  private vrm: VRM
  private clock: number = 0
  private isBlinking: boolean = false
  private nextBlinkTime: number = 0
  private currentEmotion: Emotion = 'neutral'
  private lipSync: LipSync
  private isSpeaking: boolean = false
  
  // アニメーション設定
  private readonly blinkInterval = { min: 1000, max: 5000 } // ms
  private readonly blinkDuration = 150 // ms
  private readonly breathingSpeed = 0.002
  private readonly breathingIntensity = 0.02
  
  // 待機アニメーション設定
  private readonly idleSwaySpeed = 0.0008
  private readonly idleSwayIntensity = 0.008
  private readonly armSwaySpeed = 0.0012
  private readonly armSwayIntensity = 0.015
  private readonly legShiftSpeed = 0.0006
  private readonly legShiftIntensity = 0.008

  constructor(vrm: VRM) {
    this.vrm = vrm
    this.scheduleNextBlink()
    this.setInitialPose()
    
    // リップシンクを初期化
    this.lipSync = new LipSync()
  }

  /**
   * アニメーションフレーム更新
   * @param deltaTime - フレーム間の時間（秒）
   */
  update(deltaTime: number): void {
    this.clock += deltaTime * 1000 // Convert to ms
    
    this.updateBlinking()
    this.updateBreathing()
    this.updateEmotion()
    this.updateIdleAnimation()
  }

  /**
   * まばたきアニメーション
   */
  private updateBlinking(): void {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) return

    // 次のまばたき時間に到達したかチェック
    if (!this.isBlinking && this.clock >= this.nextBlinkTime) {
      this.startBlink()
    }

    // まばたき中の処理
    if (this.isBlinking) {
      const blinkProgress = (this.clock - (this.nextBlinkTime)) / this.blinkDuration
      
      if (blinkProgress >= 1) {
        // まばたき終了
        this.isBlinking = false
        expressionManager.setValue('blink', 0)
        this.scheduleNextBlink()
      } else {
        // まばたきアニメーション（sin波で滑らかに）
        const blinkValue = Math.sin(blinkProgress * Math.PI)
        expressionManager.setValue('blink', blinkValue)
      }
    }
  }

  /**
   * まばたき開始
   */
  private startBlink(): void {
    this.isBlinking = true
  }

  /**
   * 次のまばたきをスケジュール
   */
  private scheduleNextBlink(): void {
    const interval = this.blinkInterval.min + 
      Math.random() * (this.blinkInterval.max - this.blinkInterval.min)
    this.nextBlinkTime = this.clock + interval
  }

  /**
   * 呼吸アニメーション
   */
  private updateBreathing(): void {
    if (!this.vrm.humanoid) return

    try {
      const chest = this.vrm.humanoid.getNormalizedBoneNode('chest')
      if (!chest) return

      // Sin波による呼吸アニメーション
      const breathingCycle = Math.sin(this.clock * this.breathingSpeed) * this.breathingIntensity
      
      // 胸の拡張・収縮
      chest.scale.setScalar(1 + breathingCycle)
    } catch (error) {
      // Breathing animation failed, skip silently
    }
  }

  /**
   * 感情表現の更新
   */
  private updateEmotion(): void {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) return

    // 現在の感情に基づいて表情を設定
    this.applyEmotionExpression(this.currentEmotion)
  }

  /**
   * 待機アニメーション（全身の自然な動き）
   */
  private updateIdleAnimation(): void {
    if (!this.vrm.humanoid) return

    try {
      // 腰の微細な揺れ（全体のベース）
      const hips = this.vrm.humanoid.getNormalizedBoneNode('hips')
      if (hips) {
        const swayX = Math.sin(this.clock * this.idleSwaySpeed) * this.idleSwayIntensity
        const swayZ = Math.cos(this.clock * this.idleSwaySpeed * 0.7) * this.idleSwayIntensity * 0.5
        hips.rotation.z = swayX
        hips.rotation.x = swayZ
      }

      // 脊椎の動き
      const spine = this.vrm.humanoid.getNormalizedBoneNode('spine')
      if (spine) {
        const spineMovement = Math.sin(this.clock * this.idleSwaySpeed * 1.2) * this.idleSwayIntensity * 0.3
        spine.rotation.z = spineMovement
      }

      // 首の微細な動き
      const neck = this.vrm.humanoid.getNormalizedBoneNode('neck')
      if (neck) {
        const neckSway = Math.sin(this.clock * this.idleSwaySpeed * 1.5) * this.idleSwayIntensity * 0.4
        neck.rotation.y = neckSway
      }

      // 左腕の待機アニメーション
      this.updateArmIdle('leftUpperArm', 'leftLowerArm', 1.0)
      this.updateArmIdle('rightUpperArm', 'rightLowerArm', -1.0)

      // 足の重心移動
      this.updateLegIdle('leftUpperLeg', 'rightUpperLeg')

    } catch (error) {
      // Bone animation failed, skip silently
    }
  }

  /**
   * 腕の待機アニメーション
   * @param upperArmName - 上腕のボーン名
   * @param lowerArmName - 前腕のボーン名
   * @param side - 左右の方向 (1.0 = 左, -1.0 = 右)
   */
  private updateArmIdle(upperArmName: string, lowerArmName: string, side: number): void {
    if (!this.vrm.humanoid) return

    try {
      const upperArm = this.vrm.humanoid.getNormalizedBoneNode(upperArmName as any)
      const lowerArm = this.vrm.humanoid.getNormalizedBoneNode(lowerArmName as any)

      if (upperArm) {
        // 基本の下げた腕の位置を維持しつつ微細な動き
        const baseRotationZ = Math.PI * 0.2 * side  // 初期ポーズと同じ下げた位置
        const baseRotationX = Math.PI * 0.1         // 初期ポーズと同じ前傾
        const baseRotationY = Math.PI * 0.05 * side // 初期ポーズと同じ内側向き
        
        const armSway = Math.sin(this.clock * this.armSwaySpeed + side) * this.armSwayIntensity
        const armLift = Math.cos(this.clock * this.armSwaySpeed * 0.8) * this.armSwayIntensity * 0.3
        
        upperArm.rotation.z = baseRotationZ + armSway * side * 0.5
        upperArm.rotation.x = baseRotationX + armLift
        upperArm.rotation.y = baseRotationY
      }

      if (lowerArm) {
        // 基本の曲げた前腕の位置を維持しつつ微細な動き
        const baseRotationY = Math.PI * 0.1 * side   // 初期ポーズと同じ曲げた位置
        const baseRotationZ = Math.PI * 0.05 * side  // 初期ポーズと同じ内側向き
        const forearmBend = Math.sin(this.clock * this.armSwaySpeed * 1.3) * this.armSwayIntensity * 0.2
        
        lowerArm.rotation.y = baseRotationY + forearmBend * side * 0.5
        lowerArm.rotation.z = baseRotationZ
      }
    } catch (error) {
      // Arm animation failed, skip silently
    }
  }

  /**
   * 足の待機アニメーション（重心移動）
   * @param leftLegName - 左足のボーン名
   * @param rightLegName - 右足のボーン名
   */
  private updateLegIdle(leftLegName: string, rightLegName: string): void {
    if (!this.vrm.humanoid) return

    try {
      const leftLeg = this.vrm.humanoid.getNormalizedBoneNode(leftLegName as any)
      const rightLeg = this.vrm.humanoid.getNormalizedBoneNode(rightLegName as any)

      // 重心移動（左右の足に交互に体重をかける）
      const weightShift = Math.sin(this.clock * this.legShiftSpeed) * this.legShiftIntensity

      if (leftLeg) {
        leftLeg.rotation.z = weightShift * 0.5
      }

      if (rightLeg) {
        rightLeg.rotation.z = -weightShift * 0.5
      }
    } catch (error) {
      // Leg animation failed, skip silently
    }
  }

  /**
   * 感情を設定
   * @param emotion - 設定する感情
   */
  setEmotion(emotion: Emotion): void {
    this.currentEmotion = emotion
  }

  /**
   * 感情に応じた表情を適用
   * @param emotion - 適用する感情
   */
  private applyEmotionExpression(emotion: Emotion): void {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) return

    // 全ての表情をリセット（口パク用の母音は除く）
    const expressions = ['happy', 'sad', 'angry', 'surprised', 'relaxed', 'neutral']
    expressions.forEach(expr => {
      try {
        if (expressionManager.getExpressionTrackName(expr)) {
          expressionManager.setValue(expr, 0)
        }
      } catch (error) {
        // Expression not available, skip silently
      }
    })

    // 感情に対応する表情を設定
    switch (emotion) {
      case 'joy':
        this.setExpressionSafely('happy', 0.8)
        break
      case 'sadness':
        this.setExpressionSafely('sad', 0.7)
        break
      case 'anger':
        this.setExpressionSafely('angry', 0.6)
        break
      case 'surprise':
        this.setExpressionSafely('surprised', 0.8)
        break
      case 'fear':
        this.setExpressionSafely('sad', 0.4)
        this.setExpressionSafely('surprised', 0.3)
        break
      case 'disgust':
        this.setExpressionSafely('angry', 0.3)
        break
      case 'neutral':
      default:
        this.setExpressionSafely('neutral', 0.1)
        break
    }
  }

  /**
   * 安全に表情を設定（存在チェック付き）
   * @param expressionName - 表情名
   * @param value - 設定値（0-1）
   */
  private setExpressionSafely(expressionName: string, value: number): void {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) return

    try {
      if (expressionManager.getExpressionTrackName(expressionName)) {
        expressionManager.setValue(expressionName, value)
      }
    } catch (error) {
      console.warn(`Failed to set expression ${expressionName}:`, error)
    }
  }

  /**
   * 話しているモーション
   * @param intensity - 話す強度（0-1）
   */
  setSpeaking(intensity: number): void {
    this.isSpeaking = intensity > 0
    
    if (!this.isSpeaking) {
      // 話していない時は口を閉じる
      this.setMouthShape('silence', 0)
    }

    // 話している時の全身ジェスチャー
    this.updateSpeakingGestures(intensity)
  }

  /**
   * テキストを話す（リップシンク付き）
   * @param text - 話すテキスト
   * @param onComplete - 完了時のコールバック
   */
  speakText(text: string, onComplete?: () => void): void {
    this.isSpeaking = true
    
    this.lipSync.playText(
      text,
      (phoneme: string, intensity: number) => {
        this.setMouthShape(phoneme, intensity)
      },
      () => {
        this.isSpeaking = false
        this.setMouthShape('silence', 0)
        if (onComplete) {
          onComplete()
        }
      },
      {
        speed: 6,        // 少し遅めに話す
        intensity: 0.8,  // はっきりとした口の動き
        pauseDuration: 400 // 長めの休止
      }
    )
  }

  /**
   * 口の形を設定
   * @param phoneme - 音韻（a, i, u, e, o, silence）
   * @param intensity - 強度（0-1）
   */
  private setMouthShape(phoneme: string, intensity: number): void {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) return

    // 全ての母音をリセット
    const vowels = ['a', 'i', 'u', 'e', 'o']
    vowels.forEach(vowel => {
      try {
        if (expressionManager.getExpressionTrackName(vowel)) {
          expressionManager.setValue(vowel, 0)
        }
      } catch (error) {
        // Expression not available, skip silently
      }
    })

    // 指定された音韻を設定
    if (phoneme !== 'silence' && vowels.includes(phoneme)) {
      try {
        if (expressionManager.getExpressionTrackName(phoneme)) {
          expressionManager.setValue(phoneme, intensity)
        }
      } catch (error) {
        // Expression not available, skip silently
      }
    }
  }

  /**
   * リップシンクを停止
   */
  stopSpeaking(): void {
    this.lipSync.stop()
    this.isSpeaking = false
    this.setMouthShape('silence', 0)
  }

  /**
   * 話している時のジェスチャー
   * @param intensity - 話す強度（0-1）
   */
  private updateSpeakingGestures(intensity: number): void {
    if (!this.vrm.humanoid) return

    try {
      // 頭の動き（より自然に）
      const head = this.vrm.humanoid.getNormalizedBoneNode('head')
      if (head) {
        const headMovementY = Math.sin(this.clock * 0.008) * intensity * 0.08
        const headMovementX = Math.cos(this.clock * 0.012) * intensity * 0.04
        const headMovementZ = Math.sin(this.clock * 0.015) * intensity * 0.03
        
        head.rotation.y += headMovementY
        head.rotation.x += headMovementX
        head.rotation.z += headMovementZ
      }

      // 手の微細なジェスチャー
      this.updateHandGestures(intensity)

      // 体の微細な動き
      const spine = this.vrm.humanoid.getNormalizedBoneNode('spine')
      if (spine) {
        const spineMovement = Math.sin(this.clock * 0.01) * intensity * 0.02
        spine.rotation.y += spineMovement
      }

      // 肩の動き
      this.updateShoulderMovement(intensity)

    } catch (error) {
      // Speaking gestures failed, skip silently
    }
  }

  /**
   * 手のジェスチャー
   * @param intensity - 話す強度（0-1）
   */
  private updateHandGestures(intensity: number): void {
    if (!this.vrm.humanoid) return

    try {
      // 左右の手で違う動きをする
      const leftUpperArm = this.vrm.humanoid.getNormalizedBoneNode('leftUpperArm')
      const rightUpperArm = this.vrm.humanoid.getNormalizedBoneNode('rightUpperArm')
      const leftLowerArm = this.vrm.humanoid.getNormalizedBoneNode('leftLowerArm')
      const rightLowerArm = this.vrm.humanoid.getNormalizedBoneNode('rightLowerArm')

      if (leftUpperArm) {
        const leftGesture = Math.sin(this.clock * 0.009) * intensity * 0.1
        leftUpperArm.rotation.z += leftGesture
        leftUpperArm.rotation.x += leftGesture * 0.5
      }

      if (rightUpperArm) {
        const rightGesture = Math.cos(this.clock * 0.011) * intensity * 0.08
        rightUpperArm.rotation.z -= rightGesture
        rightUpperArm.rotation.x += rightGesture * 0.6
      }

      if (leftLowerArm) {
        const leftForearm = Math.sin(this.clock * 0.013) * intensity * 0.05
        leftLowerArm.rotation.y += leftForearm
      }

      if (rightLowerArm) {
        const rightForearm = Math.cos(this.clock * 0.017) * intensity * 0.06
        rightLowerArm.rotation.y -= rightForearm
      }
    } catch (error) {
      // Hand gestures failed, skip silently
    }
  }

  /**
   * 肩の動き
   * @param intensity - 話す強度（0-1）
   */
  private updateShoulderMovement(intensity: number): void {
    if (!this.vrm.humanoid) return

    try {
      const leftShoulder = this.vrm.humanoid.getNormalizedBoneNode('leftShoulder')
      const rightShoulder = this.vrm.humanoid.getNormalizedBoneNode('rightShoulder')

      if (leftShoulder) {
        const leftShoulderMove = Math.sin(this.clock * 0.007) * intensity * 0.03
        leftShoulder.rotation.z += leftShoulderMove
      }

      if (rightShoulder) {
        const rightShoulderMove = Math.cos(this.clock * 0.009) * intensity * 0.025
        rightShoulder.rotation.z -= rightShoulderMove
      }
    } catch (error) {
      // Shoulder movement failed, skip silently
    }
  }

  /**
   * アニメーションをリセット
   */
  reset(): void {
    this.clock = 0
    this.isBlinking = false
    this.scheduleNextBlink()
    this.setEmotion('neutral')
    this.setSpeaking(0)
    this.resetBonePoses()
  }

  /**
   * 全ボーンの姿勢をリセット
   */
  private resetBonePoses(): void {
    if (!this.vrm.humanoid) return

    const boneNames = [
      'hips', 'spine', 'chest', 'neck', 'head',
      'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
      'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
      'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
      'rightUpperLeg', 'rightLowerLeg', 'rightFoot'
    ]

    boneNames.forEach(boneName => {
      try {
        const bone = this.vrm.humanoid?.getNormalizedBoneNode(boneName as any)
        if (bone) {
          bone.rotation.set(0, 0, 0)
          if (boneName !== 'hips') { // Keep hips position
            bone.position.set(0, 0, 0)
          }
        }
      } catch (error) {
        // Bone not available, skip silently
      }
    })
    
    // リセット後、初期ポーズを再設定
    this.setInitialPose()
  }

  /**
   * 初期ポーズを設定（T字ポーズを自然な姿勢に変更）
   */
  private setInitialPose(): void {
    if (!this.vrm.humanoid) {
      console.warn('No humanoid found for initial pose')
      return
    }

    console.log('Setting initial pose...')
    try {
      // 腕を下ろす
      const leftUpperArm = this.vrm.humanoid.getNormalizedBoneNode('leftUpperArm')
      const rightUpperArm = this.vrm.humanoid.getNormalizedBoneNode('rightUpperArm')
      
      console.log('Found bones:', { leftUpperArm: !!leftUpperArm, rightUpperArm: !!rightUpperArm })
      
      if (leftUpperArm) {
        leftUpperArm.rotation.z = Math.PI * 0.2   // 左腕をしっかり下げる
        leftUpperArm.rotation.x = Math.PI * 0.1   // 前に倒す
        leftUpperArm.rotation.y = Math.PI * 0.05  // 少し内側に
      }
      
      if (rightUpperArm) {
        rightUpperArm.rotation.z = -Math.PI * 0.2  // 右腕をしっかり下げる
        rightUpperArm.rotation.x = Math.PI * 0.1   // 前に倒す
        rightUpperArm.rotation.y = -Math.PI * 0.05 // 少し内側に
      }

      // 前腕を少し曲げる
      const leftLowerArm = this.vrm.humanoid.getNormalizedBoneNode('leftLowerArm')
      const rightLowerArm = this.vrm.humanoid.getNormalizedBoneNode('rightLowerArm')
      
      if (leftLowerArm) {
        leftLowerArm.rotation.y = Math.PI * 0.1   // 左前腕を曲げる
        leftLowerArm.rotation.z = Math.PI * 0.05  // 少し内側に曲げる
      }
      
      if (rightLowerArm) {
        rightLowerArm.rotation.y = -Math.PI * 0.1  // 右前腕を曲げる
        rightLowerArm.rotation.z = -Math.PI * 0.05 // 少し内側に曲げる
      }

      // 肩を少し下げる
      const leftShoulder = this.vrm.humanoid.getNormalizedBoneNode('leftShoulder')
      const rightShoulder = this.vrm.humanoid.getNormalizedBoneNode('rightShoulder')
      
      if (leftShoulder) {
        leftShoulder.rotation.z = Math.PI * 0.1   // 肩を下げる
        leftShoulder.rotation.x = Math.PI * 0.02  // 前に回す
      }
      
      if (rightShoulder) {
        rightShoulder.rotation.z = -Math.PI * 0.1  // 肩を下げる
        rightShoulder.rotation.x = Math.PI * 0.02  // 前に回す
      }

      // 腰を少し前に傾ける
      const hips = this.vrm.humanoid.getNormalizedBoneNode('hips')
      if (hips) {
        hips.rotation.x = Math.PI * 0.02
      }

      // 脊椎を少し真っ直ぐにする
      const spine = this.vrm.humanoid.getNormalizedBoneNode('spine')
      if (spine) {
        spine.rotation.x = -Math.PI * 0.01
      }

      console.log('Initial pose setup completed')
    } catch (error) {
      console.warn('Failed to set initial pose:', error)
    }
  }

  /**
   * 利用可能な表情リストを取得
   */
  getAvailableExpressions(): string[] {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) return []

    const expressions: string[] = []
    const commonExpressions = [
      'neutral', 'happy', 'sad', 'angry', 'surprised', 'relaxed',
      'blink', 'a', 'i', 'u', 'e', 'o'
    ]

    commonExpressions.forEach(expr => {
      try {
        if (expressionManager.getExpressionTrackName && expressionManager.getExpressionTrackName(expr)) {
          expressions.push(expr)
        }
      } catch (error) {
        // Expression not available, skip silently
      }
    })

    return expressions
  }
}