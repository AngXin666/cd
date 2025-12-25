/**
 * 图片预加载器模块
 * 提供图片预加载队列管理、并发控制和加载状态跟踪功能
 * @module utils/imagePreloader
 */

// 导出类型定义
export type {
  PreloadTask,
  PreloadOptions,
  PreloaderConfig,
  PreloaderStats,
  PreloadEventType,
  PreloadEventData,
  PreloadEventListener,
  IImagePreloader
} from './types'

// 导出枚举
export {
  PreloadTaskStatus,
  PreloadPriority,
  DEFAULT_PRELOADER_CONFIG
} from './types'

// 导出预加载器类和工厂函数
export {
  ImagePreloader,
  getImagePreloader
} from './ImagePreloader'

// 导出 Vue Hooks
export {
  useImagePreloader,
  usePagePreloader
} from './useImagePreloader'
export type { UseImagePreloaderReturn } from './useImagePreloader'
