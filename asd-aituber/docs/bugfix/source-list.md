# リップシンク関連ソースコード一覧

リップシンクの問題調査のため、関連するすべてのソースコードを一覧化しています。

## 1. ChatPage (音声合成とリップシンクの起点)

**ファイル**: `apps/web/app/chat/page.tsx`

```typescript
'use client'

import { useRef, useEffect, useState } from 'react'
import ChatPanel from '@/components/ChatPanel'
import { ModeToggle } from '@/components/ModeToggle'
import { useChat } from '@/hooks/useChat'
import VRMViewer from '@/components/VRMViewer'
import type { VRMViewerRef } from '@/components/VRMViewer'
import type { Emotion } from '@asd-aituber/types'
import { useSimpleUnifiedVoice } from '@/hooks/useUnifiedVoiceSynthesis'

export default function ChatPage() {
  const { messages, isLoading, sendMessage, mode, changeMode } = useChat()
  const vrmViewerRef = useRef<VRMViewerRef>(null)
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // 音声合成機能（VOICEVOX統合）
  const { speak: speakText, stop: stopSpeech, isSpeaking: isVoiceSpeaking, currentEngine } = useSimpleUnifiedVoice({
    preferredEngine: 'auto', // VOICEVOXが利用可能なら自動選択
    defaultMode: mode === 'asd' ? 'asd' : 'nt', // チャットモードと連動
    volume: 0.8,
    callbacks: {} // コールバックは speak 時に個別に設定
  })
  
  // クライアントサイドでのみマウント
  useEffect(() => {
    setMounted(true)
  }, [])

  // 最新メッセージに基づいて感情を推定とリップシンク
  useEffect(() => {
    if (messages.length === 0) return

    const lastMessage = messages[messages.length - 1]
    console.log('[ChatPage] ===== 新しいメッセージ検出 =====')
    console.log('[ChatPage] Role:', lastMessage.role)
    console.log('[ChatPage] Content:', lastMessage.content)
    console.log('[ChatPage] Emotion:', lastMessage.emotion)
    
    if (lastMessage.role === 'assistant') {
      console.log('[ChatPage] アシスタントメッセージのため、音声合成を開始します')
      // assistantメッセージの感情を反映
      if (lastMessage.emotion) {
        setCurrentEmotion(lastMessage.emotion)
      }
      
      // 音声合成とリップシンク
      const speakWithLipSync = async () => {
        console.log('[ChatPage] Starting speakWithLipSync')
        console.log('[ChatPage] Message content:', lastMessage.content)
        console.log('[ChatPage] Current engine:', currentEngine)
        
        // 既存の音声を停止
        stopSpeech()
        
        // VRMリップシンクを開始
        if (vrmViewerRef.current) {
          console.log('[ChatPage] VRMViewer is available')
          setIsSpeaking(true)
          
          // 先にリップシンクを開始
          console.log('[ChatPage] Starting VRM lip sync first')
          if (vrmViewerRef.current.speakText) {
            vrmViewerRef.current.speakText(lastMessage.content, () => {
              console.log('[ChatPage] VRM lip sync completed')
            })
          }
          
          // 音声合成で話す（感情とモードを考慮）
          console.log('[ChatPage] Starting voice synthesis with options:', {
            emotion: lastMessage.emotion || 'neutral',
            mode: mode === 'asd' ? 'asd' : 'nt'
          })
          
          await speakText(lastMessage.content, {
            emotion: lastMessage.emotion || 'neutral',
            mode: mode === 'asd' ? 'asd' : 'nt',
            callbacks: {
              onStart: () => {
                console.log('[ChatPage] Voice synthesis started callback triggered')
              },
              onEnd: () => {
                console.log('[ChatPage] Voice synthesis ended callback triggered')
                console.log('[ChatPage] ===== 音声会話完了 =====')
                setIsSpeaking(false)
                // 話し終わったら3秒後に表情をneutralに戻す
                setTimeout(() => {
                  if (vrmViewerRef.current) {
                    console.log('[ChatPage] Resetting emotion to neutral')
                    vrmViewerRef.current.setEmotion('neutral')
                    setCurrentEmotion('neutral')
                  }
                }, 3000)
              },
              onError: (error) => {
                console.error('[ChatPage] Speech synthesis error:', error)
                setIsSpeaking(false)
              }
            }
          })
        } else {
          console.log('[ChatPage] VRMViewer not available, playing voice only')
          // VRMViewerが利用できない場合は音声のみ再生
          await speakText(lastMessage.content, {
            emotion: lastMessage.emotion || 'neutral',
            mode: mode === 'asd' ? 'asd' : 'nt',
            callbacks: {
              onStart: () => {
                console.log('[ChatPage] Voice-only: synthesis started')
                setIsSpeaking(true)
              },
              onEnd: () => {
                console.log('[ChatPage] Voice-only: synthesis ended')
                setIsSpeaking(false)
                setTimeout(() => setCurrentEmotion('neutral'), 3000)
              }
            }
          })
        }
      }
      
      // VRMViewerの準備ができるまで少し待つ
      if (vrmViewerRef.current) {
        console.log('[ChatPage] VRMViewer is ready, executing speakWithLipSync immediately')
        speakWithLipSync()
      } else {
        console.log('[ChatPage] VRMViewer not ready, waiting 500ms')
        setTimeout(speakWithLipSync, 500)
      }
    } else {
      console.log('[ChatPage] Not an assistant message, skipping voice synthesis')
    }
  }, [messages])

  // ローディング状態に基づいて表情を更新
  useEffect(() => {
    if (isLoading) {
      setCurrentEmotion('neutral')
      setIsSpeaking(false)
      // 進行中の音声合成を停止
      stopSpeech()
    }
  }, [isLoading, stopSpeech])

  // マウント前は何も表示しない
  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen flex">
      {/* 左側: VRMViewer */}
      <div className="flex-1 relative">
        <VRMViewer
          ref={vrmViewerRef}
          modelUrl="/models/sample.vrm"
          emotion={currentEmotion}
          isSpeaking={isSpeaking}
        />
        
        {/* モード切り替えボタン */}
        <div className="absolute top-4 right-4">
          <ModeToggle 
            currentMode={mode} 
            onModeChange={changeMode}
          />
        </div>
      </div>
      
      {/* 右側: チャットパネル */}
      <div className="w-96 border-l border-border">
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          currentMode={mode}
        />
      </div>
    </div>
  )
}
```

## 2. VRMViewer (VRMモデルの表示とアニメーション制御)

**ファイル**: `components/VRMViewer.tsx`

```typescript
'use client'

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Emotion } from '@asd-aituber/types'
import { VRMAnimationController } from '@/lib/vrm-animation'

export interface VRMViewerRef {
  setEmotion: (emotion: Emotion) => void
  setSpeaking: (intensity: number) => void
  speakText: (text: string, onComplete?: () => void) => void
  stopSpeaking: () => void
  getAvailableExpressions: () => string[]
}

interface VRMViewerProps {
  modelUrl?: string
  emotion?: Emotion
  isSpeaking?: boolean
}

const VRMViewer = forwardRef<VRMViewerRef, VRMViewerProps>(
  ({ modelUrl, emotion = 'neutral', isSpeaking = false }, ref) => {
    const mountRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const vrmRef = useRef<VRM | null>(null)
    const animationControllerRef = useRef<VRMAnimationController | null>(null)
    const controlsRef = useRef<OrbitControls | null>(null)
    const clockRef = useRef(new THREE.Clock())
    
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [availableExpressions, setAvailableExpressions] = useState<string[]>([])

    // Imperativeハンドルの設定
    useImperativeHandle(ref, () => {
      return {
        setEmotion: (emotion: Emotion) => {
          if (animationControllerRef.current) {
            animationControllerRef.current.setEmotion(emotion)
          }
        },
        setSpeaking: (intensity: number) => {
          if (animationControllerRef.current) {
            animationControllerRef.current.setSpeaking(intensity)
          }
        },
        speakText: (text: string, onComplete?: () => void) => {
          console.log('VRMViewer.speakText called with:', text)
          if (animationControllerRef.current) {
            console.log('Animation controller available, calling speakText')
            animationControllerRef.current.speakText(text, onComplete)
          } else {
            console.warn('Animation controller not available for speakText')
          }
        },
        stopSpeaking: () => {
          if (animationControllerRef.current) {
            animationControllerRef.current.stopSpeaking()
          }
        },
        getAvailableExpressions: () => availableExpressions
      }
    }, [availableExpressions])

    // 感情変化の監視
    useEffect(() => {
      if (animationControllerRef.current) {
        animationControllerRef.current.setEmotion(emotion)
      }
    }, [emotion])

    // 話している状態の監視
    useEffect(() => {
      if (animationControllerRef.current) {
        animationControllerRef.current.setSpeaking(isSpeaking ? 0.7 : 0)
      }
    }, [isSpeaking])

  useEffect(() => {
    if (!mountRef.current) return

    const container = mountRef.current
    const rect = container.getBoundingClientRect()
    const width = rect.width || 640
    const height = rect.height || 480

    // Scene setup
    const scene = new THREE.Scene()
    sceneRef.current = scene
    scene.background = new THREE.Color(0x87ceeb)

    // Camera setup - 全身が見えるように調整
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 20)
    camera.position.set(0, 1.4, 3)

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    rendererRef.current = renderer
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(renderer.domElement)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controlsRef.current = controls
    controls.enableDamping = true
    controls.target.set(0, 1.4, 0)
    controls.update()

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
    directionalLight.position.set(1, 1, 1)
    scene.add(directionalLight)

    // Load VRM model
    if (modelUrl) {
      setIsLoading(true)
      setError(null)
      
      const loader = new GLTFLoader()
      loader.register((parser) => new VRMLoaderPlugin(parser))
      
      loader.load(
        modelUrl,
        (gltf) => {
          const vrm = gltf.userData.vrm as VRM
          if (vrm) {
            scene.add(vrm.scene)
            vrmRef.current = vrm
            
            // Initialize animation controller
            Promise.resolve().then(() => {
              animationControllerRef.current = new VRMAnimationController(vrm)
              
              // 利用可能な表情を取得
              const expressions = animationControllerRef.current.getAvailableExpressions()
              setAvailableExpressions(expressions)
              console.log('Available VRM expressions:', expressions)
              console.log('VRM animation controller initialized successfully')
              console.log('VRM initial pose set')
            })
            
            setIsLoading(false)
          } else {
            setError('Failed to load VRM from GLTF')
            setIsLoading(false)
          }
        },
        (progress) => {
          console.log('Loading progress:', (progress.loaded / progress.total) * 100, '%')
        },
        (error) => {
          console.error('Error loading VRM:', error)
          setError(`Error loading VRM: ${error instanceof Error ? error.message : 'Unknown error'}`)
          setIsLoading(false)
        }
      )
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      
      const deltaTime = clockRef.current.getDelta()
      
      // コントロールの更新
      if (controlsRef.current) {
        controlsRef.current.update()
      }
      
      // カスタムアニメーションの更新（VRM更新の前に実行）
      if (animationControllerRef.current) {
        animationControllerRef.current.update(deltaTime)
      }
      
      // VRMの基本更新（expressionManagerの変更を反映）
      if (vrmRef.current) {
        // 表情の現在値をデバッグ出力（一定間隔で）
        if (Math.floor(performance.now() / 1000) !== Math.floor((performance.now() - 16) / 1000)) {
          const expressionManager = vrmRef.current.expressionManager
          if (expressionManager) {
            try {
              const aaValue = expressionManager.getValue('aa')
              const happyValue = expressionManager.getValue('happy')
              if (aaValue > 0 || happyValue > 0) {
                console.log(`[VRMViewer] Expression values: aa=${aaValue.toFixed(3)}, happy=${happyValue.toFixed(3)}`)
              }
            } catch {
              // Silent fail for non-existent expressions
            }
          }
        }
        
        vrmRef.current.update(deltaTime)
      }

      renderer.render(scene, camera)
    }
    animate()

    // Handle window resize
    const handleResize = () => {
      const rect = container.getBoundingClientRect()
      const newWidth = rect.width || 640
      const newHeight = rect.height || 480

      camera.aspect = newWidth / newHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, newHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement)
      }
      renderer.dispose()
      
      // VRM cleanup
      if (vrmRef.current) {
        vrmRef.current.dispose()
      }
    }
  }, [modelUrl])

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background bg-opacity-75">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <div className="text-lg">Loading VRM model...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-75">
            <div className="text-red-600">{error}</div>
          </div>
        )}
        {!modelUrl && !isLoading && (
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded">
            Test cube (no VRM model loaded)
          </div>
        )}
        
        {/* カメラ操作説明 */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded text-xs">
          <div>🖱️ ドラッグ: 回転</div>
          <div>🔍 ホイール: ズーム</div>
          <div>⌨️ 右クリック+ドラッグ: パン</div>
        </div>

        {availableExpressions.length > 0 && (
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded text-xs">
            <div>Available expressions: {availableExpressions.length}</div>
            <div>Current emotion: {emotion}</div>
            {isSpeaking && <div>🗣️ Speaking</div>}
          </div>
        )}
      </div>
    )
  }
)

VRMViewer.displayName = 'VRMViewer'

export default VRMViewer
```

## 3. VRMAnimationController (VRMアニメーション制御)

**ファイル**: `lib/vrm-animation.ts`

```typescript
import * as THREE from 'three'
import type { VRM } from '@pixiv/three-vrm'
import type { Emotion } from '@asd-aituber/types'
import { LipSync } from './lip-sync'

export class VRMAnimationController {
  private vrm: VRM
  private clock: number = 0
  private lipSync: LipSync
  private isSpeaking: boolean = false
  private currentEmotion: Emotion = 'neutral'
  
  // アニメーション設定
  private blinkInterval: number = 3000 // 3秒間隔
  private lastBlinkTime: number = 0
  private breathingSpeed: number = 0.001
  private breathingIntensity: number = 0.02
  private armSwaySpeed: number = 0.0008
  private armSwayIntensity: number = 0.05
  private legShiftSpeed: number = 0.0005
  private legShiftIntensity: number = 0.03

  constructor(vrm: VRM) {
    this.vrm = vrm
    this.lipSync = new LipSync()
    this.setInitialPose()
  }

  /**
   * 初期ポーズの設定（自然な立ちポーズ）
   */
  private setInitialPose(): void {
    if (!this.vrm.humanoid) return

    try {
      // 腕の自然な位置
      const leftUpperArm = this.vrm.humanoid.getNormalizedBoneNode('leftUpperArm')
      const rightUpperArm = this.vrm.humanoid.getNormalizedBoneNode('rightUpperArm')
      const leftLowerArm = this.vrm.humanoid.getNormalizedBoneNode('leftLowerArm')
      const rightLowerArm = this.vrm.humanoid.getNormalizedBoneNode('rightLowerArm')

      if (leftUpperArm) {
        leftUpperArm.rotation.z = Math.PI * 0.15  // 左腕を少し開く
        leftUpperArm.rotation.x = Math.PI * 0.05  // 少し前に
      }
      if (rightUpperArm) {
        rightUpperArm.rotation.z = -Math.PI * 0.15 // 右腕を少し開く
        rightUpperArm.rotation.x = Math.PI * 0.05  // 少し前に
      }
      if (leftLowerArm) {
        leftLowerArm.rotation.y = Math.PI * 0.1   // 肘を曲げる
        leftLowerArm.rotation.z = Math.PI * 0.05  // 内側に向ける
      }
      if (rightLowerArm) {
        rightLowerArm.rotation.y = -Math.PI * 0.1  // 肘を曲げる
        rightLowerArm.rotation.z = -Math.PI * 0.05 // 内側に向ける
      }

      // 首と頭の自然な位置
      const neck = this.vrm.humanoid.getNormalizedBoneNode('neck')
      const head = this.vrm.humanoid.getNormalizedBoneNode('head')
      
      if (neck) {
        neck.rotation.x = Math.PI * 0.02 // 首を少し前に傾ける
      }
      if (head) {
        head.rotation.x = Math.PI * 0.01 // 頭を少し下に向ける
      }

      // 脊椎の自然なカーブ
      const spine = this.vrm.humanoid.getNormalizedBoneNode('spine')
      if (spine) {
        spine.rotation.x = -Math.PI * 0.01 // 背筋を少し伸ばす
      }

      console.log('VRM initial pose set successfully')
    } catch (error) {
      console.warn('Failed to set initial pose:', error)
    }
  }

  /**
   * アニメーションフレームごとに呼ばれる更新処理
   * @param deltaTime - 前フレームからの経過時間
   */
  update(deltaTime: number): void {
    this.clock += deltaTime * 1000 // ミリ秒に変換

    // 基本的なアイドルアニメーション
    this.updateIdleAnimations()

    // 話している時の追加アニメーション
    if (this.isSpeaking) {
      this.updateSpeakingAnimations()
    }

    // 感情に応じた表情の適用
    this.applyEmotionExpression(this.currentEmotion)
  }

  /**
   * アイドル時のアニメーション
   */
  private updateIdleAnimations(): void {
    this.updateBlinking()
    this.updateBreathing()
    this.updateArmSway()
    this.updateLegShift()
  }

  /**
   * 話している時のアニメーション
   */
  private updateSpeakingAnimations(): void {
    // より活発なジェスチャーを適用
    const speakingIntensity = 0.7
    this.updateSpeakingGestures(speakingIntensity)
  }

  /**
   * まばたきアニメーション
   */
  private updateBlinking(): void {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) return

    const currentTime = this.clock
    if (currentTime - this.lastBlinkTime > this.blinkInterval) {
      try {
        // まばたき実行
        if (expressionManager.getExpressionTrackName('blink')) {
          expressionManager.setValue('blink', 1.0)
          
          // 200ms後にまばたきを戻す
          setTimeout(() => {
            if (expressionManager.getExpressionTrackName('blink')) {
              expressionManager.setValue('blink', 0.0)
            }
          }, 200)
        }
        
        this.lastBlinkTime = currentTime
        // 次のまばたきまでの時間をランダムに調整
        this.blinkInterval = 2000 + Math.random() * 4000 // 2-6秒
      } catch (error) {
        // まばたき表情が利用できない場合はスキップ
      }
    }
  }

  /**
   * 呼吸アニメーション（胸の上下動）
   */
  private updateBreathing(): void {
    if (!this.vrm.humanoid) return

    try {
      const chest = this.vrm.humanoid.getNormalizedBoneNode('chest')
      if (chest) {
        const breathingOffset = Math.sin(this.clock * this.breathingSpeed) * this.breathingIntensity
        chest.rotation.x = breathingOffset
      }
    } catch (error) {
      // Breathing animation failed, skip silently
    }
  }

  /**
   * 腕の微細な動き（待機時の自然な揺れ）
   */
  private updateArmSway(): void {
    if (!this.vrm.humanoid) return

    // 左腕の動き
    this.updateArmSwayForSide('leftUpperArm', 'leftLowerArm', 1)
    // 右腕の動き
    this.updateArmSwayForSide('rightUpperArm', 'rightLowerArm', -1)
  }

  /**
   * 片腕の揺れアニメーション
   * @param upperArmName - 上腕のボーン名
   * @param lowerArmName - 前腕のボーン名  
   * @param side - 左右の向き（1: 左, -1: 右）
   */
  private updateArmSwayForSide(upperArmName: string, lowerArmName: string, side: number): void {
    if (!this.vrm.humanoid) return

    try {
      const upperArm = this.vrm.humanoid.getNormalizedBoneNode(upperArmName as any)
      const lowerArm = this.vrm.humanoid.getNormalizedBoneNode(lowerArmName as any)

      if (upperArm) {
        // 基本ポーズを維持しつつ微細な動き
        const baseRotationZ = Math.PI * 0.15 * side  // 初期ポーズと同じ開き具合
        const baseRotationX = Math.PI * 0.05         // 初期ポーズと同じ前傾
        const armSway = Math.sin(this.clock * this.armSwaySpeed) * this.armSwayIntensity
        
        upperArm.rotation.z = baseRotationZ + armSway * side * 0.3
        upperArm.rotation.x = baseRotationX + armSway * 0.2
      }

      if (lowerArm) {
        // 基本の曲げた前腕の位置を維持しつつ微細な動き
        const baseRotationY = Math.PI * 0.1 * side   // 初期ポーズと同じ曲げた位置
        const baseRotationZ = Math.PI * 0.05 * side  // 初期ポーズと同じ内側向き
        const forearmBend = Math.sin(this.clock * this.armSwaySpeed * 1.3) * this.armSwayIntensity * 0.2
        
        lowerArm.rotation.y = baseRotationY + forearmBend * side * 0.5
        lowerArm.rotation.z = baseRotationZ
      }
    } catch (error) {
      // Arm animation failed, skip silently
    }
  }

  /**
   * 足の待機アニメーション（重心移動）
   * @param leftLegName - 左足のボーン名
   * @param rightLegName - 右足のボーン名
   */
  private updateLegIdle(leftLegName: string, rightLegName: string): void {
    if (!this.vrm.humanoid) return

    try {
      const leftLeg = this.vrm.humanoid.getNormalizedBoneNode(leftLegName as any)
      const rightLeg = this.vrm.humanoid.getNormalizedBoneNode(rightLegName as any)

      // 重心移動（左右の足に交互に体重をかける）
      const weightShift = Math.sin(this.clock * this.legShiftSpeed) * this.legShiftIntensity

      if (leftLeg) {
        leftLeg.rotation.z = weightShift * 0.5
      }

      if (rightLeg) {
        rightLeg.rotation.z = -weightShift * 0.5
      }
    } catch (error) {
      // Leg animation failed, skip silently
    }
  }

  /**
   * 感情を設定
   * @param emotion - 設定する感情
   */
  setEmotion(emotion: Emotion): void {
    this.currentEmotion = emotion
  }

  /**
   * 感情に応じた表情を適用
   * @param emotion - 適用する感情
   */
  private applyEmotionExpression(emotion: Emotion): void {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) return

    // 全ての表情をリセット（口パク用の母音は除く）
    const expressions = ['happy', 'sad', 'angry', 'surprised', 'relaxed', 'neutral']
    expressions.forEach(expr => {
      try {
        if (expressionManager.getExpressionTrackName(expr)) {
          expressionManager.setValue(expr, 0)
        }
      } catch (error) {
        // Expression not available, skip silently
      }
    })

    // 感情に応じた表情を適用
    try {
      let targetExpression = ''
      let intensity = 0.7

      switch (emotion) {
        case 'joy':
        case 'happy':
          targetExpression = 'happy'
          intensity = 0.8
          break
        case 'sadness':
        case 'sad':
          targetExpression = 'sad'
          intensity = 0.7
          break
        case 'anger':
        case 'angry':
          targetExpression = 'angry'
          intensity = 0.6
          break
        case 'surprise':
        case 'surprised':
          targetExpression = 'surprised'
          intensity = 0.9
          break
        case 'fear':
          targetExpression = 'sad' // fearがない場合はsadで代用
          intensity = 0.5
          break
        case 'disgust':
          targetExpression = 'angry' // disgustがない場合はangryで代用
          intensity = 0.4
          break
        case 'neutral':
        default:
          targetExpression = 'neutral'
          intensity = 1.0
          break
      }

      if (targetExpression && expressionManager.getExpressionTrackName(targetExpression)) {
        expressionManager.setValue(targetExpression, intensity)
      }
    } catch (error) {
      // Expression application failed, skip silently
    }
  }

  /**
   * 話す強度を設定
   * @param intensity - 話す強度（0-1）
   */
  setSpeaking(intensity: number): void {
    this.isSpeaking = intensity > 0

    // 話している時の全身ジェスチャー
    this.updateSpeakingGestures(intensity)
  }

  /**
   * テキストを話す（リップシンク付き）
   * @param text - 話すテキスト
   * @param onComplete - 完了時のコールバック
   */
  speakText(text: string, onComplete?: () => void): void {
    console.log('[VRMAnimationController] speakText called - using simple lip sync')
    this.isSpeaking = true
    
    // aituber-kit方式：シンプルなボリューム基盤のリップシンク
    this.startSimpleLipSync(text.length, onComplete)
  }
  
  /**
   * シンプルなリップシンク（aituber-kit方式）
   */
  private startSimpleLipSync(textLength: number, onComplete?: () => void): void {
    // 文字数に基づいて話す時間を計算
    const duration = Math.max(1000, textLength * 100) // 文字あたり100ms、最低1秒
    const startTime = performance.now()
    
    console.log(`[VRMAnimationController] Starting simple lip sync for ${duration}ms`)
    
    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = elapsed / duration
      
      if (progress < 1 && this.isSpeaking) {
        // サイン波でボリュームを変動
        const volume = (Math.sin(elapsed * 0.01) + 1) * 0.4 + 0.1 // 0.1-0.9の範囲
        
        // 直接'aa'表情を設定
        const expressionManager = this.vrm.expressionManager
        if (expressionManager) {
          try {
            if (expressionManager.getExpressionTrackName('aa')) {
              expressionManager.setValue('aa', volume)
              console.log(`[VRMAnimationController] Simple lip sync: setting 'aa' to ${volume.toFixed(3)}`)
            } else if (expressionManager.getExpressionTrackName('happy')) {
              expressionManager.setValue('happy', volume * 0.3)
              console.log(`[VRMAnimationController] Simple lip sync: setting 'happy' to ${(volume * 0.3).toFixed(3)}`)
            }
          } catch (error) {
            console.error('[VRMAnimationController] Error in simple lip sync:', error)
          }
        }
        
        requestAnimationFrame(animate)
      } else {
        // リップシンク終了
        console.log('[VRMAnimationController] Simple lip sync completed')
        this.isSpeaking = false
        this.setMouthShape('silence', 0)
        if (onComplete) {
          onComplete()
        }
      }
    }
    
    animate()
  }

  /**
   * 口の形を設定
   * @param phoneme - 音韻（a, i, u, e, o, silence）
   * @param intensity - 強度（0-1）
   */
  private setMouthShape(phoneme: string, intensity: number): void {
    console.log(`[VRMAnimationController] setMouthShape: ${phoneme}, intensity: ${intensity.toFixed(2)}`)

    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) {
      console.warn('[VRMAnimationController] No expression manager available')
      return
    }

    console.log(`[VRMAnimationController] setMouthShape: ${phoneme}, intensity: ${intensity.toFixed(2)}`)

    // 利用可能な表情を確認（初回のみログ出力）
    if (this.vowelExpressionInfo === undefined) {
      this.vowelExpressionInfo = this.checkVowelExpressions()
      console.log('[VRMAnimationController] Mouth expressions:', this.vowelExpressionInfo)
    }
    
    if (this.vowelExpressionInfo.type !== 'none') {
      // 口の表情が利用可能な場合
      console.log(`[VRMAnimationController] Using ${this.vowelExpressionInfo.type} expressions`)
      this.setMouthExpression(phoneme, intensity)
    } else {
      // 口の表情が利用できない場合は代替処理
      console.log('[VRMAnimationController] Using alternative mouth shape')
      this.setAlternativeMouthShape(phoneme, intensity)
    }
  }
  
  private vowelExpressionInfo?: { type: 'standard' | 'legacy' | 'none', available: string[] }
  private alternativeLogShown?: boolean
  
  /**
   * 口の表情の存在を確認（VRM標準表情優先）
   */
  private checkVowelExpressions(): { type: 'standard' | 'legacy' | 'none', available: string[] } {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) return { type: 'none', available: [] }
    
    // 全ての利用可能な表情を詳細にログ出力
    this.debugAllExpressions()
    
    // VRM標準表情をチェック
    const standardMouthExpressions = ['aa', 'ih', 'ou', 'ee', 'oh']
    const availableStandard = standardMouthExpressions.filter(expr => {
      try {
        const trackName = expressionManager.getExpressionTrackName(expr)
        if (trackName) {
          console.log(`[VRMAnimationController] Found standard expression: ${expr} -> ${trackName}`)
          return true
        }
        return false
      } catch {
        return false
      }
    })
    
    if (availableStandard.length > 0) {
      return { type: 'standard', available: availableStandard }
    }
    
    // 旧形式の母音表情をチェック
    const legacyVowels = ['a', 'i', 'u', 'e', 'o']
    const availableLegacy = legacyVowels.filter(vowel => {
      try {
        const trackName = expressionManager.getExpressionTrackName(vowel)
        if (trackName) {
          console.log(`[VRMAnimationController] Found legacy expression: ${vowel} -> ${trackName}`)
          return true
        }
        return false
      } catch {
        return false
      }
    })
    
    if (availableLegacy.length > 0) {
      return { type: 'legacy', available: availableLegacy }
    }
    
    return { type: 'none', available: [] }
  }
  
  /**
   * デバッグ用：全ての利用可能な表情を出力
   */
  private debugAllExpressions(): void {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) return

    console.log('[VRMAnimationController] === Debugging all expressions ===')
    
    try {
      // expressionMapから全ての表情を取得
      if (expressionManager.expressionMap) {
        const allExpressions = Object.keys(expressionManager.expressionMap)
        console.log('[VRMAnimationController] All expressions in expressionMap:', allExpressions)
        
        // 各表情の詳細情報
        allExpressions.forEach(expr => {
          try {
            const trackName = expressionManager.getExpressionTrackName(expr)
            const currentValue = expressionManager.getValue(expr)
            console.log(`[VRMAnimationController] Expression "${expr}": track="${trackName}", value=${currentValue}`)
          } catch (error) {
            console.log(`[VRMAnimationController] Expression "${expr}": Error accessing - ${error}`)
          }
        })
      } else {
        console.log('[VRMAnimationController] No expressionMap available')
      }
    } catch (error) {
      console.error('[VRMAnimationController] Error debugging expressions:', error)
    }
    
    console.log('[VRMAnimationController] === End expression debug ===')
  }
  
  /**
   * 口の表情を設定（VRM標準またはレガシー形式）
   */
  private setMouthExpression(phoneme: string, intensity: number): void {
    const expressionManager = this.vrm.expressionManager!
    const info = this.vowelExpressionInfo!
    
    if (info.type === 'standard') {
      this.setStandardMouthExpression(phoneme, intensity)
    } else if (info.type === 'legacy') {
      this.setLegacyVowelExpression(phoneme, intensity)
    }
  }
  
  /**
   * VRM標準の口表情を設定（aituber-kit方式）
   */
  private setStandardMouthExpression(phoneme: string, intensity: number): void {
    const expressionManager = this.vrm.expressionManager!
    const available = this.vowelExpressionInfo!.available
    
    // 全ての口表情をリセット
    const allMouthExpressions = ['aa', 'ih', 'ou', 'ee', 'oh']
    allMouthExpressions.forEach(expr => {
      if (available.includes(expr)) {
        try {
          expressionManager.setValue(expr, 0)
        } catch (error) {
          // Skip silently
        }
      }
    })

    // aituber-kit方式：主に'aa'表情を使用
    if (phoneme !== 'silence' && available.includes('aa')) {
      try {
        console.log(`[VRMAnimationController] Setting 'aa' expression to ${intensity}`)
        expressionManager.setValue('aa', intensity)
        
        // 設定後の値を確認
        const currentValue = expressionManager.getValue('aa')
        console.log(`[VRMAnimationController] 'aa' expression value after setting: ${currentValue}`)
        
        if (!this.alternativeLogShown) {
          console.log('[VRMAnimationController] Using VRM standard \'aa\' expression for lip sync')
          this.alternativeLogShown = true
        }
      } catch (error) {
        console.error(`[VRMAnimationController] Error setting 'aa' expression:`, error)
      }
    } else {
      console.log(`[VRMAnimationController] Skipping 'aa' - phoneme: ${phoneme}, available: ${available.join(', ')}`)
    }
  }
  
  /**
   * レガシー母音表情を設定
   */
  private setLegacyVowelExpression(phoneme: string, intensity: number): void {
    const expressionManager = this.vrm.expressionManager!
    const available = this.vowelExpressionInfo!.available
    
    // 全ての母音をリセット
    const vowels = ['a', 'i', 'u', 'e', 'o']
    vowels.forEach(vowel => {
      if (available.includes(vowel)) {
        try {
          expressionManager.setValue(vowel, 0)
        } catch (error) {
          // Skip silently
        }
      }
    })

    // 指定された音韻を設定
    if (phoneme !== 'silence' && vowels.includes(phoneme)) {
      try {
        if (available.includes(phoneme)) {
          expressionManager.setValue(phoneme, intensity)
          if (!this.alternativeLogShown) {
            console.log(`[VRMAnimationController] Using legacy vowel '${phoneme}' expression for lip sync`)
            this.alternativeLogShown = true
          }
        }
      } catch (error) {
        console.error(`[VRMAnimationController] Error setting expression '${phoneme}':`, error)
      }
    }
  }
  
  /**
   * 代替の口の動きを設定（母音表情がない場合）
   */
  private setAlternativeMouthShape(phoneme: string, intensity: number): void {
    const expressionManager = this.vrm.expressionManager!
    
    // neutralまたは他の表情を使って口の動きをシミュレート
    try {
      // 話している時は軽く口を開ける動作をシミュレート
      if (phoneme !== 'silence') {
        // happyやsurprisedなど、口が開く表情があれば使用
        if (expressionManager.getExpressionTrackName('happy')) {
          expressionManager.setValue('happy', intensity * 0.3) // 軽く笑顔で口を開ける
          if (!this.alternativeLogShown) {
            console.log('[VRMAnimationController] Using happy expression for lip sync')
            this.alternativeLogShown = true
          }
        } else if (expressionManager.getExpressionTrackName('surprised')) {
          expressionManager.setValue('surprised', intensity * 0.2) // 軽く驚いた表情
          if (!this.alternativeLogShown) {
            console.log('[VRMAnimationController] Using surprised expression for lip sync')
            this.alternativeLogShown = true
          }
        }
      } else {
        // 口を閉じる
        if (expressionManager.getExpressionTrackName('happy')) {
          expressionManager.setValue('happy', 0)
        }
        if (expressionManager.getExpressionTrackName('surprised')) {
          expressionManager.setValue('surprised', 0)
        }
      }
    } catch (error) {
      console.log('[VRMAnimationController] Alternative mouth shape failed:', error)
    }
  }

  /**
   * リップシンクを停止
   */
  stopSpeaking(): void {
    this.lipSync.stop()
    this.isSpeaking = false
    this.setMouthShape('silence', 0)
  }

  /**
   * 話している時のジェスチャー
   * @param intensity - 話す強度（0-1）
   */
  private updateSpeakingGestures(intensity: number): void {
    if (!this.vrm.humanoid) return

    try {
      // 頭の動き（より自然に）
      const head = this.vrm.humanoid.getNormalizedBoneNode('head')
      if (head) {
        const headMovementY = Math.sin(this.clock * 0.008) * intensity * 0.08
        const headMovementX = Math.cos(this.clock * 0.012) * intensity * 0.04
        const headMovementZ = Math.sin(this.clock * 0.015) * intensity * 0.03
        
        head.rotation.y += headMovementY
        head.rotation.x += headMovementX
        head.rotation.z += headMovementZ
      }

      // 肩の動き
      const leftShoulder = this.vrm.humanoid.getNormalizedBoneNode('leftShoulder')
      const rightShoulder = this.vrm.humanoid.getNormalizedBoneNode('rightShoulder')
      
      if (leftShoulder) {
        const shoulderMovement = Math.sin(this.clock * 0.006) * intensity * 0.05
        leftShoulder.rotation.z = shoulderMovement
      }
      
      if (rightShoulder) {
        const shoulderMovement = Math.cos(this.clock * 0.006) * intensity * 0.05
        rightShoulder.rotation.z = -shoulderMovement
      }

      // 腕のより活発な動き
      const leftUpperArm = this.vrm.humanoid.getNormalizedBoneNode('leftUpperArm')
      const rightUpperArm = this.vrm.humanoid.getNormalizedBoneNode('rightUpperArm')
      
      if (leftUpperArm) {
        const armGesture = Math.sin(this.clock * 0.005) * intensity * 0.15
        leftUpperArm.rotation.x += armGesture
        leftUpperArm.rotation.z += armGesture * 0.5
      }
      
      if (rightUpperArm) {
        const armGesture = Math.cos(this.clock * 0.005) * intensity * 0.15
        rightUpperArm.rotation.x += armGesture
        rightUpperArm.rotation.z -= armGesture * 0.5
      }

    } catch (error) {
      // Speaking gestures failed, skip silently
    }
  }

  /**
   * 足の微細な重心移動
   */
  private updateLegShift(): void {
    if (!this.vrm.humanoid) return

    try {
      const leftUpperLeg = this.vrm.humanoid.getNormalizedBoneNode('leftUpperLeg')
      const rightUpperLeg = this.vrm.humanoid.getNormalizedBoneNode('rightUpperLeg')

      // 重心移動（左右の足に交互に体重をかける）
      const weightShift = Math.sin(this.clock * this.legShiftSpeed) * this.legShiftIntensity

      if (leftUpperLeg) {
        leftUpperLeg.rotation.z = weightShift * 0.5
      }

      if (rightUpperLeg) {
        rightUpperLeg.rotation.z = -weightShift * 0.5
      }
    } catch (error) {
      // Leg shift animation failed, skip silently
    }
  }

  /**
   * 利用可能な表情リストを取得
   */
  getAvailableExpressions(): string[] {
    const expressionManager = this.vrm.expressionManager
    if (!expressionManager) return []

    const expressions: string[] = []
    const commonExpressions = [
      'neutral', 'happy', 'sad', 'angry', 'surprised', 'relaxed',
      'blink', 'a', 'i', 'u', 'e', 'o'
    ]

    commonExpressions.forEach(expr => {
      try {
        if (expressionManager.getExpressionTrackName && expressionManager.getExpressionTrackName(expr)) {
          expressions.push(expr)
        }
      } catch (error) {
        // Expression not available, skip silently
      }
    })

    // 母音の表情が利用可能かチェック
    const vowels = ['a', 'i', 'u', 'e', 'o']
    const availableVowels = vowels.filter(vowel => expressions.includes(vowel))
    console.log('[VRMAnimationController] Available vowel expressions:', availableVowels)
    console.log('[VRMAnimationController] All available expressions:', expressions)
    
    // VRM標準的な口の表情も確認
    const standardMouthExpressions = ['aa', 'ih', 'ou', 'ee', 'oh', 'neutral']
    const availableStandardMouthExpressions = standardMouthExpressions.filter(expr => expressions.includes(expr))
    console.log('[VRMAnimationController] Available standard mouth expressions:', availableStandardMouthExpressions)
    
    // 旧形式の母音表情も確認
    const legacyVowels = ['a', 'i', 'u', 'e', 'o']
    const availableLegacyVowels = legacyVowels.filter(vowel => expressions.includes(vowel))
    console.log('[VRMAnimationController] Available legacy vowel expressions:', availableLegacyVowels)

    return expressions
  }
}
```

## 4. LipSync (音韻解析とリップシンクアニメーション)

**ファイル**: `lib/lip-sync.ts`

```typescript
/**
 * VRM用のリップシンクシステム
 * 日本語テキストを音韻に変換してVRMの表情を制御する
 */

export interface PhonemeData {
  phoneme: string    // 音韻 (a, i, u, e, o, silence)
  duration: number   // 継続時間 (ms)
  intensity: number  // 強度 (0-1)
}

export interface LipSyncOptions {
  speed: number        // 話す速度 (文字/秒)
  intensity: number    // 口の動きの強度
  pauseDuration: number // 句読点での休止時間 (ms)
}

export class LipSync {
  private isPlaying: boolean = false
  private animationId: number | null = null
  private onPhonemeChange: ((phoneme: string, intensity: number) => void) | null = null
  private onComplete: (() => void) | null = null

  /**
   * テキストを音韻データに変換
   */
  static textToPhonemes(text: string, options: LipSyncOptions = {
    speed: 8,           // 8文字/秒
    intensity: 0.7,     // 70%の強度
    pauseDuration: 300  // 300ms休止
  }): PhonemeData[] {
    const phonemes: PhonemeData[] = []
    const charDuration = 1000 / options.speed // 1文字あたりの時間

    // 日本語の音韻マッピング
    const phonemeMap: { [key: string]: string } = {
      'あ': 'a', 'か': 'a', 'さ': 'a', 'た': 'a', 'な': 'a', 'は': 'a', 'ま': 'a', 'や': 'a', 'ら': 'a', 'わ': 'a',
      'い': 'i', 'き': 'i', 'し': 'i', 'ち': 'i', 'に': 'i', 'ひ': 'i', 'み': 'i', 'り': 'i',
      'う': 'u', 'く': 'u', 'す': 'u', 'つ': 'u', 'ぬ': 'u', 'ふ': 'u', 'む': 'u', 'ゆ': 'u', 'る': 'u',
      'え': 'e', 'け': 'e', 'せ': 'e', 'て': 'e', 'ね': 'e', 'へ': 'e', 'め': 'e', 'れ': 'e',
      'お': 'o', 'こ': 'o', 'そ': 'o', 'と': 'o', 'の': 'o', 'ほ': 'o', 'も': 'o', 'よ': 'o', 'ろ': 'o', 'を': 'o'
    }

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      
      // 句読点での休止
      if ('。！？、．，'.includes(char)) {
        phonemes.push({
          phoneme: 'silence',
          duration: options.pauseDuration,
          intensity: 0
        })
        continue
      }
      
      // スペースや改行での短い休止
      if (/\s/.test(char)) {
        phonemes.push({
          phoneme: 'silence',
          duration: charDuration * 0.5,
          intensity: 0
        })
        continue
      }

      // 音韻マッピング
      let phoneme = phonemeMap[char] || 'a' // デフォルトは'a'
      
      // 連続する同じ音韻の場合、強度を変える
      const prevPhoneme = phonemes[phonemes.length - 1]
      let intensity = options.intensity
      if (prevPhoneme && prevPhoneme.phoneme === phoneme) {
        intensity *= 0.8 // 少し弱くする
      }

      phonemes.push({
        phoneme,
        duration: charDuration,
        intensity
      })
    }

    return phonemes
  }

  /**
   * リップシンクアニメーションを開始
   */
  play(
    phonemes: PhonemeData[],
    onPhonemeChange: (phoneme: string, intensity: number) => void,
    onComplete?: () => void
  ): void {
    if (this.isPlaying) {
      this.stop()
    }

    this.isPlaying = true
    this.onPhonemeChange = onPhonemeChange
    this.onComplete = onComplete || null

    let currentIndex = 0
    let startTime = performance.now()

    const animate = (currentTime: number) => {
      if (!this.isPlaying) return

      const elapsedTime = currentTime - startTime

      // 現在の音韻を見つける
      let accumulatedTime = 0
      let currentPhoneme: PhonemeData | null = null
      let phonemeIndex = -1

      for (let i = 0; i < phonemes.length; i++) {
        if (elapsedTime >= accumulatedTime && elapsedTime < accumulatedTime + phonemes[i].duration) {
          currentPhoneme = phonemes[i]
          phonemeIndex = i
          break
        }
        accumulatedTime += phonemes[i].duration
      }

      if (currentPhoneme) {
        // 前回と異なる音韻の場合のみインデックス更新（ログは削除）
        if (phonemeIndex !== currentIndex) {
          currentIndex = phonemeIndex
        }
        
        // 音韻の変化を通知
        if (this.onPhonemeChange) {
          const intensity = currentPhoneme.phoneme === 'silence' ? 0 : currentPhoneme.intensity
          this.onPhonemeChange(currentPhoneme.phoneme, intensity)
        }
      } else {
        // アニメーション終了
        this.stop()
        if (this.onComplete) {
          this.onComplete()
        }
        return
      }

      this.animationId = requestAnimationFrame(animate)
    }

    this.animationId = requestAnimationFrame(animate)
  }

  /**
   * テキストから直接リップシンクを開始
   */
  playText(
    text: string,
    onPhonemeChange: (phoneme: string, intensity: number) => void,
    onComplete?: () => void,
    options?: Partial<LipSyncOptions>
  ): void {
    const defaultOptions: LipSyncOptions = {
      speed: 8,
      intensity: 0.7,
      pauseDuration: 300
    }
    
    const finalOptions = { ...defaultOptions, ...options }
    const phonemes = LipSync.textToPhonemes(text, finalOptions)
    console.log(`[LipSync] Generated ${phonemes.length} phonemes for text: "${text.substring(0, 20)}..."`)
    this.play(phonemes, onPhonemeChange, onComplete)
  }

  /**
   * リップシンクを停止
   */
  stop(): void {
    this.isPlaying = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    
    // 口を閉じる
    if (this.onPhonemeChange) {
      this.onPhonemeChange('silence', 0)
    }
  }
}
```

## 5. 音声合成統合 (VOICEVOX + Web Speech API)

**ファイル**: `hooks/useUnifiedVoiceSynthesis.ts`

```typescript
/**
 * Unified Voice Synthesis React Hook
 * VOICEVOX と Web Speech API を統合した音声合成フック
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Emotion } from '@asd-aituber/types'
import { 
  UnifiedVoiceSynthesis,
  unifiedVoiceSynthesis,
  type VoiceEngine,
  type UnifiedVoiceOptions,
  type VoiceEngineStatus
} from '@/lib/unified-voice-synthesis'
import { type VoicevoxSpeaker } from '@/lib/voicevox-client'
import { type SpeechSynthesisCallbacks } from '@/lib/speech-synthesis'

export interface UseUnifiedVoiceSynthesisOptions {
  preferredEngine?: VoiceEngine
  defaultSpeaker?: string | number
  defaultEmotion?: Emotion
  defaultMode?: 'asd' | 'nt'
  volume?: number
  callbacks?: SpeechSynthesisCallbacks
}

export interface UseUnifiedVoiceSynthesisReturn {
  // 音声合成制御
  speak: (text: string, options?: Partial<UnifiedVoiceOptions>) => Promise<boolean>
  stop: () => void
  pause: () => void
  resume: () => void
  
  // 状態
  isSpeaking: boolean
  isLoading: boolean
  error: string | null
  
  // エンジン設定
  currentEngine: VoiceEngine
  setPreferredEngine: (engine: VoiceEngine) => void
  engineStatus: VoiceEngineStatus | null
  
  // VOICEVOX設定
  voicevoxSpeakers: VoicevoxSpeaker[]
  selectedSpeaker: string | number
  setSelectedSpeaker: (speaker: string | number) => void
  
  // Web Speech API設定
  webSpeechVoices: SpeechSynthesisVoice[]
  selectedWebVoice: SpeechSynthesisVoice | null
  setSelectedWebVoice: (voice: SpeechSynthesisVoice | null) => void
  
  // 共通設定
  volume: number
  setVolume: (volume: number) => void
  emotion: Emotion
  setEmotion: (emotion: Emotion) => void
  mode: 'asd' | 'nt'
  setMode: (mode: 'asd' | 'nt') => void
  
  // ユーティリティ
  refreshEngines: () => Promise<void>
  testVoice: (text?: string) => Promise<boolean>
}

export function useUnifiedVoiceSynthesis(
  options: UseUnifiedVoiceSynthesisOptions = {}
): UseUnifiedVoiceSynthesisReturn {
  const {
    preferredEngine = 'auto',
    defaultSpeaker = '46',
    defaultEmotion = 'neutral',
    defaultMode = 'nt',
    volume: initialVolume = 1.0,
    callbacks: externalCallbacks = {}
  } = options

  // 状態管理
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentEngine, setCurrentEngine] = useState<VoiceEngine>(preferredEngine)
  const [engineStatus, setEngineStatus] = useState<VoiceEngineStatus | null>(null)
  
  // VOICEVOX設定
  const [voicevoxSpeakers, setVoicevoxSpeakers] = useState<VoicevoxSpeaker[]>([])
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | number>(defaultSpeaker)
  
  // Web Speech API設定
  const [webSpeechVoices, setWebSpeechVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedWebVoice, setSelectedWebVoice] = useState<SpeechSynthesisVoice | null>(null)
  
  // 共通設定
  const [volume, setVolume] = useState(initialVolume)
  const [emotion, setEmotion] = useState<Emotion>(defaultEmotion)
  const [mode, setMode] = useState<'asd' | 'nt'>(defaultMode)

  const isMountedRef = useRef(true)
  const synthesizerRef = useRef<UnifiedVoiceSynthesis>(unifiedVoiceSynthesis)

  // 初期化
  useEffect(() => {
    const initializeEngines = async () => {
      setIsLoading(true)
      try {
        await refreshEngines()
      } catch (error) {
        console.error('Failed to initialize voice engines:', error)
        setError('Failed to initialize voice engines')
      } finally {
        setIsLoading(false)
      }
    }

    initializeEngines()

    return () => {
      isMountedRef.current = false
      synthesizerRef.current.destroy()
    }
  }, [])

  // コールバックの設定
  useEffect(() => {
    const callbacks: SpeechSynthesisCallbacks = {
      onStart: () => {
        if (isMountedRef.current) {
          setIsSpeaking(true)
          setError(null)
        }
        externalCallbacks.onStart?.()
      },
      onEnd: () => {
        if (isMountedRef.current) {
          setIsSpeaking(false)
        }
        externalCallbacks.onEnd?.()
      },
      onPause: () => {
        externalCallbacks.onPause?.()
      },
      onResume: () => {
        externalCallbacks.onResume?.()
      },
      onError: (errorMessage) => {
        if (isMountedRef.current) {
          setError(errorMessage)
          setIsSpeaking(false)
        }
        externalCallbacks.onError?.(errorMessage)
      },
      onBoundary: externalCallbacks.onBoundary,
      onWord: externalCallbacks.onWord
    }

    // コールバックは speak 関数内で設定されるため、ここでは保存のみ
  }, [externalCallbacks])

  // エンジン状態の更新
  const refreshEngines = useCallback(async () => {
    try {
      const status = await synthesizerRef.current.getEngineStatus()
      
      if (isMountedRef.current) {
        setEngineStatus(status)
        setVoicevoxSpeakers(status.voicevox.speakers)
        setWebSpeechVoices(status.webspeech.voices)
        
        // デフォルト音声の設定
        if (status.webspeech.voices.length > 0 && !selectedWebVoice) {
          const japaneseVoice = status.webspeech.voices.find(v => 
            v.lang.includes('ja') || v.lang.includes('JP')
          )
          setSelectedWebVoice(japaneseVoice || status.webspeech.voices[0])
        }
      }
    } catch (error) {
      console.error('Failed to refresh voice engines:', error)
      if (isMountedRef.current) {
        setError('Failed to refresh voice engines')
      }
    }
  }, [selectedWebVoice])

  // 音声合成実行
  const speak = useCallback(async (
    text: string, 
    overrideOptions: Partial<UnifiedVoiceOptions> = {}
  ): Promise<boolean> => {
    if (!text.trim()) {
      setError('Text cannot be empty')
      return false
    }

    setError(null)

    const options: UnifiedVoiceOptions = {
      text,
      emotion,
      mode,
      engine: currentEngine,
      speaker: selectedSpeaker,
      voice: selectedWebVoice,
      lang: 'ja-JP',
      volume,
      callbacks: {
        onStart: () => {
          if (isMountedRef.current) {
            setIsSpeaking(true)
            setError(null)
          }
          externalCallbacks.onStart?.()
        },
        onEnd: () => {
          if (isMountedRef.current) {
            setIsSpeaking(false)
          }
          externalCallbacks.onEnd?.()
        },
        onError: (errorMessage) => {
          if (isMountedRef.current) {
            setError(errorMessage)
            setIsSpeaking(false)
          }
          externalCallbacks.onError?.(errorMessage)
        },
        onPause: externalCallbacks.onPause,
        onResume: externalCallbacks.onResume,
        onBoundary: externalCallbacks.onBoundary,
        onWord: externalCallbacks.onWord
      },
      ...overrideOptions
    }

    try {
      return await synthesizerRef.current.speak(options)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Voice synthesis failed'
      setError(errorMessage)
      return false
    }
  }, [
    emotion, 
    mode, 
    currentEngine, 
    selectedSpeaker, 
    selectedWebVoice, 
    volume, 
    externalCallbacks
  ])

  // 停止
  const stop = useCallback(() => {
    synthesizerRef.current.stop()
    setIsSpeaking(false)
  }, [])

  // 一時停止
  const pause = useCallback(() => {
    synthesizerRef.current.pause()
  }, [])

  // 再開
  const resume = useCallback(() => {
    synthesizerRef.current.resume()
  }, [])

  // 優先エンジンの設定
  const setPreferredEngine = useCallback((engine: VoiceEngine) => {
    setCurrentEngine(engine)
    synthesizerRef.current.setPreferredEngine(engine)
  }, [])

  // 音声テスト
  const testVoice = useCallback(async (text: string = 'こんにちは。音声テストです。') => {
    return await speak(text)
  }, [speak])

  return {
    // 音声合成制御
    speak,
    stop,
    pause,
    resume,
    
    // 状態
    isSpeaking,
    isLoading,
    error,
    
    // エンジン設定
    currentEngine,
    setPreferredEngine,
    engineStatus,
    
    // VOICEVOX設定
    voicevoxSpeakers,
    selectedSpeaker,
    setSelectedSpeaker,
    
    // Web Speech API設定
    webSpeechVoices,
    selectedWebVoice,
    setSelectedWebVoice,
    
    // 共通設定
    volume,
    setVolume,
    emotion,
    setEmotion,
    mode,
    setMode,
    
    // ユーティリティ
    refreshEngines,
    testVoice
  }
}

/**
 * 簡易統合音声合成フック
 */
export function useSimpleUnifiedVoice(defaultOptions?: UseUnifiedVoiceSynthesisOptions) {
  const { speak, stop, isSpeaking, error, currentEngine } = useUnifiedVoiceSynthesis({
    preferredEngine: 'auto',
    ...defaultOptions
  })

  return { speak, stop, isSpeaking, error, currentEngine }
}
```

## 6. 統合音声合成ライブラリ

**ファイル**: `lib/unified-voice-synthesis.ts`

```typescript
/**
 * 統合音声合成システム
 * VOICEVOX と Web Speech API を統合し、自動フォールバック機能を提供
 */

import type { Emotion } from '@asd-aituber/types'
import { VoicevoxClient, type VoicevoxSpeaker } from './voicevox-client'
import { speechSynthesis, type SpeechSynthesisCallbacks } from './speech-synthesis'

export type VoiceEngine = 'voicevox' | 'webspeech' | 'auto'

export interface UnifiedVoiceOptions {
  text: string
  emotion?: Emotion
  mode?: 'asd' | 'nt'
  engine?: VoiceEngine
  speaker?: string | number
  voice?: SpeechSynthesisVoice | null
  lang?: string
  volume?: number
  callbacks?: SpeechSynthesisCallbacks
}

export interface VoiceEngineStatus {
  voicevox: {
    available: boolean
    speakers: VoicevoxSpeaker[]
    error?: string
  }
  webspeech: {
    available: boolean
    voices: SpeechSynthesisVoice[]
  }
}

/**
 * 統合音声合成クラス
 */
export class UnifiedVoiceSynthesis {
  private voicevoxClient: VoicevoxClient
  private preferredEngine: VoiceEngine = 'auto'
  
  constructor() {
    this.voicevoxClient = new VoicevoxClient()
  }

  /**
   * 音声合成を実行
   */
  async speak(options: UnifiedVoiceOptions): Promise<boolean> {
    const {
      text,
      emotion = 'neutral',
      mode = 'nt',
      engine = this.preferredEngine,
      speaker = '46',
      voice = null,
      lang = 'ja-JP',
      volume = 1.0,
      callbacks = {}
    } = options

    // エンジンの決定
    const selectedEngine = await this.selectEngine(engine)
    
    try {
      switch (selectedEngine) {
        case 'voicevox':
          return await this.speakWithVoicevox(text, {
            speaker,
            emotion,
            mode,
            volume,
            callbacks
          })
          
        case 'webspeech':
          return await this.speakWithWebSpeech(text, {
            voice,
            lang,
            volume,
            callbacks
          })
          
        default:
          throw new Error(`Unsupported engine: ${selectedEngine}`)
      }
    } catch (error) {
      console.error(`Voice synthesis failed with ${selectedEngine}:`, error)
      
      // フォールバック: 別のエンジンを試行
      if (engine === 'auto' && selectedEngine !== 'webspeech') {
        console.log('Falling back to Web Speech API')
        return await this.speakWithWebSpeech(text, {
          voice,
          lang,
          volume,
          callbacks
        })
      }
      
      callbacks.onError?.(`Voice synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }

  /**
   * VOICEVOXで音声合成
   */
  private async speakWithVoicevox(
    text: string,
    options: {
      speaker: string | number
      emotion: Emotion
      mode: 'asd' | 'nt'
      volume: number
      callbacks: SpeechSynthesisCallbacks
    }
  ): Promise<boolean> {
    const { speaker, emotion, mode, volume, callbacks } = options
    
    try {
      console.log('🎤 Using VOICEVOX engine for synthesis')
      
      callbacks.onStart?.()
      
      const audioUrl = await this.voicevoxClient.generateSpeech(text, {
        speaker: typeof speaker === 'string' ? parseInt(speaker) : speaker,
        emotion,
        mode,
        volume
      })
      
      // 音声を再生
      return new Promise((resolve) => {
        const audio = new Audio(audioUrl)
        audio.volume = volume
        
        audio.onended = () => {
          callbacks.onEnd?.()
          resolve(true)
        }
        
        audio.onerror = (error) => {
          console.error('Audio playback error:', error)
          callbacks.onError?.('Audio playback failed')
          resolve(false)
        }
        
        audio.play().catch(error => {
          console.error('Failed to play audio:', error)
          callbacks.onError?.('Failed to play audio')
          resolve(false)
        })
      })
      
    } catch (error) {
      console.error('VOICEVOX synthesis failed:', error)
      throw error
    }
  }

  /**
   * Web Speech APIで音声合成
   */
  private async speakWithWebSpeech(
    text: string,
    options: {
      voice: SpeechSynthesisVoice | null
      lang: string
      volume: number
      callbacks: SpeechSynthesisCallbacks
    }
  ): Promise<boolean> {
    const { voice, lang, volume, callbacks } = options
    
    console.log('🗣️ Using webspeech engine for synthesis')
    
    return speechSynthesis.speak(text, {
      voice,
      lang,
      volume,
      rate: 1.0,
      pitch: 1.0,
      callbacks
    })
  }

  /**
   * 使用するエンジンを選択
   */
  private async selectEngine(preferredEngine: VoiceEngine): Promise<VoiceEngine> {
    if (preferredEngine === 'voicevox') {
      const isVoicevoxAvailable = await this.voicevoxClient.isAvailable()
      if (isVoicevoxAvailable) {
        return 'voicevox'
      } else {
        throw new Error('VOICEVOX is not available')
      }
    }
    
    if (preferredEngine === 'webspeech') {
      return 'webspeech'
    }
    
    // auto: VOICEVOXを優先し、利用できない場合はWeb Speech APIにフォールバック
    const isVoicevoxAvailable = await this.voicevoxClient.isAvailable()
    return isVoicevoxAvailable ? 'voicevox' : 'webspeech'
  }

  /**
   * エンジンの状態を取得
   */
  async getEngineStatus(): Promise<VoiceEngineStatus> {
    const [voicevoxStatus, webSpeechVoices] = await Promise.all([
      this.getVoicevoxStatus(),
      this.getWebSpeechVoices()
    ])

    return {
      voicevox: voicevoxStatus,
      webspeech: {
        available: webSpeechVoices.length > 0,
        voices: webSpeechVoices
      }
    }
  }

  /**
   * VOICEVOXの状態を取得
   */
  private async getVoicevoxStatus() {
    try {
      const isAvailable = await this.voicevoxClient.isAvailable()
      if (isAvailable) {
        const speakers = await this.voicevoxClient.getSpeakers()
        return {
          available: true,
          speakers
        }
      } else {
        return {
          available: false,
          speakers: [],
          error: 'VOICEVOX server not accessible'
        }
      }
    } catch (error) {
      return {
        available: false,
        speakers: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Web Speech APIの音声リストを取得
   */
  private async getWebSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve([])
        return
      }

      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        resolve(voices)
      } else {
        // 初回読み込み時は音声リストが空の場合があるため、イベントを待つ
        const onVoicesChanged = () => {
          const voices = window.speechSynthesis.getVoices()
          resolve(voices)
          window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
        }
        
        window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
        
        // タイムアウト設定
        setTimeout(() => {
          window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
          resolve([])
        }, 1000)
      }
    })
  }

  /**
   * 優先エンジンを設定
   */
  setPreferredEngine(engine: VoiceEngine): void {
    this.preferredEngine = engine
  }

  /**
   * 音声合成を停止
   */
  stop(): void {
    // Web Speech API の停止
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    
    // VOICEVOX の停止は現在のところ、audio要素のstop()が必要
    // 実装は各コンポーネントレベルで管理
  }

  /**
   * 音声合成を一時停止
   */
  pause(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause()
    }
  }

  /**
   * 音声合成を再開
   */
  resume(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume()
    }
  }

  /**
   * リソースの解放
   */
  destroy(): void {
    this.stop()
  }
}

// シングルトンインスタンス
export const unifiedVoiceSynthesis = new UnifiedVoiceSynthesis()
```

---

## 問題の要点

1. **シンプルなリップシンク実装に切り替え済み** - aituber-kit方式を採用
2. **詳細なデバッグログを追加済み** - 表情の存在確認と値の設定を詳細に追跡
3. **VRM更新順序も確認済み** - アニメーションコントローラーの更新がVRM更新前に実行

次のステップとして、実際のVRMモデルの構造とexpressionManagerの詳細を確認する必要があります。