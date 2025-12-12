/**
 * 性能监控工具
 * 用于监控关键操作的性能指标
 */

import { createLogger } from './logger'

const logger = createLogger('Performance')

interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private enabled: boolean

  constructor() {
    // 生产环境禁用性能监控以避免性能影响
    this.enabled = process.env.NODE_ENV !== 'production'
  }

  /**
   * 开始监控一个操作
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return

    this.metrics.set(name, {
      name,
      startTime: Date.now(),
      metadata
    })
  }

  /**
   * 结束监控并记录结果
   */
  end(name: string, additionalMetadata?: Record<string, any>): number | undefined {
    if (!this.enabled) return undefined

    const metric = this.metrics.get(name)
    if (!metric) {
      logger.warn(`性能监控: 未找到开始记录 "${name}"`)
      return undefined
    }

    const endTime = Date.now()
    const duration = endTime - metric.startTime

    metric.endTime = endTime
    metric.duration = duration

    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata }
    }

    // 记录性能数据
    this.logMetric(metric)

    // 清理已完成的监控
    this.metrics.delete(name)

    return duration
  }

  /**
   * 记录性能指标
   */
  private logMetric(metric: PerformanceMetric): void {
    const { name, duration, metadata } = metric

    if (duration === undefined) return

    // 根据耗时选择日志级别
    if (duration > 3000) {
      logger.warn(`⚠️ 性能警告: ${name} 耗时 ${duration}ms`, metadata)
    } else if (duration > 1000) {
      logger.info(`⏱️ 性能提示: ${name} 耗时 ${duration}ms`, metadata)
    } else {
      logger.debug(`✅ 性能正常: ${name} 耗时 ${duration}ms`, metadata)
    }
  }

  /**
   * 测量一个异步函数的执行时间
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    if (!this.enabled) {
      return fn()
    }

    this.start(name, metadata)
    try {
      const result = await fn()
      this.end(name, { success: true })
      return result
    } catch (error) {
      this.end(name, { success: false, error: String(error) })
      throw error
    }
  }

  /**
   * 测量一个同步函数的执行时间
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    if (!this.enabled) {
      return fn()
    }

    this.start(name, metadata)
    try {
      const result = fn()
      this.end(name, { success: true })
      return result
    } catch (error) {
      this.end(name, { success: false, error: String(error) })
      throw error
    }
  }

  /**
   * 获取所有未完成的监控
   */
  getPendingMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
  }

  /**
   * 清理所有监控数据
   */
  clear(): void {
    this.metrics.clear()
  }
}

// 导出单例
export const performanceMonitor = new PerformanceMonitor()

/**
 * 装饰器：自动监控方法性能
 */
export function measurePerformance(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const metricName = name || `${target.constructor.name}.${propertyKey}`

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measure(
        metricName,
        () => originalMethod.apply(this, args)
      )
    }

    return descriptor
  }
}
