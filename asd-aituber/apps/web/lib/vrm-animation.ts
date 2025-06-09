import { VRM } from '@pixiv/three-vrm'
import type { Emotion } from '@asd-aituber/types'
import { LipSync, type LipSyncFrame } from './lip-sync'

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
  private lastAppliedEmotion: Emotion | null = null
  private lipSync: LipSync
  private isSpeaking: boolean = false
  private animationId: number | null = null
  
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
    this.updateLipSync() // リップシンクの更新を追加
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
   * 感情表現の更新（感情が変更された時のみ）
   */
  private updateEmotion(): void {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) return

    // 感情が変更された場合のみ処理
    if (this.currentEmotion !== this.lastAppliedEmotion) {
      console.log(`[VRMAnimationController] Emotion changed: ${this.lastAppliedEmotion} → ${this.currentEmotion}`)
      this.applyEmotionExpression(this.currentEmotion)
      this.lastAppliedEmotion = this.currentEmotion
    }
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
    if (this.currentEmotion !== emotion) {
      console.log(`[VRMAnimationController] setEmotion called: ${this.currentEmotion} → ${emotion}`)
      this.currentEmotion = emotion
    }
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
        // ログを削減: デバッグ時のみ表示
        // console.log(`[VRMAnimationController] Setting expression: ${expressionName} = ${value.toFixed(2)}`)
        expressionManager.setValue(expressionName, value)
      } else {
        console.warn(`[VRMAnimationController] Expression '${expressionName}' not available`)
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
    console.log('[VRMAnimationController] speakText called - using simple lip sync')
    this.isSpeaking = true
    
    // aituber-kit方式：シンプルなボリューム基盤のリップシンク
    this.startSimpleLipSync(text.length, onComplete)
  }
  
  /**
   * シンプルなリップシンク（aituber-kit方式）
   */
  private startSimpleLipSync(textLength: number, onComplete?: () => void): void {
    // 文字数に基づいて話す時間を計算
    const duration = Math.max(1000, textLength * 100) // 文字あたり100ms、最低1秒
    const startTime = performance.now()
    
    console.log(`[VRMAnimationController] Starting simple lip sync for ${duration}ms`)
    
    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = elapsed / duration
      
      if (progress < 1 && this.isSpeaking) {
        // サイン波でボリュームを変動させて、適当に口を動かしてるだけ
        const volume = (Math.sin(elapsed * 0.01) + 1) * 0.4 + 0.1
        
        // 直接'aa'表情を設定
        const expressionManager = this.vrm.expressionManager
        if (expressionManager) {
          try {
            if (expressionManager.getExpressionTrackName('aa')) {
              expressionManager.setValue('aa', volume)
              console.log(`[VRMAnimationController] Simple lip sync: setting 'aa' to ${volume.toFixed(3)}`)
            } else if (expressionManager.getExpressionTrackName('happy')) {
              expressionManager.setValue('happy', volume * 0.3)
              console.log(`[VRMAnimationController] Simple lip sync: setting 'happy' to ${(volume * 0.3).toFixed(3)}`)
            }
          } catch (error) {
            console.error('[VRMAnimationController] Error in simple lip sync:', error)
          }
        }
        
        requestAnimationFrame(animate)
      } else {
        // リップシンク終了
        console.log('[VRMAnimationController] Simple lip sync completed')
        this.isSpeaking = false
        this.setMouthShape('silence', 0)
        if (onComplete) {
          onComplete()
        }
      }
    }
    
    animate()
  }

  /**
   * 口の形を設定
   * @param phoneme - 音韻（a, i, u, e, o, silence）
   * @param intensity - 強度（0-1）
   */
  private setMouthShape(phoneme: string, intensity: number): void {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) {
      console.warn('[VRMAnimationController] No expression manager available')
      return
    }

    console.log(`[VRMAnimationController] setMouthShape: ${phoneme}, intensity: ${intensity.toFixed(2)}`)

    // 利用可能な表情を確認（初回のみログ出力）
    if (this.vowelExpressionInfo === undefined) {
      this.vowelExpressionInfo = this.checkVowelExpressions()
      console.log('[VRMAnimationController] Mouth expressions:', this.vowelExpressionInfo)
    }
    
    if (this.vowelExpressionInfo.type !== 'none') {
      // 口の表情が利用可能な場合
      this.setMouthExpression(phoneme, intensity)
    } else {
      // 口の表情が利用できない場合は代替処理
      this.setAlternativeMouthShape(phoneme, intensity)
    }
  }
  
  private vowelExpressionInfo?: { type: 'standard' | 'legacy' | 'none', available: string[] }
  private alternativeLogShown?: boolean
  private lastFrameWarningShown?: boolean
  
  /**
   * 口の表情の存在を確認（VRM標準表情優先）
   */
  private checkVowelExpressions(): { type: 'standard' | 'legacy' | 'none', available: string[] } {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) return { type: 'none', available: [] }
    
    // 全ての利用可能な表情を詳細にログ出力
    this.debugAllExpressions()
    
    // VRM標準表情をチェック
    const standardMouthExpressions = ['aa', 'ih', 'ou', 'ee', 'oh']
    const availableStandard = standardMouthExpressions.filter(expr => {
      try {
        const trackName = expressionManager.getExpressionTrackName(expr)
        if (trackName) {
          console.log(`[VRMAnimationController] Found standard expression: ${expr} -> ${trackName}`)
          return true
        }
        return false
      } catch {
        return false
      }
    })
    
    if (availableStandard.length > 0) {
      return { type: 'standard', available: availableStandard }
    }
    
    // 旧形式の母音表情をチェック
    const legacyVowels = ['a', 'i', 'u', 'e', 'o']
    const availableLegacy = legacyVowels.filter(vowel => {
      try {
        const trackName = expressionManager.getExpressionTrackName(vowel)
        if (trackName) {
          console.log(`[VRMAnimationController] Found legacy expression: ${vowel} -> ${trackName}`)
          return true
        }
        return false
      } catch {
        return false
      }
    })
    
    if (availableLegacy.length > 0) {
      return { type: 'legacy', available: availableLegacy }
    }
    
    return { type: 'none', available: [] }
  }
  
  /**
   * デバッグ用：全ての利用可能な表情を出力
   */
  private debugAllExpressions(): void {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) return

    console.log('[VRMAnimationController] === Debugging all expressions ===')
    
    try {
      // expressionMapから全ての表情を取得
      if (expressionManager.expressionMap) {
        const allExpressions = Object.keys(expressionManager.expressionMap)
        console.log('[VRMAnimationController] All expressions in expressionMap:', allExpressions)
        
        // 各表情の詳細情報
        allExpressions.forEach(expr => {
          try {
            const trackName = expressionManager.getExpressionTrackName(expr)
            const currentValue = expressionManager.getValue(expr)
            console.log(`[VRMAnimationController] Expression "${expr}": track="${trackName}", value=${currentValue}`)
          } catch (error) {
            console.log(`[VRMAnimationController] Expression "${expr}": Error accessing - ${error}`)
          }
        })
      } else {
        console.log('[VRMAnimationController] No expressionMap available')
      }
    } catch (error) {
      console.error('[VRMAnimationController] Error debugging expressions:', error)
    }
    
    console.log('[VRMAnimationController] === End expression debug ===')
  }
  
  /**
   * 口の表情を設定（VRM標準またはレガシー形式）
   */
  private setMouthExpression(phoneme: string, intensity: number): void {
    const expressionManager = this.vrm.expressionManager!
    const info = this.vowelExpressionInfo!
    
    if (info.type === 'standard') {
      this.setStandardMouthExpression(phoneme, intensity)
    } else if (info.type === 'legacy') {
      this.setLegacyVowelExpression(phoneme, intensity)
    }
  }
  
  /**
   * VRM標準の口表情を設定（aituber-kit方式）
   */
  private setStandardMouthExpression(phoneme: string, intensity: number): void {
    const expressionManager = this.vrm.expressionManager!
    const available = this.vowelExpressionInfo!.available
    
    // 全ての口表情をリセット
    const allMouthExpressions = ['aa', 'ih', 'ou', 'ee', 'oh']
    allMouthExpressions.forEach(expr => {
      if (available.includes(expr)) {
        try {
          expressionManager.setValue(expr, 0)
        } catch (error) {
          // Skip silently
        }
      }
    })

    // aituber-kit方式：主に'aa'表情を使用
    if (phoneme !== 'silence' && available.includes('aa')) {
      try {
        console.log(`[VRMAnimationController] Setting 'aa' expression to ${intensity}`)
        expressionManager.setValue('aa', intensity)
        
        // 設定後の値を確認
        const currentValue = expressionManager.getValue('aa')
        console.log(`[VRMAnimationController] 'aa' expression value after setting: ${currentValue}`)
        
        if (!this.alternativeLogShown) {
          console.log('[VRMAnimationController] Using VRM standard \'aa\' expression for lip sync')
          this.alternativeLogShown = true
        }
      } catch (error) {
        console.error(`[VRMAnimationController] Error setting 'aa' expression:`, error)
      }
    } else {
      console.log(`[VRMAnimationController] Skipping 'aa' - phoneme: ${phoneme}, available: ${available.join(', ')}`)
    }
  }
  
  /**
   * レガシー母音表情を設定
   */
  private setLegacyVowelExpression(phoneme: string, intensity: number): void {
    const expressionManager = this.vrm.expressionManager!
    const available = this.vowelExpressionInfo!.available
    
    // 全ての母音をリセット
    const vowels = ['a', 'i', 'u', 'e', 'o']
    vowels.forEach(vowel => {
      if (available.includes(vowel)) {
        try {
          expressionManager.setValue(vowel, 0)
        } catch (error) {
          // Skip silently
        }
      }
    })

    // 指定された音韻を設定
    if (phoneme !== 'silence' && vowels.includes(phoneme)) {
      try {
        if (available.includes(phoneme)) {
          expressionManager.setValue(phoneme, intensity)
          if (!this.alternativeLogShown) {
            console.log(`[VRMAnimationController] Using legacy vowel '${phoneme}' expression for lip sync`)
            this.alternativeLogShown = true
          }
        }
      } catch (error) {
        console.error(`[VRMAnimationController] Error setting expression '${phoneme}':`, error)
      }
    }
  }
  
  /**
   * 代替の口の動きを設定（母音表情がない場合）
   */
  private setAlternativeMouthShape(phoneme: string, intensity: number): void {
    const expressionManager = this.vrm.expressionManager!
    
    // neutralまたは他の表情を使って口の動きをシミュレート
    try {
      // 話している時は軽く口を開ける動作をシミュレート
      if (phoneme !== 'silence') {
        // happyやsurprisedなど、口が開く表情があれば使用
        if (expressionManager.getExpressionTrackName('happy')) {
          expressionManager.setValue('happy', intensity * 0.3) // 軽く笑顔で口を開ける
          if (!this.alternativeLogShown) {
            console.log('[VRMAnimationController] Using happy expression for lip sync')
            this.alternativeLogShown = true
          }
        } else if (expressionManager.getExpressionTrackName('surprised')) {
          expressionManager.setValue('surprised', intensity * 0.2) // 軽く驚いた表情
          if (!this.alternativeLogShown) {
            console.log('[VRMAnimationController] Using surprised expression for lip sync')
            this.alternativeLogShown = true
          }
        }
      } else {
        // 口を閉じる
        if (expressionManager.getExpressionTrackName('happy')) {
          expressionManager.setValue('happy', 0)
        }
        if (expressionManager.getExpressionTrackName('surprised')) {
          expressionManager.setValue('surprised', 0)
        }
      }
    } catch (error) {
      console.log('[VRMAnimationController] Alternative mouth shape failed:', error)
    }
  }

  /**
   * リップシンクを停止
   */
  stopSpeaking(): void {
    this.lipSync.stop()
    this.isSpeaking = false
    this.setMouthShape('silence', 0)
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * リップシンクを強制停止（Priority 3: 強制停止機能）
   * すべてのアニメーション関連のタイマーとエラー状態をリセットする
   */
  forceStopSpeaking(): void {
    console.log('[VRMAnimationController] Force stopping all speaking animations')
    
    // 基本の停止処理
    this.isSpeaking = false
    this.lipSync.stop()
    
    // アニメーションフレームのキャンセル
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    
    // 口の形状をリセット
    this.setMouthShape('silence', 0)
    
    // エラー状態のリセット（将来の拡張に備える）
    // アニメーション関連のタイマーもクリア（必要に応じて追加）
    
    console.log('[VRMAnimationController] Force stop completed')
  }

  /**
   * 音声同期リップシンクメソッド（Phase 3新機能）
   * @param audio - HTMLAudioElement（音声ファイル）
   * @param frames - LipSyncFrame配列（音素タイミングデータ）
   */
  speakWithAudio(audio: HTMLAudioElement, frames: LipSyncFrame[]): void {
    console.log('[VRMAnimationController] speakWithAudio called with', frames.length, 'frames')
    
    // 既存のリップシンクを停止
    this.stopSpeaking()
    this.isSpeaking = true
    
    // 音声のメタデータが読み込まれてから処理（より確実な同期）
    const startSync = () => {
      audio.removeEventListener('loadedmetadata', startSync)
      
      // 音声の長さとフレームの長さを比較
      const audioDuration = audio.duration * 1000 // ms
      const framesDuration = frames.length > 0 ? frames[frames.length - 1].time + frames[frames.length - 1].duration : 0
      
      console.log('[VRMAnimationController] Audio metadata loaded, starting sync')
      console.log(`[VRMAnimationController] Audio duration: ${audioDuration.toFixed(1)}ms`)
      console.log(`[VRMAnimationController] Frames duration: ${framesDuration.toFixed(1)}ms`)
      console.log(`[VRMAnimationController] Duration difference: ${(audioDuration - framesDuration).toFixed(1)}ms`)
      
      // フレームが音声より短い場合、最後のフレームを延長
      let adjustedFrames = [...frames]
      if (framesDuration < audioDuration && adjustedFrames.length > 0) {
        const lastFrame = adjustedFrames[adjustedFrames.length - 1]
        const extensionNeeded = audioDuration - framesDuration
        console.log(`[VRMAnimationController] Extending last frame by ${extensionNeeded.toFixed(1)}ms`)
        
        adjustedFrames[adjustedFrames.length - 1] = {
          ...lastFrame,
          duration: lastFrame.duration + extensionNeeded
        }
      }
      
      // 音声再生と同時にアニメーション開始
      const onPlay = () => {
        audio.removeEventListener('play', onPlay)
        console.log('[VRMAnimationController] Audio playback started, beginning lip sync animation')
        
        const animate = () => {
          if (!this.isSpeaking || audio.paused || audio.ended) {
            console.log('[VRMAnimationController] Animation stopped - speaking:', this.isSpeaking, 'paused:', audio.paused, 'ended:', audio.ended)
            this.stopSpeaking()
            return
          }
          
          const currentTime = audio.currentTime * 1000 // ms変換
          
          // 現在の時刻に対応するフレームを検索（調整されたフレームを使用）
          const currentFrame = adjustedFrames.find(frame => 
            currentTime >= frame.time && 
            currentTime < frame.time + frame.duration
          )
          
          // 1秒ごとに詳細ログを出力
          if (Math.floor(currentTime / 1000) !== Math.floor((currentTime - 16) / 1000)) {
            const progress = ((currentTime / audioDuration) * 100).toFixed(1)
            console.log(`[VRMAnimationController] Progress: ${progress}% (${currentTime.toFixed(1)}ms / ${audioDuration.toFixed(1)}ms)`)
            if (currentFrame) {
              console.log(`[VRMAnimationController] Current frame: ${currentFrame.vowel} (${currentFrame.time.toFixed(1)}-${(currentFrame.time + currentFrame.duration).toFixed(1)}ms)`)
            } else {
              console.log(`[VRMAnimationController] No frame at ${currentTime.toFixed(1)}ms`)
            }
          }
          
          if (currentFrame) {
            this.setMouthShape(currentFrame.vowel, currentFrame.intensity)
          } else {
            // フレームが見つからない場合、音声が再生中なら最後のフレームの母音を継続
            if (currentTime < audioDuration && adjustedFrames.length > 0) {
              const lastFrame = adjustedFrames[adjustedFrames.length - 1]
              // 最初の警告時のみログ出力
              if (!this.lastFrameWarningShown) {
                console.log(`[VRMAnimationController] No frame found at ${currentTime.toFixed(1)}ms, using last frame vowel: ${lastFrame.vowel}`)
                this.lastFrameWarningShown = true
              }
              this.setMouthShape(lastFrame.vowel, lastFrame.intensity * 0.7) // 少し弱めに
            } else {
              this.setMouthShape('silence', 0)
            }
          }
          
          this.animationId = requestAnimationFrame(animate)
        }
        
        animate()
      }
      
      audio.addEventListener('play', onPlay, { once: true })
      
      // 音声を再生
      audio.play().catch(error => {
        console.error('[VRMAnimationController] Audio play failed:', error)
        this.stopSpeaking()
      })
    }
    
    // メタデータが既に読み込まれている場合は即座に開始
    if (audio.readyState >= 1) {
      console.log('[VRMAnimationController] Audio metadata already loaded')
      startSync()
    } else {
      console.log('[VRMAnimationController] Waiting for audio metadata to load')
      audio.addEventListener('loadedmetadata', startSync, { once: true })
    }
    
    // 音声終了時のクリーンアップ
    const onEnded = () => {
      console.log('[VRMAnimationController] Audio ended, cleaning up')
      if (this.animationId) cancelAnimationFrame(this.animationId)
      this.stopSpeaking()
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
    
    // エラーハンドリング
    const onError = (e: Event) => {
      console.error('[VRMAnimationController] Audio error:', e)
      if (this.animationId) cancelAnimationFrame(this.animationId)
      this.stopSpeaking()
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
    
    audio.addEventListener('ended', onEnded, { once: true })
    audio.addEventListener('error', onError, { once: true })
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
   * リップシンクの更新（VRMの更新サイクルと同期）
   */
  private updateLipSync(): void {
    // LipSyncクラス内部でのrequestAnimationFrameに依存せず
    // VRMのupdateサイクルと同期してリップシンクを更新
    // 現在の実装では何もしない（既存のLipSyncクラスがrequestAnimationFrameを使用）
    // 将来的にここでリップシンクの同期処理を実装
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

    // 母音の表情が利用可能かチェック
    const vowels = ['a', 'i', 'u', 'e', 'o']
    const availableVowels = vowels.filter(vowel => expressions.includes(vowel))
    console.log('[VRMAnimationController] Available vowel expressions:', availableVowels)
    console.log('[VRMAnimationController] All available expressions:', expressions)
    
    // VRM標準的な口の表情も確認
    const standardMouthExpressions = ['aa', 'ih', 'ou', 'ee', 'oh', 'neutral']
    const availableStandardMouthExpressions = standardMouthExpressions.filter(expr => expressions.includes(expr))
    console.log('[VRMAnimationController] Available standard mouth expressions:', availableStandardMouthExpressions)
    
    // 旧形式の母音表情も確認
    const legacyVowels = ['a', 'i', 'u', 'e', 'o']
    const availableLegacyVowels = legacyVowels.filter(vowel => expressions.includes(vowel))
    console.log('[VRMAnimationController] Available legacy vowel expressions:', availableLegacyVowels)

    return expressions
  }
}