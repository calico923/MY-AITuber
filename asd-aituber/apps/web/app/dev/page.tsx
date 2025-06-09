/**
 * Development Testing Page
 * 開発用テストページ
 */

'use client'

import dynamic from 'next/dynamic'

// Dynamic import to disable SSR for voice components
const VoiceInputDynamic = dynamic(() => import('@/components/VoiceInput'), { ssr: false })
const VoiceSynthesisDynamic = dynamic(() => import('@/components/VoiceSynthesis'), { ssr: false })
const VoicevoxSynthesisDynamic = dynamic(() => import('@/components/VoicevoxSynthesis'), { ssr: false })

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DevPage() {
  const [transcript, setTranscript] = useState('')
  const [lastSpokenText, setLastSpokenText] = useState('')

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Development Testing Page</h1>
          <p className="text-gray-600 mt-2">
            音声入力・音声合成機能のテストページ
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 音声入力テスト */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🎤 音声入力テスト
                  <Badge variant="outline">Web Speech API</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VoiceInputDynamic
                  onTranscript={(text) => {
                    setTranscript(text)
                    console.log('音声認識結果:', text)
                  }}
                  placeholder="マイクボタンを押して話してください..."
                />
                
                {transcript && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <div className="text-sm font-medium text-blue-700 mb-1">
                      認識結果:
                    </div>
                    <div className="text-blue-900">{transcript}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 音声合成テスト */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔊 音声合成テスト
                  <Badge variant="outline">Web Speech Synthesis</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VoiceSynthesisDynamic
                  onSpeech={(text) => {
                    setLastSpokenText(text)
                    console.log('音声合成開始:', text)
                  }}
                  onWordBoundary={(charIndex) => {
                    console.log('音声合成 - 文字境界:', charIndex)
                  }}
                />
                
                {lastSpokenText && (
                  <div className="mt-4 p-3 bg-green-50 rounded-md">
                    <div className="text-sm font-medium text-green-700 mb-1">
                      最後に再生:
                    </div>
                    <div className="text-green-900">{lastSpokenText}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* VOICEVOX音声合成テスト */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🎵 VOICEVOX統合音声合成
                  <Badge variant="default">VOICEVOX + Web Speech</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VoicevoxSynthesisDynamic
                  onSpeech={(text, emotion) => {
                    setLastSpokenText(`${text} (感情: ${emotion})`)
                    console.log('VOICEVOX音声合成開始:', text, emotion)
                  }}
                  onWordBoundary={(charIndex) => {
                    console.log('VOICEVOX - 文字境界:', charIndex)
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 音声入力→音声合成のフロー */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔄 音声入力→音声合成フロー
              <Badge variant="secondary">統合テスト</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                1. 音声入力で話す → 2. 認識されたテキストが表示される → 3. そのテキストを音声合成で再生
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <VoiceInputDynamic
                    onTranscript={(text) => {
                      setTranscript(text)
                      // 音声認識結果を記録（実際のアプリではAI応答になる）
                      console.log('音声入力から音声合成へのフロー:', text)
                    }}
                    placeholder="話してください..."
                  />
                </div>
                
                <div className="flex-1 min-w-64">
                  <VoiceSynthesisDynamic
                    onSpeech={setLastSpokenText}
                  />
                </div>
              </div>
              
              {transcript && (
                <div className="p-3 bg-yellow-50 rounded-md">
                  <div className="text-sm font-medium text-yellow-700 mb-1">
                    入力→合成フロー:
                  </div>
                  <div className="text-yellow-900">
                    入力: "{transcript}" → 応答: "あなたは「{transcript}」と言いましたね。"
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 技術情報 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🔧 技術情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">音声入力 (Web Speech API)</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• HTTPS または localhost が必要</li>
                  <li>• Chrome の音声認識エンジンを使用</li>
                  <li>• 日本語認識に対応</li>
                  <li>• ネットワークエラー対策済み</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">音声合成 (Web Speech Synthesis)</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• ブラウザ内蔵の音声エンジン</li>
                  <li>• 日本語音声の自動選択</li>
                  <li>• 音量・速度・音の高さ調整可能</li>
                  <li>• リップシンク用のコールバック対応</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}