/**
 * 仓库API缓存包装
 * 为仓库相关API添加缓存支持
 */

import {
  cachedAPI,
  CacheKeys,
  clearDriverWarehouseCache,
  clearManagerWarehouseCache,
  clearWarehouseCache,
  warehouseCache
} from '@/utils/apiCache'
import * as warehousesAPI from './warehouses'

/**
 * 获取所有启用的仓库（带缓存）
 */
export const getActiveWarehouses = cachedAPI(
  warehousesAPI.getActiveWarehouses,
  warehouseCache,
  () => CacheKeys.warehouseList(true),
  5 * 60 * 1000 // 5分钟
)

/**
 * 获取所有仓库（带缓存）
 */
export const getAllWarehouses = cachedAPI(
  warehousesAPI.getAllWarehouses,
  warehouseCache,
  () => CacheKeys.warehouseList(false),
  5 * 60 * 1000 // 5分钟
)

/**
 * 获取仓库详情（带缓存）
 */
export const getWarehouseById = cachedAPI(
  warehousesAPI.getWarehouseById,
  warehouseCache,
  (id: string) => CacheKeys.warehouseById(id),
  5 * 60 * 1000 // 5分钟
)

/**
 * 获取仓库详情（包含规则，带缓存）
 */
export const getWarehouseWithRule = cachedAPI(
  warehousesAPI.getWarehouseWithRule,
  warehouseCache,
  (id: string) => CacheKeys.warehouseWithRule(id),
  5 * 60 * 1000 // 5分钟
)

/**
 * 获取所有仓库及其考勤规则（带缓存）
 */
export const getWarehousesWithRules = cachedAPI(
  warehousesAPI.getWarehousesWithRules,
  warehouseCache,
  () => CacheKeys.warehouseList(true) + ':rules',
  5 * 60 * 1000 // 5分钟
)

/**
 * 获取所有仓库及其考勤规则（包括禁用的，带缓存）
 */
export const getAllWarehousesWithRules = cachedAPI(
  warehousesAPI.getAllWarehousesWithRules,
  warehouseCache,
  () => CacheKeys.warehouseList(false) + ':rules',
  5 * 60 * 1000 // 5分钟
)

/**
 * 获取司机的仓库列表（带缓存）
 */
export const getDriverWarehouses = cachedAPI(
  warehousesAPI.getDriverWarehouses,
  warehouseCache,
  (driverId: string) => CacheKeys.driverWarehouses(driverId),
  3 * 60 * 1000 // 3分钟
)

/**
 * 获取司机的仓库ID列表（带缓存）
 */
export const getDriverWarehouseIds = cachedAPI(
  warehousesAPI.getDriverWarehouseIds,
  warehouseCache,
  (driverId: string) => CacheKeys.driverWarehouseIds(driverId),
  3 * 60 * 1000 // 3分钟
)

/**
 * 获取仓库的司机列表（带缓存）
 */
export const getDriversByWarehouse = cachedAPI(
  warehousesAPI.getDriversByWarehouse,
  warehouseCache,
  (warehouseId: string) => CacheKeys.warehouseDrivers(warehouseId),
  3 * 60 * 1000 // 3分钟
)

/**
 * 获取管理员的仓库列表（带缓存）
 */
export const getManagerWarehouses = cachedAPI(
  warehousesAPI.getManagerWarehouses,
  warehouseCache,
  (managerId: string) => CacheKeys.managerWarehouses(managerId),
  3 * 60 * 1000 // 3分钟
)

/**
 * 获取仓库的管理员列表（带缓存）
 */
export const getWarehouseManagers = cachedAPI(
  warehousesAPI.getWarehouseManagers,
  warehouseCache,
  (warehouseId: string) => CacheKeys.warehouseManagers(warehouseId),
  3 * 60 * 1000 // 3分钟
)

/**
 * 获取仓库的品类详细信息（带缓存）
 */
export const getWarehouseCategoriesWithDetails = cachedAPI(
  warehousesAPI.getWarehouseCategoriesWithDetails,
  warehouseCache,
  (warehouseId: string) => CacheKeys.categories(warehouseId),
  10 * 60 * 1000 // 10分钟，品类数据变化较少
)

/**
 * 创建仓库（清除缓存）
 */
export async function createWarehouse(
  input: Parameters<typeof warehousesAPI.createWarehouse>[0]
): ReturnType<typeof warehousesAPI.createWarehouse> {
  const result = await warehousesAPI.createWarehouse(input)
  if (result) {
    // 清除仓库列表缓存
    warehouseCache.delete(CacheKeys.warehouseList(true))
    warehouseCache.delete(CacheKeys.warehouseList(false))
  }
  return result
}

/**
 * 更新仓库（清除缓存）
 */
export async function updateWarehouse(
  id: string,
  update: Parameters<typeof warehousesAPI.updateWarehouse>[1]
): ReturnType<typeof warehousesAPI.updateWarehouse> {
  const result = await warehousesAPI.updateWarehouse(id, update)
  if (result) {
    clearWarehouseCache(id)
    // 清除仓库列表缓存
    warehouseCache.delete(CacheKeys.warehouseList(true))
    warehouseCache.delete(CacheKeys.warehouseList(false))
  }
  return result
}

/**
 * 删除仓库（清除缓存）
 */
export async function deleteWarehouse(id: string): ReturnType<typeof warehousesAPI.deleteWarehouse> {
  const result = await warehousesAPI.deleteWarehouse(id)
  if (result) {
    clearWarehouseCache(id)
    // 清除仓库列表缓存
    warehouseCache.delete(CacheKeys.warehouseList(true))
    warehouseCache.delete(CacheKeys.warehouseList(false))
  }
  return result
}

/**
 * 为司机分配仓库（清除缓存）
 */
export async function assignWarehouseToDriver(
  input: Parameters<typeof warehousesAPI.assignWarehouseToDriver>[0]
): ReturnType<typeof warehousesAPI.assignWarehouseToDriver> {
  const result = await warehousesAPI.assignWarehouseToDriver(input)
  if (result.success) {
    clearDriverWarehouseCache(input.user_id)
    clearWarehouseCache(input.warehouse_id)
  }
  return result
}

/**
 * 取消司机的仓库分配（清除缓存）
 */
export async function removeWarehouseFromDriver(
  driverId: string,
  warehouseId: string
): ReturnType<typeof warehousesAPI.removeWarehouseFromDriver> {
  const result = await warehousesAPI.removeWarehouseFromDriver(driverId, warehouseId)
  if (result) {
    clearDriverWarehouseCache(driverId)
    clearWarehouseCache(warehouseId)
  }
  return result
}

/**
 * 批量设置司机的仓库（清除缓存）
 */
export async function setDriverWarehouses(
  driverId: string,
  warehouseIds: string[]
): ReturnType<typeof warehousesAPI.setDriverWarehouses> {
  const result = await warehousesAPI.setDriverWarehouses(driverId, warehouseIds)
  if (result) {
    clearDriverWarehouseCache(driverId)
    // 清除所有相关仓库的缓存
    warehouseIds.forEach((id) => clearWarehouseCache(id))
  }
  return result
}

/**
 * 批量设置管理员的仓库（清除缓存）
 */
export async function setManagerWarehouses(
  managerId: string,
  warehouseIds: string[]
): ReturnType<typeof warehousesAPI.setManagerWarehouses> {
  const result = await warehousesAPI.setManagerWarehouses(managerId, warehouseIds)
  if (result) {
    clearManagerWarehouseCache(managerId)
    // 清除所有相关仓库的缓存
    warehouseIds.forEach((id) => clearWarehouseCache(id))
  }
  return result
}

/**
 * 添加管理员仓库关联（清除缓存）
 */
export async function addManagerWarehouse(
  managerId: string,
  warehouseId: string
): ReturnType<typeof warehousesAPI.addManagerWarehouse> {
  const result = await warehousesAPI.addManagerWarehouse(managerId, warehouseId)
  if (result) {
    clearManagerWarehouseCache(managerId)
    clearWarehouseCache(warehouseId)
  }
  return result
}

/**
 * 删除管理员仓库关联（清除缓存）
 */
export async function removeManagerWarehouse(
  managerId: string,
  warehouseId: string
): ReturnType<typeof warehousesAPI.removeManagerWarehouse> {
  const result = await warehousesAPI.removeManagerWarehouse(managerId, warehouseId)
  if (result) {
    clearManagerWarehouseCache(managerId)
    clearWarehouseCache(warehouseId)
  }
  return result
}

// 导出其他不需要缓存的API
export {
  getAllDriverWarehouses,
  getWarehouseAssignmentsByDriver,
  getWarehouseAssignmentsByManager,
  deleteWarehouseAssignmentsByDriver,
  insertWarehouseAssignment,
  insertManagerWarehouseAssignment,
  getWarehouseDispatchersAndManagers,
  getWarehouseSettings,
  updateWarehouseSettings,
  getWarehouseDriverCount,
  getWarehouseManager,
  getWarehouseCategories,
  setWarehouseCategories,
  getDriverIdsByWarehouse
} from './warehouses'
