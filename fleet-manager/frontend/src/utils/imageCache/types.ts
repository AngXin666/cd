/**
 * 图片缓存管理器类型定义
 * 定义图片缓存相关的接口和类型
 * @module utils/imageCache/types
 */

/**
 * 图片缓存元数据
 * 存储缓存图片的详细信息，用于缓存管理和 LRU 清理
 */
export interface ImageCacheMeta {
  /** 原始图片 URL */
  url: string
  /** 本地存储路径（相对于缓存根目录） */
  localPath: string
  /** 缓存时间戳（毫秒） */
  cachedAt: number
  /** 文件大小（字节） */
  size: number
  /** 最后访问时间戳（毫秒） */
  lastAccessedAt: number
  /** 访问次数 */
  accessCount: number
  /** MIME 类型 */
  mimeType?: string
  /** 图片宽度（像素） */
  width?: number
  /** 图片高度（像素） */
  height?: number
}

/**
 * 缓存配置选项
 */
export interface ImageCacheOptions {
  /** 缓存有效期（毫秒），默认 7 天 */
  maxAge?: number
  /** 最大缓存大小（MB），默认 100MB */
  maxSize?: number
  /** 缓存目录路径，默认 'cache/images' */
  cacheDir?: string
  /** 是否启用调试日志 */
  debug?: boolean
  /** LRU 清理阈值（0-1），当缓存使用率超过此值时触发清理，默认 0.9 */
  cleanThreshold?: number
  /** LRU 清理目标（0-1），清理后的目标使用率，默认 0.7 */
  cleanTarget?: number
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /** 缓存文件总数 */
  fileCount: number
  /** 缓存总大小（字节） */
  totalSize: number
  /** 命中次数 */
  hitCount: number
  /** 未命中次数 */
  missCount: number
  /** 命中率（0-1） */
  hitRate: number
  /** 最旧缓存时间 */
  oldestCacheTime: number | null
  /** 最新缓存时间 */
  newestCacheTime: number | null
}

/**
 * 获取图片选项
 */
export interface GetImageOptions {
  /** 是否强制从网络获取（忽略缓存） */
  forceNetwork?: boolean
  /** 请求超时时间（毫秒） */
  timeout?: number
  /** 自定义请求头 */
  headers?: Record<string, string>
}

/**
 * 缓存图片选项
 */
export interface CacheImageOptions {
  /** MIME 类型 */
  mimeType?: string
  /** 图片宽度 */
  width?: number
  /** 图片高度 */
  height?: number
  /** 是否覆盖已存在的缓存 */
  overwrite?: boolean
}

/**
 * 图片缓存管理器接口
 * 提供跨平台的图片缓存功能
 */
export interface IImageCacheManager {
  /**
   * 初始化缓存管理器
   * @returns 初始化是否成功
   */
  initialize(): Promise<boolean>

  /**
   * 获取图片（优先从缓存读取）
   * 如果缓存存在且未过期，返回本地路径或 base64
   * 如果缓存不存在或已过期，从网络下载并缓存
   * @param url - 图片 URL
   * @param options - 获取选项
   * @returns 本地路径或 base64 数据
   */
  getImage(url: string, options?: GetImageOptions): Promise<string>

  /**
   * 缓存图片到本地
   * @param url - 图片 URL（作为缓存键）
   * @param data - 图片数据（Blob 或 ArrayBuffer）
   * @param options - 缓存选项
   */
  cacheImage(
    url: string,
    data: Blob | ArrayBuffer,
    options?: CacheImageOptions
  ): Promise<void>

  /**
   * 检查缓存是否存在且未过期
   * @param url - 图片 URL
   * @returns 缓存是否有效
   */
  hasCache(url: string): Promise<boolean>

  /**
   * 获取缓存元数据
   * @param url - 图片 URL
   * @returns 缓存元数据，不存在时返回 null
   */
  getCacheMeta(url: string): Promise<ImageCacheMeta | null>

  /**
   * 清理过期缓存
   * @param maxAge - 最大缓存时间（毫秒），不传则使用配置的默认值
   * @returns 清理的文件数量
   */
  cleanExpiredCache(maxAge?: number): Promise<number>

  /**
   * 清理所有缓存
   * @returns 清理的文件数量
   */
  clearAllCache(): Promise<number>

  /**
   * 获取缓存总大小
   * @returns 缓存大小（字节）
   */
  getCacheSize(): Promise<number>

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  getCacheStats(): Promise<CacheStats>

  /**
   * 删除指定 URL 的缓存
   * @param url - 图片 URL
   * @returns 是否成功删除
   */
  removeCache(url: string): Promise<boolean>

  /**
   * 执行 LRU 清理
   * 当缓存空间不足时，删除最久未访问的缓存
   * @param targetSize - 目标大小（字节），清理到此大小以下
   * @returns 清理的文件数量
   */
  performLRUCleanup(targetSize?: number): Promise<number>
}

/**
 * URL 哈希函数类型
 * 用于将 URL 转换为本地文件名
 */
export type UrlHashFunction = (url: string) => string

/**
 * 默认配置常量
 */
export const DEFAULT_CACHE_OPTIONS: Required<ImageCacheOptions> = {
  /** 默认缓存有效期：7 天 */
  maxAge: 7 * 24 * 60 * 60 * 1000,
  /** 默认最大缓存大小：100MB */
  maxSize: 100,
  /** 默认缓存目录 */
  cacheDir: 'cache/images',
  /** 默认不启用调试 */
  debug: false,
  /** 默认清理阈值：90% */
  cleanThreshold: 0.9,
  /** 默认清理目标：70% */
  cleanTarget: 0.7
}

/**
 * 缓存元数据文件名
 */
export const CACHE_META_FILENAME = '_cache_meta.json'

