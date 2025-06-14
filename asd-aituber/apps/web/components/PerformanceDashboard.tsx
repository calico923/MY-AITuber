'use client'

import React, { useState, useEffect } from 'react'
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor'
import { PerformanceAlert } from '@/lib/performance-monitor'

interface PerformanceDashboardProps {
  /** ダッシュボードを表示するかどうか */
  visible?: boolean
  /** コンパクト表示モード */
  compact?: boolean
  /** アラート表示の最大数 */
  maxAlertsDisplay?: number
  /** 開発環境でのみ表示するかどうか */
  developmentOnly?: boolean
}

/**
 * パフォーマンス監視ダッシュボード
 * メモリ、CPU、リアルタイム処理のパフォーマンスを可視化
 */
export default function PerformanceDashboard({
  visible = process.env.NODE_ENV === 'development',
  compact = false,
  maxAlertsDisplay = 3,
  developmentOnly = true
}: PerformanceDashboardProps) {
  const {
    metrics,
    alerts,
    isMonitoring,
    isHealthy,
    startMonitoring,
    stopMonitoring,
    resetMetrics,
    getMemoryStatus,
    getCPUStatus,
    getOverallHealth,
    getPerformanceSummary
  } = usePerformanceMonitor({ autoStart: true })

  const [isExpanded, setIsExpanded] = useState(!compact)
  const [selectedTab, setSelectedTab] = useState<'metrics' | 'alerts' | 'summary'>('metrics')

  // 開発環境のみ表示制限
  if (developmentOnly && process.env.NODE_ENV !== 'development') {
    return null
  }

  // 表示制御
  if (!visible) {
    return null
  }

  const memoryStatus = getMemoryStatus()
  const cpuStatus = getCPUStatus()
  const overallHealth = getOverallHealth()
  const summary = getPerformanceSummary()

  // ステータス色の取得
  const getStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
    }
  }

  // アラートレベルの色
  const getAlertColor = (alert: PerformanceAlert) => {
    return alert.severity === 'critical' 
      ? 'border-red-500 bg-red-50' 
      : 'border-yellow-500 bg-yellow-50'
  }

  // 最新のアラートを表示数制限
  const recentAlerts = alerts.slice(-maxAlertsDisplay).reverse()

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${
      compact && !isExpanded ? 'w-16' : 'w-80'
    } transition-all duration-300`}>
      {/* コンパクトモード時の最小表示 */}
      {compact && !isExpanded && (
        <div 
          className={`p-3 rounded-lg shadow-lg cursor-pointer border-2 ${
            getStatusColor(overallHealth)
          }`}
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full ${
              isHealthy ? 'bg-green-500' : 'bg-red-500'
            }`} />
          </div>
          {!isMonitoring && (
            <div className="text-xs mt-1 text-center">停止中</div>
          )}
        </div>
      )}

      {/* 展開表示 */}
      {(!compact || isExpanded) && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          {/* ヘッダー */}
          <div className={`px-4 py-3 border-b border-gray-200 ${
            getStatusColor(overallHealth)
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">パフォーマンス監視</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isHealthy ? 'bg-green-500' : 'bg-red-500'
                }`} />
                {compact && (
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            {/* 監視制御ボタン */}
            <div className="flex items-center space-x-2 mt-2">
              <button
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
                className={`px-2 py-1 text-xs rounded ${
                  isMonitoring 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {isMonitoring ? '停止' : '開始'}
              </button>
              <button
                onClick={resetMetrics}
                className="px-2 py-1 text-xs rounded bg-gray-500 text-white hover:bg-gray-600"
              >
                リセット
              </button>
            </div>
          </div>

          {/* タブナビゲーション */}
          <div className="flex border-b border-gray-200">
            {(['metrics', 'alerts', 'summary'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`flex-1 px-3 py-2 text-xs font-medium ${
                  selectedTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'metrics' && 'メトリクス'}
                {tab === 'alerts' && `アラート (${alerts.length})`}
                {tab === 'summary' && '統計'}
              </button>
            ))}
          </div>

          {/* コンテンツエリア */}
          <div className="p-4 max-h-64 overflow-y-auto">
            {/* メトリクス表示 */}
            {selectedTab === 'metrics' && (
              <div className="space-y-3">
                {metrics ? (
                  <>
                    {/* メモリ使用量 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">メモリ</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          getStatusColor(memoryStatus)
                        }`}>
                          {metrics.memory.used.toFixed(1)}MB
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            memoryStatus === 'critical' ? 'bg-red-500' :
                            memoryStatus === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(metrics.memory.percentage, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {metrics.memory.percentage.toFixed(1)}% / 制限: {metrics.memory.limit}MB
                      </div>
                    </div>

                    {/* CPU使用率 */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">CPU</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          getStatusColor(cpuStatus)
                        }`}>
                          {metrics.cpu.usage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            cpuStatus === 'critical' ? 'bg-red-500' :
                            cpuStatus === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(metrics.cpu.usage, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        制限: {metrics.cpu.limit}%
                      </div>
                    </div>

                    {/* リアルタイム処理 */}
                    <div className="text-xs space-y-1">
                      <div className="font-medium">リアルタイム処理</div>
                      <div className="flex justify-between">
                        <span>音声遅延:</span>
                        <span>{metrics.realtime.audioLatency.toFixed(1)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>VRMフレームレート:</span>
                        <span>{metrics.realtime.vrmFrameRate.toFixed(1)}fps</span>
                      </div>
                      <div className="flex justify-between">
                        <span>WebSocket遅延:</span>
                        <span>{metrics.realtime.websocketLatency.toFixed(1)}ms</span>
                      </div>
                    </div>

                    {/* アクティブ機能 */}
                    <div className="text-xs">
                      <div className="font-medium mb-1">アクティブ機能</div>
                      <div className="flex flex-wrap gap-1">
                        {metrics.system.activeFeatures.map((feature, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-gray-500 text-center py-4">
                    監視を開始してください
                  </div>
                )}
              </div>
            )}

            {/* アラート表示 */}
            {selectedTab === 'alerts' && (
              <div className="space-y-2">
                {recentAlerts.length > 0 ? (
                  recentAlerts.map((alert, index) => (
                    <div
                      key={index}
                      className={`p-2 border-l-4 rounded ${getAlertColor(alert)}`}
                    >
                      <div className="text-xs font-medium">
                        {alert.type.toUpperCase()} {alert.severity === 'critical' ? '🔴' : '⚠️'}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {alert.message}
                      </div>
                      {alert.recommendation && (
                        <div className="text-xs text-gray-500 mt-1 italic">
                          💡 {alert.recommendation}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-500 text-center py-4">
                    アラートはありません
                  </div>
                )}
              </div>
            )}

            {/* 統計表示 */}
            {selectedTab === 'summary' && (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="font-medium mb-2">パフォーマンス統計</div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>平均メモリ使用量:</span>
                      <span>{summary.averageMemory.toFixed(1)}MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>平均CPU使用率:</span>
                      <span>{summary.averageCPU.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="font-medium mb-2">トレンド分析</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>メモリトレンド:</span>
                      <span className={`px-2 py-1 rounded ${
                        summary.memoryTrend === 'improving' ? 'bg-green-100 text-green-600' :
                        summary.memoryTrend === 'degrading' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {summary.memoryTrend === 'improving' ? '改善' :
                         summary.memoryTrend === 'degrading' ? '悪化' : '安定'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>CPUトレンド:</span>
                      <span className={`px-2 py-1 rounded ${
                        summary.cpuTrend === 'improving' ? 'bg-green-100 text-green-600' :
                        summary.cpuTrend === 'degrading' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {summary.cpuTrend === 'improving' ? '改善' :
                         summary.cpuTrend === 'degrading' ? '悪化' : '安定'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="font-medium mb-2">アラート履歴</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>総アラート数:</span>
                      <span>{summary.alertCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>重要アラート数:</span>
                      <span className="text-red-600">{summary.criticalAlertCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}