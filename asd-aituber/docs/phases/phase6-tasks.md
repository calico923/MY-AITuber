# Phase 6: 品質向上とリリース準備 タスクリスト

期間: 4週間（Day 119-146）

## Week 19-20: テストと最適化

### Day 119-120: 統合テスト実装
- [ ] E2Eテストスイート作成
  ```typescript
  // cypress/e2e/full-user-journey.cy.ts
  describe('完全なユーザージャーニー', () => {
    it('新規ユーザーの初回体験フロー', () => {
      // 1. ランディングページ
      cy.visit('/');
      cy.get('[data-testid="hero-title"]').should('contain', 'ASD理解促進');
      cy.get('[data-testid="start-learning"]').click();
      
      // 2. オンボーディング
      cy.get('[data-testid="onboarding-modal"]').should('be.visible');
      cy.get('[data-testid="user-type-select"]').select('educator');
      cy.get('[data-testid="experience-level"]').select('beginner');
      cy.get('[data-testid="onboarding-next"]').click();
      
      // 3. プラットフォーム説明
      cy.get('[data-testid="platform-intro"]').should('be.visible');
      cy.get('[data-testid="mode-explanation"]').should('exist');
      cy.get('[data-testid="start-tutorial"]').click();
      
      // 4. インタラクティブチュートリアル
      cy.get('[data-testid="tutorial-step-1"]').should('be.visible');
      cy.get('[data-testid="mode-toggle-demo"]').click();
      cy.get('[data-testid="mode-indicator"]').should('contain', 'ASD');
      
      // 5. 最初のシナリオ体験
      cy.get('[data-testid="first-scenario"]').click();
      cy.get('[data-testid="scenario-player"]').should('be.visible');
      
      // シナリオ完了まで
      cy.completeScenario('scenario-001');
      
      // 6. 学習成果確認
      cy.get('[data-testid="completion-badge"]').should('be.visible');
      cy.get('[data-testid="learning-summary"]').should('contain', '理解度');
    });
    
    it('全10シナリオの連続プレイ', () => {
      cy.login('test-user');
      
      const scenarios = [
        'scenario-001', 'scenario-002', 'scenario-003',
        'scenario-004', 'scenario-005', 'scenario-006',
        'scenario-007', 'scenario-008', 'scenario-009',
        'scenario-010'
      ];
      
      scenarios.forEach((scenarioId, index) => {
        cy.get(`[data-testid="scenario-card-${scenarioId}"]`).click();
        cy.completeScenario(scenarioId);
        
        // 進捗確認
        cy.get('[data-testid="progress-bar"]')
          .should('have.attr', 'aria-valuenow', `${(index + 1) * 10}`);
      });
      
      // 全シナリオ完了
      cy.get('[data-testid="all-scenarios-complete"]').should('be.visible');
      cy.get('[data-testid="certificate-download"]').should('exist');
    });
  });
  ```
- [ ] API統合テスト
  ```typescript
  // tests/integration/api-flow.test.ts
  describe('API統合フロー', () => {
    let sessionId: string;
    
    beforeEach(() => {
      sessionId = generateSessionId();
    });
    
    test('完全な会話フロー', async () => {
      // 1. セッション開始
      const sessionResponse = await api.post('/api/v1/session/start', {
        mode: 'ASD',
        personality: 'Thinker'
      });
      expect(sessionResponse.status).toBe(200);
      
      // 2. メッセージ送信
      const messageResponse = await api.post('/api/v1/chat/message', {
        sessionId: sessionResponse.data.sessionId,
        message: '時間が飛ぶように過ぎました',
        mode: 'ASD'
      });
      
      expect(messageResponse.status).toBe(200);
      expect(messageResponse.data.response).toContain('時間が空中を移動');
      
      // 3. NLP解析確認
      const nlpResponse = await api.post('/api/v1/nlp/parse', {
        text: messageResponse.data.response,
        analyze_options: {
          morphological: true,
          detect_idioms: true
        }
      });
      
      expect(nlpResponse.data.idioms).toHaveLength(0); // ASDモードでは慣用句を使わない
      
      // 4. 感情分析
      const emotionResponse = await api.post('/api/v1/emotion/analyze', {
        text: messageResponse.data.response,
        mode: 'ASD'
      });
      
      expect(emotionResponse.data.external_expression.intensity).toBeLessThan(0.3);
      
      // 5. 音声合成
      const voiceResponse = await api.post('/api/v1/voice/synthesize', {
        text: messageResponse.data.response,
        speaker: 3,
        mode: 'ASD'
      });
      
      expect(voiceResponse.headers['content-type']).toBe('audio/wav');
    });
    
    test('モード切り替えの一貫性', async () => {
      const testMessage = '適当にやっておいて';
      
      // ASDモードでの応答
      const asdResponse = await api.post('/api/v1/chat/message', {
        message: testMessage,
        mode: 'ASD'
      });
      
      expect(asdResponse.data.response).toContain('具体的');
      expect(asdResponse.data.clarifications).toHaveLength(3);
      
      // NTモードでの応答
      const ntResponse = await api.post('/api/v1/chat/message', {
        message: testMessage,
        mode: 'NT'
      });
      
      expect(ntResponse.data.response).toContain('わかりました');
      expect(ntResponse.data.clarifications).toBeUndefined();
    });
  });
  ```
- [ ] WebSocket通信テスト
  ```typescript
  // tests/integration/websocket.test.ts
  describe('WebSocket通信テスト', () => {
    let client: Socket;
    
    beforeEach((done) => {
      client = io('http://localhost:3000');
      client.on('connect', done);
    });
    
    afterEach(() => {
      client.disconnect();
    });
    
    test('リアルタイムメッセージ送受信', (done) => {
      const testMessage = {
        text: 'こんにちは',
        mode: 'ASD',
        timestamp: Date.now()
      };
      
      client.on('response', (data) => {
        expect(data.text).toBeDefined();
        expect(data.emotion).toBeDefined();
        expect(data.processingTime).toBeLessThan(3000);
        done();
      });
      
      client.emit('message', testMessage);
    });
    
    test('接続の安定性', async () => {
      const messages = Array(50).fill(null).map((_, i) => ({
        text: `テストメッセージ${i}`,
        mode: i % 2 === 0 ? 'ASD' : 'NT'
      }));
      
      const responses = [];
      
      client.on('response', (data) => {
        responses.push(data);
      });
      
      // 連続送信
      for (const msg of messages) {
        client.emit('message', msg);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // 全メッセージの応答確認
      await new Promise(resolve => setTimeout(resolve, 5000));
      expect(responses).toHaveLength(50);
    });
  });
  ```

### Day 121-122: パフォーマンス最適化
- [ ] レンダリング最適化
  ```typescript
  class RenderingOptimizer {
    optimizeVRMRendering() {
      return {
        // LOD（Level of Detail）実装
        implementLOD: () => {
          const lodLevels = [
            { distance: 0, vertices: 10000 },    // 高詳細
            { distance: 5, vertices: 5000 },     // 中詳細
            { distance: 10, vertices: 2000 },    // 低詳細
            { distance: 20, vertices: 500 }      // 最低詳細
          ];
          
          return new THREE.LOD();
        },
        
        // フラスタムカリング最適化
        optimizeFrustumCulling: (scene: THREE.Scene) => {
          scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.frustumCulled = true;
              
              // バウンディングボックスの事前計算
              object.geometry.computeBoundingBox();
              object.geometry.computeBoundingSphere();
            }
          });
        },
        
        // インスタンシング活用
        useInstancing: (geometry: THREE.BufferGeometry, count: number) => {
          const mesh = new THREE.InstancedMesh(geometry, material, count);
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          return mesh;
        }
      };
    }
    
    optimizeWebPerformance() {
      return {
        // コード分割
        implementCodeSplitting: {
          routes: {
            '/': () => import('./pages/Home'),
            '/chat': () => import('./pages/Chat'),
            '/scenarios': () => import('./pages/Scenarios'),
            '/progress': () => import('./pages/Progress')
          },
          
          components: {
            VRMViewer: () => import('./components/VRMViewer'),
            ScenarioPlayer: () => import('./components/ScenarioPlayer'),
            EmotionChart: () => import('./components/EmotionChart')
          }
        },
        
        // バンドル最適化
        optimizeBundles: {
          vendor: ['react', 'react-dom', 'three'],
          common: ['zustand', 'axios', 'socket.io-client'],
          chunks: {
            maxAsyncRequests: 6,
            maxInitialRequests: 4,
            minSize: 20000
          }
        },
        
        // 画像最適化
        optimizeImages: {
          formats: ['webp', 'avif'],
          sizes: [640, 750, 828, 1080, 1200],
          quality: 85,
          lazy: true
        }
      };
    }
  }
  ```
- [ ] バンドルサイズ削減
  ```javascript
  // webpack.config.optimization.js
  module.exports = {
    optimization: {
      usedExports: true,
      minimize: true,
      sideEffects: false,
      
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          
          // Vendor chunks
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
            priority: 40,
            enforce: true
          },
          
          three: {
            name: 'three',
            test: /[\\/]node_modules[\\/](three|@pixiv\/three-vrm)[\\/]/,
            priority: 30,
            enforce: true
          },
          
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'lib',
            priority: 20,
            minChunks: 2
          },
          
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 10
          }
        }
      },
      
      // Tree shaking
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            parse: {
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
              drop_console: true,
              drop_debugger: true
            },
            mangle: {
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true,
            },
          },
        }),
      ],
    }
  };
  ```
- [ ] キャッシング実装
  ```typescript
  class CachingStrategy {
    implementServiceWorker() {
      // service-worker.ts
      const CACHE_NAME = 'asd-aituber-v1';
      const urlsToCache = [
        '/',
        '/static/css/main.css',
        '/static/js/bundle.js',
        '/models/default.vrm',
        '/api/v1/scenarios/list'
      ];
      
      self.addEventListener('install', event => {
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
        );
      });
      
      self.addEventListener('fetch', event => {
        event.respondWith(
          caches.match(event.request)
            .then(response => {
              // キャッシュがあればそれを返す
              if (response) {
                return response;
              }
              
              // ネットワークから取得
              return fetch(event.request).then(response => {
                // 200系のレスポンスのみキャッシュ
                if (!response || response.status !== 200) {
                  return response;
                }
                
                const responseToCache = response.clone();
                
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseToCache);
                  });
                
                return response;
              });
            })
        );
      });
    }
    
    implementAPICache() {
      return new LRUCache({
        max: 500,
        ttl: 1000 * 60 * 5, // 5分
        
        // キャッシュキー生成
        keyGenerator: (endpoint: string, params: any) => {
          return `${endpoint}:${JSON.stringify(params)}`;
        },
        
        // キャッシュ可能な判定
        isCacheable: (response: any) => {
          return response.status === 200 && 
                 !response.headers['x-no-cache'];
        }
      });
    }
  }
  ```

### Day 123-124: アクセシビリティ検証
- [ ] WCAG準拠確認
  ```typescript
  // tests/accessibility/wcag-compliance.test.ts
  describe('WCAG 2.1 Level AA準拠テスト', () => {
    test('1.1 テキストの代替', async () => {
      const { container } = render(<App />);
      
      // すべての画像に代替テキスト
      const images = container.querySelectorAll('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
        expect(img.getAttribute('alt')).not.toBe('');
      });
      
      // 装飾的な画像は空のalt
      const decorativeImages = container.querySelectorAll('img[role="presentation"]');
      decorativeImages.forEach(img => {
        expect(img.getAttribute('alt')).toBe('');
      });
    });
    
    test('1.4.3 コントラスト（最小）', async () => {
      const results = await checkContrast(document.body);
      
      results.forEach(result => {
        if (result.fontSize >= 18 || (result.fontSize >= 14 && result.bold)) {
          // 大きいテキスト
          expect(result.ratio).toBeGreaterThanOrEqual(3.0);
        } else {
          // 通常のテキスト
          expect(result.ratio).toBeGreaterThanOrEqual(4.5);
        }
      });
    });
    
    test('2.1 キーボードアクセス可能', async () => {
      const { container } = render(<App />);
      
      // すべてのインタラクティブ要素がフォーカス可能
      const interactiveElements = container.querySelectorAll(
        'button, a, input, select, textarea, [tabindex]'
      );
      
      interactiveElements.forEach(element => {
        element.focus();
        expect(document.activeElement).toBe(element);
      });
      
      // フォーカストラップのテスト
      const modal = screen.getByRole('dialog');
      const focusableInModal = getFocusableElements(modal);
      
      // Tabキーでのナビゲーション
      focusableInModal[focusableInModal.length - 1].focus();
      fireEvent.keyDown(document.activeElement, { key: 'Tab' });
      expect(document.activeElement).toBe(focusableInModal[0]);
    });
    
    test('3.1 ページの言語', () => {
      expect(document.documentElement).toHaveAttribute('lang', 'ja');
    });
    
    test('4.1.2 名前、役割、値', async () => {
      const { container } = render(<App />);
      
      // カスタムコンポーネントの適切なARIA
      const customButton = container.querySelector('[data-testid="mode-toggle"]');
      expect(customButton).toHaveAttribute('role', 'switch');
      expect(customButton).toHaveAttribute('aria-checked');
      expect(customButton).toHaveAttribute('aria-label');
    });
  });
  ```
- [ ] スクリーンリーダーテスト
  ```typescript
  class ScreenReaderTesting {
    async testWithNVDA() {
      const tests = [
        {
          name: 'ページ構造の読み上げ',
          steps: [
            'Hキーで見出しナビゲーション',
            'Rキーでリージョンナビゲーション',
            'Lキーでリストナビゲーション'
          ],
          expected: [
            '主要な見出しが適切に読み上げられる',
            'main, nav, asideなどのランドマークが識別される',
            'リスト項目数が通知される'
          ]
        },
        {
          name: 'フォーム操作',
          steps: [
            'Fキーでフォーム要素へ移動',
            'ラベルとヘルプテキストの確認',
            'エラーメッセージの通知'
          ],
          expected: [
            'すべての入力フィールドにラベルが関連付けられている',
            'aria-describedbyでヘルプテキストが読み上げられる',
            'エラー時にaria-liveで通知される'
          ]
        },
        {
          name: '動的コンテンツ',
          steps: [
            'チャットメッセージの送受信',
            'モード切り替え',
            'プログレス更新'
          ],
          expected: [
            '新しいメッセージがaria-liveで通知される',
            'モード変更が明確に通知される',
            '進捗状況がaria-valuenowで更新される'
          ]
        }
      ];
      
      return tests;
    }
    
    implementAriaLiveRegions() {
      return {
        // ステータスメッセージ
        StatusMessage: ({ message, type }) => (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`status-message ${type}`}
          >
            {message}
          </div>
        ),
        
        // アラート
        Alert: ({ message, severity }) => (
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className={`alert alert-${severity}`}
          >
            {message}
          </div>
        ),
        
        // プログレス通知
        ProgressAnnouncement: ({ current, total }) => (
          <div
            role="progressbar"
            aria-valuenow={current}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label="学習進捗"
          >
            <span className="sr-only">
              {total}個中{current}個完了
            </span>
          </div>
        )
      };
    }
  }
  ```
- [ ] キーボード操作確認
  ```typescript
  // tests/accessibility/keyboard-navigation.test.ts
  describe('キーボードナビゲーション', () => {
    test('ショートカットキー動作', async () => {
      render(<App />);
      
      // グローバルショートカット
      fireEvent.keyDown(document.body, { key: 'h', ctrlKey: true });
      expect(screen.getByRole('dialog', { name: 'ヘルプ' })).toBeVisible();
      
      fireEvent.keyDown(document.body, { key: 'm', altKey: true });
      expect(screen.getByTestId('mode-indicator')).toHaveTextContent('ASD');
      
      // Escapeでダイアログを閉じる
      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    
    test('フォーカス管理', async () => {
      const { container } = render(<App />);
      
      // フォーカストラップ
      const openModalButton = screen.getByText('シナリオを開く');
      openModalButton.click();
      
      const modal = screen.getByRole('dialog');
      const focusableElements = getFocusableElements(modal);
      
      // 最初の要素にフォーカス
      expect(document.activeElement).toBe(focusableElements[0]);
      
      // Tabでの循環
      focusableElements[focusableElements.length - 1].focus();
      fireEvent.keyDown(document.activeElement, { key: 'Tab' });
      expect(document.activeElement).toBe(focusableElements[0]);
      
      // Shift+Tabでの逆循環
      focusableElements[0].focus();
      fireEvent.keyDown(document.activeElement, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(focusableElements[focusableElements.length - 1]);
    });
    
    test('スキップリンク', async () => {
      render(<App />);
      
      // Tabキーで最初のフォーカス
      fireEvent.keyDown(document.body, { key: 'Tab' });
      
      const skipLink = screen.getByText('メインコンテンツへスキップ');
      expect(document.activeElement).toBe(skipLink);
      
      // Enterでスキップ
      fireEvent.keyDown(skipLink, { key: 'Enter' });
      expect(document.activeElement?.id).toBe('main-content');
    });
  });
  ```

### Day 125-126: セキュリティ監査
- [ ] 脆弱性スキャン
  ```bash
  # セキュリティ監査スクリプト
  #!/bin/bash
  
  echo "=== セキュリティ監査開始 ==="
  
  # 1. 依存関係の脆弱性チェック
  echo "依存関係の脆弱性チェック..."
  npm audit
  pnpm audit
  pip-audit
  
  # 2. OWASP ZAPによる動的スキャン
  echo "動的セキュリティスキャン..."
  docker run -t owasp/zap2docker-stable zap-baseline.py \
    -t http://localhost:3000 \
    -r security-report.html
  
  # 3. ソースコードの静的解析
  echo "ソースコード解析..."
  # ESLint セキュリティプラグイン
  npx eslint . --ext .ts,.tsx,.js,.jsx \
    --plugin security \
    --rule 'security/detect-object-injection: error'
  
  # Bandit (Python)
  bandit -r apps/api -f json -o bandit-report.json
  
  # 4. シークレットスキャン
  echo "シークレットスキャン..."
  trufflehog filesystem . --json > secrets-scan.json
  
  # 5. Dockerイメージスキャン
  echo "Dockerイメージスキャン..."
  docker scan asd-aituber/web:latest
  docker scan asd-aituber/api:latest
  
  echo "=== セキュリティ監査完了 ==="
  ```
- [ ] ペネトレーションテスト
  ```typescript
  // tests/security/penetration.test.ts
  describe('セキュリティテスト', () => {
    test('XSS対策', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>'
      ];
      
      for (const payload of xssPayloads) {
        const response = await api.post('/api/v1/chat/message', {
          message: payload,
          mode: 'ASD'
        });
        
        // レスポンスにスクリプトが含まれないこと
        expect(response.data.response).not.toContain('<script>');
        expect(response.data.response).not.toContain('onerror=');
        expect(response.data.response).not.toContain('javascript:');
        
        // DOMに挿入されてもサニタイズされること
        const div = document.createElement('div');
        div.innerHTML = response.data.response;
        expect(div.querySelector('script')).toBeNull();
      }
    });
    
    test('SQLインジェクション対策', async () => {
      const sqlPayloads = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1' UNION SELECT * FROM users--"
      ];
      
      for (const payload of sqlPayloads) {
        const response = await api.get(`/api/v1/user/search?q=${payload}`);
        
        // エラーが返らない（適切にエスケープされている）
        expect(response.status).toBe(200);
        expect(response.data).not.toContain('SQL');
        expect(response.data).not.toContain('syntax error');
      }
    });
    
    test('認証バイパス試行', async () => {
      // JWTトークンの改ざん
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const tamperedToken = validToken.slice(0, -10) + 'tampered';
      
      const response = await api.get('/api/v1/protected', {
        headers: {
          'Authorization': `Bearer ${tamperedToken}`
        }
      });
      
      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Invalid token');
    });
    
    test('レート制限', async () => {
      const requests = Array(100).fill(null).map(() => 
        api.post('/api/v1/chat/message', {
          message: 'test',
          mode: 'ASD'
        })
      );
      
      const results = await Promise.allSettled(requests);
      const rateLimited = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );
      
      expect(rateLimited.length).toBeGreaterThan(80); // 80%以上がレート制限
    });
  });
  ```
- [ ] APIセキュリティ
  ```typescript
  // セキュリティミドルウェア実装
  class SecurityMiddleware {
    // CSRFトークン
    implementCSRF() {
      return csrf({
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        }
      });
    }
    
    // ヘッダーセキュリティ
    implementSecurityHeaders() {
      return helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "https://api.voicevox.com"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
          }
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      });
    }
    
    // 入力検証
    implementInputValidation() {
      return {
        message: [
          body('message').isString().trim().escape(),
          body('message').isLength({ min: 1, max: 1000 }),
          body('message').matches(/^[^<>]*$/), // HTMLタグ禁止
        ],
        
        mode: [
          body('mode').isIn(['ASD', 'NT']),
        ],
        
        personality: [
          body('personality').optional().isIn(Object.values(PCMType)),
        ]
      };
    }
  }
  ```

## Week 21-22: パイロット版準備

### Day 127-128: ドキュメント整備
- [ ] ユーザーマニュアル作成
  ```markdown
  # ASD理解促進プラットフォーム ユーザーマニュアル
  
  ## 目次
  
  1. はじめに
     - プラットフォームの目的
     - 対象ユーザー
     - 必要な環境
  
  2. 基本操作
     - アカウント作成
     - ログイン/ログアウト
     - ホーム画面の説明
  
  3. 学習機能
     - シナリオ学習
     - フリーチャット
     - 学習進捗の確認
  
  4. ASD/NTモード
     - モードの違い
     - 切り替え方法
     - 各モードの特徴
  
  5. パーソナリティ設定
     - PCMタイプの選択
     - 各タイプの特徴
     - カスタマイズ
  
  6. アクセシビリティ
     - キーボード操作
     - スクリーンリーダー対応
     - 表示設定
  
  7. トラブルシューティング
     - よくある質問
     - エラーメッセージ一覧
     - お問い合わせ
  
  ## 詳細ガイド
  
  ### 1. はじめに
  
  #### 1.1 プラットフォームの目的
  
  本プラットフォームは、定型発達（NT）の方々がASD（自閉症スペクトラム障害）の
  コミュニケーション特性を体験的に理解することを目的としています。
  
  **重要な注意事項：**
  - これは教育目的のシミュレーションです
  - ASDの方々の特性は個人差が大きいです
  - ここで示される例は一つの可能性に過ぎません
  
  #### 1.2 対象ユーザー
  
  - 教育関係者
  - 保護者
  - 支援者
  - ASDについて理解を深めたい方
  
  ### 2. 基本操作
  
  #### 2.1 初回起動
  
  1. ブラウザで https://asd-aituber.example.com にアクセス
  2. 「始める」ボタンをクリック
  3. 簡単なアンケートに回答（スキップ可能）
  4. チュートリアルを完了
  
  #### 2.2 メイン画面
  
  [画面キャプチャ]
  
  - ① ナビゲーションメニュー
  - ② モード切り替えボタン
  - ③ チャットエリア
  - ④ VRMアバター表示
  - ⑤ 感情メーター
  
  ### 3. シナリオ学習
  
  #### 3.1 シナリオの選択
  
  1. メニューから「シナリオ」を選択
  2. カテゴリまたは難易度で絞り込み
  3. 学習したいシナリオをクリック
  
  #### 3.2 シナリオの進行
  
  **ステップ1: 状況説明**
  - 背景情報を確認
  - 登場人物を理解
  
  **ステップ2: 発話の提示**
  - 実際の発話を確認
  - 予測を入力（任意）
  
  **ステップ3: 解釈の比較**
  - ASDモードの解釈
  - NTモードの解釈
  - 違いの説明
  
  **ステップ4: 学習ポイント**
  - なぜ違いが生じるか
  - 相互理解のヒント
  
  ### トラブルシューティング
  
  #### よくある質問
  
  **Q: 音声が再生されない**
  A: 以下を確認してください：
  - ブラウザの音声許可設定
  - デバイスの音量設定
  - VOICEVOXの接続状態
  
  **Q: VRMモデルが表示されない**
  A: WebGL対応ブラウザを使用してください。
  Chrome、Firefox、Safariの最新版を推奨します。
  
  **Q: 応答が遅い**
  A: ネットワーク接続を確認してください。
  混雑時は多少時間がかかる場合があります。
  ```
- [ ] API仕様書更新
  ```yaml
  # openapi.yaml
  openapi: 3.0.0
  info:
    title: ASD-AITuber API
    version: 1.0.0
    description: |
      ASD理解促進教育プラットフォームのAPI仕様書
      
      ## 認証
      現在はセッションベース認証を使用。
      将来的にJWT認証への移行を予定。
      
      ## レート制限
      - 一般エンドポイント: 60 req/min
      - チャットエンドポイント: 20 req/min
      - 音声合成: 10 req/min
  
  servers:
    - url: https://api.asd-aituber.example.com/v1
      description: Production
    - url: http://localhost:8000/api/v1
      description: Development
  
  paths:
    /chat/message:
      post:
        summary: チャットメッセージ送信
        tags:
          - Chat
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ChatMessageRequest'
        responses:
          '200':
            description: 成功
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/ChatMessageResponse'
          '400':
            $ref: '#/components/responses/BadRequest'
          '429':
            $ref: '#/components/responses/RateLimitExceeded'
  
    /emotion/analyze:
      post:
        summary: 感情分析
        tags:
          - Analysis
        requestBody:
          required: true
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EmotionAnalysisRequest'
        responses:
          '200':
            description: 成功
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/EmotionAnalysisResponse'
  
  components:
    schemas:
      ChatMessageRequest:
        type: object
        required:
          - message
          - mode
        properties:
          message:
            type: string
            minLength: 1
            maxLength: 1000
            description: ユーザーからのメッセージ
          mode:
            type: string
            enum: [ASD, NT]
            description: 会話モード
          personality:
            type: string
            enum: [Thinker, Persister, Harmonizer, Imaginer, Rebel, Promoter]
            description: PCMパーソナリティタイプ（オプション）
          sessionId:
            type: string
            format: uuid
            description: セッションID
  ```
- [ ] 運用マニュアル
  ```markdown
  # 運用マニュアル
  
  ## システム構成
  
  ### インフラストラクチャ
  ```
  Load Balancer (Nginx)
       |
  +----+----+----+
  |    |    |    |
  Web1 Web2 Web3 (Next.js)
       |
  +----+----+
  |         |
  API1     API2 (Node.js)
       |
  Python API (FastAPI)
       |
  +----+----+
  |         |
  Redis   PostgreSQL
  ```
  
  ### サービス一覧
  
  | サービス | ポート | 用途 |
  |---------|--------|------|
  | Nginx | 80/443 | ロードバランサー |
  | Next.js | 3000-3002 | Webフロントエンド |
  | Node.js API | 8080-8081 | メインAPI |
  | Python API | 8000 | NLP処理 |
  | Redis | 6379 | キャッシュ |
  | PostgreSQL | 5432 | データベース |
  | VOICEVOX | 50021 | 音声合成 |
  
  ## 運用手順
  
  ### 日次運用
  
  1. **ヘルスチェック（9:00）**
     ```bash
     ./scripts/health-check.sh
     ```
  
  2. **ログ確認**
     ```bash
     ./scripts/check-logs.sh --date today
     ```
  
  3. **メトリクス確認**
     - CPU使用率
     - メモリ使用率
     - レスポンスタイム
     - エラー率
  
  ### 週次運用
  
  1. **バックアップ確認**
     ```bash
     ./scripts/verify-backups.sh
     ```
  
  2. **セキュリティアップデート**
     ```bash
     ./scripts/security-updates.sh
     ```
  
  3. **パフォーマンスレポート作成**
  
  ### 月次運用
  
  1. **脆弱性スキャン**
  2. **容量計画の見直し**
  3. **災害復旧訓練**
  
  ## トラブルシューティング
  
  ### Case 1: レスポンス遅延
  
  **症状**: API応答が3秒以上
  
  **確認手順**:
  1. 各サービスのCPU/メモリ確認
  2. データベースのスロークエリ確認
  3. ネットワーク遅延確認
  
  **対処**:
  - スケールアウト実行
  - キャッシュ有効化
  - クエリ最適化
  
  ### Case 2: 接続エラー
  
  **症状**: WebSocket接続失敗
  
  **確認手順**:
  1. Nginxログ確認
  2. Socket.IOサーバー状態確認
  3. ファイアウォール設定確認
  
  ### デプロイメント手順
  
  ```bash
  # 1. 事前チェック
  ./scripts/pre-deploy-check.sh
  
  # 2. Blue-Greenデプロイ
  ./scripts/deploy.sh --strategy blue-green --version v1.2.3
  
  # 3. ヘルスチェック
  ./scripts/post-deploy-check.sh
  
  # 4. 切り替え
  ./scripts/switch-traffic.sh --to green
  
  # 5. 旧環境停止
  ./scripts/stop-old-env.sh --env blue
  ```
  
  ## 監視設定
  
  ### アラート設定
  
  | メトリクス | 閾値 | アクション |
  |-----------|------|-----------|
  | CPU使用率 | > 80% | スケールアウト |
  | メモリ使用率 | > 85% | 調査・対応 |
  | エラー率 | > 1% | 即時対応 |
  | レスポンスタイム | > 3秒 | 調査開始 |
  ```

### Day 129-130: デプロイメント設定
- [ ] 本番環境構築
  ```yaml
  # docker-compose.production.yml
  version: '3.8'
  
  services:
    nginx:
      image: nginx:alpine
      volumes:
        - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
        - ./nginx/ssl:/etc/nginx/ssl:ro
      ports:
        - "80:80"
        - "443:443"
      depends_on:
        - web
        - api
      restart: always
  
    web:
      image: asd-aituber/web:${VERSION:-latest}
      environment:
        - NODE_ENV=production
        - NEXT_PUBLIC_API_URL=https://api.asd-aituber.example.com
      deploy:
        replicas: 3
        update_config:
          parallelism: 1
          delay: 10s
          order: start-first
        restart_policy:
          condition: any
          delay: 5s
          max_attempts: 3
      healthcheck:
        test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
        interval: 30s
        timeout: 10s
        retries: 3
  
    api:
      image: asd-aituber/api:${VERSION:-latest}
      environment:
        - NODE_ENV=production
        - DATABASE_URL=${DATABASE_URL}
        - REDIS_URL=${REDIS_URL}
      deploy:
        replicas: 2
        restart_policy:
          condition: any
      depends_on:
        - redis
        - postgres
  
    python-api:
      image: asd-aituber/python-api:${VERSION:-latest}
      deploy:
        replicas: 2
      environment:
        - ENVIRONMENT=production
  
    redis:
      image: redis:7-alpine
      volumes:
        - redis-data:/data
      command: redis-server --appendonly yes
      restart: always
  
    postgres:
      image: postgres:15-alpine
      environment:
        - POSTGRES_DB=asd_aituber
        - POSTGRES_USER=${DB_USER}
        - POSTGRES_PASSWORD=${DB_PASSWORD}
      volumes:
        - postgres-data:/var/lib/postgresql/data
      restart: always
  
  volumes:
    redis-data:
    postgres-data:
  ```
- [ ] CI/CDパイプライン
  ```yaml
  # .github/workflows/deploy.yml
  name: Deploy to Production
  
  on:
    push:
      tags:
        - 'v*'
  
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        
        - name: Setup Node.js
          uses: actions/setup-node@v3
          with:
            node-version: '20'
            
        - name: Setup Python
          uses: actions/setup-python@v4
          with:
            python-version: '3.11'
            
        - name: Install dependencies
          run: |
            npm install -g pnpm
            pnpm install
            cd apps/api && pip install -r requirements.txt
            
        - name: Run tests
          run: |
            pnpm test:ci
            cd apps/api && pytest
            
        - name: Run E2E tests
          run: pnpm test:e2e:ci
  
    build:
      needs: test
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        
        - name: Set up Docker Buildx
          uses: docker/setup-buildx-action@v2
          
        - name: Login to Docker Hub
          uses: docker/login-action@v2
          with:
            username: ${{ secrets.DOCKER_USERNAME }}
            password: ${{ secrets.DOCKER_PASSWORD }}
            
        - name: Build and push Web
          uses: docker/build-push-action@v4
          with:
            context: ./apps/web
            push: true
            tags: |
              asd-aituber/web:latest
              asd-aituber/web:${{ github.ref_name }}
            cache-from: type=registry,ref=asd-aituber/web:buildcache
            cache-to: type=registry,ref=asd-aituber/web:buildcache,mode=max
            
        - name: Build and push API
          uses: docker/build-push-action@v4
          with:
            context: ./apps/api
            push: true
            tags: |
              asd-aituber/api:latest
              asd-aituber/api:${{ github.ref_name }}
  
    deploy:
      needs: build
      runs-on: ubuntu-latest
      steps:
        - name: Deploy to production
          uses: appleboy/ssh-action@v0.1.5
          with:
            host: ${{ secrets.PROD_HOST }}
            username: ${{ secrets.PROD_USER }}
            key: ${{ secrets.PROD_SSH_KEY }}
            script: |
              cd /opt/asd-aituber
              git pull origin main
              export VERSION=${{ github.ref_name }}
              docker-compose -f docker-compose.production.yml pull
              docker-compose -f docker-compose.production.yml up -d --no-deps --scale web=3
              ./scripts/health-check.sh --wait
              
        - name: Notify deployment
          uses: 8398a7/action-slack@v3
          with:
            status: ${{ job.status }}
            text: 'Deployment to production completed'
          if: always()
  ```
- [ ] 監視設定
  ```typescript
  // monitoring/setup.ts
  class MonitoringSetup {
    setupPrometheus() {
      return {
        // prometheus.yml
        global: {
          scrape_interval: '15s',
          evaluation_interval: '15s'
        },
        
        scrape_configs: [
          {
            job_name: 'node_exporter',
            static_configs: [
              { targets: ['localhost:9100'] }
            ]
          },
          {
            job_name: 'web_app',
            static_configs: [
              { targets: ['web1:3000', 'web2:3000', 'web3:3000'] }
            ]
          },
          {
            job_name: 'api',
            static_configs: [
              { targets: ['api1:8080', 'api2:8080'] }
            ]
          }
        ],
        
        alerting: {
          alertmanagers: [
            {
              static_configs: [
                { targets: ['alertmanager:9093'] }
              ]
            }
          ]
        }
      };
    }
    
    setupGrafanaDashboards() {
      return [
        {
          name: 'System Overview',
          panels: [
            {
              title: 'CPU Usage',
              query: 'rate(process_cpu_seconds_total[5m]) * 100'
            },
            {
              title: 'Memory Usage',
              query: 'process_resident_memory_bytes / 1024 / 1024'
            },
            {
              title: 'Request Rate',
              query: 'rate(http_requests_total[5m])'
            },
            {
              title: 'Response Time',
              query: 'histogram_quantile(0.95, http_request_duration_seconds_bucket)'
            }
          ]
        },
        {
          name: 'Application Metrics',
          panels: [
            {
              title: 'Active WebSocket Connections',
              query: 'websocket_connections_active'
            },
            {
              title: 'Message Processing Time',
              query: 'histogram_quantile(0.95, message_processing_duration_seconds_bucket)'
            },
            {
              title: 'Mode Distribution',
              query: 'sum by (mode) (conversation_mode_total)'
            },
            {
              title: 'Error Rate',
              query: 'rate(http_requests_total{status=~"5.."}[5m])'
            }
          ]
        }
      ];
    }
    
    setupAlerts() {
      return {
        groups: [
          {
            name: 'availability',
            rules: [
              {
                alert: 'ServiceDown',
                expr: 'up == 0',
                for: '2m',
                annotations: {
                  summary: 'Service {{ $labels.job }} is down'
                }
              },
              {
                alert: 'HighErrorRate',
                expr: 'rate(http_requests_total{status=~"5.."}[5m]) > 0.05',
                for: '5m',
                annotations: {
                  summary: 'Error rate is above 5%'
                }
              }
            ]
          },
          {
            name: 'performance',
            rules: [
              {
                alert: 'HighResponseTime',
                expr: 'histogram_quantile(0.95, http_request_duration_seconds_bucket) > 3',
                for: '5m',
                annotations: {
                  summary: '95th percentile response time is above 3 seconds'
                }
              },
              {
                alert: 'HighCPUUsage',
                expr: 'rate(process_cpu_seconds_total[5m]) * 100 > 80',
                for: '10m',
                annotations: {
                  summary: 'CPU usage is above 80%'
                }
              }
            ]
          }
        ]
      };
    }
  }
  ```

### Day 131-132: フィードバックシステム
- [ ] フィードバックフォーム実装
  ```typescript
  const FeedbackForm: React.FC = () => {
    const [feedback, setFeedback] = useState<FeedbackData>({
      type: 'general',
      rating: 0,
      category: '',
      message: '',
      metadata: {}
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      try {
        // メタデータの追加
        const enrichedFeedback = {
          ...feedback,
          metadata: {
            ...feedback.metadata,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            sessionId: getSessionId(),
            currentMode: getCurrentMode(),
            scenarioId: getCurrentScenarioId()
          }
        };
        
        await api.post('/api/v1/feedback', enrichedFeedback);
        
        toast.success('フィードバックを送信しました。ありがとうございます！');
        onClose();
      } catch (error) {
        toast.error('送信に失敗しました。もう一度お試しください。');
      } finally {
        setIsSubmitting(false);
      }
    };
    
    return (
      <form onSubmit={handleSubmit} className="feedback-form">
        <h3>フィードバック</h3>
        
        <div className="form-group">
          <label>種類</label>
          <select
            value={feedback.type}
            onChange={(e) => setFeedback({ ...feedback, type: e.target.value })}
            required
          >
            <option value="">選択してください</option>
            <option value="general">全般的な感想</option>
            <option value="bug">不具合報告</option>
            <option value="feature">機能要望</option>
            <option value="content">コンテンツについて</option>
            <option value="accessibility">アクセシビリティ</option>
          </select>
        </div>
        
        {feedback.type === 'bug' && (
          <BugReportFields 
            onChange={(bugData) => setFeedback({ 
              ...feedback, 
              metadata: { ...feedback.metadata, ...bugData }
            })}
          />
        )}
        
        <div className="form-group">
          <label>評価</label>
          <StarRating
            value={feedback.rating}
            onChange={(rating) => setFeedback({ ...feedback, rating })}
          />
        </div>
        
        <div className="form-group">
          <label>カテゴリ</label>
          <select
            value={feedback.category}
            onChange={(e) => setFeedback({ ...feedback, category: e.target.value })}
          >
            <option value="">選択してください</option>
            <option value="ui">ユーザーインターフェース</option>
            <option value="learning">学習内容</option>
            <option value="technical">技術的な問題</option>
            <option value="other">その他</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>詳細</label>
          <textarea
            value={feedback.message}
            onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
            rows={5}
            required
            placeholder="ご意見・ご感想をお聞かせください"
          />
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? '送信中...' : '送信'}
          </button>
          <button 
            type="button" 
            onClick={onClose}
            className="btn-secondary"
          >
            キャンセル
          </button>
        </div>
      </form>
    );
  };
  ```
- [ ] 分析ダッシュボード
  ```typescript
  const FeedbackDashboard: React.FC = () => {
    const [feedbackData, setFeedbackData] = useState<FeedbackAnalytics | null>(null);
    const [filters, setFilters] = useState<FilterOptions>({
      dateRange: 'last7days',
      type: 'all',
      category: 'all'
    });
    
    useEffect(() => {
      loadFeedbackData();
    }, [filters]);
    
    const loadFeedbackData = async () => {
      const data = await api.get('/api/v1/admin/feedback/analytics', {
        params: filters
      });
      setFeedbackData(data.data);
    };
    
    if (!feedbackData) return <Loading />;
    
    return (
      <div className="feedback-dashboard">
        <h2>フィードバック分析</h2>
        
        <div className="filters">
          <DateRangePicker
            value={filters.dateRange}
            onChange={(dateRange) => setFilters({ ...filters, dateRange })}
          />
          
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="all">すべて</option>
            <option value="general">全般</option>
            <option value="bug">不具合</option>
            <option value="feature">要望</option>
          </select>
        </div>
        
        <div className="metrics-grid">
          <MetricCard
            title="総フィードバック数"
            value={feedbackData.totalCount}
            trend={feedbackData.trend}
          />
          
          <MetricCard
            title="平均評価"
            value={`${feedbackData.averageRating.toFixed(1)}/5`}
            icon={<Star />}
          />
          
          <MetricCard
            title="回答率"
            value={`${feedbackData.responseRate}%`}
            subtitle="24時間以内"
          />
        </div>
        
        <div className="charts">
          <div className="chart-container">
            <h3>日別フィードバック数</h3>
            <LineChart data={feedbackData.dailyCounts} />
          </div>
          
          <div className="chart-container">
            <h3>カテゴリ別分布</h3>
            <PieChart data={feedbackData.categoryDistribution} />
          </div>
          
          <div className="chart-container">
            <h3>評価分布</h3>
            <BarChart data={feedbackData.ratingDistribution} />
          </div>
        </div>
        
        <div className="feedback-list">
          <h3>最近のフィードバック</h3>
          <FeedbackTable 
            items={feedbackData.recentFeedback}
            onRespond={handleRespond}
          />
        </div>
        
        <div className="insights">
          <h3>インサイト</h3>
          <ul>
            {feedbackData.insights.map((insight, i) => (
              <li key={i} className={`insight ${insight.type}`}>
                {insight.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };
  ```
- [ ] 改善プロセス
  ```typescript
  class FeedbackImprovementProcess {
    async processFeedback(feedbackId: string): Promise<ImprovementAction> {
      const feedback = await this.getFeedback(feedbackId);
      
      // 1. 分類と優先度付け
      const classification = await this.classifyFeedback(feedback);
      const priority = this.calculatePriority(feedback, classification);
      
      // 2. 既存の課題との関連付け
      const relatedIssues = await this.findRelatedIssues(feedback);
      
      // 3. アクションの決定
      const action = this.determineAction(feedback, classification, priority);
      
      // 4. タスクの作成
      if (action.type === 'create_task') {
        const task = await this.createTask({
          title: action.taskTitle,
          description: this.generateTaskDescription(feedback),
          priority: priority,
          labels: classification.labels,
          relatedFeedback: [feedbackId, ...relatedIssues.map(i => i.feedbackId)]
        });
        
        // 5. 自動応答
        await this.sendAutoResponse(feedback, task);
      }
      
      // 6. 統計更新
      await this.updateStatistics(classification, action);
      
      return action;
    }
    
    private calculatePriority(
      feedback: Feedback,
      classification: Classification
    ): Priority {
      let score = 0;
      
      // 影響度
      if (classification.severity === 'high') score += 30;
      if (classification.frequency === 'common') score += 20;
      
      // ユーザーセグメント
      if (feedback.userSegment === 'educator') score += 10;
      if (feedback.userSegment === 'new_user') score += 15;
      
      // 感情スコア
      if (feedback.sentimentScore < -0.5) score += 20;
      
      // 評価
      if (feedback.rating <= 2) score += 25;
      
      if (score >= 70) return 'critical';
      if (score >= 50) return 'high';
      if (score >= 30) return 'medium';
      return 'low';
    }
    
    private async sendAutoResponse(feedback: Feedback, task: Task) {
      const templates = {
        bug: `フィードバックありがとうございます。
              報告いただいた不具合について確認し、
              タスク #${task.id} として対応を開始しました。
              進捗は随時お知らせいたします。`,
        
        feature: `貴重なご提案をありがとうございます。
                 いただいた機能要望は開発チームで検討し、
                 今後の改善に活かさせていただきます。`,
        
        general: `フィードバックをお寄せいただき、
                 ありがとうございます。
                 より良いサービスの提供に努めてまいります。`
      };
      
      const response = templates[feedback.type] || templates.general;
      
      await this.emailService.send({
        to: feedback.email,
        subject: 'フィードバックへの返信',
        body: response,
        metadata: {
          feedbackId: feedback.id,
          taskId: task.id
        }
      });
    }
  }
  ```

### Day 133-134: 限定公開準備
- [ ] ユーザー登録システム
  ```typescript
  // 限定公開用の招待システム
  class InvitationSystem {
    async createInvitation(data: InvitationData): Promise<Invitation> {
      const invitation = {
        id: generateId(),
        code: this.generateInviteCode(),
        email: data.email,
        role: data.role || 'pilot_user',
        maxUses: data.maxUses || 1,
        expiresAt: addDays(new Date(), 7),
        createdBy: data.createdBy,
        metadata: {
          userType: data.userType,
          organization: data.organization,
          purpose: data.purpose
        }
      };
      
      await this.db.invitations.create(invitation);
      await this.sendInvitationEmail(invitation);
      
      return invitation;
    }
    
    async validateInvitation(code: string): Promise<ValidationResult> {
      const invitation = await this.db.invitations.findByCode(code);
      
      if (!invitation) {
        return { valid: false, reason: 'invalid_code' };
      }
      
      if (invitation.usedCount >= invitation.maxUses) {
        return { valid: false, reason: 'max_uses_exceeded' };
      }
      
      if (new Date() > invitation.expiresAt) {
        return { valid: false, reason: 'expired' };
      }
      
      return { valid: true, invitation };
    }
    
    async registerWithInvitation(
      code: string,
      userData: UserRegistrationData
    ): Promise<User> {
      const validation = await this.validateInvitation(code);
      
      if (!validation.valid) {
        throw new Error(`Invalid invitation: ${validation.reason}`);
      }
      
      const user = await this.userService.create({
        ...userData,
        role: validation.invitation.role,
        metadata: {
          ...validation.invitation.metadata,
          invitationCode: code,
          registeredAt: new Date()
        }
      });
      
      // 招待の使用回数を更新
      await this.db.invitations.incrementUsage(code);
      
      // ウェルカムメール送信
      await this.sendWelcomeEmail(user, validation.invitation);
      
      return user;
    }
    
    private generateInviteCode(): string {
      return nanoid(10).toUpperCase();
    }
  }
  ```
- [ ] アクセス制御
  ```typescript
  // アクセス制御ミドルウェア
  class AccessControlMiddleware {
    checkPilotAccess() {
      return async (req: Request, res: Response, next: NextFunction) => {
        try {
          const user = req.user;
          
          if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
          }
          
          // パイロットユーザーチェック
          if (!this.isPilotUser(user)) {
            return res.status(403).json({ 
              error: 'Access restricted to pilot users',
              waitlist: true
            });
          }
          
          // 利用制限チェック
          const usage = await this.getUsage(user.id);
          if (usage.exceeded) {
            return res.status(429).json({
              error: 'Usage limit exceeded',
              limit: usage.limit,
              reset: usage.resetAt
            });
          }
          
          // アクセスログ記録
          await this.logAccess(user, req);
          
          next();
        } catch (error) {
          next(error);
        }
      };
    }
    
    private isPilotUser(user: User): boolean {
      return [
        'pilot_user',
        'educator',
        'researcher',
        'admin'
      ].includes(user.role);
    }
    
    async getUsage(userId: string): Promise<UsageInfo> {
      const period = 'daily';
      const limit = this.getLimitForUser(userId);
      
      const usage = await this.redis.get(`usage:${period}:${userId}`);
      const count = usage ? parseInt(usage) : 0;
      
      return {
        count,
        limit,
        exceeded: count >= limit,
        resetAt: this.getResetTime(period)
      };
    }
  }
  ```
- [ ] 利用規約・プライバシーポリシー
  ```markdown
  # 利用規約
  
  最終更新日: 2024年6月6日
  
  ## 1. はじめに
  
  本利用規約（以下「本規約」）は、ASD理解促進教育プラットフォーム
  （以下「本サービス」）の利用条件を定めるものです。
  
  ## 2. 定義
  
  - 「当社」: 本サービスの運営者
  - 「ユーザー」: 本サービスを利用する全ての方
  - 「コンテンツ」: 本サービス上の全ての情報、データ、テキスト、画像等
  
  ## 3. サービスの利用
  
  ### 3.1 利用資格
  - 13歳以上の方
  - 本規約に同意いただける方
  - 過去に利用停止処分を受けていない方
  
  ### 3.2 禁止事項
  - 本サービスの教育目的以外での使用
  - 他のユーザーへの迷惑行為
  - システムへの不正アクセス
  - コンテンツの無断転載・商用利用
  
  ## 4. 知的財産権
  
  本サービスのコンテンツの著作権は当社または正当な権利者に帰属します。
  
  ## 5. 免責事項
  
  ### 5.1 教育目的の限定
  本サービスは教育目的のシミュレーションであり、
  医学的診断や治療の代替となるものではありません。
  
  ### 5.2 個人差の認識
  ASDの特性は個人により大きく異なります。
  本サービスで示される例は一つの可能性に過ぎません。
  
  ## 6. プライバシー
  
  個人情報の取り扱いについては、
  別途定めるプライバシーポリシーに従います。
  
  ---
  
  # プライバシーポリシー
  
  ## 1. 収集する情報
  
  ### 1.1 ユーザー提供情報
  - メールアドレス
  - ユーザー名（ニックネーム可）
  - 所属（任意）
  - 利用目的（任意）
  
  ### 1.2 自動収集情報
  - IPアドレス
  - ブラウザ情報
  - アクセス日時
  - 利用状況（学習進捗等）
  
  ## 2. 情報の利用目的
  
  - サービスの提供・改善
  - ユーザーサポート
  - 統計データの作成（個人を特定しない形）
  - 研究目的（同意を得た場合のみ）
  
  ## 3. 情報の共有
  
  以下の場合を除き、第三者への提供は行いません：
  - ユーザーの同意がある場合
  - 法令に基づく場合
  - 統計データとして個人を特定できない形にした場合
  
  ## 4. セキュリティ
  
  - SSL/TLSによる通信暗号化
  - アクセス制御
  - 定期的なセキュリティ監査
  
  ## 5. お問い合わせ
  
  privacy@asd-aituber.example.com
  ```

### Day 135-140: 最終テストと調整
- [ ] 負荷テスト実施
  ```typescript
  // load-testing/scenarios.js
  import http from 'k6/http';
  import ws from 'k6/ws';
  import { check, sleep } from 'k6';
  
  export const options = {
    stages: [
      { duration: '2m', target: 50 },   // 50ユーザーまで徐々に増加
      { duration: '5m', target: 50 },   // 50ユーザーで維持
      { duration: '2m', target: 100 },  // 100ユーザーまで増加
      { duration: '5m', target: 100 },  // 100ユーザーで維持
      { duration: '2m', target: 200 },  // 200ユーザーまで増加
      { duration: '5m', target: 200 },  // 200ユーザーで維持
      { duration: '5m', target: 0 },    // 0まで減少
    ],
    thresholds: {
      http_req_duration: ['p(95)<3000'], // 95%が3秒以内
      http_req_failed: ['rate<0.01'],    // エラー率1%未満
      ws_connecting: ['p(95)<1000'],     // WebSocket接続95%が1秒以内
    },
  };
  
  export default function () {
    // シナリオ1: 通常の利用
    const normalUsage = () => {
      // ホームページアクセス
      const homeRes = http.get('https://asd-aituber.example.com');
      check(homeRes, {
        'home page loaded': (r) => r.status === 200,
      });
      
      sleep(2);
      
      // チャット画面へ
      const chatRes = http.get('https://asd-aituber.example.com/chat');
      check(chatRes, {
        'chat page loaded': (r) => r.status === 200,
      });
      
      // WebSocket接続
      const wsUrl = 'wss://asd-aituber.example.com/ws';
      const ws = ws.connect(wsUrl, {}, function (socket) {
        socket.on('open', () => {
          console.log('WebSocket connected');
          
          // メッセージ送信
          socket.send(JSON.stringify({
            type: 'message',
            data: {
              text: 'こんにちは',
              mode: 'ASD'
            }
          }));
        });
        
        socket.on('message', (data) => {
          const response = JSON.parse(data);
          check(response, {
            'received response': (r) => r.type === 'response',
          });
        });
        
        socket.setTimeout(() => {
          socket.close();
        }, 30000);
      });
    };
    
    // シナリオ2: API負荷
    const apiStress = () => {
      const requests = [
        {
          method: 'POST',
          url: 'https://api.asd-aituber.example.com/v1/emotion/analyze',
          body: JSON.stringify({
            text: 'テストメッセージ',
            mode: 'ASD'
          }),
          params: {
            headers: { 'Content-Type': 'application/json' },
          },
        },
        {
          method: 'POST',
          url: 'https://api.asd-aituber.example.com/v1/nlp/parse',
          body: JSON.stringify({
            text: '時間が飛ぶように過ぎた',
            analyze_options: { detect_idioms: true }
          }),
          params: {
            headers: { 'Content-Type': 'application/json' },
          },
        },
      ];
      
      const responses = http.batch(requests);
      responses.forEach((res) => {
        check(res, {
          'API response OK': (r) => r.status === 200,
          'API response time OK': (r) => r.timings.duration < 500,
        });
      });
    };
    
    // ランダムにシナリオを選択
    if (Math.random() < 0.7) {
      normalUsage();
    } else {
      apiStress();
    }
  }
  ```
- [ ] ユーザビリティテスト
  ```typescript
  // ユーザビリティテストシナリオ
  class UsabilityTestScenarios {
    scenarios = [
      {
        id: 'first-time-user',
        title: '初回利用者の体験',
        tasks: [
          {
            instruction: 'プラットフォームにアクセスし、最初のシナリオを完了してください',
            successCriteria: [
              'オンボーディングを完了できる',
              '最初のシナリオを見つけられる',
              'シナリオを最後まで完了できる'
            ],
            metrics: ['task_time', 'error_count', 'help_usage']
          },
          {
            instruction: 'ASD/NTモードを切り替えて、違いを体験してください',
            successCriteria: [
              'モード切り替えボタンを見つけられる',
              '違いを理解できる',
              'モードの説明を読める'
            ]
          }
        ]
      },
      {
        id: 'educator-use-case',
        title: '教育者のユースケース',
        tasks: [
          {
            instruction: '授業で使えるシナリオを3つ選んでください',
            successCriteria: [
              'カテゴリフィルターを使える',
              '難易度で絞り込める',
              'シナリオの詳細を確認できる'
            ]
          },
          {
            instruction: '生徒の進捗を確認する方法を見つけてください',
            successCriteria: [
              '進捗ダッシュボードにアクセスできる',
              '統計情報を理解できる'
            ]
          }
        ]
      }
    ];
    
    recordSession(participant: Participant) {
      return {
        startRecording: () => {
          // 画面録画開始
          // マウストラッキング開始
          // タイムスタンプ記録
        },
        
        logEvent: (event: TestEvent) => {
          // クリック、スクロール、エラー等を記録
        },
        
        endRecording: () => {
          // セッションデータ保存
          // ヒートマップ生成
          // タスク完了率計算
        }
      };
    }
  }
  ```
- [ ] 最終バグ修正
  ```typescript
  // 重要度別バグ修正リスト
  const bugFixPriority = [
    {
      id: 'CRITICAL-001',
      description: 'WebSocket接続が不安定な環境で切断される',
      impact: 'ユーザー体験に重大な影響',
      fix: `
        // 再接続ロジックの強化
        socket.on('disconnect', () => {
          const reconnect = () => {
            socket.connect();
          };
          
          // 指数バックオフで再接続
          let delay = 1000;
          const attempt = () => {
            setTimeout(() => {
              reconnect();
              if (!socket.connected) {
                delay = Math.min(delay * 2, 30000);
                attempt();
              }
            }, delay);
          };
          attempt();
        });
      `
    },
    {
      id: 'HIGH-001',
      description: 'モバイルでVRMモデルの表示が崩れる',
      impact: 'モバイルユーザーの利用に影響',
      fix: `
        // ビューポート調整
        if (isMobile()) {
          camera.fov = 45; // より広い視野角
          camera.position.set(0, 1.5, 4); // より遠い位置
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }
      `
    }
  ];
  ```

### Day 141-146: リリース作業
- [ ] 本番デプロイ
  ```bash
  #!/bin/bash
  # deploy-production.sh
  
  set -e
  
  echo "=== Production Deployment Started ==="
  
  # 1. 事前チェック
  echo "Running pre-deployment checks..."
  ./scripts/pre-deploy-check.sh
  
  # 2. データベースバックアップ
  echo "Backing up database..."
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
  
  # 3. Blue-Green デプロイメント
  echo "Deploying to Green environment..."
  docker-compose -f docker-compose.green.yml up -d
  
  # 4. ヘルスチェック
  echo "Waiting for services to be healthy..."
  ./scripts/health-check.sh --env green --wait 300
  
  # 5. スモークテスト
  echo "Running smoke tests..."
  npm run test:smoke -- --env green
  
  # 6. トラフィック切り替え
  echo "Switching traffic to Green..."
  ./scripts/switch-traffic.sh --from blue --to green --percentage 10
  sleep 60
  ./scripts/switch-traffic.sh --from blue --to green --percentage 50
  sleep 60
  ./scripts/switch-traffic.sh --from blue --to green --percentage 100
  
  # 7. 旧環境停止
  echo "Stopping Blue environment..."
  docker-compose -f docker-compose.blue.yml down
  
  # 8. タグ付け
  git tag -a "v1.0.0" -m "MVP Release"
  git push origin v1.0.0
  
  echo "=== Deployment Completed Successfully ==="
  ```
- [ ] 監視開始
  ```typescript
  // monitoring/production-alerts.ts
  const productionAlerts = {
    critical: [
      {
        name: 'ServiceDown',
        condition: 'up{job="web"} == 0',
        duration: '1m',
        action: 'PagerDuty',
        runbook: 'https://wiki.internal/runbooks/service-down'
      },
      {
        name: 'HighErrorRate',
        condition: 'rate(errors_total[5m]) > 0.05',
        duration: '5m',
        action: 'Slack + PagerDuty',
        runbook: 'https://wiki.internal/runbooks/high-error-rate'
      }
    ],
    warning: [
      {
        name: 'HighMemoryUsage',
        condition: 'memory_usage_percent > 85',
        duration: '10m',
        action: 'Slack',
        runbook: 'https://wiki.internal/runbooks/high-memory'
      },
      {
        name: 'SlowResponse',
        condition: 'http_request_duration_seconds{quantile="0.95"} > 2',
        duration: '5m',
        action: 'Slack',
        runbook: 'https://wiki.internal/runbooks/slow-response'
      }
    ]
  };
  ```
- [ ] ユーザー通知
  ```typescript
  // ローンチ通知メール
  const launchEmailTemplate = `
  <h1>ASD理解促進プラットフォーム パイロット版公開のお知らせ</h1>
  
  <p>お待たせいたしました！</p>
  
  <p>この度、ASD理解促進教育プラットフォームのパイロット版を
  公開する運びとなりました。</p>
  
  <h2>アクセス方法</h2>
  <p>以下のリンクから、招待コードを使用してご登録ください：</p>
  <p><a href="https://asd-aituber.example.com/register?code={{inviteCode}}">
    登録はこちら
  </a></p>
  
  <p>招待コード: <strong>{{inviteCode}}</strong></p>
  
  <h2>ご利用にあたって</h2>
  <ul>
    <li>本プラットフォームは教育目的のシミュレーションです</li>
    <li>ASDの特性は個人差が大きいことをご理解ください</li>
    <li>フィードバックをお待ちしております</li>
  </ul>
  
  <h2>サポート</h2>
  <p>ご不明な点がございましたら、以下までお問い合わせください：</p>
  <p>support@asd-aituber.example.com</p>
  
  <p>皆様のご参加を心よりお待ちしております。</p>
  `;
  ```

## 成果物チェックリスト

### テスト
- [ ] 単体テストカバレッジ > 80%
- [ ] 統合テストカバレッジ > 70%
- [ ] E2Eテスト主要フロー100%カバー
- [ ] パフォーマンステスト合格
- [ ] セキュリティ監査完了
- [ ] アクセシビリティ検証完了

### ドキュメント
- [ ] ユーザーマニュアル完成
- [ ] API仕様書完成
- [ ] 運用マニュアル完成
- [ ] トラブルシューティングガイド完成

### インフラ
- [ ] 本番環境構築完了
- [ ] CI/CDパイプライン稼働
- [ ] 監視・アラート設定完了
- [ ] バックアップ・リストア確認
- [ ] 災害復旧計画策定

### リリース準備
- [ ] 利用規約・プライバシーポリシー公開
- [ ] フィードバックシステム稼働
- [ ] ユーザー登録システム稼働
- [ ] サポート体制確立

## プロジェクト完了基準

### 機能要件達成
- [ ] 全10シナリオ実装・動作確認
- [ ] ASD/NTモード切り替え完全動作
- [ ] 音声合成・感情表現統合
- [ ] 学習進捗トラッキング機能

### 非機能要件達成
- [ ] レスポンスタイム < 3秒（95パーセンタイル）
- [ ] 同時接続100ユーザー安定動作
- [ ] 可用性 > 99%
- [ ] WCAG 2.1 Level AA準拠

### 品質基準達成
- [ ] バグ密度 < 1件/KLOC
- [ ] ユーザビリティテスト合格率 > 90%
- [ ] パフォーマンステスト全項目合格
- [ ] セキュリティ脆弱性ゼロ

これでPhase 6が完了し、MVPが本番リリース可能な状態になります。