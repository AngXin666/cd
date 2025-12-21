/**
 * API 拦截器模块
 * 使用 Playwright 的网络拦截功能捕获所有 Supabase API 调用
 * 
 * @module e2e/utils/api-interceptor
 */

import type { Page, Request, Response } from '@playwright/test'
import { parseSupabaseUrl } from './test-reporter'

/**
 * API 调用记录接口
 * 记录单个 API 请求的完整信息
 */
export interface ApiCallRecord {
  /** 请求 URL */
  url: string
  /** HTTP 方法 */
  method: string
  /** 请求时间戳 */
  timestamp: number
  /** 响应状态码 */
  status?: number
  /** 响应时间（毫秒） */
  duration?: number
  /** 请求体 */
  requestBody?: any
  /** 响应体大小（字节） */
  responseSize?: number
  /** Supabase 表名 */
  table?: string
  /** 操作类型：select, insert, update, delete, rpc, auth */
  operation?: 'select' | 'insert' | 'update' | 'delete' | 'rpc' | 'auth' | string
  /** 所属页面路径 */
  pagePath?: string
}

/**
 * 待处理的请求记录
 * 用于在响应返回前暂存请求信息
 */
interface PendingRequest {
  /** 请求开始时间 */
  startTime: number
  /** 请求记录 */
  record: ApiCallRecord
}

/**
 * API 拦截器类
 * 使用 Playwright 的 page.on('request') 和 page.on('response') 拦截网络请求
 * 
 * @example
 * ```typescript
 * const interceptor = new ApiInterceptor()
 * interceptor.start(page)
 * // ... 执行测试操作
 * const calls = interceptor.getAllCalls()
 * interceptor.stop()
 * ```
 */
export class ApiInterceptor {
  /** Playwright 页面对象 */
  private page: Page | null = null
  
  /** 所有 API 调用记录 */
  private allCalls: ApiCallRecord[] = []
  
  /** 当前页面路径 */
  private currentPagePath: string = ''
  
  /** 待处理的请求（等待响应） */
  private pendingRequests: Map<string, PendingRequest> = new Map()
  
  /** 请求事件处理函数引用（用于移除监听器） */
  private requestHandler: ((request: Request) => void) | null = null
  
  /** 响应事件处理函数引用（用于移除监听器） */
  private responseHandler: ((response: Response) => void) | null = null
  
  /** 是否正在运行 */
  private isRunning: boolean = false

  /** Supabase API URL 匹配模式 */
  private static readonly SUPABASE_URL_PATTERNS = [
    'supabase.co',
    'supabase.in',
    '/rest/v1/',
    '/auth/v1/',
    '/storage/v1/',
    '/realtime/v1/'
  ]

  /**
   * 检查 URL 是否为 Supabase API 请求
   * @param url - 请求 URL
   * @returns 是否为 Supabase API 请求
   */
  private isSupabaseApiUrl(url: string): boolean {
    return ApiInterceptor.SUPABASE_URL_PATTERNS.some(pattern => url.includes(pattern))
  }

  /**
   * 生成请求的唯一标识符
   * 用于关联请求和响应
   * @param request - Playwright 请求对象
   * @returns 唯一标识符
   */
  private getRequestId(request: Request): string {
    // 使用 URL + 方法 + 时间戳作为唯一标识
    return `${request.method()}-${request.url()}-${Date.now()}`
  }

  /**
   * 处理请求事件
   * 记录请求开始时间和基本信息
   * @param request - Playwright 请求对象
   */
  private handleRequest(request: Request): void {
    const url = request.url()
    
    // 只处理 Supabase API 请求
    if (!this.isSupabaseApiUrl(url)) {
      return
    }

    const method = request.method()
    const timestamp = Date.now()
    
    // 解析 Supabase URL 获取表名和操作类型
    const { table, operation } = parseSupabaseUrl(url, method)
    
    // 尝试获取请求体
    let requestBody: any = undefined
    try {
      const postData = request.postData()
      if (postData) {
        requestBody = JSON.parse(postData)
      }
    } catch {
      // 请求体可能不是 JSON 格式，忽略解析错误
    }

    // 创建 API 调用记录
    const record: ApiCallRecord = {
      url,
      method,
      timestamp,
      table,
      operation,
      requestBody,
      pagePath: this.currentPagePath
    }

    // 生成请求 ID 并存储待处理请求
    const requestId = this.getRequestId(request)
    this.pendingRequests.set(requestId, {
      startTime: timestamp,
      record
    })

    // 控制台输出请求信息
    console.log(`[API] 📤 ${method} ${table}.${operation} - ${url.substring(0, 80)}...`)
  }

  /**
   * 处理响应事件
   * 补充响应信息并完成记录
   * @param response - Playwright 响应对象
   */
  private async handleResponse(response: Response): Promise<void> {
    const request = response.request()
    const url = request.url()
    
    // 只处理 Supabase API 请求
    if (!this.isSupabaseApiUrl(url)) {
      return
    }

    // 查找对应的待处理请求
    // 由于请求 ID 包含时间戳，需要通过 URL 和方法匹配
    let matchedRequestId: string | null = null
    let matchedPending: PendingRequest | null = null
    
    for (const [id, pending] of this.pendingRequests.entries()) {
      if (pending.record.url === url && pending.record.method === request.method()) {
        matchedRequestId = id
        matchedPending = pending
        break
      }
    }

    if (!matchedPending || !matchedRequestId) {
      // 如果没有找到对应的请求记录，创建一个新的
      const method = request.method()
      const { table, operation } = parseSupabaseUrl(url, method)
      
      const record: ApiCallRecord = {
        url,
        method,
        timestamp: Date.now(),
        status: response.status(),
        table,
        operation,
        pagePath: this.currentPagePath
      }
      
      this.allCalls.push(record)
      console.log(`[API] 📥 ${method} ${table}.${operation} - ${response.status()}`)
      return
    }

    // 计算响应时间
    const duration = Date.now() - matchedPending.startTime
    
    // 获取响应体大小
    let responseSize: number | undefined
    try {
      const body = await response.body()
      responseSize = body.length
    } catch {
      // 某些响应可能无法获取 body
    }

    // 更新记录
    const record = matchedPending.record
    record.status = response.status()
    record.duration = duration
    record.responseSize = responseSize

    // 添加到完整记录列表
    this.allCalls.push(record)
    
    // 从待处理列表中移除
    this.pendingRequests.delete(matchedRequestId)

    // 控制台输出响应信息
    const statusEmoji = record.status && record.status >= 400 ? '❌' : '✅'
    console.log(`[API] ${statusEmoji} ${record.method} ${record.table}.${record.operation} - ${record.status} (${duration}ms)`)
  }

  /**
   * 启动 API 拦截器
   * 开始监听页面的网络请求和响应
   * @param page - Playwright 页面对象
   */
  start(page: Page): void {
    if (this.isRunning) {
      console.warn('[ApiInterceptor] 拦截器已在运行中')
      return
    }

    this.page = page
    this.isRunning = true
    
    // 创建事件处理函数
    this.requestHandler = (request: Request) => this.handleRequest(request)
    this.responseHandler = (response: Response) => {
      // 使用 void 忽略 Promise 返回值，避免未处理的 Promise
      void this.handleResponse(response)
    }
    
    // 注册事件监听器
    page.on('request', this.requestHandler)
    page.on('response', this.responseHandler)
    
    console.log('[ApiInterceptor] ✅ 拦截器已启动')
  }

  /**
   * 停止 API 拦截器
   * 移除所有事件监听器
   */
  stop(): void {
    if (!this.isRunning || !this.page) {
      console.warn('[ApiInterceptor] 拦截器未在运行')
      return
    }

    // 移除事件监听器
    if (this.requestHandler) {
      this.page.off('request', this.requestHandler)
      this.requestHandler = null
    }
    
    if (this.responseHandler) {
      this.page.off('response', this.responseHandler)
      this.responseHandler = null
    }
    
    this.isRunning = false
    this.page = null
    
    console.log('[ApiInterceptor] ⏹️ 拦截器已停止')
  }

  /**
   * 获取当前页面的 API 调用记录
   * @returns 当前页面的 API 调用记录数组
   */
  getCurrentPageCalls(): ApiCallRecord[] {
    return this.allCalls.filter(call => call.pagePath === this.currentPagePath)
  }

  /**
   * 获取所有 API 调用记录
   * @returns 所有 API 调用记录数组
   */
  getAllCalls(): ApiCallRecord[] {
    return [...this.allCalls]
  }

  /**
   * 清空所有记录
   * 重置拦截器状态
   */
  clear(): void {
    this.allCalls = []
    this.pendingRequests.clear()
    this.currentPagePath = ''
    console.log('[ApiInterceptor] 🗑️ 记录已清空')
  }

  /**
   * 设置当前页面路径
   * 用于将后续的 API 调用关联到指定页面
   * @param path - 页面路径
   */
  setCurrentPage(path: string): void {
    this.currentPagePath = path
    console.log(`[ApiInterceptor] 📍 当前页面: ${path}`)
  }

  /**
   * 获取当前页面路径
   * @returns 当前页面路径
   */
  getCurrentPage(): string {
    return this.currentPagePath
  }

  /**
   * 检查拦截器是否正在运行
   * @returns 是否正在运行
   */
  isActive(): boolean {
    return this.isRunning
  }

  /**
   * 获取待处理请求数量
   * 用于调试和监控
   * @returns 待处理请求数量
   */
  getPendingCount(): number {
    return this.pendingRequests.size
  }

  /**
   * 获取按页面分组的 API 调用统计
   * @returns 按页面路径分组的调用数量
   */
  getCallsByPage(): Record<string, number> {
    const result: Record<string, number> = {}
    
    for (const call of this.allCalls) {
      const path = call.pagePath || 'unknown'
      result[path] = (result[path] || 0) + 1
    }
    
    return result
  }

  /**
   * 获取按表名分组的 API 调用统计
   * @returns 按表名分组的调用数量
   */
  getCallsByTable(): Record<string, number> {
    const result: Record<string, number> = {}
    
    for (const call of this.allCalls) {
      const table = call.table || 'unknown'
      result[table] = (result[table] || 0) + 1
    }
    
    return result
  }

  /**
   * 获取错误请求列表
   * @returns 状态码 >= 400 的请求记录
   */
  getErrorCalls(): ApiCallRecord[] {
    return this.allCalls.filter(call => call.status && call.status >= 400)
  }

  /**
   * 获取响应时间统计
   * @returns 响应时间统计对象
   */
  getDurationStats(): { avg: number; max: number; min: number; total: number } {
    const durations = this.allCalls
      .filter(call => call.duration !== undefined)
      .map(call => call.duration as number)
    
    if (durations.length === 0) {
      return { avg: 0, max: 0, min: 0, total: 0 }
    }
    
    const total = durations.reduce((sum, d) => sum + d, 0)
    
    return {
      avg: total / durations.length,
      max: Math.max(...durations),
      min: Math.min(...durations),
      total
    }
  }
}

/**
 * 创建 API 拦截器实例的工厂函数
 * @returns 新的 ApiInterceptor 实例
 */
export function createApiInterceptor(): ApiInterceptor {
  return new ApiInterceptor()
}
