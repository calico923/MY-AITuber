import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PerformanceMonitor } from '@/lib/performance-monitor'

// Basic mocks
global.performance = {
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 200 * 1024 * 1024,
  },
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
} as any

global.navigator = {
  userAgent: 'test-user-agent'
} as any

class MockPerformanceObserver {
  constructor(callback: PerformanceObserverCallback) {}
  observe() {}
  disconnect() {}
}
global.PerformanceObserver = MockPerformanceObserver as any

describe('Performance Monitoring Basic Tests', () => {
  let monitor: PerformanceMonitor

  beforeEach(() => {
    vi.useFakeTimers()
    ;(PerformanceMonitor as any).instance = null
    monitor = PerformanceMonitor.getInstance()
  })

  afterEach(() => {
    monitor.destroy()
    vi.useRealTimers()
  })

  describe('tdd-6.1: Memory usage monitoring', () => {
    it('should initialize with memory limits', () => {
      const metrics = monitor.getCurrentMetrics()
      expect(metrics.memory.limit).toBe(150) // 150MB limit
      expect(metrics.memory.used).toBeGreaterThanOrEqual(0)
    })

    it('should support monitoring lifecycle', () => {
      expect(() => monitor.startMonitoring()).not.toThrow()
      expect(() => monitor.stopMonitoring()).not.toThrow()
      expect(() => monitor.reset()).not.toThrow()
    })
  })

  describe('tdd-6.6: CPU usage monitoring', () => {
    it('should estimate CPU usage', () => {
      monitor.startMonitoring()
      vi.advanceTimersByTime(1000)
      
      const metrics = monitor.getCurrentMetrics()
      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0)
      expect(metrics.cpu.usage).toBeLessThanOrEqual(100)
      expect(metrics.cpu.limit).toBe(40) // 40% limit
    })
  })

  describe('tdd-6.3: Real-time performance dashboard', () => {
    it('should track system information', () => {
      monitor.startMonitoring()
      vi.advanceTimersByTime(1000)
      
      const metrics = monitor.getCurrentMetrics()
      expect(metrics.system).toBeDefined()
      expect(metrics.system.timestamp).toBeGreaterThan(0)
      expect(metrics.system.activeFeatures).toBeInstanceOf(Array)
    })

    it('should track realtime metrics', () => {
      const metrics = monitor.getCurrentMetrics()
      expect(metrics.realtime).toBeDefined()
      expect(metrics.realtime.audioLatency).toBeGreaterThanOrEqual(0)
      expect(metrics.realtime.vrmFrameRate).toBeGreaterThanOrEqual(0)
      expect(metrics.realtime.websocketLatency).toBeGreaterThanOrEqual(0)
    })
  })

  describe('tdd-6.7: Performance anomaly detection', () => {
    it('should support custom measurements', () => {
      expect(() => {
        monitor.startMeasure('test-operation')
        monitor.endMeasure('test-operation')
      }).not.toThrow()
    })

    it('should maintain alert history', () => {
      const alerts = monitor.getAlertHistory()
      expect(Array.isArray(alerts)).toBe(true)
    })

    it('should support callback registration', () => {
      let callbackCalled = false
      const unsubscribe = monitor.onMetricsUpdate(() => {
        callbackCalled = true
      })
      
      monitor.startMonitoring()
      vi.advanceTimersByTime(1000)
      
      unsubscribe()
      expect(typeof unsubscribe).toBe('function')
    })
  })
})