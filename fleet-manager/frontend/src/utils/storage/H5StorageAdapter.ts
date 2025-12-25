/**
 * H5 平台存储适配器
 * 使用 IndexedDB 实现浏览器环境下的文件存储
 * @module utils/storage/H5StorageAdapter
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
 * IndexedDB 存储的文件记录结构
 */
interface StoredFile {
  /** 文件路径（主键） */
  path: string
  /** 文件数据 */
  data: ArrayBuffer
  /** 文件名 */
  name: string
  /** 文件大小（字节） */
  size: number
  /** 创建时间戳 */
  createdAt: number
  /** 修改时间戳 */
  modifiedAt: number
  /** MIME 类型 */
  mimeType: string
}

/** IndexedDB 数据库名称 */
const DB_NAME = 'fleet_manager_storage'
/** IndexedDB 数据库版本 */
const DB_VERSION = 1
/** 文件存储对象仓库名称 */
const STORE_NAME = 'files'

/**
 * H5 平台存储适配器
 * 使用 IndexedDB 在浏览器环境中存储文件数据
 * 支持文件的增删改查、目录操作等功能
 */
export class H5StorageAdapter implements PlatformStorageAdapter {
  /** 平台类型标识 */
  readonly platform = 'h5' as const

  /** IndexedDB 数据库实例 */
  private db: IDBDatabase | null = null

  /** 是否已初始化 */
  private initialized = false

  /**
   * 检查适配器是否可用
   * 检测浏览器是否支持 IndexedDB
   * @returns 是否可用
   */
  isAvailable(): boolean {
    // 检查是否在浏览器环境且支持 IndexedDB
    return typeof window !== 'undefined' && 
           typeof indexedDB !== 'undefined' &&
           indexedDB !== null
  }

  /**
   * 初始化存储适配器
   * 打开或创建 IndexedDB 数据库
   * @returns 初始化是否成功
   */
  async initialize(): Promise<boolean> {
    if (this.initialized && this.db) {
      return true
    }

    if (!this.isAvailable()) {
      console.warn('[H5StorageAdapter] IndexedDB 不可用')
      return false
    }

    try {
      this.db = await this.openDatabase()
      this.initialized = true
      console.log('[H5StorageAdapter] 初始化成功')
      return true
    } catch (error) {
      console.error('[H5StorageAdapter] 初始化失败:', error)
      throw new StorageError(
        '初始化 IndexedDB 失败',
        StorageErrorCodes.INIT_FAILED
      )
    }
  }

  /**
   * 打开 IndexedDB 数据库
   * @returns 数据库实例
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      // 数据库升级时创建对象仓库
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // 创建文件存储对象仓库
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'path' })
          // 创建索引以支持按目录查询
          store.createIndex('name', 'name', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
          store.createIndex('modifiedAt', 'modifiedAt', { unique: false })
        }
      }

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result)
      }

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error)
      }
    })
  }

  /**
   * 确保数据库已初始化
   * @throws {StorageError} 未初始化时抛出错误
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new StorageError(
        '存储适配器未初始化，请先调用 initialize()',
        StorageErrorCodes.INIT_FAILED
      )
    }
  }

  /**
   * 获取对象仓库
   * @param mode - 事务模式
   * @returns 对象仓库
   */
  private getStore(mode: IDBTransactionMode): IDBObjectStore {
    this.ensureInitialized()
    const transaction = this.db!.transaction(STORE_NAME, mode)
    return transaction.objectStore(STORE_NAME)
  }

  /**
   * 规范化文件路径
   * 移除开头的斜杠，统一路径格式
   * @param path - 原始路径
   * @returns 规范化后的路径
   */
  private normalizePath(path: string): string {
    // 移除开头的斜杠
    let normalized = path.replace(/^\/+/, '')
    // 移除结尾的斜杠
    normalized = normalized.replace(/\/+$/, '')
    // 替换多个连续斜杠为单个
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
   * 从路径中提取目录路径
   * @param path - 文件路径
   * @returns 目录路径
   */
  private getDirectory(path: string): string {
    const parts = path.split('/')
    parts.pop()
    return parts.join('/')
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
    this.ensureInitialized()
    
    const normalizedPath = this.normalizePath(path)
    const overwrite = options?.overwrite !== false

    // 检查文件是否已存在
    if (!overwrite) {
      const exists = await this.fileExists(normalizedPath)
      if (exists) {
        throw new StorageError(
          `文件已存在: ${normalizedPath}`,
          StorageErrorCodes.FILE_EXISTS,
          normalizedPath
        )
      }
    }

    // 转换数据为 ArrayBuffer
    let arrayBuffer: ArrayBuffer
    if (typeof data === 'string') {
      // 根据编码选项处理字符串数据
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

    const now = Date.now()
    const storedFile: StoredFile = {
      path: normalizedPath,
      data: arrayBuffer,
      name: this.getFileName(normalizedPath),
      size: arrayBuffer.byteLength,
      createdAt: now,
      modifiedAt: now,
      mimeType: options?.mimeType || 'application/octet-stream'
    }

    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite')
      const request = store.put(storedFile)

      request.onsuccess = () => resolve()
      request.onerror = () => {
        reject(new StorageError(
          `写入文件失败: ${normalizedPath}`,
          StorageErrorCodes.WRITE_FAILED,
          normalizedPath
        ))
      }
    })
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
    this.ensureInitialized()
    
    const normalizedPath = this.normalizePath(path)
    const format = options?.format || 'arraybuffer'

    return new Promise((resolve, reject) => {
      const store = this.getStore('readonly')
      const request = store.get(normalizedPath)

      request.onsuccess = () => {
        const result = request.result as StoredFile | undefined
        if (!result) {
          reject(new StorageError(
            `文件不存在: ${normalizedPath}`,
            StorageErrorCodes.FILE_NOT_FOUND,
            normalizedPath
          ))
          return
        }

        // 根据格式选项返回数据
        if (format === 'arraybuffer') {
          resolve(result.data)
        } else if (format === 'base64') {
          // 转换为 Base64
          const bytes = new Uint8Array(result.data)
          let binary = ''
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i])
          }
          resolve(btoa(binary))
        } else {
          // 转换为文本
          const decoder = new TextDecoder()
          resolve(decoder.decode(result.data))
        }
      }

      request.onerror = () => {
        reject(new StorageError(
          `读取文件失败: ${normalizedPath}`,
          StorageErrorCodes.READ_FAILED,
          normalizedPath
        ))
      }
    })
  }

  /**
   * 删除文件
   * @param path - 文件路径
   */
  async deleteFile(path: string): Promise<void> {
    this.ensureInitialized()
    
    const normalizedPath = this.normalizePath(path)

    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite')
      const request = store.delete(normalizedPath)

      request.onsuccess = () => resolve()
      request.onerror = () => {
        reject(new StorageError(
          `删除文件失败: ${normalizedPath}`,
          StorageErrorCodes.DELETE_FAILED,
          normalizedPath
        ))
      }
    })
  }

  /**
   * 检查文件是否存在
   * @param path - 文件路径
   * @returns 文件是否存在
   */
  async fileExists(path: string): Promise<boolean> {
    this.ensureInitialized()
    
    const normalizedPath = this.normalizePath(path)

    return new Promise((resolve) => {
      const store = this.getStore('readonly')
      const request = store.get(normalizedPath)

      request.onsuccess = () => {
        resolve(request.result !== undefined)
      }

      request.onerror = () => {
        resolve(false)
      }
    })
  }

  /**
   * 获取文件信息
   * @param path - 文件路径
   * @returns 文件信息
   */
  async getFileInfo(path: string): Promise<FileInfo | null> {
    this.ensureInitialized()
    
    const normalizedPath = this.normalizePath(path)

    return new Promise((resolve) => {
      const store = this.getStore('readonly')
      const request = store.get(normalizedPath)

      request.onsuccess = () => {
        const result = request.result as StoredFile | undefined
        if (!result) {
          resolve(null)
          return
        }

        resolve({
          path: result.path,
          name: result.name,
          size: result.size,
          createdAt: result.createdAt,
          modifiedAt: result.modifiedAt,
          mimeType: result.mimeType
        })
      }

      request.onerror = () => {
        resolve(null)
      }
    })
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
    this.ensureInitialized()
    
    const normalizedDir = this.normalizePath(directory)
    const recursive = options?.recursive !== false
    const pattern = options?.pattern

    return new Promise((resolve, reject) => {
      const store = this.getStore('readonly')
      const request = store.openCursor()
      const files: FileInfo[] = []

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          const file = cursor.value as StoredFile
          const filePath = file.path
          
          // 检查文件是否在指定目录下
          let isInDirectory = false
          if (normalizedDir === '' || normalizedDir === '.') {
            // 根目录
            isInDirectory = true
          } else if (filePath.startsWith(normalizedDir + '/')) {
            // 在指定目录下
            if (recursive) {
              isInDirectory = true
            } else {
              // 非递归模式，只匹配直接子文件
              const relativePath = filePath.substring(normalizedDir.length + 1)
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
                path: file.path,
                name: file.name,
                size: file.size,
                createdAt: file.createdAt,
                modifiedAt: file.modifiedAt,
                mimeType: file.mimeType
              })
            }
          }

          cursor.continue()
        } else {
          resolve(files)
        }
      }

      request.onerror = () => {
        reject(new StorageError(
          `列出目录失败: ${normalizedDir}`,
          StorageErrorCodes.READ_FAILED,
          normalizedDir
        ))
      }
    })
  }

  /**
   * 创建目录
   * IndexedDB 不需要显式创建目录，此方法为空实现
   * @param _path - 目录路径
   * @param _recursive - 是否递归创建
   */
  async mkdir(_path: string, _recursive?: boolean): Promise<void> {
    // IndexedDB 使用扁平的键值存储，不需要显式创建目录
    // 目录结构通过文件路径隐式表示
    return Promise.resolve()
  }

  /**
   * 删除目录
   * 删除指定目录下的所有文件
   * @param path - 目录路径
   * @param recursive - 是否递归删除
   */
  async rmdir(path: string, recursive?: boolean): Promise<void> {
    this.ensureInitialized()
    
    const normalizedDir = this.normalizePath(path)

    // 获取目录下的所有文件
    const files = await this.listFiles(normalizedDir, { recursive: recursive !== false })

    // 删除所有文件
    for (const file of files) {
      await this.deleteFile(file.path)
    }
  }

  /**
   * 获取可用存储空间信息
   * @returns 存储空间信息
   */
  async getAvailableSpace(): Promise<StorageSpaceInfo> {
    // 尝试使用 Storage API 获取配额信息
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate()
        return {
          total: estimate.quota || -1,
          used: estimate.usage || -1,
          available: (estimate.quota || 0) - (estimate.usage || 0)
        }
      } catch (error) {
        console.warn('[H5StorageAdapter] 获取存储配额失败:', error)
      }
    }

    // 无法获取时返回未知
    return {
      total: -1,
      used: -1,
      available: -1
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
    // 读取源文件
    const data = await this.readFile(sourcePath)
    const fileInfo = await this.getFileInfo(sourcePath)
    
    // 写入目标文件
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
    // 先复制
    await this.copyFile(sourcePath, destPath, overwrite)
    // 再删除源文件
    await this.deleteFile(sourcePath)
  }

  /**
   * 清空所有存储数据
   */
  async clearAll(): Promise<void> {
    this.ensureInitialized()

    return new Promise((resolve, reject) => {
      const store = this.getStore('readwrite')
      const request = store.clear()

      request.onsuccess = () => {
        console.log('[H5StorageAdapter] 已清空所有存储数据')
        resolve()
      }

      request.onerror = () => {
        reject(new StorageError(
          '清空存储失败',
          StorageErrorCodes.DELETE_FAILED
        ))
      }
    })
  }

  /**
   * 关闭数据库连接
   * 在不再需要使用存储时调用
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.initialized = false
      console.log('[H5StorageAdapter] 数据库连接已关闭')
    }
  }
}
