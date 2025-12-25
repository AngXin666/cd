/**
 * 图片缓存模块统一导出
 * 提供跨平台的图片缓存功能
 * @module utils/imageCache
 */

// 导出类型定义
export type {
  ImageCacheMeta,
  ImageCacheOptions,
  CacheStats,
  GetImageOptions,
  CacheImageOptions,
  IImageCacheManager,
  UrlHashFunction
} from './types'

// 导出常量
export {
  DEFAULT_CACHE_OPTIONS,
  CACHE_META_FILENAME
} from './types'

// 导出图片缓存管理器
export {
  ImageCacheManager,
  getImageCacheManager
} from './ImageCacheManager'

