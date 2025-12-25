/**
 * 临时文件清理管理器
 * 负责清理过期的临时文件、缓存和草稿
 * 支持应用启动清理和定期清理
 * @module utils/cleanup/CleanupManager
 */

import { getStorageManager, StorageManager } from '../storage'
import { getImageCacheManager, ImageCacheManager } from '../imageCache'
import { getDraftImageStorage, DraftImageStorage } from '../draftStorage'
import type {
  ICleanupManager,
  CleanupResult,
  CleanupStats,
  CleanupOptions,
  CleanupTaskType
} from './types'
import {
  DEFAULT_CLEANUP_OPTIONS,
  CLEANUP_PATHS
} from './types'

/**
 * 临时文件清理管理器
 * 单例模式，提供统一的文件清理功能
 *
 * 功能特性：
 * - 应用启动时清理超过 24 小时的临时图片
 * - 应用进入前台时清理过期的缓存和草稿
 * - 支持手动触发完整清理
 * - 记录清理统计信息
 */
export class CleanupManager implements ICleanupManager {
  /** 单例实例 */
  private static instance: CleanupManager | null = null

  /** 存储管理器实例 */
  private storageManager: StorageManager

  /** 图片缓存管理器实例 */
  private imageCacheManager: ImageCacheManager

  /** 草稿图片存储实例 */
  private draftImageStorage: DraftImageStorage

  /** 配置选项 */
  private options: Required<CleanupOptions>

  /** 是否已初始化 */
  private initialized = false

  /** 上次清理时间戳 */
  private lastCleanupAt: number | null = null

  /** 清理统计信息 */
  private stats: CleanupStats = {
    lastCleanupAt: null,
    totalCleanups: 0,
    totalFilesCleared: 0,
    totalSpaceFreed: 0,
    results: []
  }

  /**
   * 私有构造函数（单例模式）
   * @param options - 配置选项
   */
  private constructor(options?: CleanupOptions) {
    this.options = {
      ...DEFAULT_CLEANUP_OPTIONS,
      ...options
    }
    this.storageManager = getStorageManager()
    this.imageCacheManager = getImageCacheManager()
    this.draftImageStorage = getDraftImageStorage()
  }

  /**
   * 获取清理管理器实例
   * @param options - 配置选项（仅首次调用时生效）
   * @returns 清理管理器实例
   */
  static getInstance(options?: CleanupOptions): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager(options)
    }
    return CleanupManager.instance
  }

  /**
   * 重置单例实例（主要用于测试）
   */
  static resetInstance(): void {
    if (CleanupManager.instance) {
      CleanupManager.instance.initialized = false
      CleanupManager.instance = null
    }
  }

  /**
   * 输出调试日志
   * @param message - 日志消息
   * @param args - 附加参数
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.options.debug) {
      console.log(`[CleanupManager] ${message}`, ...args)
    }
  }

  /**
   * 初始化清理管理器
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

      // 初始化图片缓存管理器
      await this.imageCacheManager.initialize()

      // 初始化草稿图片存储
      await this.draftImageStorage.initialize()

      // 确保临时文件目录存在
      await this.storageManager.mkdir(CLEANUP_PATHS.TEMP, true)

      this.initialized = true
      this.log('初始化完成')
      return true
    } catch (error) {
      console.error('[CleanupManager] 初始化失败:', error)
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
   * 检查是否需要清理
   * 基于上次清理时间和清理间隔判断
   * @returns 是否需要清理
   */
  shouldCleanup(): boolean {
    // 如果从未清理过，需要清理
    if (this.lastCleanupAt === null) {
      return true
    }

    // 检查是否超过清理间隔
    const now = Date.now()
    const elapsed = now - this.lastCleanupAt
    return elapsed >= this.options.cleanupInterval
  }

  /**
   * 执行启动清理
   * 清理超过 24 小时的临时图片
   * @returns 清理结果数组
   */
  async performLaunchCleanup(): Promise<CleanupResult[]> {
    await this.ensureInitialized()

    this.log('执行启动清理...')
    const results: CleanupResult[] = []

    // 清理临时文件（24 小时）
    const tempResult = await this.cleanTempFiles(this.options.tempMaxAge)
    results.push(tempResult)

    // 更新统计信息
    this.updateStats(results)

    this.log('启动清理完成', results)
    return results
  }

  /**
   * 执行前台清理
   * 清理过期的缓存和草稿
   * @returns 清理结果数组
   */
  async performForegroundCleanup(): Promise<CleanupResult[]> {
    await this.ensureInitialized()

    // 检查是否需要清理
    if (!this.shouldCleanup()) {
      this.log('距离上次清理时间不足，跳过清理')
      return []
    }

    this.log('执行前台清理...')
    const results: CleanupResult[] = []

    // 清理过期缓存（7 天）
    const cacheResult = await this.cleanExpiredCache(this.options.cacheMaxAge)
    results.push(cacheResult)

    // 清理过期草稿（30 天）
    const draftResult = await this.cleanExpiredDrafts(this.options.draftMaxAge)
    results.push(draftResult)

    // 更新统计信息
    this.updateStats(results)

    this.log('前台清理完成', results)
    return results
  }

  /**
   * 清理临时文件
   * @param maxAge - 最大保留时间（毫秒），默认 24 小时
   * @returns 清理结果
   */
  async cleanTempFiles(maxAge?: number): Promise<CleanupResult> {
    await this.ensureInitialized()

    const startTime = Date.now()
    const effectiveMaxAge = maxAge ?? this.options.tempMaxAge
    let cleanedCount = 0
    let freedSpace = 0

    try {
      this.log(`清理临时文件，最大保留时间: ${effectiveMaxAge}ms`)

      // 列出临时目录中的所有文件
      const files = await this.storageManager.listFiles(CLEANUP_PATHS.TEMP, {
        recursive: true
      })

      const now = Date.now()

      // 遍历并删除过期文件
      for (const file of files) {
        const fileAge = now - file.createdAt
        
        // 检查文件是否过期
        if (fileAge > effectiveMaxAge) {
          try {
            await this.storageManager.deleteFile(file.path)
            cleanedCount++
            freedSpace += file.size
            this.log(`删除临时文件: ${file.path}, 年龄: ${Math.round(fileAge / 1000 / 60)}分钟`)
          } catch (error) {
            this.log(`删除临时文件失败: ${file.path}`, error)
          }
        }
      }

      const duration = Date.now() - startTime
      this.log(`临时文件清理完成: 删除 ${cleanedCount} 个文件, 释放 ${freedSpace} 字节`)

      return {
        type: 'temp',
        success: true,
        cleanedCount,
        freedSpace,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      console.error('[CleanupManager] 清理临时文件失败:', error)
      
      return {
        type: 'temp',
        success: false,
        cleanedCount,
        freedSpace,
        error: errorMessage,
        duration
      }
    }
  }

  /**
   * 清理过期缓存
   * @param maxAge - 最大保留时间（毫秒），默认 7 天
   * @returns 清理结果
   */
  async cleanExpiredCache(maxAge?: number): Promise<CleanupResult> {
    await this.ensureInitialized()

    const startTime = Date.now()
    const effectiveMaxAge = maxAge ?? this.options.cacheMaxAge

    try {
      this.log(`清理过期缓存，最大保留时间: ${effectiveMaxAge}ms`)

      // 获取清理前的缓存大小
      const sizeBefore = await this.imageCacheManager.getCacheSize()

      // 执行缓存清理
      const cleanedCount = await this.imageCacheManager.cleanExpiredCache(effectiveMaxAge)

      // 获取清理后的缓存大小
      const sizeAfter = await this.imageCacheManager.getCacheSize()
      const freedSpace = sizeBefore - sizeAfter

      const duration = Date.now() - startTime
      this.log(`缓存清理完成: 删除 ${cleanedCount} 个文件, 释放 ${freedSpace} 字节`)

      return {
        type: 'cache',
        success: true,
        cleanedCount,
        freedSpace: Math.max(0, freedSpace),
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      console.error('[CleanupManager] 清理过期缓存失败:', error)
      
      return {
        type: 'cache',
        success: false,
        cleanedCount: 0,
        freedSpace: 0,
        error: errorMessage,
        duration
      }
    }
  }

  /**
   * 清理过期草稿
   * @param maxAge - 最大保留时间（毫秒），默认 30 天
   * @returns 清理结果
   */
  async cleanExpiredDrafts(maxAge?: number): Promise<CleanupResult> {
    await this.ensureInitialized()

    const startTime = Date.now()
    const effectiveMaxAge = maxAge ?? this.options.draftMaxAge

    try {
      this.log(`清理过期草稿，最大保留时间: ${effectiveMaxAge}ms`)

      // 执行草稿清理
      const cleanedCount = await this.draftImageStorage.cleanExpiredDrafts(effectiveMaxAge)

      const duration = Date.now() - startTime
      this.log(`草稿清理完成: 删除 ${cleanedCount} 个草稿`)

      // 草稿清理不容易计算释放的空间，设为 0
      return {
        type: 'draft',
        success: true,
        cleanedCount,
        freedSpace: 0,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      
      console.error('[CleanupManager] 清理过期草稿失败:', error)
      
      return {
        type: 'draft',
        success: false,
        cleanedCount: 0,
        freedSpace: 0,
        error: errorMessage,
        duration
      }
    }
  }

  /**
   * 执行完整清理
   * 清理所有类型的过期文件
   * @returns 清理结果数组
   */
  async performFullCleanup(): Promise<CleanupResult[]> {
    await this.ensureInitialized()

    this.log('执行完整清理...')
    const results: CleanupResult[] = []

    // 清理临时文件
    const tempResult = await this.cleanTempFiles()
    results.push(tempResult)

    // 清理过期缓存
    const cacheResult = await this.cleanExpiredCache()
    results.push(cacheResult)

    // 清理过期草稿
    const draftResult = await this.cleanExpiredDrafts()
    results.push(draftResult)

    // 更新统计信息
    this.updateStats(results)

    this.log('完整清理完成', results)
    return results
  }

  /**
   * 更新清理统计信息
   * @param results - 清理结果数组
   */
  private updateStats(results: CleanupResult[]): void {
    const now = Date.now()
    this.lastCleanupAt = now
    this.stats.lastCleanupAt = now
    this.stats.totalCleanups++

    // 累计清理数量和释放空间
    for (const result of results) {
      if (result.success) {
        this.stats.totalFilesCleared += result.cleanedCount
        this.stats.totalSpaceFreed += result.freedSpace
      }
    }

    // 保留最近的清理结果（最多 10 条）
    this.stats.results = [...results, ...this.stats.results].slice(0, 10)
  }

  /**
   * 获取清理统计信息
   * @returns 清理统计
   */
  getCleanupStats(): CleanupStats {
    return { ...this.stats }
  }
}

/**
 * 获取清理管理器实例的便捷函数
 * @param options - 配置选项
 * @returns 清理管理器实例
 */
export function getCleanupManager(options?: CleanupOptions): CleanupManager {
  return CleanupManager.getInstance(options)
}
