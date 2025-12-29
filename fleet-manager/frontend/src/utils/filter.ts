/**
 * 筛选工具函数模块
 * 提供计件记录的仓库筛选、日期排序、角色权限过滤等功能
 * 
 * @module utils/filter
 */

import type { PieceWorkRecord, Warehouse, User } from '@/api/types'
import { UserRole } from '@/api/types'

/**
 * 根据仓库 ID 筛选计件记录
 * 
 * Requirements: 2.4 - 仓库筛选过滤
 * 
 * @param records - 计件记录列表
 * @param warehouseId - 仓库 ID，null 表示不筛选（返回全部）
 * @returns 筛选后的记录列表
 * 
 * @example
 * ```typescript
 * // 筛选仓库 ID 为 1 的记录
 * const filtered = filterByWarehouse(records, 1)
 * 
 * // 不筛选，返回全部
 * const all = filterByWarehouse(records, null)
 * ```
 */
export function filterByWarehouse(
  records: PieceWorkRecord[],
  warehouseId: number | null
): PieceWorkRecord[] {
  // 如果 warehouseId 为 null，返回全部记录
  if (warehouseId === null) {
    return records
  }
  
  // 筛选指定仓库的记录
  return records.filter(record => record.warehouse_id === warehouseId)
}

/**
 * 排序顺序类型
 */
export type SortOrder = 'asc' | 'desc'

/**
 * 根据日期排序计件记录
 * 
 * Requirements: 2.5 - 日期排序
 * 
 * @param records - 计件记录列表
 * @param order - 排序顺序，'asc' 升序（最早在前），'desc' 降序（最新在前）
 * @returns 排序后的记录列表（新数组，不修改原数组）
 * 
 * @example
 * ```typescript
 * // 按日期降序排序（最新在前）
 * const sorted = sortByDate(records, 'desc')
 * 
 * // 按日期升序排序（最早在前）
 * const sorted = sortByDate(records, 'asc')
 * ```
 */
export function sortByDate(
  records: PieceWorkRecord[],
  order: SortOrder
): PieceWorkRecord[] {
  // 创建新数组，避免修改原数组
  const sorted = [...records]
  
  sorted.sort((a, b) => {
    const dateA = new Date(a.work_date).getTime()
    const dateB = new Date(b.work_date).getTime()
    
    // 降序：最新的在前面；升序：最早的在前面
    return order === 'desc' ? dateB - dateA : dateA - dateB
  })
  
  return sorted
}


/**
 * 仓库分配信息接口
 * 用于表示用户与仓库的关联关系
 */
export interface WarehouseAssignment {
  /** 用户 ID */
  userId: number
  /** 仓库 ID */
  warehouseId: number
}

/**
 * 根据用户角色过滤仓库列表
 * 
 * Requirements: 3.9, 3.10 - 角色权限过滤
 * - 老板和超级管理员可以看到所有仓库
 * - 车队长只能看到管辖的仓库
 * - 调度员可以看到所有仓库
 * - 司机只能看到分配给自己的仓库
 * 
 * @param warehouses - 所有仓库列表
 * @param user - 当前用户信息
 * @param assignments - 仓库分配关系列表（用户与仓库的关联）
 * @returns 过滤后的仓库列表
 * 
 * @example
 * ```typescript
 * // 老板可以看到所有仓库
 * const bossWarehouses = filterWarehousesByRole(allWarehouses, bossUser, assignments)
 * // bossWarehouses.length === allWarehouses.length
 * 
 * // 车队长只能看到管辖的仓库
 * const managerWarehouses = filterWarehousesByRole(allWarehouses, managerUser, assignments)
 * // managerWarehouses 只包含分配给该车队长的仓库
 * ```
 */
export function filterWarehousesByRole(
  warehouses: Warehouse[],
  user: User,
  assignments: WarehouseAssignment[]
): Warehouse[] {
  // 老板、超级管理员、调度员可以看到所有仓库
  // Requirements: 3.9
  if (
    user.role === UserRole.BOSS ||
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.PEER_ADMIN
  ) {
    return warehouses
  }
  
  // 车队长只能看到管辖的仓库
  // Requirements: 3.10
  if (user.role === UserRole.MANAGER) {
    // 获取该用户管辖的仓库 ID 列表
    const assignedWarehouseIds = new Set(
      assignments
        .filter(a => a.userId === user.id)
        .map(a => a.warehouseId)
    )
    
    // 过滤出分配给该用户的仓库
    return warehouses.filter(w => assignedWarehouseIds.has(w.id))
  }
  
  // 司机只能看到分配给自己的仓库
  if (user.role === UserRole.DRIVER) {
    // 获取该用户分配的仓库 ID 列表
    const assignedWarehouseIds = new Set(
      assignments
        .filter(a => a.userId === user.id)
        .map(a => a.warehouseId)
    )
    
    // 过滤出分配给该用户的仓库
    return warehouses.filter(w => assignedWarehouseIds.has(w.id))
  }
  
  // 其他角色默认返回空列表（安全默认值）
  return []
}

/**
 * 检查用户是否有权限访问指定仓库
 * 
 * @param warehouseId - 仓库 ID
 * @param user - 当前用户信息
 * @param assignments - 仓库分配关系列表
 * @returns 是否有权限访问
 * 
 * @example
 * ```typescript
 * // 检查车队长是否有权限访问仓库 1
 * const hasAccess = canAccessWarehouse(1, managerUser, assignments)
 * ```
 */
export function canAccessWarehouse(
  warehouseId: number,
  user: User,
  assignments: WarehouseAssignment[]
): boolean {
  // 老板、超级管理员、调度员可以访问所有仓库
  if (
    user.role === UserRole.BOSS ||
    user.role === UserRole.SUPER_ADMIN ||
    user.role === UserRole.PEER_ADMIN
  ) {
    return true
  }
  
  // 车队长和司机只能访问分配给自己的仓库
  if (user.role === UserRole.MANAGER || user.role === UserRole.DRIVER) {
    return assignments.some(
      a => a.userId === user.id && a.warehouseId === warehouseId
    )
  }
  
  // 其他角色默认无权限
  return false
}

/**
 * 品类统计数据接口
 * 用于表示按品类分组的统计结果
 */
export interface CategoryStat {
  /** 品类名称 */
  name: string
  /** 总件数 */
  quantity: number
  /** 总金额 */
  amount: number
}

/**
 * 按品类分组计算统计数据
 * 
 * Requirements: 3.7 - 品类统计计算
 * 
 * 遍历计件记录列表，按品类名称分组，累加每个品类的 quantity 和 amount。
 * 结果按金额降序排序。
 * 
 * @param records - 计件记录列表
 * @returns 按品类分组的统计数据列表，按金额降序排序
 * 
 * @example
 * ```typescript
 * const records = [
 *   { category_name: '水果', quantity: 10, amount: 100 },
 *   { category_name: '蔬菜', quantity: 20, amount: 200 },
 *   { category_name: '水果', quantity: 5, amount: 50 },
 * ]
 * const stats = calculateCategoryStats(records)
 * // stats = [
 * //   { name: '蔬菜', quantity: 20, amount: 200 },
 * //   { name: '水果', quantity: 15, amount: 150 },
 * // ]
 * ```
 */
export function calculateCategoryStats(records: PieceWorkRecord[]): CategoryStat[] {
  // 使用 Map 按品类名称分组
  const categoryMap = new Map<string, CategoryStat>()
  
  // 遍历所有记录，按品类累加统计
  records.forEach(record => {
    // 如果品类名称为空，使用"未分类"作为默认值
    const categoryName = record.category_name || '未分类'
    const existing = categoryMap.get(categoryName)
    
    if (existing) {
      // 累加到已有的统计数据
      existing.quantity += record.quantity
      existing.amount += record.amount
    } else {
      // 创建新的统计数据
      categoryMap.set(categoryName, {
        name: categoryName,
        quantity: record.quantity,
        amount: record.amount,
      })
    }
  })
  
  // 转换为数组并按金额降序排序
  return Array.from(categoryMap.values())
    .sort((a, b) => b.amount - a.amount)
}


/**
 * 带仓库信息的用户接口
 * 扩展 User 类型，添加仓库 ID 字段
 */
export interface UserWithWarehouse extends User {
  /** 所属仓库 ID */
  warehouse_id: number | null
}

/**
 * 根据仓库 ID 筛选司机列表
 * 
 * Requirements: 2.2 - 按仓库筛选司机
 * 
 * @param drivers - 司机列表（包含仓库信息）
 * @param warehouseId - 仓库 ID，null 表示不筛选（返回全部）
 * @returns 筛选后的司机列表
 * 
 * @example
 * ```typescript
 * // 筛选仓库 ID 为 1 的司机
 * const filtered = filterDriversByWarehouse(drivers, 1)
 * 
 * // 不筛选，返回全部司机
 * const all = filterDriversByWarehouse(drivers, null)
 * ```
 */
export function filterDriversByWarehouse(
  drivers: UserWithWarehouse[],
  warehouseId: number | null
): UserWithWarehouse[] {
  // 如果 warehouseId 为 null，返回全部司机 - Requirements 2.3
  if (warehouseId === null) {
    return drivers
  }
  
  // 筛选指定仓库的司机 - Requirements 2.2
  return drivers.filter(driver => driver.warehouse_id === warehouseId)
}

/**
 * 获取仓库的司机数量
 * 
 * @param drivers - 司机列表（包含仓库信息）
 * @param warehouseId - 仓库 ID，null 表示统计全部
 * @returns 司机数量
 * 
 * @example
 * ```typescript
 * // 获取仓库 ID 为 1 的司机数量
 * const count = getDriverCountByWarehouse(drivers, 1)
 * 
 * // 获取全部司机数量
 * const total = getDriverCountByWarehouse(drivers, null)
 * ```
 */
export function getDriverCountByWarehouse(
  drivers: UserWithWarehouse[],
  warehouseId: number | null
): number {
  return filterDriversByWarehouse(drivers, warehouseId).length
}
