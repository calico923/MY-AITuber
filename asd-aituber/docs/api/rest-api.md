# REST API仕様書

最終更新: 2024-06-06

## 概要

ASD/NT模倣AITuberシステムのREST API仕様を定義します。

**ベースURL**: `http://localhost:8000/api/v1`

## 認証

現在のMVP版では認証は実装されていません。将来的にJWT認証を実装予定。

## エンドポイント一覧

### 感情分析

#### POST /emotion/analyze
テキストの感情を分析し、ASD/NTモードに応じた内部感情と外部表現を返します。

**リクエスト:**
```json
{
  "text": "今日はとても楽しかったです",
  "mode": "ASD",
  "context": {
    "conversationId": "uuid-string",
    "previousEmotions": ["neutral", "happy"]
  }
}
```

**レスポンス:**
```json
{
  "internal_emotion": {
    "primary": "joy",
    "intensity": 0.85,
    "valence": 0.9,
    "arousal": 0.7
  },
  "external_expression": {
    "primary": "joy",
    "intensity": 0.26,  // ASDモードでは30%程度
    "display": "subtle_smile",
    "verbal_label": "私は喜びを感じています"
  },
  "confidence": 0.92,
  "processing_time_ms": 145
}
```

**ステータスコード:**
- `200 OK`: 成功
- `400 Bad Request`: 入力データ不正
- `422 Unprocessable Entity`: バリデーションエラー
- `500 Internal Server Error`: サーバーエラー

### PCMパーソナリティ

#### POST /pcm/process
PCMパーソナリティタイプに基づいた応答を生成します。

**リクエスト:**
```json
{
  "text": "明日の会議の準備はどうすればいいですか？",
  "personality_type": "thinker",
  "mode": "NT",
  "stress_level": 0
}
```

**レスポンス:**
```json
{
  "response": {
    "content": "会議の準備には以下の手順をお勧めします：1) アジェンダの確認、2) 必要資料の準備、3) 参加者への事前共有",
    "communication_channel": "requestive",
    "emotion": "neutral",
    "certainty_level": 0.95
  },
  "personality_traits": {
    "logic_focus": 0.9,
    "emotion_expression": 0.3,
    "structure_need": 0.85
  }
}
```

#### GET /pcm/types
利用可能なPCMパーソナリティタイプの一覧を取得します。

**レスポンス:**
```json
{
  "types": [
    {
      "id": "thinker",
      "name_ja": "思考型",
      "name_en": "Thinker",
      "description": "論理的で分析的な思考を重視",
      "strengths": ["分析力", "客観性", "正確性"],
      "communication_channel": "requestive"
    },
    // ... 他の5タイプ
  ]
}
```

### 日本語NLP

#### POST /nlp/parse
日本語テキストの形態素解析と構文解析を行います。

**リクエスト:**
```json
{
  "text": "時間が飛ぶように過ぎました",
  "analyze_options": {
    "morphological": true,
    "dependency": true,
    "detect_idioms": true
  }
}
```

**レスポンス:**
```json
{
  "tokens": [
    {
      "surface": "時間",
      "pos": "名詞",
      "reading": "ジカン",
      "lemma": "時間"
    },
    // ... 他のトークン
  ],
  "idioms": [
    {
      "phrase": "時間が飛ぶ",
      "literal_meaning": "時間が空中を移動する",
      "actual_meaning": "時間が早く過ぎる",
      "idiom_type": "metaphor"
    }
  ],
  "dependencies": [
    {
      "from": 0,
      "to": 2,
      "label": "nsubj"
    }
  ]
}
```

#### POST /nlp/convert-literal
比喩的表現を字義通りの表現に変換します。

**リクエスト:**
```json
{
  "text": "頭が真っ白になった",
  "context": "テスト中に"
}
```

**レスポンス:**
```json
{
  "original": "頭が真っ白になった",
  "literal": "思考が停止した / 何も考えられなくなった",
  "explanation": "「頭が真っ白」は思考停止状態を表す慣用句です",
  "confidence": 0.88
}
```

### ヘルスチェック

#### GET /health
APIサーバーの稼働状態を確認します。

**レスポンス:**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2024-06-06T10:30:00Z",
  "services": {
    "nlp": "operational",
    "emotion": "operational",
    "pcm": "operational"
  }
}
```

## 共通レスポンス形式

### エラーレスポンス

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力データが不正です",
    "details": [
      {
        "field": "mode",
        "message": "modeは'ASD'または'NT'である必要があります"
      }
    ]
  },
  "request_id": "req_123456",
  "timestamp": "2024-06-06T10:30:00Z"
}
```

### エラーコード一覧

| コード | 説明 |
|--------|------|
| `VALIDATION_ERROR` | 入力データのバリデーションエラー |
| `NOT_FOUND` | リソースが見つからない |
| `INTERNAL_ERROR` | サーバー内部エラー |
| `RATE_LIMIT_EXCEEDED` | レート制限超過 |
| `SERVICE_UNAVAILABLE` | サービス利用不可 |

## レート制限

- 感情分析: 20リクエスト/分
- PCM処理: 20リクエスト/分
- NLP解析: 10リクエスト/分

レート制限に達した場合、`429 Too Many Requests`が返されます。

## データ型定義

### TypeScript

```typescript
// 共通の型定義
interface EmotionState {
  primary: EmotionType;
  intensity: number; // 0.0 - 1.0
  valence: number;   // -1.0 - 1.0
  arousal: number;   // 0.0 - 1.0
}

type EmotionType = 
  | "joy" 
  | "sadness" 
  | "anger" 
  | "fear" 
  | "surprise" 
  | "disgust" 
  | "neutral";

type ConversationMode = "ASD" | "NT";

type PCMType = 
  | "thinker" 
  | "persister" 
  | "harmonizer" 
  | "imaginer" 
  | "rebel" 
  | "promoter";
```

### Python (Pydantic)

```python
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ConversationMode(str, Enum):
    ASD = "ASD"
    NT = "NT"

class EmotionType(str, Enum):
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "fear"
    SURPRISE = "surprise"
    DISGUST = "disgust"
    NEUTRAL = "neutral"

class EmotionState(BaseModel):
    primary: EmotionType
    intensity: float = Field(ge=0.0, le=1.0)
    valence: float = Field(ge=-1.0, le=1.0)
    arousal: float = Field(ge=0.0, le=1.0)
```

## 使用例

### cURL

```bash
# 感情分析
curl -X POST http://localhost:8000/api/v1/emotion/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "今日は楽しかった",
    "mode": "ASD"
  }'

# PCM処理
curl -X POST http://localhost:8000/api/v1/pcm/process \
  -H "Content-Type: application/json" \
  -d '{
    "text": "手伝ってください",
    "personality_type": "harmonizer",
    "mode": "NT",
    "stress_level": 0
  }'
```

### JavaScript/TypeScript

```typescript
// 感情分析APIの呼び出し
async function analyzeEmotion(text: string, mode: ConversationMode) {
  const response = await fetch('/api/v1/emotion/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, mode }),
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
}

// 使用例
const result = await analyzeEmotion('嬉しいです', 'ASD');
console.log(result.external_expression.intensity); // 0.3程度
```

### Python

```python
import httpx

async def analyze_emotion(text: str, mode: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/v1/emotion/analyze",
            json={"text": text, "mode": mode}
        )
        response.raise_for_status()
        return response.json()

# 使用例
result = await analyze_emotion("嬉しいです", "ASD")
print(result["external_expression"]["intensity"])  # 0.3程度
```

## 今後の拡張予定

1. **WebSocket API**: リアルタイム会話用
2. **バッチ処理API**: 複数テキストの一括処理
3. **ストリーミングAPI**: 長文テキストの逐次処理
4. **カスタマイズAPI**: ユーザー固有の設定保存

## 変更履歴

- 2024-06-06: 初版作成
