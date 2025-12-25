/**
 * 存储模块统一导出
 * 提供跨平台的文件存储功能
 * @module utils/storage
 */

// 导出类型定义
export type {
  PlatformType,
  FileInfo,
  WriteFileOptions,
  ReadFileOptions,
  ListFilesOptions,
  StorageSpaceInfo,
  PlatformStorageAdapter,
  StorageAdapterFactory
} from './types'

// 导出错误类和常量
export { 
  StorageError, 
  StorageErrorCodes,
  StoragePaths 
} from './types'

// 导出各平台适配器
export { H5StorageAdapter } from './H5StorageAdapter'
export { WeappStorageAdapter } from './WeappStorageAdapter'
export { AppStorageAdapter } from './AppStorageAdapter'
export { MemoryStorageAdapter } from './MemoryStorageAdapter'

// 导出存储管理器
export { 
  StorageManager, 
  getStorageManager,
  detectCurrentPlatform 
} from './StorageManager'
