import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import VRMViewer from './VRMViewer'

// Mock Three.js
vi.mock('three', () => ({
  Scene: vi.fn(() => ({
    add: vi.fn(),
    background: null,
  })),
  PerspectiveCamera: vi.fn(() => ({
    position: { set: vi.fn() },
    aspect: 1,
    updateProjectionMatrix: vi.fn(),
  })),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    shadowMap: { enabled: false, type: null },
    domElement: document.createElement('canvas'),
    render: vi.fn(),
    dispose: vi.fn(),
  })),
  DirectionalLight: vi.fn(() => ({
    position: { set: vi.fn(() => ({ normalize: vi.fn() })) },
    castShadow: false,
  })),
  AmbientLight: vi.fn(),
  BoxGeometry: vi.fn(),
  MeshStandardMaterial: vi.fn(),
  Mesh: vi.fn(() => ({
    position: { set: vi.fn() },
  })),
  Color: vi.fn(),
  PCFSoftShadowMap: 'PCFSoftShadowMap',
  Clock: vi.fn(() => ({
    getDelta: vi.fn(() => 1/60),
  })),
}))

// Mock VRM Animation Controller
const mockAnimationController = {
  setEmotion: vi.fn(),
  setSpeaking: vi.fn(),
  update: vi.fn(),
  getAvailableExpressions: vi.fn(() => ['happy', 'sad', 'blink']),
  reset: vi.fn(),
}

vi.mock('@/lib/vrm-animation', () => ({
  VRMAnimationController: vi.fn(() => mockAnimationController),
}))

// Mock GLTFLoader
vi.mock('three/examples/jsm/loaders/GLTFLoader', () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    register: vi.fn(),
    load: vi.fn((url, onSuccess, onProgress, onError) => {
      // Simulate successful load for test
      if (url.includes('test-success')) {
        setTimeout(() => {
          onSuccess({
            userData: {
              vrm: {
                scene: {
                  rotation: { y: 0 },
                },
                update: vi.fn(),
                expressionManager: {
                  setValue: vi.fn(),
                  getExpressionTrackName: vi.fn(() => 'mock-track'),
                },
                humanoid: {
                  getNormalizedBoneNode: vi.fn(),
                },
              },
            },
          })
        }, 100)
      } else if (url.includes('test-error')) {
        setTimeout(() => {
          onError(new Error('Failed to load VRM'))
        }, 100)
      }
    }),
  })),
}))

// Mock OrbitControls
vi.mock('three/examples/jsm/controls/OrbitControls', () => ({
  OrbitControls: vi.fn().mockImplementation(() => ({
    target: { set: vi.fn() },
    enableDamping: true,
    dampingFactor: 0.05,
    minDistance: 1.5,
    maxDistance: 8,
    minPolarAngle: 0,
    maxPolarAngle: 0,
    update: vi.fn(),
    dispose: vi.fn(),
  })),
}))

// Mock VRMLoaderPlugin
vi.mock('@pixiv/three-vrm', () => ({
  VRMLoaderPlugin: vi.fn(),
}))

describe('VRMViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<VRMViewer />)
    expect(screen.getByText('Test cube (no VRM model loaded)')).toBeInTheDocument()
  })

  it('displays loading state when modelUrl is provided', async () => {
    render(<VRMViewer modelUrl="/test-success.vrm" />)
    
    await waitFor(() => {
      expect(screen.getByText('Loading VRM model...')).toBeInTheDocument()
    })
  })

  it('loads VRM model successfully', async () => {
    render(<VRMViewer modelUrl="/test-success.vrm" />)
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading VRM model...')).not.toBeInTheDocument()
    }, { timeout: 200 })
    
    // Should not show error or test cube message
    expect(screen.queryByText('Test cube (no VRM model loaded)')).not.toBeInTheDocument()
    expect(screen.queryByText(/Error loading VRM/)).not.toBeInTheDocument()
  })

  it('displays error when VRM model fails to load', async () => {
    render(<VRMViewer modelUrl="/test-error.vrm" />)
    
    await waitFor(() => {
      expect(screen.getByText(/Error loading VRM/)).toBeInTheDocument()
    }, { timeout: 200 })
  })

  it('creates WebGL renderer with correct settings', async () => {
    render(<VRMViewer />)
    
    const { WebGLRenderer } = await import('three')
    const WebGLRendererMock = vi.mocked(WebGLRenderer)
    
    expect(WebGLRendererMock).toHaveBeenCalledWith({ antialias: true })
    const renderer = WebGLRendererMock.mock.results[0].value
    expect(renderer.setSize).toHaveBeenCalled()
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(window.devicePixelRatio)
  })

  it('cleans up resources on unmount', async () => {
    const { unmount } = render(<VRMViewer />)
    
    const { WebGLRenderer } = await import('three')
    const WebGLRendererMock = vi.mocked(WebGLRenderer)
    const renderer = WebGLRendererMock.mock.results[0].value
    
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls')
    const OrbitControlsMock = vi.mocked(OrbitControls)
    const controls = OrbitControlsMock.mock.results[0].value
    
    unmount()
    
    expect(renderer.dispose).toHaveBeenCalled()
    expect(controls.dispose).toHaveBeenCalled()
  })

  it('initializes OrbitControls with correct settings', async () => {
    render(<VRMViewer />)
    
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls')
    const OrbitControlsMock = vi.mocked(OrbitControls)
    
    expect(OrbitControlsMock).toHaveBeenCalled()
    const controls = OrbitControlsMock.mock.results[0].value
    expect(controls.target.set).toHaveBeenCalledWith(0, 1.0, 0)
    expect(controls.update).toHaveBeenCalled()
  })

  it('handles window resize', async () => {
    render(<VRMViewer />)
    
    const { WebGLRenderer } = await import('three')
    const WebGLRendererMock = vi.mocked(WebGLRenderer)
    const renderer = WebGLRendererMock.mock.results[0].value
    
    // Clear previous calls
    renderer.setSize.mockClear()
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'))
    
    expect(renderer.setSize).toHaveBeenCalled()
  })

  it('responds to emotion prop changes', async () => {
    const { rerender } = render(<VRMViewer modelUrl="/test-success.vrm" emotion="neutral" />)
    
    // Wait for VRM to load
    await waitFor(() => {
      expect(screen.queryByText('Loading VRM model...')).not.toBeInTheDocument()
    }, { timeout: 200 })
    
    // Change emotion
    rerender(<VRMViewer modelUrl="/test-success.vrm" emotion="joy" />)
    
    expect(mockAnimationController.setEmotion).toHaveBeenCalledWith('joy')
  })

  it('responds to speaking prop changes', async () => {
    const { rerender } = render(<VRMViewer modelUrl="/test-success.vrm" isSpeaking={false} />)
    
    // Wait for VRM to load
    await waitFor(() => {
      expect(screen.queryByText('Loading VRM model...')).not.toBeInTheDocument()
    }, { timeout: 200 })
    
    // Start speaking
    rerender(<VRMViewer modelUrl="/test-success.vrm" isSpeaking={true} />)
    
    expect(mockAnimationController.setSpeaking).toHaveBeenCalledWith(0.7)
  })

  it('displays available expressions info when VRM is loaded', async () => {
    render(<VRMViewer modelUrl="/test-success.vrm" emotion="joy" isSpeaking={true} />)
    
    // Wait for VRM to load
    await waitFor(() => {
      expect(screen.queryByText('Loading VRM model...')).not.toBeInTheDocument()
    }, { timeout: 200 })
    
    // Check if animation info is displayed
    expect(screen.getByText('Available expressions: 3')).toBeInTheDocument()
    expect(screen.getByText('Current emotion: joy')).toBeInTheDocument()
    expect(screen.getByText('🗣️ Speaking')).toBeInTheDocument()
  })

  it('initializes animation controller when VRM loads', async () => {
    render(<VRMViewer modelUrl="/test-success.vrm" emotion="sadness" />)
    
    // Wait for VRM to load
    await waitFor(() => {
      expect(screen.queryByText('Loading VRM model...')).not.toBeInTheDocument()
    }, { timeout: 200 })
    
    const { VRMAnimationController } = await import('@/lib/vrm-animation')
    expect(VRMAnimationController).toHaveBeenCalled()
    expect(mockAnimationController.setEmotion).toHaveBeenCalledWith('sadness')
  })

  it('exposes ref methods for external control', async () => {
    const ref = { current: null }
    render(<VRMViewer ref={ref} modelUrl="/test-success.vrm" />)
    
    // Wait for VRM to load
    await waitFor(() => {
      expect(screen.queryByText('Loading VRM model...')).not.toBeInTheDocument()
    }, { timeout: 200 })
    
    // Test ref methods
    expect(ref.current).toBeTruthy()
    if (ref.current) {
      expect(typeof ref.current.setEmotion).toBe('function')
      expect(typeof ref.current.setSpeaking).toBe('function')
      expect(typeof ref.current.getAvailableExpressions).toBe('function')
      
      // Test calling ref methods
      ref.current.setEmotion('anger')
      ref.current.setSpeaking(0.5)
      
      expect(mockAnimationController.setEmotion).toHaveBeenCalledWith('anger')
      expect(mockAnimationController.setSpeaking).toHaveBeenCalledWith(0.5)
    }
  })
})