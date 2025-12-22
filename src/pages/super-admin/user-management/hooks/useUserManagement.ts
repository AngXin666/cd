/**
 * 用户管理业务逻辑 Hook
 *
 * @description 封装用户管理的所有业务逻辑，包括用户列表加载、添加用户、切换用户类型等
 * @module hooks/useUserManagement
 * @feature user-management-refactor
 *
 * @example
 * ```tsx
 * const {
 *   users,           // 用户列表
 *   loading,         // 加载状态
 *   loadUsers,       // 加载用户列表
 *   addUser,         // 添加用户
 *   toggleUserType   // 切换司机类型
 * } = useUserManagement()
 *
 * // 强制刷新用户列表
 * await loadUsers(true)
 *
 * // 添加新用户
 * await addUser({
 *   phone: '13800138000',
 *   name: '张三',
 *   role: 'DRIVER',
 *   driverType: 'pure',
 *   warehouseIds: ['warehouse-1']
 * })
 * ```
 */

import {hideLoading, showLoading, showToast} from '@/utils/taroCompat'
import {useAuth} from 'miaoda-auth-taro'
import {useCallback, useEffect, useState} from 'react'
import * as UsersAPI from '@/db/api/users'
import * as VehiclesAPI from '@/db/api/vehicles'
import * as WarehousesAPI from '@/db/api/warehouses'
import {supabase} from '@/db/supabase'
import {usersRepository, convertUserToProfile, notificationsRepository} from '@/db/repositories'
import type {Profile} from '@/db/types'
import {CACHE_KEYS, getVersionedCache, onDataUpdated, setVersionedCache} from '@/utils/cache'
import {buildDriverTypeChangeMessage, type UserRole as MessageUserRole} from '@/utils/notificationMessageBuilder'

/** 司机详细信息类型 */
type DriverDetailInfo = Awaited<ReturnType<typeof VehiclesAPI.getDriverDetailInfo>>

/**
 * 扩展用户类型，包含真实姓名
 */
export interface UserWithRealName extends Profile {
  /** 真实姓名（来自驾驶证） */
  real_name?: string
  /** 登录账号 */
  login_account?: string
}

/**
 * 辅助函数：判断是否是管理员角色
 * 管理员角色包括：BOSS（老板）和 PEER_ADMIN（调度）
 * @param role - 用户角色
 * @returns 是否是管理员角色
 */
const isAdminRole = (role: string | undefined) => {
  return role === 'BOSS' || role === 'PEER_ADMIN'
}

/**
 * useUserManagement Hook的返回值类型
 */
export interface UseUserManagementReturn {
  /** 用户列表 */
  users: UserWithRealName[]
  /** 是否正在加载 */
  loading: boolean
  /** 当前登录用户的Profile */
  currentUserProfile: Profile | null
  /** 用户详情Map（userId -> 详情） */
  userDetails: Map<string, DriverDetailInfo>

  /** 加载用户列表 @param forceRefresh 是否强制刷新（忽略缓存） */
  loadUsers: (forceRefresh?: boolean) => Promise<void>
  /** 添加新用户 */
  addUser: (data: {
    phone: string
    name: string
    role: 'DRIVER' | 'MANAGER' | 'BOSS'
    driverType?: 'pure' | 'with_vehicle'
    warehouseIds: string[]
  }) => Promise<Profile | null>
  /** 切换司机类型（纯司机/带车司机） */
  toggleUserType: (targetUser: UserWithRealName) => Promise<boolean>
  /** 加载用户详情 */
  loadUserDetail: (userId: string) => Promise<void>
}

export const useUserManagement = (): UseUserManagementReturn => {
  const {user} = useAuth({guard: true})
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const [users, setUsers] = useState<UserWithRealName[]>([])
  const [loading, setLoading] = useState(false)
  const [userDetails, setUserDetails] = useState<Map<string, DriverDetailInfo>>(new Map())

  // 加载用户列表
  const loadUsers = useCallback(
    async (forceRefresh: boolean = false) => {
      // 先加载当前登录用户的完整信息
      // 使用 UsersRepository 替代直接 supabase 调用
      if (!currentUserProfile && user) {
        try {
          // 使用 Repository 获取用户信息（带缓存）
          const userWithRole = await usersRepository.getById(user.id)

          if (userWithRole) {
            // 转换为 Profile 格式
            const profile = convertUserToProfile(userWithRole)
            setCurrentUserProfile(profile)
          }
        } catch (error) {
          console.error('加载当前用户信息失败:', error)
        }
      }

      // 如果不是强制刷新，先尝试从缓存加载
      if (!forceRefresh) {
        const cachedUsers = getVersionedCache<UserWithRealName[]>(CACHE_KEYS.SUPER_ADMIN_USERS)
        const cachedDetails = getVersionedCache<Map<string, DriverDetailInfo>>(CACHE_KEYS.SUPER_ADMIN_USER_DETAILS)

        if (cachedUsers && cachedDetails) {
          setUsers(cachedUsers)
          const detailsMap = new Map(Object.entries(cachedDetails))
          setUserDetails(detailsMap)
          return
        }
      }

      // 从数据库加载
      setLoading(true)
      try {
        const data = await UsersAPI.getAllUsers()
        const allWarehouses = await WarehousesAPI.getAllWarehouses()

        const userDataPromises = data.map(async (u) => {
          let assignments: {warehouse_id: string}[] = []

          if (u.role === 'DRIVER') {
            assignments = await WarehousesAPI.getWarehouseAssignmentsByDriver(u.id)
          } else if (u.role === 'MANAGER' || isAdminRole(u.role)) {
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
        const driverDetails = new Map<string, DriverDetailInfo>()

        userDataResults.forEach((result) => {
          if (result.detail) {
            driverDetails.set(result.user.id, result.detail)
          }
        })

        setUsers(usersWithRealName)
        setUserDetails(driverDetails)

        // 缓存数据
        setVersionedCache(CACHE_KEYS.SUPER_ADMIN_USERS, usersWithRealName, 5 * 60 * 1000)
        const detailsObj = Object.fromEntries(driverDetails)
        setVersionedCache(CACHE_KEYS.SUPER_ADMIN_USER_DETAILS, detailsObj, 5 * 60 * 1000)
      } catch (error) {
        console.error('❌ 加载用户列表失败:', error)
        showToast({title: '加载失败', icon: 'error'})
      } finally {
        setLoading(false)
      }
    },
    [user, currentUserProfile]
  )

  // 添加用户
  const addUser = useCallback(
    async (data: {
      phone: string
      name: string
      role: 'DRIVER' | 'MANAGER' | 'BOSS'
      driverType?: 'pure' | 'with_vehicle'
      warehouseIds: string[]
    }) => {
      try {
        let newUser: Profile | null = null

        if (data.role === 'BOSS') {
          // 创建平级账号（调度）
          // 注意：平级账号的角色应该是 PEER_ADMIN（调度），而不是 BOSS
          const {data: authData, error: authError} = await supabase.auth.signUp({
            phone: data.phone,
            password: '123456',
            options: {data: {name: data.name}}
          })

          if (authError || !authData.user) {
            throw new Error(authError?.message || '创建用户失败')
          }

          // 创建用户记录，设置角色为 PEER_ADMIN
          // 权限完全基于用户角色推断，PEER_ADMIN 角色默认拥有 full_control 权限
          const {data: userData, error: userError} = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              name: data.name,
              phone: data.phone,
              status: 'active',
              main_account_id: user?.id, // 设置主账号ID，标记为平级账号
              role: 'PEER_ADMIN' // 平级账号角色为调度
            })
            .select()
            .maybeSingle()

          if (userError || !userData) {
            throw new Error(userError?.message || '创建用户档案失败')
          }

          // 清除用户缓存，确保下次查询获取最新数据
          usersRepository.invalidateCache()

          newUser = {...userData, role: 'PEER_ADMIN'}
        } else {
          newUser = await UsersAPI.createUser(data.phone, data.name, data.role, data.driverType)
        }

        if (newUser && data.role !== 'BOSS') {
          // 分配仓库
          for (const warehouseId of data.warehouseIds) {
            if (data.role === 'DRIVER') {
              await WarehousesAPI.insertWarehouseAssignment({user_id: newUser.id, warehouse_id: warehouseId})
            } else {
              await WarehousesAPI.insertManagerWarehouseAssignment({manager_id: newUser.id, warehouse_id: warehouseId})
            }
          }
        }

        onDataUpdated([CACHE_KEYS.SUPER_ADMIN_USERS, CACHE_KEYS.SUPER_ADMIN_USER_DETAILS])
        await loadUsers(true)
        return newUser
      } catch (error) {
        console.error('添加用户失败', error)
        throw error
      }
    },
    [user, loadUsers]
  )

  // 切换用户类型
  const toggleUserType = useCallback(
    async (targetUser: UserWithRealName) => {
      if (targetUser.role !== 'DRIVER') {
        showToast({title: '只能切换司机类型', icon: 'none'})
        return false
      }

      const currentType = targetUser.driver_type
      const newType = currentType === 'with_vehicle' ? 'pure' : 'with_vehicle'

      showLoading({title: '切换中...'})
      const success = await UsersAPI.updateProfile(targetUser.id, {driver_type: newType})
      hideLoading()

      if (success) {
        const newTypeText = newType === 'with_vehicle' ? '带车司机' : '纯司机'
        showToast({title: `已切换为${newTypeText}`, icon: 'success'})

        // 发送通知（包含操作者信息和具体类型）
        // 使用 buildDriverTypeChangeMessage 组装消息
        try {
          // 获取当前操作者信息
          const operatorProfile = await UsersAPI.getCurrentUserWithRealName()

          // 获取操作者姓名和角色
          const operatorName = operatorProfile?.real_name || operatorProfile?.name || ''
          // 确定操作者角色类型（使用 MessageUserRole 类型）
          const operatorRole: MessageUserRole = operatorProfile?.role === 'BOSS' ? 'BOSS' : operatorProfile?.role === 'PEER_ADMIN' ? 'PEER_ADMIN' : 'BOSS'

          // 使用 buildDriverTypeChangeMessage 构建消息
          // 格式：您被{操作者}变更为{新司机类型}
          // 示例：您被老板变更为带车司机 / 您被调度李四变更为纯司机
          const message = buildDriverTypeChangeMessage(operatorName, operatorRole, newType)

          // 使用 NotificationsRepository 创建通知
          // 注意：Repository 使用 NotificationInput 接口，字段名与旧 API 不同
          await notificationsRepository.createNotifications([
            {
              recipient_id: targetUser.id,
              type: 'driver_type_changed',
              title: '司机类型变更通知',
              content: message,
              related_id: targetUser.id
            }
          ])
        } catch (error) {
          console.error('发送通知失败:', error)
        }

        onDataUpdated([CACHE_KEYS.SUPER_ADMIN_USERS, CACHE_KEYS.SUPER_ADMIN_USER_DETAILS])
        await loadUsers(true)
      }

      return success
    },
    [loadUsers]
  )

  // 加载用户详情
  const loadUserDetail = useCallback(
    async (userId: string) => {
      if (!userDetails.has(userId)) {
        showLoading({title: '加载中...'})
        const detail = await VehiclesAPI.getDriverDetailInfo(userId)
        hideLoading()
        if (detail) {
          setUserDetails((prev) => new Map(prev).set(userId, detail))
        }
      }
    },
    [userDetails]
  )

  // 初始加载
  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  return {
    users,
    loading,
    currentUserProfile,
    userDetails,
    loadUsers,
    addUser,
    toggleUserType,
    loadUserDetail
  }
}
