/**
 * Voice Synthesis UI Component
 * 音声合成機能のUIコンポーネント
 */

'use client'

import React, { useState } from 'react'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  Settings,
  AlertTriangle 
} from 'lucide-react'

interface VoiceSynthesisProps {
  onSpeech?: (text: string) => void
  onWordBoundary?: (charIndex: number) => void
  className?: string
  disabled?: boolean
}

export default function VoiceSynthesis({
  onSpeech,
  onWordBoundary,
  className = "",
  disabled = false
}: VoiceSynthesisProps) {
  const [testText, setTestText] = useState('こんにちは。私はAIアシスタントです。')
  const [showSettings, setShowSettings] = useState(false)

  const {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
    error,
    volume,
    setVolume,
    rate,
    setRate,
    pitch,
    setPitch
  } = useSpeechSynthesis({
    autoSelectJapanese: true,
    callbacks: {
      onStart: () => {
        console.log('🎤 Speech synthesis started')
        onSpeech?.(testText)
      },
      onEnd: () => {
        console.log('🎤 Speech synthesis ended')
      },
      onWord: (charIndex) => {
        onWordBoundary?.(charIndex)
      },
      onError: (error) => {
        console.error('🚨 Speech synthesis error:', error)
      }
    }
  })

  const handleSpeak = () => {
    if (testText.trim()) {
      speak(testText)
    }
  }

  const handleStop = () => {
    stop()
  }

  const handlePauseResume = () => {
    if (isPaused) {
      resume()
    } else {
      pause()
    }
  }

  if (!isSupported) {
    return (
      <Card className={`w-full max-w-md ${className}`}>
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              お使いのブラウザは音声合成に対応していません
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          音声合成
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* エラー表示 */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* テスト用テキストエリア */}
        <div className="space-y-2">
          <label className="text-sm font-medium">テストテキスト</label>
          <Textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="読み上げるテキストを入力..."
            rows={3}
            disabled={disabled}
            className="text-sm"
          />
        </div>

        {/* 音声制御ボタン */}
        <div className="flex gap-2">
          <Button
            onClick={handleSpeak}
            disabled={disabled || isSpeaking || !testText.trim()}
            size="sm"
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            再生
          </Button>

          {isSpeaking && (
            <Button
              onClick={handlePauseResume}
              disabled={disabled}
              size="sm"
              variant="outline"
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
          )}

          <Button
            onClick={handleStop}
            disabled={disabled || !isSpeaking}
            size="sm"
            variant="outline"
          >
            <Square className="h-4 w-4" />
          </Button>

          <Button
            onClick={() => setShowSettings(!showSettings)}
            size="sm"
            variant="outline"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* 音声設定 */}
        {showSettings && (
          <div className="space-y-4 p-3 bg-gray-50 rounded-md">
            {/* 音声選択 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">音声</label>
              <Select
                value={selectedVoice?.name || ''}
                onValueChange={(value) => {
                  const voice = voices.find(v => v.voice.name === value)?.voice
                  setSelectedVoice(voice || null)
                }}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="音声を選択..." />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voiceInfo) => (
                    <SelectItem 
                      key={voiceInfo.voice.name} 
                      value={voiceInfo.voice.name}
                    >
                      <div className="flex items-center gap-2">
                        <span>{voiceInfo.voice.name}</span>
                        <span className="text-xs text-gray-500">
                          ({voiceInfo.quality})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 音量調整 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                音量: {Math.round(volume * 100)}%
              </label>
              <Slider
                value={[volume]}
                onValueChange={([value]) => setVolume(value)}
                min={0}
                max={1}
                step={0.1}
                disabled={disabled}
                className="w-full"
              />
            </div>

            {/* 速度調整 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                速度: {rate.toFixed(1)}x
              </label>
              <Slider
                value={[rate]}
                onValueChange={([value]) => setRate(value)}
                min={0.5}
                max={2.0}
                step={0.1}
                disabled={disabled}
                className="w-full"
              />
            </div>

            {/* 音の高さ調整 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                音の高さ: {pitch.toFixed(1)}
              </label>
              <Slider
                value={[pitch]}
                onValueChange={([value]) => setPitch(value)}
                min={0.5}
                max={2.0}
                step={0.1}
                disabled={disabled}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* 状態表示 */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>状態: {
            isSpeaking ? (isPaused ? '一時停止中' : '再生中') : '停止中'
          }</div>
          <div>利用可能な日本語音声: {voices.length}個</div>
          {selectedVoice && (
            <div>選択中: {selectedVoice.name}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}