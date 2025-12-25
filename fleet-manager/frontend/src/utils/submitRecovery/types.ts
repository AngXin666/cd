/**
 * 提交失败恢复类型定义
 * 定义提交失败恢复相关的接口和类型
 * @module utils/submitRecovery/types
 */

/**
 * 提交类型
 * - add: 添加车辆
 * - return: 还车
 * - supplement: 补录照片
 */
export type SubmitType = 'add' | 'return' | 'supplement'

/**
 * 提交状态
 * - pending: 待提交
 * - uploading: 上传中
 * - submitting: 提交中
 * - success: 成功
 * - failed: 失败
 * - partial: 部分成功（部分图片上传成功）
 */
export type SubmitStatus = 'pending' | 'uploading' | 'submitting' | 'success' | 'failed' | 'partial'

/**
 * 图片上传状态
 * 记录单张图片的上传状态
 */
export interface ImageUploadState {
  /** 本地路径 */
  localPath: string
  /** 已上传的远程 URL（如果已上传） */
  uploadedUrl?: string
  /** 上传状态 */
  status: 'pending' | 'uploading' | 'success' | 'failed'
  /** 上传时间戳 */
  uploadedAt?: number
  /** 错误信息（如果失败） */
  error?: string
  /** 重试次数 */
  retryCount: number
}

/**
 * 提交任务
 * 记录一次提交操作的完整状态
 */
export interface SubmitTask {
  /** 任务 ID（唯一标识） */
  id: string
  /** 提交类型 */
  type: SubmitType
  /** 用户 ID */
  userId: number
  /** 车辆 ID（还车/补录时使用） */
  vehicleId?: number
  /** 草稿 ID（关联的草稿） */
  draftId?: string
  /** 创建时间戳 */
  createdAt: number
  /** 更新时间戳 */
  updatedAt: number
  /** 提交状态 */
  status: SubmitStatus
  /** 表单数据（JSON 字符串） */
  formData: string
  /** 图片上传状态列表 */
  images: ImageUploadState[]
  /** 错误信息（如果失败） */
  error?: string
  /** 重试次数 */
  retryCount: number
  /** 最大重试次数 */
  maxRetries: number
}

/**
 * 提交恢复配置选项
 */
export interface SubmitRecoveryOptions {
  /** 存储根目录，默认 'submit_recovery' */
  rootDir?: string
  /** 最大重试次数，默认 3 */
  maxRetries?: number
  /** 重试间隔（毫秒），默认 3000 */
  retryInterval?: number
  /** 任务过期时间（毫秒），默认 7 天 */
  taskExpiration?: number
  /** 是否启用调试日志 */
  debug?: boolean
  /** 图片上传并发数，默认 2 */
  uploadConcurrency?: number
}

/**
 * 提交进度回调
 */
export interface SubmitProgressCallback {
  /** 图片上传进度 */
  onImageProgress?: (uploaded: number, total: number, currentImage: string) => void
  /** 状态变化 */
  onStatusChange?: (status: SubmitStatus, message?: string) => void
  /** 错误发生 */
  onError?: (error: Error, canRetry: boolean) => void
  /** 提交成功 */
  onSuccess?: (result: unknown) => void
}

/**
 * 提交结果
 */
export interface SubmitResult {
  /** 是否成功 */
  success: boolean
  /** 任务 ID */
  taskId: string
  /** 结果数据（成功时） */
  data?: unknown
  /** 错误信息（失败时） */
  error?: string
  /** 是否可以重试 */
  canRetry: boolean
  /** 已上传的图片数量 */
  uploadedCount: number
  /** 总图片数量 */
  totalCount: number
}

/**
 * 网络状态
 */
export interface NetworkState {
  /** 是否在线 */
  isOnline: boolean
  /** 网络类型 */
  networkType: 'wifi' | '4g' | '3g' | '2g' | 'unknown' | 'none'
  /** 上次检查时间 */
  lastCheckedAt: number
}

/**
 * 提交失败恢复管理器接口
 */
export interface ISubmitRecoveryManager {
  /**
   * 初始化管理器
   * @returns 初始化是否成功
   */
  initialize(): Promise<boolean>

  /**
   * 创建提交任务
   * @param type - 提交类型
   * @param userId - 用户 ID
   * @param formData - 表单数据
   * @param imagePaths - 图片本地路径列表
   * @param options - 可选参数
   * @returns 任务 ID
   */
  createTask(
    type: SubmitType,
    userId: number,
    formData: Record<string, unknown>,
    imagePaths: string[],
    options?: {
      vehicleId?: number
      draftId?: string
    }
  ): Promise<string>

  /**
   * 执行提交任务
   * @param taskId - 任务 ID
   * @param submitFn - 提交函数
   * @param callbacks - 进度回调
   * @returns 提交结果
   */
  executeTask(
    taskId: string,
    submitFn: (formData: Record<string, unknown>, imageUrls: string[]) => Promise<unknown>,
    callbacks?: SubmitProgressCallback
  ): Promise<SubmitResult>

  /**
   * 重试失败的任务
   * @param taskId - 任务 ID
   * @param submitFn - 提交函数
   * @param callbacks - 进度回调
   * @returns 提交结果
   */
  retryTask(
    taskId: string,
    submitFn: (formData: Record<string, unknown>, imageUrls: string[]) => Promise<unknown>,
    callbacks?: SubmitProgressCallback
  ): Promise<SubmitResult>

  /**
   * 获取任务状态
   * @param taskId - 任务 ID
   * @returns 任务信息
   */
  getTask(taskId: string): Promise<SubmitTask | null>

  /**
   * 获取用户的所有失败任务
   * @param userId - 用户 ID
   * @returns 失败任务列表
   */
  getFailedTasks(userId: number): Promise<SubmitTask[]>

  /**
   * 获取用户的所有待处理任务
   * @param userId - 用户 ID
   * @returns 待处理任务列表
   */
  getPendingTasks(userId: number): Promise<SubmitTask[]>

  /**
   * 删除任务
   * @param taskId - 任务 ID
   * @returns 是否成功删除
   */
  deleteTask(taskId: string): Promise<boolean>

  /**
   * 清理过期任务
   * @returns 清理的任务数量
   */
  cleanExpiredTasks(): Promise<number>

  /**
   * 检查网络状态
   * @returns 网络状态
   */
  checkNetwork(): Promise<NetworkState>

  /**
   * 监听网络状态变化
   * @param callback - 状态变化回调
   * @returns 取消监听函数
   */
  onNetworkChange(callback: (state: NetworkState) => void): () => void

  /**
   * 获取已上传的图片 URL 映射
   * @param taskId - 任务 ID
   * @returns 本地路径到远程 URL 的映射
   */
  getUploadedUrls(taskId: string): Promise<Record<string, string>>

  /**
   * 标记图片已上传
   * @param taskId - 任务 ID
   * @param localPath - 本地路径
   * @param uploadedUrl - 远程 URL
   */
  markImageUploaded(taskId: string, localPath: string, uploadedUrl: string): Promise<void>
}

/**
 * 默认配置常量
 */
export const DEFAULT_RECOVERY_OPTIONS: Required<SubmitRecoveryOptions> = {
  /** 默认存储目录 */
  rootDir: 'submit_recovery',
  /** 默认最大重试次数 */
  maxRetries: 3,
  /** 默认重试间隔：3 秒 */
  retryInterval: 3000,
  /** 默认任务过期时间：7 天 */
  taskExpiration: 7 * 24 * 60 * 60 * 1000,
  /** 默认不启用调试 */
  debug: false,
  /** 默认上传并发数 */
  uploadConcurrency: 2
}

/**
 * 任务元数据文件名
 */
export const TASKS_META_FILENAME = '_tasks_meta.json'
