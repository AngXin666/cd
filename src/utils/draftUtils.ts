/**
 * 草稿管理工具
 * 用于保存和恢复车辆录入的草稿数据
 */

import Taro from '@tarojs/taro'
import {createLogger} from './logger'

const logger = createLogger('DraftUtils')

// 草稿数据接口
export interface VehicleDraft {
  // 基本信息
  plate_number?: string
  brand?: string
  model?: string
  color?: string
  vin?: string
  engine_number?: string
  register_date?: string

  // 行驶证照片
  registration_front_photo?: string
  registration_back_photo?: string

  // 车辆照片（7张）
  vehicle_photos?: string[]

  // 车损特写照片
  damage_photos?: string[]

  // 驾驶员信息
  driver_name?: string
  driver_id_number?: string
  driver_license_number?: string
  driver_license_class?: string
  driver_license_valid_from?: string
  driver_license_valid_until?: string
  driver_first_issue_date?: string

  // 驾驶员证件照片
  id_card_front_photo?: string
  driver_license_photo?: string

  // 保存时间
  saved_at?: string
}

// 草稿存储键前缀
const DRAFT_KEY_PREFIX = 'vehicle_draft_'

/**
 * 将临时文件保存为持久化文件
 * @param tempFilePath 临时文件路径
 * @returns 持久化文件路径，失败返回原路径
 */
async function saveTempFileToPersistent(tempFilePath: string): Promise<string> {
  // 如果路径为空或已经是持久化路径，直接返回
  if (!tempFilePath) return tempFilePath
  if (!tempFilePath.includes('tmp') && !tempFilePath.includes('temp')) {
    return tempFilePath
  }

  try {
    // 使用 saveFile 将临时文件保存为持久化文件
    const result = await Taro.saveFile({
      tempFilePath: tempFilePath
    })

    if ('savedFilePath' in result) {
      return result.savedFilePath
    } else {
      logger.error('图片持久化失败', {tempFilePath, result})
      return tempFilePath
    }
  } catch (error) {
    logger.error('图片持久化失败', {tempFilePath, error})
    // 失败时返回原路径
    return tempFilePath
  }
}

/**
 * 批量持久化图片路径
 * @param paths 图片路径数组
 * @returns 持久化后的路径数组
 */
async function persistImagePaths(paths: (string | undefined)[]): Promise<(string | undefined)[]> {
  const results: (string | undefined)[] = []

  for (const path of paths) {
    if (path) {
      const persistedPath = await saveTempFileToPersistent(path)
      results.push(persistedPath)
    } else {
      results.push(undefined)
    }
  }

  return results
}

/**
 * 检查文件是否存在且有效
 * @param filePath 文件路径
 * @returns 文件是否有效
 */
async function isFileValid(filePath: string): Promise<boolean> {
  if (!filePath) return false

  try {
    const fs = Taro.getFileSystemManager()
    await fs.access({path: filePath})
    return true
  } catch (_error) {
    return false
  }
}

/**
 * 清理无效的图片路径
 * @param paths 图片路径数组
 * @returns 有效的图片路径数组（保持原数组长度和索引位置）
 */
async function cleanInvalidPaths(paths: (string | undefined)[]): Promise<(string | undefined)[]> {
  const results: (string | undefined)[] = []

  for (const path of paths) {
    if (path) {
      const isValid = await isFileValid(path)
      if (isValid) {
        results.push(path)
      } else {
        results.push(undefined)
      }
    } else {
      results.push(undefined)
    }
  }

  return results
}

/**
 * 生成草稿存储键
 * @param type 草稿类型（add: 提车录入, return: 还车录入）
 * @param userId 用户ID
 */
function getDraftKey(type: 'add' | 'return', userId: string): string {
  return `${DRAFT_KEY_PREFIX}${type}_${userId}`
}

/**
 * 保存草稿
 * @param type 草稿类型
 * @param userId 用户ID
 * @param draft 草稿数据
 */
export async function saveDraft(type: 'add' | 'return', userId: string, draft: VehicleDraft): Promise<void> {
  try {
    // 持久化所有图片路径
    const persistedDraft: VehicleDraft = {
      ...draft
    }

    // 持久化单张图片
    if (draft.registration_front_photo) {
      persistedDraft.registration_front_photo = await saveTempFileToPersistent(draft.registration_front_photo)
    }
    if (draft.registration_back_photo) {
      persistedDraft.registration_back_photo = await saveTempFileToPersistent(draft.registration_back_photo)
    }
    if (draft.id_card_front_photo) {
      persistedDraft.id_card_front_photo = await saveTempFileToPersistent(draft.id_card_front_photo)
    }
    if (draft.driver_license_photo) {
      persistedDraft.driver_license_photo = await saveTempFileToPersistent(draft.driver_license_photo)
    }

    // 持久化车辆照片数组
    if (draft.vehicle_photos && draft.vehicle_photos.length > 0) {
      persistedDraft.vehicle_photos = await persistImagePaths(draft.vehicle_photos)
    }

    // 持久化车损照片数组
    if (draft.damage_photos && draft.damage_photos.length > 0) {
      persistedDraft.damage_photos = await persistImagePaths(draft.damage_photos)
    }

    const key = getDraftKey(type, userId)
    const draftWithTimestamp = {
      ...persistedDraft,
      saved_at: new Date().toISOString()
    }

    await Taro.setStorage({
      key,
      data: draftWithTimestamp
    })
  } catch (error) {
    logger.error('保存草稿失败', error)
  }
}

/**
 * 获取草稿
 * @param type 草稿类型
 * @param userId 用户ID
 */
export async function getDraft(type: 'add' | 'return', userId: string): Promise<VehicleDraft | null> {
  try {
    const key = getDraftKey(type, userId)
    const result = await Taro.getStorage({key})

    if (result.data) {
      const draft = result.data as VehicleDraft

      // 验证并清理无效的图片路径
      const cleanedDraft: VehicleDraft = {
        ...draft
      }

      // 验证单张图片
      if (draft.registration_front_photo) {
        const isValid = await isFileValid(draft.registration_front_photo)
        if (!isValid) {
          cleanedDraft.registration_front_photo = undefined
        }
      }

      if (draft.registration_back_photo) {
        const isValid = await isFileValid(draft.registration_back_photo)
        if (!isValid) {
          cleanedDraft.registration_back_photo = undefined
        }
      }

      if (draft.id_card_front_photo) {
        const isValid = await isFileValid(draft.id_card_front_photo)
        if (!isValid) {
          cleanedDraft.id_card_front_photo = undefined
        }
      }

      if (draft.driver_license_photo) {
        const isValid = await isFileValid(draft.driver_license_photo)
        if (!isValid) {
          cleanedDraft.driver_license_photo = undefined
        }
      }

      // 验证车辆照片数组
      if (draft.vehicle_photos && draft.vehicle_photos.length > 0) {
        cleanedDraft.vehicle_photos = await cleanInvalidPaths(draft.vehicle_photos)
      }

      // 验证车损照片数组
      if (draft.damage_photos && draft.damage_photos.length > 0) {
        cleanedDraft.damage_photos = await cleanInvalidPaths(draft.damage_photos)
      }

      return cleanedDraft
    }

    return null
  } catch (_error) {
    // 没有草稿或读取失败
    return null
  }
}

/**
 * 统计草稿中的图片数量
 * @param draft 草稿数据
 * @returns 图片总数
 */
function _getPhotoCount(draft: VehicleDraft): number {
  let count = 0

  if (draft.registration_front_photo) count++
  if (draft.registration_back_photo) count++
  if (draft.id_card_front_photo) count++
  if (draft.driver_license_photo) count++

  if (draft.vehicle_photos) {
    count += draft.vehicle_photos.filter((p) => p).length
  }

  if (draft.damage_photos) {
    count += draft.damage_photos.filter((p) => p).length
  }

  return count
}

/**
 * 删除草稿
 * @param type 草稿类型
 * @param userId 用户ID
 */
export async function deleteDraft(type: 'add' | 'return', userId: string): Promise<void> {
  try {
    const key = getDraftKey(type, userId)
    await Taro.removeStorage({key})
  } catch (error) {
    logger.error('删除草稿失败', error)
  }
}

/**
 * 检查是否有草稿
 * @param type 草稿类型
 * @param userId 用户ID
 */
export async function hasDraft(type: 'add' | 'return', userId: string): Promise<boolean> {
  try {
    const draft = await getDraft(type, userId)
    return draft !== null
  } catch (_error) {
    return false
  }
}

/**
 * 清理过期草稿（超过7天）
 * @param type 草稿类型
 * @param userId 用户ID
 */
export async function cleanExpiredDraft(type: 'add' | 'return', userId: string): Promise<void> {
  try {
    const draft = await getDraft(type, userId)

    if (draft?.saved_at) {
      const savedTime = new Date(draft.saved_at).getTime()
      const now = Date.now()
      const daysDiff = (now - savedTime) / (1000 * 60 * 60 * 24)

      // 如果草稿超过7天，自动删除
      if (daysDiff > 7) {
        await deleteDraft(type, userId)
      }
    }
  } catch (error) {
    logger.error('清理过期草稿失败', error)
  }
}
