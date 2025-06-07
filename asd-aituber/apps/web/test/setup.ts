import '@testing-library/jest-dom'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '',
}))

// Mock dynamic import for VRMViewer
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<any>) => {
    const Component = () => null
    Component.displayName = 'DynamicComponent'
    return Component
  },
}))

// Mock Three.js for unit tests
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
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement('canvas'),
    shadowMap: {
      enabled: false,
      type: null,
    },
  })),
  DirectionalLight: vi.fn(() => ({
    position: { 
      set: vi.fn().mockReturnThis(),
      normalize: vi.fn().mockReturnThis()
    },
    castShadow: false,
  })),
  AmbientLight: vi.fn(() => ({})),
  Color: vi.fn(() => ({})),
  BoxGeometry: vi.fn(() => ({})),
  MeshStandardMaterial: vi.fn(() => ({})),
  Mesh: vi.fn(() => ({
    position: { set: vi.fn() },
  })),
  PCFSoftShadowMap: 'PCFSoftShadowMap',
}))

// Make THREE available globally for tests
;(global as any).THREE = await vi.importMock('three')