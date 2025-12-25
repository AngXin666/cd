/**
 * 用户偏好存储工具函数模块
 * 提供用户偏好设置的本地存储功能
 * @module utils/preferences
 * 
 * Requirements: 1.5
 */

/**
 * 存储键名常量
 * 用于统一管理 localStorage 的键名
 */
const STORAGE_KEYS = {
  /** 上次选择的仓库 */
  LAST_WAREHOUSE: 'piece_work_last_warehouse',
  /** 上次选择的品类 */
  LAST_CATEGORY: 'piece_work_last_category',
  /** 上次的工作日期 */
  LAST_WORK_DATE: 'piece_work_last_work_date',
  /** 计件表单默认值 */
  PIECE_WORK_FORM_DEFAULTS: 'piece_work_form_defaults',
} as const

/**
 * 仓库信息接口
 */
export interface WarehouseInfo {
  /** 仓库 ID */
  id: number
  /** 仓库名称 */
  name: string
}

/**
 * 品类信息接口
 */
export interface CategoryInfo {
  /** 品类 ID */
  id: number
  /** 品类名称 */
  name: string
}

/**
 * 计件表单默认值接口
 */
export interface PieceWorkFormDefaults {
  /** 仓库 ID */
  warehouseId: number
  /** 品类 ID */
  categoryId: number
  /** 是否需要上楼 */
  needUpstairs: boolean
}

/**
 * 保存上次选择的仓库
 * 
 * @param id - 仓库 ID
 * @param name - 仓库名称
 * 
 * @example
 * saveLastWarehouse(1, '北京仓库')
 */
export function saveLastWarehouse(id: number, name: string): void {
  try {
    const data: WarehouseInfo = { id, name }
    uni.setStorageSync(STORAGE_KEYS.LAST_WAREHOUSE, JSON.stringify(data))
  } catch (error) {
    console.error('保存上次仓库失败:', error)
  }
}

/**
 * 获取上次选择的仓库
 * 
 * @returns 仓库信息对象，如果不存在则返回 null
 * 
 * @example
 * const warehouse = getLastWarehouse()
 * if (warehouse) {
 *   console.log(warehouse.name) // '北京仓库'
 * }
 */
export function getLastWarehouse(): WarehouseInfo | null {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.LAST_WAREHOUSE)
    if (data) {
      return JSON.parse(data) as WarehouseInfo
    }
  } catch (error) {
    console.error('获取上次仓库失败:', error)
  }
  return null
}

/**
 * 保存上次选择的品类
 * 
 * @param id - 品类 ID
 * @param name - 品类名称
 * 
 * @example
 * saveLastCategory(1, '快递')
 */
export function saveLastCategory(id: number, name: string): void {
  try {
    const data: CategoryInfo = { id, name }
    uni.setStorageSync(STORAGE_KEYS.LAST_CATEGORY, JSON.stringify(data))
  } catch (error) {
    console.error('保存上次品类失败:', error)
  }
}

/**
 * 获取上次选择的品类
 * 
 * @returns 品类信息对象，如果不存在则返回 null
 * 
 * @example
 * const category = getLastCategory()
 * if (category) {
 *   console.log(category.name) // '快递'
 * }
 */
export function getLastCategory(): CategoryInfo | null {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.LAST_CATEGORY)
    if (data) {
      return JSON.parse(data) as CategoryInfo
    }
  } catch (error) {
    console.error('获取上次品类失败:', error)
  }
  return null
}

/**
 * 保存上次的工作日期
 * 
 * @param date - 工作日期字符串，格式 'YYYY-MM-DD'
 * 
 * @example
 * saveLastWorkDate('2024-12-24')
 */
export function saveLastWorkDate(date: string): void {
  try {
    uni.setStorageSync(STORAGE_KEYS.LAST_WORK_DATE, date)
  } catch (error) {
    console.error('保存上次工作日期失败:', error)
  }
}

/**
 * 获取上次的工作日期
 * 
 * @returns 工作日期字符串，如果不存在则返回 null
 * 
 * @example
 * const date = getLastWorkDate()
 * if (date) {
 *   console.log(date) // '2024-12-24'
 * }
 */
export function getLastWorkDate(): string | null {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.LAST_WORK_DATE)
    return data || null
  } catch (error) {
    console.error('获取上次工作日期失败:', error)
  }
  return null
}

/**
 * 保存计件表单默认值
 * 
 * @param defaults - 计件表单默认值对象
 * 
 * @example
 * savePieceWorkFormDefaults({
 *   warehouseId: 1,
 *   categoryId: 2,
 *   needUpstairs: true
 * })
 */
export function savePieceWorkFormDefaults(defaults: PieceWorkFormDefaults): void {
  try {
    uni.setStorageSync(STORAGE_KEYS.PIECE_WORK_FORM_DEFAULTS, JSON.stringify(defaults))
  } catch (error) {
    console.error('保存计件表单默认值失败:', error)
  }
}

/**
 * 获取计件表单默认值
 * 
 * @returns 计件表单默认值对象，如果不存在则返回 null
 * 
 * @example
 * const defaults = getPieceWorkFormDefaults()
 * if (defaults) {
 *   console.log(defaults.warehouseId) // 1
 * }
 */
export function getPieceWorkFormDefaults(): PieceWorkFormDefaults | null {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.PIECE_WORK_FORM_DEFAULTS)
    if (data) {
      return JSON.parse(data) as PieceWorkFormDefaults
    }
  } catch (error) {
    console.error('获取计件表单默认值失败:', error)
  }
  return null
}

/**
 * 清除所有用户偏好设置
 * 
 * @example
 * clearAllPreferences()
 */
export function clearAllPreferences(): void {
  try {
    uni.removeStorageSync(STORAGE_KEYS.LAST_WAREHOUSE)
    uni.removeStorageSync(STORAGE_KEYS.LAST_CATEGORY)
    uni.removeStorageSync(STORAGE_KEYS.LAST_WORK_DATE)
    uni.removeStorageSync(STORAGE_KEYS.PIECE_WORK_FORM_DEFAULTS)
  } catch (error) {
    console.error('清除用户偏好设置失败:', error)
  }
}

/**
 * 批量保存用户偏好
 * 用于在提交计件记录后一次性保存所有偏好
 * 
 * @param options - 偏好选项
 * @param options.warehouse - 仓库信息
 * @param options.category - 品类信息
 * @param options.workDate - 工作日期
 * @param options.formDefaults - 表单默认值
 * 
 * @example
 * saveAllPreferences({
 *   warehouse: { id: 1, name: '北京仓库' },
 *   category: { id: 2, name: '快递' },
 *   workDate: '2024-12-24',
 *   formDefaults: { warehouseId: 1, categoryId: 2, needUpstairs: true }
 * })
 */
export function saveAllPreferences(options: {
  warehouse?: WarehouseInfo
  category?: CategoryInfo
  workDate?: string
  formDefaults?: PieceWorkFormDefaults
}): void {
  const { warehouse, category, workDate, formDefaults } = options
  
  if (warehouse) {
    saveLastWarehouse(warehouse.id, warehouse.name)
  }
  
  if (category) {
    saveLastCategory(category.id, category.name)
  }
  
  if (workDate) {
    saveLastWorkDate(workDate)
  }
  
  if (formDefaults) {
    savePieceWorkFormDefaults(formDefaults)
  }
}
