/**
 * 草稿图片存储模块导出
 * @module utils/draftImage
 */

export { DraftImageStorage, getDraftImageStorage } from './DraftImageStorage'
export { useDraftImage, generateDraftId } from './useDraftImage'
export type {
  DraftImageMeta,
  DraftImageType,
  DraftImageStorageOptions,
  SaveImageOptions,
  ReadImageOptions,
  DraftInfo,
  IDraftImageStorage
} from './types'
export {
  DEFAULT_DRAFT_OPTIONS,
  DRAFT_META_FILENAME,
  IMAGES_DIR_NAME
} from './types'
