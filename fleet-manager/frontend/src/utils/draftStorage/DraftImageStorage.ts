/**
 * 草稿图片存储管理器
 * 管理草稿关联的本地图片，支持保存、读取、删除和清理操作
 * @module utils/draftStorage/DraftImageStorage
 */

import { getStorageManager, StorageManager } from '../storage'
import type {
  IDraftImageStorage,
  DraftImageInfo,
  DraftMeta,
  DraftStorageOptions,
  SaveImageOptions
} from './types'
import {
  DEFAULT_DRAFT_OPTIONS,
  DRAFT_META_FILENAME,
  IMAGES_META_FILENAME
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
 * 草稿图片存储管理器
 * 单例模式，提供草稿图片的持久化存储功能
 *
 * 功能特性：
 * - 按草稿 ID 组织图片存储
 * - 支持多种图片类型（行驶证、车辆照片、车损照片等）
 * - 支持断点续传（记录已上传的 URL）
 * - 支持过期草稿自动清理
 * - 支持图片元数据管理
 */
export class DraftImageStorage implements IDraftImageStorage {
  /** 单例实例 */
  private static instance: DraftImageStorage | null = null

  /** 存储管理器实例 */
  private storageManager: StorageManager

  /** 配置选项 */
  private options: Required<DraftStorageOptions>

  /** 是否已初始化 */
  private initialized = false

  /** 草稿元数据缓存（draftId -> DraftMeta） */
  private draftMetaCache: Map<string, DraftMeta> = new Map()

  /** 图片元数据缓存（localPath -> DraftImageInfo） */
  private imageMetaCache: Map<string, DraftImageInfo> = new Map()

  /** 元数据是否已修改 */
  private metaDirty = false

  /** 元数据保存定时器 */
  private metaSaveTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 私有构造函数（单例模式）
   * @param options - 配置选项
   */
  private constructor(options?: DraftStorageOptions) {
    this.options = {
      ...DEFAULT_DRAFT_OPTIONS,
      ...options
    }
    this.storageManager = getStorageManager()
  }

  /**
   * 获取草稿图片存储实例
   * @param options - 配置选项（仅首次调用时生效）
   * @returns 草稿图片存储实例
   */
  static getInstance(options?: DraftStorageOptions): DraftImageStorage {
    if (!DraftImageStorage.instance) {
      DraftImageStorage.instance = new DraftImageStorage(options)
    }
    return DraftImageStorage.instance
  }

  /**
   * 重置单例实例（主要用于测试）
   */
  static resetInstance(): void {
    if (DraftImageStorage.instance) {
      if (DraftImageStorage.instance.metaSaveTimer) {
        clearTimeout(DraftImageStorage.instance.metaSaveTimer)
      }
      DraftImageStorage.instance.draftMetaCache.clear()
      DraftImageStorage.instance.imageMetaCache.clear()
      DraftImageStorage.instance.initialized = false
      DraftImageStorage.instance = null
    }
  }

  /**
   * 输出调试日志
   * @param message - 日志消息
   * @param args - 附加参数
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.options.debug) {
      console.log(`[DraftImageStorage] ${message}`, ...args)
    }
  }

  /**
   * 获取草稿目录路径
   * @param draftId - 草稿 ID
   * @returns 草稿目录路径
   */
  private getDraftDir(draftId: string): string {
    return `${this.options.rootDir}/${draftId}`
  }

  /**
   * 获取图片目录路径
   * @param draftId - 草稿 ID
   * @returns 图片目录路径
   */
  private getImagesDir(draftId: string): string {
    return `${this.getDraftDir(draftId)}/images`
  }

  /**
   * 获取草稿元数据文件路径
   * @returns 元数据文件路径
   */
  private getDraftMetaPath(): string {
    return `${this.options.rootDir}/${DRAFT_META_FILENAME}`
  }

  /**
   * 获取图片元数据文件路径
   * @returns 元数据文件路径
   */
  private getImagesMetaPath(): string {
    return `${this.options.rootDir}/${IMAGES_META_FILENAME}`
  }

  /**
   * 初始化存储
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

      // 创建草稿根目录
      await this.storageManager.mkdir(this.options.rootDir, true)

      // 加载元数据
      await this.loadMeta()

      this.initialized = true
      this.log('初始化完成')
      return true
    } catch (error) {
      console.error('[DraftImageStorage] 初始化失败:', error)
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
   * 加载元数据
   */
  private async loadMeta(): Promise<void> {
    // 加载草稿元数据
    try {
      const draftMetaPath = this.getDraftMetaPath()
      const exists = await this.storageManager.fileExists(draftMetaPath)
      
      if (exists) {
        const content = await this.storageManager.readFile(draftMetaPath, { format: 'text' })
        const metaArray: DraftMeta[] = JSON.parse(content as string)
        
        this.draftMetaCache.clear()
        for (const meta of metaArray) {
          this.draftMetaCache.set(meta.id, meta)
        }
        
        this.log(`加载了 ${this.draftMetaCache.size} 条草稿元数据`)
      }
    } catch (error) {
      this.log('加载草稿元数据失败:', error)
      this.draftMetaCache.clear()
    }

    // 加载图片元数据
    try {
      const imagesMetaPath = this.getImagesMetaPath()
      const exists = await this.storageManager.fileExists(imagesMetaPath)
      
      if (exists) {
        const content = await this.storageManager.readFile(imagesMetaPath, { format: 'text' })
        const metaArray: DraftImageInfo[] = JSON.parse(content as string)
        
        this.imageMetaCache.clear()
        for (const meta of metaArray) {
          this.imageMetaCache.set(meta.localPath, meta)
        }
        
        this.log(`加载了 ${this.imageMetaCache.size} 条图片元数据`)
      }
    } catch (error) {
      this.log('加载图片元数据失败:', error)
      this.imageMetaCache.clear()
    }
  }

  /**
   * 保存元数据
   */
  private async saveMeta(): Promise<void> {
    if (!this.metaDirty) {
      return
    }

    try {
      // 保存草稿元数据
      const draftMetaArray = Array.from(this.draftMetaCache.values())
      const draftContent = JSON.stringify(draftMetaArray, null, 2)
      await this.storageManager.writeFile(
        this.getDraftMetaPath(),
        draftContent,
        { encoding: 'utf8', overwrite: true }
      )

      // 保存图片元数据
      const imagesMetaArray = Array.from(this.imageMetaCache.values())
      const imagesContent = JSON.stringify(imagesMetaArray, null, 2)
      await this.storageManager.writeFile(
        this.getImagesMetaPath(),
        imagesContent,
        { encoding: 'utf8', overwrite: true }
      )

      this.metaDirty = false
      this.log('元数据已保存')
    } catch (error) {
      console.error('[DraftImageStorage] 保存元数据失败:', error)
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
   * 生成图片文件名
   * @param options - 保存选项
   * @returns 文件名
   */
  private generateFilename(options: SaveImageOptions): string {
    const id = generateId()
    const ext = this.getExtensionFromMimeType(options.mimeType || 'image/jpeg')
    const prefix = options.imageType
    const indexStr = options.index !== undefined ? `_${options.index}` : ''
    return `${prefix}${indexStr}_${id}${ext}`
  }

  /**
   * 从 MIME 类型获取文件扩展名
   * @param mimeType - MIME 类型
   * @returns 文件扩展名
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/bmp': '.bmp'
    }
    return mimeToExt[mimeType.toLowerCase()] || '.jpg'
  }

  /**
   * 将数据转换为 ArrayBuffer
   * @param data - 输入数据
   * @returns ArrayBuffer
   */
  private async toArrayBuffer(data: Blob | ArrayBuffer | string): Promise<ArrayBuffer> {
    if (data instanceof ArrayBuffer) {
      return data
    }
    
    if (data instanceof Blob) {
      return data.arrayBuffer()
    }
    
    // Base64 字符串
    if (typeof data === 'string') {
      // 移除 data URL 前缀
      const base64 = data.replace(/^data:[^;]+;base64,/, '')
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes.buffer
    }
    
    throw new Error('不支持的数据类型')
  }

  /**
   * 将 ArrayBuffer 转换为 Base64
   * @param buffer - ArrayBuffer
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
   * 保存图片到草稿目录
   * @param draftId - 草稿 ID
   * @param imageData - 图片数据
   * @param options - 保存选项
   * @returns 图片信息
   */
  async saveImage(
    draftId: string,
    imageData: Blob | ArrayBuffer | string,
    options: SaveImageOptions
  ): Promise<DraftImageInfo> {
    await this.ensureInitialized()

    // 转换为 ArrayBuffer
    const arrayBuffer = await this.toArrayBuffer(imageData)
    const size = arrayBuffer.byteLength

    // 生成文件名和路径
    const filename = this.generateFilename(options)
    const imagesDir = this.getImagesDir(draftId)
    const localPath = `${imagesDir}/${filename}`

    // 创建目录
    await this.storageManager.mkdir(imagesDir, true)

    // 写入文件
    await this.storageManager.writeFile(localPath, arrayBuffer, {
      overwrite: true,
      mimeType: options.mimeType
    })

    const now = Date.now()

    // 创建图片信息
    const imageInfo: DraftImageInfo = {
      id: generateId(),
      draftId,
      imageType: options.imageType,
      localPath,
      originalFilename: options.originalFilename || filename,
      size,
      mimeType: options.mimeType || 'image/jpeg',
      createdAt: now,
      width: options.width,
      height: options.height,
      index: options.index
    }

    // 更新图片元数据缓存
    this.imageMetaCache.set(localPath, imageInfo)

    // 更新草稿元数据
    let draftMeta = this.draftMetaCache.get(draftId)
    if (!draftMeta) {
      // 创建新的草稿元数据
      draftMeta = {
        id: draftId,
        type: 'add', // 默认类型，可以后续更新
        userId: 0,   // 需要后续设置
        createdAt: now,
        updatedAt: now,
        imageIds: [],
        uploadedUrls: {}
      }
      this.draftMetaCache.set(draftId, draftMeta)
    }

    // 添加图片 ID 到草稿
    if (!draftMeta.imageIds.includes(imageInfo.id)) {
      draftMeta.imageIds.push(imageInfo.id)
      draftMeta.updatedAt = now
    }

    this.markMetaDirty()

    this.log(`保存图片成功: ${localPath}, 大小: ${size} bytes`)
    return imageInfo
  }

  /**
   * 读取草稿图片
   * @param localPath - 本地路径
   * @returns 图片数据（Base64 data URL）
   */
  async readImage(localPath: string): Promise<string> {
    await this.ensureInitialized()

    const data = await this.storageManager.readFile(localPath, { format: 'base64' })
    
    // 获取 MIME 类型
    const imageInfo = this.imageMetaCache.get(localPath)
    const mimeType = imageInfo?.mimeType || 'image/jpeg'
    
    return `data:${mimeType};base64,${data}`
  }

  /**
   * 删除草稿的所有图片
   * @param draftId - 草稿 ID
   * @returns 删除的图片数量
   */
  async deleteDraftImages(draftId: string): Promise<number> {
    await this.ensureInitialized()

    let deletedCount = 0
    const imagesDir = this.getImagesDir(draftId)

    // 找出该草稿的所有图片
    const imagesToDelete: string[] = []
    for (const [path, info] of this.imageMetaCache) {
      if (info.draftId === draftId) {
        imagesToDelete.push(path)
      }
    }

    // 删除图片文件和元数据
    for (const path of imagesToDelete) {
      try {
        await this.storageManager.deleteFile(path)
        this.imageMetaCache.delete(path)
        deletedCount++
      } catch (error) {
        this.log(`删除图片失败: ${path}`, error)
      }
    }

    // 尝试删除图片目录
    try {
      await this.storageManager.rmdir(imagesDir, true)
    } catch {
      // 忽略目录删除失败
    }

    // 更新草稿元数据
    const draftMeta = this.draftMetaCache.get(draftId)
    if (draftMeta) {
      draftMeta.imageIds = []
      draftMeta.updatedAt = Date.now()
    }

    if (deletedCount > 0) {
      this.markMetaDirty()
    }

    this.log(`删除草稿 ${draftId} 的 ${deletedCount} 张图片`)
    return deletedCount
  }

  /**
   * 检查图片是否存在
   * @param localPath - 本地路径
   * @returns 图片是否存在
   */
  async imageExists(localPath: string): Promise<boolean> {
    await this.ensureInitialized()
    return this.storageManager.fileExists(localPath)
  }

  /**
   * 获取草稿的所有图片路径
   * @param draftId - 草稿 ID
   * @returns 图片路径数组
   */
  async getDraftImagePaths(draftId: string): Promise<string[]> {
    await this.ensureInitialized()

    const paths: string[] = []
    for (const [path, info] of this.imageMetaCache) {
      if (info.draftId === draftId) {
        paths.push(path)
      }
    }

    // 按索引排序
    paths.sort((a, b) => {
      const infoA = this.imageMetaCache.get(a)
      const infoB = this.imageMetaCache.get(b)
      const indexA = infoA?.index ?? 999
      const indexB = infoB?.index ?? 999
      return indexA - indexB
    })

    return paths
  }

  /**
   * 获取草稿的所有图片信息
   * @param draftId - 草稿 ID
   * @returns 图片信息数组
   */
  async getDraftImages(draftId: string): Promise<DraftImageInfo[]> {
    await this.ensureInitialized()

    const images: DraftImageInfo[] = []
    for (const info of this.imageMetaCache.values()) {
      if (info.draftId === draftId) {
        images.push(info)
      }
    }

    // 按索引排序
    images.sort((a, b) => {
      const indexA = a.index ?? 999
      const indexB = b.index ?? 999
      return indexA - indexB
    })

    return images
  }

  /**
   * 删除单张图片
   * @param localPath - 本地路径
   * @returns 是否成功删除
   */
  async deleteImage(localPath: string): Promise<boolean> {
    await this.ensureInitialized()

    const imageInfo = this.imageMetaCache.get(localPath)
    if (!imageInfo) {
      return false
    }

    try {
      await this.storageManager.deleteFile(localPath)
      this.imageMetaCache.delete(localPath)

      // 从草稿元数据中移除
      const draftMeta = this.draftMetaCache.get(imageInfo.draftId)
      if (draftMeta) {
        draftMeta.imageIds = draftMeta.imageIds.filter(id => id !== imageInfo.id)
        draftMeta.updatedAt = Date.now()
        // 移除已上传的 URL
        delete draftMeta.uploadedUrls[localPath]
      }

      this.markMetaDirty()
      this.log(`删除图片: ${localPath}`)
      return true
    } catch (error) {
      console.error(`[DraftImageStorage] 删除图片失败: ${localPath}`, error)
      return false
    }
  }

  /**
   * 获取图片信息
   * @param localPath - 本地路径
   * @returns 图片信息
   */
  async getImageInfo(localPath: string): Promise<DraftImageInfo | null> {
    await this.ensureInitialized()
    return this.imageMetaCache.get(localPath) || null
  }

  /**
   * 更新图片的上传状态
   * @param localPath - 本地路径
   * @param uploadedUrl - 已上传的 URL
   */
  async markImageUploaded(localPath: string, uploadedUrl: string): Promise<void> {
    await this.ensureInitialized()

    const imageInfo = this.imageMetaCache.get(localPath)
    if (imageInfo) {
      imageInfo.uploadedUrl = uploadedUrl
      imageInfo.uploadedAt = Date.now()

      // 更新草稿元数据中的已上传 URL 映射
      const draftMeta = this.draftMetaCache.get(imageInfo.draftId)
      if (draftMeta) {
        draftMeta.uploadedUrls[localPath] = uploadedUrl
        draftMeta.updatedAt = Date.now()
      }

      this.markMetaDirty()
      this.log(`标记图片已上传: ${localPath} -> ${uploadedUrl}`)
    }
  }

  /**
   * 清理过期草稿
   * @param maxAge - 最大保留时间（毫秒）
   * @returns 清理的草稿数量
   */
  async cleanExpiredDrafts(maxAge?: number): Promise<number> {
    await this.ensureInitialized()

    const effectiveMaxAge = maxAge ?? this.options.maxAge
    const now = Date.now()
    let cleanedCount = 0

    const expiredDraftIds: string[] = []

    // 找出所有过期的草稿
    for (const [draftId, meta] of this.draftMetaCache) {
      const isExpired = (now - meta.updatedAt) > effectiveMaxAge
      if (isExpired) {
        expiredDraftIds.push(draftId)
      }
    }

    // 删除过期草稿
    for (const draftId of expiredDraftIds) {
      const success = await this.deleteDraft(draftId)
      if (success) {
        cleanedCount++
      }
    }

    this.log(`清理了 ${cleanedCount} 个过期草稿`)
    return cleanedCount
  }

  /**
   * 获取所有草稿 ID 列表
   * @returns 草稿 ID 数组
   */
  async getAllDraftIds(): Promise<string[]> {
    await this.ensureInitialized()
    return Array.from(this.draftMetaCache.keys())
  }

  /**
   * 获取草稿元数据
   * @param draftId - 草稿 ID
   * @returns 草稿元数据
   */
  async getDraftMeta(draftId: string): Promise<DraftMeta | null> {
    await this.ensureInitialized()
    return this.draftMetaCache.get(draftId) || null
  }

  /**
   * 创建或更新草稿元数据
   * @param meta - 草稿元数据
   */
  async saveDraftMeta(meta: DraftMeta): Promise<void> {
    await this.ensureInitialized()

    meta.updatedAt = Date.now()
    this.draftMetaCache.set(meta.id, meta)
    this.markMetaDirty()

    this.log(`保存草稿元数据: ${meta.id}`)
  }

  /**
   * 删除草稿（包括元数据和所有图片）
   * @param draftId - 草稿 ID
   * @returns 是否成功删除
   */
  async deleteDraft(draftId: string): Promise<boolean> {
    await this.ensureInitialized()

    try {
      // 删除所有图片
      await this.deleteDraftImages(draftId)

      // 删除草稿目录
      const draftDir = this.getDraftDir(draftId)
      try {
        await this.storageManager.rmdir(draftDir, true)
      } catch {
        // 忽略目录删除失败
      }

      // 删除草稿元数据
      this.draftMetaCache.delete(draftId)
      this.markMetaDirty()

      this.log(`删除草稿: ${draftId}`)
      return true
    } catch (error) {
      console.error(`[DraftImageStorage] 删除草稿失败: ${draftId}`, error)
      return false
    }
  }
}

/**
 * 获取草稿图片存储实例的便捷函数
 * @param options - 配置选项
 * @returns 草稿图片存储实例
 */
export function getDraftImageStorage(options?: DraftStorageOptions): DraftImageStorage {
  return DraftImageStorage.getInstance(options)
}
