/**
 * VOICEVOX Text-to-Speech API Route
 * VOICEVOXサーバーとの通信を仲介するAPIエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server'

interface VoicevoxRequest {
  text: string
  speaker: string | number
  speed: number
  pitch: number
  intonation: number
  serverUrl?: string
}

interface VoicevoxAudioQuery {
  accent_phrases: any[]
  speedScale: number
  pitchScale: number
  intonationScale: number
  volumeScale: number
  prePhonemeLength: number
  postPhonemeLength: number
  outputSamplingRate: number
  outputStereo: boolean
  kana: string
}

function createMultipartResponse(audioBuffer: ArrayBuffer, audioQuery: any): NextResponse {
  const boundary = `----WebKitFormBoundary${Math.random().toString(16).slice(2)}`
  const contentType = `multipart/form-data; boundary=${boundary}`

  const jsonPart = Buffer.from(JSON.stringify(audioQuery))
  const audioPart = Buffer.from(audioBuffer)

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from('Content-Disposition: form-data; name="audioQuery"\r\n'),
    Buffer.from('Content-Type: application/json\r\n\r\n'),
    jsonPart,
    Buffer.from('\r\n'),
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from('Content-Disposition: form-data; name="audio"; filename="speech.wav"\r\n'),
    Buffer.from('Content-Type: audio/wav\r\n\r\n'),
    audioPart,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])

  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': contentType },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body: VoicevoxRequest = await request.json()
    const { text, speaker, speed, pitch, intonation, serverUrl = 'http://127.0.0.1:50021' } = body

    if (!text || speaker === undefined) {
      return NextResponse.json({ error: 'text and speaker are required' }, { status: 400 })
    }

    // 1. audio_query を作成
    const audioQueryResponse = await fetch(
      `${serverUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      },
    )

    if (!audioQueryResponse.ok) {
      const errorText = await audioQueryResponse.text()
      console.error(`VOICEVOX audio_query failed: ${errorText}`)
      return NextResponse.json(
        { error: 'Failed to create audio query', details: errorText },
        { status: audioQueryResponse.status },
      )
    }

    const audioQuery = await audioQueryResponse.json()

    // パラメータを調整
    audioQuery.speedScale = speed
    audioQuery.pitchScale = pitch
    audioQuery.intonationScale = intonation
    audioQuery.outputStereo = true

    // 2. synthesis を実行
    const synthesisResponse = await fetch(`${serverUrl}/synthesis?speaker=${speaker}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(audioQuery),
      signal: AbortSignal.timeout(10000), // 10秒に延長
    })

    if (!synthesisResponse.ok || !synthesisResponse.body) {
      const errorText = await synthesisResponse.text()
      console.error(`VOICEVOX synthesis failed: ${errorText}`)
      return NextResponse.json(
        { error: 'Failed to synthesize audio', details: errorText },
        { status: synthesisResponse.status },
      )
    }

    const audioBuffer = await synthesisResponse.arrayBuffer()

    return createMultipartResponse(audioBuffer, audioQuery)

  } catch (error) {
    console.error('TTS-VOICEVOX API Error:', error)
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'VOICEVOX server timed out' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// HEALTHチェック用
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const serverUrl = url.searchParams.get('serverUrl') || 
                     process.env.VOICEVOX_SERVER_URL || 
                     'http://localhost:50021'

    // VOICEVOXサーバーのバージョンをチェック
    const response = await fetch(`${serverUrl}/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      return NextResponse.json(
        { available: false, error: `Server responded with ${response.status}` },
        { status: 200 }
      )
    }

    const version = await response.json()
    
    return NextResponse.json({
      available: true,
      version,
      serverUrl
    })

  } catch (error) {
    return NextResponse.json({
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}