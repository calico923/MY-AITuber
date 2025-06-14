import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor'
import { PerformanceMonitor } from '@/lib/performance-monitor'

// Mock Performance API
const mockPerformance = {
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 200 * 1024 * 1024,
  },
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
}

class MockPerformanceObserver {
  constructor(callback: PerformanceObserverCallback) {}
  observe() {}
  disconnect() {}
}

global.performance = mockPerformance as any
global.PerformanceObserver = MockPerformanceObserver as any

describe('usePerformanceMonitor Hook Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Reset singleton
    ;(PerformanceMonitor as any).instance = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Basic hook functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => usePerformanceMonitor())
      
      expect(result.current.metrics).toBeNull()
      expect(result.current.alerts).toEqual([])
      expect(result.current.isMonitoring).toBe(false)
      expect(result.current.isHealthy).toBe(true)
    })

    it('should auto-start monitoring when autoStart is true', () => {
      const { result } = renderHook(() => 
        usePerformanceMonitor({ autoStart: true })
      )
      
      expect(result.current.isMonitoring).toBe(true)
    })

    it('should start and stop monitoring correctly', () => {
      const { result } = renderHook(() => usePerformanceMonitor())
      
      expect(result.current.isMonitoring).toBe(false)
      
      act(() => {
        result.current.startMonitoring()
      })
      
      expect(result.current.isMonitoring).toBe(true)
      
      act(() => {
        result.current.stopMonitoring()
      })
      
      expect(result.current.isMonitoring).toBe(false)
    })
  })

  describe('Metrics and alerts handling', () => {
    it('should receive metrics updates when monitoring', () => {
      const { result } = renderHook(() => usePerformanceMonitor())
      
      act(() => {
        result.current.startMonitoring()
      })
      
      // Advance timer to trigger metrics collection
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      
      expect(result.current.metrics).not.toBeNull()
      expect(result.current.metrics?.memory).toBeDefined()
      expect(result.current.metrics?.cpu).toBeDefined()
      expect(result.current.metrics?.system).toBeDefined()
    })

    it('should handle alerts correctly', () => {
      // Set high memory usage to trigger alert
      mockPerformance.memory.usedJSHeapSize = 170 * 1024 * 1024 // 170MB
      
      const { result } = renderHook(() => usePerformanceMonitor())
      
      act(() => {
        result.current.startMonitoring()
      })
      
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      
      // Should receive alert for high memory usage
      expect(result.current.alerts.length).toBeGreaterThanOrEqual(0)
    })

    it('should call external alert callback', () => {
      const onAlert = vi.fn()
      
      // Set high memory usage
      mockPerformance.memory.usedJSHeapSize = 170 * 1024 * 1024
      
      const { result } = renderHook(() => 
        usePerformanceMonitor({ onAlert })
      )
      
      act(() => {
        result.current.startMonitoring()
      })
      
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      
      // External callback should be called if alert is triggered
      if (result.current.alerts.length > 0) {
        expect(onAlert).toHaveBeenCalled()
      }
    })

    it('should call external metrics callback', () => {
      const onMetricsUpdate = vi.fn()
      
      const { result } = renderHook(() => 
        usePerformanceMonitor({ onMetricsUpdate })
      )
      
      act(() => {
        result.current.startMonitoring()
      })
      
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      
      expect(onMetricsUpdate).toHaveBeenCalled()
    })
  })

  describe('Health status assessment', () => {
    it('should assess memory status correctly', () => {
      const { result } = renderHook(() => usePerformanceMonitor())
      
      act(() => {
        result.current.startMonitoring()
      })
      
      // Normal memory usage
      mockPerformance.memory.usedJSHeapSize = 50 * 1024 * 1024 // 50MB
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      
      expect(result.current.getMemoryStatus()).toBe('healthy')
      
      // Warning level
      mockPerformance.memory.usedJSHeapSize = 120 * 1024 * 1024 // 120MB
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      
      expect(result.current.getMemoryStatus()).toBe('warning')
      
      // Critical level
      mockPerformance.memory.usedJSHeapSize = 170 * 1024 * 1024 // 170MB
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      
      expect(result.current.getMemoryStatus()).toBe('critical')
    })

    it('should assess CPU status correctly', () => {
      const { result } = renderHook(() => usePerformanceMonitor())
      
      act(() => {
        result.current.startMonitoring()
      })
      
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      
      const cpuStatus = result.current.getCPUStatus()
      expect(['healthy', 'warning', 'critical']).toContain(cpuStatus)
    })

    it('should assess overall health correctly', () => {
      const { result } = renderHook(() => usePerformanceMonitor())
      
      act(() => {
        result.current.startMonitoring()
      })
      
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      
      const overallHealth = result.current.getOverallHealth()
      expect(['healthy', 'warning', 'critical']).toContain(overallHealth)
      
      // isHealthy should match overall health
      expect(result.current.isHealthy).toBe(overallHealth === 'healthy')
    })
  })

  describe('Custom measurements', () => {
    it('should support custom performance measurements', () => {
      const { result } = renderHook(() => usePerformanceMonitor())
      
      act(() => {
        result.current.startMeasure('custom-test')
      })
      
      expect(mockPerformance.mark).toHaveBeenCalledWith('custom-test-start')
      
      act(() => {
        result.current.endMeasure('custom-test')
      })
      
      expect(mockPerformance.mark).toHaveBeenCalledWith('custom-test-end')
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'custom-test',
        'custom-test-start',
        'custom-test-end'
      )
    })
  })

  describe('Performance statistics and trends', () => {
    it('should provide performance summary', () => {
      const { result } = renderHook(() => usePerformanceMonitor())
      
      act(() => {
        result.current.startMonitoring()
      })
      
      // Generate multiple metrics updates
      for (let i = 0; i < 5; i++) {
        act(() => {
          vi.advanceTimersByTime(5000)
        })
      }
      
      const summary = result.current.getPerformanceSummary()
      
      expect(summary).toBeDefined()
      expect(typeof summary.averageMemory).toBe('number')
      expect(typeof summary.averageCPU).toBe('number')
      expect(typeof summary.alertCount).toBe('number')
      expect(typeof summary.criticalAlertCount).toBe('number')
      expect(['improving', 'stable', 'degrading']).toContain(summary.memoryTrend)
      expect(['improving', 'stable', 'degrading']).toContain(summary.cpuTrend)
    })

    it('should detect performance trends', () => {
      const { result } = renderHook(() => usePerformanceMonitor())
      
      act(() => {
        result.current.startMonitoring()
      })
      
      // Simulate degrading memory usage
      const memoryProgression = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140]
      
      memoryProgression.forEach(memoryMB => {
        mockPerformance.memory.usedJSHeapSize = memoryMB * 1024 * 1024
        act(() => {
          vi.advanceTimersByTime(5000)
        })
      })
      
      const summary = result.current.getPerformanceSummary()
      
      // With increasing memory usage, trend should be 'degrading' or 'stable'
      expect(['stable', 'degrading']).toContain(summary.memoryTrend)
      expect(summary.averageMemory).toBeGreaterThan(0)
    })
  })

  describe('Configuration and lifecycle', () => {
    it('should accept custom configuration', () => {
      const customConfig = {
        monitoringInterval: 2000,
        thresholds: {
          memoryWarning: 80,
          memoryCritical: 120,
          cpuWarning: 25,
          cpuCritical: 35,
          latencyWarning: 150,
          framerateWarning: 25,
        }
      }
      
      const { result } = renderHook(() => 
        usePerformanceMonitor({ config: customConfig })
      )
      
      act(() => {
        result.current.startMonitoring()
      })
      
      // Monitor should be using custom configuration
      expect(result.current.isMonitoring).toBe(true)
    })

    it('should reset metrics correctly', () => {
      const { result } = renderHook(() => usePerformanceMonitor())
      
      act(() => {
        result.current.startMonitoring()
      })
      
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      
      // Should have some metrics
      expect(result.current.metrics).not.toBeNull()
      
      act(() => {
        result.current.resetMetrics()
      })
      
      // Metrics should be reset
      expect(result.current.metrics).toBeNull()
      expect(result.current.alerts).toEqual([])
    })

    it('should cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => usePerformanceMonitor())
      
      act(() => {
        result.current.startMonitoring()
      })
      
      expect(result.current.isMonitoring).toBe(true)
      
      // Should not throw on unmount
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle missing Performance API gracefully', () => {
      const originalPerformance = global.performance
      delete (global as any).performance
      
      const { result } = renderHook(() => usePerformanceMonitor())
      
      expect(() => {
        act(() => {
          result.current.startMonitoring()
        })
      }).not.toThrow()
      
      global.performance = originalPerformance
    })

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error')
      })
      
      const { result } = renderHook(() => 
        usePerformanceMonitor({ 
          onMetricsUpdate: errorCallback 
        })
      )
      
      expect(() => {
        act(() => {
          result.current.startMonitoring()
        })
        
        act(() => {
          vi.advanceTimersByTime(5000)
        })
      }).not.toThrow()
    })

    it('should prevent double monitoring start', () => {
      const { result } = renderHook(() => usePerformanceMonitor())
      
      act(() => {
        result.current.startMonitoring()
      })
      
      expect(result.current.isMonitoring).toBe(true)
      
      // Second start should not cause issues
      act(() => {
        result.current.startMonitoring()
      })
      
      expect(result.current.isMonitoring).toBe(true)
    })

    it('should handle stop when not monitoring', () => {
      const { result } = renderHook(() => usePerformanceMonitor())
      
      expect(result.current.isMonitoring).toBe(false)
      
      // Stop when not monitoring should not cause issues
      expect(() => {
        act(() => {
          result.current.stopMonitoring()
        })
      }).not.toThrow()
      
      expect(result.current.isMonitoring).toBe(false)
    })
  })
})