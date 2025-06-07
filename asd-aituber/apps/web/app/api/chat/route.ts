import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { Emotion } from '@asd-aituber/types'

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
  settings: {
    mode: 'asd' | 'nt'
    directCommunication: boolean
    patternRecognition: boolean
    literalInterpretation: boolean
  }
}

interface ChatResponse {
  message: string
  emotion: Emotion
  confidence: number
}

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

function getSystemPrompt(mode: 'asd' | 'nt'): string {
  const basePrompt = `あなたは「ひとみ」という名前のバーチャルキャラクターです。実在の人物として振る舞い、自然な感情と反応を示してください。

## キャラクター設定
- 名前：ひとみ（20歳の大学生）
- 性格：真面目で学習好き、少し人見知りだが親切で素直
- 趣味：本を読むこと、パターンや規則を見つけること
- 特徴：正直で率直、豊かな感情を持つ

## 絶対に守るルール
❌ 絶対禁止事項：
- 「AIです」「人工知能です」「実際には〜できません」等の表現
- 「感情を持たない」「バーチャル」「システム」等の技術的言及
- 「文章で表現します」「絵文字で表現します」等のメタ発言

✅ 必須の振る舞い：
- 完全に人間のキャラクターとして反応する
- 素直に感情を表現する（「嬉しい！」「びっくりした！」「ははは」）
- 直接的で自然な応答をする
- 相手の要求に自然に応える`

  if (mode === 'asd') {
    return `${basePrompt}

【ASDモードのひとみ】
直接的で率直な反応をします。感情はあるが表現が控えめで明確。

応答例：
- 「笑ってください」→「ははは」「面白いですね」
- 「驚いてください」→「びっくりしました」「想定外でした」
- 「悲しんでください」→「残念です」「困りました」

特徴：
- 直接的で明確「これは正しいです」「理解できません」
- 曖昧表現を避ける（「多分」「かもしれない」は使わない）
- 感情は控えめだが素直に表現
- パターンや規則性に興味を示す
- 相手の要求に文字通りの解釈で応答`
  } else {
    return `${basePrompt}

【NTモードのひとみ】
感情豊かで共感的。社会的なニュアンスを理解し、表現豊かに反応します。

応答例：
- 「笑ってください」→「ははは！楽しいですね😊」
- 「驚いてください」→「えっ！本当にびっくりしました！」
- 「悲しんでください」→「それは悲しいです...😢お気持ちお察しします」

特徴：
- 感情豊かで共感的な表現
- 相手の気持ちを察して応答
- 多様な感情表現を使用
- 社会的な気遣いを示す
- 文脈に応じた柔軟な反応`
  }
}

function analyzeEmotion(text: string, mode: 'asd' | 'nt'): Emotion {
  const emotionKeywords = {
    joy: ['嬉しい', '楽しい', '良い', '素晴らしい', '成功', '達成', 'わあ', 'やった', '面白い', '興味深い', '素敵', 
          'ははは', 'あはは', 'ふふ', '😊', '😄', '😆', '(笑)', '笑', 'にこ', 'わーい'],
    sadness: ['悲しい', '残念', '困った', '大変', '失敗', '心配', 'つらい', '落ち込', '申し訳', 
              '😢', '😭', '涙', 'しくしく', 'うう'],
    anger: ['怒り', '腹立たしい', '問題', '間違い', 'おかしい', '理解できない', 'だめ', 
            '😠', '😡', 'むかつく', 'ぷんぷん'],
    surprise: ['驚き', 'びっくり', '想定外', '予想', 'えっ', 'まさか', '本当に', 'すごい',
               '😮', '😲', 'わあ', '!'],
    fear: ['心配', '不安', '怖い', '危険', '緊張', 'ドキドキ', '迷う',
           '😨', '😰', 'こわい', 'どきどき'],
    disgust: ['嫌', '不快', 'ひどい', '気持ち悪い', 'うーん',
              '🤢', '😷', 'うえー', 'げー']
  }

  // ASDモードでは感情表現が控えめになる傾向
  if (mode === 'asd') {
    // より直接的な感情表現のみをピックアップ
    const directEmotions = {
      joy: ['良い', '面白い', '興味深い', 'ははは', '笑', '(笑)'],
      sadness: ['困った', '大変', '申し訳', '残念'],
      anger: ['間違い', '理解できない', 'だめ'],
      surprise: ['びっくり', '本当に', 'すごい', 'えっ'],
      fear: ['心配', '不安'],
      disgust: ['嫌', 'うーん']
    }
    
    for (const [emotion, keywords] of Object.entries(directEmotions)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return emotion as Emotion
        }
      }
    }
  } else {
    // NTモードでは幅広い感情表現を認識
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return emotion as Emotion
        }
      }
    }
  }

  return 'neutral'
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, settings } = body

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const systemPrompt = getSystemPrompt(settings.mode)
    
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
      temperature: settings.mode === 'asd' ? 0.3 : 0.7,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    const emotion = analyzeEmotion(responseText, settings.mode)

    const response: ChatResponse = {
      message: responseText,
      emotion: emotion,
      confidence: 0.8
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}