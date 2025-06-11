import { useState, useEffect } from 'react'

/**
 * HTMLAudioElementの再生状態を監視するカスタムフック
 * エコーループ修正のために実際の音声発話状態を追跡する
 * 
 * @param audio 監視するHTMLAudioElement
 * @returns 再生状態オブジェクト
 */
export function useAudioPlaybackState(audio: HTMLAudioElement | null) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // audioがnullの場合は何もしない
    if (!audio) {
      setIsPlaying(false)
      return
    }

    // イベントハンドラー定義
    const handlePlay = () => {
      console.log('[useAudioPlaybackState] 🔊 音声再生開始')
      setIsPlaying(true)
      setError(null)  // エラーをクリア
    }

    const handleEnded = () => {
      console.log('[useAudioPlaybackState] 🔇 音声再生終了')
      setIsPlaying(false)
    }

    const handlePause = () => {
      console.log('[useAudioPlaybackState] ⏸️ 音声一時停止')
      setIsPlaying(false)
    }

    const handleError = (event: Event) => {
      const errorMessage = 'Audio playback error occurred'
      console.error('[useAudioPlaybackState] ❌ 音声再生エラー:', event)
      setIsPlaying(false)
      setError(errorMessage)
    }

    // イベントリスナー登録
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('error', handleError)

    // 現在の再生状態を初期化（audio.pausedが未定義の場合はfalseとして扱う）
    setIsPlaying(audio.paused === false)

    // クリーンアップ関数
    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('error', handleError)
    }
  }, [audio]) // audioが変更されたときに再実行

  return { isPlaying, error }
}