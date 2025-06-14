/**
 * Speech Message Filter
 * メッセージの音声合成処理を判定するユーティリティ
 */

import type { ChatMessage } from '../../../packages/types/src/index'

/**
 * メッセージが音声合成されるべきかどうかを判定する
 * @param message - 判定対象のメッセージ
 * @returns 音声合成すべき場合は true
 */
export function shouldSynthesizeMessage(message: ChatMessage): boolean {
  // userロールのメッセージは音声合成しない
  if (message.role !== 'assistant') {
    return false
  }
  
  // セッションから復元されたメッセージは音声合成しない
  if (message.isFromSession === true) {
    return false
  }
  
  // 既に話されたメッセージは音声合成しない
  if (message.hasBeenSpoken === true) {
    return false
  }
  
  return true
}

/**
 * メッセージの音声合成スキップ理由を取得する（デバッグ用）
 * @param message - 判定対象のメッセージ
 * @returns スキップ理由、音声合成すべき場合は null
 */
export function getSynthesisSkipReason(message: ChatMessage): string | null {
  if (message.role !== 'assistant') {
    return `Role is '${message.role}', not 'assistant'`
  }
  
  if (message.isFromSession === true) {
    return 'Message is from session (isFromSession=true)'
  }
  
  if (message.hasBeenSpoken === true) {
    return 'Message has already been spoken (hasBeenSpoken=true)'
  }
  
  return null
}