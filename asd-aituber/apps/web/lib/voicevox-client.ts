/**
 * VOICEVOX API Client
 * VOICEVOX音声合成エンジンとの通信を管理
 */

export interface VoicevoxSpeaker {
  id: number
  speaker: string
  description?: string
  category?: string
}

export interface VoicevoxSynthesisOptions {
  speaker: string | number
  speed: number      // 0.5 - 2.0
  pitch: number      // -0.15 - 0.15
  intonation: number // 0.0 - 2.0
  serverUrl?: string
  text: string
}

// 詳細な音素データ型定義
export interface VoicevoxMora {
  text: string
  vowel: string
  vowel_length: number
  pitch: number
}

export interface VoicevoxAccentPhrase {
  moras: VoicevoxMora[]
  accent: number
  pause_mora?: VoicevoxMora
}

export interface VoicevoxAudioQuery {
  accent_phrases: VoicevoxAccentPhrase[]
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

export interface VoicevoxError {
  error: string
  details?: any
}

// 音声合成結果の型定義
export interface SynthesisResult {
  audioBuffer: ArrayBuffer
  audioQuery: VoicevoxAudioQuery | null
}

/**
 * VOICEVOX APIクライアント
 */
export class VoicevoxClient {
  private baseUrl: string
  private isAvailable: boolean = false
  private speakers: VoicevoxSpeaker[] = []

  constructor(serverUrl: string = 'http://localhost:50021') {
    this.baseUrl = serverUrl
  }

  /**
   * VOICEVOXサーバーの可用性をチェック
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/version`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5秒でタイムアウト
      })

      this.isAvailable = response.ok
      
      if (this.isAvailable) {
        console.log('✅ VOICEVOX server is available')
        await this.loadSpeakers()
      } else {
        console.warn('⚠️ VOICEVOX server responded with error:', response.status)
      }
      
      return this.isAvailable
    } catch (error) {
      console.warn('⚠️ VOICEVOX server is not available:', error)
      this.isAvailable = false
      return false
    }
  }

  /**
   * 利用可能な話者リストを取得
   */
  async loadSpeakers(): Promise<VoicevoxSpeaker[]> {
    try {
      const response = await fetch(`${this.baseUrl}/speakers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      })

      if (!response.ok) {
        throw new Error(`Failed to load speakers: ${response.status}`)
      }

      const data = await response.json()
      
      // VOICEVOX APIの話者データを変換
      this.speakers = this.flattenSpeakers(data)
      console.log(`📢 Loaded ${this.speakers.length} VOICEVOX speakers`)
      
      return this.speakers
    } catch (error) {
      console.error('Failed to load VOICEVOX speakers:', error)
      this.speakers = []
      return []
    }
  }

  /**
   * 話者データを平坦化（ネストされた構造を解除）
   */
  private flattenSpeakers(speakersData: any[]): VoicevoxSpeaker[] {
    const flattened: VoicevoxSpeaker[] = []
    
    speakersData.forEach(speakerGroup => {
      if (speakerGroup.styles) {
        speakerGroup.styles.forEach((style: any) => {
          flattened.push({
            id: style.id,
            speaker: `${speakerGroup.name}/${style.name}`,
            description: speakerGroup.speaker_uuid,
            category: speakerGroup.policy
          })
        })
      }
    })
    
    return flattened
  }

  /**
   * 音声合成を実行（音素データ付き）
   * @param options - 音声合成オプション
   * @returns 音声データと音素データ
   */
  private async synthesizeWithPhonemes(options: VoicevoxSynthesisOptions): Promise<SynthesisResult> {
    if (!this.isAvailable) {
      throw new Error('VOICEVOX server is not available')
    }

    try {
      // API経由でバックエンドに送信
      const response = await fetch('/api/tts-voicevox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: options.text,
          speaker: options.speaker,
          speed: options.speed,
          pitch: options.pitch,
          intonation: options.intonation,
          serverUrl: options.serverUrl || this.baseUrl
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`VOICEVOX synthesis failed: ${errorData.error || response.statusText}`)
      }

      // multipartレスポンスのパースを試行
      try {
        const formData = await response.formData()
        
        // audioQueryデータ（JSON）を取得
        const audioQueryData = formData.get('audioQuery')
        let audioQuery: VoicevoxAudioQuery | null = null
        
        if (audioQueryData && typeof audioQueryData === 'string') {
          try {
            audioQuery = JSON.parse(audioQueryData) as VoicevoxAudioQuery
            console.log('📊 VOICEVOX audioQuery data retrieved successfully')
          } catch (parseError) {
            console.warn('Failed to parse audioQuery JSON:', parseError)
          }
        }
        
        // 音声データ（Blob）を取得
        const audioBlob = formData.get('audio') as Blob
        if (!audioBlob) {
          throw new Error('No audio data in multipart response')
        }
        
        const arrayBuffer = await audioBlob.arrayBuffer()
        
        if (arrayBuffer.byteLength === 0) {
          throw new Error('Received empty audio data from VOICEVOX')
        }

        console.log(`🎵 VOICEVOX synthesis successful: ${arrayBuffer.byteLength} bytes with phoneme data`)
        return { audioBuffer: arrayBuffer, audioQuery }
        
      } catch (multipartError) {
        console.warn('Multipart parse failed, falling back to audio only:', multipartError)
        
        // フォールバック：音声データのみを取得
        const arrayBuffer = await response.arrayBuffer()
        
        if (arrayBuffer.byteLength === 0) {
          throw new Error('Received empty audio data from VOICEVOX')
        }

        console.log(`🎵 VOICEVOX synthesis successful (audio only): ${arrayBuffer.byteLength} bytes`)
        return { audioBuffer: arrayBuffer, audioQuery: null }
      }
      
    } catch (error) {
      console.error('VOICEVOX synthesis error:', error)
      throw error
    }
  }

  /**
   * 音声合成を実行（既存API互換）
   */
  async synthesize(options: VoicevoxSynthesisOptions): Promise<ArrayBuffer> {
    const result = await this.synthesizeWithPhonemes(options)
    return result.audioBuffer
  }

  /**
   * 音声合成を実行（音素データ付き）
   * @param options - 音声合成オプション
   * @returns 音声データと音素データの両方
   */
  async synthesizeWithTiming(options: VoicevoxSynthesisOptions): Promise<SynthesisResult> {
    return this.synthesizeWithPhonemes(options)
  }

  /**
   * 利用可能かどうかを取得
   */
  getIsAvailable(): boolean {
    return this.isAvailable
  }

  /**
   * 話者リストを取得
   */
  getSpeakers(): VoicevoxSpeaker[] {
    return this.speakers
  }

  /**
   * 推奨される話者を取得
   */
  getRecommendedSpeakers(): VoicevoxSpeaker[] {
    // 人気のある話者を優先
    const recommendedIds = [46, 3, 2, 8, 10] // 小夜、ずんだもん、四国めたん等
    
    return this.speakers
      .filter(speaker => recommendedIds.includes(speaker.id))
      .concat(this.speakers.filter(speaker => !recommendedIds.includes(speaker.id)))
  }

  /**
   * デフォルト話者を取得
   */
  getDefaultSpeaker(): VoicevoxSpeaker | null {
    // 小夜/SAYO (ID: 46) をデフォルトとして使用
    const defaultSpeaker = this.speakers.find(speaker => speaker.id === 46)
    return defaultSpeaker || this.speakers[0] || null
  }

  /**
   * サーバーURLを更新
   */
  updateServerUrl(newUrl: string): void {
    this.baseUrl = newUrl
    this.isAvailable = false
    this.speakers = []
  }
}

/**
 * デフォルトのVOICEVOXクライアントインスタンス
 */
export const voicevoxClient = new VoicevoxClient()

/**
 * VOICEVOX話者の定義（フォールバック用）
 */
export const DEFAULT_VOICEVOX_SPEAKERS: VoicevoxSpeaker[] = [
  { id: 46, speaker: '小夜/SAYO', description: '大人の女性の声' },
  { id: 3, speaker: 'ずんだもん/普通', description: '中性的な声' },
  { id: 2, speaker: '四国めたん/普通', description: '若い女性の声' },
  { id: 8, speaker: '春日部つむぎ/普通', description: '落ち着いた女性の声' },
  { id: 10, speaker: '雀松朱司/普通', description: '男性の声' },
]