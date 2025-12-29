/**
 * 排序工具函数
 * 提供通用的排序功能，支持多字段排序和升序/降序切换
 * 
 * @module utils/sort
 * 
 * Requirements:
 * - 4.1: 显示排序选项（按金额/按数量/按日期）
 * - 4.2: 按选定方式重新排列记录列表
 * - 4.3: 支持升序/降序切换
 */

// ==================== 类型定义 ====================

/**
 * 排序字段类型
 * - amount: 按金额排序
 * - quantity: 按数量排序
 * - date: 按日期排序
 */
export type SortField = 'amount' | 'quantity' | 'date'

/**
 * 排序方向类型
 * - asc: 升序（从小到大）
 * - desc: 降序（从大到小）
 */
export type SortOrder = 'asc' | 'desc'

/**
 * 排序配置接口
 */
export interface SortConfig {
  /** 排序字段 */
  field: SortField
  /** 排序方向 */
  order: SortOrder
}

/**
 * 可排序记录接口
 * 定义了排序所需的基本字段
 */
export interface SortableRecord {
  /** 金额 */
  amount: number
  /** 数量 */
  quantity: number
  /** 工作日期（格式：YYYY-MM-DD） */
  work_date: string
  /** 其他可选字段 */
  [key: string]: any
}

/**
 * 排序选项接口
 * 用于 UI 显示
 */
export interface SortOption {
  /** 排序字段 */
  field: SortField
  /** 显示标签 */
  label: string
  /** 图标（可选） */
  icon?: string
}

// ==================== 常量定义 ====================

/**
 * 默认排序选项列表
 * Requirements: 4.1 - 显示排序选项（按金额/按数量/按日期）
 */
export const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { field: 'amount', label: '按金额', icon: '💰' },
  { field: 'quantity', label: '按数量', icon: '📦' },
  { field: 'date', label: '按日期', icon: '📅' },
]

/**
 * 默认排序配置
 * 默认按日期降序排序（最新的在前面）
 */
export const DEFAULT_SORT_CONFIG: SortConfig = {
  field: 'date',
  order: 'desc',
}

// ==================== 排序函数 ====================

/**
 * 比较两个值的大小
 * 
 * @param a - 第一个值
 * @param b - 第二个值
 * @param order - 排序方向
 * @returns 比较结果：负数表示 a < b，正数表示 a > b，0 表示相等
 */
function compareValues(a: number | string, b: number | string, order: SortOrder): number {
  // 处理数字比较
  if (typeof a === 'number' && typeof b === 'number') {
    const diff = a - b
    return order === 'asc' ? diff : -diff
  }
  
  // 处理字符串比较（主要用于日期）
  if (typeof a === 'string' && typeof b === 'string') {
    const comparison = a.localeCompare(b)
    return order === 'asc' ? comparison : -comparison
  }
  
  // 类型不一致时，返回 0
  return 0
}

/**
 * 获取记录的排序值
 * 
 * @param record - 记录对象
 * @param field - 排序字段
 * @returns 排序值
 */
function getSortValue(record: SortableRecord, field: SortField): number | string {
  switch (field) {
    case 'amount':
      return record.amount ?? 0
    case 'quantity':
      return record.quantity ?? 0
    case 'date':
      return record.work_date ?? ''
    default:
      return 0
  }
}

/**
 * 对记录列表进行排序
 * Requirements: 4.2 - 按选定方式重新排列记录列表
 * 
 * @param records - 记录列表
 * @param config - 排序配置
 * @returns 排序后的记录列表（新数组，不修改原数组）
 * 
 * @example
 * ```typescript
 * const records = [
 *   { amount: 100, quantity: 10, work_date: '2024-01-01' },
 *   { amount: 200, quantity: 5, work_date: '2024-01-02' },
 * ]
 * 
 * // 按金额降序排序
 * const sorted = sortRecords(records, { field: 'amount', order: 'desc' })
 * // 结果: [{ amount: 200, ... }, { amount: 100, ... }]
 * ```
 */
export function sortRecords<T extends SortableRecord>(
  records: T[],
  config: SortConfig
): T[] {
  // 创建新数组，避免修改原数组
  const sortedRecords = [...records]
  
  // 使用 Array.sort 进行排序
  sortedRecords.sort((a, b) => {
    const valueA = getSortValue(a, config.field)
    const valueB = getSortValue(b, config.field)
    return compareValues(valueA, valueB, config.order)
  })
  
  return sortedRecords
}

/**
 * 切换排序方向
 * Requirements: 4.3 - 切换升序/降序
 * 
 * @param currentOrder - 当前排序方向
 * @returns 切换后的排序方向
 * 
 * @example
 * ```typescript
 * toggleSortOrder('asc')  // 返回 'desc'
 * toggleSortOrder('desc') // 返回 'asc'
 * ```
 */
export function toggleSortOrder(currentOrder: SortOrder): SortOrder {
  return currentOrder === 'asc' ? 'desc' : 'asc'
}

/**
 * 获取排序方向的显示文本
 * 
 * @param order - 排序方向
 * @returns 显示文本
 */
export function getSortOrderLabel(order: SortOrder): string {
  return order === 'asc' ? '升序' : '降序'
}

/**
 * 获取排序方向的图标
 * 
 * @param order - 排序方向
 * @returns 图标字符
 */
export function getSortOrderIcon(order: SortOrder): string {
  return order === 'asc' ? '↑' : '↓'
}

/**
 * 创建排序配置
 * 
 * @param field - 排序字段
 * @param order - 排序方向（可选，默认降序）
 * @returns 排序配置对象
 */
export function createSortConfig(field: SortField, order: SortOrder = 'desc'): SortConfig {
  return { field, order }
}

/**
 * 检查两个排序配置是否相同
 * 
 * @param config1 - 第一个配置
 * @param config2 - 第二个配置
 * @returns 是否相同
 */
export function isSameSortConfig(config1: SortConfig, config2: SortConfig): boolean {
  return config1.field === config2.field && config1.order === config2.order
}

/**
 * 多字段排序函数
 * 支持按多个字段依次排序，当第一个字段相等时使用第二个字段排序
 * 
 * @param records - 记录列表
 * @param configs - 排序配置数组（按优先级排列）
 * @returns 排序后的记录列表
 * 
 * @example
 * ```typescript
 * // 先按日期降序，日期相同时按金额降序
 * const sorted = sortRecordsMultiple(records, [
 *   { field: 'date', order: 'desc' },
 *   { field: 'amount', order: 'desc' },
 * ])
 * ```
 */
export function sortRecordsMultiple<T extends SortableRecord>(
  records: T[],
  configs: SortConfig[]
): T[] {
  // 如果没有排序配置，返回原数组的副本
  if (configs.length === 0) {
    return [...records]
  }
  
  // 创建新数组，避免修改原数组
  const sortedRecords = [...records]
  
  // 使用多字段比较
  sortedRecords.sort((a, b) => {
    for (const config of configs) {
      const valueA = getSortValue(a, config.field)
      const valueB = getSortValue(b, config.field)
      const comparison = compareValues(valueA, valueB, config.order)
      
      // 如果当前字段不相等，返回比较结果
      if (comparison !== 0) {
        return comparison
      }
      // 如果相等，继续比较下一个字段
    }
    
    // 所有字段都相等
    return 0
  })
  
  return sortedRecords
}
