/**
 * 图片预加载器类型定义
 * 定义预加载队列管理、并发控制和加载状态相关的类型
 * @module utils/imagePreloader/types
 */

/**
 * 预加载任务状态枚举
 * 表示单个图片预加载任务的当前状态
 */
export enum PreloadTaskStatus {
  /** 等待中 - 任务已加入队列但尚未开始 */
  PENDING = 'pending',
  /** 加载中 - 正在下载图片 */
  LOADING = 'loading',
  /** 已完成 - 图片加载成功 */
  COMPLETED = 'completed',
  /** 失败 - 图片加载失败 */
  FAILED = 'failed',
  /** 已取消 - 任务被取消 */
  CANCELLED = 'cancelled'
}

/**
 * 预加载任务优先级枚举
 * 用于控制任务执行顺序
 */
export enum PreloadPriority {
  /** 低优先级 - 后台预加载 */
  LOW = 0,
  /** 普通优先级 - 默认优先级 */
  NORMAL = 1,
  /** 高优先级 - 即将显示的图片 */
  HIGH = 2,
  /** 紧急优先级 - 当前可视区域的图片 */
  URGENT = 3
}

/**
 * 预加载任务接口
 * 表示单个图片预加载任务的完整信息
 */
export interface PreloadTask {
  /** 任务唯一标识 */
  id: string
  /** 图片 URL */
  url: string
  /** 任务状态 */
  status: PreloadTaskStatus
  /** 任务优先级 */
  priority: PreloadPriority
  /** 创建时间戳 */
  createdAt: number
  /** 开始加载时间戳 */
  startedAt?: number
  /** 完成时间戳 */
  completedAt?: number
  /** 重试次数 */
  retryCount: number
  /** 错误信息（如果失败） */
  error?: string
  /** 加载进度（0-100） */
  progress: number
  /** 图片大小（字节） */
  size?: number
  /** 任务分组标识（用于批量操作） */
  groupId?: string
}

/**
 * 预加载选项接口
 * 配置单个预加载任务的行为
 */
export interface PreloadOptions {
  /** 任务优先级，默认 NORMAL */
  priority?: PreloadPriority
  /** 超时时间（毫秒），默认 30000 */
  timeout?: number
  /** 最大重试次数，默认 2 */
  maxRetries?: number
  /** 任务分组标识 */
  groupId?: string
  /** 请求头 */
  headers?: Record<string, string>
  /** 完成回调 */
  onComplete?: (url: string, success: boolean) => void
  /** 进度回调 */
  onProgress?: (url: string, progress: number) => void
}

/**
 * 预加载器配置接口
 * 配置预加载器的全局行为
 */
export interface PreloaderConfig {
  /** 最大并发数，默认 3 */
  maxConcurrent: number
  /** 默认超时时间（毫秒），默认 30000 */
  defaultTimeout: number
  /** 默认最大重试次数，默认 2 */
  defaultMaxRetries: number
  /** 重试延迟（毫秒），默认 1000 */
  retryDelay: number
  /** 是否自动缓存到本地，默认 true */
  autoCache: boolean
  /** 是否启用调试日志，默认 false */
  debug: boolean
  /** 队列最大长度，默认 100 */
  maxQueueSize: number
  /** 低优先级任务延迟执行时间（毫秒），默认 500 */
  lowPriorityDelay: number
}

/**
 * 预加载器统计信息接口
 * 提供预加载器的运行状态统计
 */
export interface PreloaderStats {
  /** 队列中等待的任务数 */
  pendingCount: number
  /** 正在加载的任务数 */
  loadingCount: number
  /** 已完成的任务数 */
  completedCount: number
  /** 失败的任务数 */
  failedCount: number
  /** 已取消的任务数 */
  cancelledCount: number
  /** 总任务数 */
  totalCount: number
  /** 成功率（0-1） */
  successRate: number
  /** 平均加载时间（毫秒） */
  averageLoadTime: number
  /** 总加载数据量（字节） */
  totalBytesLoaded: number
}

/**
 * 预加载事件类型
 * 用于事件监听
 */
export type PreloadEventType =
  | 'taskStart'      // 任务开始
  | 'taskComplete'   // 任务完成
  | 'taskFailed'     // 任务失败
  | 'taskCancelled'  // 任务取消
  | 'taskProgress'   // 任务进度更新
  | 'queueEmpty'     // 队列清空
  | 'queueFull'      // 队列已满

/**
 * 预加载事件数据接口
 * 事件回调的参数类型
 */
export interface PreloadEventData {
  /** 事件类型 */
  type: PreloadEventType
  /** 相关任务（如果有） */
  task?: PreloadTask
  /** 时间戳 */
  timestamp: number
  /** 附加数据 */
  data?: Record<string, unknown>
}

/**
 * 预加载事件监听器类型
 */
export type PreloadEventListener = (event: PreloadEventData) => void

/**
 * 图片预加载器接口
 * 定义预加载器的公共 API
 */
export interface IImagePreloader {
  /**
   * 预加载单张图片
   * @param url - 图片 URL
   * @param options - 预加载选项
   * @returns 任务 ID
   */
  preload(url: string, options?: PreloadOptions): string

  /**
   * 批量预加载图片
   * @param urls - 图片 URL 数组
   * @param options - 预加载选项
   * @returns 任务 ID 数组
   */
  preloadBatch(urls: string[], options?: PreloadOptions): string[]

  /**
   * 取消预加载任务
   * @param taskId - 任务 ID
   * @returns 是否成功取消
   */
  cancel(taskId: string): boolean

  /**
   * 取消分组内的所有任务
   * @param groupId - 分组 ID
   * @returns 取消的任务数量
   */
  cancelGroup(groupId: string): number

  /**
   * 取消所有任务
   * @returns 取消的任务数量
   */
  cancelAll(): number

  /**
   * 获取任务状态
   * @param taskId - 任务 ID
   * @returns 任务信息
   */
  getTask(taskId: string): PreloadTask | null

  /**
   * 获取统计信息
   * @returns 统计信息
   */
  getStats(): PreloaderStats

  /**
   * 暂停预加载
   */
  pause(): void

  /**
   * 恢复预加载
   */
  resume(): void

  /**
   * 是否已暂停
   */
  isPaused(): boolean

  /**
   * 添加事件监听器
   * @param type - 事件类型
   * @param listener - 监听器函数
   */
  on(type: PreloadEventType, listener: PreloadEventListener): void

  /**
   * 移除事件监听器
   * @param type - 事件类型
   * @param listener - 监听器函数
   */
  off(type: PreloadEventType, listener: PreloadEventListener): void

  /**
   * 清理已完成的任务记录
   */
  clearCompleted(): void

  /**
   * 销毁预加载器
   */
  destroy(): void
}

/**
 * 默认预加载器配置
 */
export const DEFAULT_PRELOADER_CONFIG: PreloaderConfig = {
  maxConcurrent: 3,
  defaultTimeout: 30000,
  defaultMaxRetries: 2,
  retryDelay: 1000,
  autoCache: true,
  debug: false,
  maxQueueSize: 100,
  lowPriorityDelay: 500
}
