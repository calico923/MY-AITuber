/**
 * リップシンク（口パク）システム
 * テキストベースの音韻解析と口の動きの同期
 */

export interface LipSyncOptions {
  speed: number        // 話す速度（文字/秒）
  intensity: number    // 口の動きの強度
  pauseDuration: number // 句読点での一時停止時間
}

export interface PhonemeData {
  phoneme: string      // 音韻（a, i, u, e, o）
  duration: number     // 持続時間（ms）
  intensity: number    // 強度（0-1）
}

export class LipSync {
  private isPlaying = false
  private animationId: number | null = null
  private onPhonemeChange: ((phoneme: string, intensity: number) => void) | null = null
  private onComplete: (() => void) | null = null

  /**
   * テキストから音韻データを生成
   */
  static textToPhonemes(text: string, options: LipSyncOptions = {
    speed: 8,           // 8文字/秒
    intensity: 0.7,     // 70%の強度
    pauseDuration: 300  // 300ms休止
  }): PhonemeData[] {
    const phonemes: PhonemeData[] = []
    const charDuration = 1000 / options.speed // 1文字あたりの時間

    // 日本語の音韻マッピング
    const phonemeMap: { [key: string]: string } = {
      'あ': 'a', 'か': 'a', 'さ': 'a', 'た': 'a', 'な': 'a', 'は': 'a', 'ま': 'a', 'や': 'a', 'ら': 'a', 'わ': 'a',
      'い': 'i', 'き': 'i', 'し': 'i', 'ち': 'i', 'に': 'i', 'ひ': 'i', 'み': 'i', 'り': 'i',
      'う': 'u', 'く': 'u', 'す': 'u', 'つ': 'u', 'ぬ': 'u', 'ふ': 'u', 'む': 'u', 'ゆ': 'u', 'る': 'u',
      'え': 'e', 'け': 'e', 'せ': 'e', 'て': 'e', 'ね': 'e', 'へ': 'e', 'め': 'e', 'れ': 'e',
      'お': 'o', 'こ': 'o', 'そ': 'o', 'と': 'o', 'の': 'o', 'ほ': 'o', 'も': 'o', 'よ': 'o', 'ろ': 'o', 'を': 'o'
    }

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      
      // 句読点での休止
      if ('。！？、．，'.includes(char)) {
        phonemes.push({
          phoneme: 'silence',
          duration: options.pauseDuration,
          intensity: 0
        })
        continue
      }
      
      // スペースや改行での短い休止
      if (/\s/.test(char)) {
        phonemes.push({
          phoneme: 'silence',
          duration: charDuration * 0.5,
          intensity: 0
        })
        continue
      }

      // 音韻マッピング
      let phoneme = phonemeMap[char] || 'a' // デフォルトは'a'
      
      // 連続する同じ音韻の場合、強度を変える
      const prevPhoneme = phonemes[phonemes.length - 1]
      let intensity = options.intensity
      if (prevPhoneme && prevPhoneme.phoneme === phoneme) {
        intensity *= 0.8 // 少し弱くする
      }

      phonemes.push({
        phoneme,
        duration: charDuration,
        intensity
      })
    }

    return phonemes
  }

  /**
   * リップシンクアニメーションを開始
   */
  play(
    phonemes: PhonemeData[],
    onPhonemeChange: (phoneme: string, intensity: number) => void,
    onComplete?: () => void
  ): void {
    if (this.isPlaying) {
      this.stop()
    }

    this.isPlaying = true
    this.onPhonemeChange = onPhonemeChange
    this.onComplete = onComplete || null

    let currentIndex = 0
    let startTime = performance.now()

    const animate = (currentTime: number) => {
      if (!this.isPlaying) return

      const elapsedTime = currentTime - startTime

      // 現在の音韻を見つける
      let accumulatedTime = 0
      let currentPhoneme: PhonemeData | null = null

      for (let i = 0; i < phonemes.length; i++) {
        if (elapsedTime >= accumulatedTime && elapsedTime < accumulatedTime + phonemes[i].duration) {
          currentPhoneme = phonemes[i]
          break
        }
        accumulatedTime += phonemes[i].duration
      }

      if (currentPhoneme) {
        // 音韻の変化を通知
        if (this.onPhonemeChange) {
          const intensity = currentPhoneme.phoneme === 'silence' ? 0 : currentPhoneme.intensity
          this.onPhonemeChange(currentPhoneme.phoneme, intensity)
        }
      } else {
        // アニメーション終了
        this.stop()
        if (this.onComplete) {
          this.onComplete()
        }
        return
      }

      this.animationId = requestAnimationFrame(animate)
    }

    this.animationId = requestAnimationFrame(animate)
  }

  /**
   * テキストから直接リップシンクを開始
   */
  playText(
    text: string,
    onPhonemeChange: (phoneme: string, intensity: number) => void,
    onComplete?: () => void,
    options?: Partial<LipSyncOptions>
  ): void {
    const defaultOptions: LipSyncOptions = {
      speed: 8,
      intensity: 0.7,
      pauseDuration: 300
    }
    
    const finalOptions = { ...defaultOptions, ...options }
    const phonemes = LipSync.textToPhonemes(text, finalOptions)
    this.play(phonemes, onPhonemeChange, onComplete)
  }

  /**
   * リップシンクを停止
   */
  stop(): void {
    this.isPlaying = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    
    // 口を閉じる
    if (this.onPhonemeChange) {
      this.onPhonemeChange('silence', 0)
    }
  }

  /**
   * リップシンクが再生中かどうか
   */
  isActive(): boolean {
    return this.isPlaying
  }
}