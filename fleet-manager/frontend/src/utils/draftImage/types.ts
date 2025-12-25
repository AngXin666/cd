/**
 * 草稿图片存储类型定义
 * 定义草稿图片存储相关的接口和类型
 * @module utils/draftImage/types
 */

/**
 * 草稿图片元数据
 * 存储草稿图片的详细信息
 */
export interface DraftImageMeta {
  /** 草稿 ID */
  draftId: string
  /** 文件名 */
  filename: string
  /** 本地存储路径（相对于存储根目录） */
  localPath: string
  /** 保存时间戳（毫秒） */
  savedAt: number
  /** 文件大小（字节） */
  size: number
  /** MIME 类型 */
  mimeType?: string
  /** 图片宽度（像素） */
  width?: number
  /** 图片高度（像素） */
  height?: number
  /** 图片类型（用于分类） */
  imageType?: DraftImageType
}

/**
 * 草稿图片类型
 * 用于区分不同用途的图片
 */
export type DraftImageType = 
  | 'vehicle'           // 车辆照片（7张基本照片）
  | 'damage'            // 车损照片
  | 'registration'      // 行驶证照片
  | 'driver_license'    // 驾驶证照片
  | 'id_card'           // 身份证照片
  | 'other'             // 其他照片

/**
 * 草稿图片存储配置选项
 */
export interface DraftImageStorageOptions {
  /** 草稿根目录路径，默认 'drafts' */
  draftDir?: string
  /** 草稿过期时间（毫秒），默认 30 天 */
  expirationTime?: number
  /** 是否启用调试日志 */
  debug?: boolean
}

/**
 * 保存图片选项
 */
export interface SaveImageOptions {
  /** MIME 类型 */
  mimeType?: string
  /** 图片宽度 */
  width?: number
  /** 图片高度 */
  height?: number
  /** 图片类型 */
  imageType?: DraftImageType
  /** 是否覆盖已存在的文件（默认 true） */
  overwrite?: boolean
}

/**
 * 读取图片选项
 */
export interface ReadImageOptions {
  /** 返回格式：base64 或 arraybuffer */
  format?: 'base64' | 'arraybuffer'
}

/**
 * 草稿信息
 * 包含草稿的基本信息和关联的图片
 */
export interface DraftInfo {
  /** 草稿 ID */
  draftId: string
  /** 创建时间 */
  createdAt: number
  /** 最后修改时间 */
  modifiedAt: number
  /** 图片数量 */
  imageCount: number
  /** 总大小（字节） */
  totalSize: number
  /** 图片列表 */
  images: DraftImageMeta[]
}

/**
 * 草稿图片存储接口
 * 定义草稿图片存储的统一接口
 */
export interface IDraftImageStorage {
  /**
   * 初始化存储
   * @returns 初始化是否成功
   */
  initialize(): Promise<boolean>

  /**
   * 保存图片到草稿目录
   * @param draftId - 草稿 ID
   * @param imageData - 图片数据（Blob、ArrayBuffer 或 Base64 字符串）
   * @param filename - 文件名
   * @param options - 保存选项
   * @returns 本地存储路径
   */
  saveImage(
    draftId: string,
    imageData: Blob | ArrayBuffer | string,
    filename: string,
    options?: SaveImageOptions
  ): Promise<string>

  /**
   * 读取草稿图片
   * @param localPath - 本地路径
   * @param options - 读取选项
   * @returns 图片数据（Base64 或 ArrayBuffer）
   */
  readImage(
    localPath: string,
    options?: ReadImageOptions
  ): Promise<string | ArrayBuffer>

  /**
   * 删除草稿的所有图片
   * @param draftId - 草稿 ID
   * @returns 删除的图片数量
   */
  deleteDraftImages(draftId: string): Promise<number>

  /**
   * 删除单张图片
   * @param localPath - 本地路径
   * @returns 是否成功删除
   */
  deleteImage(localPath: string): Promise<boolean>

  /**
   * 检查图片是否存在
   * @param localPath - 本地路径
   * @returns 图片是否存在
   */
  imageExists(localPath: string): Promise<boolean>

  /**
   * 获取草稿的所有图片路径
   * @param draftId - 草稿 ID
   * @returns 图片路径数组
   */
  getDraftImagePaths(draftId: string): Promise<string[]>

  /**
   * 获取草稿的所有图片元数据
   * @param draftId - 草稿 ID
   * @returns 图片元数据数组
   */
  getDraftImageMetas(draftId: string): Promise<DraftImageMeta[]>

  /**
   * 获取草稿信息
   * @param draftId - 草稿 ID
   * @returns 草稿信息，不存在时返回 null
   */
  getDraftInfo(draftId: string): Promise<DraftInfo | null>

  /**
   * 获取所有草稿列表
   * @returns 草稿信息数组
   */
  getAllDrafts(): Promise<DraftInfo[]>

  /**
   * 清理过期草稿
   * @param expirationTime - 过期时间（毫秒），不传则使用配置的默认值
   * @returns 清理的草稿数量
   */
  cleanExpiredDrafts(expirationTime?: number): Promise<number>

  /**
   * 清理所有草稿
   * @returns 清理的草稿数量
   */
  clearAllDrafts(): Promise<number>

  /**
   * 获取草稿总大小
   * @returns 总大小（字节）
   */
  getTotalSize(): Promise<number>
}

/**
 * 默认配置常量
 */
export const DEFAULT_DRAFT_OPTIONS: Required<DraftImageStorageOptions> = {
  /** 默认草稿目录 */
  draftDir: 'drafts',
  /** 默认过期时间：30 天 */
  expirationTime: 30 * 24 * 60 * 60 * 1000,
  /** 默认不启用调试 */
  debug: false
}

/**
 * 草稿元数据文件名
 */
export const DRAFT_META_FILENAME = '_draft_meta.json'

/**
 * 图片目录名
 */
export const IMAGES_DIR_NAME = 'images'
