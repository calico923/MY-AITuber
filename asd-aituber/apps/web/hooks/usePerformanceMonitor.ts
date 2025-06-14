import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  PerformanceMonitor, 
  PerformanceMetrics, 
  PerformanceAlert, 
  PerformanceConfig 
} from '@/lib/performance-monitor'

export interface UsePerformanceMonitorOptions {
  autoStart?: boolean
  config?: Partial<PerformanceConfig>
  onAlert?: (alert: PerformanceAlert) => void
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void
}

export interface UsePerformanceMonitorReturn {
  // 状態
  metrics: PerformanceMetrics | null
  alerts: PerformanceAlert[]
  isMonitoring: boolean
  isHealthy: boolean
  
  // 制御関数
  startMonitoring: () => void
  stopMonitoring: () => void
  resetMetrics: () => void
  
  // ユーティリティ
  getMemoryStatus: () => 'healthy' | 'warning' | 'critical'
  getCPUStatus: () => 'healthy' | 'warning' | 'critical'
  getOverallHealth: () => 'healthy' | 'warning' | 'critical'
  
  // カスタム測定
  startMeasure: (name: string) => void
  endMeasure: (name: string) => void
  
  // 統計情報
  getPerformanceSummary: () => {
    memoryTrend: 'improving' | 'stable' | 'degrading'
    cpuTrend: 'improving' | 'stable' | 'degrading'
    averageMemory: number
    averageCPU: number
    alertCount: number
    criticalAlertCount: number
  }
}

/**
 * パフォーマンス監視用Reactフック
 * メモリ、CPU、リアルタイム処理のパフォーマンスを監視
 */
export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions = {}
): UsePerformanceMonitorReturn {
  const {
    autoStart = false,
    config,
    onAlert,
    onMetricsUpdate
  } = options

  // 状態管理
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  
  // パフォーマンス監視インスタンス
  const monitorRef = useRef<PerformanceMonitor | null>(null)
  const unsubscribeMetricsRef = useRef<(() => void) | null>(null)
  const unsubscribeAlertsRef = useRef<(() => void) | null>(null)
  
  // 過去のメトリクス履歴（トレンド分析用）
  const metricsHistoryRef = useRef<PerformanceMetrics[]>([])
  const maxHistorySize = 20 // 過去20回分の履歴を保持

  /**
   * 初期化
   */
  useEffect(() => {
    // パフォーマンス監視インスタンス作成
    monitorRef.current = PerformanceMonitor.getInstance(config)
    
    // メトリクス更新コールバック
    unsubscribeMetricsRef.current = monitorRef.current.onMetricsUpdate((newMetrics) => {
      setMetrics(newMetrics)
      
      // 履歴に追加
      metricsHistoryRef.current.push(newMetrics)
      if (metricsHistoryRef.current.length > maxHistorySize) {
        metricsHistoryRef.current.shift()
      }
      
      // 外部コールバック実行
      if (onMetricsUpdate) {
        onMetricsUpdate(newMetrics)
      }
    })
    
    // アラートコールバック
    unsubscribeAlertsRef.current = monitorRef.current.onAlert((alert) => {
      setAlerts(prev => [...prev, alert])
      
      // 外部コールバック実行
      if (onAlert) {
        onAlert(alert)
      }
    })
    
    // 自動開始
    if (autoStart) {
      startMonitoring()
    }
    
    // 既存のアラート履歴を取得
    setAlerts(monitorRef.current.getAlertHistory())
    
    return () => {
      // クリーンアップ
      if (unsubscribeMetricsRef.current) {
        unsubscribeMetricsRef.current()
      }
      if (unsubscribeAlertsRef.current) {
        unsubscribeAlertsRef.current()
      }
    }
  }, [autoStart, config, onAlert, onMetricsUpdate])

  /**
   * 監視開始
   */
  const startMonitoring = useCallback(() => {
    if (monitorRef.current && !isMonitoring) {
      monitorRef.current.startMonitoring()
      setIsMonitoring(true)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Performance monitoring started via hook')
      }
    }
  }, [isMonitoring])

  /**
   * 監視停止
   */
  const stopMonitoring = useCallback(() => {
    if (monitorRef.current && isMonitoring) {
      monitorRef.current.stopMonitoring()
      setIsMonitoring(false)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Performance monitoring stopped via hook')
      }
    }
  }, [isMonitoring])

  /**
   * メトリクスリセット
   */
  const resetMetrics = useCallback(() => {
    if (monitorRef.current) {
      monitorRef.current.reset()
      setMetrics(null)
      setAlerts([])
      metricsHistoryRef.current = []
    }
  }, [])

  /**
   * メモリ状態取得
   */
  const getMemoryStatus = useCallback((): 'healthy' | 'warning' | 'critical' => {
    if (!metrics) return 'healthy'
    
    const { memory } = metrics
    if (memory.used >= 150) return 'critical'  // 150MB以上
    if (memory.used >= 100) return 'warning'   // 100MB以上
    return 'healthy'
  }, [metrics])

  /**
   * CPU状態取得
   */
  const getCPUStatus = useCallback((): 'healthy' | 'warning' | 'critical' => {
    if (!metrics) return 'healthy'
    
    const { cpu } = metrics
    if (cpu.usage >= 40) return 'critical'  // 40%以上
    if (cpu.usage >= 30) return 'warning'   // 30%以上
    return 'healthy'
  }, [metrics])

  /**
   * 全体的な健全性取得
   */
  const getOverallHealth = useCallback((): 'healthy' | 'warning' | 'critical' => {
    const memoryStatus = getMemoryStatus()
    const cpuStatus = getCPUStatus()
    
    // どちらかがcriticalならcritical
    if (memoryStatus === 'critical' || cpuStatus === 'critical') {
      return 'critical'
    }
    
    // どちらかがwarningならwarning
    if (memoryStatus === 'warning' || cpuStatus === 'warning') {
      return 'warning'
    }
    
    return 'healthy'
  }, [getMemoryStatus, getCPUStatus])

  /**
   * カスタム測定開始
   */
  const startMeasure = useCallback((name: string) => {
    if (monitorRef.current) {
      monitorRef.current.startMeasure(name)
    }
  }, [])

  /**
   * カスタム測定終了
   */
  const endMeasure = useCallback((name: string) => {
    if (monitorRef.current) {
      monitorRef.current.endMeasure(name)
    }
  }, [])

  /**
   * パフォーマンス統計情報取得
   */
  const getPerformanceSummary = useCallback(() => {
    const history = metricsHistoryRef.current
    
    if (history.length === 0) {
      return {
        memoryTrend: 'stable' as const,
        cpuTrend: 'stable' as const,
        averageMemory: 0,
        averageCPU: 0,
        alertCount: alerts.length,
        criticalAlertCount: alerts.filter(a => a.severity === 'critical').length,
      }
    }

    // 平均値計算
    const averageMemory = history.reduce((sum, m) => sum + m.memory.used, 0) / history.length
    const averageCPU = history.reduce((sum, m) => sum + m.cpu.usage, 0) / history.length

    // トレンド分析（最近5回と過去5回を比較）
    const getTrend = (values: number[]): 'improving' | 'stable' | 'degrading' => {
      if (values.length < 10) return 'stable'
      
      const recentValues = values.slice(-5)
      const pastValues = values.slice(0, 5)
      
      const recentAvg = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length
      const pastAvg = pastValues.reduce((sum, v) => sum + v, 0) / pastValues.length
      
      const changePercent = ((recentAvg - pastAvg) / pastAvg) * 100
      
      if (changePercent > 10) return 'degrading'
      if (changePercent < -10) return 'improving'
      return 'stable'
    }

    const memoryValues = history.map(m => m.memory.used)
    const cpuValues = history.map(m => m.cpu.usage)

    return {
      memoryTrend: getTrend(memoryValues),
      cpuTrend: getTrend(cpuValues),
      averageMemory: Math.round(averageMemory * 100) / 100,
      averageCPU: Math.round(averageCPU * 100) / 100,
      alertCount: alerts.length,
      criticalAlertCount: alerts.filter(a => a.severity === 'critical').length,
    }
  }, [alerts])

  // 健全性状態の計算
  const isHealthy = getOverallHealth() === 'healthy'

  return {
    // 状態
    metrics,
    alerts,
    isMonitoring,
    isHealthy,
    
    // 制御関数
    startMonitoring,
    stopMonitoring,
    resetMetrics,
    
    // ユーティリティ
    getMemoryStatus,
    getCPUStatus,
    getOverallHealth,
    
    // カスタム測定
    startMeasure,
    endMeasure,
    
    // 統計情報
    getPerformanceSummary,
  }
}