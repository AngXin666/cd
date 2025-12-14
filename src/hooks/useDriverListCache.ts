/**
 * 车队长端司机列表缓存 Hook
 * 基于 useUserListCache，添加仓库过滤逻辑
 * 只返回司机角色的用户
 *
 * @module hooks/useDriverListCache
 * @feature user-list-cache-optimization
 */

import {useMemo} from 'react'
import {useUserListCache} from './useUserListCache'

/**
 * 车队长端司机列表缓存 Hook
 * 基于 useUserListCache 实现，自动过滤出司机角色
 *
 * @example
 * ```typescript
 * const {drivers, userDetails, userWarehouseIdsMap, loading, refresh, clearCache} = useDriverListCache()
 *
 * // 添加司机后刷新
 * const handleAddDriver = async () => {
 *   await UsersAPI.createUser(...)
 *   clearCache()
 *   await refresh()
 * }
 * ```
 *
 * @returns Hook 返回值，包含过滤后的司机列表
 */
export function useDriverListCache() {
  // 使用通用用户列表缓存 Hook
  const {users, userDetails, userWarehouseIdsMap, loading, error, fromCache, refresh, clearCache} = useUserListCache()

  // 过滤出司机角色的用户
  const drivers = useMemo(() => users.filter((u) => u.role === 'DRIVER'), [users])

  return {
    /** 司机列表（只包含 DRIVER 角色） */
    drivers,
    /** 用户详情映射 */
    userDetails,
    /** 用户仓库映射 */
    userWarehouseIdsMap,
    /** 加载状态 */
    loading,
    /** 错误信息 */
    error,
    /** 是否来自缓存 */
    fromCache,
    /** 刷新数据（强制重新加载） */
    refresh,
    /** 清除缓存 */
    clearCache
  }
}
