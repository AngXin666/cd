/**
 * 提交失败恢复管理器
 * 提供提交失败时的自动保存草稿、断点续传和重试机制
 * @module utils/submitRecovery/SubmitRecoveryManager
 */

import { getStorageManager, StorageManager } from '../storage'
import { uploadImage } from '../imageUpload'
import type {
  ISubmitRecoveryManager,
  SubmitTask,
  SubmitType,
  SubmitStatus,
  ImageUploadState,
  SubmitRecoveryOptions,
  SubmitProgressCallback,
  SubmitResult,
  NetworkState
} from './types'
import {
  DEFAULT_RECOVERY_OPTIONS,
  TASKS_META_FILENAME
} from './types'

/**
 * 生成唯一 ID
 * 使用时间戳 + 随机数生成
 * @returns 唯一 ID 字符串
 */
function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}_${random}`
}

/**
 * 提交失败恢复管理器
 * 单例模式，提供提交失败时的恢复功能
 *
 * 功能特性：
 * - 提交失败时自动保存草稿
 * - 断点续传（记录已上传的图片 URL）
 * - 网络恢复后提示重试
 * - 支持多任务管理
 */
export class SubmitRecoveryManager implements ISubmitRecoveryManager {
  /** 单例实例 */
  private static instance: SubmitRecoveryManager | null = null

  /** 存储管理器实例 */
  private storageManager: StorageManager

  /** 配置选项 */
  private options: Required<SubmitRecoveryOptions>

  /** 是否已初始化 */
  private initialized = false

  /** 任务缓存（taskId -> SubmitTask） */
  private taskCache: Map<string, SubmitTask> = new Map()

  /** 元数据是否已修改 */
  private metaDirty = false

  /** 元数据保存定时器 */
  private metaSaveTimer: ReturnType<typeof setTimeout> | null = null

  /** 网络状态监听器列表 */
  private networkListeners: Array<(state: NetworkState) => void> = []

  /** 当前网络状态 */
  private currentNetworkState: NetworkState = {
    isOnline: true,
    networkType: 'unknown',
    lastCheckedAt: Date.now()
  }

  /**
   * 私有构造函数（单例模式）
   * @param options - 配置选项
   */
  private constructor(options?: SubmitRecoveryOptions) {
    this.options = {
      ...DEFAULT_RECOVERY_OPTIONS,
      ...options
    }
    this.storageManager = getStorageManager()
  }

  /**
   * 获取提交恢复管理器实例
   * @param options - 配置选项（仅首次调用时生效）
   * @returns 提交恢复管理器实例
   */
  static getInstance(options?: SubmitRecoveryOptions): SubmitRecoveryManager {
    if (!SubmitRecoveryManager.instance) {
      SubmitRecoveryManager.instance = new SubmitRecoveryManager(options)
    }
    return SubmitRecoveryManager.instance
  }

  /**
   * 重置单例实例（主要用于测试）
   */
  static resetInstance(): void {
    if (SubmitRecoveryManager.instance) {
      if (SubmitRecoveryManager.instance.metaSaveTimer) {
        clearTimeout(SubmitRecoveryManager.instance.metaSaveTimer)
      }
      SubmitRecoveryManager.instance.taskCache.clear()
      SubmitRecoveryManager.instance.networkListeners = []
      SubmitRecoveryManager.instance.initialized = false
      SubmitRecoveryManager.instance = null
    }
  }

  /**
   * 输出调试日志
   * @param message - 日志消息
   * @param args - 附加参数
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.options.debug) {
      console.log(`[SubmitRecoveryManager] ${message}`, ...args)
    }
  }

  /**
   * 获取元数据文件路径
   * @returns 元数据文件路径
   */
  private getMetaPath(): string {
    return `${this.options.rootDir}/${TASKS_META_FILENAME}`
  }

  /**
   * 初始化管理器
   * @returns 初始化是否成功
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true
    }

    try {
      this.log('开始初始化...')

      // 初始化存储管理器
      await this.storageManager.initialize()

      // 创建存储目录
      await this.storageManager.mkdir(this.options.rootDir, true)

      // 加载任务元数据
      await this.loadMeta()

      // 设置网络状态监听
      this.setupNetworkListener()

      this.initialized = true
      this.log('初始化完成')
      return true
    } catch (error) {
      console.error('[SubmitRecoveryManager] 初始化失败:', error)
      return false
    }
  }

  /**
   * 确保已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  /**
   * 加载任务元数据
   */
  private async loadMeta(): Promise<void> {
    try {
      const metaPath = this.getMetaPath()
      const exists = await this.storageManager.fileExists(metaPath)

      if (exists) {
        const content = await this.storageManager.readFile(metaPath, { format: 'text' })
        const tasks: SubmitTask[] = JSON.parse(content as string)

        this.taskCache.clear()
        for (const task of tasks) {
          this.taskCache.set(task.id, task)
        }

        this.log(`加载了 ${this.taskCache.size} 个任务`)
      }
    } catch (error) {
      this.log('加载任务元数据失败:', error)
      this.taskCache.clear()
    }
  }

  /**
   * 保存任务元数据
   */
  private async saveMeta(): Promise<void> {
    if (!this.metaDirty) {
      return
    }

    try {
      const tasks = Array.from(this.taskCache.values())
      const content = JSON.stringify(tasks, null, 2)
      await this.storageManager.writeFile(
        this.getMetaPath(),
        content,
        { encoding: 'utf8', overwrite: true }
      )

      this.metaDirty = false
      this.log('任务元数据已保存')
    } catch (error) {
      console.error('[SubmitRecoveryManager] 保存任务元数据失败:', error)
    }
  }

  /**
   * 标记元数据需要保存（防抖）
   */
  private markMetaDirty(): void {
    this.metaDirty = true

    if (this.metaSaveTimer) {
      clearTimeout(this.metaSaveTimer)
    }

    // 延迟 500ms 保存
    this.metaSaveTimer = setTimeout(() => {
      this.saveMeta()
    }, 500)
  }

  /**
   * 设置网络状态监听
   */
  private setupNetworkListener(): void {
    // 检查初始网络状态
    this.checkNetwork()

    // 监听网络状态变化（H5 环境）
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.handleNetworkChange(true)
      })
      window.addEventListener('offline', () => {
        this.handleNetworkChange(false)
      })
    }

    // 监听网络状态变化（UniApp 环境）
    // @ts-ignore
    if (typeof uni !== 'undefined' && uni.onNetworkStatusChange) {
      // @ts-ignore
      uni.onNetworkStatusChange((res: { isConnected: boolean; networkType: string }) => {
        this.currentNetworkState = {
          isOnline: res.isConnected,
          networkType: res.networkType as NetworkState['networkType'],
          lastCheckedAt: Date.now()
        }
        this.notifyNetworkListeners()
      })
    }
  }

  /**
   * 处理网络状态变化
   * @param isOnline - 是否在线
   */
  private handleNetworkChange(isOnline: boolean): void {
    this.currentNetworkState = {
      isOnline,
      networkType: isOnline ? 'unknown' : 'none',
      lastCheckedAt: Date.now()
    }
    this.notifyNetworkListeners()
  }

  /**
   * 通知所有网络状态监听器
   */
  private notifyNetworkListeners(): void {
    for (const listener of this.networkListeners) {
      try {
        listener(this.currentNetworkState)
      } catch (error) {
        console.error('[SubmitRecoveryManager] 网络状态监听器错误:', error)
      }
    }
  }

  /**
   * 创建提交任务
   * @param type - 提交类型
   * @param userId - 用户 ID
   * @param formData - 表单数据
   * @param imagePaths - 图片本地路径列表
   * @param options - 可选参数
   * @returns 任务 ID
   */
  async createTask(
    type: SubmitType,
    userId: number,
    formData: Record<string, unknown>,
    imagePaths: string[],
    options?: {
      vehicleId?: number
      draftId?: string
    }
  ): Promise<string> {
    await this.ensureInitialized()

    const taskId = generateId()
    const now = Date.now()

    // 创建图片上传状态列表
    const images: ImageUploadState[] = imagePaths.map(path => ({
      localPath: path,
      status: 'pending' as const,
      retryCount: 0
    }))

    // 创建任务
    const task: SubmitTask = {
      id: taskId,
      type,
      userId,
      vehicleId: options?.vehicleId,
      draftId: options?.draftId,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      formData: JSON.stringify(formData),
      images,
      retryCount: 0,
      maxRetries: this.options.maxRetries
    }

    // 保存到缓存
    this.taskCache.set(taskId, task)
    this.markMetaDirty()

    this.log(`创建任务: ${taskId}, 类型: ${type}, 图片数: ${imagePaths.length}`)
    return taskId
  }

  /**
   * 执行提交任务
   * @param taskId - 任务 ID
   * @param submitFn - 提交函数
   * @param callbacks - 进度回调
   * @returns 提交结果
   */
  async executeTask(
    taskId: string,
    submitFn: (formData: Record<string, unknown>, imageUrls: string[]) => Promise<unknown>,
    callbacks?: SubmitProgressCallback
  ): Promise<SubmitResult> {
    await this.ensureInitialized()

    const task = this.taskCache.get(taskId)
    if (!task) {
      return {
        success: false,
        taskId,
        error: '任务不存在',
        canRetry: false,
        uploadedCount: 0,
        totalCount: 0
      }
    }

    try {
      // 更新状态为上传中
      task.status = 'uploading'
      task.updatedAt = Date.now()
      this.markMetaDirty()
      callbacks?.onStatusChange?.('uploading', '正在上传图片...')

      // 上传图片（支持断点续传）
      const imageUrls = await this.uploadImages(task, callbacks)

      // 检查是否所有图片都上传成功
      const uploadedCount = task.images.filter(img => img.status === 'success').length
      const totalCount = task.images.length

      if (uploadedCount < totalCount) {
        // 部分上传成功
        task.status = 'partial'
        task.updatedAt = Date.now()
        task.error = `图片上传不完整: ${uploadedCount}/${totalCount}`
        this.markMetaDirty()

        const canRetry = task.retryCount < task.maxRetries
        callbacks?.onError?.(new Error(task.error), canRetry)

        return {
          success: false,
          taskId,
          error: task.error,
          canRetry,
          uploadedCount,
          totalCount
        }
      }

      // 更新状态为提交中
      task.status = 'submitting'
      task.updatedAt = Date.now()
      this.markMetaDirty()
      callbacks?.onStatusChange?.('submitting', '正在提交数据...')

      // 执行提交
      const formData = JSON.parse(task.formData)
      const result = await submitFn(formData, imageUrls)

      // 提交成功
      task.status = 'success'
      task.updatedAt = Date.now()
      this.markMetaDirty()
      callbacks?.onStatusChange?.('success', '提交成功')
      callbacks?.onSuccess?.(result)

      return {
        success: true,
        taskId,
        data: result,
        canRetry: false,
        uploadedCount,
        totalCount
      }
    } catch (error) {
      // 提交失败
      const errorMessage = error instanceof Error ? error.message : '提交失败'
      task.status = 'failed'
      task.error = errorMessage
      task.retryCount++
      task.updatedAt = Date.now()
      this.markMetaDirty()

      const canRetry = task.retryCount < task.maxRetries
      callbacks?.onStatusChange?.('failed', errorMessage)
      callbacks?.onError?.(error instanceof Error ? error : new Error(errorMessage), canRetry)

      const uploadedCount = task.images.filter(img => img.status === 'success').length

      return {
        success: false,
        taskId,
        error: errorMessage,
        canRetry,
        uploadedCount,
        totalCount: task.images.length
      }
    }
  }

  /**
   * 上传图片（支持断点续传）
   * @param task - 提交任务
   * @param callbacks - 进度回调
   * @returns 图片 URL 列表
   */
  private async uploadImages(
    task: SubmitTask,
    callbacks?: SubmitProgressCallback
  ): Promise<string[]> {
    const imageUrls: string[] = []
    const totalCount = task.images.length
    let uploadedCount = 0

    // 按并发数分批上传
    const concurrency = this.options.uploadConcurrency
    const batches: ImageUploadState[][] = []

    for (let i = 0; i < task.images.length; i += concurrency) {
      batches.push(task.images.slice(i, i + concurrency))
    }

    for (const batch of batches) {
      const uploadPromises = batch.map(async (imageState) => {
        // 如果已经上传成功，跳过
        if (imageState.status === 'success' && imageState.uploadedUrl) {
          uploadedCount++
          callbacks?.onImageProgress?.(uploadedCount, totalCount, imageState.localPath)
          return imageState.uploadedUrl
        }

        // 更新状态为上传中
        imageState.status = 'uploading'
        this.markMetaDirty()

        try {
          // 上传图片
          const url = await uploadImage(imageState.localPath)

          // 更新状态为成功
          imageState.status = 'success'
          imageState.uploadedUrl = url
          imageState.uploadedAt = Date.now()
          imageState.error = undefined
          this.markMetaDirty()

          uploadedCount++
          callbacks?.onImageProgress?.(uploadedCount, totalCount, imageState.localPath)

          return url
        } catch (error) {
          // 更新状态为失败
          imageState.status = 'failed'
          imageState.error = error instanceof Error ? error.message : '上传失败'
          imageState.retryCount++
          this.markMetaDirty()

          this.log(`图片上传失败: ${imageState.localPath}`, error)
          return ''
        }
      })

      const results = await Promise.all(uploadPromises)
      imageUrls.push(...results)
    }

    return imageUrls
  }

  /**
   * 重试失败的任务
   * @param taskId - 任务 ID
   * @param submitFn - 提交函数
   * @param callbacks - 进度回调
   * @returns 提交结果
   */
  async retryTask(
    taskId: string,
    submitFn: (formData: Record<string, unknown>, imageUrls: string[]) => Promise<unknown>,
    callbacks?: SubmitProgressCallback
  ): Promise<SubmitResult> {
    await this.ensureInitialized()

    const task = this.taskCache.get(taskId)
    if (!task) {
      return {
        success: false,
        taskId,
        error: '任务不存在',
        canRetry: false,
        uploadedCount: 0,
        totalCount: 0
      }
    }

    // 检查是否可以重试
    if (task.retryCount >= task.maxRetries) {
      return {
        success: false,
        taskId,
        error: '已达到最大重试次数',
        canRetry: false,
        uploadedCount: task.images.filter(img => img.status === 'success').length,
        totalCount: task.images.length
      }
    }

    // 重置失败的图片状态为待上传
    for (const image of task.images) {
      if (image.status === 'failed') {
        image.status = 'pending'
        image.error = undefined
      }
    }

    // 重置任务状态
    task.status = 'pending'
    task.error = undefined
    task.updatedAt = Date.now()
    this.markMetaDirty()

    // 执行任务
    return this.executeTask(taskId, submitFn, callbacks)
  }

  /**
   * 获取任务状态
   * @param taskId - 任务 ID
   * @returns 任务信息
   */
  async getTask(taskId: string): Promise<SubmitTask | null> {
    await this.ensureInitialized()
    return this.taskCache.get(taskId) || null
  }

  /**
   * 获取用户的所有失败任务
   * @param userId - 用户 ID
   * @returns 失败任务列表
   */
  async getFailedTasks(userId: number): Promise<SubmitTask[]> {
    await this.ensureInitialized()

    const failedTasks: SubmitTask[] = []
    for (const task of this.taskCache.values()) {
      if (task.userId === userId && (task.status === 'failed' || task.status === 'partial')) {
        failedTasks.push(task)
      }
    }

    // 按更新时间倒序排列
    failedTasks.sort((a, b) => b.updatedAt - a.updatedAt)
    return failedTasks
  }

  /**
   * 获取用户的所有待处理任务
   * @param userId - 用户 ID
   * @returns 待处理任务列表
   */
  async getPendingTasks(userId: number): Promise<SubmitTask[]> {
    await this.ensureInitialized()

    const pendingTasks: SubmitTask[] = []
    for (const task of this.taskCache.values()) {
      if (task.userId === userId && 
          (task.status === 'pending' || task.status === 'uploading' || task.status === 'submitting')) {
        pendingTasks.push(task)
      }
    }

    // 按创建时间排序
    pendingTasks.sort((a, b) => a.createdAt - b.createdAt)
    return pendingTasks
  }

  /**
   * 删除任务
   * @param taskId - 任务 ID
   * @returns 是否成功删除
   */
  async deleteTask(taskId: string): Promise<boolean> {
    await this.ensureInitialized()

    if (this.taskCache.has(taskId)) {
      this.taskCache.delete(taskId)
      this.markMetaDirty()
      this.log(`删除任务: ${taskId}`)
      return true
    }

    return false
  }

  /**
   * 清理过期任务
   * @returns 清理的任务数量
   */
  async cleanExpiredTasks(): Promise<number> {
    await this.ensureInitialized()

    const now = Date.now()
    const expiredTaskIds: string[] = []

    for (const [taskId, task] of this.taskCache) {
      const isExpired = (now - task.updatedAt) > this.options.taskExpiration
      // 只清理成功或过期的任务
      if (task.status === 'success' || isExpired) {
        expiredTaskIds.push(taskId)
      }
    }

    for (const taskId of expiredTaskIds) {
      this.taskCache.delete(taskId)
    }

    if (expiredTaskIds.length > 0) {
      this.markMetaDirty()
      this.log(`清理了 ${expiredTaskIds.length} 个过期任务`)
    }

    return expiredTaskIds.length
  }

  /**
   * 检查网络状态
   * @returns 网络状态
   */
  async checkNetwork(): Promise<NetworkState> {
    // H5 环境
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      this.currentNetworkState = {
        isOnline: navigator.onLine,
        networkType: navigator.onLine ? 'unknown' : 'none',
        lastCheckedAt: Date.now()
      }
    }

    // UniApp 环境
    // @ts-ignore
    if (typeof uni !== 'undefined' && uni.getNetworkType) {
      try {
        // @ts-ignore
        const res = await new Promise<{ networkType: string }>((resolve, reject) => {
          // @ts-ignore
          uni.getNetworkType({
            success: resolve,
            fail: reject
          })
        })

        this.currentNetworkState = {
          isOnline: res.networkType !== 'none',
          networkType: res.networkType as NetworkState['networkType'],
          lastCheckedAt: Date.now()
        }
      } catch (error) {
        this.log('获取网络状态失败:', error)
      }
    }

    return this.currentNetworkState
  }

  /**
   * 监听网络状态变化
   * @param callback - 状态变化回调
   * @returns 取消监听函数
   */
  onNetworkChange(callback: (state: NetworkState) => void): () => void {
    this.networkListeners.push(callback)

    // 立即通知当前状态
    callback(this.currentNetworkState)

    // 返回取消监听函数
    return () => {
      const index = this.networkListeners.indexOf(callback)
      if (index >= 0) {
        this.networkListeners.splice(index, 1)
      }
    }
  }

  /**
   * 获取已上传的图片 URL 映射
   * @param taskId - 任务 ID
   * @returns 本地路径到远程 URL 的映射
   */
  async getUploadedUrls(taskId: string): Promise<Record<string, string>> {
    await this.ensureInitialized()

    const task = this.taskCache.get(taskId)
    if (!task) {
      return {}
    }

    const urlMap: Record<string, string> = {}
    for (const image of task.images) {
      if (image.status === 'success' && image.uploadedUrl) {
        urlMap[image.localPath] = image.uploadedUrl
      }
    }

    return urlMap
  }

  /**
   * 标记图片已上传
   * @param taskId - 任务 ID
   * @param localPath - 本地路径
   * @param uploadedUrl - 远程 URL
   */
  async markImageUploaded(taskId: string, localPath: string, uploadedUrl: string): Promise<void> {
    await this.ensureInitialized()

    const task = this.taskCache.get(taskId)
    if (!task) {
      return
    }

    const image = task.images.find(img => img.localPath === localPath)
    if (image) {
      image.status = 'success'
      image.uploadedUrl = uploadedUrl
      image.uploadedAt = Date.now()
      task.updatedAt = Date.now()
      this.markMetaDirty()

      this.log(`标记图片已上传: ${localPath} -> ${uploadedUrl}`)
    }
  }
}

/**
 * 获取提交恢复管理器实例的便捷函数
 * @param options - 配置选项
 * @returns 提交恢复管理器实例
 */
export function getSubmitRecoveryManager(options?: SubmitRecoveryOptions): SubmitRecoveryManager {
  return SubmitRecoveryManager.getInstance(options)
}
