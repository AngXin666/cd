/**
 * 草稿图片存储模块
 * 导出草稿图片存储相关的类、函数和类型
 * @module utils/draftStorage
 */

// 导出类型
export type {
  DraftType,
  ImageType,
  DraftImageInfo,
  DraftMeta,
  DraftStorageOptions,
  SaveImageOptions,
  IDraftImageStorage
} from './types'

// 导出常量
export {
  DEFAULT_DRAFT_OPTIONS,
  DRAFT_META_FILENAME,
  IMAGES_META_FILENAME
} from './types'

// 导出类和函数
export {
  DraftImageStorage,
  getDraftImageStorage
} from './DraftImageStorage'
