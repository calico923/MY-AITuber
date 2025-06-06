# Phase 2: VRMモデル統合 タスクリスト

期間: 3週間（Day 22-42）

## Week 4-5: VRM実装

### Day 22-23: Three.js基盤構築
- [ ] Three.jsシーン初期化
  ```typescript
  // components/VRMViewer/Scene.tsx
  const setupScene = () => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // ライティング
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
  };
  ```
- [ ] レンダラー最適化
  - [ ] アンチエイリアス設定
  - [ ] シャドウマップ設定
  - [ ] ポストプロセッシング準備
- [ ] カメラシステム
  ```typescript
  class CameraController {
    setupCamera() {
      this.camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 20);
      this.camera.position.set(0, 1.5, 3);
    }
  }
  ```

### Day 24-25: VRMローダー実装
- [ ] @pixiv/three-vrm統合
  ```typescript
  import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
  
  const loadVRM = async (url: string): Promise<VRM> => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    
    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm as VRM;
    
    VRMUtils.rotateVRM0(vrm); // VRM0.0の回転を修正
    return vrm;
  };
  ```
- [ ] モデル管理システム
  - [ ] 複数モデル対応
  - [ ] モデル切り替え機能
  - [ ] プリロード機能
- [ ] エラーハンドリング
  - [ ] 読み込み失敗時のフォールバック
  - [ ] プログレス表示

### Day 26-27: 表情制御システム
- [ ] ブレンドシェイプ管理
  ```typescript
  class ExpressionController {
    private currentExpression: Record<string, number> = {};
    
    setExpression(name: string, value: number) {
      this.vrm.expressionManager?.setValue(name, value);
    }
    
    // プリセット表情
    presets = {
      happy: { happy: 1.0, eyeSquint: 0.3 },
      sad: { sad: 1.0, eyeWide: 0.2 },
      neutral: {}
    };
  }
  ```
- [ ] 表情トランジション
  - [ ] イージング関数
  - [ ] ブレンド時間管理
  - [ ] 複数表情の合成
- [ ] まばたきシステム
  ```typescript
  class BlinkController {
    private blinkInterval = 3000 + Math.random() * 4000;
    
    startBlinking() {
      setInterval(() => {
        this.blink();
      }, this.blinkInterval);
    }
  }
  ```

### Day 28-29: カメラ制御
- [ ] OrbitControls実装
  - [ ] マウス/タッチ操作
  - [ ] 制限付き回転
  - [ ] スムーズな動き
- [ ] カメラプリセット
  ```typescript
  const cameraPresets = {
    face: { position: [0, 1.5, 1.5], target: [0, 1.5, 0] },
    fullBody: { position: [0, 1, 3], target: [0, 1, 0] },
    side: { position: [2, 1.5, 0], target: [0, 1.5, 0] }
  };
  ```
- [ ] カメラアニメーション
  - [ ] スムーズな遷移
  - [ ] 自動フォーカス

## Week 6: アニメーション

### Day 30-31: 待機モーション
- [ ] 呼吸アニメーション実装
  ```typescript
  class IdleAnimation {
    breathe() {
      const breathSpeed = 0.001;
      this.vrm.humanoid.getRawBone('chest').rotation.x = 
        Math.sin(Date.now() * breathSpeed) * 0.02;
    }
  }
  ```
- [ ] 体の揺れ実装
  - [ ] 重心移動
  - [ ] 自然な揺らぎ
- [ ] 手の微細な動き
  - [ ] 指の動き
  - [ ] リラックスポーズ

### Day 32-33: 話すモーション
- [ ] ジェスチャーシステム
  ```typescript
  interface Gesture {
    name: string;
    keyframes: VRMPose[];
    duration: number;
  }
  
  class GestureController {
    playGesture(gesture: Gesture) {
      // キーフレーム間の補間
    }
  }
  ```
- [ ] 頭の動き
  - [ ] うなずき
  - [ ] 首かしげ
  - [ ] 視線追従
- [ ] 上半身アニメーション
  - [ ] 肩の動き
  - [ ] 腕のジェスチャー

### Day 34-35: 表情変化システム
- [ ] 感情⇔表情マッピング
  ```typescript
  const emotionToExpression = {
    joy: { happy: 0.8, eyeSquint: 0.3 },
    sadness: { sad: 0.7, eyeWide: 0.2 },
    surprise: { surprised: 1.0, eyeWide: 0.8 },
    neutral: { neutral: 1.0 }
  };
  ```
- [ ] 複合表情の実装
  - [ ] 微笑み＋困惑
  - [ ] 驚き＋喜び
- [ ] ASD/NT別表情強度
  ```typescript
  const getExpressionIntensity = (emotion: string, mode: 'ASD' | 'NT') => {
    const baseIntensity = emotionToExpression[emotion];
    return mode === 'ASD' 
      ? multiplyIntensity(baseIntensity, 0.3)  // 30%に抑制
      : baseIntensity;
  };
  ```

### Day 36-37: リップシンク準備
- [ ] 音素解析基盤
  ```typescript
  class PhonemAnalyzer {
    analyze(audioData: ArrayBuffer): Phoneme[] {
      // 音素抽出ロジック
      return phonemes;
    }
  }
  ```
- [ ] 口形状マッピング
  ```typescript
  const phonemeToMouth = {
    'a': { mouthOpen: 0.8, mouthWide: 0.2 },
    'i': { mouthOpen: 0.2, mouthWide: 0.6 },
    'u': { mouthOpen: 0.3, mouthRound: 0.8 },
    // その他の音素
  };
  ```
- [ ] タイミング同期システム
  - [ ] 音声との同期
  - [ ] 遅延補正
  - [ ] スムージング

### Day 38-39: パフォーマンス最適化
- [ ] レンダリング最適化
  - [ ] LOD（Level of Detail）実装
  - [ ] フラスタムカリング
  - [ ] インスタンシング活用
- [ ] メモリ管理
  ```typescript
  class ResourceManager {
    private textureCache = new Map();
    private geometryCache = new Map();
    
    dispose(resource: THREE.Object3D) {
      resource.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          child.material.dispose();
        }
      });
    }
  }
  ```
- [ ] アニメーション最適化
  - [ ] アニメーションミキサー管理
  - [ ] 不要な更新の削減

### Day 40-41: インテグレーション
- [ ] React統合強化
  ```typescript
  const VRMViewer = ({ modelUrl, mode }: Props) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [vrm, setVrm] = useState<VRM | null>(null);
    
    useEffect(() => {
      // Three.jsシーンの初期化とクリーンアップ
    }, []);
    
    return <div ref={mountRef} className="w-full h-full" />;
  };
  ```
- [ ] 状態管理との連携
  - [ ] Zustandストアとの接続
  - [ ] 表情/モーション状態の同期
- [ ] イベントシステム
  - [ ] カスタムイベント定義
  - [ ] イベントハンドラー管理

### Day 42: テストとドキュメント
- [ ] ユニットテスト作成
  ```typescript
  describe('VRMLoader', () => {
    test('should load VRM model', async () => {
      const vrm = await loadVRM('/test-model.vrm');
      expect(vrm).toBeDefined();
      expect(vrm.scene).toBeInstanceOf(THREE.Group);
    });
  });
  ```
- [ ] パフォーマンステスト
  - [ ] FPS計測
  - [ ] メモリ使用量監視
  - [ ] 負荷テスト
- [ ] ドキュメント作成
  - [ ] VRM統合ガイド
  - [ ] アニメーションAPI仕様
  - [ ] トラブルシューティング

## 成果物チェックリスト

### 必須成果物
- [ ] VRMモデルの表示
- [ ] 基本的な表情変化（喜び、悲しみ、驚き、中立）
- [ ] 待機・話すアニメーション
- [ ] カメラコントロール
- [ ] ASD/NT別の表情強度制御

### パフォーマンス目標
- [ ] 60 FPS維持（標準的なデバイス）
- [ ] 初回ロード時間 < 3秒
- [ ] メモリ使用量 < 200MB
- [ ] モバイルデバイス対応

### 品質基準
- [ ] エラーなくモデルが読み込まれる
- [ ] スムーズなアニメーション遷移
- [ ] 表情変化の自然さ
- [ ] カメラ操作の直感性

## リスクと対策

| リスク | 対策 |
|--------|------|
| VRMモデルの互換性問題 | 複数バージョン対応、フォールバック実装 |
| パフォーマンス低下 | LOD実装、最適化の継続的改善 |
| モバイル対応の困難さ | 段階的な機能制限、軽量版の検討 |
| アニメーションの不自然さ | モーションキャプチャデータの活用検討 |

## 次のフェーズへの準備

Phase 3（コア機能実装）に向けて：
- [ ] VRMとチャットシステムの連携設計
- [ ] 感情⇔表情マッピングの精緻化
- [ ] Python APIとの接続準備