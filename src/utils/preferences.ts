import Taro from '@tarojs/taro'

/**
 * 用户偏好设置管理工具
 */

// 存储键名
const STORAGE_KEYS = {
  LAST_WAREHOUSE: 'user_last_warehouse', // 最后选择的仓库
  LAST_CATEGORY: 'user_last_category', // 最后选择的计件品类
  LAST_WORK_DATE: 'user_last_work_date', // 最后选择的工作日期
  PIECE_WORK_FORM: 'user_piece_work_form' // 计件表单的默认值
}

/**
 * 保存最后选择的仓库
 */
export function saveLastWarehouse(warehouseId: string, warehouseName: string): void {
  try {
    Taro.setStorageSync(STORAGE_KEYS.LAST_WAREHOUSE, {
      id: warehouseId,
      name: warehouseName,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('保存仓库偏好失败:', error)
  }
}

/**
 * 获取最后选择的仓库
 */
export function getLastWarehouse(): {id: string; name: string} | null {
  try {
    const data = Taro.getStorageSync(STORAGE_KEYS.LAST_WAREHOUSE)
    return data || null
  } catch (error) {
    console.error('获取仓库偏好失败:', error)
    return null
  }
}

/**
 * 保存最后选择的计件品类
 */
export function saveLastCategory(categoryId: string, categoryName: string): void {
  try {
    Taro.setStorageSync(STORAGE_KEYS.LAST_CATEGORY, {
      id: categoryId,
      name: categoryName,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('保存品类偏好失败:', error)
  }
}

/**
 * 获取最后选择的计件品类
 */
export function getLastCategory(): {id: string; name: string} | null {
  try {
    const data = Taro.getStorageSync(STORAGE_KEYS.LAST_CATEGORY)
    return data || null
  } catch (error) {
    console.error('获取品类偏好失败:', error)
    return null
  }
}

/**
 * 保存最后选择的工作日期
 */
export function saveLastWorkDate(date: string): void {
  try {
    Taro.setStorageSync(STORAGE_KEYS.LAST_WORK_DATE, {
      date,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('保存日期偏好失败:', error)
  }
}

/**
 * 获取最后选择的工作日期
 */
export function getLastWorkDate(): string | null {
  try {
    const data = Taro.getStorageSync(STORAGE_KEYS.LAST_WORK_DATE)
    return data?.date || null
  } catch (error) {
    console.error('获取日期偏好失败:', error)
    return null
  }
}

/**
 * 保存计件表单的默认值
 */
export function savePieceWorkFormDefaults(formData: {
  warehouseId?: string
  categoryId?: string
  needUpstairs?: boolean
}): void {
  try {
    Taro.setStorageSync(STORAGE_KEYS.PIECE_WORK_FORM, {
      ...formData,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('保存表单偏好失败:', error)
  }
}

/**
 * 获取计件表单的默认值
 */
export function getPieceWorkFormDefaults(): {
  warehouseId?: string
  categoryId?: string
  needUpstairs?: boolean
} | null {
  try {
    const data = Taro.getStorageSync(STORAGE_KEYS.PIECE_WORK_FORM)
    return data || null
  } catch (error) {
    console.error('获取表单偏好失败:', error)
    return null
  }
}

/**
 * 清除所有用户偏好设置
 */
export function clearAllPreferences(): void {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      Taro.removeStorageSync(key)
    })
  } catch (error) {
    console.error('清除偏好设置失败:', error)
  }
}
