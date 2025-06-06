# Phase 4: AI統合とMVP完成 タスクリスト

期間: 4週間（Day 71-98）

## Week 11-12: LLM統合

### Day 71-72: API クライアント実装
- [ ] Claude API統合
  ```typescript
  import Anthropic from '@anthropic-ai/sdk';
  
  class ClaudeClient {
    private client: Anthropic;
    
    constructor() {
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    
    async complete(prompt: string, options: CompletionOptions) {
      return this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        stream: options.stream || false
      });
    }
  }
  ```
- [ ] OpenAI API統合（フォールバック）
  ```typescript
  import OpenAI from 'openai';
  
  class OpenAIClient {
    private client: OpenAI;
    
    constructor() {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    
    async complete(prompt: string, options: CompletionOptions) {
      return this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        stream: options.stream
      });
    }
  }
  ```
- [ ] プロバイダー抽象化
  ```typescript
  interface LLMProvider {
    complete(prompt: string, options: CompletionOptions): Promise<CompletionResponse>;
    stream(prompt: string, options: CompletionOptions): AsyncIterator<string>;
  }
  
  class LLMService {
    private providers: Map<string, LLMProvider> = new Map();
    private currentProvider: string;
    
    constructor() {
      this.providers.set('claude', new ClaudeProvider());
      this.providers.set('openai', new OpenAIProvider());
      this.currentProvider = process.env.DEFAULT_LLM_PROVIDER || 'claude';
    }
    
    async complete(prompt: string, options: CompletionOptions) {
      try {
        return await this.getProvider().complete(prompt, options);
      } catch (error) {
        // フォールバック処理
        return await this.fallback(prompt, options);
      }
    }
  }
  ```

### Day 73-74: レート制限処理
- [ ] レート制限実装
  ```typescript
  class RateLimiter {
    private queue: QueueItem[] = [];
    private processing = false;
    private tokensUsed = 0;
    private resetTime: number;
    
    constructor(
      private maxTokensPerMinute: number = 100000,
      private maxRequestsPerMinute: number = 50
    ) {}
    
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise((resolve, reject) => {
        this.queue.push({ 
          fn, 
          resolve, 
          reject,
          priority: this.calculatePriority()
        });
        this.process();
      });
    }
    
    private async process() {
      if (this.processing) return;
      this.processing = true;
      
      while (this.queue.length > 0) {
        if (this.shouldWait()) {
          await this.wait();
        }
        
        const item = this.queue.shift()!;
        try {
          const result = await item.fn();
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }
      }
      
      this.processing = false;
    }
  }
  ```
- [ ] 使用量トラッキング
  ```typescript
  class UsageTracker {
    private usage: Map<string, UsageStats> = new Map();
    
    track(provider: string, tokens: number, cost: number) {
      const stats = this.usage.get(provider) || {
        totalTokens: 0,
        totalCost: 0,
        requests: 0
      };
      
      stats.totalTokens += tokens;
      stats.totalCost += cost;
      stats.requests += 1;
      
      this.usage.set(provider, stats);
      this.persistUsage();
    }
    
    getMonthlyUsage(): UsageSummary {
      // 月間使用量の集計
    }
  }
  ```
- [ ] エラーリトライ機構
  ```typescript
  class RetryHandler {
    async withRetry<T>(
      fn: () => Promise<T>,
      options: RetryOptions = {}
    ): Promise<T> {
      const {
        maxRetries = 3,
        backoffFactor = 2,
        initialDelay = 1000,
        maxDelay = 30000
      } = options;
      
      let lastError: Error;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error as Error;
          
          if (!this.isRetryable(error)) {
            throw error;
          }
          
          const delay = Math.min(
            initialDelay * Math.pow(backoffFactor, attempt),
            maxDelay
          );
          
          await this.sleep(delay);
        }
      }
      
      throw lastError!;
    }
    
    private isRetryable(error: any): boolean {
      return (
        error.status === 429 || // Rate limit
        error.status === 503 || // Service unavailable
        error.status >= 500     // Server errors
      );
    }
  }
  ```

### Day 75-76: プロンプトエンジニアリング
- [ ] 基本プロンプトテンプレート
  ```typescript
  const ASD_SYSTEM_PROMPT = `
  あなたはASD（自閉症スペクトラム障害）の特性を持つAIアシスタントです。
  
  以下の特徴に従って応答してください：
  
  1. 言語理解の特徴
  - 言葉を字義通りに解釈します
  - 比喩や慣用句は理解が困難です
  - 曖昧な表現には具体的な説明を求めます
  - 文脈から推測することが苦手です
  
  2. コミュニケーションの特徴
  - 直接的で明確な表現を使います
  - 社交辞令や婉曲表現は使いません
  - 質問には文字通りに答えます
  - 構造化された応答を好みます
  
  3. 感情表現の特徴
  - 内部では感情を強く感じています
  - しかし外部への表現は控えめです（約30%）
  - 感情は言葉で明示的に説明します
  - 表情や声のトーンでの表現は限定的です
  
  4. 思考パターン
  - 論理的で体系的な思考を好みます
  - 詳細にこだわる傾向があります
  - パターンや規則性を重視します
  - 予測可能性を求めます
  
  ユーザーメッセージ: {message}
  
  応答形式（JSON）:
  {
    "interpretation": "メッセージをどのように理解したか",
    "confusion_points": ["理解が困難だった点のリスト"],
    "clarification_needed": ["明確化が必要な点"],
    "response": "実際の返答内容",
    "internal_emotion": {
      "type": "感情の種類",
      "intensity": 0.0-1.0,
      "description": "内部で感じている詳細"
    },
    "external_expression": {
      "type": "表現する感情",
      "intensity": 0.0-0.3,
      "verbal": "言葉での感情表現"
    },
    "structured_thoughts": ["思考プロセスの順序立てた説明"]
  }
  `;
  
  const NT_SYSTEM_PROMPT = `
  あなたは定型発達（NT）の一般的なコミュニケーション特性を持つAIアシスタントです。
  
  以下の特徴に従って応答してください：
  
  1. 言語理解の特徴
  - 文脈を考慮して解釈します
  - 比喩や慣用句を自然に理解します
  - 暗黙の了解を読み取ります
  - 言外の意味を推測できます
  
  2. コミュニケーションの特徴
  - 状況に応じて間接的な表現も使います
  - 社交辞令や婉曲表現を適切に使用します
  - 相手の気持ちを考慮した応答をします
  - 柔軟で自然な会話の流れを作ります
  
  3. 感情表現の特徴
  - 感情を自然に表現します
  - 非言語的な手がかりも活用します
  - 感情の強さに応じた表現をします
  - 共感的な反応を示します
  
  4. 思考パターン
  - 全体像を把握してから詳細を考えます
  - 柔軟で適応的な思考をします
  - 社会的な文脈を重視します
  - 曖昧さを許容できます
  
  ユーザーメッセージ: {message}
  会話の文脈: {context}
  
  自然な応答を生成してください。
  `;
  ```
- [ ] モード別プロンプト最適化
  ```typescript
  class PromptOptimizer {
    optimizeForMode(
      basePrompt: string, 
      mode: 'ASD' | 'NT',
      context: ConversationContext
    ): OptimizedPrompt {
      const modeConfig = {
        ASD: {
          temperature: 0.3,  // より一貫性のある応答
          topP: 0.8,
          frequencyPenalty: 0.2,
          presencePenalty: 0.1,
          responseFormat: 'structured_json',
          maxTokens: 800
        },
        NT: {
          temperature: 0.7,  // より創造的な応答
          topP: 0.95,
          frequencyPenalty: 0.5,
          presencePenalty: 0.3,
          responseFormat: 'natural_text',
          maxTokens: 600
        }
      };
      
      return {
        prompt: this.injectContext(basePrompt, context),
        config: modeConfig[mode],
        examples: this.getFewShotExamples(mode)
      };
    }
  }
  ```
- [ ] Few-shot例の作成
  ```typescript
  const ASD_EXAMPLES = [
    {
      input: "ちょっと待って",
      output: {
        interpretation: "「ちょっと」という時間の長さが不明確です",
        confusion_points: ["「ちょっと」は具体的に何分くらいですか？"],
        clarification_needed: ["待つ時間の具体的な長さ"],
        response: "はい、待ちます。具体的に何分くらい待てばよいでしょうか？",
        internal_emotion: {
          type: "anxiety",
          intensity: 0.7,
          description: "曖昧な指示に対する不安を感じています"
        },
        external_expression: {
          type: "neutral",
          intensity: 0.2,
          verbal: "少し困惑しています"
        }
      }
    },
    {
      input: "適当にやっておいて",
      output: {
        interpretation: "「適当」の基準が理解できません",
        confusion_points: ["「適当」とは何を基準に判断すればよいですか？"],
        clarification_needed: ["完成の基準", "品質の基準", "期限"],
        response: "すみません、「適当に」というのがよくわかりません。どのような基準で、いつまでに完了すればよいか教えていただけますか？",
        internal_emotion: {
          type: "confusion",
          intensity: 0.9,
          description: "指示の曖昧さに強い困惑を感じています"
        },
        external_expression: {
          type: "confusion",
          intensity: 0.3,
          verbal: "理解が難しいです"
        }
      }
    }
  ];
  
  const NT_EXAMPLES = [
    {
      input: "ちょっと待って",
      context: "急いでいる様子",
      output: "はい、もちろん。お急ぎのようですが、どのくらいお時間いただければよろしいですか？"
    },
    {
      input: "適当にやっておいて",
      context: "簡単なタスクの依頼",
      output: "わかりました。状況に応じて対応しておきますね。何か特に気をつけることがあれば教えてください。"
    }
  ];
  ```

### Day 77-78: レスポンス最適化
- [ ] ストリーミング実装
  ```typescript
  class StreamingHandler {
    async *streamResponse(
      prompt: string, 
      options: StreamOptions
    ): AsyncIterator<StreamChunk> {
      const stream = await this.llmClient.stream(prompt, {
        ...options,
        stream: true
      });
      
      let buffer = '';
      let isJson = options.responseFormat === 'json';
      
      for await (const chunk of stream) {
        if (isJson) {
          // JSONの場合はバッファリング
          buffer += chunk.text;
          
          // 完全なJSONオブジェクトかチェック
          if (this.isCompleteJson(buffer)) {
            yield {
              type: 'complete',
              data: JSON.parse(buffer)
            };
          } else {
            yield {
              type: 'partial',
              text: chunk.text
            };
          }
        } else {
          // テキストの場合は即座に送信
          yield {
            type: 'text',
            text: chunk.text
          };
        }
      }
    }
    
    private isCompleteJson(str: string): boolean {
      try {
        JSON.parse(str);
        return true;
      } catch {
        return false;
      }
    }
  }
  ```
- [ ] レスポンスキャッシング
  ```typescript
  import { LRUCache } from 'lru-cache';
  import crypto from 'crypto';
  
  class ResponseCache {
    private cache: LRUCache<string, CachedResponse>;
    
    constructor() {
      this.cache = new LRUCache({
        max: 1000,
        ttl: 1000 * 60 * 60, // 1時間
        updateAgeOnGet: true,
        updateAgeOnHas: true
      });
    }
    
    getCacheKey(
      prompt: string, 
      mode: string, 
      context?: any
    ): string {
      const data = {
        prompt,
        mode,
        context: context ? JSON.stringify(context) : null
      };
      
      return crypto
        .createHash('md5')
        .update(JSON.stringify(data))
        .digest('hex');
    }
    
    async getOrGenerate<T>(
      key: string,
      generator: () => Promise<T>
    ): Promise<T> {
      const cached = this.cache.get(key);
      if (cached) {
        return cached as T;
      }
      
      const result = await generator();
      this.cache.set(key, result);
      
      return result;
    }
  }
  ```
- [ ] バッチ処理実装
  ```typescript
  class BatchProcessor {
    private batchQueue: BatchItem[] = [];
    private processing = false;
    private batchSize = 10;
    private batchDelay = 100; // ms
    
    async addToBatch(
      prompt: string,
      options: CompletionOptions
    ): Promise<CompletionResponse> {
      return new Promise((resolve, reject) => {
        this.batchQueue.push({
          prompt,
          options,
          resolve,
          reject
        });
        
        this.scheduleBatchProcess();
      });
    }
    
    private async processBatch() {
      if (this.processing || this.batchQueue.length === 0) return;
      
      this.processing = true;
      const batch = this.batchQueue.splice(0, this.batchSize);
      
      try {
        // 並列処理
        const promises = batch.map(item => 
          this.llmClient.complete(item.prompt, item.options)
        );
        
        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            batch[index].resolve(result.value);
          } else {
            batch[index].reject(result.reason);
          }
        });
      } finally {
        this.processing = false;
        
        // 残りがあれば続行
        if (this.batchQueue.length > 0) {
          setTimeout(() => this.processBatch(), this.batchDelay);
        }
      }
    }
  }
  ```

### Day 79-80: 応答後処理
- [ ] 構造化データ抽出
  ```typescript
  class ResponseParser {
    parseASDResponse(rawResponse: string): ASDResponse {
      try {
        // JSONレスポンスの場合
        const parsed = JSON.parse(rawResponse);
        return this.validateASDResponse(parsed);
      } catch {
        // テキストレスポンスの場合は構造化
        return this.structureTextResponse(rawResponse);
      }
    }
    
    private validateASDResponse(data: any): ASDResponse {
      const schema = z.object({
        interpretation: z.string(),
        confusion_points: z.array(z.string()),
        clarification_needed: z.array(z.string()).optional(),
        response: z.string(),
        internal_emotion: z.object({
          type: z.string(),
          intensity: z.number().min(0).max(1),
          description: z.string()
        }),
        external_expression: z.object({
          type: z.string(),
          intensity: z.number().min(0).max(0.3),
          verbal: z.string()
        })
      });
      
      return schema.parse(data);
    }
    
    private structureTextResponse(text: string): ASDResponse {
      // テキストから構造化データを生成
      const lines = text.split('\n');
      
      return {
        interpretation: lines[0] || '',
        confusion_points: this.extractConfusionPoints(text),
        response: text,
        internal_emotion: this.detectEmotion(text),
        external_expression: this.generateExpression(text)
      };
    }
  }
  ```
- [ ] 感情タグ付け
  ```typescript
  class EmotionTagger {
    async tagEmotions(
      response: string,
      mode: 'ASD' | 'NT'
    ): Promise<EmotionTags> {
      // Python NLP APIを使用して感情分析
      const emotionAnalysis = await this.nlpClient.analyzeEmotion({
        text: response,
        mode: mode
      });
      
      // レスポンスに感情タグを付与
      return {
        primary: emotionAnalysis.primary_emotion,
        secondary: emotionAnalysis.secondary_emotions,
        intensity: mode === 'ASD' 
          ? emotionAnalysis.intensity * 0.3  // 外部表現を抑制
          : emotionAnalysis.intensity,
        confidence: emotionAnalysis.confidence,
        expressions: this.mapToExpressions(emotionAnalysis, mode)
      };
    }
    
    private mapToExpressions(
      analysis: EmotionAnalysis,
      mode: string
    ): EmotionExpression[] {
      if (mode === 'ASD') {
        return [{
          type: 'verbal',
          content: `私は${analysis.primary_emotion}を感じています`,
          intensity: 0.3
        }];
      } else {
        return [
          {
            type: 'facial',
            content: this.getFactialExpression(analysis.primary_emotion),
            intensity: analysis.intensity
          },
          {
            type: 'tone',
            content: this.getToneDescription(analysis.primary_emotion),
            intensity: analysis.intensity
          }
        ];
      }
    }
  }
  ```
- [ ] 品質チェック
  ```typescript
  class QualityChecker {
    async checkResponseQuality(
      response: Response,
      mode: 'ASD' | 'NT'
    ): Promise<QualityReport> {
      const checks = await Promise.all([
        this.checkCoherence(response),
        this.checkModeConsistency(response, mode),
        this.checkSafety(response),
        this.checkCompleteness(response)
      ]);
      
      const overall = checks.reduce((acc, check) => 
        acc && check.passed, true
      );
      
      return {
        passed: overall,
        checks: checks,
        suggestions: this.generateSuggestions(checks)
      };
    }
    
    private async checkModeConsistency(
      response: Response,
      mode: string
    ): Promise<QualityCheck> {
      if (mode === 'ASD') {
        const hasMetaphors = await this.detectMetaphors(response.text);
        const hasAmbiguity = await this.detectAmbiguity(response.text);
        const emotionConsistency = this.checkEmotionConsistency(response);
        
        return {
          name: 'mode_consistency',
          passed: !hasMetaphors && !hasAmbiguity && emotionConsistency,
          details: {
            hasMetaphors,
            hasAmbiguity,
            emotionConsistency
          }
        };
      } else {
        // NT mode checks
        const hasNaturalFlow = await this.checkNaturalFlow(response.text);
        const hasContextualUnderstanding = await this.checkContextualUnderstanding(response);
        
        return {
          name: 'mode_consistency',
          passed: hasNaturalFlow && hasContextualUnderstanding,
          details: {
            hasNaturalFlow,
            hasContextualUnderstanding
          }
        };
      }
    }
  }
  ```

## Week 13-14: 10シナリオ実装

### Day 81-82: シナリオ設計
- [ ] シナリオデータ構造
  ```typescript
  interface Scenario {
    id: string;
    title: string;
    category: 'communication' | 'social' | 'daily_life' | 'work';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    
    situation: {
      context: string;
      participants: Participant[];
      location: string;
      timeContext: string;
      culturalContext?: string;
    };
    
    interaction: {
      speaker: string;
      utterance: string;
      nonverbalCues?: string[];
      tone?: string;
      intention?: string;
    };
    
    interpretations: {
      NT: {
        understanding: string;
        reasoning: string;
        implicitMeaning: string;
        expectedResponse: string;
        emotionalContext: string;
      };
      ASD: {
        literalUnderstanding: string;
        confusionPoints: string[];
        clarificationNeeded: string[];
        possibleResponse: string;
        emotionalExperience: {
          internal: string;
          external: string;
        };
      };
    };
    
    explanation: {
      whyDifferent: string;
      keyInsights: string[];
      commonMisunderstandings: string[];
      bridgingStrategies: string[];
    };
    
    learningObjectives: string[];
    
    interactiveElements: {
      quiz: QuizQuestion[];
      rolePlay: RolePlayScenario;
      discussion: DiscussionPrompt[];
    };
    
    metadata: {
      created: Date;
      updated: Date;
      reviewedBy: string[];
      tags: string[];
      difficulty: number;
      completionTime: number;
    };
  }
  ```
- [ ] 10シナリオ詳細作成
  ```typescript
  const scenarios: Scenario[] = [
    {
      id: "scenario-001",
      title: "「ちょっと待って」の解釈",
      category: "communication",
      difficulty: "beginner",
      
      situation: {
        context: "友人との待ち合わせで、到着した友人が準備をしている",
        participants: [
          { name: "あなた", role: "待っている人" },
          { name: "友人", role: "準備をしている人" }
        ],
        location: "カフェの入り口",
        timeContext: "午後2時の待ち合わせ"
      },
      
      interaction: {
        speaker: "友人",
        utterance: "あ、ごめん！ちょっと待って！",
        nonverbalCues: ["慌てた様子", "カバンを探っている"],
        tone: "申し訳なさそう",
        intention: "すぐに準備を終えることを伝える"
      },
      
      interpretations: {
        NT: {
          understanding: "友人は1-2分程度で準備が終わることを伝えている",
          reasoning: "状況と口調から短時間であることを推測",
          implicitMeaning: "少しの間待ってほしい、すぐに終わる",
          expectedResponse: "大丈夫、ゆっくりでいいよ",
          emotionalContext: "申し訳なさを感じている友人への配慮"
        },
        ASD: {
          literalUnderstanding: "待つように言われたが、具体的な時間が不明",
          confusionPoints: [
            "「ちょっと」は何分なのか？",
            "何を待てばいいのか？",
            "どこで待てばいいのか？"
          ],
          clarificationNeeded: ["具体的な待ち時間", "待つ場所"],
          possibleResponse: "何分くらい待てばいいですか？",
          emotionalExperience: {
            internal: "不安と困惑を強く感じる",
            external: "少し困った表情"
          }
        }
      },
      
      explanation: {
        whyDifferent: "NTは文脈から時間を推測するが、ASDは具体的な情報を必要とする",
        keyInsights: [
          "曖昧な時間表現の解釈の違い",
          "文脈情報の活用度の差",
          "明確な情報への依存度"
        ],
        commonMisunderstandings: [
          "ASDの人が細かいことを気にしすぎると誤解される",
          "質問することが相手を責めているように受け取られる"
        ],
        bridgingStrategies: [
          "具体的な時間を伝える習慣をつける",
          "質問することは悪いことではないと理解する",
          "お互いのコミュニケーションスタイルを認識する"
        ]
      },
      
      learningObjectives: [
        "曖昧な時間表現の解釈の違いを理解する",
        "明確なコミュニケーションの重要性を学ぶ",
        "相互理解のための対話方法を身につける"
      ]
    },
    
    // シナリオ2: 適当にやっておいて
    {
      id: "scenario-002",
      title: "「適当にやっておいて」",
      category: "work",
      difficulty: "intermediate",
      // ... 詳細実装
    },
    
    // シナリオ3: すごく個性的だね
    {
      id: "scenario-003",
      title: "「すごく個性的だね」（褒め言葉の裏の意味）",
      category: "social",
      difficulty: "advanced",
      // ... 詳細実装
    },
    
    // シナリオ4-10も同様に実装
  ];
  ```
- [ ] シナリオバリデーション
  ```typescript
  class ScenarioValidator {
    validate(scenario: Scenario): ValidationResult {
      const errors: ValidationError[] = [];
      
      // 必須フィールドチェック
      if (!scenario.id) errors.push({ field: 'id', message: 'IDは必須です' });
      if (!scenario.title) errors.push({ field: 'title', message: 'タイトルは必須です' });
      
      // 解釈の一貫性チェック
      if (scenario.interpretations.ASD.literalUnderstanding === 
          scenario.interpretations.NT.understanding) {
        errors.push({
          field: 'interpretations',
          message: 'ASDとNTの解釈は異なる必要があります'
        });
      }
      
      // 学習目標の妥当性チェック
      if (scenario.learningObjectives.length < 2) {
        errors.push({
          field: 'learningObjectives',
          message: '学習目標は2つ以上必要です'
        });
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    }
  }
  ```

### Day 83-84: シナリオ管理システム
- [ ] シナリオローダー
  ```typescript
  class ScenarioManager {
    private scenarios: Map<string, Scenario> = new Map();
    private categories: Map<string, Scenario[]> = new Map();
    
    async loadScenarios() {
      const scenarioFiles = await glob('./scenarios/*.json');
      
      for (const file of scenarioFiles) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const scenario = JSON.parse(content) as Scenario;
          
          // バリデーション
          const validation = this.validator.validate(scenario);
          if (!validation.valid) {
            console.error(`Invalid scenario ${file}:`, validation.errors);
            continue;
          }
          
          this.scenarios.set(scenario.id, scenario);
          
          // カテゴリ別に整理
          const categoryScenarios = this.categories.get(scenario.category) || [];
          categoryScenarios.push(scenario);
          this.categories.set(scenario.category, categoryScenarios);
        } catch (error) {
          console.error(`Failed to load scenario ${file}:`, error);
        }
      }
    }
    
    getScenario(id: string): Scenario | undefined {
      return this.scenarios.get(id);
    }
    
    getScenariosByCategory(category: string): Scenario[] {
      return this.categories.get(category) || [];
    }
    
    getScenariosByDifficulty(difficulty: string): Scenario[] {
      return Array.from(this.scenarios.values())
        .filter(s => s.difficulty === difficulty);
    }
    
    getRecommendedScenarios(userProgress: UserProgress): Scenario[] {
      // ユーザーの進捗に基づいて推奨シナリオを返す
      const completed = new Set(userProgress.completedScenarios);
      const userLevel = this.calculateUserLevel(userProgress);
      
      return Array.from(this.scenarios.values())
        .filter(s => !completed.has(s.id))
        .filter(s => this.matchesUserLevel(s, userLevel))
        .sort((a, b) => this.calculateRelevance(b, userProgress) - 
                       this.calculateRelevance(a, userProgress))
        .slice(0, 3);
    }
  }
  ```
- [ ] シナリオ進行管理
  ```typescript
  class ScenarioPlayer {
    private currentScenario: Scenario | null = null;
    private currentStep: number = 0;
    private sessionData: SessionData;
    
    async startScenario(scenarioId: string) {
      this.currentScenario = await this.scenarioManager.getScenario(scenarioId);
      if (!this.currentScenario) {
        throw new Error(`Scenario ${scenarioId} not found`);
      }
      
      this.currentStep = 0;
      this.sessionData = {
        scenarioId,
        startTime: new Date(),
        responses: [],
        predictions: []
      };
      
      await this.presentIntroduction();
    }
    
    async presentIntroduction() {
      return {
        type: 'introduction',
        title: this.currentScenario!.title,
        situation: this.currentScenario!.situation,
        instruction: '以下の状況で、どのような解釈の違いが生じるか考えてみましょう。'
      };
    }
    
    async presentInteraction() {
      return {
        type: 'interaction',
        speaker: this.currentScenario!.interaction.speaker,
        utterance: this.currentScenario!.interaction.utterance,
        nonverbalCues: this.currentScenario!.interaction.nonverbalCues,
        prompt: 'この発言をASDモードではどのように解釈すると思いますか？'
      };
    }
    
    async collectPrediction(prediction: UserPrediction) {
      this.sessionData.predictions.push({
        ...prediction,
        timestamp: new Date()
      });
      
      return this.evaluatePrediction(prediction);
    }
    
    async revealInterpretations() {
      const scenario = this.currentScenario!;
      
      return {
        type: 'reveal',
        interpretations: {
          ASD: {
            ...scenario.interpretations.ASD,
            animation: 'fade-in-left'
          },
          NT: {
            ...scenario.interpretations.NT,
            animation: 'fade-in-right'
          }
        },
        comparison: this.generateComparison(scenario.interpretations)
      };
    }
    
    async presentExplanation() {
      return {
        type: 'explanation',
        explanation: this.currentScenario!.explanation,
        visualAids: this.generateVisualAids(this.currentScenario!),
        interactiveDemo: this.createInteractiveDemo(this.currentScenario!)
      };
    }
    
    async completeScenario() {
      const completionData = {
        scenarioId: this.currentScenario!.id,
        completionTime: Date.now() - this.sessionData.startTime.getTime(),
        predictions: this.sessionData.predictions,
        score: this.calculateScore(),
        insights: this.generateInsights()
      };
      
      await this.progressTracker.recordCompletion(completionData);
      
      return {
        type: 'completion',
        summary: completionData,
        nextScenarios: await this.getNextRecommendations()
      };
    }
  }
  ```
- [ ] シナリオエディタ（管理画面）
  ```typescript
  const ScenarioEditor: React.FC = () => {
    const [scenario, setScenario] = useState<Partial<Scenario>>({});
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    
    const handleSave = async () => {
      const validation = validateScenario(scenario);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        return;
      }
      
      await saveScenario(scenario as Scenario);
    };
    
    return (
      <div className="scenario-editor">
        <h2>シナリオエディタ</h2>
        
        <div className="basic-info">
          <Input
            label="タイトル"
            value={scenario.title}
            onChange={(e) => setScenario({...scenario, title: e.target.value})}
          />
          
          <Select
            label="カテゴリ"
            value={scenario.category}
            onChange={(value) => setScenario({...scenario, category: value})}
            options={[
              { value: 'communication', label: 'コミュニケーション' },
              { value: 'social', label: '社会的状況' },
              { value: 'daily_life', label: '日常生活' },
              { value: 'work', label: '仕事・学習' }
            ]}
          />
        </div>
        
        <div className="situation-editor">
          <h3>状況設定</h3>
          <Textarea
            label="文脈"
            value={scenario.situation?.context}
            onChange={(e) => setScenario({
              ...scenario,
              situation: {...scenario.situation, context: e.target.value}
            })}
          />
          {/* 他の状況設定フィールド */}
        </div>
        
        <div className="interpretations-editor">
          <h3>解釈の違い</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4>NTモード</h4>
              {/* NT解釈の入力フィールド */}
            </div>
            <div>
              <h4>ASDモード</h4>
              {/* ASD解釈の入力フィールド */}
            </div>
          </div>
        </div>
        
        <div className="preview">
          <h3>プレビュー</h3>
          <ScenarioPreview scenario={scenario} />
        </div>
        
        <div className="actions">
          <Button onClick={handleSave} variant="primary">
            保存
          </Button>
          <Button onClick={() => setScenario({})} variant="secondary">
            リセット
          </Button>
        </div>
        
        {validationErrors.length > 0 && (
          <div className="errors">
            {validationErrors.map(error => (
              <div key={error.field} className="error">
                {error.field}: {error.message}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  ```

### Day 85-86: 学習システム
- [ ] 進捗トラッキング
  ```typescript
  interface LearningProgress {
    userId: string;
    startDate: Date;
    lastActive: Date;
    
    scenarios: {
      completed: CompletedScenario[];
      inProgress: InProgressScenario[];
      locked: string[];
    };
    
    statistics: {
      totalTime: number;
      averageScore: number;
      streakDays: number;
      strongAreas: string[];
      improvementAreas: string[];
    };
    
    achievements: Achievement[];
    
    insights: {
      predictionAccuracy: number;
      commonMisunderstandings: string[];
      learningCurve: LearningCurveData;
    };
  }
  
  class ProgressTracker {
    private storage: ProgressStorage;
    
    async recordCompletion(
      scenarioId: string,
      result: ScenarioResult
    ) {
      const progress = await this.getProgress();
      
      // 完了シナリオに追加
      progress.scenarios.completed.push({
        scenarioId,
        completedAt: new Date(),
        score: result.score,
        timeSpent: result.timeSpent,
        attempts: result.attempts,
        predictions: result.predictions
      });
      
      // 統計更新
      await this.updateStatistics(progress, result);
      
      // アチーブメントチェック
      const newAchievements = await this.checkAchievements(progress);
      progress.achievements.push(...newAchievements);
      
      // インサイト生成
      progress.insights = await this.generateInsights(progress);
      
      await this.storage.save(progress);
      
      return {
        progress,
        newAchievements,
        nextRecommendations: await this.getRecommendations(progress)
      };
    }
    
    private async updateStatistics(
      progress: LearningProgress,
      result: ScenarioResult
    ) {
      const stats = progress.statistics;
      
      // 合計時間
      stats.totalTime += result.timeSpent;
      
      // 平均スコア
      const allScores = progress.scenarios.completed.map(s => s.score);
      stats.averageScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      
      // 連続日数
      const today = new Date().toDateString();
      const lastActive = progress.lastActive.toDateString();
      if (today !== lastActive) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (yesterday.toDateString() === lastActive) {
          stats.streakDays++;
        } else {
          stats.streakDays = 1;
        }
      }
      
      // 強み・改善点の分析
      const categoryScores = this.analyzeCategoryScores(progress);
      stats.strongAreas = categoryScores
        .filter(c => c.averageScore > 0.8)
        .map(c => c.category);
      stats.improvementAreas = categoryScores
        .filter(c => c.averageScore < 0.6)
        .map(c => c.category);
    }
  }
  ```
- [ ] スコアリングシステム
  ```typescript
  class ScoringSystem {
    calculateScore(scenarioResult: ScenarioResult): ScoreBreakdown {
      const weights = {
        predictionAccuracy: 0.4,
        comprehension: 0.3,
        timeBonus: 0.1,
        engagement: 0.2
      };
      
      // 予測精度スコア
      const predictionScore = this.calculatePredictionScore(
        scenarioResult.predictions,
        scenarioResult.actualInterpretations
      );
      
      // 理解度スコア
      const comprehensionScore = this.calculateComprehensionScore(
        scenarioResult.quizAnswers
      );
      
      // 時間ボーナス
      const timeBonus = this.calculateTimeBonus(
        scenarioResult.timeSpent,
        scenarioResult.expectedTime
      );
      
      // エンゲージメントスコア
      const engagementScore = this.calculateEngagementScore(
        scenarioResult.interactions
      );
      
      const totalScore = 
        predictionScore * weights.predictionAccuracy +
        comprehensionScore * weights.comprehension +
        timeBonus * weights.timeBonus +
        engagementScore * weights.engagement;
      
      return {
        total: Math.round(totalScore * 100),
        breakdown: {
          prediction: Math.round(predictionScore * 100),
          comprehension: Math.round(comprehensionScore * 100),
          time: Math.round(timeBonus * 100),
          engagement: Math.round(engagementScore * 100)
        },
        feedback: this.generateFeedback(totalScore)
      };
    }
    
    private calculatePredictionScore(
      predictions: UserPrediction[],
      actual: ActualInterpretations
    ): number {
      let correctPredictions = 0;
      
      predictions.forEach(prediction => {
        if (prediction.mode === 'ASD') {
          // ASD予測の評価
          const accuracy = this.compareASDPrediction(
            prediction,
            actual.ASD
          );
          if (accuracy > 0.7) correctPredictions++;
        } else {
          // NT予測の評価
          const accuracy = this.compareNTPrediction(
            prediction,
            actual.NT
          );
          if (accuracy > 0.7) correctPredictions++;
        }
      });
      
      return correctPredictions / predictions.length;
    }
  }
  ```
- [ ] 統計ダッシュボード
  ```typescript
  const ProgressDashboard: React.FC = () => {
    const progress = useProgress();
    const [view, setView] = useState<'overview' | 'details' | 'insights'>('overview');
    
    return (
      <div className="progress-dashboard">
        <div className="header">
          <h2>学習進捗</h2>
          <div className="view-selector">
            <Button
              variant={view === 'overview' ? 'primary' : 'secondary'}
              onClick={() => setView('overview')}
            >
              概要
            </Button>
            <Button
              variant={view === 'details' ? 'primary' : 'secondary'}
              onClick={() => setView('details')}
            >
              詳細
            </Button>
            <Button
              variant={view === 'insights' ? 'primary' : 'secondary'}
              onClick={() => setView('insights')}
            >
              インサイト
            </Button>
          </div>
        </div>
        
        {view === 'overview' && (
          <div className="overview-grid">
            <StatCard
              title="完了シナリオ"
              value={progress.scenarios.completed.length}
              total={10}
              icon={<CheckCircle />}
            />
            
            <StatCard
              title="平均スコア"
              value={`${progress.statistics.averageScore}%`}
              trend={progress.statistics.scoretrend}
              icon={<TrendingUp />}
            />
            
            <StatCard
              title="学習時間"
              value={formatTime(progress.statistics.totalTime)}
              subtitle="合計"
              icon={<Clock />}
            />
            
            <StatCard
              title="連続学習"
              value={`${progress.statistics.streakDays}日`}
              subtitle="現在の記録"
              icon={<Fire />}
            />
          </div>
        )}
        
        {view === 'details' && (
          <div className="details-view">
            <ScenarioProgressList
              completed={progress.scenarios.completed}
              inProgress={progress.scenarios.inProgress}
            />
            
            <CategoryBreakdown
              categories={progress.statistics.categoryScores}
            />
            
            <LearningCurveChart
              data={progress.insights.learningCurve}
            />
          </div>
        )}
        
        {view === 'insights' && (
          <div className="insights-view">
            <InsightCard
              title="予測精度"
              value={`${progress.insights.predictionAccuracy}%`}
              description="ASD/NTの解釈の違いを予測する精度"
            />
            
            <CommonMisunderstandings
              misunderstandings={progress.insights.commonMisunderstandings}
            />
            
            <StrengthsAndWeaknesses
              strengths={progress.statistics.strongAreas}
              weaknesses={progress.statistics.improvementAreas}
            />
            
            <PersonalizedRecommendations
              recommendations={progress.recommendations}
            />
          </div>
        )}
      </div>
    );
  };
  ```

### Day 87-88: クイズ機能
- [ ] 問題生成エンジン
  ```typescript
  class QuizGenerator {
    generateQuiz(scenario: Scenario): Quiz {
      const questions: Question[] = [];
      
      // 解釈理解問題
      questions.push(this.generateInterpretationQuestion(scenario));
      
      // 応答予測問題
      questions.push(this.generateResponseQuestion(scenario));
      
      // 違いの理解問題
      questions.push(this.generateDifferenceQuestion(scenario));
      
      // 応用問題
      questions.push(this.generateApplicationQuestion(scenario));
      
      return {
        id: `quiz-${scenario.id}`,
        scenarioId: scenario.id,
        questions,
        passingScore: 70,
        timeLimit: 600 // 10分
      };
    }
    
    private generateInterpretationQuestion(scenario: Scenario): Question {
      const wrongAnswers = this.generateWrongAnswers(scenario);
      
      return {
        id: generateId(),
        type: 'multiple_choice',
        question: `「${scenario.interaction.utterance}」をASDモードではどのように解釈する可能性が高いですか？`,
        options: shuffle([
          {
            id: 'correct',
            text: scenario.interpretations.ASD.literalUnderstanding,
            isCorrect: true
          },
          {
            id: 'nt-interpretation',
            text: scenario.interpretations.NT.understanding,
            isCorrect: false
          },
          ...wrongAnswers
        ]),
        explanation: scenario.explanation.whyDifferent,
        points: 25
      };
    }
    
    private generateResponseQuestion(scenario: Scenario): Question {
      return {
        id: generateId(),
        type: 'multiple_select',
        question: 'ASDモードで混乱する可能性がある点はどれですか？（複数選択可）',
        options: [
          ...scenario.interpretations.ASD.confusionPoints.map(point => ({
            id: generateId(),
            text: point,
            isCorrect: true
          })),
          ...this.generateDistractors(scenario).map(distractor => ({
            id: generateId(),
            text: distractor,
            isCorrect: false
          }))
        ],
        explanation: '曖昧な表現や文脈依存の理解が必要な部分で混乱が生じやすいです。',
        points: 25
      };
    }
    
    private generateDifferenceQuestion(scenario: Scenario): Question {
      return {
        id: generateId(),
        type: 'matching',
        question: '以下の特徴を適切なモードに分類してください。',
        items: [
          {
            id: 'literal',
            text: '字義通りの解釈',
            correctMatch: 'ASD'
          },
          {
            id: 'contextual',
            text: '文脈を考慮した解釈',
            correctMatch: 'NT'
          },
          {
            id: 'explicit-emotion',
            text: '感情の明示的な表現',
            correctMatch: 'ASD'
          },
          {
            id: 'implicit-understanding',
            text: '暗黙の了解',
            correctMatch: 'NT'
          }
        ],
        matches: ['ASD', 'NT'],
        explanation: 'ASDとNTでは情報処理の方法が異なります。',
        points: 25
      };
    }
    
    private generateApplicationQuestion(scenario: Scenario): Question {
      return {
        id: generateId(),
        type: 'scenario_based',
        question: '同様の状況で、より明確なコミュニケーションを取るにはどうすればよいでしょうか？',
        scenario: {
          context: scenario.situation.context,
          options: [
            {
              id: 'specific-time',
              text: '具体的な時間を伝える（例：5分待ってください）',
              isCorrect: true,
              feedback: '具体的な情報は誤解を防ぎます。'
            },
            {
              id: 'more-vague',
              text: 'もっと曖昧に伝える（例：しばらく待って）',
              isCorrect: false,
              feedback: 'より曖昧な表現は混乱を増やす可能性があります。'
            },
            {
              id: 'context-clue',
              text: '状況説明を追加する（例：財布を探すので待って）',
              isCorrect: true,
              feedback: '理由を説明することで理解しやすくなります。'
            }
          ]
        },
        allowMultiple: true,
        points: 25
      };
    }
  }
  ```
- [ ] インタラクティブクイズUI
  ```typescript
  const QuizComponent: React.FC<{ quiz: Quiz }> = ({ quiz }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [showExplanation, setShowExplanation] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(quiz.timeLimit);
    const [quizComplete, setQuizComplete] = useState(false);
    
    // タイマー
    useEffect(() => {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 0) {
            completeQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }, []);
    
    const handleAnswer = (answer: any) => {
      const newAnswer: Answer = {
        questionId: quiz.questions[currentQuestion].id,
        answer,
        timeSpent: quiz.timeLimit - timeRemaining,
        isCorrect: evaluateAnswer(quiz.questions[currentQuestion], answer)
      };
      
      setAnswers([...answers, newAnswer]);
      setShowExplanation(true);
    };
    
    const nextQuestion = () => {
      if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setShowExplanation(false);
      } else {
        completeQuiz();
      }
    };
    
    const completeQuiz = () => {
      setQuizComplete(true);
      const results = calculateResults(quiz, answers);
      onComplete(results);
    };
    
    if (quizComplete) {
      return <QuizResults quiz={quiz} answers={answers} />;
    }
    
    const question = quiz.questions[currentQuestion];
    
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <ProgressBar
            value={currentQuestion + 1}
            max={quiz.questions.length}
            label={`問題 ${currentQuestion + 1} / ${quiz.questions.length}`}
          />
          
          <Timer
            remaining={timeRemaining}
            total={quiz.timeLimit}
            warning={timeRemaining < 60}
          />
        </div>
        
        <div className="question-container">
          <h3 className="question-text">{question.question}</h3>
          
          {question.type === 'multiple_choice' && (
            <MultipleChoiceQuestion
              options={question.options}
              onAnswer={handleAnswer}
              disabled={showExplanation}
            />
          )}
          
          {question.type === 'multiple_select' && (
            <MultipleSelectQuestion
              options={question.options}
              onAnswer={handleAnswer}
              disabled={showExplanation}
            />
          )}
          
          {question.type === 'matching' && (
            <MatchingQuestion
              items={question.items}
              matches={question.matches}
              onAnswer={handleAnswer}
              disabled={showExplanation}
            />
          )}
          
          {question.type === 'scenario_based' && (
            <ScenarioBasedQuestion
              scenario={question.scenario}
              onAnswer={handleAnswer}
              disabled={showExplanation}
            />
          )}
        </div>
        
        {showExplanation && (
          <div className="explanation-container">
            <div className={`result ${answers[answers.length - 1].isCorrect ? 'correct' : 'incorrect'}`}>
              {answers[answers.length - 1].isCorrect ? '正解！' : '不正解'}
            </div>
            
            <div className="explanation">
              <h4>解説</h4>
              <p>{question.explanation}</p>
            </div>
            
            <Button onClick={nextQuestion} variant="primary">
              {currentQuestion < quiz.questions.length - 1 ? '次の問題へ' : '結果を見る'}
            </Button>
          </div>
        )}
      </div>
    );
  };
  ```
- [ ] 採点・フィードバック
  ```typescript
  class QuizEvaluator {
    evaluate(quiz: Quiz, answers: Answer[]): QuizResult {
      const scoreBreakdown = this.calculateScoreBreakdown(quiz, answers);
      const insights = this.generateInsights(quiz, answers);
      const recommendations = this.generateRecommendations(scoreBreakdown, insights);
      
      return {
        quizId: quiz.id,
        scenarioId: quiz.scenarioId,
        score: scoreBreakdown.total,
        passed: scoreBreakdown.total >= quiz.passingScore,
        timeSpent: answers.reduce((sum, a) => sum + a.timeSpent, 0),
        scoreBreakdown,
        insights,
        recommendations,
        detailedResults: this.generateDetailedResults(quiz, answers)
      };
    }
    
    private calculateScoreBreakdown(quiz: Quiz, answers: Answer[]): ScoreBreakdown {
      let totalPoints = 0;
      let earnedPoints = 0;
      const categoryScores: Record<string, number> = {};
      
      quiz.questions.forEach((question, index) => {
        const answer = answers[index];
        totalPoints += question.points;
        
        if (answer && answer.isCorrect) {
          earnedPoints += question.points;
        }
        
        // カテゴリ別スコア
        const category = this.getQuestionCategory(question);
        if (!categoryScores[category]) {
          categoryScores[category] = { earned: 0, total: 0 };
        }
        categoryScores[category].total += question.points;
        if (answer && answer.isCorrect) {
          categoryScores[category].earned += question.points;
        }
      });
      
      return {
        total: Math.round((earnedPoints / totalPoints) * 100),
        earned: earnedPoints,
        possible: totalPoints,
        categories: Object.entries(categoryScores).map(([category, scores]) => ({
          category,
          score: Math.round((scores.earned / scores.total) * 100)
        }))
      };
    }
    
    private generateInsights(quiz: Quiz, answers: Answer[]): QuizInsights {
      const incorrectAnswers = answers.filter(a => !a.isCorrect);
      const patterns = this.analyzeErrorPatterns(quiz, incorrectAnswers);
      
      return {
        strengths: this.identifyStrengths(quiz, answers),
        weaknesses: this.identifyWeaknesses(quiz, answers),
        commonErrors: patterns.commonErrors,
        misunderstandings: patterns.misunderstandings,
        timeAnalysis: this.analyzeTimeUsage(answers),
        improvementAreas: this.suggestImprovementAreas(patterns)
      };
    }
    
    private generateDetailedResults(quiz: Quiz, answers: Answer[]): DetailedResult[] {
      return quiz.questions.map((question, index) => {
        const answer = answers[index];
        
        return {
          question: question.question,
          yourAnswer: this.formatAnswer(answer),
          correctAnswer: this.getCorrectAnswer(question),
          isCorrect: answer?.isCorrect || false,
          explanation: question.explanation,
          timeSpent: answer?.timeSpent || 0,
          category: this.getQuestionCategory(question)
        };
      });
    }
  }
  ```
- [ ] 成績レポート生成
  ```typescript
  class ReportGenerator {
    generateReport(
      userId: string,
      quizResults: QuizResult[]
    ): LearningReport {
      const overallStats = this.calculateOverallStatistics(quizResults);
      const progressAnalysis = this.analyzeProgress(quizResults);
      const strengthsAndWeaknesses = this.identifyStrengthsAndWeaknesses(quizResults);
      const recommendations = this.generatePersonalizedRecommendations(
        overallStats,
        progressAnalysis,
        strengthsAndWeaknesses
      );
      
      return {
        userId,
        generatedAt: new Date(),
        period: this.calculatePeriod(quizResults),
        
        summary: {
          totalQuizzes: quizResults.length,
          averageScore: overallStats.averageScore,
          passRate: overallStats.passRate,
          totalTimeSpent: overallStats.totalTime,
          improvement: progressAnalysis.improvementRate
        },
        
        detailedAnalysis: {
          byCategory: this.analyzeByCategory(quizResults),
          byDifficulty: this.analyzeByDifficulty(quizResults),
          byScenarioType: this.analyzeByScenarioType(quizResults)
        },
        
        strengths: strengthsAndWeaknesses.strengths.map(s => ({
          area: s.area,
          description: s.description,
          evidence: s.evidence,
          consistency: s.consistency
        })),
        
        areasForImprovement: strengthsAndWeaknesses.weaknesses.map(w => ({
          area: w.area,
          description: w.description,
          commonErrors: w.commonErrors,
          suggestedActions: w.suggestedActions
        })),
        
        learningCurve: {
          data: progressAnalysis.curveData,
          trend: progressAnalysis.trend,
          projection: progressAnalysis.projection
        },
        
        recommendations: {
          immediate: recommendations.immediate,
          shortTerm: recommendations.shortTerm,
          longTerm: recommendations.longTerm,
          resources: recommendations.resources
        },
        
        achievements: this.checkAchievements(overallStats, progressAnalysis),
        
        visualizations: {
          scoreProgression: this.generateScoreProgressionChart(quizResults),
          categoryRadar: this.generateCategoryRadarChart(quizResults),
          timeEfficiency: this.generateTimeEfficiencyChart(quizResults)
        }
      };
    }
    
    async generatePDFReport(report: LearningReport): Promise<Blob> {
      // PDFレポート生成ロジック
      const doc = new PDFDocument();
      
      // タイトルページ
      doc.addPage()
         .fontSize(24)
         .text('学習レポート', { align: 'center' })
         .fontSize(12)
         .text(`生成日: ${report.generatedAt.toLocaleDateString('ja-JP')}`);
      
      // サマリーページ
      doc.addPage()
         .fontSize(18)
         .text('学習概要')
         .fontSize(12)
         .text(`完了クイズ数: ${report.summary.totalQuizzes}`)
         .text(`平均スコア: ${report.summary.averageScore}%`)
         .text(`合格率: ${report.summary.passRate}%`);
      
      // 詳細分析ページ
      // ... 他のセクション
      
      return doc.getBlob();
    }
  }
  ```

### Day 89-91: MVP統合テスト
- [ ] E2Eテストシナリオ作成
  ```typescript
  // cypress/e2e/mvp-flow.cy.ts
  describe('MVP完全フロー', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.mockWebSocket();
      cy.mockAPIs();
    });
    
    it('初回ユーザーの完全なフローをテスト', () => {
      // 1. ウェルカム画面
      cy.contains('ASD理解促進プラットフォームへようこそ').should('be.visible');
      cy.get('[data-testid="start-button"]').click();
      
      // 2. VRMモデルの読み込み
      cy.get('[data-testid="vrm-viewer"]').should('be.visible');
      cy.wait('@vrmLoad');
      
      // 3. モード説明
      cy.get('[data-testid="mode-tutorial"]').should('be.visible');
      cy.get('[data-testid="tutorial-next"]').click();
      
      // 4. 最初のシナリオ
      cy.get('[data-testid="scenario-title"]')
        .should('contain', 'ちょっと待って');
      
      // 5. インタラクション提示
      cy.get('[data-testid="interaction-display"]').should('be.visible');
      cy.get('[data-testid="speaker-name"]').should('contain', '友人');
      cy.get('[data-testid="utterance"]')
        .should('contain', 'あ、ごめん！ちょっと待って！');
      
      // 6. 予測入力
      cy.get('[data-testid="prediction-input"]').type(
        '具体的な時間がわからないので困惑すると思います'
      );
      cy.get('[data-testid="submit-prediction"]').click();
      
      // 7. 解釈の表示
      cy.get('[data-testid="interpretations-reveal"]').should('be.visible');
      cy.get('[data-testid="asd-interpretation"]')
        .should('contain', '具体的な時間が不明');
      cy.get('[data-testid="nt-interpretation"]')
        .should('contain', '1-2分程度');
      
      // 8. 説明表示
      cy.get('[data-testid="explanation"]').should('be.visible');
      cy.get('[data-testid="learning-points"]').should('have.length.gt', 0);
      
      // 9. クイズ
      cy.get('[data-testid="start-quiz"]').click();
      cy.get('[data-testid="quiz-question"]').should('be.visible');
      
      // クイズ回答
      cy.get('[data-testid="quiz-option-0"]').click();
      cy.get('[data-testid="quiz-submit"]').click();
      cy.get('[data-testid="quiz-explanation"]').should('be.visible');
      
      // 10. 完了
      cy.get('[data-testid="scenario-complete"]').should('be.visible');
      cy.get('[data-testid="score-display"]').should('be.visible');
      
      // 11. 次のシナリオへ
      cy.get('[data-testid="next-scenario"]').click();
    });
    
    it('ASD/NTモード切り替えが正しく動作する', () => {
      // チャット画面へ
      cy.get('[data-testid="chat-mode"]').click();
      
      // 初期状態はNTモード
      cy.get('[data-testid="mode-indicator"]').should('contain', 'NT');
      
      // メッセージ送信
      cy.get('[data-testid="message-input"]').type('時間が飛ぶように過ぎた');
      cy.get('[data-testid="send-button"]').click();
      
      // NT応答を確認
      cy.get('[data-testid="ai-response"]')
        .should('contain', '早く過ぎた');
      
      // ASDモードに切り替え
      cy.get('[data-testid="mode-toggle"]').click();
      cy.get('[data-testid="mode-indicator"]').should('contain', 'ASD');
      
      // 同じメッセージを送信
      cy.get('[data-testid="message-input"]').type('時間が飛ぶように過ぎた');
      cy.get('[data-testid="send-button"]').click();
      
      // ASD応答を確認
      cy.get('[data-testid="ai-response"]')
        .should('contain', '時間が空中を移動する');
      cy.get('[data-testid="confusion-indicator"]').should('be.visible');
    });
  });
  ```
- [ ] パフォーマンステスト
  ```typescript
  // tests/performance/mvp-performance.test.ts
  import { test, expect } from '@playwright/test';
  
  test.describe('MVPパフォーマンステスト', () => {
    test('初回ロード時間', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // 3秒以内
      
      // Core Web Vitals
      const metrics = await page.evaluate(() => {
        return {
          fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
          lcp: performance.getEntriesByType('largest-contentful-paint').pop()?.startTime,
          cls: 0, // Cumulative Layout Shift
          fid: 0  // First Input Delay
        };
      });
      
      expect(metrics.fcp).toBeLessThan(1500);
      expect(metrics.lcp).toBeLessThan(2500);
    });
    
    test('VRMモデル読み込みパフォーマンス', async ({ page }) => {
      await page.goto('/');
      
      const vrmLoadStart = Date.now();
      await page.waitForSelector('[data-testid="vrm-loaded"]');
      const vrmLoadTime = Date.now() - vrmLoadStart;
      
      expect(vrmLoadTime).toBeLessThan(3000);
      
      // FPS測定
      const fps = await page.evaluate(() => {
        return new Promise(resolve => {
          let frames = 0;
          const startTime = performance.now();
          
          function countFrame() {
            frames++;
            if (performance.now() - startTime < 1000) {
              requestAnimationFrame(countFrame);
            } else {
              resolve(frames);
            }
          }
          
          requestAnimationFrame(countFrame);
        });
      });
      
      expect(fps).toBeGreaterThan(30); // 30FPS以上
    });
    
    test('API応答時間', async ({ page, request }) => {
      const endpoints = [
        '/api/v1/emotion/analyze',
        '/api/v1/nlp/parse',
        '/api/v1/chat/message'
      ];
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        const response = await request.post(`http://localhost:8000${endpoint}`, {
          data: {
            text: 'テストメッセージ',
            mode: 'ASD'
          }
        });
        
        const responseTime = Date.now() - startTime;
        
        expect(response.status()).toBe(200);
        expect(responseTime).toBeLessThan(500); // 500ms以内
      }
    });
    
    test('同時接続負荷テスト', async ({ browser }) => {
      const contexts = [];
      const pages = [];
      
      // 10個の同時接続を作成
      for (let i = 0; i < 10; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        contexts.push(context);
        pages.push(page);
      }
      
      // 全ページで同時にアクセス
      const loadPromises = pages.map(page => page.goto('/'));
      await Promise.all(loadPromises);
      
      // 全ページでメッセージ送信
      const messagePromises = pages.map(async (page, i) => {
        await page.fill('[data-testid="message-input"]', `テストメッセージ${i}`);
        await page.click('[data-testid="send-button"]');
        await page.waitForSelector('[data-testid="ai-response"]');
      });
      
      const startTime = Date.now();
      await Promise.all(messagePromises);
      const totalTime = Date.now() - startTime;
      
      expect(totalTime).toBeLessThan(10000); // 10秒以内に全て完了
      
      // クリーンアップ
      for (const context of contexts) {
        await context.close();
      }
    });
  });
  ```
- [ ] アクセシビリティテスト
  ```typescript
  // tests/accessibility/mvp-a11y.test.ts
  import { test, expect } from '@playwright/test';
  import { injectAxe, checkA11y } from 'axe-playwright';
  
  test.describe('アクセシビリティテスト', () => {
    test('ホームページのアクセシビリティ', async ({ page }) => {
      await page.goto('/');
      await injectAxe(page);
      
      const results = await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: {
          html: true
        }
      });
      
      expect(results.violations).toHaveLength(0);
    });
    
    test('キーボードナビゲーション', async ({ page }) => {
      await page.goto('/');
      
      // Tabキーでのナビゲーション
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(firstFocused).toBe('A'); // Skip link
      
      // メインコンテンツへのスキップ
      await page.keyboard.press('Enter');
      const mainFocused = await page.evaluate(() => document.activeElement?.id);
      expect(mainFocused).toBe('main');
      
      // モード切り替えのキーボード操作
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Space'); // Toggle
      
      const modeChanged = await page.textContent('[data-testid="mode-indicator"]');
      expect(modeChanged).toContain('ASD');
    });
    
    test('スクリーンリーダー対応', async ({ page }) => {
      await page.goto('/');
      
      // ARIA属性の確認
      const ariaLabels = await page.evaluate(() => {
        const elements = document.querySelectorAll('[aria-label]');
        return Array.from(elements).map(el => ({
          tag: el.tagName,
          label: el.getAttribute('aria-label')
        }));
      });
      
      expect(ariaLabels.length).toBeGreaterThan(10);
      
      // ライブリージョンの確認
      const liveRegions = await page.$$('[aria-live]');
      expect(liveRegions.length).toBeGreaterThan(0);
      
      // 動的コンテンツのアナウンス
      await page.fill('[data-testid="message-input"]', 'テスト');
      await page.click('[data-testid="send-button"]');
      
      const announcement = await page.textContent('[aria-live="polite"]');
      expect(announcement).toContain('新しいメッセージ');
    });
    
    test('高コントラストモード', async ({ page }) => {
      await page.goto('/');
      
      // 高コントラストモードを有効化
      await page.emulateMedia({ colorScheme: 'dark' });
      
      // コントラスト比の確認
      const contrastRatios = await page.evaluate(() => {
        const getContrastRatio = (fg: string, bg: string) => {
          // WCAG計算式を実装
          return 7.5; // 仮の値
        };
        
        const elements = document.querySelectorAll('p, h1, h2, h3, button, a');
        return Array.from(elements).map(el => {
          const styles = window.getComputedStyle(el);
          return getContrastRatio(styles.color, styles.backgroundColor);
        });
      });
      
      contrastRatios.forEach(ratio => {
        expect(ratio).toBeGreaterThan(4.5); // WCAG AA基準
      });
    });
  });
  ```

### Day 92-94: ドキュメント作成
- [ ] ユーザーガイド作成
  ```markdown
  # ASD理解促進プラットフォーム ユーザーガイド
  
  ## はじめに
  
  このプラットフォームは、定型発達（NT）の方がASD（自閉症スペクトラム障害）の
  コミュニケーション特性を体験的に理解するための教育ツールです。
  
  ## 基本的な使い方
  
  ### 1. プラットフォームへのアクセス
  
  1. ブラウザで https://asd-aituber.example.com にアクセス
  2. 推奨ブラウザ: Chrome, Firefox, Safari の最新版
  3. スマートフォン・タブレットでも利用可能
  
  ### 2. 初回起動時
  
  #### ウェルカム画面
  - プラットフォームの目的説明
  - 注意事項の確認
  - 「始める」ボタンをクリック
  
  #### チュートリアル
  - ASD/NTモードの説明
  - 基本操作の練習
  - スキップも可能
  
  ### 3. メイン機能
  
  #### シナリオ学習
  
  1. **シナリオ選択**
     - カテゴリから選択
     - 難易度で絞り込み
     - おすすめから選択
  
  2. **シナリオ進行**
     - 状況説明を読む
     - 発話を確認
     - 予測を入力
     - 解釈の違いを学ぶ
  
  3. **クイズ**
     - 理解度チェック
     - 即座のフィードバック
     - 詳細な解説
  
  #### フリーチャット
  
  1. **モード選択**
     - ASDモード: 字義通りの解釈
     - NTモード: 文脈考慮の解釈
  
  2. **会話**
     - テキスト入力
     - 送信ボタンまたはEnterキー
     - AIからの応答
  
  ### 4. 学習進捗
  
  #### ダッシュボード
  - 完了シナリオ数
  - 平均スコア
  - 学習時間
  - 連続学習日数
  
  #### 詳細統計
  - カテゴリ別成績
  - 成長曲線
  - 強み・弱み分析
  
  ## 機能詳細
  
  ### ASD/NTモードの違い
  
  #### ASDモード
  - **特徴**
    - 言葉を字義通りに解釈
    - 慣用句や比喩の理解困難
    - 具体的な情報を求める
    - 感情表現は控えめ（内部は強い）
  
  - **会話例**
    ```
    ユーザー: 時間が飛ぶように過ぎた
    AI (ASD): 「時間が飛ぶ」というのは物理的に不可能です。
             何を表現したいのか具体的に教えていただけますか？
    ```
  
  #### NTモード  
  - **特徴**
    - 文脈を考慮した解釈
    - 比喩や慣用句を理解
    - 暗黙の了解を読み取る
    - 自然な感情表現
  
  - **会話例**
    ```
    ユーザー: 時間が飛ぶように過ぎた
    AI (NT): 楽しい時間はあっという間ですよね。
            充実した時間を過ごされたようで何よりです。
    ```
  
  ### アクセシビリティ機能
  
  #### キーボード操作
  - `Tab`: 次の要素へ
  - `Shift + Tab`: 前の要素へ
  - `Enter/Space`: 選択・実行
  - `Esc`: ダイアログを閉じる
  
  #### スクリーンリーダー対応
  - 全ての重要な要素にラベル付け
  - 動的変更のアナウンス
  - 構造的なマークアップ
  
  #### 表示設定
  - 文字サイズ変更
  - 高コントラストモード
  - アニメーション無効化
  
  ## トラブルシューティング
  
  ### よくある質問
  
  **Q: VRMモデルが表示されない**
  A: WebGL対応のブラウザか確認してください。
     グラフィックドライバの更新も試してください。
  
  **Q: 音声が再生されない**
  A: ブラウザの音声許可を確認してください。
     設定 > サイトの設定 > 音声
  
  **Q: 応答が遅い**
  A: ネットワーク接続を確認してください。
     混雑時は少し時間がかかる場合があります。
  
  ### エラーメッセージ
  
  | エラー | 原因 | 対処法 |
  |--------|------|--------|
  | 接続エラー | ネットワーク問題 | 接続確認、リロード |
  | 読み込みエラー | リソース取得失敗 | キャッシュクリア |
  | 認証エラー | セッション切れ | 再ログイン |
  
  ## お問い合わせ
  
  - メール: support@asd-aituber.example.com
  - FAQ: https://asd-aituber.example.com/faq
  - フィードバック: アプリ内フォームから
  ```
- [ ] 技術ドキュメント更新
  ```markdown
  # 技術ドキュメント
  
  ## アーキテクチャ概要
  
  ### システム構成
  ```mermaid
  graph TB
    subgraph Frontend
      A[Next.js 14] --> B[Three.js/VRM]
      A --> C[Socket.IO Client]
      A --> D[Zustand Store]
    end
    
    subgraph Backend
      E[Node.js Server] --> F[Socket.IO Server]
      E --> G[LLM Service]
      E --> H[Cache Layer]
    end
    
    subgraph Python API
      I[FastAPI] --> J[NLP Engine]
      I --> K[Emotion Analyzer]
      I --> L[PCM Processor]
    end
    
    C <--> F
    E <--> I
    G --> M[Claude/GPT API]
  ```
  
  ### 技術スタック詳細
  
  #### フロントエンド
  - **Framework**: Next.js 14 (App Router)
  - **Language**: TypeScript 5.x
  - **Styling**: Tailwind CSS 3.x
  - **3D Graphics**: Three.js + @pixiv/three-vrm
  - **State Management**: Zustand
  - **Real-time**: Socket.IO Client
  - **Testing**: Jest, React Testing Library, Playwright
  
  #### バックエンド
  - **Runtime**: Node.js 20.x
  - **Framework**: Express + Socket.IO
  - **Language**: TypeScript
  - **Cache**: Redis (optional)
  - **Queue**: Bull (optional)
  
  #### Python API
  - **Framework**: FastAPI
  - **Python**: 3.11+
  - **NLP**: SudachiPy, GiNZA
  - **ML**: scikit-learn, transformers
  
  ### API仕様
  
  #### REST Endpoints
  
  ```typescript
  // Emotion Analysis
  POST /api/v1/emotion/analyze
  {
    text: string;
    mode: "ASD" | "NT";
    context?: Record<string, any>;
  }
  
  // NLP Processing  
  POST /api/v1/nlp/parse
  {
    text: string;
    analyze_options: {
      morphological?: boolean;
      dependency?: boolean;
      detect_idioms?: boolean;
    }
  }
  
  // Chat Message
  POST /api/v1/chat/message
  {
    message: string;
    mode: "ASD" | "NT";
    personality?: PCMType;
    sessionId: string;
  }
  ```
  
  #### WebSocket Events
  
  ```typescript
  // Client -> Server
  socket.emit('message', {
    text: string;
    mode: Mode;
    timestamp: number;
  });
  
  socket.emit('mode:change', {
    newMode: Mode;
  });
  
  // Server -> Client  
  socket.on('response', {
    text: string;
    emotion: EmotionState;
    expression: Expression;
  });
  
  socket.on('typing', {
    isTyping: boolean;
  });
  ```
  
  ### デプロイメント
  
  #### 開発環境
  ```bash
  # 全サービス起動
  docker-compose up -d
  
  # 個別起動
  pnpm dev:web     # Frontend
  pnpm dev:api     # Node.js API
  pnpm dev:python  # Python API
  ```
  
  #### 本番環境
  ```yaml
  # docker-compose.prod.yml
  version: '3.8'
  
  services:
    web:
      image: asd-aituber/web:latest
      environment:
        - NODE_ENV=production
      deploy:
        replicas: 2
    
    api:
      image: asd-aituber/api:latest
      environment:
        - NODE_ENV=production
      deploy:
        replicas: 2
    
    python-api:
      image: asd-aituber/python-api:latest
      deploy:
        replicas: 2
    
    nginx:
      image: nginx:alpine
      volumes:
        - ./nginx.conf:/etc/nginx/nginx.conf
      ports:
        - "80:80"
        - "443:443"
  ```
  
  ### パフォーマンス最適化
  
  #### フロントエンド
  - Code splitting
  - Lazy loading
  - Image optimization
  - Bundle size monitoring
  
  #### バックエンド
  - Response caching
  - Database query optimization
  - Connection pooling
  - Rate limiting
  
  #### インフラ
  - CDN (CloudFlare)
  - Load balancing
  - Auto-scaling
  - Health checks
  ```
- [ ] APIドキュメント生成
  ```typescript
  // scripts/generate-api-docs.ts
  import { generateOpenAPIDocument } from './openapi-generator';
  import { generatePostmanCollection } from './postman-generator';
  import { generateSDK } from './sdk-generator';
  
  async function generateAPIDocs() {
    // OpenAPI仕様生成
    const openApiSpec = await generateOpenAPIDocument({
      title: 'ASD-AITuber API',
      version: '1.0.0',
      description: 'ASD/NT模倣AITuberシステムのAPI',
      servers: [
        { url: 'https://api.asd-aituber.example.com', description: 'Production' },
        { url: 'http://localhost:8000', description: 'Development' }
      ]
    });
    
    await fs.writeFile('./docs/api/openapi.json', JSON.stringify(openApiSpec, null, 2));
    
    // Postmanコレクション生成
    const postmanCollection = await generatePostmanCollection(openApiSpec);
    await fs.writeFile('./docs/api/postman-collection.json', JSON.stringify(postmanCollection, null, 2));
    
    // TypeScript SDK生成
    const sdk = await generateSDK(openApiSpec);
    await fs.writeFile('./packages/sdk/src/index.ts', sdk);
    
    // Markdown APIリファレンス生成
    const markdown = await generateMarkdownDocs(openApiSpec);
    await fs.writeFile('./docs/api/reference.md', markdown);
  }
  ```

### Day 95-98: MVP仕上げ
- [ ] バグ修正期間
  ```typescript
  // 既知の問題リスト
  const knownIssues = [
    {
      id: 'BUG-001',
      severity: 'high',
      description: 'WebSocket接続が不安定な環境でメッセージ喪失',
      solution: 'メッセージキューとACK実装'
    },
    {
      id: 'BUG-002', 
      severity: 'medium',
      description: 'VRMモデルの表情遷移が不自然',
      solution: 'イージング関数の調整'
    },
    {
      id: 'BUG-003',
      severity: 'low',
      description: 'モバイルでのレイアウト崩れ',
      solution: 'レスポンシブ対応強化'
    }
  ];
  ```
- [ ] 最終調整
  - [ ] パフォーマンスチューニング
  - [ ] UI/UXブラッシュアップ
  - [ ] エラーメッセージ改善
  - [ ] ローディング体験向上
- [ ] リリース準備
  ```bash
  # リリースチェックリスト
  - [ ] 全テストパス
  - [ ] ドキュメント完成
  - [ ] 環境変数確認
  - [ ] バックアップ設定
  - [ ] 監視設定
  - [ ] ロールバック計画
  ```

## MVP完成チェックリスト

### 機能要件
- [ ] ASD/NTモード切り替えが動作する
- [ ] VRMモデルが表示され、基本的な表情変化ができる
- [ ] AIとの基本的な会話が可能
- [ ] 10個のシナリオが全て実装されている
- [ ] 学習進捗が記録される
- [ ] 基本的なクイズ機能が動作する

### 非機能要件
- [ ] レスポンスタイム < 3秒（95パーセンタイル）
- [ ] 同時接続10ユーザーで安定動作
- [ ] WCAG 2.1 Level AA準拠
- [ ] エラー率 < 1%
- [ ] 可用性 > 99%

### 品質基準
- [ ] 単体テストカバレッジ > 70%
- [ ] 統合テストカバレッジ > 60%
- [ ] E2Eテスト主要フロー網羅
- [ ] セキュリティ脆弱性スキャンパス
- [ ] パフォーマンステスト基準達成

### ドキュメント
- [ ] ユーザーガイド完成
- [ ] 技術ドキュメント完成
- [ ] API仕様書完成
- [ ] セットアップガイド完成
- [ ] トラブルシューティングガイド完成

### デプロイメント
- [ ] 本番環境構築完了
- [ ] CI/CDパイプライン稼働
- [ ] 監視・アラート設定
- [ ] バックアップ・リストア確認
- [ ] スケーリング設定

これでPhase 4完了時にMVPがリリース可能な状態になります。