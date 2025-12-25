/**
 * 平台存储适配器类型定义
 * 定义跨平台文件存储的统一接口和相关类型
 * @module utils/storage/types
 */

/**
 * 支持的平台类型
 * - h5: 浏览器环境，使用 IndexedDB
 * - weapp: 微信小程序，使用 wx.getFileSystemManager
 * - app: APP 环境（Capacitor），使用原生文件系统
 * - memory: 内存缓存，作为降级方案
 */
export type PlatformType = 'h5' | 'weapp' | 'app' | 'memory'

/**
 * 文件信息
 * 描述存储文件的基本属性
 */
export interface FileInfo {
  /** 文件路径（相对于存储根目录） */
  path: string
  /** 文件名 */
  name: string
  /** 文件大小（字节） */
  size: number
  /** 创建时间戳（毫秒） */
  createdAt: number
  /** 最后修改时间戳（毫秒） */
  modifiedAt: number
  /** MIME 类型（如 image/jpeg） */
  mimeType?: string
}

/**
 * 写入文件选项
 */
export interface WriteFileOptions {
  /** 是否覆盖已存在的文件（默认 true） */
  overwrite?: boolean
  /** MIME 类型 */
  mimeType?: string
  /** 文件编码（用于文本文件） */
  encoding?: 'utf8' | 'base64'
}

/**
 * 读取文件选项
 */
export interface ReadFileOptions {
  /** 返回数据格式 */
  format?: 'arraybuffer' | 'base64' | 'text'
}

/**
 * 列出文件选项
 */
export interface ListFilesOptions {
  /** 是否递归列出子目录 */
  recursive?: boolean
  /** 文件名过滤模式（支持通配符 *） */
  pattern?: string
}

/**
 * 存储空间信息
 */
export interface StorageSpaceInfo {
  /** 总空间（字节），-1 表示未知 */
  total: number
  /** 已用空间（字节），-1 表示未知 */
  used: number
  /** 可用空间（字节），-1 表示未知 */
  available: number
}

/**
 * 平台存储适配器接口
 * 定义跨平台文件操作的统一接口
 * 所有平台适配器都必须实现此接口
 */
export interface PlatformStorageAdapter {
  /** 
   * 平台类型标识
   * 用于识别当前使用的存储适配器
   */
  readonly platform: PlatformType

  /**
   * 检查适配器是否可用
   * 用于在运行时检测当前平台是否支持此适配器
   * @returns 是否可用
   */
  isAvailable(): boolean

  /**
   * 初始化存储适配器
   * 在使用前调用，用于创建必要的目录结构等
   * @returns 初始化是否成功
   */
  initialize(): Promise<boolean>

  /**
   * 写入文件
   * @param path - 文件路径（相对于存储根目录）
   * @param data - 文件数据（ArrayBuffer、Base64 字符串或文本）
   * @param options - 写入选项
   * @throws {Error} 写入失败时抛出错误
   */
  writeFile(
    path: string,
    data: ArrayBuffer | string,
    options?: WriteFileOptions
  ): Promise<void>

  /**
   * 读取文件
   * @param path - 文件路径
   * @param options - 读取选项
   * @returns 文件数据
   * @throws {Error} 文件不存在或读取失败时抛出错误
   */
  readFile(
    path: string,
    options?: ReadFileOptions
  ): Promise<ArrayBuffer | string>

  /**
   * 删除文件
   * @param path - 文件路径
   * @throws {Error} 删除失败时抛出错误（文件不存在不抛出错误）
   */
  deleteFile(path: string): Promise<void>

  /**
   * 检查文件是否存在
   * @param path - 文件路径
   * @returns 文件是否存在
   */
  fileExists(path: string): Promise<boolean>

  /**
   * 获取文件信息
   * @param path - 文件路径
   * @returns 文件信息，文件不存在时返回 null
   */
  getFileInfo(path: string): Promise<FileInfo | null>

  /**
   * 列出目录中的文件
   * @param directory - 目录路径
   * @param options - 列出选项
   * @returns 文件信息数组
   */
  listFiles(directory: string, options?: ListFilesOptions): Promise<FileInfo[]>

  /**
   * 创建目录
   * @param path - 目录路径
   * @param recursive - 是否递归创建父目录（默认 true）
   */
  mkdir(path: string, recursive?: boolean): Promise<void>

  /**
   * 删除目录
   * @param path - 目录路径
   * @param recursive - 是否递归删除子目录和文件（默认 false）
   */
  rmdir(path: string, recursive?: boolean): Promise<void>

  /**
   * 获取可用存储空间信息
   * @returns 存储空间信息
   */
  getAvailableSpace(): Promise<StorageSpaceInfo>

  /**
   * 复制文件
   * @param sourcePath - 源文件路径
   * @param destPath - 目标文件路径
   * @param overwrite - 是否覆盖已存在的文件（默认 true）
   */
  copyFile(sourcePath: string, destPath: string, overwrite?: boolean): Promise<void>

  /**
   * 移动/重命名文件
   * @param sourcePath - 源文件路径
   * @param destPath - 目标文件路径
   * @param overwrite - 是否覆盖已存在的文件（默认 true）
   */
  moveFile(sourcePath: string, destPath: string, overwrite?: boolean): Promise<void>

  /**
   * 清空所有存储数据
   * 谨慎使用，会删除所有存储的文件
   */
  clearAll(): Promise<void>
}

/**
 * 存储适配器工厂函数类型
 * 用于创建特定平台的存储适配器实例
 */
export type StorageAdapterFactory = () => PlatformStorageAdapter

/**
 * 存储错误类型
 */
export class StorageError extends Error {
  /** 错误代码 */
  code: string
  /** 相关文件路径 */
  path?: string

  constructor(message: string, code: string, path?: string) {
    super(message)
    this.name = 'StorageError'
    this.code = code
    this.path = path
  }
}

/**
 * 存储错误代码常量
 */
export const StorageErrorCodes = {
  /** 文件不存在 */
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  /** 目录不存在 */
  DIR_NOT_FOUND: 'DIR_NOT_FOUND',
  /** 文件已存在 */
  FILE_EXISTS: 'FILE_EXISTS',
  /** 权限不足 */
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  /** 存储空间不足 */
  NO_SPACE: 'NO_SPACE',
  /** 不支持的操作 */
  NOT_SUPPORTED: 'NOT_SUPPORTED',
  /** 初始化失败 */
  INIT_FAILED: 'INIT_FAILED',
  /** 读取失败 */
  READ_FAILED: 'READ_FAILED',
  /** 写入失败 */
  WRITE_FAILED: 'WRITE_FAILED',
  /** 删除失败 */
  DELETE_FAILED: 'DELETE_FAILED',
  /** 未知错误 */
  UNKNOWN: 'UNKNOWN'
} as const

/**
 * 存储路径常量
 * 定义各类文件的存储目录
 */
export const StoragePaths = {
  /** 缓存图片目录 */
  CACHE: 'cache/images',
  /** 草稿图片目录 */
  DRAFTS: 'drafts',
  /** 临时文件目录 */
  TEMP: 'temp/images'
} as const
