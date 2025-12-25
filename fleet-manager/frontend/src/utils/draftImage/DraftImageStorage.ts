/**
 * 草稿图片存储管理器
 * 提供草稿图片的本地持久化存储功能
 * 支持保存、读取、删除草稿图片，以及过期清理
 * @module utils/draftImage/DraftImageStorage
 */

import { getStorageManager, StorageManager } from '../storage'
import type {
  IDraftImageStorage,
  DraftImageMeta,
  DraftImageStorageOptions,
  SaveImageOptions,
  ReadImageOptions,
  DraftInfo
} from './types'
import {
  DEFAULT_DRAFT_OPTIONS,
  DRAFT_META_FILENAME,
  IMAGES_DIR_NAME
} from './types'

/**
 * 草稿元数据结构
 * 存储在每个草稿目录下的元数据文件中
 */
interface DraftMetaData {
  /** 草稿 ID */
  draftId: string
  /** 创建时间 */
  createdAt: number
  /** 最后修改时间 */
  modifiedAt: number
  /** 图片元数据列表 */
  images: DraftImageMeta[]
}

/**
 * 草稿图片存储管理器
 * 单例模式，提供草稿图片的本地持久化存储功能
 *
 * 功能特性：
 * - 按草稿 ID 组织图片存储
 * - 支持图片的保存、读取、删除
 * - 支持草稿过期自动清理（30天）
 * - 支持草稿提交/删除时清理关联图片
 * - 使用路径格式 /drafts/{draftId}/images/{filename}
 */
export class DraftImageStorage implements IDraftImageStorage {
  /** 单例实例 */
  private static instance: DraftImageStorage | null = null

  /** 存储管理器实例 */
  private storageManager: StorageManager

  /** 配置选项 */
  private options: Required<DraftImageStorageOptions>

  /** 是否已初始化 */
  private initialized = false

  /** 草稿元数据缓存（draftId -> 元数据） */
  private metaCache: Map<string, DraftMetaData> = new Map()

  /**
   * 私有构造函数（单例模式）
   * @param options - 配置选项
   */
  private constructor(options?: DraftImageStorageOptions) {
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
  static getInstance(options?: DraftImageStorageOptions): DraftImageStorage {
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
      DraftImageStorage.instance.metaCache.clear()
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
    return `${this.options.draftDir}/${draftId}`
  }

  /**
   * 获取草稿图片目录路径
   * @param draftId - 草稿 ID
   * @returns 图片目录路径
   */
  private getImagesDir(draftId: string): string {
    return `${this.getDraftDir(draftId)}/${IMAGES_DIR_NAME}`
  }

  /**
   * 获取草稿元数据文件路径
   * @param draftId - 草稿 ID
   * @returns 元数据文件路径
   */
  private getMetaPath(draftId: string): string {
    return `${this.getDraftDir(draftId)}/${DRAFT_META_FILENAME}`
  }

  /**
   * 获取图片文件路径
   * @param draftId - 草稿 ID
   * @param filename - 文件名
   * @returns 图片文件路径
   */
  private getImagePath(draftId: string, filename: string): string {
    return `${this.getImagesDir(draftId)}/${filename}`
  }


  /**
   * 初始化存储
   * 创建草稿根目录
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
      await this.storageManager.mkdir(this.options.draftDir, true)

      // 加载所有草稿的元数据
      await this.loadAllMeta()

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
   * 加载所有草稿的元数据
   */
  private async loadAllMeta(): Promise<void> {
    try {
      // 列出草稿根目录下的所有子目录
      const files = await this.storageManager.listFiles(this.options.draftDir)
      
      for (const file of files) {
        // 跳过非目录项（通过检查是否有元数据文件来判断）
        const metaPath = `${this.options.draftDir}/${file.name}/${DRAFT_META_FILENAME}`
        const exists = await this.storageManager.fileExists(metaPath)
        
        if (exists) {
          await this.loadDraftMeta(file.name)
        }
      }

      this.log(`加载了 ${this.metaCache.size} 个草稿的元数据`)
    } catch (error) {
      this.log('加载元数据失败:', error)
      // 目录可能不存在，忽略错误
    }
  }

  /**
   * 加载单个草稿的元数据
   * @param draftId - 草稿 ID
   */
  private async loadDraftMeta(draftId: string): Promise<DraftMetaData | null> {
    try {
      const metaPath = this.getMetaPath(draftId)
      const exists = await this.storageManager.fileExists(metaPath)
      
      if (!exists) {
        return null
      }

      const content = await this.storageManager.readFile(metaPath, { format: 'text' })
      const meta: DraftMetaData = JSON.parse(content as string)
      
      this.metaCache.set(draftId, meta)
      return meta
    } catch (error) {
      this.log(`加载草稿 ${draftId} 元数据失败:`, error)
      return null
    }
  }

  /**
   * 保存草稿元数据
   * @param draftId - 草稿 ID
   */
  private async saveDraftMeta(draftId: string): Promise<void> {
    const meta = this.metaCache.get(draftId)
    if (!meta) {
      return
    }

    try {
      const metaPath = this.getMetaPath(draftId)
      const content = JSON.stringify(meta, null, 2)
      
      await this.storageManager.writeFile(metaPath, content, {
        encoding: 'utf8',
        overwrite: true
      })
      
      this.log(`草稿 ${draftId} 元数据已保存`)
    } catch (error) {
      console.error(`[DraftImageStorage] 保存草稿 ${draftId} 元数据失败:`, error)
    }
  }

  /**
   * 获取或创建草稿元数据
   * @param draftId - 草稿 ID
   * @returns 草稿元数据
   */
  private async getOrCreateMeta(draftId: string): Promise<DraftMetaData> {
    // 先从缓存获取
    const cachedMeta = this.metaCache.get(draftId)
    if (cachedMeta) {
      return cachedMeta
    }
    
    // 尝试从文件加载
    const loadedMeta = await this.loadDraftMeta(draftId)
    if (loadedMeta) {
      return loadedMeta
    }

    // 创建新的元数据
    const now = Date.now()
    const newMeta: DraftMetaData = {
      draftId,
      createdAt: now,
      modifiedAt: now,
      images: []
    }
    this.metaCache.set(draftId, newMeta)
    return newMeta
  }

  /**
   * 将 Base64 字符串转换为 ArrayBuffer
   * @param base64 - Base64 字符串
   * @returns ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    // 移除 data URL 前缀（如果有）
    const base64Data = base64.replace(/^data:[^;]+;base64,/, '')
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * 将 ArrayBuffer 转换为 Base64 字符串
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
   * @param imageData - 图片数据（Blob、ArrayBuffer 或 Base64 字符串）
   * @param filename - 文件名
   * @param options - 保存选项
   * @returns 本地存储路径
   */
  async saveImage(
    draftId: string,
    imageData: Blob | ArrayBuffer | string,
    filename: string,
    options?: SaveImageOptions
  ): Promise<string> {
    await this.ensureInitialized()

    // 获取或创建草稿元数据
    const meta = await this.getOrCreateMeta(draftId)

    // 确保图片目录存在
    const imagesDir = this.getImagesDir(draftId)
    await this.storageManager.mkdir(imagesDir, true)

    // 获取图片路径
    const imagePath = this.getImagePath(draftId, filename)

    // 检查是否需要覆盖
    const shouldOverwrite = options?.overwrite !== false
    if (!shouldOverwrite) {
      const exists = await this.storageManager.fileExists(imagePath)
      if (exists) {
        this.log(`图片已存在，跳过: ${imagePath}`)
        return imagePath
      }
    }

    // 转换数据为 ArrayBuffer
    let arrayBuffer: ArrayBuffer
    if (imageData instanceof Blob) {
      arrayBuffer = await imageData.arrayBuffer()
    } else if (imageData instanceof ArrayBuffer) {
      arrayBuffer = imageData
    } else if (typeof imageData === 'string') {
      // Base64 字符串
      arrayBuffer = this.base64ToArrayBuffer(imageData)
    } else {
      throw new Error('不支持的图片数据类型')
    }

    // 写入文件
    await this.storageManager.writeFile(imagePath, arrayBuffer, {
      overwrite: true,
      mimeType: options?.mimeType
    })

    const size = arrayBuffer.byteLength
    const now = Date.now()

    // 更新元数据
    // 检查是否已存在该文件的元数据
    const existingIndex = meta.images.findIndex(img => img.filename === filename)
    const imageMeta: DraftImageMeta = {
      draftId,
      filename,
      localPath: imagePath,
      savedAt: now,
      size,
      mimeType: options?.mimeType,
      width: options?.width,
      height: options?.height,
      imageType: options?.imageType
    }

    if (existingIndex >= 0) {
      // 更新已存在的元数据
      meta.images[existingIndex] = imageMeta
    } else {
      // 添加新的元数据
      meta.images.push(imageMeta)
    }

    meta.modifiedAt = now

    // 保存元数据
    await this.saveDraftMeta(draftId)

    this.log(`图片已保存: ${imagePath}, 大小: ${size} bytes`)
    return imagePath
  }

  /**
   * 读取草稿图片
   * @param localPath - 本地路径
   * @param options - 读取选项
   * @returns 图片数据（Base64 或 ArrayBuffer）
   */
  async readImage(
    localPath: string,
    options?: ReadImageOptions
  ): Promise<string | ArrayBuffer> {
    await this.ensureInitialized()

    const format = options?.format || 'base64'

    if (format === 'arraybuffer') {
      return this.storageManager.readFile(localPath, { format: 'arraybuffer' }) as Promise<ArrayBuffer>
    }

    // 返回 Base64
    const data = await this.storageManager.readFile(localPath, { format: 'base64' })
    return data as string
  }

  /**
   * 删除草稿的所有图片
   * @param draftId - 草稿 ID
   * @returns 删除的图片数量
   */
  async deleteDraftImages(draftId: string): Promise<number> {
    await this.ensureInitialized()

    const meta = this.metaCache.get(draftId)
    if (!meta) {
      // 尝试加载元数据
      const loadedMeta = await this.loadDraftMeta(draftId)
      if (!loadedMeta) {
        this.log(`草稿 ${draftId} 不存在`)
        return 0
      }
    }

    const draftMeta = this.metaCache.get(draftId)!
    const imageCount = draftMeta.images.length

    try {
      // 删除整个草稿目录
      const draftDir = this.getDraftDir(draftId)
      await this.storageManager.rmdir(draftDir, true)

      // 从缓存中移除
      this.metaCache.delete(draftId)

      this.log(`草稿 ${draftId} 已删除，共 ${imageCount} 张图片`)
      return imageCount
    } catch (error) {
      console.error(`[DraftImageStorage] 删除草稿 ${draftId} 失败:`, error)
      return 0
    }
  }

  /**
   * 删除单张图片
   * @param localPath - 本地路径
   * @returns 是否成功删除
   */
  async deleteImage(localPath: string): Promise<boolean> {
    await this.ensureInitialized()

    try {
      // 从路径中提取 draftId 和 filename
      // 路径格式: drafts/{draftId}/images/{filename}
      const parts = localPath.split('/')
      if (parts.length < 4) {
        this.log(`无效的图片路径: ${localPath}`)
        return false
      }

      const draftId = parts[1]
      const filename = parts[parts.length - 1]

      // 删除文件
      await this.storageManager.deleteFile(localPath)

      // 更新元数据
      const meta = this.metaCache.get(draftId)
      if (meta) {
        const index = meta.images.findIndex(img => img.filename === filename)
        if (index >= 0) {
          meta.images.splice(index, 1)
          meta.modifiedAt = Date.now()
          await this.saveDraftMeta(draftId)
        }
      }

      this.log(`图片已删除: ${localPath}`)
      return true
    } catch (error) {
      console.error(`[DraftImageStorage] 删除图片失败: ${localPath}`, error)
      return false
    }
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

    // 先从缓存获取
    const cachedMeta = this.metaCache.get(draftId)
    if (cachedMeta) {
      return cachedMeta.images.map(img => img.localPath)
    }
    
    // 尝试从文件加载
    const loadedMeta = await this.loadDraftMeta(draftId)
    if (loadedMeta) {
      return loadedMeta.images.map(img => img.localPath)
    }

    return []
  }

  /**
   * 获取草稿的所有图片元数据
   * @param draftId - 草稿 ID
   * @returns 图片元数据数组
   */
  async getDraftImageMetas(draftId: string): Promise<DraftImageMeta[]> {
    await this.ensureInitialized()

    // 先从缓存获取
    const cachedMeta = this.metaCache.get(draftId)
    if (cachedMeta) {
      return [...cachedMeta.images]
    }
    
    // 尝试从文件加载
    const loadedMeta = await this.loadDraftMeta(draftId)
    if (loadedMeta) {
      return [...loadedMeta.images]
    }

    return []
  }


  /**
   * 获取草稿信息
   * @param draftId - 草稿 ID
   * @returns 草稿信息，不存在时返回 null
   */
  async getDraftInfo(draftId: string): Promise<DraftInfo | null> {
    await this.ensureInitialized()

    // 先从缓存获取
    let meta = this.metaCache.get(draftId)
    
    // 如果缓存中没有，尝试从文件加载
    if (!meta) {
      const loadedMeta = await this.loadDraftMeta(draftId)
      if (!loadedMeta) {
        return null
      }
      meta = loadedMeta
    }

    // 计算总大小
    const totalSize = meta.images.reduce((sum, img) => sum + img.size, 0)

    return {
      draftId: meta.draftId,
      createdAt: meta.createdAt,
      modifiedAt: meta.modifiedAt,
      imageCount: meta.images.length,
      totalSize,
      images: [...meta.images]
    }
  }

  /**
   * 获取所有草稿列表
   * @returns 草稿信息数组
   */
  async getAllDrafts(): Promise<DraftInfo[]> {
    await this.ensureInitialized()

    const drafts: DraftInfo[] = []

    for (const [draftId, meta] of this.metaCache) {
      const totalSize = meta.images.reduce((sum, img) => sum + img.size, 0)
      drafts.push({
        draftId,
        createdAt: meta.createdAt,
        modifiedAt: meta.modifiedAt,
        imageCount: meta.images.length,
        totalSize,
        images: [...meta.images]
      })
    }

    return drafts
  }

  /**
   * 清理过期草稿
   * 删除超过指定时间未修改的草稿
   * @param expirationTime - 过期时间（毫秒），不传则使用配置的默认值
   * @returns 清理的草稿数量
   */
  async cleanExpiredDrafts(expirationTime?: number): Promise<number> {
    await this.ensureInitialized()

    const effectiveExpiration = expirationTime ?? this.options.expirationTime
    const now = Date.now()
    let cleanedCount = 0

    const expiredDraftIds: string[] = []

    // 找出所有过期的草稿
    for (const [draftId, meta] of this.metaCache) {
      const isExpired = (now - meta.modifiedAt) > effectiveExpiration
      if (isExpired) {
        expiredDraftIds.push(draftId)
      }
    }

    // 删除过期草稿
    for (const draftId of expiredDraftIds) {
      const deleted = await this.deleteDraftImages(draftId)
      if (deleted > 0) {
        cleanedCount++
      }
    }

    this.log(`清理了 ${cleanedCount} 个过期草稿`)
    return cleanedCount
  }

  /**
   * 清理所有草稿
   * @returns 清理的草稿数量
   */
  async clearAllDrafts(): Promise<number> {
    await this.ensureInitialized()

    const draftIds = Array.from(this.metaCache.keys())
    let cleanedCount = 0

    for (const draftId of draftIds) {
      const deleted = await this.deleteDraftImages(draftId)
      if (deleted >= 0) {
        cleanedCount++
      }
    }

    this.log(`清理了所有 ${cleanedCount} 个草稿`)
    return cleanedCount
  }

  /**
   * 获取草稿总大小
   * @returns 总大小（字节）
   */
  async getTotalSize(): Promise<number> {
    await this.ensureInitialized()

    let totalSize = 0
    for (const meta of this.metaCache.values()) {
      for (const img of meta.images) {
        totalSize += img.size
      }
    }
    return totalSize
  }

  /**
   * 草稿提交成功后清理关联图片
   * 当草稿数据成功提交到服务器后调用此方法
   * @param draftId - 草稿 ID
   * @returns 清理的图片数量
   */
  async onDraftSubmitted(draftId: string): Promise<number> {
    this.log(`草稿 ${draftId} 提交成功，清理关联图片`)
    return this.deleteDraftImages(draftId)
  }

  /**
   * 草稿删除时清理关联图片
   * 当用户手动删除草稿时调用此方法
   * @param draftId - 草稿 ID
   * @returns 清理的图片数量
   */
  async onDraftDeleted(draftId: string): Promise<number> {
    this.log(`草稿 ${draftId} 被删除，清理关联图片`)
    return this.deleteDraftImages(draftId)
  }
}

/**
 * 获取草稿图片存储实例的便捷函数
 * @param options - 配置选项
 * @returns 草稿图片存储实例
 */
export function getDraftImageStorage(options?: DraftImageStorageOptions): DraftImageStorage {
  return DraftImageStorage.getInstance(options)
}
