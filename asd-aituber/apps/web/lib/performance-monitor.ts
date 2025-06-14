/**
 * Performance Monitor
 * パフォーマンス監視とリソース使用量追跡システム
 * VRMアバター、音声処理、リアルタイム通信のリソース管理
 */

export interface PerformanceMetrics {
  // メモリ使用量 (MB)
  memory: {
    used: number          // 使用中メモリ
    total: number         // 合計利用可能メモリ
    percentage: number    // 使用率 (%)
    limit: number         // 制限値 (150MB)
  }
  
  // CPU使用率 (推定値)
  cpu: {
    usage: number         // CPU使用率 (%)
    limit: number         // 制限値 (40%)
    samples: number[]     // 過去のサンプル
  }
  
  // リアルタイム処理パフォーマンス
  realtime: {
    audioLatency: number      // 音声処理遅延 (ms)
    vrmFrameRate: number      // VRM描画フレームレート (fps)
    websocketLatency: number  // WebSocket通信遅延 (ms)
  }
  
  // システム情報
  system: {
    timestamp: number
    userAgent: string
    activeFeatures: string[]  // 使用中の機能リスト
  }
}

export interface PerformanceAlert {
  type: 'memory' | 'cpu' | 'latency' | 'framerate'
  severity: 'warning' | 'critical'
  message: string
  value: number
  threshold: number
  recommendation?: string
  timestamp: number
}

export interface PerformanceConfig {
  // 監視間隔 (ms)
  monitoringInterval: number
  
  // しきい値設定
  thresholds: {
    memoryWarning: number    // メモリ警告レベル (MB)
    memoryCritical: number   // メモリ重要レベル (MB)
    cpuWarning: number       // CPU警告レベル (%)
    cpuCritical: number      // CPU重要レベル (%)
    latencyWarning: number   // 遅延警告レベル (ms)
    framerateWarning: number // フレームレート警告レベル (fps)
  }
  
  // アラート設定
  alertCooldown: number      // アラート再送防止時間 (ms)
  maxAlertHistory: number    // 保存するアラート履歴数
  enableAutoOptimization: boolean // 自動最適化機能
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null
  private config: PerformanceConfig
  private metrics: PerformanceMetrics
  private alerts: PerformanceAlert[] = []
  private lastAlertTime: Map<string, number> = new Map()
  private monitoringTimer: NodeJS.Timeout | null = null
  private performanceObserver: PerformanceObserver | null = null
  private cpuSamples: number[] = []
  private callbacks: ((metrics: PerformanceMetrics) => void)[] = []
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = []
  
  // デフォルト設定
  private static readonly DEFAULT_CONFIG: PerformanceConfig = {
    monitoringInterval: 5000, // 5秒間隔
    thresholds: {
      memoryWarning: 100,     // 100MB
      memoryCritical: 150,    // 150MB
      cpuWarning: 30,         // 30%
      cpuCritical: 40,        // 40%
      latencyWarning: 100,    // 100ms
      framerateWarning: 30,   // 30fps
    },
    alertCooldown: 30000,     // 30秒
    maxAlertHistory: 50,
    enableAutoOptimization: true,
  }

  private constructor(config?: Partial<PerformanceConfig>) {
    this.config = { ...PerformanceMonitor.DEFAULT_CONFIG, ...config }
    this.metrics = this.initializeMetrics()
    this.setupPerformanceObserver()
  }

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(config?: Partial<PerformanceConfig>): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(config)
    }
    return PerformanceMonitor.instance
  }

  /**
   * メトリクス初期化
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
        limit: this.config.thresholds.memoryCritical,
      },
      cpu: {
        usage: 0,
        limit: this.config.thresholds.cpuCritical,
        samples: [],
      },
      realtime: {
        audioLatency: 0,
        vrmFrameRate: 60,
        websocketLatency: 0,
      },
      system: {
        timestamp: Date.now(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        activeFeatures: [],
      },
    }
  }

  /**
   * Performance Observer セットアップ
   */
  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        this.processPerformanceEntries(entries)
      })

      // 様々なパフォーマンスエントリを監視
      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource', 'paint'] 
      })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Performance Observer setup failed:', error)
      }
    }
  }

  /**
   * パフォーマンスエントリ処理
   */
  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    for (const entry of entries) {
      if (entry.entryType === 'measure') {
        // カスタム測定の処理
        this.processMeasureEntry(entry as PerformanceMeasure)
      } else if (entry.entryType === 'resource') {
        // リソース読み込み時間の処理
        this.processResourceEntry(entry as PerformanceResourceTiming)
      }
    }
  }

  /**
   * カスタム測定エントリ処理
   */
  private processMeasureEntry(entry: PerformanceMeasure): void {
    if (entry.name.includes('audio-processing')) {
      this.metrics.realtime.audioLatency = entry.duration
    } else if (entry.name.includes('vrm-render')) {
      // VRM描画時間からフレームレート推定
      const fps = entry.duration > 0 ? 1000 / entry.duration : 60
      this.metrics.realtime.vrmFrameRate = Math.min(fps, 60)
    }
  }

  /**
   * リソースエントリ処理
   */
  private processResourceEntry(entry: PerformanceResourceTiming): void {
    // WebSocket接続時間の推定
    if (entry.name.includes('websocket') || entry.name.includes('socket.io')) {
      this.metrics.realtime.websocketLatency = entry.duration
    }
  }

  /**
   * メモリ使用量測定
   */
  private measureMemoryUsage(): void {
    if (typeof window === 'undefined') return

    try {
      // Chrome の memory API を使用
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usedMB = memory.usedJSHeapSize / (1024 * 1024)
        const totalMB = memory.totalJSHeapSize / (1024 * 1024)
        const limitMB = memory.jsHeapSizeLimit / (1024 * 1024)

        this.metrics.memory = {
          used: Math.round(usedMB * 100) / 100,
          total: Math.round(totalMB * 100) / 100,
          percentage: Math.round((usedMB / limitMB) * 100 * 100) / 100,
          limit: this.config.thresholds.memoryCritical,
        }

        // メモリ使用量チェック
        this.checkMemoryThresholds(usedMB)
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Memory measurement failed:', error)
      }
    }
  }

  /**
   * CPU使用率推定
   * Performance Observer とタスク実行時間から推定
   */
  private estimateCPUUsage(): void {
    const startTime = performance.now()
    
    // 小さな計算タスクを実行して処理時間を測定
    const iterations = 10000
    let sum = 0
    for (let i = 0; i < iterations; i++) {
      sum += Math.random()
    }
    
    const endTime = performance.now()
    const taskDuration = endTime - startTime
    
    // 基準値と比較してCPU使用率を推定 (大まかな推定)
    const baselineTime = 1.0 // 基準時間 (ms)
    const cpuUsage = Math.min((taskDuration / baselineTime) * 10, 100)
    
    this.cpuSamples.push(cpuUsage)
    
    // 過去10サンプルの平均を取る
    if (this.cpuSamples.length > 10) {
      this.cpuSamples.shift()
    }
    
    const avgCpuUsage = this.cpuSamples.reduce((a, b) => a + b, 0) / this.cpuSamples.length
    
    this.metrics.cpu = {
      usage: Math.round(avgCpuUsage * 100) / 100,
      limit: this.config.thresholds.cpuCritical,
      samples: [...this.cpuSamples],
    }

    // CPU使用率チェック
    this.checkCPUThresholds(avgCpuUsage)
  }

  /**
   * アクティブ機能リスト更新
   */
  private updateActiveFeatures(): void {
    const features: string[] = []
    
    // 音声機能
    if (typeof window !== 'undefined') {
      if (window.speechSynthesis) features.push('speech-synthesis')
      if ('webkitSpeechRecognition' in window) features.push('speech-recognition')
      if (navigator.mediaDevices) features.push('media-devices')
    }
    
    // VRM関連
    if (typeof document !== 'undefined') {
      const canvas = document.querySelector('canvas')
      if (canvas) features.push('webgl-rendering')
    }
    
    // WebSocket
    if (typeof WebSocket !== 'undefined') features.push('websocket')
    
    this.metrics.system.activeFeatures = features
    this.metrics.system.timestamp = Date.now()
  }

  /**
   * メモリしきい値チェック
   */
  private checkMemoryThresholds(usedMB: number): void {
    if (usedMB >= this.config.thresholds.memoryCritical) {
      this.createAlert('memory', 'critical', 
        `メモリ使用量が制限値を超えました: ${usedMB.toFixed(1)}MB`,
        usedMB, this.config.thresholds.memoryCritical,
        'ページを再読み込みするか、他のタブを閉じてください'
      )
    } else if (usedMB >= this.config.thresholds.memoryWarning) {
      this.createAlert('memory', 'warning',
        `メモリ使用量が警告レベルです: ${usedMB.toFixed(1)}MB`,
        usedMB, this.config.thresholds.memoryWarning,
        'メモリ使用量を監視してください'
      )
    }
  }

  /**
   * CPUしきい値チェック
   */
  private checkCPUThresholds(cpuUsage: number): void {
    if (cpuUsage >= this.config.thresholds.cpuCritical) {
      this.createAlert('cpu', 'critical',
        `CPU使用率が制限値を超えました: ${cpuUsage.toFixed(1)}%`,
        cpuUsage, this.config.thresholds.cpuCritical,
        'VRM描画品質を下げるか、音声機能を一時停止してください'
      )
    } else if (cpuUsage >= this.config.thresholds.cpuWarning) {
      this.createAlert('cpu', 'warning',
        `CPU使用率が警告レベルです: ${cpuUsage.toFixed(1)}%`,
        cpuUsage, this.config.thresholds.cpuWarning,
        'パフォーマンスを監視してください'
      )
    }
  }

  /**
   * アラート作成
   */
  private createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    value: number,
    threshold: number,
    recommendation?: string
  ): void {
    const alertKey = `${type}-${severity}`
    const now = Date.now()
    
    // クールダウンチェック
    if (this.lastAlertTime.has(alertKey)) {
      const lastTime = this.lastAlertTime.get(alertKey)!
      if (now - lastTime < this.config.alertCooldown) {
        return // クールダウン中はアラートを送信しない
      }
    }

    const alert: PerformanceAlert = {
      type,
      severity,
      message,
      value,
      threshold,
      recommendation,
      timestamp: now,
    }

    this.alerts.push(alert)
    this.lastAlertTime.set(alertKey, now)

    // 履歴制限
    if (this.alerts.length > this.config.maxAlertHistory) {
      this.alerts.shift()
    }

    // アラートコールバック実行
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Alert callback error:', error)
        }
      }
    })

    // 自動最適化
    if (this.config.enableAutoOptimization) {
      this.performAutoOptimization(alert)
    }
  }

  /**
   * 自動最適化実行
   */
  private performAutoOptimization(alert: PerformanceAlert): void {
    if (alert.type === 'memory' && alert.severity === 'critical') {
      // メモリクリーンアップの提案
      if (typeof window !== 'undefined' && 'gc' in window) {
        try {
          (window as any).gc()
        } catch (error) {
          // GCが利用できない場合は無視
        }
      }
    }
  }

  /**
   * 監視開始
   */
  startMonitoring(): void {
    if (this.monitoringTimer) {
      return // 既に監視中
    }

    this.monitoringTimer = setInterval(() => {
      this.collectMetrics()
    }, this.config.monitoringInterval)

    if (process.env.NODE_ENV === 'development') {
      console.log('Performance monitoring started')
    }
  }

  /**
   * 監視停止
   */
  stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer)
      this.monitoringTimer = null
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
      this.performanceObserver = null
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Performance monitoring stopped')
    }
  }

  /**
   * メトリクス収集
   */
  private collectMetrics(): void {
    this.measureMemoryUsage()
    this.estimateCPUUsage()
    this.updateActiveFeatures()

    // コールバック実行
    this.callbacks.forEach(callback => {
      try {
        callback({ ...this.metrics })
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Metrics callback error:', error)
        }
      }
    })
  }

  /**
   * メトリクスコールバック登録
   */
  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.callbacks.push(callback)
    
    // アンサブスクライブ関数を返す
    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index > -1) {
        this.callbacks.splice(index, 1)
      }
    }
  }

  /**
   * アラートコールバック登録
   */
  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.push(callback)
    
    return () => {
      const index = this.alertCallbacks.indexOf(callback)
      if (index > -1) {
        this.alertCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * 現在のメトリクス取得
   */
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * アラート履歴取得
   */
  getAlertHistory(): PerformanceAlert[] {
    return [...this.alerts]
  }

  /**
   * カスタム測定開始
   */
  startMeasure(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`)
    }
  }

  /**
   * カスタム測定終了
   */
  endMeasure(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      try {
        performance.mark(`${name}-end`)
        performance.measure(name, `${name}-start`, `${name}-end`)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Failed to measure ${name}:`, error)
        }
      }
    }
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * リセット
   */
  reset(): void {
    this.alerts = []
    this.lastAlertTime.clear()
    this.cpuSamples = []
    this.metrics = this.initializeMetrics()
  }

  /**
   * インスタンス破棄
   */
  destroy(): void {
    this.stopMonitoring()
    this.callbacks = []
    this.alertCallbacks = []
    this.reset()
    PerformanceMonitor.instance = null
  }
}

// デフォルトインスタンス作成
export const performanceMonitor = PerformanceMonitor.getInstance()