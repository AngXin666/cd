/**
 * 存储管理器
 * 提供跨平台的统一存储接口，自动检测平台并选择合适的存储适配器
 * @module utils/storage/StorageManager
 */

import type { 
  PlatformStorageAdapter, 
  PlatformType,
  FileInfo,
  WriteFileOptions,
  ReadFileOptions,
  ListFilesOptions,
  StorageSpaceInfo
} from './types'
import { StorageError, StorageErrorCodes } from './types'
import { H5StorageAdapter } from './H5StorageAdapter'
import { WeappStorageAdapter } from './WeappStorageAdapter'
import { AppStorageAdapter } from './AppStorageAdapter'
import { MemoryStorageAdapter } from './MemoryStorageAdapter'

/**
 * 平台检测结果
 */
interface PlatformDetectionResult {
  /** 检测到的平台类型 */
  platform: PlatformType
  /** 是否为降级方案 */
  isFallback: boolean
  /** 检测说明 */
  message: string
}

/**
 * 存储管理器配置选项
 */
interface StorageManagerOptions {
  /** 是否自动初始化（默认 true） */
  autoInit?: boolean
  /** 内存缓存最大大小（MB），默认 50MB */
  memoryCacheMaxSize?: number
  /** 是否启用调试日志 */
  debug?: boolean
}

/**
 * 存储管理器
 * 单例模式，提供跨平台的统一存储接口
 * 
 * 功能：
 * - 自动检测当前运行平台
 * - 选择最合适的存储适配器
 * - 不支持时自动降级为内存缓存
 * - 提供统一的文件操作 API
 */
export class StorageManager {
  /** 单例实例 */
  private static instance: StorageManager | null = null

  /** 当前使用的存储适配器 */
  private adapter: PlatformStorageAdapter | null = null

  /** 是否已初始化 */
  private initialized = false

  /** 配置选项 */
  private options: Required<StorageManagerOptions>

  /** 平台检测结果 */
  private detectionResult: PlatformDetectionResult | null = null

  /**
   * 私有构造函数（单例模式）
   * @param options - 配置选项
   */
  private constructor(options?: StorageManagerOptions) {
    this.options = {
      autoInit: options?.autoInit !== false,
      memoryCacheMaxSize: options?.memoryCacheMaxSize || 50,
      debug: options?.debug || false
    }
  }

  /**
   * 获取存储管理器实例
   * @param options - 配置选项（仅首次调用时生效）
   * @returns 存储管理器实例
   */
  static getInstance(options?: StorageManagerOptions): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager(options)
    }
    return StorageManager.instance
  }

  /**
   * 重置单例实例（主要用于测试）
   */
  static resetInstance(): void {
    if (StorageManager.instance) {
      StorageManager.instance.adapter = null
      StorageManager.instance.initialized = false
      StorageManager.instance = null
    }
  }

  /**
   * 输出调试日志
   * @param message - 日志消息
   * @param args - 附加参数
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.options.debug) {
      console.log(`[StorageManager] ${message}`, ...args)
    }
  }

  /**
   * 检测当前运行平台
   * @returns 平台检测结果
   */
  detectPlatform(): PlatformDetectionResult {
    // 如果已经检测过，直接返回缓存结果
    if (this.detectionResult) {
      return this.detectionResult
    }

    this.log('开始检测运行平台...')

    // 1. 检测 APP 环境（UniApp plus API）
    // @ts-ignore - plus 是 UniApp APP 环境的全局对象
    if (typeof plus !== 'undefined' && typeof plus.io !== 'undefined') {
      this.log('检测到 APP 环境（plus.io 可用）')
      this.detectionResult = {
        platform: 'app',
        isFallback: false,
        message: '检测到 APP 环境，使用原生文件系统存储'
      }
      return this.detectionResult
    }

    // 2. 检测微信小程序环境
    // @ts-ignore - wx 是微信小程序全局对象
    if (typeof wx !== 'undefined' && typeof wx.getFileSystemManager === 'function') {
      this.log('检测到微信小程序环境')
      this.detectionResult = {
        platform: 'weapp',
        isFallback: false,
        message: '检测到微信小程序环境，使用小程序文件系统存储'
      }
      return this.detectionResult
    }

    // 3. 检测 H5 环境（浏览器 + IndexedDB）
    if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
      this.log('检测到 H5 环境（IndexedDB 可用）')
      this.detectionResult = {
        platform: 'h5',
        isFallback: false,
        message: '检测到 H5 环境，使用 IndexedDB 存储'
      }
      return this.detectionResult
    }

    // 4. 降级为内存存储
    this.log('未检测到支持的存储环境，降级为内存存储')
    this.detectionResult = {
      platform: 'memory',
      isFallback: true,
      message: '未检测到支持的存储环境，降级为内存存储（数据不会持久化）'
    }
    return this.detectionResult
  }

  /**
   * 创建指定平台的存储适配器
   * @param platform - 平台类型
   * @returns 存储适配器实例
   */
  private createAdapter(platform: PlatformType): PlatformStorageAdapter {
    switch (platform) {
      case 'h5':
        return new H5StorageAdapter()
      case 'weapp':
        return new WeappStorageAdapter()
      case 'app':
        return new AppStorageAdapter()
      case 'memory':
      default:
        return new MemoryStorageAdapter(this.options.memoryCacheMaxSize)
    }
  }

  /**
   * 初始化存储管理器
   * 自动检测平台并初始化对应的存储适配器
   * @returns 初始化是否成功
   */
  async initialize(): Promise<boolean> {
    if (this.initialized && this.adapter) {
      return true
    }

    // 检测平台
    const detection = this.detectPlatform()
    this.log('平台检测结果:', detection)

    // 创建适配器
    this.adapter = this.createAdapter(detection.platform)

    // 尝试初始化适配器
    try {
      const success = await this.adapter.initialize()
      if (success) {
        this.initialized = true
        this.log('存储适配器初始化成功')
        
        if (detection.isFallback) {
          console.warn('[StorageManager]', detection.message)
        }
        
        return true
      }
    } catch (error) {
      this.log('存储适配器初始化失败，尝试降级:', error)
    }

    // 初始化失败，降级为内存存储
    if (detection.platform !== 'memory') {
      this.log('降级为内存存储')
      this.adapter = new MemoryStorageAdapter(this.options.memoryCacheMaxSize)
      await this.adapter.initialize()
      this.initialized = true
      this.detectionResult = {
        platform: 'memory',
        isFallback: true,
        message: '存储初始化失败，已降级为内存存储'
      }
      console.warn('[StorageManager]', this.detectionResult.message)
      return true
    }

    return false
  }

  /**
   * 确保已初始化
   * @throws {StorageError} 未初始化时抛出错误
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized || !this.adapter) {
      if (this.options.autoInit) {
        await this.initialize()
      } else {
        throw new StorageError(
          '存储管理器未初始化，请先调用 initialize()',
          StorageErrorCodes.INIT_FAILED
        )
      }
    }
  }

  /**
   * 获取当前平台类型
   * @returns 平台类型
   */
  getPlatform(): PlatformType {
    return this.detectionResult?.platform || 'memory'
  }

  /**
   * 检查是否为降级方案
   * @returns 是否为降级方案
   */
  isFallbackMode(): boolean {
    return this.detectionResult?.isFallback || false
  }

  /**
   * 获取底层存储适配器
   * @returns 存储适配器实例
   */
  getAdapter(): PlatformStorageAdapter | null {
    return this.adapter
  }

  // ==================== 文件操作 API ====================

  /**
   * 写入文件
   * @param path - 文件路径
   * @param data - 文件数据
   * @param options - 写入选项
   */
  async writeFile(
    path: string,
    data: ArrayBuffer | string,
    options?: WriteFileOptions
  ): Promise<void> {
    await this.ensureInitialized()
    return this.adapter!.writeFile(path, data, options)
  }

  /**
   * 读取文件
   * @param path - 文件路径
   * @param options - 读取选项
   * @returns 文件数据
   */
  async readFile(
    path: string,
    options?: ReadFileOptions
  ): Promise<ArrayBuffer | string> {
    await this.ensureInitialized()
    return this.adapter!.readFile(path, options)
  }

  /**
   * 删除文件
   * @param path - 文件路径
   */
  async deleteFile(path: string): Promise<void> {
    await this.ensureInitialized()
    return this.adapter!.deleteFile(path)
  }

  /**
   * 检查文件是否存在
   * @param path - 文件路径
   * @returns 文件是否存在
   */
  async fileExists(path: string): Promise<boolean> {
    await this.ensureInitialized()
    return this.adapter!.fileExists(path)
  }

  /**
   * 获取文件信息
   * @param path - 文件路径
   * @returns 文件信息
   */
  async getFileInfo(path: string): Promise<FileInfo | null> {
    await this.ensureInitialized()
    return this.adapter!.getFileInfo(path)
  }

  /**
   * 列出目录中的文件
   * @param directory - 目录路径
   * @param options - 列出选项
   * @returns 文件信息数组
   */
  async listFiles(
    directory: string,
    options?: ListFilesOptions
  ): Promise<FileInfo[]> {
    await this.ensureInitialized()
    return this.adapter!.listFiles(directory, options)
  }

  /**
   * 创建目录
   * @param path - 目录路径
   * @param recursive - 是否递归创建
   */
  async mkdir(path: string, recursive?: boolean): Promise<void> {
    await this.ensureInitialized()
    return this.adapter!.mkdir(path, recursive)
  }

  /**
   * 删除目录
   * @param path - 目录路径
   * @param recursive - 是否递归删除
   */
  async rmdir(path: string, recursive?: boolean): Promise<void> {
    await this.ensureInitialized()
    return this.adapter!.rmdir(path, recursive)
  }

  /**
   * 获取可用存储空间信息
   * @returns 存储空间信息
   */
  async getAvailableSpace(): Promise<StorageSpaceInfo> {
    await this.ensureInitialized()
    return this.adapter!.getAvailableSpace()
  }

  /**
   * 复制文件
   * @param sourcePath - 源文件路径
   * @param destPath - 目标文件路径
   * @param overwrite - 是否覆盖
   */
  async copyFile(
    sourcePath: string,
    destPath: string,
    overwrite?: boolean
  ): Promise<void> {
    await this.ensureInitialized()
    return this.adapter!.copyFile(sourcePath, destPath, overwrite)
  }

  /**
   * 移动/重命名文件
   * @param sourcePath - 源文件路径
   * @param destPath - 目标文件路径
   * @param overwrite - 是否覆盖
   */
  async moveFile(
    sourcePath: string,
    destPath: string,
    overwrite?: boolean
  ): Promise<void> {
    await this.ensureInitialized()
    return this.adapter!.moveFile(sourcePath, destPath, overwrite)
  }

  /**
   * 清空所有存储数据
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized()
    return this.adapter!.clearAll()
  }
}

/**
 * 获取存储管理器实例的便捷函数
 * @param options - 配置选项
 * @returns 存储管理器实例
 */
export function getStorageManager(options?: StorageManagerOptions): StorageManager {
  return StorageManager.getInstance(options)
}

/**
 * 检测当前平台类型的便捷函数
 * @returns 平台类型
 */
export function detectCurrentPlatform(): PlatformType {
  const manager = StorageManager.getInstance()
  return manager.detectPlatform().platform
}
