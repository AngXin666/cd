/**
 * 用户列表缓存 Hook
 * 提供用户列表的加载、缓存和实时更新功能
 * 基于通用缓存 Hook 实现
 *
 * 注意：缓存由 Repository 层统一管理（UsersRepository，TTL: 5分钟）
 * 此 Hook 主要负责实时更新监听和状态管理
 *
 * @module hooks/useUserListCache
 * @feature user-list-cache-optimization
 */

import {useMemo} from 'react'
import * as UsersAPI from '@/db/api/users'
import * as VehiclesAPI from '@/db/api/vehicles'
import * as WarehousesAPI from '@/db/api/warehouses'
import type {Profile} from '@/db/types'
import {CACHE_KEYS} from '@/utils/cacheManager'
import {useDataCache} from './useDataCache'

/**
 * 扩展用户类型，包含真实姓名
 */
export interface UserWithRealName extends Profile {
  real_name?: string
  login_account?: string
}

/**
 * 司机详细信息类型
 */
type DriverDetailInfo = Awaited<ReturnType<typeof VehiclesAPI.getDriverDetailInfo>>

/**
 * 用户列表缓存数据结构
 */
interface UserListCacheData {
  /** 用户列表 */
  users: UserWithRealName[]
  /** 用户详情映射 */
  userDetails: Record<string, DriverDetailInfo>
  /** 用户仓库映射 */
  userWarehouses: Record<string, string[]>
}

/**
 * 用户列表缓存 Hook
 * 基于通用缓存 Hook 实现
 *
 * 缓存策略：
 * - Repository 层（UsersRepository）：TTL 5 分钟
 * - Hooks 层：禁用缓存，由 Repository 统一管理
 *
 * @example
 * ```typescript
 * const {users, userDetails, userWarehouseIdsMap, loading, refresh, clearCache} = useUserListCache()
 *
 * // 添加用户后刷新
 * const handleAddUser = async () => {
 *   await UsersAPI.createUser(...)
 *   clearCache()
 *   await refresh()
 * }
 * ```
 */
export function useUserListCache() {
  // 使用通用缓存 Hook 加载用户列表数据
  const {data, loading, error, fromCache, refresh, clearCache} = useDataCache<UserListCacheData>({
    cacheKey: CACHE_KEYS.SUPER_ADMIN_USERS,
    loadData: async () => {
      const users = await UsersAPI.getAllUsers()
      const allWarehouses = await WarehousesAPI.getAllWarehouses()

      // 批量并行加载详细信息
      const userDataPromises = users.map(async (u) => {
        let assignments: {warehouse_id: string}[] = []

        if (u.role === 'DRIVER') {
          assignments = await WarehousesAPI.getWarehouseAssignmentsByDriver(u.id)
        } else if (u.role === 'MANAGER' || u.role === 'BOSS') {
          assignments = await WarehousesAPI.getWarehouseAssignmentsByManager(u.id)
        }

        const [license, detail] = await Promise.all([
          u.role === 'DRIVER' ? VehiclesAPI.getDriverLicense(u.id) : Promise.resolve(null),
          u.role === 'DRIVER' ? VehiclesAPI.getDriverDetailInfo(u.id) : Promise.resolve(null)
        ])

        return {
          user: {
            ...u,
            real_name: license?.id_card_name || u.name
          },
          detail,
          warehouses: allWarehouses.filter((w) => assignments.some((a) => a.warehouse_id === w.id))
        }
      })

      const userDataResults = await Promise.all(userDataPromises)

      const usersWithRealName = userDataResults.map((r) => r.user)
      const details = new Map<string, DriverDetailInfo>()
      const warehouseIds = new Map<string, string[]>()

      userDataResults.forEach((result) => {
        if (result.detail) {
          details.set(result.user.id, result.detail)
        }
        if (result.warehouses.length > 0) {
          warehouseIds.set(
            result.user.id,
            result.warehouses.map((w) => w.id)
          )
        }
      })

      return {
        users: usersWithRealName,
        userDetails: Object.fromEntries(details),
        userWarehouses: Object.fromEntries(warehouseIds)
      }
    },
    realtimeTables: ['users', 'warehouse_assignments', 'vehicles'],
    cacheEnabled: false, // 禁用 Hooks 层缓存，由 Repository 层统一管理
    cacheTTL: 30 * 60 * 1000 // 30 分钟（仅作为备用，实际不使用）
  })

  // 转换数据格式
  const users = useMemo(() => data?.users || [], [data])
  const userDetails = useMemo(() => (data?.userDetails ? new Map(Object.entries(data.userDetails)) : new Map()), [data])
  const userWarehouseIdsMap = useMemo(
    () => (data?.userWarehouses ? new Map(Object.entries(data.userWarehouses)) : new Map()),
    [data]
  )

  return {
    users,
    userDetails,
    userWarehouseIdsMap,
    loading,
    error,
    fromCache,
    refresh,
    clearCache
  }
}
