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
      setIsPlaying(true)
      setError(null)  // エラーをクリア
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    const handleError = (event: Event) => {
      const errorMessage = 'Audio playback error occurred'
      if (process.env.NODE_ENV === 'development') {
        console.error('Audio playback error:', event)
      }
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