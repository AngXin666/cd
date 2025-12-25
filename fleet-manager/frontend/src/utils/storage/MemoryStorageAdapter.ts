/**
 * 内存存储适配器
 * 作为其他平台适配器不可用时的降级方案
 * 数据仅保存在内存中，页面刷新后会丢失
 * @module utils/storage/MemoryStorageAdapter
 */

import type {
  PlatformStorageAdapter,
  FileInfo,
  WriteFileOptions,
  ReadFileOptions,
  ListFilesOptions,
  StorageSpaceInfo
} from './types'
import { StorageError, StorageErrorCodes } from './types'

/**
 * 内存中存储的文件记录
 */
interface MemoryFile {
  /** 文件数据 */
  data: ArrayBuffer
  /** 文件名 */
  name: string
  /** 文件大小 */
  size: number
  /** 创建时间 */
  createdAt: number
  /** 修改时间 */
  modifiedAt: number
  /** MIME 类型 */
  mimeType: string
}

/**
 * 内存存储适配器
 * 使用 Map 在内存中存储文件数据
 * 适用于不支持持久化存储的环境，或作为降级方案
 * 
 * 注意：数据仅保存在内存中，页面刷新后会丢失
 */
export class MemoryStorageAdapter implements PlatformStorageAdapter {
  /** 平台类型标识 */
  readonly platform = 'memory' as const

  /** 文件存储 Map */
  private files: Map<string, MemoryFile> = new Map()

  /** 是否已初始化 */
  private initialized = false

  /** 最大存储大小（字节），默认 50MB */
  private readonly maxSize: number

  /** 当前已用空间 */
  private usedSize = 0

  /**
   * 构造函数
   * @param maxSizeMB - 最大存储大小（MB），默认 50MB
   */
  constructor(maxSizeMB: number = 50) {
    this.maxSize = maxSizeMB * 1024 * 1024
  }

  /**
   * 检查适配器是否可用
   * 内存存储始终可用
   * @returns 始终返回 true
   */
  isAvailable(): boolean {
    return true
  }

  /**
   * 初始化存储适配器
   * @returns 始终返回 true
   */
  async initialize(): Promise<boolean> {
    this.initialized = true
    console.log('[MemoryStorageAdapter] 初始化成功（内存存储模式）')
    console.warn('[MemoryStorageAdapter] 警告：数据仅保存在内存中，页面刷新后会丢失')
    return true
  }

  /**
   * 规范化文件路径
   * @param path - 原始路径
   * @returns 规范化后的路径
   */
  private normalizePath(path: string): string {
    let normalized = path.replace(/^\/+/, '')
    normalized = normalized.replace(/\/+$/, '')
    normalized = normalized.replace(/\/+/g, '/')
    return normalized
  }

  /**
   * 从路径中提取文件名
   * @param path - 文件路径
   * @returns 文件名
   */
  private getFileName(path: string): string {
    const parts = path.split('/')
    return parts[parts.length - 1] || ''
  }

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
    const normalizedPath = this.normalizePath(path)
    const overwrite = options?.overwrite !== false

    // 检查文件是否已存在
    if (!overwrite && this.files.has(normalizedPath)) {
      throw new StorageError(
        `文件已存在: ${normalizedPath}`,
        StorageErrorCodes.FILE_EXISTS,
        normalizedPath
      )
    }

    // 转换数据为 ArrayBuffer
    let arrayBuffer: ArrayBuffer
    if (typeof data === 'string') {
      if (options?.encoding === 'base64') {
        // Base64 解码
        const binaryString = atob(data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        arrayBuffer = bytes.buffer
      } else {
        // UTF-8 编码
        const encoder = new TextEncoder()
        arrayBuffer = encoder.encode(data).buffer
      }
    } else {
      arrayBuffer = data
    }

    // 检查存储空间
    const existingFile = this.files.get(normalizedPath)
    const existingSize = existingFile?.size || 0
    const newSize = this.usedSize - existingSize + arrayBuffer.byteLength

    if (newSize > this.maxSize) {
      throw new StorageError(
        `存储空间不足，需要 ${arrayBuffer.byteLength} 字节，可用 ${this.maxSize - this.usedSize + existingSize} 字节`,
        StorageErrorCodes.NO_SPACE,
        normalizedPath
      )
    }

    const now = Date.now()
    const file: MemoryFile = {
      data: arrayBuffer,
      name: this.getFileName(normalizedPath),
      size: arrayBuffer.byteLength,
      createdAt: existingFile?.createdAt || now,
      modifiedAt: now,
      mimeType: options?.mimeType || 'application/octet-stream'
    }

    this.files.set(normalizedPath, file)
    this.usedSize = newSize
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
    const normalizedPath = this.normalizePath(path)
    const format = options?.format || 'arraybuffer'

    const file = this.files.get(normalizedPath)
    if (!file) {
      throw new StorageError(
        `文件不存在: ${normalizedPath}`,
        StorageErrorCodes.FILE_NOT_FOUND,
        normalizedPath
      )
    }

    if (format === 'arraybuffer') {
      return file.data
    } else if (format === 'base64') {
      // 转换为 Base64
      const bytes = new Uint8Array(file.data)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      return btoa(binary)
    } else {
      // 转换为文本
      const decoder = new TextDecoder()
      return decoder.decode(file.data)
    }
  }

  /**
   * 删除文件
   * @param path - 文件路径
   */
  async deleteFile(path: string): Promise<void> {
    const normalizedPath = this.normalizePath(path)
    const file = this.files.get(normalizedPath)
    
    if (file) {
      this.usedSize -= file.size
      this.files.delete(normalizedPath)
    }
  }

  /**
   * 检查文件是否存在
   * @param path - 文件路径
   * @returns 文件是否存在
   */
  async fileExists(path: string): Promise<boolean> {
    const normalizedPath = this.normalizePath(path)
    return this.files.has(normalizedPath)
  }

  /**
   * 获取文件信息
   * @param path - 文件路径
   * @returns 文件信息
   */
  async getFileInfo(path: string): Promise<FileInfo | null> {
    const normalizedPath = this.normalizePath(path)
    const file = this.files.get(normalizedPath)
    
    if (!file) {
      return null
    }

    return {
      path: normalizedPath,
      name: file.name,
      size: file.size,
      createdAt: file.createdAt,
      modifiedAt: file.modifiedAt,
      mimeType: file.mimeType
    }
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
    const normalizedDir = this.normalizePath(directory)
    const recursive = options?.recursive !== false
    const pattern = options?.pattern

    const files: FileInfo[] = []

    for (const [path, file] of this.files) {
      // 检查文件是否在指定目录下
      let isInDirectory = false
      if (normalizedDir === '' || normalizedDir === '.') {
        isInDirectory = true
      } else if (path.startsWith(normalizedDir + '/')) {
        if (recursive) {
          isInDirectory = true
        } else {
          // 非递归模式，只匹配直接子文件
          const relativePath = path.substring(normalizedDir.length + 1)
          isInDirectory = !relativePath.includes('/')
        }
      }

      if (isInDirectory) {
        // 检查文件名模式匹配
        let matchesPattern = true
        if (pattern) {
          const regex = new RegExp(
            '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
          )
          matchesPattern = regex.test(file.name)
        }

        if (matchesPattern) {
          files.push({
            path: path,
            name: file.name,
            size: file.size,
            createdAt: file.createdAt,
            modifiedAt: file.modifiedAt,
            mimeType: file.mimeType
          })
        }
      }
    }

    return files
  }

  /**
   * 创建目录
   * 内存存储不需要显式创建目录
   * @param _path - 目录路径
   * @param _recursive - 是否递归创建
   */
  async mkdir(_path: string, _recursive?: boolean): Promise<void> {
    // 内存存储使用扁平结构，不需要显式创建目录
    return Promise.resolve()
  }

  /**
   * 删除目录
   * @param path - 目录路径
   * @param recursive - 是否递归删除
   */
  async rmdir(path: string, recursive?: boolean): Promise<void> {
    const normalizedDir = this.normalizePath(path)
    
    if (recursive !== false) {
      // 删除目录下的所有文件
      const toDelete: string[] = []
      for (const filePath of this.files.keys()) {
        if (normalizedDir === '' || filePath.startsWith(normalizedDir + '/')) {
          toDelete.push(filePath)
        }
      }
      
      for (const filePath of toDelete) {
        await this.deleteFile(filePath)
      }
    }
  }

  /**
   * 获取可用存储空间信息
   * @returns 存储空间信息
   */
  async getAvailableSpace(): Promise<StorageSpaceInfo> {
    return {
      total: this.maxSize,
      used: this.usedSize,
      available: this.maxSize - this.usedSize
    }
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
    const data = await this.readFile(sourcePath)
    const fileInfo = await this.getFileInfo(sourcePath)
    
    await this.writeFile(destPath, data as ArrayBuffer, {
      overwrite: overwrite !== false,
      mimeType: fileInfo?.mimeType
    })
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
    await this.copyFile(sourcePath, destPath, overwrite)
    await this.deleteFile(sourcePath)
  }

  /**
   * 清空所有存储数据
   */
  async clearAll(): Promise<void> {
    this.files.clear()
    this.usedSize = 0
    console.log('[MemoryStorageAdapter] 已清空所有存储数据')
  }

  /**
   * 获取当前存储的文件数量
   * @returns 文件数量
   */
  getFileCount(): number {
    return this.files.size
  }
}
