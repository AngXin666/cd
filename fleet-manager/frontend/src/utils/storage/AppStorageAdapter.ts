/**
 * APP 平台存储适配器
 * 使用 UniApp 的 plus API 实现 APP 环境下的文件存储
 * 支持 Android 和 iOS 原生文件系统操作
 * @module utils/storage/AppStorageAdapter
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
 * APP 平台存储适配器
 * 使用 UniApp 的 plus.io API 在 APP 环境中存储文件
 * 支持文件的增删改查、目录操作等功能
 */
export class AppStorageAdapter implements PlatformStorageAdapter {
  /** 平台类型标识 */
  readonly platform = 'app' as const

  /** 存储根目录（相对于应用私有目录） */
  private readonly storageRoot = 'fleet_manager'

  /** 应用私有目录路径 */
  private basePath: string = ''

  /** 是否已初始化 */
  private initialized = false

  /**
   * 检查适配器是否可用
   * 检测是否在 APP 环境（plus API 可用）
   * @returns 是否可用
   */
  isAvailable(): boolean {
    // 检查是否在 APP 环境（plus API 可用）
    // @ts-ignore - plus 是 UniApp APP 环境的全局对象
    return typeof plus !== 'undefined' && 
           // @ts-ignore
           typeof plus.io !== 'undefined'
  }

  /**
   * 初始化存储适配器
   * 获取应用私有目录并创建存储根目录
   * @returns 初始化是否成功
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true
    }

    if (!this.isAvailable()) {
      console.warn('[AppStorageAdapter] plus.io API 不可用')
      return false
    }

    try {
      // 获取应用私有目录
      // @ts-ignore - plus.io.PRIVATE_DOC 是应用私有文档目录
      this.basePath = plus.io.convertLocalFileSystemURL('_doc/')
      
      // 创建存储根目录
      await this.ensureDirectory(this.storageRoot)

      this.initialized = true
      console.log('[AppStorageAdapter] 初始化成功，基础路径:', this.basePath)
      return true
    } catch (error) {
      console.error('[AppStorageAdapter] 初始化失败:', error)
      throw new StorageError(
        '初始化 APP 文件系统失败',
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
    
    return new Promise((resolve, reject) => {
      // @ts-ignore - plus.io.resolveLocalFileSystemURL 解析本地文件系统 URL
      plus.io.resolveLocalFileSystemURL(
        fullPath,
        () => {
          // 目录已存在
          resolve()
        },
        () => {
          // 目录不存在，创建它
          this.createDirectoryRecursive(fullPath)
            .then(resolve)
            .catch(reject)
        }
      )
    })
  }

  /**
   * 递归创建目录
   * @param fullPath - 完整目录路径
   */
  private async createDirectoryRecursive(fullPath: string): Promise<void> {
    const parts = fullPath.replace(this.basePath, '').split('/').filter(p => p)
    let currentPath = this.basePath

    for (const part of parts) {
      currentPath = currentPath.endsWith('/') 
        ? `${currentPath}${part}` 
        : `${currentPath}/${part}`
      
      await this.createSingleDirectory(currentPath)
    }
  }

  /**
   * 创建单个目录
   * @param path - 目录路径
   */
  private createSingleDirectory(path: string): Promise<void> {
    return new Promise((resolve) => {
      // @ts-ignore
      plus.io.resolveLocalFileSystemURL(
        path,
        () => resolve(), // 已存在
        () => {
          // 获取父目录并创建
          const parentPath = path.substring(0, path.lastIndexOf('/'))
          const dirName = path.substring(path.lastIndexOf('/') + 1)
          
          // @ts-ignore
          plus.io.resolveLocalFileSystemURL(
            parentPath,
            (parentEntry: any) => {
              parentEntry.getDirectory(
                dirName,
                { create: true },
                () => resolve(),
                () => resolve() // 创建失败也继续
              )
            },
            () => resolve() // 父目录不存在也继续
          )
        }
      )
    })
  }

  /**
   * 确保适配器已初始化
   * @throws {StorageError} 未初始化时抛出错误
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
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
    if (normalizedPath.startsWith(this.basePath)) {
      return normalizedPath
    }
    const base = this.basePath.endsWith('/') ? this.basePath : `${this.basePath}/`
    return `${base}${this.storageRoot}/${normalizedPath}`
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

    return new Promise((resolve, reject) => {
      // @ts-ignore - plus.io.requestFileSystem 请求文件系统
      plus.io.requestFileSystem(
        // @ts-ignore - plus.io.PRIVATE_DOC 私有文档目录
        plus.io.PRIVATE_DOC,
        (fs: any) => {
          // 获取或创建文件
          const relativePath = fullPath.replace(this.basePath, '')
          fs.root.getFile(
            relativePath,
            { create: true },
            (fileEntry: any) => {
              fileEntry.createWriter(
                (writer: any) => {
                  writer.onwrite = () => resolve()
                  writer.onerror = (e: any) => {
                    reject(new StorageError(
                      `写入文件失败: ${normalizedPath} - ${e.message}`,
                      StorageErrorCodes.WRITE_FAILED,
                      normalizedPath
                    ))
                  }

                  // 处理数据
                  if (typeof data === 'string') {
                    if (options?.encoding === 'base64') {
                      // Base64 数据
                      writer.write(data)
                    } else {
                      // UTF-8 文本
                      writer.write(data)
                    }
                  } else {
                    // ArrayBuffer 转 Base64
                    const bytes = new Uint8Array(data)
                    let binary = ''
                    for (let i = 0; i < bytes.byteLength; i++) {
                      binary += String.fromCharCode(bytes[i])
                    }
                    const base64 = btoa(binary)
                    writer.write(base64)
                  }
                },
                (e: any) => {
                  reject(new StorageError(
                    `创建文件写入器失败: ${normalizedPath} - ${e.message}`,
                    StorageErrorCodes.WRITE_FAILED,
                    normalizedPath
                  ))
                }
              )
            },
            (e: any) => {
              reject(new StorageError(
                `获取文件失败: ${normalizedPath} - ${e.message}`,
                StorageErrorCodes.WRITE_FAILED,
                normalizedPath
              ))
            }
          )
        },
        (e: any) => {
          reject(new StorageError(
            `请求文件系统失败: ${e.message}`,
            StorageErrorCodes.WRITE_FAILED,
            normalizedPath
          ))
        }
      )
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

    return new Promise((resolve, reject) => {
      // @ts-ignore
      plus.io.resolveLocalFileSystemURL(
        fullPath,
        (entry: any) => {
          entry.file(
            (file: any) => {
              // @ts-ignore - plus.io.FileReader 文件读取器
              const reader = new plus.io.FileReader()
              
              reader.onloadend = (e: any) => {
                const result = e.target.result
                
                if (format === 'arraybuffer') {
                  // 如果是 Base64，转换为 ArrayBuffer
                  if (typeof result === 'string' && result.includes('base64,')) {
                    const base64 = result.split('base64,')[1]
                    const binaryString = atob(base64)
                    const bytes = new Uint8Array(binaryString.length)
                    for (let i = 0; i < binaryString.length; i++) {
                      bytes[i] = binaryString.charCodeAt(i)
                    }
                    resolve(bytes.buffer)
                  } else {
                    resolve(result)
                  }
                } else if (format === 'base64') {
                  if (typeof result === 'string' && result.includes('base64,')) {
                    resolve(result.split('base64,')[1])
                  } else {
                    resolve(result)
                  }
                } else {
                  // text 格式
                  resolve(result)
                }
              }
              
              reader.onerror = () => {
                reject(new StorageError(
                  `读取文件失败: ${normalizedPath}`,
                  StorageErrorCodes.READ_FAILED,
                  normalizedPath
                ))
              }

              if (format === 'text') {
                reader.readAsText(file)
              } else {
                reader.readAsDataURL(file)
              }
            },
            (e: any) => {
              reject(new StorageError(
                `获取文件对象失败: ${normalizedPath} - ${e.message}`,
                StorageErrorCodes.READ_FAILED,
                normalizedPath
              ))
            }
          )
        },
        () => {
          reject(new StorageError(
            `文件不存在: ${normalizedPath}`,
            StorageErrorCodes.FILE_NOT_FOUND,
            normalizedPath
          ))
        }
      )
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
      // @ts-ignore
      plus.io.resolveLocalFileSystemURL(
        fullPath,
        (entry: any) => {
          entry.remove(
            () => resolve(),
            (e: any) => {
              reject(new StorageError(
                `删除文件失败: ${normalizedPath} - ${e.message}`,
                StorageErrorCodes.DELETE_FAILED,
                normalizedPath
              ))
            }
          )
        },
        () => {
          // 文件不存在，视为删除成功
          resolve()
        }
      )
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
      // @ts-ignore
      plus.io.resolveLocalFileSystemURL(
        fullPath,
        (entry: any) => {
          resolve(entry.isFile)
        },
        () => {
          resolve(false)
        }
      )
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
      // @ts-ignore
      plus.io.resolveLocalFileSystemURL(
        fullPath,
        (entry: any) => {
          if (!entry.isFile) {
            resolve(null)
            return
          }

          entry.getMetadata(
            (metadata: any) => {
              resolve({
                path: normalizedPath,
                name: entry.name,
                size: metadata.size || 0,
                createdAt: metadata.modificationTime?.getTime() || Date.now(),
                modifiedAt: metadata.modificationTime?.getTime() || Date.now()
              })
            },
            () => {
              // 无法获取元数据，返回基本信息
              resolve({
                path: normalizedPath,
                name: entry.name,
                size: 0,
                createdAt: Date.now(),
                modifiedAt: Date.now()
              })
            }
          )
        },
        () => {
          resolve(null)
        }
      )
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
      console.warn('[AppStorageAdapter] 列出目录失败:', error)
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
    return new Promise((resolve) => {
      // @ts-ignore
      plus.io.resolveLocalFileSystemURL(
        fullPath,
        (entry: any) => {
          if (!entry.isDirectory) {
            resolve()
            return
          }

          const reader = entry.createReader()
          reader.readEntries(
            async (entries: any[]) => {
              for (const item of entries) {
                const itemRelativePath = relativePath 
                  ? `${relativePath}/${item.name}` 
                  : item.name

                if (item.isFile) {
                  // 检查文件名模式匹配
                  let matchesPattern = true
                  if (pattern) {
                    const regex = new RegExp(
                      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
                    )
                    matchesPattern = regex.test(item.name)
                  }

                  if (matchesPattern) {
                    const fileInfo = await this.getFileInfo(itemRelativePath)
                    if (fileInfo) {
                      files.push(fileInfo)
                    }
                  }
                } else if (item.isDirectory && recursive) {
                  const itemFullPath = fullPath.endsWith('/')
                    ? `${fullPath}${item.name}`
                    : `${fullPath}/${item.name}`
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
            () => resolve()
          )
        },
        () => resolve()
      )
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
    
    if (recursive !== false) {
      await this.ensureDirectory(normalizedPath)
    } else {
      const fullPath = this.getFullPath(normalizedPath)
      await this.createSingleDirectory(fullPath)
    }
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
      // @ts-ignore
      plus.io.resolveLocalFileSystemURL(
        fullPath,
        (entry: any) => {
          if (!entry.isDirectory) {
            resolve()
            return
          }

          if (recursive) {
            entry.removeRecursively(
              () => resolve(),
              (e: any) => {
                reject(new StorageError(
                  `删除目录失败: ${normalizedPath} - ${e.message}`,
                  StorageErrorCodes.DELETE_FAILED,
                  normalizedPath
                ))
              }
            )
          } else {
            entry.remove(
              () => resolve(),
              (e: any) => {
                reject(new StorageError(
                  `删除目录失败: ${normalizedPath} - ${e.message}`,
                  StorageErrorCodes.DELETE_FAILED,
                  normalizedPath
                ))
              }
            )
          }
        },
        () => {
          // 目录不存在，视为删除成功
          resolve()
        }
      )
    })
  }

  /**
   * 获取可用存储空间信息
   * @returns 存储空间信息
   */
  async getAvailableSpace(): Promise<StorageSpaceInfo> {
    // APP 环境下获取存储空间信息较复杂
    // 返回未知值，让调用方自行处理
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
    this.ensureInitialized()
    
    const srcFullPath = this.getFullPath(this.normalizePath(sourcePath))
    const destNormalized = this.normalizePath(destPath)
    const destFullPath = this.getFullPath(destNormalized)

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
    const destDir = this.getDirectory(destNormalized)
    if (destDir) {
      await this.ensureDirectory(destDir)
    }

    return new Promise((resolve, reject) => {
      // @ts-ignore
      plus.io.resolveLocalFileSystemURL(
        srcFullPath,
        (srcEntry: any) => {
          const destDirPath = destFullPath.substring(0, destFullPath.lastIndexOf('/'))
          const destFileName = destFullPath.substring(destFullPath.lastIndexOf('/') + 1)
          
          // @ts-ignore
          plus.io.resolveLocalFileSystemURL(
            destDirPath,
            (destDirEntry: any) => {
              srcEntry.copyTo(
                destDirEntry,
                destFileName,
                () => resolve(),
                (e: any) => {
                  reject(new StorageError(
                    `复制文件失败: ${sourcePath} -> ${destPath} - ${e.message}`,
                    StorageErrorCodes.WRITE_FAILED,
                    destPath
                  ))
                }
              )
            },
            (e: any) => {
              reject(new StorageError(
                `目标目录不存在: ${destDirPath} - ${e.message}`,
                StorageErrorCodes.DIR_NOT_FOUND,
                destPath
              ))
            }
          )
        },
        () => {
          reject(new StorageError(
            `源文件不存在: ${sourcePath}`,
            StorageErrorCodes.FILE_NOT_FOUND,
            sourcePath
          ))
        }
      )
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
    const destNormalized = this.normalizePath(destPath)
    const destFullPath = this.getFullPath(destNormalized)

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
    const destDir = this.getDirectory(destNormalized)
    if (destDir) {
      await this.ensureDirectory(destDir)
    }

    return new Promise((resolve, reject) => {
      // @ts-ignore
      plus.io.resolveLocalFileSystemURL(
        srcFullPath,
        (srcEntry: any) => {
          const destDirPath = destFullPath.substring(0, destFullPath.lastIndexOf('/'))
          const destFileName = destFullPath.substring(destFullPath.lastIndexOf('/') + 1)
          
          // @ts-ignore
          plus.io.resolveLocalFileSystemURL(
            destDirPath,
            (destDirEntry: any) => {
              srcEntry.moveTo(
                destDirEntry,
                destFileName,
                () => resolve(),
                (e: any) => {
                  reject(new StorageError(
                    `移动文件失败: ${sourcePath} -> ${destPath} - ${e.message}`,
                    StorageErrorCodes.WRITE_FAILED,
                    destPath
                  ))
                }
              )
            },
            (e: any) => {
              reject(new StorageError(
                `目标目录不存在: ${destDirPath} - ${e.message}`,
                StorageErrorCodes.DIR_NOT_FOUND,
                destPath
              ))
            }
          )
        },
        () => {
          reject(new StorageError(
            `源文件不存在: ${sourcePath}`,
            StorageErrorCodes.FILE_NOT_FOUND,
            sourcePath
          ))
        }
      )
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
    
    console.log('[AppStorageAdapter] 已清空所有存储数据')
  }
}
