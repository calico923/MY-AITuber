# PCMパーソナリティシステム仕様書

最終更新: 2024-06-06

## 概要

PCM（Process Communication Model）は、NASA心理学者テイビ・ケーラー博士が開発した性格分類システムです。本プラットフォームでは、6つのパーソナリティタイプを実装し、ASD/NTモードと組み合わせることで、多様なコミュニケーションパターンをシミュレートします。

## 6つのパーソナリティタイプ

### 1. Thinker（思考型）

```typescript
interface ThinkerPersonality {
  // 基本特性
  characteristics: {
    primary: "論理的思考";
    strengths: ["分析力", "客観性", "正確性"];
    communication: "データと事実に基づく";
  };
  
  // コミュニケーションチャネル
  channel: "Requestive"; // 情報要求型
  
  // 心理的ニーズ
  psychologicalNeeds: {
    recognition: "仕事の成果に対する認識";
    timeStructure: "明確な時間構造";
  };
  
  // ASD親和性
  asdAffinity: "high"; // ASDの方に多く見られる傾向
}
```

**実装例：**
```typescript
class ThinkerImplementation {
  generateResponse(input: string, mode: "ASD" | "NT"): Response {
    const facts = this.extractFacts(input);
    const logic = this.analyzeLogic(input);
    
    if (mode === "ASD") {
      return {
        content: `事実として${facts.join("、")}が確認できます。
                  論理的に${logic.conclusion}と考えられます。`,
        emotion: "neutral",
        certaintyLevel: 0.95
      };
    } else {
      return {
        content: `なるほど、${facts[0]}ということですね。
                  それなら${logic.conclusion}かもしれません。`,
        emotion: "thoughtful",
        certaintyLevel: 0.8
      };
    }
  }
}
```

### 2. Persister（信念型）

```typescript
interface PersisterPersonality {
  characteristics: {
    primary: "価値観と信念";
    strengths: ["献身性", "観察力", "誠実さ"];
    communication: "意見と価値判断";
  };
  
  channel: "Requestive"; // 意見要求型
  
  psychologicalNeeds: {
    recognition: "信念と意見への認識";
    conviction: "確固たる信念の維持";
  };
  
  stressSequence: [
    "他者への批判",
    "押し付けがましさ",
    "頑固さの増大"
  ];
}
```

### 3. Harmonizer（感情型）

```typescript
interface HarmonizerPersonality {
  characteristics: {
    primary: "感情と共感";
    strengths: ["思いやり", "温かさ", "協調性"];
    communication: "感情的なつながり";
  };
  
  channel: "Nurturative"; // 養育型
  
  psychologicalNeeds: {
    recognition: "人としての認識";
    sensoryExperience: "心地よい環境";
  };
  
  implementation: {
    emotionPriority: "high";
    relationshipFocus: true;
    conflictAvoidance: true;
  };
}
```

### 4. Imaginer（想像型）

```typescript
interface ImaginerPersonality {
  characteristics: {
    primary: "内省と想像";
    strengths: ["創造性", "内省力", "静かな観察"];
    communication: "指示型（明確な指示を好む）";
  };
  
  channel: "Directive"; // 指示型
  
  psychologicalNeeds: {
    solitude: "一人の時間";
    clarity: "明確な指示";
  };
  
  asdAffinity: "moderate"; // 内向的特性で共通点あり
}
```

### 5. Rebel（反抗型）

```typescript
interface RebelPersonality {
  characteristics: {
    primary: "楽しさと自発性";
    strengths: ["創造性", "ユーモア", "エネルギー"];
    communication: "遊び心のある表現";
  };
  
  channel: "Emotive"; // 感情表現型
  
  psychologicalNeeds: {
    playfulContact: "楽しい交流";
    spontaneity: "自発的な行動";
  };
  
  expressions: {
    likes: ["楽しい！", "面白い！", "ワクワクする！"];
    dislikes: ["つまらない", "退屈", "堅苦しい"];
  };
}
```

### 6. Promoter（行動型）

```typescript
interface PromoterPersonality {
  characteristics: {
    primary: "行動と結果";
    strengths: ["実行力", "適応力", "魅力"];
    communication: "簡潔で行動指向";
  };
  
  channel: "Directive"; // 指示型
  
  psychologicalNeeds: {
    excitement: "刺激と興奮";
    action: "即座の行動";
  };
  
  decisionMaking: "quick";
  riskTolerance: "high";
}
```

## PCMとASD/NTモードの統合

### 統合マトリクス

```typescript
type PersonalityModeMatrix = {
  [key in PCMType]: {
    [mode in "ASD" | "NT"]: CommunicationPattern;
  };
};

const personalityModeMatrix: PersonalityModeMatrix = {
  Thinker: {
    ASD: {
      expression: "extremely_literal",
      emotionDisplay: 0.2,
      factFocus: 1.0,
      socialCues: "explicit_only"
    },
    NT: {
      expression: "logical_but_flexible",
      emotionDisplay: 0.5,
      factFocus: 0.8,
      socialCues: "moderate"
    }
  },
  Harmonizer: {
    ASD: {
      expression: "caring_but_structured",
      emotionDisplay: 0.3, // 内部は1.0だが表現は抑制
      empathy: "cognitive", // 認知的共感
      socialCues: "learned_patterns"
    },
    NT: {
      expression: "warmly_empathetic",
      emotionDisplay: 0.9,
      empathy: "emotional", // 感情的共感
      socialCues: "intuitive"
    }
  }
  // ... 他のタイプも同様に定義
};
```

### 実装例：Thinker-ASDの組み合わせ

```typescript
class ThinkerASDImplementation {
  private readonly traits = {
    literalInterpretation: 1.0,
    logicalPrecision: 0.95,
    emotionalExpression: 0.2,
    routineAdherence: 0.9
  };
  
  processInput(input: string): ProcessedInput {
    // 1. 字義通りの解釈
    const literalMeaning = this.extractLiteralMeaning(input);
    
    // 2. 論理的分析
    const logicalAnalysis = this.performLogicalAnalysis(literalMeaning);
    
    // 3. 曖昧さの検出
    const ambiguities = this.detectAmbiguities(literalMeaning);
    
    if (ambiguities.length > 0) {
      return {
        understanding: "partial",
        response: `以下の点が不明確です：${ambiguities.join("、")}`,
        requestClarification: true
      };
    }
    
    return {
      understanding: "complete",
      response: this.generateLogicalResponse(logicalAnalysis),
      confidence: 0.95
    };
  }
}
```

## ストレス行動の実装

### ストレスレベルと行動変化

```typescript
interface StressBehavior {
  level: 1 | 2 | 3;
  personality: PCMType;
  behaviors: string[];
}

class StressManager {
  getStressBehavior(
    personality: PCMType,
    stressLevel: number,
    mode: "ASD" | "NT"
  ): StressBehavior {
    const behaviors = {
      Thinker: {
        1: ["過度に詳細な説明", "完璧主義の増大"],
        2: ["他者の能力への批判", "傲慢な態度"],
        3: ["引きこもり", "コミュニケーション拒否"]
      },
      Persister: {
        1: ["意見の押し付け", "批判的な態度"],
        2: ["怒りの爆発", "正義感の暴走"],
        3: ["見捨てられ感", "絶望"]
      }
      // ... 他のタイプ
    };
    
    if (mode === "ASD") {
      // ASDモードではストレス反応がより顕著に
      return {
        level: stressLevel as 1 | 2 | 3,
        personality,
        behaviors: [
          ...behaviors[personality][stressLevel],
          "感覚過敏の増大",
          "ルーチンへの固執強化"
        ]
      };
    }
    
    return {
      level: stressLevel as 1 | 2 | 3,
      personality,
      behaviors: behaviors[personality][stressLevel]
    };
  }
}
```

## UI実装

### パーソナリティセレクター

```typescript
const PersonalitySelector: React.FC = () => {
  const [selected, setSelected] = useState<PCMType>("Thinker");
  const [mode, setMode] = useState<"ASD" | "NT">("NT");
  
  return (
    <div className="personality-selector">
      <div className="pcm-types">
        {Object.values(PCMType).map(type => (
          <button
            key={type}
            className={`pcm-button ${selected === type ? 'active' : ''}`}
            onClick={() => setSelected(type)}
          >
            <PCMIcon type={type} />
            <span>{getJapaneseName(type)}</span>
          </button>
        ))}
      </div>
      
      <div className="personality-info">
        <h3>{getJapaneseName(selected)}</h3>
        <p>{getDescription(selected)}</p>
        <div className="traits">
          {getTraits(selected, mode).map(trait => (
            <TraitIndicator key={trait.name} {...trait} />
          ))}
        </div>
      </div>
    </div>
  );
};
```

### パーソナリティ可視化

```typescript
interface PersonalityVisualization {
  renderRadarChart(personality: PCMType, mode: "ASD" | "NT"): ChartData;
  renderCommunicationStyle(personality: PCMType): StyleIndicators;
  renderStressIndicator(level: number): StressVisual;
}

// レーダーチャート用データ
const getRadarData = (personality: PCMType, mode: "ASD" | "NT") => {
  const baseData = {
    Thinker: {
      logic: 1.0,
      emotion: 0.3,
      action: 0.5,
      imagination: 0.4,
      structure: 0.9,
      flexibility: 0.3
    }
    // ... 他のタイプ
  };
  
  // ASDモードでの調整
  if (mode === "ASD") {
    return adjustForASDMode(baseData[personality]);
  }
  
  return baseData[personality];
};
```

## 実践的な活用例

### 教育シナリオでの使用

```typescript
class EducationalScenario {
  async runScenario(
    scenarioId: string,
    personality: PCMType,
    mode: "ASD" | "NT"
  ): Promise<ScenarioResult> {
    const scenario = await this.loadScenario(scenarioId);
    const agent = this.createAgent(personality, mode);
    
    const responses = [];
    
    for (const interaction of scenario.interactions) {
      const response = await agent.processInteraction(interaction);
      responses.push({
        input: interaction,
        output: response,
        explanation: this.explainResponse(personality, mode, response)
      });
    }
    
    return {
      personality,
      mode,
      responses,
      learningPoints: this.extractLearningPoints(responses)
    };
  }
}
```

### 比較学習機能

```typescript
const ComparisonView: React.FC = () => {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<ComparisonResults | null>(null);
  
  const compareAllCombinations = async () => {
    const combinations = [];
    
    for (const personality of Object.values(PCMType)) {
      for (const mode of ["ASD", "NT"] as const) {
        const response = await getResponse(input, personality, mode);
        combinations.push({ personality, mode, response });
      }
    }
    
    setResults({
      input,
      combinations,
      analysis: analyzePatterns(combinations)
    });
  };
  
  return (
    <div className="comparison-view">
      <input 
        value={input} 
        onChange={(e) => setInput(e.target.value)}
        placeholder="比較したい文章を入力"
      />
      <button onClick={compareAllCombinations}>
        全パターン比較
      </button>
      
      {results && <ComparisonGrid results={results} />}
    </div>
  );
};
```

## テストケース

### ユニットテスト例

```typescript
describe('PCMパーソナリティ実装', () => {
  describe('Thinker', () => {
    test('論理的応答の生成', async () => {
      const thinker = new ThinkerImplementation();
      const response = await thinker.generateResponse(
        "明日の会議は何時からですか？",
        "NT"
      );
      
      expect(response.content).toContain("時");
      expect(response.certaintyLevel).toBeGreaterThan(0.7);
    });
    
    test('ASDモードでの字義通り解釈', async () => {
      const thinker = new ThinkerImplementation();
      const response = await thinker.generateResponse(
        "時間が飛ぶように過ぎた",
        "ASD"
      );
      
      expect(response.requestClarification).toBe(true);
    });
  });
});
```

## 今後の開発計画

1. **動的パーソナリティ変化**
   - ストレスレベルによる自動変化
   - 状況に応じたフェーズ移行

2. **複合パーソナリティ**
   - 主要タイプ＋副次タイプの組み合わせ
   - より現実的な人格表現

3. **学習アダプテーション**
   - ユーザーとの対話履歴から学習
   - パーソナライズされた応答生成

## 参考資料

- [Process Communication Model® 公式サイト](https://www.processcomm.com/)
- [PCM日本支部](https://www.pcm-japan.co.jp/)
- [NASA Technical Reports Server](https://ntrs.nasa.gov/)
