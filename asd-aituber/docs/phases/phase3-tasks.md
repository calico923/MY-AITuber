# Phase 3: コア機能実装 タスクリスト

期間: 4週間（Day 43-70）

## Week 7-8: モード切り替え

### Day 43-44: UI実装
- [ ] モード切り替えトグル
  ```typescript
  const ModeToggle = () => {
    const { mode, setMode } = useChatStore();
    
    return (
      <div className="flex items-center gap-4">
        <label>NT</label>
        <Switch
          checked={mode === 'ASD'}
          onChange={(checked) => setMode(checked ? 'ASD' : 'NT')}
        />
        <label>ASD</label>
      </div>
    );
  };
  ```
- [ ] モード説明ポップオーバー
  - [ ] 各モードの特徴説明
  - [ ] 初回表示ガイド
- [ ] ビジュアルフィードバック
  - [ ] 背景色/テーマ変更
  - [ ] アイコン表示
  - [ ] トランジション効果

### Day 45-46: 会話ロジック基盤
- [ ] メッセージ処理パイプライン
  ```typescript
  class MessageProcessor {
    async process(message: string, mode: 'ASD' | 'NT') {
      // 1. 前処理
      const preprocessed = await this.preprocess(message);
      
      // 2. NLP解析
      const analysis = await this.analyzeNLP(preprocessed);
      
      // 3. モード別処理
      const processed = mode === 'ASD' 
        ? await this.processASD(analysis)
        : await this.processNT(analysis);
      
      // 4. レスポンス生成
      return this.generateResponse(processed);
    }
  }
  ```
- [ ] コンテキスト管理
  ```typescript
  class ConversationContext {
    private history: Message[] = [];
    private topics: string[] = [];
    private emotionalState: EmotionState;
    
    addMessage(message: Message) {
      this.history.push(message);
      this.updateTopics(message);
    }
  }
  ```
- [ ] 応答キュー管理
  - [ ] 優先度付きキュー
  - [ ] 並列処理制御

### Day 47-49: ASD/NT特性実装
- [ ] ASDモード特性
  ```typescript
  class ASDProcessor {
    // 字義通り解釈
    interpretLiterally(text: string) {
      const idioms = this.detectIdioms(text);
      return idioms.map(idiom => ({
        original: idiom,
        literal: this.getLiteralMeaning(idiom),
        confusion: this.calculateConfusion(idiom)
      }));
    }
    
    // 明確な構造を好む
    preferStructure(response: string) {
      return this.addNumbering(this.breakIntoPoints(response));
    }
    
    // 感情表現の抑制
    suppressEmotionalExpression(emotion: EmotionState) {
      return {
        ...emotion,
        externalIntensity: emotion.internalIntensity * 0.3
      };
    }
  }
  ```
- [ ] NTモード特性
  ```typescript
  class NTProcessor {
    // 文脈依存解釈
    interpretContextually(text: string, context: Context) {
      return this.applyContextualUnderstanding(text, context);
    }
    
    // 非言語的手がかりの統合
    integrateNonverbal(message: Message) {
      const tone = this.detectTone(message);
      const implication = this.detectImplication(message);
      return { ...message, tone, implication };
    }
    
    // 暗黙の了解を適用
    applyImplicitUnderstanding(text: string) {
      const socialContext = this.detectSocialContext(text);
      return this.adjustResponseForContext(text, socialContext);
    }
  }
  ```
- [ ] 違いの可視化
  ```typescript
  const DifferenceDisplay = ({ input, asdInterpretation, ntInterpretation }) => (
    <div className="grid grid-cols-2 gap-4">
      <div className="asd-interpretation bg-blue-50 p-4 rounded">
        <h3 className="font-bold text-blue-900">ASDモード解釈</h3>
        <p>{asdInterpretation}</p>
        <div className="mt-2 text-sm text-blue-700">
          {asdInterpretation.confusionPoints.map(point => (
            <div key={point}>❓ {point}</div>
          ))}
        </div>
      </div>
      <div className="nt-interpretation bg-green-50 p-4 rounded">
        <h3 className="font-bold text-green-900">NTモード解釈</h3>
        <p>{ntInterpretation}</p>
      </div>
    </div>
  );
  ```

### Day 50-51: モード切り替えロジック詳細
- [ ] 会話履歴の処理
  ```typescript
  class ModeTransitionHandler {
    handleModeSwitch(from: Mode, to: Mode, context: ConversationContext) {
      // 会話履歴の再解釈
      const reinterpretedHistory = context.history.map(msg => 
        this.reinterpretMessage(msg, from, to)
      );
      
      // 感情状態の調整
      const adjustedEmotion = this.adjustEmotionalState(
        context.emotionalState, 
        from, 
        to
      );
      
      return {
        history: reinterpretedHistory,
        emotion: adjustedEmotion,
        transitionExplanation: this.generateExplanation(from, to)
      };
    }
  }
  ```
- [ ] リアルタイム更新
  - [ ] UIの即座反映
  - [ ] アニメーション遷移
  - [ ] 音声パラメータ調整
- [ ] 学習モード統合
  - [ ] 比較ビュー
  - [ ] 解説生成

### Day 52-53: 応答パターン実装
- [ ] ASD応答パターン
  ```typescript
  const asdResponsePatterns = {
    clarificationRequest: [
      "「{term}」とは具体的にどういう意味ですか？",
      "どのくらいの{measure}を指していますか？",
      "それは文字通りの意味ですか、それとも比喩ですか？"
    ],
    literalInterpretation: [
      "私の理解では、{literal_meaning}ということですね。",
      "言葉通りに受け取ると、{literal_meaning}となります。"
    ],
    structuredResponse: [
      "私の回答は以下の通りです：\n1. {point1}\n2. {point2}\n3. {point3}",
      "順番に説明します。まず第一に..."
    ]
  };
  ```
- [ ] NT応答パターン
  ```typescript
  const ntResponsePatterns = {
    contextualResponse: [
      "なるほど、{context}ということですね。",
      "状況から察するに、{inference}かもしれませんね。"
    ],
    emotionalMirroring: [
      "それは{emotion}ですね。私も{shared_feeling}。",
      "{emotion}なお気持ち、よくわかります。"
    ],
    implicitAgreement: [
      "そうですね〜",
      "確かに。",
      "ですよね。"
    ]
  };
  ```
- [ ] パターン選択ロジック
  - [ ] 文脈に基づく選択
  - [ ] ランダム性の導入
  - [ ] 学習による最適化

### Day 54-56: テストとデバッグ
- [ ] ユニットテスト作成
  ```typescript
  describe('ASD/NTモード処理', () => {
    test('慣用句の字義通り解釈', () => {
      const processor = new ASDProcessor();
      const result = processor.interpretLiterally("時間が飛ぶように過ぎた");
      
      expect(result[0].literal).toBe("時間が空中を移動する");
      expect(result[0].confusion).toBeGreaterThan(0.5);
    });
    
    test('文脈依存解釈', () => {
      const processor = new NTProcessor();
      const context = { previousTopic: "楽しいイベント" };
      const result = processor.interpretContextually(
        "時間が飛ぶように過ぎた", 
        context
      );
      
      expect(result.interpretation).toContain("楽しい時間");
    });
  });
  ```
- [ ] 統合テスト
  - [ ] モード切り替えフロー
  - [ ] 会話の一貫性
  - [ ] パフォーマンステスト
- [ ] デバッグツール作成
  - [ ] 内部状態ビューア
  - [ ] 処理ログ表示
  - [ ] テストデータジェネレータ

## Week 9-10: Python NLP統合

### Day 57-58: FastAPI基本構築
- [ ] プロジェクト構造実装
  ```python
  # app/main.py
  from fastapi import FastAPI
  from fastapi.middleware.cors import CORSMiddleware
  
  app = FastAPI(
      title="ASD-AITuber NLP API",
      description="日本語NLP処理とASD/NT認知モデル",
      version="0.1.0"
  )
  
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["http://localhost:3000"],
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- [ ] ルーター設計
  ```python
  # app/routers/__init__.py
  from .emotion import router as emotion_router
  from .nlp import router as nlp_router
  from .pcm import router as pcm_router
  
  # app/routers/emotion.py
  @router.post("/analyze", response_model=EmotionResponse)
  async def analyze_emotion(request: EmotionRequest):
      result = await emotion_analyzer.analyze(
          request.text, 
          request.mode,
          request.context
      )
      return EmotionResponse(**result)
  ```
- [ ] Pydanticモデル定義
  ```python
  from pydantic import BaseModel, Field
  from typing import Literal, Optional, List, Dict
  
  class EmotionRequest(BaseModel):
      text: str = Field(..., min_length=1, max_length=1000)
      mode: Literal["ASD", "NT"]
      context: Optional[Dict[str, Any]] = None
      
  class EmotionResponse(BaseModel):
      internal_emotion: EmotionState
      external_expression: EmotionState
      confidence: float = Field(..., ge=0.0, le=1.0)
      processing_time_ms: int
  ```

### Day 59-60: 日本語形態素解析
- [ ] SudachiPy統合
  ```python
  from sudachipy import Dictionary
  from sudachidict_core import SYSTEM_DICT_VERSION
  
  class MorphologicalAnalyzer:
      def __init__(self):
          self.tokenizer = Dictionary().create()
          self.mode = self.tokenizer.SplitMode.C  # 最長一致
      
      def analyze(self, text: str) -> List[Token]:
          tokens = self.tokenizer.tokenize(text, self.mode)
          return [{
              'surface': token.surface(),
              'pos': token.part_of_speech(),
              'pos_detail': self._parse_pos(token.part_of_speech()),
              'reading': token.reading_form(),
              'lemma': token.dictionary_form(),
              'features': token.get_word_info().features
          } for token in tokens]
      
      def _parse_pos(self, pos_info: List[str]) -> Dict[str, str]:
          return {
              'major': pos_info[0],
              'minor1': pos_info[1] if len(pos_info) > 1 else None,
              'minor2': pos_info[2] if len(pos_info) > 2 else None,
              'inflection': pos_info[4] if len(pos_info) > 4 else None,
              'conjugation': pos_info[5] if len(pos_info) > 5 else None
          }
  ```
- [ ] カスタム辞書作成
  ```python
  # dictionaries/asd_terms.txt
  # 表層形,左文脈ID,右文脈ID,コスト,品詞1,品詞2,...,読み,正規形
  ASD,4786,4786,5000,名詞,固有名詞,*,*,*,*,エーエスディー,ASD
  定型発達,4786,4786,5000,名詞,一般,*,*,*,*,テイケイハッタツ,定型発達
  感覚過敏,4786,4786,5000,名詞,一般,*,*,*,*,カンカクカビン,感覚過敏
  ```
- [ ] 品詞タグ処理
  ```python
  class POSAnalyzer:
      def extract_emotion_words(self, tokens: List[Token]) -> List[EmotionWord]:
          emotion_words = []
          for token in tokens:
              if self._is_emotion_word(token):
                  emotion_words.append({
                      'word': token['surface'],
                      'type': self._classify_emotion(token),
                      'intensity': self._calculate_intensity(token)
                  })
          return emotion_words
      
      def _is_emotion_word(self, token: Token) -> bool:
          # 感情を表す品詞パターン
          return (
              token['pos_detail']['major'] in ['形容詞', '形容動詞'] or
              (token['pos_detail']['major'] == '動詞' and 
               token['lemma'] in self.emotion_verbs)
          )
  ```

### Day 61-62: 感情分析実装
- [ ] oseti統合
  ```python
  import oseti
  
  class EmotionAnalyzer:
      def __init__(self):
          self.analyzer = oseti.Analyzer()
          self.emotion_lexicon = self._load_emotion_lexicon()
      
      async def analyze_emotion(
          self, 
          text: str, 
          mode: Literal["ASD", "NT"]
      ) -> EmotionResult:
          # 基本的な感情スコア
          base_scores = self.analyzer.analyze(text)
          
          # カスタム感情分析
          tokens = await self.morphological_analyzer.analyze(text)
          custom_scores = self._custom_emotion_analysis(tokens)
          
          # モード別処理
          if mode == "ASD":
              return self._process_asd_emotion(base_scores, custom_scores)
          else:
              return self._process_nt_emotion(base_scores, custom_scores)
      
      def _process_asd_emotion(self, base_scores, custom_scores):
          # ASD: 内部感情は強く、外部表現は抑制
          internal_intensity = self._calculate_intensity(base_scores, custom_scores)
          external_intensity = internal_intensity * 0.3
          
          return {
              'internal': {
                  'primary': self._get_primary_emotion(base_scores),
                  'intensity': internal_intensity,
                  'raw_scores': base_scores
              },
              'external': {
                  'primary': self._get_primary_emotion(base_scores),
                  'intensity': external_intensity,
                  'expression': self._get_minimal_expression(external_intensity)
              },
              'verbal_label': f"私は{self._get_emotion_label(base_scores)}を感じています"
          }
  ```
- [ ] カスタム感情モデル
  ```python
  class CustomEmotionModel:
      def __init__(self):
          self.emotion_categories = {
              'joy': ['嬉しい', '楽しい', '幸せ', 'わくわく'],
              'sadness': ['悲しい', '辛い', '寂しい', '切ない'],
              'anger': ['怒る', 'イライラ', '腹立たしい', 'むかつく'],
              'fear': ['怖い', '不安', '心配', '恐ろしい'],
              'surprise': ['驚く', 'びっくり', '意外', '予想外'],
              'disgust': ['嫌', '不快', '気持ち悪い', 'うんざり']
          }
      
      def classify_emotion(self, text: str) -> Dict[str, float]:
          scores = {category: 0.0 for category in self.emotion_categories}
          
          for category, keywords in self.emotion_categories.items():
              for keyword in keywords:
                  if keyword in text:
                      scores[category] += 1.0
          
          # 正規化
          total = sum(scores.values())
          if total > 0:
              scores = {k: v/total for k, v in scores.items()}
          
          return scores
  ```
- [ ] ASD/NT別処理
  ```python
  def process_emotion_for_mode(
      self, 
      emotion_data: Dict, 
      mode: str
  ) -> ProcessedEmotion:
      if mode == "ASD":
          # 感情ラベルを明示的に
          return {
              **emotion_data,
              'expression_style': 'explicit',
              'verbal_label': self._generate_explicit_label(emotion_data),
              'expression_intensity': emotion_data['intensity'] * 0.3,
              'processing_note': '内部では強く感じているが、表現は控えめ'
          }
      else:  # NT
          # 自然な感情表現
          return {
              **emotion_data,
              'expression_style': 'natural',
              'nonverbal_cues': self._generate_nonverbal_cues(emotion_data),
              'expression_intensity': emotion_data['intensity'] * 0.8,
              'processing_note': '感情が自然に表現される'
          }
  ```

### Day 63-64: 慣用句検出システム
- [ ] パターンマッチング実装
  ```python
  import json
  from typing import List, Dict, Tuple
  
  class IdiomDetector:
      def __init__(self):
          self.idiom_database = self._load_idiom_database()
          self.pattern_matcher = self._build_pattern_matcher()
      
      def _load_idiom_database(self) -> Dict[str, IdiomInfo]:
          # idioms.jsonから読み込み
          with open('data/idioms.json', 'r', encoding='utf-8') as f:
              data = json.load(f)
          
          return {
              idiom['phrase']: IdiomInfo(**idiom) 
              for idiom in data
          }
      
      def detect_idioms(self, text: str) -> List[DetectedIdiom]:
          detected = []
          
          # 完全一致検索
          for phrase, info in self.idiom_database.items():
              if phrase in text:
                  position = text.index(phrase)
                  detected.append(DetectedIdiom(
                      phrase=phrase,
                      position=position,
                      literal_meaning=info.literal_meaning,
                      actual_meaning=info.actual_meaning,
                      idiom_type=info.idiom_type,
                      confusion_level=info.confusion_level
                  ))
          
          # パターンベース検索
          pattern_matches = self._detect_patterns(text)
          detected.extend(pattern_matches)
          
          return self._remove_duplicates(detected)
  ```
- [ ] 字義通り変換エンジン
  ```python
  class LiteralConverter:
      def __init__(self):
          self.conversion_rules = self._load_conversion_rules()
      
      def convert_to_literal(
          self, 
          text: str, 
          detected_idioms: List[DetectedIdiom]
      ) -> ConversionResult:
          converted_text = text
          conversions = []
          
          # 慣用句を字義通りの意味に置換
          for idiom in sorted(detected_idioms, key=lambda x: x.position, reverse=True):
              original = idiom.phrase
              literal = idiom.literal_meaning
              
              # 文脈を考慮した変換
              if self._should_convert(idiom, text):
                  converted_text = converted_text.replace(original, literal)
                  conversions.append({
                      'original': original,
                      'literal': literal,
                      'reason': f'「{original}」は比喩的表現です',
                      'confidence': idiom.confusion_level
                  })
          
          return ConversionResult(
              original_text=text,
              converted_text=converted_text,
              conversions=conversions,
              explanation=self._generate_explanation(conversions)
          )
  ```
- [ ] データベース構築
  ```python
  # データ構造の定義
  class IdiomDatabase:
      def __init__(self):
          self.idioms = []
          self.categories = {
              'time': ['時間が飛ぶ', '時間を潰す', '時は金なり'],
              'emotion': ['頭が真っ白', '胸が締め付けられる', '目から鱗'],
              'action': ['手を打つ', '腰を据える', '首を突っ込む'],
              'state': ['水を得た魚', '猫の手も借りたい', '目と鼻の先']
          }
      
      def build_database(self):
          # 1000+エントリの慣用句データベース構築
          idiom_data = [
              {
                  'phrase': '時間が飛ぶ',
                  'reading': 'じかんがとぶ',
                  'literal_meaning': '時間が空中を移動する',
                  'actual_meaning': '時間が早く過ぎる',
                  'category': 'time',
                  'idiom_type': 'metaphor',
                  'usage_frequency': 0.8,
                  'confusion_level': 0.9,  # ASDの人が混乱する可能性
                  'examples': [
                      '楽しい時間が飛ぶように過ぎた',
                      '仕事に集中していたら時間が飛んだ'
                  ]
              },
              # ... 他の慣用句
          ]
          
          self._save_to_file(idiom_data)
  ```

### Day 65-66: API統合とテスト
- [ ] エンドポイント実装
  ```python
  @router.post("/nlp/analyze", response_model=NLPAnalysisResponse)
  async def analyze_text(request: NLPAnalysisRequest):
      # 形態素解析
      tokens = morphological_analyzer.analyze(request.text)
      
      # 慣用句検出
      idioms = idiom_detector.detect_idioms(request.text)
      
      # 感情分析
      emotion = await emotion_analyzer.analyze_emotion(
          request.text, 
          request.mode
      )
      
      # モード別処理
      if request.mode == "ASD":
          # 字義通り変換
          literal_conversion = literal_converter.convert_to_literal(
              request.text, 
              idioms
          )
          
          return NLPAnalysisResponse(
              tokens=tokens,
              idioms=idioms,
              emotion=emotion,
              literal_interpretation=literal_conversion,
              processing_notes="字義通りの解釈を適用しました"
          )
      else:
          # 文脈理解
          contextual_understanding = context_analyzer.analyze(
              request.text,
              request.context
          )
          
          return NLPAnalysisResponse(
              tokens=tokens,
              idioms=idioms,
              emotion=emotion,
              contextual_interpretation=contextual_understanding,
              processing_notes="文脈を考慮した解釈を適用しました"
          )
  ```
- [ ] 統合テスト作成
  ```python
  import pytest
  from httpx import AsyncClient
  
  @pytest.mark.asyncio
  async def test_emotion_analysis_asd_mode():
      async with AsyncClient(app=app, base_url="http://test") as client:
          response = await client.post(
              "/api/v1/emotion/analyze",
              json={
                  "text": "今日はとても楽しかったです",
                  "mode": "ASD"
              }
          )
          
          assert response.status_code == 200
          data = response.json()
          
          # ASDモード: 外部表現は内部感情の30%
          assert data["internal_emotion"]["intensity"] > 0.7
          assert data["external_expression"]["intensity"] < 0.3
          assert "verbal_label" in data["external_expression"]
  
  @pytest.mark.asyncio
  async def test_idiom_detection():
      async with AsyncClient(app=app, base_url="http://test") as client:
          response = await client.post(
              "/api/v1/nlp/parse",
              json={
                  "text": "時間が飛ぶように過ぎました",
                  "analyze_options": {
                      "detect_idioms": True
                  }
              }
          )
          
          assert response.status_code == 200
          data = response.json()
          
          assert len(data["idioms"]) > 0
          assert data["idioms"][0]["phrase"] == "時間が飛ぶ"
          assert data["idioms"][0]["literal_meaning"] == "時間が空中を移動する"
  ```
- [ ] パフォーマンステスト
  ```python
  import asyncio
  import time
  from typing import List
  
  async def performance_test():
      test_sentences = [
          "今日は楽しかったです",
          "時間が飛ぶように過ぎました",
          "頭が真っ白になってしまいました"
      ] * 100  # 300リクエスト
      
      async with AsyncClient(app=app, base_url="http://test") as client:
          start_time = time.time()
          
          tasks = [
              client.post("/api/v1/nlp/parse", json={"text": text})
              for text in test_sentences
          ]
          
          responses = await asyncio.gather(*tasks)
          
          end_time = time.time()
          
          # 結果の検証
          success_count = sum(1 for r in responses if r.status_code == 200)
          avg_time = (end_time - start_time) / len(test_sentences)
          
          print(f"成功率: {success_count/len(test_sentences)*100:.2f}%")
          print(f"平均処理時間: {avg_time*1000:.2f}ms")
          
          assert success_count == len(test_sentences)
          assert avg_time < 0.5  # 500ms以下
  ```

### Day 67-68: ドキュメント作成
- [ ] API仕様書自動生成
  ```python
  # FastAPIの自動ドキュメント機能を活用
  app = FastAPI(
      title="ASD-AITuber NLP API",
      description="""
      ## 概要
      ASD/NT模倣AITuberシステムの日本語NLP処理APIです。
      
      ## 主な機能
      - 日本語形態素解析（SudachiPy）
      - 感情分析（oseti + カスタムモデル）
      - 慣用句検出と字義通り変換
      - ASD/NTモード別処理
      """,
      version="0.1.0",
      contact={
          "name": "開発チーム",
          "email": "dev@asd-aituber.example.com"
      }
  )
  ```
- [ ] 使用例ドキュメント
  ```markdown
  # NLP API使用ガイド
  
  ## 基本的な使い方
  
  ### 感情分析
  ```bash
  curl -X POST "http://localhost:8000/api/v1/emotion/analyze" \
       -H "Content-Type: application/json" \
       -d '{
         "text": "今日はとても楽しかったです",
         "mode": "ASD"
       }'
  ```
  
  ### 慣用句検出
  ```bash
  curl -X POST "http://localhost:8000/api/v1/nlp/parse" \
       -H "Content-Type: application/json" \
       -d '{
         "text": "時間が飛ぶように過ぎました",
         "analyze_options": {
           "detect_idioms": true,
           "morphological": true
         }
       }'
  ```
  ```
- [ ] トラブルシューティングガイド
  - [ ] よくあるエラーと対処法
  - [ ] パフォーマンスチューニング
  - [ ] デバッグ方法

### Day 69-70: 最適化と仕上げ
- [ ] キャッシング実装
  ```python
  from functools import lru_cache
  import hashlib
  
  class CachedAnalyzer:
      def __init__(self):
          self.cache_size = 10000
      
      @lru_cache(maxsize=10000)
      def _get_cached_analysis(self, text_hash: str, mode: str):
          # キャッシュされた結果を返す
          pass
      
      async def analyze_with_cache(self, text: str, mode: str):
          # テキストのハッシュ値を計算
          text_hash = hashlib.md5(text.encode()).hexdigest()
          
          # キャッシュチェック
          cached = self._get_cached_analysis(text_hash, mode)
          if cached:
              return cached
          
          # 新規分析
          result = await self.analyze(text, mode)
          
          # キャッシュに保存
          self._cache_result(text_hash, mode, result)
          
          return result
  ```
- [ ] バッチ処理最適化
  ```python
  async def batch_analyze(texts: List[str], mode: str):
      # 並列処理で高速化
      tasks = [
          analyze_single(text, mode) 
          for text in texts
      ]
      
      results = await asyncio.gather(*tasks)
      
      return results
  ```
- [ ] メモリ使用量最適化
  - [ ] 大規模辞書の遅延読み込み
  - [ ] 不要なオブジェクトの削除
  - [ ] ガベージコレクション調整

## 成果物チェックリスト

### 必須成果物
- [ ] ASD/NTモード切り替え機能
- [ ] モード別の会話処理ロジック
- [ ] Python NLP API（形態素解析、感情分析、慣用句検出）
- [ ] TypeScript⇔Python API連携
- [ ] 字義通り解釈システム

### API仕様
- [ ] `/api/v1/emotion/analyze` - 感情分析
- [ ] `/api/v1/nlp/parse` - 形態素解析
- [ ] `/api/v1/nlp/convert-literal` - 字義通り変換
- [ ] `/api/v1/pcm/process` - PCM処理（基盤のみ）

### パフォーマンス目標
- [ ] API応答時間 < 500ms（95パーセンタイル）
- [ ] 慣用句検出精度 > 80%
- [ ] 感情分析精度 > 75%
- [ ] 同時リクエスト処理: 50req/s

## リスクと対策

| リスク | 対策 |
|--------|------|
| 日本語処理の精度不足 | 継続的なデータ収集とモデル改善 |
| API応答の遅延 | キャッシング、非同期処理、最適化 |
| 慣用句データベースの不完全性 | ユーザーフィードバックによる拡充 |
| モード切り替えの不自然さ | 段階的な遷移、説明の充実 |

## 次のフェーズへの準備

Phase 4（AI統合）に向けて：
- [ ] LLMプロンプトテンプレートの設計
- [ ] シナリオデータ構造の確定
- [ ] 学習システムの設計
- [ ] NLP APIとLLMの連携設計