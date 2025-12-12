/**
 * 用户API缓存包装
 * 为用户相关API添加缓存支持
 */

import {cachedAPI, CacheKeys, clearUserCache, userCache} from '@/utils/apiCache'
import * as usersAPI from './users'

/**
 * 获取所有用户（带缓存）
 */
export const getAllUsers = cachedAPI(usersAPI.getAllUsers, userCache, () => CacheKeys.userList())

/**
 * 获取所有司机（带缓存）
 */
export const getAllDrivers = cachedAPI(usersAPI.getAllDrivers, userCache, () => CacheKeys.userList('DRIVER'))

/**
 * 获取所有司机（包含实名，带缓存）
 */
export const getAllDriversWithRealName = cachedAPI(
  usersAPI.getAllDriversWithRealName,
  userCache,
  () => CacheKeys.userList('DRIVER') + ':realname'
)

/**
 * 获取所有管理员（带缓存）
 */
export const getAllManagers = cachedAPI(usersAPI.getAllManagers, userCache, () => CacheKeys.userList('MANAGER'))

/**
 * 获取所有老板（带缓存）
 */
export const getAllSuperAdmins = cachedAPI(usersAPI.getAllSuperAdmins, userCache, () => CacheKeys.userList('BOSS'))

/**
 * 根据ID获取用户（带缓存）
 */
export const getUserById = cachedAPI(usersAPI.getUserById, userCache, (userId: string) => CacheKeys.userById(userId))

/**
 * 根据ID获取用户档案（带缓存）
 */
export const getProfileById = cachedAPI(
  usersAPI.getProfileById,
  userCache,
  (userId: string) => CacheKeys.userById(userId) + ':profile'
)

/**
 * 获取用户角色（带缓存）
 */
export const getUserRoles = cachedAPI(usersAPI.getUserRoles, userCache, (userId: string) => CacheKeys.userRoles(userId))

/**
 * 获取管理员权限（带缓存）
 */
export const getManagerPermission = cachedAPI(
  usersAPI.getManagerPermission,
  userCache,
  (managerId: string) => CacheKeys.managerPermission(managerId)
)

/**
 * 更新用户信息（清除缓存）
 */
export async function updateUserProfile(
  userId: string,
  updates: Parameters<typeof usersAPI.updateUserProfile>[1]
): ReturnType<typeof usersAPI.updateUserProfile> {
  const result = await usersAPI.updateUserProfile(userId, updates)
  if (result.success) {
    clearUserCache(userId)
    // 清除用户列表缓存
    userCache.delete(CacheKeys.userList())
  }
  return result
}

/**
 * 更新用户角色（清除缓存）
 */
export async function updateUserRole(
  userId: string,
  role: Parameters<typeof usersAPI.updateUserRole>[1]
): ReturnType<typeof usersAPI.updateUserRole> {
  const result = await usersAPI.updateUserRole(userId, role)
  if (result) {
    clearUserCache(userId)
    // 清除用户列表缓存
    userCache.delete(CacheKeys.userList())
  }
  return result
}

/**
 * 更新用户完整信息（清除缓存）
 */
export async function updateUserInfo(
  userId: string,
  updates: Parameters<typeof usersAPI.updateUserInfo>[1]
): ReturnType<typeof usersAPI.updateUserInfo> {
  const result = await usersAPI.updateUserInfo(userId, updates)
  if (result) {
    clearUserCache(userId)
    // 清除用户列表缓存
    userCache.delete(CacheKeys.userList())
  }
  return result
}

/**
 * 创建用户（清除缓存）
 */
export async function createUser(
  phone: string,
  name: string,
  role: 'DRIVER' | 'MANAGER',
  driverType?: 'pure' | 'with_vehicle'
): ReturnType<typeof usersAPI.createUser> {
  const result = await usersAPI.createUser(phone, name, role, driverType)
  if (result) {
    // 清除用户列表缓存
    userCache.delete(CacheKeys.userList())
    userCache.delete(CacheKeys.userList(role))
  }
  return result
}

/**
 * 创建司机（清除缓存）
 */
export async function createDriver(
  phone: string,
  name: string,
  driverType?: 'pure' | 'with_vehicle'
): ReturnType<typeof usersAPI.createDriver> {
  const result = await usersAPI.createDriver(phone, name, driverType)
  if (result) {
    // 清除用户列表缓存
    userCache.delete(CacheKeys.userList())
    userCache.delete(CacheKeys.userList('DRIVER'))
  }
  return result
}

// 导出其他不需要缓存的API
export {
  getCurrentUserProfile,
  getCurrentUserWithRealName,
  getCurrentUserRole,
  getCurrentUserRoleAndTenant,
  getCurrentUserPermissions,
  getAllProfiles,
  getDriverProfiles,
  getAllDriverIds,
  getManagerProfiles,
  getManagerWarehouseIds,
  upsertManagerPermission,
  updateManagerPermissionsEnabled,
  getManagerPermissionsEnabled,
  updateProfile,
  changePassword,
  resetUserPassword,
  uploadAvatar,
  getDriverStats,
  getManagerStats,
  getSuperAdminStats
} from './users'
