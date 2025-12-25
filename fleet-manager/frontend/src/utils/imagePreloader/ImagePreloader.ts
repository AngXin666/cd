/**
 * 图片预加载器
 * 提供图片预加载队列管理、并发控制和加载状态跟踪功能
 * @module utils/imagePreloader/ImagePreloader
 */

import { getImageCacheManager, ImageCacheManager } from '../imageCache'
import type {
  IImagePreloader,
  PreloadTask,
  PreloadOptions,
  PreloaderConfig,
  PreloaderStats,
  PreloadEventType,
  PreloadEventData,
  PreloadEventListener
} from './types'
import {
  PreloadTaskStatus,
  PreloadPriority,
  DEFAULT_PRELOADER_CONFIG
} from './types'

/**
 * 图片预加载器
 * 单例模式，提供图片预加载队列管理功能
 *
 * 功能特性：
 * - 支持优先级队列，高优先级任务优先执行
 * - 支持并发控制，最多同时加载指定数量的图片
 * - 支持任务取消和分组取消
 * - 支持暂停和恢复
 * - 支持重试机制
 * - 自动集成图片缓存管理器
 * - 支持事件监听
 */
export class ImagePreloader implements IImagePreloader {
  /** 单例实例 */
  private static instance: ImagePreloader | null = null

  /** 配置选项 */
  private config: PreloaderConfig

  /** 图片缓存管理器 */
  private cacheManager: ImageCacheManager

  /** 任务映射（taskId -> task） */
  private tasks: Map<string, PreloadTask> = new Map()

  /** 等待队列（按优先级排序） */
  private pendingQueue: string[] = []

  /** 正在加载的任务 ID 集合 */
  private loadingTasks: Set<string> = new Set()

  /** 是否已暂停 */
  private paused = false

  /** 事件监听器映射 */
  private eventListeners: Map<PreloadEventType, Set<PreloadEventListener>> = new Map()

  /** 任务 ID 计数器 */
  private taskIdCounter = 0

  /** 统计数据 */
  private stats = {
    completedCount: 0,
    failedCount: 0,
    cancelledCount: 0,
    totalLoadTime: 0,
    totalBytesLoaded: 0
  }

  /** 正在进行的 fetch 请求（用于取消） */
  private abortControllers: Map<string, AbortController> = new Map()

  /**
   * 私有构造函数（单例模式）
   * @param config - 配置选项
   */
  private constructor(config?: Partial<PreloaderConfig>) {
    this.config = {
      ...DEFAULT_PRELOADER_CONFIG,
      ...config
    }
    this.cacheManager = getImageCacheManager()
  }

  /**
   * 获取图片预加载器实例
   * @param config - 配置选项（仅首次调用时生效）
   * @returns 图片预加载器实例
   */
  static getInstance(config?: Partial<PreloaderConfig>): ImagePreloader {
    if (!ImagePreloader.instance) {
      ImagePreloader.instance = new ImagePreloader(config)
    }
    return ImagePreloader.instance
  }

  /**
   * 重置单例实例（主要用于测试）
   */
  static resetInstance(): void {
    if (ImagePreloader.instance) {
      ImagePreloader.instance.destroy()
      ImagePreloader.instance = null
    }
  }

  /**
   * 输出调试日志
   * @param message - 日志消息
   * @param args - 附加参数
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[ImagePreloader] ${message}`, ...args)
    }
  }

  /**
   * 生成唯一的任务 ID
   * @returns 任务 ID
   */
  private generateTaskId(): string {
    return `preload_${Date.now()}_${++this.taskIdCounter}`
  }

  /**
   * 触发事件
   * @param type - 事件类型
   * @param task - 相关任务
   * @param data - 附加数据
   */
  private emit(
    type: PreloadEventType,
    task?: PreloadTask,
    data?: Record<string, unknown>
  ): void {
    const listeners = this.eventListeners.get(type)
    if (!listeners || listeners.size === 0) {
      return
    }

    const event: PreloadEventData = {
      type,
      task,
      timestamp: Date.now(),
      data
    }

    for (const listener of listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('[ImagePreloader] 事件监听器执行错误:', error)
      }
    }
  }

  /**
   * 将任务插入等待队列（按优先级排序）
   * @param taskId - 任务 ID
   */
  private insertToQueue(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    // 找到合适的插入位置（优先级高的在前）
    let insertIndex = this.pendingQueue.length
    for (let i = 0; i < this.pendingQueue.length; i++) {
      const existingTask = this.tasks.get(this.pendingQueue[i])
      if (existingTask && task.priority > existingTask.priority) {
        insertIndex = i
        break
      }
    }

    this.pendingQueue.splice(insertIndex, 0, taskId)
  }

  /**
   * 处理队列中的下一个任务
   */
  private processQueue(): void {
    // 如果已暂停，不处理
    if (this.paused) {
      return
    }

    // 如果已达到最大并发数，不处理
    if (this.loadingTasks.size >= this.config.maxConcurrent) {
      return
    }

    // 如果队列为空，触发队列清空事件
    if (this.pendingQueue.length === 0) {
      if (this.loadingTasks.size === 0) {
        this.emit('queueEmpty')
      }
      return
    }

    // 取出队列中的第一个任务
    const taskId = this.pendingQueue.shift()
    if (!taskId) return

    const task = this.tasks.get(taskId)
    if (!task || task.status !== PreloadTaskStatus.PENDING) {
      // 任务已被取消或状态异常，处理下一个
      this.processQueue()
      return
    }

    // 开始加载任务
    this.startTask(taskId)

    // 继续处理队列（可能还有并发空间）
    this.processQueue()
  }

  /**
   * 开始执行预加载任务
   * @param taskId - 任务 ID
   */
  private async startTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    // 更新任务状态
    task.status = PreloadTaskStatus.LOADING
    task.startedAt = Date.now()
    this.loadingTasks.add(taskId)

    this.log(`开始加载: ${task.url}`)
    this.emit('taskStart', task)

    // 创建 AbortController 用于取消请求
    const abortController = new AbortController()
    this.abortControllers.set(taskId, abortController)

    try {
      // 首先检查缓存
      const hasCache = await this.cacheManager.hasCache(task.url)
      if (hasCache) {
        // 缓存命中，直接完成
        this.completeTask(taskId, true)
        return
      }

      // 从网络加载图片
      const response = await this.fetchWithTimeout(
        task.url,
        abortController.signal,
        this.config.defaultTimeout
      )

      // 重新获取任务状态，检查是否已被取消
      const currentTask = this.tasks.get(taskId)
      if (!currentTask || currentTask.status === PreloadTaskStatus.CANCELLED) {
        return
      }

      const blob = await response.blob()
      task.size = blob.size

      // 缓存图片
      if (this.config.autoCache) {
        const arrayBuffer = await blob.arrayBuffer()
        const mimeType = response.headers.get('content-type') || 'image/jpeg'
        await this.cacheManager.cacheImage(task.url, arrayBuffer, { mimeType })
      }

      // 完成任务
      this.completeTask(taskId, true)
    } catch (error) {
      // 重新获取任务状态，检查是否是取消导致的错误
      const currentTask = this.tasks.get(taskId)
      if (!currentTask || currentTask.status === PreloadTaskStatus.CANCELLED) {
        return
      }

      // 处理错误
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.handleTaskError(taskId, errorMessage)
    }
  }

  /**
   * 带超时的 fetch 请求
   * @param url - 请求 URL
   * @param signal - AbortSignal
   * @param timeout - 超时时间（毫秒）
   * @returns Response 对象
   */
  private async fetchWithTimeout(
    url: string,
    signal: AbortSignal,
    timeout: number
  ): Promise<Response> {
    // 创建超时 Promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('请求超时'))
      }, timeout)
    })

    // 创建 fetch Promise
    const fetchPromise = fetch(url, { signal })

    // 竞争
    const response = await Promise.race([fetchPromise, timeoutPromise])

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response
  }

  /**
   * 完成任务
   * @param taskId - 任务 ID
   * @param success - 是否成功
   */
  private completeTask(taskId: string, success: boolean): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.status = PreloadTaskStatus.COMPLETED
    task.completedAt = Date.now()
    task.progress = 100

    // 更新统计
    this.stats.completedCount++
    if (task.startedAt) {
      this.stats.totalLoadTime += task.completedAt - task.startedAt
    }
    if (task.size) {
      this.stats.totalBytesLoaded += task.size
    }

    // 清理
    this.loadingTasks.delete(taskId)
    this.abortControllers.delete(taskId)

    this.log(`加载完成: ${task.url}`)
    this.emit('taskComplete', task)

    // 处理下一个任务
    this.processQueue()
  }

  /**
   * 处理任务错误
   * @param taskId - 任务 ID
   * @param errorMessage - 错误信息
   */
  private handleTaskError(taskId: string, errorMessage: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    task.error = errorMessage
    task.retryCount++

    this.log(`加载失败: ${task.url}, 错误: ${errorMessage}, 重试次数: ${task.retryCount}`)

    // 检查是否可以重试
    if (task.retryCount < this.config.defaultMaxRetries) {
      // 重新加入队列
      task.status = PreloadTaskStatus.PENDING
      this.loadingTasks.delete(taskId)
      this.abortControllers.delete(taskId)

      // 延迟后重试
      setTimeout(() => {
        if (task.status === PreloadTaskStatus.PENDING) {
          this.insertToQueue(taskId)
          this.processQueue()
        }
      }, this.config.retryDelay)
    } else {
      // 标记为失败
      task.status = PreloadTaskStatus.FAILED
      task.completedAt = Date.now()
      this.stats.failedCount++

      this.loadingTasks.delete(taskId)
      this.abortControllers.delete(taskId)

      this.emit('taskFailed', task)

      // 处理下一个任务
      this.processQueue()
    }
  }

  /**
   * 预加载单张图片
   * @param url - 图片 URL
   * @param options - 预加载选项
   * @returns 任务 ID
   */
  preload(url: string, options?: PreloadOptions): string {
    // 检查队列是否已满
    if (this.pendingQueue.length >= this.config.maxQueueSize) {
      this.log('队列已满，拒绝新任务')
      this.emit('queueFull')
      throw new Error('预加载队列已满')
    }

    // 检查是否已有相同 URL 的任务
    for (const task of this.tasks.values()) {
      if (task.url === url && 
          (task.status === PreloadTaskStatus.PENDING || 
           task.status === PreloadTaskStatus.LOADING)) {
        this.log(`任务已存在: ${url}`)
        return task.id
      }
    }

    // 创建新任务
    const taskId = this.generateTaskId()
    const task: PreloadTask = {
      id: taskId,
      url,
      status: PreloadTaskStatus.PENDING,
      priority: options?.priority ?? PreloadPriority.NORMAL,
      createdAt: Date.now(),
      retryCount: 0,
      progress: 0,
      groupId: options?.groupId
    }

    this.tasks.set(taskId, task)
    this.insertToQueue(taskId)

    this.log(`添加任务: ${url}, 优先级: ${task.priority}`)

    // 如果是低优先级任务，延迟处理
    if (task.priority === PreloadPriority.LOW) {
      setTimeout(() => {
        this.processQueue()
      }, this.config.lowPriorityDelay)
    } else {
      this.processQueue()
    }

    return taskId
  }

  /**
   * 批量预加载图片
   * @param urls - 图片 URL 数组
   * @param options - 预加载选项
   * @returns 任务 ID 数组
   */
  preloadBatch(urls: string[], options?: PreloadOptions): string[] {
    const taskIds: string[] = []
    
    // 生成分组 ID（如果未提供）
    const groupId = options?.groupId ?? `batch_${Date.now()}`
    const batchOptions = { ...options, groupId }

    for (const url of urls) {
      try {
        const taskId = this.preload(url, batchOptions)
        taskIds.push(taskId)
      } catch (error) {
        // 队列已满，停止添加
        this.log(`批量预加载中断: ${error}`)
        break
      }
    }

    return taskIds
  }

  /**
   * 取消预加载任务
   * @param taskId - 任务 ID
   * @returns 是否成功取消
   */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) {
      return false
    }

    // 只能取消等待中或加载中的任务
    if (task.status !== PreloadTaskStatus.PENDING && 
        task.status !== PreloadTaskStatus.LOADING) {
      return false
    }

    // 取消正在进行的请求
    const abortController = this.abortControllers.get(taskId)
    if (abortController) {
      abortController.abort()
      this.abortControllers.delete(taskId)
    }

    // 更新任务状态
    task.status = PreloadTaskStatus.CANCELLED
    task.completedAt = Date.now()
    this.stats.cancelledCount++

    // 从队列和加载集合中移除
    const queueIndex = this.pendingQueue.indexOf(taskId)
    if (queueIndex !== -1) {
      this.pendingQueue.splice(queueIndex, 1)
    }
    this.loadingTasks.delete(taskId)

    this.log(`取消任务: ${task.url}`)
    this.emit('taskCancelled', task)

    // 处理下一个任务
    this.processQueue()

    return true
  }

  /**
   * 取消分组内的所有任务
   * @param groupId - 分组 ID
   * @returns 取消的任务数量
   */
  cancelGroup(groupId: string): number {
    let cancelledCount = 0

    for (const [taskId, task] of this.tasks) {
      if (task.groupId === groupId) {
        if (this.cancel(taskId)) {
          cancelledCount++
        }
      }
    }

    this.log(`取消分组 ${groupId}: ${cancelledCount} 个任务`)
    return cancelledCount
  }

  /**
   * 取消所有任务
   * @returns 取消的任务数量
   */
  cancelAll(): number {
    let cancelledCount = 0

    for (const taskId of this.tasks.keys()) {
      if (this.cancel(taskId)) {
        cancelledCount++
      }
    }

    this.log(`取消所有任务: ${cancelledCount} 个`)
    return cancelledCount
  }

  /**
   * 获取任务状态
   * @param taskId - 任务 ID
   * @returns 任务信息
   */
  getTask(taskId: string): PreloadTask | null {
    return this.tasks.get(taskId) || null
  }

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStats(): PreloaderStats {
    const pendingCount = this.pendingQueue.length
    const loadingCount = this.loadingTasks.size
    const totalCount = pendingCount + loadingCount + 
                       this.stats.completedCount + 
                       this.stats.failedCount + 
                       this.stats.cancelledCount

    const successRate = totalCount > 0 
      ? this.stats.completedCount / totalCount 
      : 0

    const averageLoadTime = this.stats.completedCount > 0
      ? this.stats.totalLoadTime / this.stats.completedCount
      : 0

    return {
      pendingCount,
      loadingCount,
      completedCount: this.stats.completedCount,
      failedCount: this.stats.failedCount,
      cancelledCount: this.stats.cancelledCount,
      totalCount,
      successRate,
      averageLoadTime,
      totalBytesLoaded: this.stats.totalBytesLoaded
    }
  }

  /**
   * 暂停预加载
   */
  pause(): void {
    this.paused = true
    this.log('预加载已暂停')
  }

  /**
   * 恢复预加载
   */
  resume(): void {
    this.paused = false
    this.log('预加载已恢复')
    this.processQueue()
  }

  /**
   * 是否已暂停
   * @returns 是否已暂停
   */
  isPaused(): boolean {
    return this.paused
  }

  /**
   * 添加事件监听器
   * @param type - 事件类型
   * @param listener - 监听器函数
   */
  on(type: PreloadEventType, listener: PreloadEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set())
    }
    this.eventListeners.get(type)!.add(listener)
  }

  /**
   * 移除事件监听器
   * @param type - 事件类型
   * @param listener - 监听器函数
   */
  off(type: PreloadEventType, listener: PreloadEventListener): void {
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  /**
   * 清理已完成的任务记录
   */
  clearCompleted(): void {
    const toDelete: string[] = []

    for (const [taskId, task] of this.tasks) {
      if (task.status === PreloadTaskStatus.COMPLETED ||
          task.status === PreloadTaskStatus.FAILED ||
          task.status === PreloadTaskStatus.CANCELLED) {
        toDelete.push(taskId)
      }
    }

    for (const taskId of toDelete) {
      this.tasks.delete(taskId)
    }

    this.log(`清理了 ${toDelete.length} 个已完成的任务记录`)
  }

  /**
   * 销毁预加载器
   */
  destroy(): void {
    // 取消所有任务
    this.cancelAll()

    // 清理所有数据
    this.tasks.clear()
    this.pendingQueue = []
    this.loadingTasks.clear()
    this.eventListeners.clear()
    this.abortControllers.clear()

    // 重置统计
    this.stats = {
      completedCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      totalLoadTime: 0,
      totalBytesLoaded: 0
    }

    this.log('预加载器已销毁')
  }
}

/**
 * 获取图片预加载器实例的便捷函数
 * @param config - 配置选项
 * @returns 图片预加载器实例
 */
export function getImagePreloader(config?: Partial<PreloaderConfig>): ImagePreloader {
  return ImagePreloader.getInstance(config)
}
