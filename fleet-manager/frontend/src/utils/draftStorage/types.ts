/**
 * 草稿图片存储类型定义
 * 定义草稿图片存储相关的接口和类型
 * @module utils/draftStorage/types
 */

/**
 * 草稿类型
 * - add: 添加车辆草稿
 * - return: 还车草稿
 */
export type DraftType = 'add' | 'return'

/**
 * 图片类型
 * 用于区分不同用途的图片
 */
export type ImageType = 
  | 'license'    // 行驶证照片
  | 'vehicle'    // 车辆照片（7张基本照片）
  | 'driver'     // 驾驶员证件
  | 'damage'     // 车损照片

/**
 * 草稿图片信息
 * 描述单张草稿图片的详细信息
 */
export interface DraftImageInfo {
  /** 图片 ID（唯一标识） */
  id: string
  /** 草稿 ID */
  draftId: string
  /** 图片类型 */
  imageType: ImageType
  /** 本地存储路径（相对于草稿根目录） */
  localPath: string
  /** 原始文件名 */
  originalFilename: string
  /** 文件大小（字节） */
  size: number
  /** MIME 类型 */
  mimeType: string
  /** 创建时间戳（毫秒） */
  createdAt: number
  /** 图片宽度（像素） */
  width?: number
  /** 图片高度（像素） */
  height?: number
  /** 已上传的 URL（用于断点续传） */
  uploadedUrl?: string
  /** 上传时间戳（毫秒） */
  uploadedAt?: number
  /** 图片索引（用于排序，如 7 张基本照片的顺序） */
  index?: number
}

/**
 * 草稿元数据
 * 存储草稿的基本信息和关联的图片列表
 */
export interface DraftMeta {
  /** 草稿 ID */
  id: string
  /** 草稿类型 */
  type: DraftType
  /** 用户 ID */
  userId: number
  /** 车辆 ID（还车时使用） */
  vehicleId?: number
  /** 创建时间戳（毫秒） */
  createdAt: number
  /** 更新时间戳（毫秒） */
  updatedAt: number
  /** 关联的图片 ID 列表 */
  imageIds: string[]
  /** 表单数据（JSON 字符串） */
  formData?: string
  /** 已上传的图片 URL 映射（本地路径 -> 远程 URL） */
  uploadedUrls: Record<string, string>
}

/**
 * 草稿存储配置选项
 */
export interface DraftStorageOptions {
  /** 草稿根目录，默认 'drafts' */
  rootDir?: string
  /** 草稿过期时间（毫秒），默认 30 天 */
  maxAge?: number
  /** 是否启用调试日志 */
  debug?: boolean
  /** 自动清理过期草稿的间隔（毫秒），默认 24 小时 */
  cleanupInterval?: number
}

/**
 * 保存图片选项
 */
export interface SaveImageOptions {
  /** 图片类型 */
  imageType: ImageType
  /** MIME 类型 */
  mimeType?: string
  /** 图片宽度 */
  width?: number
  /** 图片高度 */
  height?: number
  /** 图片索引（用于排序） */
  index?: number
  /** 原始文件名 */
  originalFilename?: string
}

/**
 * 草稿图片存储接口
 * 管理草稿关联的本地图片
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
   * @param options - 保存选项
   * @returns 图片信息
   */
  saveImage(
    draftId: string,
    imageData: Blob | ArrayBuffer | string,
    options: SaveImageOptions
  ): Promise<DraftImageInfo>

  /**
   * 读取草稿图片
   * @param localPath - 本地路径
   * @returns 图片数据（Base64 或临时路径）
   */
  readImage(localPath: string): Promise<string>

  /**
   * 删除草稿的所有图片
   * @param draftId - 草稿 ID
   * @returns 删除的图片数量
   */
  deleteDraftImages(draftId: string): Promise<number>

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
   * 获取草稿的所有图片信息
   * @param draftId - 草稿 ID
   * @returns 图片信息数组
   */
  getDraftImages(draftId: string): Promise<DraftImageInfo[]>

  /**
   * 删除单张图片
   * @param localPath - 本地路径
   * @returns 是否成功删除
   */
  deleteImage(localPath: string): Promise<boolean>

  /**
   * 获取图片信息
   * @param localPath - 本地路径
   * @returns 图片信息，不存在时返回 null
   */
  getImageInfo(localPath: string): Promise<DraftImageInfo | null>

  /**
   * 更新图片的上传状态
   * @param localPath - 本地路径
   * @param uploadedUrl - 已上传的 URL
   */
  markImageUploaded(localPath: string, uploadedUrl: string): Promise<void>

  /**
   * 清理过期草稿
   * @param maxAge - 最大保留时间（毫秒）
   * @returns 清理的草稿数量
   */
  cleanExpiredDrafts(maxAge?: number): Promise<number>

  /**
   * 获取所有草稿 ID 列表
   * @returns 草稿 ID 数组
   */
  getAllDraftIds(): Promise<string[]>

  /**
   * 获取草稿元数据
   * @param draftId - 草稿 ID
   * @returns 草稿元数据，不存在时返回 null
   */
  getDraftMeta(draftId: string): Promise<DraftMeta | null>

  /**
   * 创建或更新草稿元数据
   * @param meta - 草稿元数据
   */
  saveDraftMeta(meta: DraftMeta): Promise<void>

  /**
   * 删除草稿（包括元数据和所有图片）
   * @param draftId - 草稿 ID
   * @returns 是否成功删除
   */
  deleteDraft(draftId: string): Promise<boolean>
}

/**
 * 默认配置常量
 */
export const DEFAULT_DRAFT_OPTIONS: Required<DraftStorageOptions> = {
  /** 默认草稿根目录 */
  rootDir: 'drafts',
  /** 默认草稿过期时间：30 天 */
  maxAge: 30 * 24 * 60 * 60 * 1000,
  /** 默认不启用调试 */
  debug: false,
  /** 默认清理间隔：24 小时 */
  cleanupInterval: 24 * 60 * 60 * 1000
}

/**
 * 草稿元数据文件名
 */
export const DRAFT_META_FILENAME = '_draft_meta.json'

/**
 * 图片元数据文件名
 */
export const IMAGES_META_FILENAME = '_images_meta.json'
