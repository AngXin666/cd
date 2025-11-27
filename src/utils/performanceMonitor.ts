/**
 * 性能监控工具
 * 用于监控系统性能指标，包括页面加载时间、API响应时间、缓存命中率等
 */

import {supabase} from '@/db/supabase'
import {getCurrentUserBossId} from '@/db/tenant-utils'

/**
 * 指标类型枚举
 */
export enum MetricType {
  PAGE_LOAD = 'page_load', // 页面加载时间
  API_RESPONSE = 'api_response', // API响应时间
  CACHE_HIT = 'cache_hit', // 缓存命中
  CACHE_MISS = 'cache_miss', // 缓存未命中
  DATA_LOAD = 'data_load', // 数据加载时间
  USER_ACTION = 'user_action' // 用户操作响应时间
}

/**
 * 性能指标数据
 */
interface PerformanceMetric {
  metricType: MetricType
  metricName: string
  metricValue: number
  unit: string
  userId?: string
}

/**
 * 性能统计数据
 */
export interface PerformanceStats {
  metricType: MetricType
  metricName: string
  avgValue: number
  minValue: number
  maxValue: number
  count: number
  unit: string
}

/**
 * 性能监控器类
 */
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private timers: Map<string, number> = new Map()
  private userId: string | null = null
  private bossId: string | null = null
  private cacheHits = 0
  private cacheMisses = 0

  /**
   * 初始化监控器
   */
  async init(userId: string) {
    this.userId = userId
    this.bossId = (await getCurrentUserBossId(userId)) || ''
    console.log('[性能监控] 初始化完成', {userId, bossId: this.bossId})
  }

  /**
   * 开始计时
   */
  startTimer(name: string) {
    this.timers.set(name, Date.now())
  }

  /**
   * 结束计时并记录指标
   */
  endTimer(name: string, metricType: MetricType, unit: string = 'ms') {
    const startTime = this.timers.get(name)
    if (!startTime) {
      console.warn(`[性能监控] 未找到计时器: ${name}`)
      return
    }

    const duration = Date.now() - startTime
    this.timers.delete(name)

    this.recordMetric({
      metricType,
      metricName: name,
      metricValue: duration,
      unit,
      userId: this.userId || undefined
    })

    return duration
  }

  /**
   * 记录性能指标
   */
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)

    // 异步保存到数据库（不阻塞主流程）
    this.saveMetricToDatabase(metric).catch((error) => {
      console.error('[性能监控] 保存指标失败:', error)
    })

    console.log('[性能监控] 记录指标', metric)
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(cacheName: string) {
    this.cacheHits++
    this.recordMetric({
      metricType: MetricType.CACHE_HIT,
      metricName: cacheName,
      metricValue: 1,
      unit: 'count',
      userId: this.userId || undefined
    })
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss(cacheName: string) {
    this.cacheMisses++
    this.recordMetric({
      metricType: MetricType.CACHE_MISS,
      metricName: cacheName,
      metricValue: 1,
      unit: 'count',
      userId: this.userId || undefined
    })
  }

  /**
   * 获取缓存命中率
   */
  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses
    if (total === 0) return 0
    return (this.cacheHits / total) * 100
  }

  /**
   * 获取性能统计
   */
  getStats(): {
    cacheHitRate: number
    totalMetrics: number
    cacheHits: number
    cacheMisses: number
  } {
    return {
      cacheHitRate: this.getCacheHitRate(),
      totalMetrics: this.metrics.length,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses
    }
  }

  /**
   * 保存指标到数据库
   */
  private async saveMetricToDatabase(metric: PerformanceMetric) {
    if (!this.bossId) {
      return
    }

    try {
      const {error} = await supabase.from('system_performance_metrics').insert({
        boss_id: this.bossId,
        metric_type: metric.metricType,
        metric_name: metric.metricName,
        metric_value: metric.metricValue,
        unit: metric.unit,
        user_id: metric.userId || null
      })

      if (error) {
        console.error('[性能监控] 保存指标到数据库失败:', error)
      }
    } catch (error) {
      console.error('[性能监控] 保存指标到数据库异常:', error)
    }
  }

  /**
   * 获取历史性能统计
   */
  async getHistoricalStats(metricType?: MetricType, days: number = 7): Promise<PerformanceStats[]> {
    if (!this.bossId) {
      return []
    }

    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      let query = supabase
        .from('system_performance_metrics')
        .select('metric_type, metric_name, metric_value, unit')
        .eq('boss_id', this.bossId)
        .gte('created_at', startDate.toISOString())

      if (metricType) {
        query = query.eq('metric_type', metricType)
      }

      const {data, error} = await query

      if (error) {
        console.error('[性能监控] 获取历史统计失败:', error)
        return []
      }

      // 按指标类型和名称分组统计
      const statsMap = new Map<string, PerformanceStats>()

      data?.forEach((item) => {
        const key = `${item.metric_type}:${item.metric_name}`
        const existing = statsMap.get(key)

        if (existing) {
          existing.avgValue = (existing.avgValue * existing.count + item.metric_value) / (existing.count + 1)
          existing.minValue = Math.min(existing.minValue, item.metric_value)
          existing.maxValue = Math.max(existing.maxValue, item.metric_value)
          existing.count++
        } else {
          statsMap.set(key, {
            metricType: item.metric_type as MetricType,
            metricName: item.metric_name,
            avgValue: item.metric_value,
            minValue: item.metric_value,
            maxValue: item.metric_value,
            count: 1,
            unit: item.unit
          })
        }
      })

      return Array.from(statsMap.values())
    } catch (error) {
      console.error('[性能监控] 获取历史统计异常:', error)
      return []
    }
  }

  /**
   * 清理监控器
   */
  cleanup() {
    this.metrics = []
    this.timers.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
    console.log('[性能监控] 清理完成')
  }
}

// 导出单例
export const performanceMonitor = new PerformanceMonitor()

/**
 * React Hook：使用性能监控
 */
export function usePerformanceMonitor() {
  return {
    startTimer: (name: string) => performanceMonitor.startTimer(name),
    endTimer: (name: string, metricType: MetricType, unit?: string) =>
      performanceMonitor.endTimer(name, metricType, unit),
    recordMetric: (metric: PerformanceMetric) => performanceMonitor.recordMetric(metric),
    recordCacheHit: (cacheName: string) => performanceMonitor.recordCacheHit(cacheName),
    recordCacheMiss: (cacheName: string) => performanceMonitor.recordCacheMiss(cacheName),
    getCacheHitRate: () => performanceMonitor.getCacheHitRate(),
    getStats: () => performanceMonitor.getStats(),
    getHistoricalStats: (metricType?: MetricType, days?: number) =>
      performanceMonitor.getHistoricalStats(metricType, days)
  }
}
