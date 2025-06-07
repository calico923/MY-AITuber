import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import VRMViewer from './VRMViewer'

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

  it('creates WebGL renderer with correct settings', () => {
    const WebGLRendererMock = vi.mocked(THREE.WebGLRenderer)
    render(<VRMViewer />)
    
    expect(WebGLRendererMock).toHaveBeenCalledWith({ antialias: true })
    const renderer = WebGLRendererMock.mock.results[0].value
    expect(renderer.setSize).toHaveBeenCalled()
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(window.devicePixelRatio)
  })

  it('cleans up resources on unmount', () => {
    const { unmount } = render(<VRMViewer />)
    const WebGLRendererMock = vi.mocked(THREE.WebGLRenderer)
    const renderer = WebGLRendererMock.mock.results[0].value
    
    unmount()
    
    expect(renderer.dispose).toHaveBeenCalled()
  })

  it('handles window resize', () => {
    render(<VRMViewer />)
    const WebGLRendererMock = vi.mocked(THREE.WebGLRenderer)
    const renderer = WebGLRendererMock.mock.results[0].value
    
    // Clear previous calls
    renderer.setSize.mockClear()
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'))
    
    expect(renderer.setSize).toHaveBeenCalled()
  })
})