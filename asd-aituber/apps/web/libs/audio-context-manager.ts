import type { VoiceInputController } from './types/audio-manager.types'

/**
 * 緊急停止の処理結果
 */
interface EmergencyStopResult {
  speechSynthesisCancelled: boolean
  audioElementsStopped: number
  timersCleared: boolean
  stateReset: boolean
}

/**
 * グローバル音声状態管理クラス
 * エコーループ防止のための中央集権的な音声状態管理を提供
 */
export class AudioContextManager {
  private static instance: AudioContextManager | null = null
  private isSpeaking: boolean = false
  private voiceInputRef: VoiceInputController | null = null
  private restartTimerId: NodeJS.Timeout | null = null
  
  /**
   * プライベートコンストラクタ（シングルトンパターン）
   */
  private constructor() {
    // ブラウザ環境チェック
    if (typeof window === 'undefined') {
      console.warn('[AudioContextManager] Not in browser environment')
    }
  }
  
  /**
   * AudioContextManagerのシングルトンインスタンスを取得
   * @returns {AudioContextManager} シングルトンインスタンス
   */
  static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager()
      console.log('[AudioContextManager] Instance created')
    }
    return AudioContextManager.instance
  }
  
  /**
   * インスタンスをリセット（主にテスト用）
   * @internal
   */
  static resetInstance(): void {
    if (AudioContextManager.instance) {
      AudioContextManager.instance.clearRestartTimer()
    }
    AudioContextManager.instance = null
    console.log('[AudioContextManager] Instance reset')
  }
  
  /**
   * 現在の音声合成状態を取得
   * @returns {boolean} 音声合成中の場合true
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking
  }
  
  /**
   * VoiceInputControllerを登録
   * @param {VoiceInputController} controller - 音声入力コントローラー
   */
  registerVoiceInput(controller: VoiceInputController): void {
    this.voiceInputRef = controller
  }
  
  /**
   * VoiceInputControllerが登録されているかチェック
   * @returns {boolean} 登録済みの場合true
   */
  hasVoiceInputRegistered(): boolean {
    return this.voiceInputRef !== null
  }
  
  /**
   * 音声合成状態を設定
   * @param {boolean} speaking - 音声合成中フラグ
   */
  setIsSpeaking(speaking: boolean): void {
    const prevState = this.isSpeaking
    this.isSpeaking = speaking
    
    console.log(`[AudioContextManager] Speech state changed: ${prevState} → ${speaking}`)
    
    if (speaking) {
      // 既存の再開タイマーをキャンセル
      this.clearRestartTimer()
      
      // 音声合成開始: 即座にマイク停止
      console.log('[AudioContextManager] 🔇 Starting speech synthesis - stopping voice input')
      this.voiceInputRef?.forceStop()
    } else {
      // 音声合成終了: 300ms後にマイク再開
      console.log('[AudioContextManager] 🔊 Speech synthesis ended')
      this.restartTimerId = setTimeout(() => {
        console.log('[AudioContextManager] ⏰ 300ms delay completed - restarting voice input')
        this.voiceInputRef?.autoRestart()
        this.restartTimerId = null
      }, 300)
    }
  }
  
  /**
   * 再開タイマーをクリアする
   * @private
   */
  private clearRestartTimer(): void {
    if (this.restartTimerId) {
      console.log('[AudioContextManager] 🔄 Clearing restart timer')
      clearTimeout(this.restartTimerId)
      this.restartTimerId = null
    }
  }
  
  /**
   * 緊急停止: 全ての音声出力を即座に停止
   * - speechSynthesis.cancel()でWeb Speech APIを停止
   * - 全てのaudio要素を一時停止＆リセット
   * - 再開タイマーをクリア
   * - 音声状態をfalseにリセット
   * 
   * @returns {EmergencyStopResult} 停止処理の結果詳細
   */
  emergencyStop(): EmergencyStopResult {
    console.log('[AudioContextManager] 🚨 Emergency stop initiated')
    
    const result: EmergencyStopResult = {
      speechSynthesisCancelled: false,
      audioElementsStopped: 0,
      timersCleared: false,
      stateReset: false
    }
    
    // 再開タイマーをクリア
    this.clearRestartTimer()
    result.timersCleared = true
    
    // Web Speech API音声合成を停止
    try {
      if (this.isBrowserEnvironment() && typeof speechSynthesis !== 'undefined') {
        speechSynthesis.cancel()
        result.speechSynthesisCancelled = true
        console.log('[AudioContextManager] 🔇 Speech synthesis cancelled')
      }
    } catch (error) {
      console.warn('[AudioContextManager] Failed to cancel speech synthesis:', error)
    }
    
    // 全てのHTML Audio要素を停止
    try {
      if (this.isBrowserEnvironment() && typeof document !== 'undefined') {
        const audioElements = document.querySelectorAll('audio')
        
        audioElements.forEach((audio, index) => {
          try {
            audio.pause()
            audio.currentTime = 0
            result.audioElementsStopped++
            console.log(`[AudioContextManager] 🔇 Audio element ${index} stopped and reset`)
          } catch (error) {
            console.warn(`[AudioContextManager] Failed to stop audio element ${index}:`, error)
          }
        })
        
        console.log(`[AudioContextManager] 🔇 ${result.audioElementsStopped}/${audioElements.length} audio elements processed`)
      }
    } catch (error) {
      console.warn('[AudioContextManager] Failed to query audio elements:', error)
    }
    
    // 音声状態をfalseにリセット
    this.isSpeaking = false
    result.stateReset = true
    
    console.log('[AudioContextManager] 🚨 Emergency stop completed:', result)
    return result
  }
  
  /**
   * ブラウザ環境かどうかをチェック
   * @private
   * @returns {boolean} ブラウザ環境の場合true
   */
  private isBrowserEnvironment(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined'
  }
}