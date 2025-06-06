# ASD/NTモード仕様書

最終更新: 2024-06-06

## 概要

ASD（自閉症スペクトラム障害）モードとNT（定型発達）モードは、本システムの中核機能です。ユーザーは両モードを切り替えることで、同じ状況に対する異なる認知・コミュニケーションパターンを体験できます。

## モード定義

### ASDモード

ASDモードでは、以下の特性を実装します：

```typescript
interface ASDModeCharacteristics {
  // 言語処理
  languageProcessing: {
    literalInterpretation: true;      // 字義通りの解釈
    metaphorComprehension: false;     // 比喩理解の困難
    contextClues: "explicit";         // 明示的な文脈のみ
    ambiguityTolerance: "low";        // 曖昧さへの耐性が低い
  };
  
  // 感情処理
  emotionProcessing: {
    internalIntensity: 1.0;           // 内部での感情は強い
    externalExpression: 0.3;          // 外部表現は30%程度
    emotionLabeling: "explicit";      // 感情の明示的なラベリング
    nonverbalCues: "limited";         // 非言語的手がかりの限定
  };
  
  // コミュニケーション
  communication: {
    directness: "high";               // 直接的な表現
    turnTaking: "structured";         // 構造化された会話
    topicMaintenance: "focused";      // 話題の維持に集中
    socialConventions: "learned";     // 学習した社会的慣習
  };
}
```

### NTモード

NTモードでは、以下の特性を実装します：

```typescript
interface NTModeCharacteristics {
  // 言語処理
  languageProcessing: {
    contextualInterpretation: true;   // 文脈依存の解釈
    metaphorComprehension: true;      // 比喩の理解
    implicitUnderstanding: true;      // 暗黙の了解
    ambiguityTolerance: "high";       // 曖昧さを許容
  };
  
  // 感情処理
  emotionProcessing: {
    internalIntensity: 0.8;           // 内部感情
    externalExpression: 0.8;          // 外部表現も同程度
    emotionModulation: "automatic";   // 自動的な感情調整
    nonverbalIntegration: "full";     // 非言語情報の統合
  };
  
  // コミュニケーション
  communication: {
    indirectness: "moderate";         // 間接的表現も使用
    turnTaking: "flexible";           // 柔軟な会話
    topicShifting: "natural";         // 自然な話題転換
    socialConventions: "intuitive";   // 直感的な社会的理解
  };
}
```

## 実装詳細

### 1. 言語処理の違い

#### 慣用句・比喩の処理

**入力例:** 「時間が飛ぶように過ぎた」

```python
# ASDモード処理
def process_asd_mode(text: str) -> str:
    if "時間が飛ぶ" in text:
        return {
            "interpretation": "時間は物理的に飛ぶことはできません。何を意味していますか？",
            "confusion_level": 0.8,
            "request_clarification": True
        }

# NTモード処理
def process_nt_mode(text: str) -> str:
    if "時間が飛ぶ" in text:
        return {
            "interpretation": "時間が早く過ぎたということですね",
            "metaphor_understood": True,
            "response": "楽しい時間だったのですね"
        }
```

#### 曖昧な指示の処理

**入力例:** 「適当にやっておいて」

```typescript
// ASDモード応答
const asdResponse = {
  understanding: "partial",
  response: "「適当」とは具体的にどのような基準でしょうか？",
  needsClarification: [
    "完了の基準",
    "品質の基準",
    "期限"
  ]
};

// NTモード応答
const ntResponse = {
  understanding: "complete",
  response: "はい、状況に応じて対応しておきます",
  implicitUnderstanding: "柔軟に判断して処理"
};
```

### 2. 感情表現の違い

#### 内部感情と外部表現の分離

```typescript
class EmotionProcessor {
  processEmotion(
    emotion: EmotionType,
    intensity: number,
    mode: "ASD" | "NT"
  ): EmotionExpression {
    if (mode === "ASD") {
      return {
        internal: {
          type: emotion,
          intensity: intensity // 100%の内部感情
        },
        external: {
          type: emotion,
          intensity: intensity * 0.3, // 30%の外部表現
          expression: this.getMinimalExpression(emotion),
          verbalLabel: `私は${this.getEmotionLabel(emotion)}を感じています`
        }
      };
    } else {
      return {
        internal: {
          type: emotion,
          intensity: intensity * 0.8
        },
        external: {
          type: emotion,
          intensity: intensity * 0.8, // 内外一致
          expression: this.getNaturalExpression(emotion),
          nonverbal: this.getNonverbalCues(emotion)
        }
      };
    }
  }
}
```

### 3. 会話パターンの違い

#### ターンテイキング（話者交代）

```typescript
// ASDモード：構造化された会話
class ASDConversationManager {
  async handleTurn(input: string): Promise<ConversationTurn> {
    // 相手の発話が完全に終了するまで待機
    await this.waitForCompleteSentence(input);
    
    // 処理時間を確保
    await this.processInput(input);
    
    // 明確な応答
    return {
      response: this.generateStructuredResponse(input),
      turnSignal: "explicit", // 「私の話は終わりました」
      expectingResponse: true
    };
  }
}

// NTモード：柔軟な会話
class NTConversationManager {
  async handleTurn(input: string): Promise<ConversationTurn> {
    // 相槌や割り込みも可能
    const quickResponse = this.generateBackchannel(input);
    
    return {
      response: this.generateFlexibleResponse(input),
      turnSignal: "implicit", // 非言語的な合図
      allowsInterruption: true
    };
  }
}
```

## UI/UX表現

### 1. 視覚的インジケーター

```css
/* ASDモード時のUI */
.asd-mode {
  --response-delay: 2000ms;
  --animation-speed: 0.5;
  --emotion-opacity: 0.3;
}

.asd-mode .emotion-indicator {
  border: 2px solid #4a5568;
  background: linear-gradient(
    to right,
    var(--internal-emotion-color) 0%,
    var(--internal-emotion-color) 70%,
    var(--external-emotion-color) 70%,
    var(--external-emotion-color) 100%
  );
}

/* NTモード時のUI */
.nt-mode {
  --response-delay: 500ms;
  --animation-speed: 1.0;
  --emotion-opacity: 0.8;
}
```

### 2. 会話インターフェース

```typescript
// ASDモード特有の機能
interface ASDModeFeatures {
  // 明確な会話状態表示
  conversationState: "listening" | "processing" | "responding" | "waiting";
  
  // 文字通りの解釈ヘルパー
  literalHelper: {
    enabled: true;
    highlightMetaphors: true;
    provideDefinitions: true;
  };
  
  // 構造化サポート
  structureSupport: {
    showTurnIndicator: true;
    displayProcessingTime: true;
    explicitEndOfTurn: true;
  };
}
```

## 学習目的での活用

### 1. 比較学習機能

```typescript
interface ComparisonView {
  showSideBySide: boolean;
  highlights: {
    differences: DifferencePoint[];
    explanations: string[];
  };
  
  // 同じ入力に対する両モードの応答を表示
  displayComparison(input: string): {
    asdResponse: Response;
    ntResponse: Response;
    keyDifferences: string[];
    learningPoints: string[];
  };
}
```

### 2. インタラクティブ演習

```typescript
class InteractiveExercise {
  // シナリオベースの学習
  async runScenario(scenario: Scenario): Promise<ExerciseResult> {
    const userPrediction = await this.getUserPrediction(
      "ASDモードではどのように解釈されるでしょうか？"
    );
    
    const actualResponse = await this.getASDResponse(scenario.input);
    
    return {
      prediction: userPrediction,
      actual: actualResponse,
      accuracy: this.calculateAccuracy(userPrediction, actualResponse),
      explanation: this.generateExplanation(scenario, actualResponse)
    };
  }
}
```

## 注意事項とガイドライン

### 1. 倫理的配慮

```typescript
const ethicalGuidelines = {
  // 個人差の強調
  disclaimer: "これは一つの例であり、ASDの方々の反応は個人により大きく異なります",
  
  // ステレオタイプの回避
  avoidStereotypes: true,
  
  // 強みの認識
  highlightStrengths: {
    detailOrientation: "細部への注意力",
    honesty: "正直で率直なコミュニケーション",
    consistency: "一貫性のある行動パターン"
  }
};
```

### 2. 実装上の注意点

- モード切り替えは即座に反映
- ユーザーの学習進度に応じた説明レベル調整
- 定期的な当事者レビューによる精度向上

## テストケース

### 1. 言語処理テスト

```typescript
describe('ASD/NTモード言語処理', () => {
  test('慣用句の処理', async () => {
    const input = "頭が真っ白になった";
    
    const asdResult = await processASDMode(input);
    expect(asdResult.literalInterpretation).toBe(true);
    expect(asdResult.confusion).toBeGreaterThan(0.5);
    
    const ntResult = await processNTMode(input);
    expect(ntResult.metaphorUnderstood).toBe(true);
  });
});
```

### 2. 感情表現テスト

```typescript
describe('感情表現の違い', () => {
  test('喜びの表現', async () => {
    const emotion = { type: 'joy', intensity: 0.8 };
    
    const asdExpression = await expressEmotion(emotion, 'ASD');
    expect(asdExpression.external.intensity).toBe(0.24); // 30% of 0.8
    expect(asdExpression.verbalLabel).toBeTruthy();
    
    const ntExpression = await expressEmotion(emotion, 'NT');
    expect(ntExpression.external.intensity).toBe(0.64); // 80% of 0.8
  });
});
```

## 今後の拡張計画

1. **感覚過敏シミュレーション**
   - 音量、明るさ、情報量の調整
   - センサリーオーバーロードの表現

2. **実行機能の違い**
   - タスク切り替えの困難さ
   - ルーチンの重要性

3. **特別な興味の実装**
   - 特定トピックへの深い知識
   - 情熱的な説明モード

## 参考文献

- [自閉症スペクトラム障害の診断基準 (DSM-5)](https://www.psychiatry.org/psychiatrists/practice/dsm)
- [神経多様性の理解](https://autisticadvocacy.org/)
- [ASDのコミュニケーション特性研究](https://www.autism.org.uk/)
