/**
 * 草稿管理工具
 * 用于保存和恢复车辆录入的草稿数据
 */

import Taro from '@tarojs/taro'

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
    const key = getDraftKey(type, userId)
    const draftWithTimestamp = {
      ...draft,
      saved_at: new Date().toISOString()
    }

    await Taro.setStorage({
      key,
      data: draftWithTimestamp
    })

    console.log('草稿已保存:', key, draftWithTimestamp)
  } catch (error) {
    console.error('保存草稿失败:', error)
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
      console.log('草稿已恢复:', key, result.data)
      return result.data as VehicleDraft
    }

    return null
  } catch (_error) {
    // 没有草稿或读取失败
    return null
  }
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
    console.log('草稿已删除:', key)
  } catch (error) {
    console.error('删除草稿失败:', error)
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
        console.log('已清理过期草稿:', type, userId)
      }
    }
  } catch (error) {
    console.error('清理过期草稿失败:', error)
  }
}
