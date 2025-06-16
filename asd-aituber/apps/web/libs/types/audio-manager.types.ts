/**
 * VoiceInputControllerインターフェース
 * 音声入力の制御メソッドを定義
 */
export interface VoiceInputController {
  /**
   * 音声入力を強制停止
   */
  forceStop(): void
  
  /**
   * 音声入力を自動再開
   */
  autoRestart(): void
}