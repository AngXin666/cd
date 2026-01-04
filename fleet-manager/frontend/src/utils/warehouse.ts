/**
 * 仓库过滤工具函数
 * 提供统一的仓库过滤逻辑，用于仓库切换器的显示控制
 * 
 * @module utils/warehouse
 * @requirements 1.1-1.3, 2.1-2.3, 3.1-3.4, 5.1-5.3, 6.1-6.4
 */

import type { Warehouse, User } from '@/api/types'
import { UserRole } from '@/api/types'

// ==================== 类型定义 ====================

/**
 * 仓库过滤选项
 * 用于配置仓库过滤函数的参数
 */
export interface WarehouseFilterOptions {
  /** 仓库列表 */
  warehouses: Warehouse[]
  /** 仓库数据映射 (warehouseId -> hasData) */
  warehouseDataMap?: Map<number, boolean>
  /** 用户仓库分配映射 (userId -> warehouseIds[]) */
  userWarehouseIdsMap?: Map<number, number[]>
  /** 用户列表（用于统计司机数量） */
  users?: User[]
  /** 角色过滤（用于统计特定角色的用户） */
  roleFilter?: UserRole
  /** 仓库司机数量映射 (warehouseId -> driverCount)，直接提供司机数量 */
  warehouseDriverCountMap?: Map<number, number>
  /** 仓库今日件数映射 (warehouseId -> todayPieceCount)，用于排序 */
  warehouseTodayPieceCountMap?: Map<number, number>
  /** 仓库今日出勤映射 (warehouseId -> todayAttendanceCount)，用于排序 */
  warehouseTodayAttendanceMap?: Map<number, number>
  /** 排序方式：'todayPieceCount' 按今日件数 | 'todayAttendance' 按今日出勤 */
  sortBy?: 'todayPieceCount' | 'todayAttendance'
}

// ==================== 核心过滤函数 ====================

/**
 * 过滤有数据的仓库
 * 用于司机端首页、计件记录等页面
 * 支持按今日件数排序（从多到少）
 * 
 * @param options - 过滤选项
 * @returns 有数据的仓库列表（已排序）
 * 
 * @example
 * const validWarehouses = filterWarehousesWithData({
 *   warehouses: allWarehouses,
 *   warehouseDataMap: new Map([[1, true], [2, false]]),
 *   warehouseTodayPieceCountMap: new Map([[1, 100], [2, 50]]),
 *   sortBy: 'todayPieceCount',
 * })
 * 
 * @requirements 2.1, 2.2, 2.3
 */
export function filterWarehousesWithData(options: WarehouseFilterOptions): Warehouse[] {
  const { warehouses, warehouseDataMap, warehouseTodayPieceCountMap, sortBy } = options
  
  // 如果没有数据映射，返回空数组（没有数据的仓库不显示）
  if (!warehouseDataMap || warehouseDataMap.size === 0) {
    return []
  }
  
  const filtered = warehouses.filter(warehouse => {
    return warehouseDataMap.get(warehouse.id) === true
  })
  
  // 按今日件数排序（从多到少）
  if (sortBy === 'todayPieceCount' && warehouseTodayPieceCountMap) {
    filtered.sort((a, b) => {
      const countA = warehouseTodayPieceCountMap.get(a.id) || 0
      const countB = warehouseTodayPieceCountMap.get(b.id) || 0
      return countB - countA // 降序
    })
  }
  
  return filtered
}

/**
 * 过滤有司机的仓库
 * 用于用户管理页面、司机管理页面
 * 
 * @param options - 过滤选项
 * @returns 有司机的仓库列表
 * 
 * @example
 * const validWarehouses = filterWarehousesWithDrivers({
 *   warehouses: allWarehouses,
 *   userWarehouseIdsMap: userWarehouseMap,
 *   users: allUsers,
 *   roleFilter: UserRole.DRIVER,
 * })
 * 
 * @requirements 5.1, 5.2
 */
export function filterWarehousesWithDrivers(options: WarehouseFilterOptions): Warehouse[] {
  const { warehouses, userWarehouseIdsMap, users, roleFilter } = options
  
  // 如果没有用户数据，返回空数组
  if (!users || users.length === 0) {
    return []
  }
  
  // 计算每个仓库的司机数量
  const warehouseDriverCounts = new Map<number, number>()
  
  for (const user of users) {
    // 如果指定了角色过滤，只统计该角色的用户
    if (roleFilter && user.role !== roleFilter) {
      continue
    }
    
    // 获取用户分配的仓库列表
    const userWarehouseIds = userWarehouseIdsMap?.get(user.id) || []
    
    for (const warehouseId of userWarehouseIds) {
      const count = warehouseDriverCounts.get(warehouseId) || 0
      warehouseDriverCounts.set(warehouseId, count + 1)
    }
  }
  
  // 过滤有司机的仓库
  return warehouses.filter(warehouse => {
    const count = warehouseDriverCounts.get(warehouse.id) || 0
    return count > 0
  })
}

/**
 * 过滤有数据或有司机的仓库
 * 用于车队长/老板端首页、考勤管理等页面
 * 支持按今日件数或今日出勤排序（从多到少）
 * 
 * @param options - 过滤选项
 * @returns 有数据或有司机的仓库列表（已排序）
 * 
 * @example
 * const validWarehouses = filterWarehousesWithDataOrDrivers({
 *   warehouses: allWarehouses,
 *   warehouseDataMap: dataMap,
 *   userWarehouseIdsMap: userWarehouseMap,
 *   users: allUsers,
 *   roleFilter: UserRole.DRIVER,
 *   warehouseTodayPieceCountMap: pieceCountMap,
 *   sortBy: 'todayPieceCount',
 * })
 * 
 * @requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4
 */
export function filterWarehousesWithDataOrDrivers(options: WarehouseFilterOptions): Warehouse[] {
  const { 
    warehouses, warehouseDataMap, userWarehouseIdsMap, users, roleFilter, 
    warehouseDriverCountMap, warehouseTodayPieceCountMap, warehouseTodayAttendanceMap, sortBy 
  } = options
  
  // 计算每个仓库的司机数量
  // 优先使用直接提供的 warehouseDriverCountMap
  let driverCounts: Map<number, number>
  
  if (warehouseDriverCountMap && warehouseDriverCountMap.size > 0) {
    // 直接使用提供的司机数量映射
    driverCounts = warehouseDriverCountMap
  } else if (users && users.length > 0) {
    // 从用户列表计算司机数量
    driverCounts = new Map<number, number>()
    
    for (const user of users) {
      // 如果指定了角色过滤，只统计该角色的用户
      if (roleFilter && user.role !== roleFilter) {
        continue
      }
      
      // 获取用户分配的仓库列表
      const userWarehouseIds = userWarehouseIdsMap?.get(user.id) || []
      
      for (const warehouseId of userWarehouseIds) {
        const count = driverCounts.get(warehouseId) || 0
        driverCounts.set(warehouseId, count + 1)
      }
    }
  } else {
    // 没有司机数据
    driverCounts = new Map<number, number>()
  }
  
  // 过滤有数据或有司机的仓库
  const filtered = warehouses.filter(warehouse => {
    const hasData = warehouseDataMap?.get(warehouse.id) === true
    const hasDrivers = (driverCounts.get(warehouse.id) || 0) > 0
    return hasData || hasDrivers
  })
  
  // 按指定方式排序（从多到少）
  if (sortBy === 'todayPieceCount' && warehouseTodayPieceCountMap) {
    filtered.sort((a, b) => {
      const countA = warehouseTodayPieceCountMap.get(a.id) || 0
      const countB = warehouseTodayPieceCountMap.get(b.id) || 0
      return countB - countA // 降序
    })
  } else if (sortBy === 'todayAttendance' && warehouseTodayAttendanceMap) {
    filtered.sort((a, b) => {
      const countA = warehouseTodayAttendanceMap.get(a.id) || 0
      const countB = warehouseTodayAttendanceMap.get(b.id) || 0
      return countB - countA // 降序
    })
  }
  
  return filtered
}

// ==================== 辅助函数 ====================

/**
 * 判断是否应该显示仓库切换器
 * 只有当有效仓库数量大于1时才显示
 * 
 * @param filteredWarehouses - 过滤后的仓库列表
 * @returns 是否显示切换器
 * 
 * @example
 * const showSwitcher = shouldShowWarehouseSwitcher(validWarehouses)
 * 
 * @requirements 1.1, 1.2, 1.3
 */
export function shouldShowWarehouseSwitcher(filteredWarehouses: Warehouse[]): boolean {
  return filteredWarehouses.length > 1
}

/**
 * 获取仓库的司机数量
 * 
 * @param warehouseId - 仓库ID
 * @param options - 过滤选项
 * @returns 司机数量
 * 
 * @example
 * const count = getWarehouseDriverCount(1, {
 *   userWarehouseIdsMap: userWarehouseMap,
 *   users: allUsers,
 *   roleFilter: UserRole.DRIVER,
 * })
 */
export function getWarehouseDriverCount(
  warehouseId: number,
  options: Pick<WarehouseFilterOptions, 'userWarehouseIdsMap' | 'users' | 'roleFilter'>
): number {
  const { userWarehouseIdsMap, users, roleFilter } = options
  
  if (!users || users.length === 0) {
    return 0
  }
  
  let count = 0
  
  for (const user of users) {
    // 如果指定了角色过滤，只统计该角色的用户
    if (roleFilter && user.role !== roleFilter) {
      continue
    }
    
    // 获取用户分配的仓库列表
    const userWarehouseIds = userWarehouseIdsMap?.get(user.id) || []
    
    if (userWarehouseIds.includes(warehouseId)) {
      count++
    }
  }
  
  return count
}

/**
 * 获取未分配仓库的用户数量
 * 
 * @param options - 过滤选项
 * @returns 未分配仓库的用户数量
 * 
 * @example
 * const count = getUnassignedUserCount({
 *   userWarehouseIdsMap: userWarehouseMap,
 *   users: allUsers,
 *   roleFilter: UserRole.DRIVER,
 * })
 * 
 * @requirements 5.3
 */
export function getUnassignedUserCount(
  options: Pick<WarehouseFilterOptions, 'userWarehouseIdsMap' | 'users' | 'roleFilter'>
): number {
  const { userWarehouseIdsMap, users, roleFilter } = options
  
  if (!users || users.length === 0) {
    return 0
  }
  
  let count = 0
  
  for (const user of users) {
    // 如果指定了角色过滤，只统计该角色的用户
    if (roleFilter && user.role !== roleFilter) {
      continue
    }
    
    // 获取用户分配的仓库列表
    const userWarehouseIds = userWarehouseIdsMap?.get(user.id) || []
    
    // 如果用户没有分配任何仓库
    if (userWarehouseIds.length === 0) {
      count++
    }
  }
  
  return count
}

/**
 * 创建仓库数据映射
 * 根据数据记录创建仓库ID到是否有数据的映射
 * 
 * @param records - 数据记录列表（需要有 warehouse_id 字段）
 * @returns 仓库数据映射
 * 
 * @example
 * const dataMap = createWarehouseDataMap(pieceWorkRecords)
 */
export function createWarehouseDataMap<T extends { warehouse_id?: number | null }>(
  records: T[]
): Map<number, boolean> {
  const dataMap = new Map<number, boolean>()
  
  for (const record of records) {
    if (record.warehouse_id != null) {
      dataMap.set(record.warehouse_id, true)
    }
  }
  
  return dataMap
}
