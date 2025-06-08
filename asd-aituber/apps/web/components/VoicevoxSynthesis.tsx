/**
 * VOICEVOX Voice Synthesis Component
 * VOICEVOX統合音声合成UIコンポーネント
 */

'use client'

import React, { useState } from 'react'
import type { Emotion } from '@asd-aituber/types'
import { useUnifiedVoiceSynthesis } from '@/hooks/useUnifiedVoiceSynthesis'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Mic2,
  Bot
} from 'lucide-react'

interface VoicevoxSynthesisProps {
  onSpeech?: (text: string, emotion: Emotion) => void
  onWordBoundary?: (charIndex: number) => void
  className?: string
  disabled?: boolean
  defaultText?: string
}

export default function VoicevoxSynthesis({
  onSpeech,
  onWordBoundary,
  className = "",
  disabled = false,
  defaultText = 'こんにちは。私はVOICEVOXを使って話しています。'
}: VoicevoxSynthesisProps) {
  const [testText, setTestText] = useState(defaultText)
  const [showSettings, setShowSettings] = useState(false)
  const [showEngineStatus, setShowEngineStatus] = useState(false)

  const {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isLoading,
    error,
    currentEngine,
    setPreferredEngine,
    engineStatus,
    voicevoxSpeakers,
    selectedSpeaker,
    setSelectedSpeaker,
    webSpeechVoices,
    selectedWebVoice,
    setSelectedWebVoice,
    volume,
    setVolume,
    emotion,
    setEmotion,
    mode,
    setMode,
    refreshEngines,
    testVoice
  } = useUnifiedVoiceSynthesis({
    callbacks: {
      onStart: () => {
        console.log('🎤 Voice synthesis started')
        onSpeech?.(testText, emotion)
      },
      onEnd: () => {
        console.log('🎤 Voice synthesis ended')
      },
      onWord: (charIndex) => {
        onWordBoundary?.(charIndex)
      },
      onError: (error) => {
        console.error('🚨 Voice synthesis error:', error)
      }
    }
  })

  const handleSpeak = async () => {
    if (testText.trim()) {
      await speak(testText)
    }
  }

  const handleStop = () => {
    stop()
  }

  const handlePauseResume = () => {
    if (isSpeaking) {
      pause()
    } else {
      resume()
    }
  }

  const handleTestVoice = async () => {
    await testVoice()
  }

  const getEngineStatusIcon = (available: boolean) => {
    return available ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    )
  }

  if (isLoading) {
    return (
      <Card className={`w-full max-w-md ${className}`}>
        <CardContent className="p-6 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>音声エンジンを初期化中...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          VOICEVOX音声合成
          <Badge variant={currentEngine === 'voicevox' ? 'default' : 'secondary'}>
            {currentEngine === 'voicevox' ? 'VOICEVOX' : 'Web Speech'}
          </Badge>
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

        {/* エンジン状態表示 */}
        {showEngineStatus && engineStatus && (
          <div className="space-y-2 p-3 bg-gray-50 rounded-md">
            <h4 className="font-semibold text-sm">エンジン状態</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {getEngineStatusIcon(engineStatus.voicevox.available)}
                VOICEVOX
              </span>
              <span className="text-gray-500">
                {engineStatus.voicevox.available 
                  ? `${engineStatus.voicevox.speakers.length}個の話者` 
                  : '利用不可'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {getEngineStatusIcon(engineStatus.webspeech.available)}
                Web Speech
              </span>
              <span className="text-gray-500">
                {engineStatus.webspeech.available 
                  ? `${engineStatus.webspeech.voices.length}個の音声` 
                  : '利用不可'}
              </span>
            </div>
          </div>
        )}

        {/* エンジン選択 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">音声エンジン</label>
          <Select
            value={currentEngine}
            onValueChange={(value) => setPreferredEngine(value as any)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  自動選択
                </div>
              </SelectItem>
              <SelectItem value="voicevox">
                <div className="flex items-center gap-2">
                  <Mic2 className="h-4 w-4" />
                  VOICEVOX
                </div>
              </SelectItem>
              <SelectItem value="webspeech">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Web Speech API
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ASD/NTモード選択 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">コミュニケーションモード</label>
          <Select
            value={mode}
            onValueChange={(value) => setMode(value as 'asd' | 'nt')}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asd">ASD（控えめな感情表現）</SelectItem>
              <SelectItem value="nt">NT（豊かな感情表現）</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 感情選択 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">感情</label>
          <Select
            value={emotion}
            onValueChange={(value) => setEmotion(value as Emotion)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="neutral">普通</SelectItem>
              <SelectItem value="joy">喜び</SelectItem>
              <SelectItem value="happy">幸せ</SelectItem>
              <SelectItem value="sadness">悲しみ</SelectItem>
              <SelectItem value="anger">怒り</SelectItem>
              <SelectItem value="surprise">驚き</SelectItem>
              <SelectItem value="fear">恐れ</SelectItem>
              <SelectItem value="excited">興奮</SelectItem>
              <SelectItem value="calm">冷静</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* VOICEVOX話者選択 */}
        {currentEngine !== 'webspeech' && voicevoxSpeakers.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">VOICEVOX話者</label>
            <Select
              value={selectedSpeaker.toString()}
              onValueChange={(value) => setSelectedSpeaker(value)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {voicevoxSpeakers.map((speaker) => (
                  <SelectItem key={speaker.id} value={speaker.id.toString()}>
                    {speaker.speaker}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

          <Button
            onClick={handleTestVoice}
            disabled={disabled || isSpeaking}
            size="sm"
            variant="outline"
          >
            <Volume2 className="h-4 w-4" />
          </Button>

          {isSpeaking && (
            <Button
              onClick={handlePauseResume}
              disabled={disabled}
              size="sm"
              variant="outline"
            >
              <Pause className="h-4 w-4" />
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
            onClick={() => setShowEngineStatus(!showEngineStatus)}
            size="sm"
            variant="outline"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* エンジン更新ボタン */}
        <div className="flex gap-2">
          <Button
            onClick={refreshEngines}
            disabled={disabled || isLoading}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            エンジン状態を更新
          </Button>
        </div>

        {/* 状態表示 */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>状態: {isSpeaking ? '再生中' : '停止中'}</div>
          <div>エンジン: {currentEngine}</div>
          <div>モード: {mode === 'asd' ? 'ASDモード' : 'NTモード'}</div>
          <div>感情: {emotion}</div>
          {currentEngine !== 'webspeech' && (
            <div>話者: {voicevoxSpeakers.find(s => s.id.toString() === selectedSpeaker.toString())?.speaker || selectedSpeaker}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}