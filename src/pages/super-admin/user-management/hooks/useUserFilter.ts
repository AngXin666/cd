/**
 * 用户筛选逻辑 Hook
 *
 * @description 封装用户搜索、筛选、排序逻辑，支持拼音搜索
 * @module hooks/useUserFilter
 * @feature user-management-refactor
 *
 * @example
 * ```tsx
 * const {
 *   filteredUsers,    // 筛选后的用户列表
 *   searchKeyword,    // 当前搜索关键词
 *   setSearchKeyword, // 设置搜索关键词
 *   roleFilter,       // 当前角色筛选
 *   setRoleFilter     // 设置角色筛选
 * } = useUserFilter({
 *   users,
 *   initialRole: 'DRIVER',
 *   currentUserProfile,
 *   currentUserId: user?.id
 * })
 * ```
 */

import {useMemo, useState} from 'react'
import type {Profile, UserRole, Warehouse} from '@/db/types'
import {matchWithPinyin} from '@/utils/pinyin'
import type {UserWithRealName} from './useUserManagement'

/**
 * useUserFilter Hook的配置选项
 */
interface UseUserFilterOptions {
  /** 原始用户列表 */
  users: UserWithRealName[]
  /** 初始角色筛选，默认'all' */
  initialRole?: UserRole | 'all'
  /** 仓库列表（用于仓库筛选） */
  warehouses?: Warehouse[]
  /** 用户-仓库ID映射 */
  userWarehouseIdsMap?: Map<string, string[]>
  /** 当前登录用户的Profile */
  currentUserProfile?: Profile | null
  /** 当前登录用户ID */
  currentUserId?: string
}

/**
 * useUserFilter Hook的返回值类型
 */
export interface UseUserFilterReturn {
  /** 筛选后的用户列表 */
  filteredUsers: UserWithRealName[]
  /** 当前搜索关键词 */
  searchKeyword: string
  /** 当前角色筛选 */
  roleFilter: UserRole | 'all'
  /** 当前仓库索引 */
  currentWarehouseIndex: number

  /** 设置搜索关键词 */
  setSearchKeyword: (keyword: string) => void
  /** 设置角色筛选 */
  setRoleFilter: (role: UserRole | 'all') => void
  /** 设置当前仓库索引 */
  setCurrentWarehouseIndex: (index: number) => void
}

// 辅助函数：判断是否是管理员角色（boss）
const isAdminRole = (role: string | undefined) => {
  return role === 'BOSS'
}

export const useUserFilter = ({
  users,
  initialRole = 'all',
  warehouses = [],
  userWarehouseIdsMap = new Map(),
  currentUserProfile,
  currentUserId
}: UseUserFilterOptions): UseUserFilterReturn => {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>(initialRole)
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState(0)

  // 筛选用户
  const filteredUsers = useMemo(() => {
    let filtered = users

    // 角色过滤
    if (roleFilter !== 'all') {
      if (roleFilter === 'MANAGER') {
        // 判断当前登录用户是主账号还是平级账号
        const isMainAccount = currentUserProfile?.main_account_id === null
        const isPeerAccount = currentUserProfile?.main_account_id !== null

        if (isMainAccount) {
          // 主账号登录：显示车队长 + 平级账号（不显示自己）
          filtered = filtered.filter((u) => {
            if (u.role === 'MANAGER') return true
            if (isAdminRole(u.role) && u.main_account_id !== null && u.id !== currentUserId) return true
            return false
          })
        } else if (isPeerAccount) {
          // 平级账号登录：只显示车队长
          filtered = filtered.filter((u) => u.role === 'MANAGER')
        } else {
          // 其他情况：只显示车队长
          filtered = filtered.filter((u) => u.role === 'MANAGER')
        }
      } else {
        filtered = filtered.filter((u) => u.role === roleFilter)
      }
    }

    // 仓库过滤
    if (warehouses.length > 0 && warehouses[currentWarehouseIndex]) {
      const currentWarehouseId = warehouses[currentWarehouseIndex].id
      filtered = filtered.filter((u) => {
        const userWarehouseIds = userWarehouseIdsMap.get(u.id) || []
        return userWarehouseIds.includes(currentWarehouseId) || userWarehouseIds.length === 0
      })
    }

    // 关键词过滤
    if (searchKeyword.trim()) {
      filtered = filtered.filter((u) => {
        const name = u.name || ''
        const realName = u.real_name || ''
        const phone = u.phone || ''
        const email = u.email || ''
        return (
          matchWithPinyin(name, searchKeyword) ||
          matchWithPinyin(realName, searchKeyword) ||
          phone.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          email.toLowerCase().includes(searchKeyword.toLowerCase())
        )
      })
    }

    return filtered
  }, [
    users,
    roleFilter,
    searchKeyword,
    warehouses,
    currentWarehouseIndex,
    userWarehouseIdsMap,
    currentUserProfile,
    currentUserId
  ])

  return {
    filteredUsers,
    searchKeyword,
    roleFilter,
    currentWarehouseIndex,
    setSearchKeyword,
    setRoleFilter,
    setCurrentWarehouseIndex
  }
}
