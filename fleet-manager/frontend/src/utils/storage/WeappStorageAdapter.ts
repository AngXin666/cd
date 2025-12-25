/**
 * 微信小程序平台存储适配器
 * 使用 wx.getFileSystemManager 实现小程序环境下的文件存储
 * @module utils/storage/WeappStorageAdapter
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
 * 微信小程序平台存储适配器
 * 使用微信小程序的文件系统 API 实现文件存储
 * 支持文件的增删改查、目录操作等功能
 */
export class WeappStorageAdapter implements PlatformStorageAdapter {
  /** 平台类型标识 */
  readonly platform = 'weapp' as const

  /** 文件系统管理器实例 */
  private fs: WechatMiniprogram.FileSystemManager | null = null

  /** 用户文件根目录 */
  private userDataPath: string = ''

  /** 存储根目录（相对于用户目录） */
  private readonly storageRoot = 'fleet_manager'

  /** 是否已初始化 */
  private initialized = false

  /**
   * 检查适配器是否可用
   * 检测是否在微信小程序环境
   * @returns 是否可用
   */
  isAvailable(): boolean {
    // 检查是否在微信小程序环境
    // @ts-ignore - wx 是微信小程序全局对象
    return typeof wx !== 'undefined' && 
           // @ts-ignore
           typeof wx.getFileSystemManager === 'function'
  }

  /**
   * 初始化存储适配器
   * 获取文件系统管理器并创建存储根目录
   * @returns 初始化是否成功
   */
  async initialize(): Promise<boolean> {
    if (this.initialized && this.fs) {
      return true
    }

    if (!this.isAvailable()) {
      console.warn('[WeappStorageAdapter] 微信小程序文件系统不可用')
      return false
    }

    try {
      // @ts-ignore - wx 是微信小程序全局对象
      this.fs = wx.getFileSystemManager()
      // @ts-ignore - wx.env 包含环境信息
      this.userDataPath = wx.env.USER_DATA_PATH

      // 创建存储根目录
      await this.ensureDirectory(this.storageRoot)

      this.initialized = true
      console.log('[WeappStorageAdapter] 初始化成功')
      return true
    } catch (error) {
      console.error('[WeappStorageAdapter] 初始化失败:', error)
      throw new StorageError(
        '初始化微信小程序文件系统失败',
        StorageErrorCodes.INIT_FAILED
      )
    }
  }

  /**
   * 确保目录存在，不存在则创建
   * @param dirPath - 目录路径（相对于存储根目录）
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    const fullPath = this.getFullPath(dirPath)
    
    return new Promise((resolve) => {
      this.fs!.mkdir({
        dirPath: fullPath,
        recursive: true,
        success: () => resolve(),
        fail: (error) => {
          // 目录已存在不算错误
          if (error.errMsg?.includes('file already exists')) {
            resolve()
          } else {
            console.warn('[WeappStorageAdapter] 创建目录失败:', error)
            resolve() // 不抛出错误，允许继续
          }
        }
      })
    })
  }

  /**
   * 确保适配器已初始化
   * @throws {StorageError} 未初始化时抛出错误
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.fs) {
      throw new StorageError(
        '存储适配器未初始化，请先调用 initialize()',
        StorageErrorCodes.INIT_FAILED
      )
    }
  }

  /**
   * 获取完整的文件系统路径
   * @param path - 相对路径
   * @returns 完整路径
   */
  private getFullPath(path: string): string {
    const normalizedPath = this.normalizePath(path)
    if (normalizedPath.startsWith(this.userDataPath)) {
      return normalizedPath
    }
    return `${this.userDataPath}/${this.storageRoot}/${normalizedPath}`
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
    const fullPath = this.getFullPath(normalizedPath)
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

    // 确保父目录存在
    const dir = this.getDirectory(normalizedPath)
    if (dir) {
      await this.ensureDirectory(dir)
    }

    // 确定编码
    let encoding: 'binary' | 'utf8' | 'base64' = 'binary'
    if (typeof data === 'string') {
      encoding = options?.encoding === 'base64' ? 'base64' : 'utf8'
    }

    return new Promise((resolve, reject) => {
      this.fs!.writeFile({
        filePath: fullPath,
        data: data,
        encoding: encoding,
        success: () => resolve(),
        fail: (error) => {
          reject(new StorageError(
            `写入文件失败: ${normalizedPath} - ${error.errMsg}`,
            StorageErrorCodes.WRITE_FAILED,
            normalizedPath
          ))
        }
      })
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
    const fullPath = this.getFullPath(normalizedPath)
    const format = options?.format || 'arraybuffer'

    // 确定编码
    let encoding: 'binary' | 'utf8' | 'base64' | undefined
    if (format === 'base64') {
      encoding = 'base64'
    } else if (format === 'text') {
      encoding = 'utf8'
    } else {
      encoding = undefined // ArrayBuffer
    }

    return new Promise((resolve, reject) => {
      this.fs!.readFile({
        filePath: fullPath,
        encoding: encoding,
        success: (res) => {
          resolve(res.data as ArrayBuffer | string)
        },
        fail: (error) => {
          if (error.errMsg?.includes('no such file')) {
            reject(new StorageError(
              `文件不存在: ${normalizedPath}`,
              StorageErrorCodes.FILE_NOT_FOUND,
              normalizedPath
            ))
          } else {
            reject(new StorageError(
              `读取文件失败: ${normalizedPath} - ${error.errMsg}`,
              StorageErrorCodes.READ_FAILED,
              normalizedPath
            ))
          }
        }
      })
    })
  }

  /**
   * 删除文件
   * @param path - 文件路径
   */
  async deleteFile(path: string): Promise<void> {
    this.ensureInitialized()
    
    const normalizedPath = this.normalizePath(path)
    const fullPath = this.getFullPath(normalizedPath)

    return new Promise((resolve, reject) => {
      this.fs!.unlink({
        filePath: fullPath,
        success: () => resolve(),
        fail: (error) => {
          // 文件不存在不算错误
          if (error.errMsg?.includes('no such file')) {
            resolve()
          } else {
            reject(new StorageError(
              `删除文件失败: ${normalizedPath} - ${error.errMsg}`,
              StorageErrorCodes.DELETE_FAILED,
              normalizedPath
            ))
          }
        }
      })
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
    const fullPath = this.getFullPath(normalizedPath)

    return new Promise((resolve) => {
      this.fs!.access({
        path: fullPath,
        success: () => resolve(true),
        fail: () => resolve(false)
      })
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
    const fullPath = this.getFullPath(normalizedPath)

    return new Promise((resolve) => {
      this.fs!.stat({
        path: fullPath,
        success: (res) => {
          const stats = res.stats as WechatMiniprogram.Stats
          if (stats.isFile()) {
            resolve({
              path: normalizedPath,
              name: this.getFileName(normalizedPath),
              size: stats.size,
              createdAt: stats.lastAccessedTime || Date.now(),
              modifiedAt: stats.lastModifiedTime || Date.now()
            })
          } else {
            resolve(null) // 是目录，不是文件
          }
        },
        fail: () => resolve(null)
      })
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
    const fullPath = this.getFullPath(normalizedDir)
    const recursive = options?.recursive !== false
    const pattern = options?.pattern

    const files: FileInfo[] = []

    try {
      await this.listFilesRecursive(fullPath, normalizedDir, files, recursive, pattern)
    } catch (error) {
      // 目录不存在时返回空数组
      console.warn('[WeappStorageAdapter] 列出目录失败:', error)
    }

    return files
  }

  /**
   * 递归列出目录中的文件
   * @param fullPath - 完整目录路径
   * @param relativePath - 相对路径
   * @param files - 文件列表（输出参数）
   * @param recursive - 是否递归
   * @param pattern - 文件名模式
   */
  private async listFilesRecursive(
    fullPath: string,
    relativePath: string,
    files: FileInfo[],
    recursive: boolean,
    pattern?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.fs!.readdir({
        dirPath: fullPath,
        success: async (res) => {
          for (const name of res.files) {
            const itemFullPath = `${fullPath}/${name}`
            const itemRelativePath = relativePath ? `${relativePath}/${name}` : name

            // 获取文件/目录信息
            const stats = await this.getStats(itemFullPath)
            if (!stats) continue

            if (stats.isFile()) {
              // 检查文件名模式匹配
              let matchesPattern = true
              if (pattern) {
                const regex = new RegExp(
                  '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
                )
                matchesPattern = regex.test(name)
              }

              if (matchesPattern) {
                files.push({
                  path: itemRelativePath,
                  name: name,
                  size: stats.size,
                  createdAt: stats.lastAccessedTime || Date.now(),
                  modifiedAt: stats.lastModifiedTime || Date.now()
                })
              }
            } else if (stats.isDirectory() && recursive) {
              // 递归处理子目录
              await this.listFilesRecursive(
                itemFullPath,
                itemRelativePath,
                files,
                recursive,
                pattern
              )
            }
          }
          resolve()
        },
        fail: (error) => {
          // 目录不存在不算错误
          if (error.errMsg?.includes('no such file')) {
            resolve()
          } else {
            reject(error)
          }
        }
      })
    })
  }

  /**
   * 获取文件/目录状态信息
   * @param path - 完整路径
   * @returns 状态信息
   */
  private getStats(path: string): Promise<WechatMiniprogram.Stats | null> {
    return new Promise((resolve) => {
      this.fs!.stat({
        path: path,
        success: (res) => resolve(res.stats as WechatMiniprogram.Stats),
        fail: () => resolve(null)
      })
    })
  }

  /**
   * 创建目录
   * @param path - 目录路径
   * @param recursive - 是否递归创建
   */
  async mkdir(path: string, recursive?: boolean): Promise<void> {
    this.ensureInitialized()
    
    const normalizedPath = this.normalizePath(path)
    const fullPath = this.getFullPath(normalizedPath)

    return new Promise((resolve, reject) => {
      this.fs!.mkdir({
        dirPath: fullPath,
        recursive: recursive !== false,
        success: () => resolve(),
        fail: (error) => {
          // 目录已存在不算错误
          if (error.errMsg?.includes('file already exists')) {
            resolve()
          } else {
            reject(new StorageError(
              `创建目录失败: ${normalizedPath} - ${error.errMsg}`,
              StorageErrorCodes.WRITE_FAILED,
              normalizedPath
            ))
          }
        }
      })
    })
  }

  /**
   * 删除目录
   * @param path - 目录路径
   * @param recursive - 是否递归删除
   */
  async rmdir(path: string, recursive?: boolean): Promise<void> {
    this.ensureInitialized()
    
    const normalizedPath = this.normalizePath(path)
    const fullPath = this.getFullPath(normalizedPath)

    return new Promise((resolve, reject) => {
      this.fs!.rmdir({
        dirPath: fullPath,
        recursive: recursive === true,
        success: () => resolve(),
        fail: (error) => {
          // 目录不存在不算错误
          if (error.errMsg?.includes('no such file')) {
            resolve()
          } else {
            reject(new StorageError(
              `删除目录失败: ${normalizedPath} - ${error.errMsg}`,
              StorageErrorCodes.DELETE_FAILED,
              normalizedPath
            ))
          }
        }
      })
    })
  }

  /**
   * 获取可用存储空间信息
   * @returns 存储空间信息
   */
  async getAvailableSpace(): Promise<StorageSpaceInfo> {
    this.ensureInitialized()

    return new Promise((resolve) => {
      // @ts-ignore - wx.getStorageInfo 获取存储信息
      wx.getStorageInfo({
        success: (res: { currentSize: number; limitSize: number }) => {
          // 微信小程序存储限制约 200MB
          const limitBytes = res.limitSize * 1024 // KB 转 bytes
          const usedBytes = res.currentSize * 1024
          resolve({
            total: limitBytes,
            used: usedBytes,
            available: limitBytes - usedBytes
          })
        },
        fail: () => {
          resolve({
            total: -1,
            used: -1,
            available: -1
          })
        }
      })
    })
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
    this.ensureInitialized()
    
    const srcFullPath = this.getFullPath(this.normalizePath(sourcePath))
    const destFullPath = this.getFullPath(this.normalizePath(destPath))

    // 检查目标文件是否存在
    if (overwrite === false) {
      const exists = await this.fileExists(destPath)
      if (exists) {
        throw new StorageError(
          `目标文件已存在: ${destPath}`,
          StorageErrorCodes.FILE_EXISTS,
          destPath
        )
      }
    }

    // 确保目标目录存在
    const destDir = this.getDirectory(this.normalizePath(destPath))
    if (destDir) {
      await this.ensureDirectory(destDir)
    }

    return new Promise((resolve, reject) => {
      this.fs!.copyFile({
        srcPath: srcFullPath,
        destPath: destFullPath,
        success: () => resolve(),
        fail: (error) => {
          reject(new StorageError(
            `复制文件失败: ${sourcePath} -> ${destPath} - ${error.errMsg}`,
            StorageErrorCodes.WRITE_FAILED,
            destPath
          ))
        }
      })
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
    this.ensureInitialized()
    
    const srcFullPath = this.getFullPath(this.normalizePath(sourcePath))
    const destFullPath = this.getFullPath(this.normalizePath(destPath))

    // 检查目标文件是否存在
    if (overwrite === false) {
      const exists = await this.fileExists(destPath)
      if (exists) {
        throw new StorageError(
          `目标文件已存在: ${destPath}`,
          StorageErrorCodes.FILE_EXISTS,
          destPath
        )
      }
    }

    // 确保目标目录存在
    const destDir = this.getDirectory(this.normalizePath(destPath))
    if (destDir) {
      await this.ensureDirectory(destDir)
    }

    return new Promise((resolve, reject) => {
      this.fs!.rename({
        oldPath: srcFullPath,
        newPath: destFullPath,
        success: () => resolve(),
        fail: (error) => {
          reject(new StorageError(
            `移动文件失败: ${sourcePath} -> ${destPath} - ${error.errMsg}`,
            StorageErrorCodes.WRITE_FAILED,
            destPath
          ))
        }
      })
    })
  }

  /**
   * 清空所有存储数据
   */
  async clearAll(): Promise<void> {
    this.ensureInitialized()
    
    // 删除存储根目录
    await this.rmdir('', true)
    
    // 重新创建存储根目录
    await this.ensureDirectory('')
    
    console.log('[WeappStorageAdapter] 已清空所有存储数据')
  }
}
