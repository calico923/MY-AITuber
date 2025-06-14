'use client'

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm'
import { VRMAnimationController } from '@/lib/vrm-animation'
import type { Emotion } from '@asd-aituber/types'
import type { LipSyncFrame } from '@/lib/lip-sync'

export interface VRMViewerRef {
  setEmotion: (emotion: Emotion) => void
  setSpeaking: (intensity: number) => void
  speakText: (text: string, onComplete?: () => void) => void
  stopSpeaking: () => void
  forceStopSpeaking?: () => void  // Priority 3: 強制停止機能
  getAvailableExpressions: () => string[]
  speakWithAudio?: (audio: HTMLAudioElement, frames: LipSyncFrame[]) => void  // 旧方式
  playAudioWithLipSync?: (audioBuffer: ArrayBuffer) => Promise<void>  // ✅ 新方式: aituber-kit style
}

interface VRMViewerProps {
  modelUrl?: string
  emotion?: Emotion
  isSpeaking?: boolean
}

const VRMViewer = forwardRef<VRMViewerRef, VRMViewerProps>(
  ({ modelUrl, emotion = 'neutral', isSpeaking = false }, ref) => {
    console.log('VRMViewer component rendered with ref:', ref)
    const mountRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const vrmRef = useRef<VRM | null>(null)
    const animationControllerRef = useRef<VRMAnimationController | null>(null)
    const clockRef = useRef<THREE.Clock>(new THREE.Clock())
    const controlsRef = useRef<OrbitControls | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [availableExpressions, setAvailableExpressions] = useState<string[]>([])

    // 外部から呼び出し可能なメソッドを公開
    useImperativeHandle(ref, () => {
      console.log('VRMViewer useImperativeHandle setup, animation controller available:', !!animationControllerRef.current)
      return {
        setEmotion: (newEmotion: Emotion) => {
          if (animationControllerRef.current) {
            animationControllerRef.current.setEmotion(newEmotion)
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
        forceStopSpeaking: () => {
          console.log('VRMViewer.forceStopSpeaking called')
          if (animationControllerRef.current) {
            console.log('Animation controller available, calling forceStopSpeaking')
            animationControllerRef.current.forceStopSpeaking()
          } else {
            console.warn('Animation controller not available for forceStopSpeaking')
          }
        },
        getAvailableExpressions: () => availableExpressions,
        speakWithAudio: (audio: HTMLAudioElement, frames: LipSyncFrame[]) => {
          console.log('VRMViewer.speakWithAudio called with', frames.length, 'frames')
          if (animationControllerRef.current) {
            console.log('Animation controller available, calling speakWithAudio')
            animationControllerRef.current.speakWithAudio(audio, frames)
          } else {
            console.warn('Animation controller not available for speakWithAudio')
          }
        },
        playAudioWithLipSync: async (audioBuffer: ArrayBuffer) => {
          console.log('VRMViewer.playAudioWithLipSync called with ArrayBuffer of', audioBuffer.byteLength, 'bytes')
          if (animationControllerRef.current) {
            console.log('Animation controller available, calling playAudioWithLipSync')
            await animationControllerRef.current.playAudioWithLipSync(audioBuffer)
          } else {
            console.warn('Animation controller not available for playAudioWithLipSync')
          }
        }
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
    camera.position.set(0, 1.2, 3.5)  // 少し後ろに引いて全身を表示
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer
    container.appendChild(renderer.domElement)

    // Light setup
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(1, 1, 1).normalize()
    light.castShadow = true
    scene.add(light)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    // OrbitControls setup
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 1.0, 0)  // VRMの胸の高さを見る
    controls.enableDamping = true   // スムーズな操作
    controls.dampingFactor = 0.05
    controls.minDistance = 1.5      // 最小ズーム距離
    controls.maxDistance = 8        // 最大ズーム距離
    controls.minPolarAngle = Math.PI * 0.1  // 上からの角度制限
    controls.maxPolarAngle = Math.PI * 0.8  // 下からの角度制限
    controls.update()
    controlsRef.current = controls

    // Add a simple cube for testing if no model is provided
    if (!modelUrl) {
      const geometry = new THREE.BoxGeometry(1, 1, 1)
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
      const cube = new THREE.Mesh(geometry, material)
      cube.position.set(0, 0.5, 0)
      scene.add(cube)
    } else {
      // Load VRM model
      setIsLoading(true)
      const loader = new GLTFLoader()
      loader.register((parser) => {
        return new VRMLoaderPlugin(parser)
      })

      loader.load(
        modelUrl,
        (gltf) => {
          const vrm = gltf.userData.vrm as VRM
          if (vrm) {
            vrmRef.current = vrm
            scene.add(vrm.scene)
            vrm.scene.rotation.y = Math.PI
            
            // 1フレーム待ってからアニメーションコントローラーを初期化
            requestAnimationFrame(() => {
              console.log('Initializing VRM animation controller...')
              // アニメーションコントローラーを初期化
              animationControllerRef.current = new VRMAnimationController(vrm)
              animationControllerRef.current.setEmotion(emotion)
              
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
              if ((aaValue && aaValue > 0) || (happyValue && happyValue > 0)) {
                console.log(`[VRMViewer] Expression values: aa=${aaValue?.toFixed(3) || 0}, happy=${happyValue?.toFixed(3) || 0}`)
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
      
      // コントロールのサイズ更新
      if (controlsRef.current) {
        controlsRef.current.update()
      }
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      
      // VRMAnimationController のクリーンアップ
      if (animationControllerRef.current) {
        animationControllerRef.current.destroy()
        animationControllerRef.current = null
      }
      
      // VRM のクリーンアップ
      if (vrmRef.current) {
        vrmRef.current = null
      }
      
      // Three.js オブジェクトのクリーンアップ
      if (controlsRef.current) {
        controlsRef.current.dispose()
        controlsRef.current = null
      }
      
      if (sceneRef.current) {
        // シーンのオブジェクトを全て削除
        while (sceneRef.current.children.length > 0) {
          sceneRef.current.remove(sceneRef.current.children[0])
        }
        sceneRef.current = null
      }
      
      if (rendererRef.current) {
        if (container.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement)
        }
        rendererRef.current.dispose()
        rendererRef.current = null
      }
      
      if (cameraRef.current) {
        cameraRef.current = null
      }
    }
  }, [modelUrl])

    return (
      <div className="w-full h-full relative">
        <div ref={mountRef} className="w-full h-full" />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
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