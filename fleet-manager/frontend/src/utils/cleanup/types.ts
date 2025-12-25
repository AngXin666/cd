/**
 * 临时文件清理管理器类型定义
 * 定义清理任务相关的接口和类型
 * @module utils/cleanup/types
 */

/**
 * 清理任务类型
 * - temp: 临时文件清理
 * - cache: 缓存清理
 * - draft: 草稿清理
 */
export type CleanupTaskType = 'temp' | 'cache' | 'draft'

/**
 * 清理结果
 * 描述单次清理操作的结果
 */
export interface CleanupResult {
  /** 清理任务类型 */
  type: CleanupTaskType
  /** 是否成功 */
  success: boolean
  /** 清理的文件/项目数量 */
  cleanedCount: number
  /** 释放的空间（字节） */
  freedSpace: number
  /** 错误信息（如果失败） */
  error?: string
  /** 清理耗时（毫秒） */
  duration: number
}

/**
 * 清理统计信息
 * 汇总所有清理任务的结果
 */
export interface CleanupStats {
  /** 最后清理时间戳（毫秒） */
  lastCleanupAt: number | null
  /** 总清理次数 */
  totalCleanups: number
  /** 总清理文件数 */
  totalFilesCleared: number
  /** 总释放空间（字节） */
  totalSpaceFreed: number
  /** 各类型清理结果 */
  results: CleanupResult[]
}

/**
 * 清理配置选项
 */
export interface CleanupOptions {
  /** 临时文件最大保留时间（毫秒），默认 24 小时 */
  tempMaxAge?: number
  /** 缓存最大保留时间（毫秒），默认 7 天 */
  cacheMaxAge?: number
  /** 草稿最大保留时间（毫秒），默认 30 天 */
  draftMaxAge?: number
  /** 是否启用调试日志 */
  debug?: boolean
  /** 是否在启动时自动清理 */
  autoCleanOnLaunch?: boolean
  /** 是否在进入前台时自动清理 */
  autoCleanOnShow?: boolean
  /** 清理间隔（毫秒），避免频繁清理，默认 1 小时 */
  cleanupInterval?: number
}

/**
 * 清理管理器接口
 */
export interface ICleanupManager {
  /**
   * 初始化清理管理器
   * @returns 初始化是否成功
   */
  initialize(): Promise<boolean>

  /**
   * 执行启动清理
   * 清理超过 24 小时的临时图片
   * @returns 清理结果
   */
  performLaunchCleanup(): Promise<CleanupResult[]>

  /**
   * 执行前台清理
   * 清理过期的缓存和草稿
   * @returns 清理结果
   */
  performForegroundCleanup(): Promise<CleanupResult[]>

  /**
   * 清理临时文件
   * @param maxAge - 最大保留时间（毫秒）
   * @returns 清理结果
   */
  cleanTempFiles(maxAge?: number): Promise<CleanupResult>

  /**
   * 清理过期缓存
   * @param maxAge - 最大保留时间（毫秒）
   * @returns 清理结果
   */
  cleanExpiredCache(maxAge?: number): Promise<CleanupResult>

  /**
   * 清理过期草稿
   * @param maxAge - 最大保留时间（毫秒）
   * @returns 清理结果
   */
  cleanExpiredDrafts(maxAge?: number): Promise<CleanupResult>

  /**
   * 执行完整清理
   * 清理所有类型的过期文件
   * @returns 清理结果数组
   */
  performFullCleanup(): Promise<CleanupResult[]>

  /**
   * 获取清理统计信息
   * @returns 清理统计
   */
  getCleanupStats(): CleanupStats

  /**
   * 检查是否需要清理
   * 基于上次清理时间和清理间隔判断
   * @returns 是否需要清理
   */
  shouldCleanup(): boolean
}

/**
 * 默认配置常量
 */
export const DEFAULT_CLEANUP_OPTIONS: Required<CleanupOptions> = {
  /** 临时文件最大保留时间：24 小时 */
  tempMaxAge: 24 * 60 * 60 * 1000,
  /** 缓存最大保留时间：7 天 */
  cacheMaxAge: 7 * 24 * 60 * 60 * 1000,
  /** 草稿最大保留时间：30 天 */
  draftMaxAge: 30 * 24 * 60 * 60 * 1000,
  /** 默认不启用调试 */
  debug: false,
  /** 默认启动时自动清理 */
  autoCleanOnLaunch: true,
  /** 默认进入前台时自动清理 */
  autoCleanOnShow: true,
  /** 默认清理间隔：1 小时 */
  cleanupInterval: 60 * 60 * 1000
}

/**
 * 存储路径常量
 */
export const CLEANUP_PATHS = {
  /** 临时文件目录 */
  TEMP: 'temp/images',
  /** 缓存目录 */
  CACHE: 'cache/images',
  /** 草稿目录 */
  DRAFTS: 'drafts'
} as const
