/**
 * 图片缓存管理器
 * 提供跨平台的图片缓存功能，支持缓存读写、过期清理和 LRU 策略
 * @module utils/imageCache/ImageCacheManager
 */

import { getStorageManager, StorageManager } from '../storage'
import type {
  IImageCacheManager,
  ImageCacheMeta,
  ImageCacheOptions,
  CacheStats,
  GetImageOptions,
  CacheImageOptions
} from './types'
import {
  DEFAULT_CACHE_OPTIONS,
  CACHE_META_FILENAME
} from './types'

/**
 * 图片缓存管理器
 * 单例模式，提供跨平台的图片缓存功能
 *
 * 功能特性：
 * - 自动检测平台并使用对应的存储适配器
 * - 支持缓存过期自动清理
 * - 支持 LRU（最近最少使用）清理策略
 * - 支持缓存统计和监控
 * - 线程安全的缓存操作
 */
export class ImageCacheManager implements IImageCacheManager {
  /** 单例实例 */
  private static instance: ImageCacheManager | null = null

  /** 存储管理器实例 */
  private storageManager: StorageManager

  /** 配置选项 */
  private options: Required<ImageCacheOptions>

  /** 是否已初始化 */
  private initialized = false

  /** 缓存元数据映射（URL -> 元数据） */
  private metaCache: Map<string, ImageCacheMeta> = new Map()

  /** 缓存命中次数 */
  private hitCount = 0

  /** 缓存未命中次数 */
  private missCount = 0

  /** 元数据是否已修改（需要持久化） */
  private metaDirty = false

  /** 元数据保存定时器 */
  private metaSaveTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 私有构造函数（单例模式）
   * @param options - 配置选项
   */
  private constructor(options?: ImageCacheOptions) {
    this.options = {
      ...DEFAULT_CACHE_OPTIONS,
      ...options
    }
    this.storageManager = getStorageManager()
  }

  /**
   * 获取图片缓存管理器实例
   * @param options - 配置选项（仅首次调用时生效）
   * @returns 图片缓存管理器实例
   */
  static getInstance(options?: ImageCacheOptions): ImageCacheManager {
    if (!ImageCacheManager.instance) {
      ImageCacheManager.instance = new ImageCacheManager(options)
    }
    return ImageCacheManager.instance
  }

  /**
   * 重置单例实例（主要用于测试）
   */
  static resetInstance(): void {
    if (ImageCacheManager.instance) {
      // 清理定时器
      if (ImageCacheManager.instance.metaSaveTimer) {
        clearTimeout(ImageCacheManager.instance.metaSaveTimer)
      }
      ImageCacheManager.instance.metaCache.clear()
      ImageCacheManager.instance.initialized = false
      ImageCacheManager.instance = null
    }
  }

  /**
   * 输出调试日志
   * @param message - 日志消息
   * @param args - 附加参数
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.options.debug) {
      console.log(`[ImageCacheManager] ${message}`, ...args)
    }
  }

  /**
   * 生成 URL 的哈希值作为文件名
   * 使用简单的哈希算法，确保相同 URL 生成相同的文件名
   * @param url - 图片 URL
   * @returns 哈希文件名
   */
  private hashUrl(url: string): string {
    // 使用简单的哈希算法
    let hash = 0
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为 32 位整数
    }
    // 转换为正数的十六进制字符串
    const hashStr = Math.abs(hash).toString(16)
    
    // 提取文件扩展名
    const ext = this.getExtensionFromUrl(url)
    
    return `${hashStr}${ext}`
  }

  /**
   * 从 URL 中提取文件扩展名
   * @param url - 图片 URL
   * @returns 文件扩展名（包含点号）
   */
  private getExtensionFromUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const lastDot = pathname.lastIndexOf('.')
      if (lastDot !== -1) {
        const ext = pathname.substring(lastDot).toLowerCase()
        // 只保留常见图片扩展名
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext)) {
          return ext
        }
      }
    } catch {
      // URL 解析失败，尝试简单匹配
      const match = url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i)
      if (match) {
        return `.${match[1].toLowerCase()}`
      }
    }
    // 默认使用 .jpg
    return '.jpg'
  }

  /**
   * 获取缓存文件的完整路径
   * @param url - 图片 URL
   * @returns 缓存文件路径
   */
  private getCachePath(url: string): string {
    const filename = this.hashUrl(url)
    return `${this.options.cacheDir}/${filename}`
  }

  /**
   * 获取元数据文件路径
   * @returns 元数据文件路径
   */
  private getMetaPath(): string {
    return `${this.options.cacheDir}/${CACHE_META_FILENAME}`
  }

  /**
   * 初始化缓存管理器
   * 创建缓存目录并加载元数据
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

      // 创建缓存目录
      await this.storageManager.mkdir(this.options.cacheDir, true)

      // 加载缓存元数据
      await this.loadMeta()

      this.initialized = true
      this.log('初始化完成')
      return true
    } catch (error) {
      console.error('[ImageCacheManager] 初始化失败:', error)
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
   * 加载缓存元数据
   */
  private async loadMeta(): Promise<void> {
    try {
      const metaPath = this.getMetaPath()
      const exists = await this.storageManager.fileExists(metaPath)
      
      if (exists) {
        const content = await this.storageManager.readFile(metaPath, { format: 'text' })
        const metaArray: ImageCacheMeta[] = JSON.parse(content as string)
        
        this.metaCache.clear()
        for (const meta of metaArray) {
          this.metaCache.set(meta.url, meta)
        }
        
        this.log(`加载了 ${this.metaCache.size} 条缓存元数据`)
      }
    } catch (error) {
      this.log('加载元数据失败，使用空缓存:', error)
      this.metaCache.clear()
    }
  }

  /**
   * 保存缓存元数据
   * 使用防抖机制，避免频繁写入
   */
  private async saveMeta(): Promise<void> {
    if (!this.metaDirty) {
      return
    }

    try {
      const metaArray = Array.from(this.metaCache.values())
      const content = JSON.stringify(metaArray, null, 2)
      
      await this.storageManager.writeFile(
        this.getMetaPath(),
        content,
        { encoding: 'utf8', overwrite: true }
      )
      
      this.metaDirty = false
      this.log('元数据已保存')
    } catch (error) {
      console.error('[ImageCacheManager] 保存元数据失败:', error)
    }
  }

  /**
   * 标记元数据需要保存（防抖）
   */
  private markMetaDirty(): void {
    this.metaDirty = true
    
    // 清除之前的定时器
    if (this.metaSaveTimer) {
      clearTimeout(this.metaSaveTimer)
    }
    
    // 延迟 1 秒保存，避免频繁写入
    this.metaSaveTimer = setTimeout(() => {
      this.saveMeta()
    }, 1000)
  }

  /**
   * 获取图片（优先从缓存读取）
   * @param url - 图片 URL
   * @param options - 获取选项
   * @returns 本地路径或 base64 数据
   */
  async getImage(url: string, options?: GetImageOptions): Promise<string> {
    await this.ensureInitialized()

    // 如果强制从网络获取，跳过缓存检查
    if (!options?.forceNetwork) {
      // 检查缓存是否存在且有效
      const meta = this.metaCache.get(url)
      if (meta) {
        const now = Date.now()
        const isExpired = (now - meta.cachedAt) > this.options.maxAge
        
        if (!isExpired) {
          // 检查文件是否存在
          const exists = await this.storageManager.fileExists(meta.localPath)
          if (exists) {
            // 更新访问信息
            meta.lastAccessedAt = now
            meta.accessCount++
            this.markMetaDirty()
            
            this.hitCount++
            this.log(`缓存命中: ${url}`)
            
            // 返回 base64 数据
            const data = await this.storageManager.readFile(meta.localPath, { format: 'base64' })
            const mimeType = meta.mimeType || 'image/jpeg'
            return `data:${mimeType};base64,${data}`
          }
        }
      }
    }

    // 缓存未命中，从网络下载
    this.missCount++
    this.log(`缓存未命中，从网络下载: ${url}`)

    try {
      const response = await this.fetchImage(url, options)
      const blob = await response.blob()
      const mimeType = response.headers.get('content-type') || 'image/jpeg'
      
      // 转换为 ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer()
      
      // 缓存图片
      await this.cacheImage(url, arrayBuffer, { mimeType })
      
      // 返回 base64 数据
      const base64 = this.arrayBufferToBase64(arrayBuffer)
      return `data:${mimeType};base64,${base64}`
    } catch (error) {
      console.error('[ImageCacheManager] 下载图片失败:', error)
      throw error
    }
  }

  /**
   * 从网络获取图片
   * @param url - 图片 URL
   * @param options - 获取选项
   * @returns Response 对象
   */
  private async fetchImage(url: string, options?: GetImageOptions): Promise<Response> {
    const controller = new AbortController()
    const timeout = options?.timeout || 30000 // 默认 30 秒超时
    
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: options?.headers
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 将 ArrayBuffer 转换为 Base64 字符串
   * @param buffer - ArrayBuffer 数据
   * @returns Base64 字符串
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * 缓存图片到本地
   * @param url - 图片 URL
   * @param data - 图片数据
   * @param options - 缓存选项
   */
  async cacheImage(
    url: string,
    data: Blob | ArrayBuffer,
    options?: CacheImageOptions
  ): Promise<void> {
    await this.ensureInitialized()

    // 检查是否需要覆盖
    if (!options?.overwrite && this.metaCache.has(url)) {
      const meta = this.metaCache.get(url)!
      const exists = await this.storageManager.fileExists(meta.localPath)
      if (exists) {
        this.log(`缓存已存在，跳过: ${url}`)
        return
      }
    }

    // 转换 Blob 为 ArrayBuffer
    let arrayBuffer: ArrayBuffer
    if (data instanceof Blob) {
      arrayBuffer = await data.arrayBuffer()
    } else {
      arrayBuffer = data
    }

    const size = arrayBuffer.byteLength
    const cachePath = this.getCachePath(url)
    const now = Date.now()

    // 检查是否需要 LRU 清理
    const currentSize = await this.getCacheSize()
    const maxSizeBytes = this.options.maxSize * 1024 * 1024
    
    if (currentSize + size > maxSizeBytes * this.options.cleanThreshold) {
      this.log('缓存空间不足，执行 LRU 清理')
      await this.performLRUCleanup(maxSizeBytes * this.options.cleanTarget)
    }

    // 写入文件
    await this.storageManager.writeFile(cachePath, arrayBuffer, {
      overwrite: true,
      mimeType: options?.mimeType
    })

    // 更新元数据
    const meta: ImageCacheMeta = {
      url,
      localPath: cachePath,
      cachedAt: now,
      size,
      lastAccessedAt: now,
      accessCount: 1,
      mimeType: options?.mimeType,
      width: options?.width,
      height: options?.height
    }

    this.metaCache.set(url, meta)
    this.markMetaDirty()

    this.log(`缓存成功: ${url}, 大小: ${size} bytes`)
  }

  /**
   * 检查缓存是否存在且未过期
   * @param url - 图片 URL
   * @returns 缓存是否有效
   */
  async hasCache(url: string): Promise<boolean> {
    await this.ensureInitialized()

    const meta = this.metaCache.get(url)
    if (!meta) {
      return false
    }

    // 检查是否过期
    const now = Date.now()
    const isExpired = (now - meta.cachedAt) > this.options.maxAge
    if (isExpired) {
      return false
    }

    // 检查文件是否存在
    return this.storageManager.fileExists(meta.localPath)
  }

  /**
   * 获取缓存元数据
   * @param url - 图片 URL
   * @returns 缓存元数据
   */
  async getCacheMeta(url: string): Promise<ImageCacheMeta | null> {
    await this.ensureInitialized()
    return this.metaCache.get(url) || null
  }

  /**
   * 清理过期缓存
   * @param maxAge - 最大缓存时间（毫秒）
   * @returns 清理的文件数量
   */
  async cleanExpiredCache(maxAge?: number): Promise<number> {
    await this.ensureInitialized()

    const effectiveMaxAge = maxAge ?? this.options.maxAge
    const now = Date.now()
    let cleanedCount = 0

    const expiredUrls: string[] = []

    // 找出所有过期的缓存
    for (const [url, meta] of this.metaCache) {
      const isExpired = (now - meta.cachedAt) > effectiveMaxAge
      if (isExpired) {
        expiredUrls.push(url)
      }
    }

    // 删除过期缓存
    for (const url of expiredUrls) {
      const meta = this.metaCache.get(url)!
      try {
        await this.storageManager.deleteFile(meta.localPath)
        this.metaCache.delete(url)
        cleanedCount++
        this.log(`清理过期缓存: ${url}`)
      } catch (error) {
        console.error(`[ImageCacheManager] 删除缓存失败: ${url}`, error)
      }
    }

    if (cleanedCount > 0) {
      this.markMetaDirty()
    }

    this.log(`清理了 ${cleanedCount} 个过期缓存`)
    return cleanedCount
  }

  /**
   * 清理所有缓存
   * @returns 清理的文件数量
   */
  async clearAllCache(): Promise<number> {
    await this.ensureInitialized()

    const count = this.metaCache.size

    // 删除所有缓存文件
    for (const meta of this.metaCache.values()) {
      try {
        await this.storageManager.deleteFile(meta.localPath)
      } catch (error) {
        // 忽略删除失败
      }
    }

    // 清空元数据
    this.metaCache.clear()
    this.hitCount = 0
    this.missCount = 0
    this.markMetaDirty()

    this.log(`清理了所有 ${count} 个缓存`)
    return count
  }

  /**
   * 获取缓存总大小
   * @returns 缓存大小（字节）
   */
  async getCacheSize(): Promise<number> {
    await this.ensureInitialized()

    let totalSize = 0
    for (const meta of this.metaCache.values()) {
      totalSize += meta.size
    }
    return totalSize
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  async getCacheStats(): Promise<CacheStats> {
    await this.ensureInitialized()

    let totalSize = 0
    let oldestTime: number | null = null
    let newestTime: number | null = null

    for (const meta of this.metaCache.values()) {
      totalSize += meta.size
      
      if (oldestTime === null || meta.cachedAt < oldestTime) {
        oldestTime = meta.cachedAt
      }
      if (newestTime === null || meta.cachedAt > newestTime) {
        newestTime = meta.cachedAt
      }
    }

    const totalRequests = this.hitCount + this.missCount
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0

    return {
      fileCount: this.metaCache.size,
      totalSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate,
      oldestCacheTime: oldestTime,
      newestCacheTime: newestTime
    }
  }

  /**
   * 删除指定 URL 的缓存
   * @param url - 图片 URL
   * @returns 是否成功删除
   */
  async removeCache(url: string): Promise<boolean> {
    await this.ensureInitialized()

    const meta = this.metaCache.get(url)
    if (!meta) {
      return false
    }

    try {
      await this.storageManager.deleteFile(meta.localPath)
      this.metaCache.delete(url)
      this.markMetaDirty()
      this.log(`删除缓存: ${url}`)
      return true
    } catch (error) {
      console.error(`[ImageCacheManager] 删除缓存失败: ${url}`, error)
      return false
    }
  }

  /**
   * 执行 LRU 清理
   * 删除最久未访问的缓存，直到缓存大小低于目标值
   * @param targetSize - 目标大小（字节）
   * @returns 清理的文件数量
   */
  async performLRUCleanup(targetSize?: number): Promise<number> {
    await this.ensureInitialized()

    const maxSizeBytes = this.options.maxSize * 1024 * 1024
    const effectiveTargetSize = targetSize ?? (maxSizeBytes * this.options.cleanTarget)
    
    let currentSize = await this.getCacheSize()
    
    if (currentSize <= effectiveTargetSize) {
      return 0
    }

    // 按最后访问时间排序（最旧的在前）
    const sortedMetas = Array.from(this.metaCache.entries())
      .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt)

    let cleanedCount = 0

    for (const [url, meta] of sortedMetas) {
      if (currentSize <= effectiveTargetSize) {
        break
      }

      try {
        await this.storageManager.deleteFile(meta.localPath)
        this.metaCache.delete(url)
        currentSize -= meta.size
        cleanedCount++
        this.log(`LRU 清理: ${url}`)
      } catch (error) {
        console.error(`[ImageCacheManager] LRU 清理失败: ${url}`, error)
      }
    }

    if (cleanedCount > 0) {
      this.markMetaDirty()
    }

    this.log(`LRU 清理了 ${cleanedCount} 个缓存，当前大小: ${currentSize} bytes`)
    return cleanedCount
  }
}

/**
 * 获取图片缓存管理器实例的便捷函数
 * @param options - 配置选项
 * @returns 图片缓存管理器实例
 */
export function getImageCacheManager(options?: ImageCacheOptions): ImageCacheManager {
  return ImageCacheManager.getInstance(options)
}

