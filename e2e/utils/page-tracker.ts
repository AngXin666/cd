/**
 * 页面追踪器模块
 * 负责追踪页面访问和关联 API 调用
 * 
 * @module e2e/utils/page-tracker
 */

import type { ApiCallRecord } from './api-interceptor'

/**
 * 页面访问记录接口
 * 记录单次页面访问的完整信息
 */
export interface PageVisitRecord {
  /** 页面路径 */
  path: string
  /** 页面标题 */
  title: string
  /** 进入时间戳 */
  enterTime: number
  /** 离开时间戳 */
  exitTime?: number
  /** 停留时长（毫秒） */
  duration?: number
  /** 该页面的 API 调用列表 */
  apiCalls: ApiCallRecord[]
  /** 错误列表 */
  errors: string[]
}

/**
 * 页面追踪器类
 * 记录页面访问时间和关联的 API 调用
 * 
 * @example
 * ```typescript
 * const tracker = new PageTracker()
 * tracker.enterPage('/home', '首页')
 * // ... 执行页面操作
 * tracker.addApiCall(apiCallRecord)
 * tracker.leavePage()
 * const visits = tracker.getPageVisits()
 * ```
 */
export class PageTracker {
  /** 所有页面访问记录 */
  private pageVisits: PageVisitRecord[] = []
  
  /** 当前页面访问记录 */
  private currentVisit: PageVisitRecord | null = null

  /**
   * 进入页面
   * 开始记录该页面的访问信息
   * 
   * @param path - 页面路径
   * @param title - 页面标题
   * 
   * @example
   * ```typescript
   * tracker.enterPage('/driver/dashboard', '司机工作台')
   * ```
   */
  enterPage(path: string, title: string): void {
    // 如果当前有未关闭的页面访问，先关闭它
    if (this.currentVisit) {
      this.leavePage()
    }

    // 创建新的页面访问记录
    this.currentVisit = {
      path,
      title,
      enterTime: Date.now(),
      apiCalls: [],
      errors: []
    }

    console.log(`[PageTracker] 📍 进入页面: ${title} (${path})`)
  }

  /**
   * 离开当前页面
   * 结束当前页面的访问记录，计算停留时长
   * 
   * @example
   * ```typescript
   * tracker.leavePage()
   * ```
   */
  leavePage(): void {
    if (!this.currentVisit) {
      console.warn('[PageTracker] ⚠️ 没有当前页面可以离开')
      return
    }

    // 记录离开时间和计算停留时长
    const exitTime = Date.now()
    this.currentVisit.exitTime = exitTime
    this.currentVisit.duration = exitTime - this.currentVisit.enterTime

    // 将当前访问记录添加到历史记录
    this.pageVisits.push(this.currentVisit)

    console.log(
      `[PageTracker] 🚪 离开页面: ${this.currentVisit.title} ` +
      `(停留 ${this.currentVisit.duration}ms, ` +
      `API 调用 ${this.currentVisit.apiCalls.length} 次)`
    )

    // 清空当前访问记录
    this.currentVisit = null
  }

  /**
   * 添加 API 调用到当前页面
   * 将 API 调用记录关联到当前正在访问的页面
   * 
   * @param call - API 调用记录
   * 
   * @example
   * ```typescript
   * tracker.addApiCall({
   *   url: 'https://xxx.supabase.co/rest/v1/users',
   *   method: 'GET',
   *   timestamp: Date.now(),
   *   status: 200,
   *   duration: 150
   * })
   * ```
   */
  addApiCall(call: ApiCallRecord): void {
    if (!this.currentVisit) {
      console.warn('[PageTracker] ⚠️ 没有当前页面，无法添加 API 调用')
      return
    }

    // 设置 API 调用的页面路径
    const callWithPage: ApiCallRecord = {
      ...call,
      pagePath: this.currentVisit.path
    }

    this.currentVisit.apiCalls.push(callWithPage)
  }

  /**
   * 添加错误到当前页面
   * 记录当前页面发生的错误
   * 
   * @param error - 错误信息
   * 
   * @example
   * ```typescript
   * tracker.addError('页面加载超时')
   * ```
   */
  addError(error: string): void {
    if (!this.currentVisit) {
      console.warn('[PageTracker] ⚠️ 没有当前页面，无法添加错误')
      return
    }

    this.currentVisit.errors.push(error)
    console.log(`[PageTracker] ❌ 页面错误: ${error}`)
  }

  /**
   * 获取所有页面访问记录
   * 返回所有已完成的页面访问记录（不包括当前正在访问的页面）
   * 
   * @returns 所有页面访问记录数组
   * 
   * @example
   * ```typescript
   * const visits = tracker.getPageVisits()
   * console.log(`共访问了 ${visits.length} 个页面`)
   * ```
   */
  getPageVisits(): PageVisitRecord[] {
    return [...this.pageVisits]
  }

  /**
   * 获取所有页面访问记录（包括当前页面）
   * 返回所有页面访问记录，包括当前正在访问的页面
   * 
   * @returns 所有页面访问记录数组
   */
  getAllPageVisits(): PageVisitRecord[] {
    const visits = [...this.pageVisits]
    
    // 如果有当前页面，也包含进去
    if (this.currentVisit) {
      visits.push({
        ...this.currentVisit,
        exitTime: Date.now(),
        duration: Date.now() - this.currentVisit.enterTime
      })
    }
    
    return visits
  }

  /**
   * 获取当前页面访问记录
   * 返回当前正在访问的页面记录，如果没有则返回 null
   * 
   * @returns 当前页面访问记录或 null
   * 
   * @example
   * ```typescript
   * const current = tracker.getCurrentPage()
   * if (current) {
   *   console.log(`当前在: ${current.title}`)
   * }
   * ```
   */
  getCurrentPage(): PageVisitRecord | null {
    return this.currentVisit
  }

  /**
   * 获取当前页面路径
   * 返回当前正在访问的页面路径，如果没有则返回空字符串
   * 
   * @returns 当前页面路径
   */
  getCurrentPagePath(): string {
    return this.currentVisit?.path || ''
  }

  /**
   * 清空所有记录
   * 重置追踪器状态
   * 
   * @example
   * ```typescript
   * tracker.clear()
   * ```
   */
  clear(): void {
    this.pageVisits = []
    this.currentVisit = null
    console.log('[PageTracker] 🗑️ 记录已清空')
  }

  /**
   * 获取页面访问统计
   * 按页面路径分组统计访问次数和 API 调用数
   * 
   * @returns 按页面路径分组的统计数据
   * 
   * @example
   * ```typescript
   * const stats = tracker.getPageStats()
   * // { '/home': { visitCount: 2, apiCallCount: 10 }, ... }
   * ```
   */
  getPageStats(): Record<string, { visitCount: number; apiCallCount: number; errorCount: number }> {
    const stats: Record<string, { visitCount: number; apiCallCount: number; errorCount: number }> = {}

    for (const visit of this.pageVisits) {
      if (!stats[visit.path]) {
        stats[visit.path] = { visitCount: 0, apiCallCount: 0, errorCount: 0 }
      }
      stats[visit.path].visitCount++
      stats[visit.path].apiCallCount += visit.apiCalls.length
      stats[visit.path].errorCount += visit.errors.length
    }

    return stats
  }

  /**
   * 获取总 API 调用数
   * 统计所有页面的 API 调用总数
   * 
   * @returns API 调用总数
   */
  getTotalApiCalls(): number {
    let total = 0
    
    for (const visit of this.pageVisits) {
      total += visit.apiCalls.length
    }
    
    // 包括当前页面的 API 调用
    if (this.currentVisit) {
      total += this.currentVisit.apiCalls.length
    }
    
    return total
  }

  /**
   * 获取总错误数
   * 统计所有页面的错误总数
   * 
   * @returns 错误总数
   */
  getTotalErrors(): number {
    let total = 0
    
    for (const visit of this.pageVisits) {
      total += visit.errors.length
    }
    
    // 包括当前页面的错误
    if (this.currentVisit) {
      total += this.currentVisit.errors.length
    }
    
    return total
  }

  /**
   * 获取所有 API 调用记录
   * 从所有页面访问中提取 API 调用记录
   * 
   * @returns 所有 API 调用记录数组
   */
  getAllApiCalls(): ApiCallRecord[] {
    const allCalls: ApiCallRecord[] = []
    
    for (const visit of this.pageVisits) {
      allCalls.push(...visit.apiCalls)
    }
    
    // 包括当前页面的 API 调用
    if (this.currentVisit) {
      allCalls.push(...this.currentVisit.apiCalls)
    }
    
    return allCalls
  }

  /**
   * 检查是否有当前页面
   * 
   * @returns 是否有当前正在访问的页面
   */
  hasCurrentPage(): boolean {
    return this.currentVisit !== null
  }

  /**
   * 获取页面访问数量
   * 
   * @returns 已完成的页面访问数量
   */
  getVisitCount(): number {
    return this.pageVisits.length
  }
}

/**
 * 创建页面追踪器实例的工厂函数
 * 
 * @returns 新的 PageTracker 实例
 * 
 * @example
 * ```typescript
 * const tracker = createPageTracker()
 * ```
 */
export function createPageTracker(): PageTracker {
  return new PageTracker()
}
