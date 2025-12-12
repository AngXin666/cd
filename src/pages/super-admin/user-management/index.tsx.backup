/**
 * 老板端 - 用户管理页面
 * 功能：管理所有用户（司机、车队长、老板）
 * 参考车队长端的司机管理实现
 */

import {Checkbox, CheckboxGroup, Input, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {navigateTo, showLoading, showToast, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import * as UsersAPI from '@/db/api/users'
import * as VehiclesAPI from '@/db/api/vehicles'
import * as WarehousesAPI from '@/db/api/warehouses'

import {createNotifications} from '@/db/notificationApi'
import {supabase} from '@/db/supabase'
import type {Profile, UserRole, Warehouse} from '@/db/types'
import {CACHE_KEYS, getVersionedCache, onDataUpdated, setVersionedCache} from '@/utils/cache'
import {matchWithPinyin} from '@/utils/pinyin'

// 司机详细信息类型
type DriverDetailInfo = Awaited<ReturnType<typeof VehiclesAPI.getDriverDetailInfo>>

// 扩展用户类型，包含真实姓名
interface UserWithRealName extends Profile {
  real_name?: string
  login_account?: string
}

// 辅助函数：判断是否是管理员角色（boss）
const isAdminRole = (role: string | undefined) => {
  return role === 'BOSS'
}

const UserManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null) // 当前登录用户的完整信息
  const [users, setUsers] = useState<UserWithRealName[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserWithRealName[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showSearch, setShowSearch] = useState(false) // 搜索框展开状态
  // 默认角色过滤：如果是老板或超级管理员登录，显示车队长；否则显示司机
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>(isAdminRole(user?.role) ? 'MANAGER' : 'DRIVER')
  const [loading, setLoading] = useState(false)

  // 标签页状态：'DRIVER' 或 'MANAGER'
  // 默认值：如果是老板或超级管理员登录，显示管理员标签页；否则显示司机标签页
  const [activeTab, setActiveTab] = useState<'DRIVER' | 'MANAGER'>(isAdminRole(user?.role) ? 'MANAGER' : 'DRIVER')

  // 用户详细信息展开状态
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<Map<string, DriverDetailInfo>>(new Map())

  // 仓库相关状态
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseAssignExpanded, setWarehouseAssignExpanded] = useState<string | null>(null)
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([])
  // 存储每个司机已分配的仓库信息（用于仓库分配功能）
  const [_driverWarehouseMap, setDriverWarehouseMap] = useState<Map<string, Warehouse[]>>(new Map())
  // 仓库切换状态
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState(0)
  // 存储每个用户的仓库ID列表（用于过滤）
  const [userWarehouseIdsMap, setUserWarehouseIdsMap] = useState<Map<string, string[]>>(new Map())

  // 添加用户相关状态
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserPhone, setNewUserPhone] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState<'DRIVER' | 'MANAGER' | 'BOSS'>('DRIVER')
  const [newDriverType, setNewDriverType] = useState<'pure' | 'with_vehicle'>('pure')
  const [newUserWarehouseIds, setNewUserWarehouseIds] = useState<string[]>([]) // 新用户的仓库分配
  const [addingUser, setAddingUser] = useState(false)

  // 标签页选项
  const tabs = [
    {key: 'DRIVER' as const, label: '司机管理', icon: 'i-mdi-account-hard-hat'},
    {key: 'MANAGER' as const, label: '管理员管理', icon: 'i-mdi-account-tie'}
  ]

  // 过滤用户
  const filterUsers = useCallback(
    (userList: UserWithRealName[], keyword: string, role: 'all' | UserRole, warehouseIndex: number) => {
      let filtered = userList

      // 角色过滤
      if (role !== 'all') {
        // 特殊处理：当角色为 manager 时，根据当前登录用户类型决定显示内容
        if (role === 'MANAGER') {
          // 判断当前登录用户是主账号还是平级账号
          const isMainAccount = currentUserProfile?.main_account_id === null
          const isPeerAccount = currentUserProfile?.main_account_id !== null

          if (isMainAccount) {
            // 主账号登录：显示车队长 + 平级账号（不显示自己）
            filtered = filtered.filter((u) => {
              // 显示车队长
              if (u.role === 'MANAGER') return true
              // 显示平级账号（但不显示自己）
              if (isAdminRole(u.role) && u.main_account_id !== null && u.id !== user?.id) return true
              return false
            })
          } else if (isPeerAccount) {
            // 平级账号登录：只显示车队长
            filtered = filtered.filter((u) => u.role === 'MANAGER')
          } else {
            // 其他情况（理论上不应该出现）：只显示车队长
            filtered = filtered.filter((u) => u.role === 'MANAGER')
          }
        } else {
          filtered = filtered.filter((u) => u.role === role)
        }
      }

      // 仓库过滤（对所有角色生效）
      if (warehouses.length > 0 && warehouses[warehouseIndex]) {
        const currentWarehouseId = warehouses[warehouseIndex].id
        filtered = filtered.filter((u) => {
          const userWarehouseIds = userWarehouseIdsMap.get(u.id) || []
          // 包含分配到该仓库的用户，以及未分配任何仓库的用户（新用户）
          return userWarehouseIds.includes(currentWarehouseId) || userWarehouseIds.length === 0
        })
      }

      // 关键词过滤
      if (keyword.trim()) {
        filtered = filtered.filter((u) => {
          const name = u.name || ''
          const realName = u.real_name || ''
          const phone = u.phone || ''
          const email = u.email || ''
          return (
            matchWithPinyin(name, keyword) ||
            matchWithPinyin(realName, keyword) ||
            phone.toLowerCase().includes(keyword.toLowerCase()) ||
            email.toLowerCase().includes(keyword.toLowerCase())
          )
        })
      }

      setFilteredUsers(filtered)
    },
    [warehouses, userWarehouseIdsMap, currentUserProfile, user]
  )

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    const data = await WarehousesAPI.getAllWarehouses()
    // 只显示激活的仓库，不添加"所有仓库"选项
    setWarehouses(data.filter((w) => w.is_active))
  }, [])

  // 加载用户列表
  const loadUsers = useCallback(
    async (forceRefresh: boolean = false) => {
      // 先加载当前登录用户的完整信息（包括 main_account_id）
      if (!currentUserProfile && user) {
        try {
          // 单用户架构：从 users 和 user_roles 表查询
          const [{data: userData, error: userError}, {data: roleData}] = await Promise.all([
            supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
            supabase.from('users').select('role').eq('id', user.id).maybeSingle()
          ])

          if (!userError && userData) {
            const profile = {
              ...userData,
              role: roleData?.role || 'DRIVER'
            }
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
        const cachedWarehouseIds = getVersionedCache<Map<string, string[]>>(CACHE_KEYS.SUPER_ADMIN_USER_WAREHOUSES)

        if (cachedUsers && cachedDetails && cachedWarehouseIds) {
          setUsers(cachedUsers)
          filterUsers(cachedUsers, searchKeyword, roleFilter, currentWarehouseIndex)
          // 将普通对象转换为 Map
          const detailsMap = new Map(Object.entries(cachedDetails))
          setUserDetails(detailsMap)
          const warehouseIdsMap = new Map(Object.entries(cachedWarehouseIds))
          setUserWarehouseIdsMap(warehouseIdsMap)
          return
        }
      }

      // 从数据库加载
      setLoading(true)
      try {
        const data = await UsersAPI.getAllUsers()

        // 批量并行加载：真实姓名、详细信息、仓库分配（优化性能）
        const allWarehouses = await WarehousesAPI.getAllWarehouses()

        const userDataPromises = data.map(async (u) => {
          // 并行加载每个用户的所有信息
          let assignments: {warehouse_id: string}[] = []

          // 根据角色加载不同的仓库分配
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
        const driverWarehouses = new Map<string, Warehouse[]>()
        const userWarehouseIds = new Map<string, string[]>()

        userDataResults.forEach((result) => {
          if (result.detail) {
            driverDetails.set(result.user.id, result.detail)
          }
          if (result.warehouses.length > 0) {
            driverWarehouses.set(result.user.id, result.warehouses)
            userWarehouseIds.set(
              result.user.id,
              result.warehouses.map((w) => w.id)
            )
          }
        })

        setUsers(usersWithRealName)
        filterUsers(usersWithRealName, searchKeyword, roleFilter, currentWarehouseIndex)
        setUserDetails(driverDetails)
        setDriverWarehouseMap(driverWarehouses)
        setUserWarehouseIdsMap(userWarehouseIds)

        // 使用带版本号的缓存（5分钟有效期）
        setVersionedCache(CACHE_KEYS.SUPER_ADMIN_USERS, usersWithRealName, 5 * 60 * 1000)
        // Map 需要转换为普通对象才能缓存
        const detailsObj = Object.fromEntries(driverDetails)
        setVersionedCache(CACHE_KEYS.SUPER_ADMIN_USER_DETAILS, detailsObj, 5 * 60 * 1000)
        const warehouseIdsObj = Object.fromEntries(userWarehouseIds)
        setVersionedCache(CACHE_KEYS.SUPER_ADMIN_USER_WAREHOUSES, warehouseIdsObj, 5 * 60 * 1000)
      } catch (error) {
        console.error('❌ 加载用户列表失败:', error)
        showToast({title: '加载失败', icon: 'error'})
      } finally {
        setLoading(false)
      }
    },
    [searchKeyword, roleFilter, currentWarehouseIndex, filterUsers, user, currentUserProfile]
  )

  // 搜索关键词变化
  const handleSearchChange = useCallback(
    (e: {detail: {value: string}}) => {
      const keyword = e.detail.value
      setSearchKeyword(keyword)
      filterUsers(users, keyword, roleFilter, currentWarehouseIndex)
    },
    [users, roleFilter, currentWarehouseIndex, filterUsers]
  )

  // 标签页切换
  const handleTabChange = useCallback(
    (tab: 'DRIVER' | 'MANAGER') => {
      setActiveTab(tab)
      // 切换标签时自动设置角色筛选
      // 管理员标签页显示车队长（manager），不显示老板账号（super_admin）
      const role: UserRole = tab === 'DRIVER' ? 'DRIVER' : 'MANAGER'
      setRoleFilter(role)
      filterUsers(users, searchKeyword, role, currentWarehouseIndex)
      // 收起所有展开的详情
      setExpandedUserId(null)
      setWarehouseAssignExpanded(null)
    },
    [users, searchKeyword, currentWarehouseIndex, filterUsers]
  )

  // 切换用户详细信息展开状态
  const _handleToggleUserDetail = useCallback(
    async (userId: string) => {
      if (expandedUserId === userId) {
        // 收起
        setExpandedUserId(null)
      } else {
        // 展开
        setExpandedUserId(userId)
        // 如果还没有加载详细信息，则加载
        if (!userDetails.has(userId)) {
          showLoading({title: '加载中...'})
          const detail = await VehiclesAPI.getDriverDetailInfo(userId)
          Taro.hideLoading()
          if (detail) {
            setUserDetails((prev) => new Map(prev).set(userId, detail))
          }
        }
      }
    },
    [expandedUserId, userDetails]
  )

  // 查看用户个人信息
  const handleViewUserProfile = useCallback((userId: string) => {
    navigateTo({
      url: `/pages/manager/driver-profile/index?driverId=${userId}`
    })
  }, [])

  // 查看用户车辆管理
  const handleViewUserVehicles = useCallback((userId: string) => {
    navigateTo({
      url: `/pages/driver/vehicle-list/index?driverId=${userId}`
    })
  }, [])

  // 切换添加用户表单显示
  const toggleAddUser = () => {
    setShowAddUser(!showAddUser)
    if (!showAddUser) {
      // 重置表单
      setNewUserPhone('')
      setNewUserName('')
      setNewUserRole('DRIVER')
      setNewDriverType('pure')
      setNewUserWarehouseIds([]) // 重置仓库选择
    }
  }

  // 切换搜索框显示
  const toggleSearch = () => {
    setShowSearch(!showSearch)
    if (showSearch) {
      // 收起时清空搜索关键词
      setSearchKeyword('')
    }
  }

  // 处理添加用户
  const handleAddUser = async () => {
    // 验证输入
    if (!newUserPhone.trim()) {
      showToast({title: '请输入手机号', icon: 'none'})
      return
    }
    if (!newUserName.trim()) {
      showToast({title: '请输入姓名', icon: 'none'})
      return
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(newUserPhone.trim())) {
      showToast({title: '请输入正确的手机号', icon: 'none'})
      return
    }

    // 验证仓库选择（司机和管理员需要，老板不需要）
    if (newUserRole !== 'BOSS' && newUserWarehouseIds.length === 0) {
      const roleText = newUserRole === 'DRIVER' ? '司机' : '管理员'
      showToast({title: `请为${roleText}至少选择一个仓库`, icon: 'none'})
      return
    }

    setAddingUser(true)
    showLoading({title: '添加中...'})

    try {
      // 如果是添加老板角色，需要特殊处理
      let newUser
      if (newUserRole === 'BOSS') {
        // 创建平级老板账号
        // 1. 先在 Supabase Auth 中创建用户
        const {data: authData, error: authError} = await supabase.auth.signUp({
          phone: newUserPhone.trim(),
          password: '123456', // 默认密码
          options: {
            data: {
              name: newUserName.trim()
            }
          }
        })

        if (authError || !authData.user) {
          // 检查是否是重复用户错误
          const errorMsg = authError?.message || ''
          if (
            errorMsg.includes('already') ||
            errorMsg.includes('duplicate') ||
            errorMsg.includes('User already registered')
          ) {
            throw new Error(`该手机号（${newUserPhone.trim()}）已被注册，请使用其他手机号`)
          }
          throw new Error(authError?.message || '创建用户失败')
        }

        // 2. 单用户架构：在 users 和 user_roles 表中创建记录
        const [{data: userData, error: userError}, {error: roleError}] = await Promise.all([
          supabase
            .from('users')
            .insert({
              id: authData.user.id,
              name: newUserName.trim(),
              phone: newUserPhone.trim(),
              permission_type: 'full',
              status: 'active',
              main_account_id: user?.id // 设置主账号ID，标记为平级账号
            })
            .select()
            .maybeSingle(),
          supabase.from('users').insert({
            user_id: authData.user.id,
            role: 'BOSS' // 老板角色在数据库中是 super_admin
          })
        ])

        if (userError || !userData) {
          throw new Error(userError?.message || '创建用户档案失败')
        }

        if (roleError) {
          throw new Error(roleError?.message || '创建用户角色失败')
        }

        const profile = {
          ...userData,
          role: 'BOSS'
        }

        newUser = profile
      } else {
        // 调用创建用户函数（司机或管理员）
        newUser = await UsersAPI.createUser(
          newUserPhone.trim(),
          newUserName.trim(),
          newUserRole,
          newUserRole === 'DRIVER' ? newDriverType : undefined
        )
      }

      if (newUser) {
        // 分配仓库（老板不需要分配仓库）
        if (newUserRole !== 'BOSS') {
          if (newUserRole === 'DRIVER') {
            // 为司机分配仓库（使用 warehouse_assignments 表）
            for (const warehouseId of newUserWarehouseIds) {
              await WarehousesAPI.insertWarehouseAssignment({
                user_id: newUser.id,
                warehouse_id: warehouseId
              })
            }
          } else if (newUserRole === 'MANAGER' || newUserRole === 'BOSS' || newUserRole === 'BOSS') {
            // 为管理员、老板和车队长分配仓库（使用 warehouse_assignments 表）
            for (const warehouseId of newUserWarehouseIds) {
              await WarehousesAPI.insertManagerWarehouseAssignment({
                manager_id: newUser.id,
                warehouse_id: warehouseId
              })
            }
          }
        }

        Taro.hideLoading()
        setAddingUser(false)

        // 显示详细的创建成功信息
        const loginAccount = `${newUserPhone.trim()}@fleet.com`
        const roleText = newUserRole === 'DRIVER' ? '司机' : newUserRole === 'MANAGER' ? '管理员' : '老板（平级账号）'
        const driverTypeText = newDriverType === 'with_vehicle' ? '带车司机' : '纯司机'
        const defaultPassword = '123456'

        let content = `姓名：${newUserName.trim()}\n手机号码：${newUserPhone.trim()}\n用户角色：${roleText}\n`

        if (newUserRole === 'DRIVER') {
          content += `司机类型：${driverTypeText}\n`
        }

        if (newUserRole !== 'BOSS') {
          const warehouseNames = warehouses
            .filter((w) => newUserWarehouseIds.includes(w.id))
            .map((w) => w.name)
            .join('、')
          content += `分配仓库：${warehouseNames}\n`
        }

        content += `登录账号：${loginAccount}\n默认密码：${defaultPassword}`

        Taro.showModal({
          title: '用户创建成功',
          content,
          showCancel: false,
          confirmText: '知道了',
          success: () => {
            // 重置表单
            setNewUserPhone('')
            setNewUserName('')
            setNewUserRole('DRIVER')
            setNewDriverType('pure')
            setNewUserWarehouseIds([])
            setShowAddUser(false)
            // 数据更新，增加版本号并清除相关缓存
            onDataUpdated([CACHE_KEYS.SUPER_ADMIN_USERS, CACHE_KEYS.SUPER_ADMIN_USER_DETAILS])
            loadUsers(true)
          }
        })
      } else {
        Taro.hideLoading()
        setAddingUser(false)
        showToast({title: '添加失败，手机号可能已存在', icon: 'error'})
      }
    } catch (error: any) {
      Taro.hideLoading()
      setAddingUser(false)
      console.error('添加用户失败', error)

      // 显示具体的错误信息
      const errorMsg = error?.message || String(error)
      if (errorMsg.includes('已被注册') || errorMsg.includes('already registered')) {
        showToast({title: errorMsg, icon: 'error', duration: 3000})
      } else {
        showToast({title: errorMsg || '添加失败，请重试', icon: 'error'})
      }
    }
  }

  // 切换用户类型（仅司机）
  const handleToggleUserType = useCallback(
    async (targetUser: UserWithRealName) => {
      if (targetUser.role !== 'DRIVER') {
        showToast({title: '只能切换司机类型', icon: 'none'})
        return
      }

      const currentType = targetUser.driver_type
      const newType = currentType === 'with_vehicle' ? 'pure' : 'with_vehicle'
      const currentTypeText = currentType === 'with_vehicle' ? '带车司机' : '纯司机'
      const newTypeText = newType === 'with_vehicle' ? '带车司机' : '纯司机'

      // 二次确认
      const result = await Taro.showModal({
        title: '确认切换司机类型',
        content: `确定要将 ${targetUser.real_name || targetUser.name || '该司机'} 从【${currentTypeText}】切换为【${newTypeText}】吗？`,
        confirmText: '确定',
        cancelText: '取消'
      })

      if (!result.confirm) {
        return
      }

      showLoading({title: '切换中...'})

      const success = await UsersAPI.updateProfile(targetUser.id, {driver_type: newType})

      Taro.hideLoading()

      if (success) {
        showToast({title: `已切换为${newTypeText}`, icon: 'success'})

        // 发送通知
        try {
          const notifications: Array<{
            userId: string
            type: 'driver_type_changed'
            title: string
            message: string
            relatedId?: string
          }> = []

          // 1. 通知司机
          notifications.push({
            userId: targetUser.id,
            type: 'driver_type_changed',
            title: '司机类型变更通知',
            message: `您的司机类型已从【${currentTypeText}】变更为【${newTypeText}】`,
            relatedId: targetUser.id
          })

          // 2. 老板或超级管理员操作 → 通知该司机所属仓库的车队长
          const currentUserProfile = await UsersAPI.getCurrentUserWithRealName()

          if (currentUserProfile && isAdminRole(currentUserProfile.role)) {
            // 获取操作人的显示名称（优先使用真实姓名）
            const operatorRealName = currentUserProfile.real_name
            const operatorUserName = currentUserProfile.name

            // 智能构建操作人显示文本
            let operatorText = currentUserProfile.role === 'BOSS' ? '老板' : '超级管理员'
            if (operatorRealName) {
              // 如果有真实姓名，显示：老板【张三】
              operatorText = `${currentUserProfile.role === 'BOSS' ? '老板' : '超级管理员'}【${operatorRealName}】`
            } else if (
              operatorUserName &&
              operatorUserName !== '老板' &&
              operatorUserName !== '车队长' &&
              operatorUserName !== '超级管理员'
            ) {
              // 如果有用户名且不是角色名称，显示：老板【admin】
              operatorText = `老板【${operatorUserName}】`
            }
            // 否则只显示：老板

            // 获取司机所属的仓库
            const driverWarehouseIds = await WarehousesAPI.getDriverWarehouseIds(targetUser.id)
            const managersSet = new Set<string>()

            // 获取这些仓库的管理员
            for (const warehouseId of driverWarehouseIds) {
              const managers = await WarehousesAPI.getWarehouseManagers(warehouseId)
              for (const m of managers) {
                managersSet.add(m.id)
              }
            }

            // 通知相关管理员
            for (const managerId of managersSet) {
              notifications.push({
                userId: managerId,
                type: 'driver_type_changed',
                title: '司机类型变更操作通知',
                message: `${operatorText}修改了司机类型：${targetUser.real_name || targetUser.name}，从【${currentTypeText}】变更为【${newTypeText}】`,
                relatedId: targetUser.id
              })
            }
          }

          // 批量发送通知
          if (notifications.length > 0) {
            await createNotifications(notifications)
          }
        } catch (error) {
          console.error('❌ 发送司机类型变更通知失败:', error)
        }

        // 数据更新，增加版本号并清除相关缓存
        onDataUpdated([CACHE_KEYS.SUPER_ADMIN_USERS, CACHE_KEYS.SUPER_ADMIN_USER_DETAILS])
        await loadUsers(true)
        // 重新加载该用户的详细信息
        const detail = await VehiclesAPI.getDriverDetailInfo(targetUser.id)
        if (detail) {
          setUserDetails((prev) => new Map(prev).set(targetUser.id, detail))
        }
      } else {
        showToast({title: '切换失败', icon: 'error'})
      }
    },
    [loadUsers]
  )

  // 处理仓库分配按钮点击
  const handleWarehouseAssignClick = useCallback(
    async (targetUser: UserWithRealName) => {
      if (warehouseAssignExpanded === targetUser.id) {
        // 如果已经展开，则收起
        setWarehouseAssignExpanded(null)
        setSelectedWarehouseIds([])
      } else {
        // 展开仓库分配面板
        setWarehouseAssignExpanded(targetUser.id)
        // 加载该用户已分配的仓库
        showLoading({title: '加载中...'})

        let assignments: Array<{warehouse_id: string}> = []
        if (targetUser.role === 'DRIVER') {
          assignments = await WarehousesAPI.getWarehouseAssignmentsByDriver(targetUser.id)
        } else if (targetUser.role === 'MANAGER' || isAdminRole(targetUser.role)) {
          assignments = await WarehousesAPI.getWarehouseAssignmentsByManager(targetUser.id)
        }

        Taro.hideLoading()
        setSelectedWarehouseIds(assignments.map((a) => a.warehouse_id))
      }
    },
    [warehouseAssignExpanded]
  )

  // 保存仓库分配
  const handleSaveWarehouseAssignment = useCallback(
    async (userId: string) => {
      // 获取用户信息用于显示名称
      const targetUser = users.find((u) => u.id === userId)
      const userName = targetUser?.real_name || targetUser?.name || '该用户'
      const userRole = targetUser?.role

      // 获取选中的仓库名称
      const selectedWarehouseNames = warehouses
        .filter((w) => selectedWarehouseIds.includes(w.id))
        .map((w) => w.name)
        .join('、')

      const warehouseText = selectedWarehouseIds.length > 0 ? selectedWarehouseNames : '无'

      // 二次确认
      const result = await Taro.showModal({
        title: '确认保存仓库分配',
        content: `确定要为 ${userName} 分配以下仓库吗？

${warehouseText}

${selectedWarehouseIds.length === 0 ? '（将清除该用户的所有仓库分配）' : ''}`,
        confirmText: '确定',
        cancelText: '取消'
      })

      if (!result.confirm) {
        return
      }

      showLoading({title: '保存中...'})

      // 获取之前的仓库分配（用于对比变更）
      let previousAssignments: Array<{warehouse_id: string}> = []
      if (userRole === 'DRIVER') {
        previousAssignments = await WarehousesAPI.getWarehouseAssignmentsByDriver(userId)
      } else if (userRole === 'MANAGER' || isAdminRole(userRole)) {
        previousAssignments = await WarehousesAPI.getWarehouseAssignmentsByManager(userId)
      }
      const previousWarehouseIds = previousAssignments.map((a) => a.warehouse_id)

      // 先删除该用户的所有仓库分配
      if (userRole === 'DRIVER') {
        await WarehousesAPI.deleteWarehouseAssignmentsByDriver(userId)
      } else if (userRole === 'MANAGER' || isAdminRole(userRole)) {
        // 删除管理员/车队长的仓库分配
        await supabase.from('warehouse_assignments').delete().eq('user_id', userId)
      }

      // 添加新的仓库分配
      for (const warehouseId of selectedWarehouseIds) {
        if (userRole === 'DRIVER') {
          await WarehousesAPI.insertWarehouseAssignment({
            user_id: userId,
            warehouse_id: warehouseId
          })
        } else if (userRole === 'MANAGER' || isAdminRole(userRole)) {
          await WarehousesAPI.insertManagerWarehouseAssignment({
            manager_id: userId,
            warehouse_id: warehouseId
          })
        }
      }

      Taro.hideLoading()
      showToast({title: '保存成功', icon: 'success'})
      setWarehouseAssignExpanded(null)
      setSelectedWarehouseIds([])

      // 更新司机仓库映射
      const assignedWarehouses = warehouses.filter((w) => selectedWarehouseIds.includes(w.id))
      setDriverWarehouseMap((prev) => {
        const newMap = new Map(prev)
        newMap.set(userId, assignedWarehouses)
        return newMap
      })

      // 发送通知
      try {
        const notifications: Array<{
          userId: string
          type: 'warehouse_assigned' | 'warehouse_unassigned'
          title: string
          message: string
          relatedId?: string
        }> = []

        // 计算仓库变更情况
        const addedWarehouseIds = selectedWarehouseIds.filter((id) => !previousWarehouseIds.includes(id))
        const removedWarehouseIds = previousWarehouseIds.filter((id) => !selectedWarehouseIds.includes(id))

        // 1. 通知司机
        if (addedWarehouseIds.length > 0 || removedWarehouseIds.length > 0) {
          const addedWarehouseNames = warehouses
            .filter((w) => addedWarehouseIds.includes(w.id))
            .map((w) => w.name)
            .join('、')
          const removedWarehouseNames = warehouses
            .filter((w) => removedWarehouseIds.includes(w.id))
            .map((w) => w.name)
            .join('、')

          let message = ''
          if (addedWarehouseIds.length > 0 && removedWarehouseIds.length > 0) {
            message = `您的仓库分配已更新：\n新增：${addedWarehouseNames}\n移除：${removedWarehouseNames}`
          } else if (addedWarehouseIds.length > 0) {
            message = `您已被分配到新仓库：${addedWarehouseNames}`
          } else {
            message = `您已从以下仓库移除：${removedWarehouseNames}`
          }

          notifications.push({
            userId: userId,
            type: addedWarehouseIds.length > 0 ? 'warehouse_assigned' : 'warehouse_unassigned',
            title: '仓库分配变更通知',
            message: message,
            relatedId: userId
          })
        }

        // 2. 如果是老板操作 → 通知相关仓库的车队长
        const currentUserProfile = await UsersAPI.getCurrentUserWithRealName()

        if (currentUserProfile && isAdminRole(currentUserProfile.role)) {
          // 获取操作人的显示名称（优先使用真实姓名）
          const operatorRealName = currentUserProfile.real_name
          const operatorUserName = currentUserProfile.name

          // 智能构建操作人显示文本
          let operatorText = currentUserProfile.role === 'BOSS' ? '老板' : '超级管理员'
          if (operatorRealName) {
            // 如果有真实姓名，显示：老板【张三】
            operatorText = `${currentUserProfile.role === 'BOSS' ? '老板' : '超级管理员'}【${operatorRealName}】`
          } else if (
            operatorUserName &&
            operatorUserName !== '老板' &&
            operatorUserName !== '车队长' &&
            operatorUserName !== '超级管理员'
          ) {
            // 如果有用户名且不是角色名称，显示：老板【admin】
            operatorText = `${currentUserProfile.role === 'BOSS' ? '老板' : '超级管理员'}【${operatorUserName}】`
          }
          // 否则只显示：老板

          // 获取所有受影响的仓库（新增的和移除的）
          const affectedWarehouseIds = [...new Set([...addedWarehouseIds, ...removedWarehouseIds])]

          const managersSet = new Set<string>()

          // 获取这些仓库的管理员
          for (const warehouseId of affectedWarehouseIds) {
            const managers = await WarehousesAPI.getWarehouseManagers(warehouseId)
            for (const m of managers) {
              managersSet.add(m.id)
            }
          }

          // 通知相关管理员
          for (const managerId of managersSet) {
            const warehouseNames = warehouses
              .filter((w) => affectedWarehouseIds.includes(w.id))
              .map((w) => w.name)
              .join('、')

            notifications.push({
              userId: managerId,
              type: 'warehouse_assigned',
              title: '仓库分配操作通知',
              message: `${operatorText}修改了司机 ${userName} 的仓库分配，涉及仓库：${warehouseNames}`,
              relatedId: userId
            })
          }
        }

        // 批量发送通知
        if (notifications.length > 0) {
          const success = await createNotifications(notifications)
          if (success) {
          } else {
            console.error('❌ [仓库分配] 通知发送失败')
          }
        } else {
        }
      } catch (error) {
        console.error('❌ [仓库分配] 发送通知失败:', error)
      }
    },
    [selectedWarehouseIds, users, warehouses]
  )

  // 切换仓库选择
  const handleToggleWarehouse = useCallback((warehouseId: string) => {
    setSelectedWarehouseIds((prev) => {
      if (prev.includes(warehouseId)) {
        return prev.filter((id) => id !== warehouseId)
      }
      return [...prev, warehouseId]
    })
  }, [])

  // 配置权限
  const handleConfigPermission = useCallback((targetUser: UserWithRealName) => {
    navigateTo({
      url: `/pages/super-admin/permission-config/index?userId=${targetUser.id}&userName=${encodeURIComponent(targetUser.real_name || targetUser.name || targetUser.phone || '')}`
    })
  }, [])

  // 页面显示时加载数据（批量并行查询优化）
  useDidShow(() => {
    // 批量并行刷新，不使用缓存
    Promise.all([loadUsers(true), loadWarehouses()]).catch((error) => {
      console.error('[UserManagement] 批量刷新数据失败:', error)
    })
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadUsers(true), loadWarehouses()])
    Taro.stopPullDownRefresh()
  })

  // 处理仓库切换
  const handleWarehouseChange = useCallback(
    (e: any) => {
      const index = e.detail.current
      setCurrentWarehouseIndex(index)
      // 重新过滤用户列表
      filterUsers(users, searchKeyword, roleFilter, index)
    },
    [users, searchKeyword, roleFilter, filterUsers]
  )

  // 获取角色显示文本
  const getRoleText = (role: UserRole) => {
    switch (role) {
      case 'BOSS':
        return '超级管理员'
      case 'MANAGER':
        return '车队长'
      case 'DRIVER':
        return '司机'
      default:
        return role
    }
  }

  // 获取角色颜色
  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'BOSS':
        return 'bg-red-100 text-red-700'
      case 'MANAGER':
        return 'bg-blue-100 text-blue-700'
      case 'DRIVER':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // 获取司机类型（包含新司机标签）
  const getDriverType = (targetUser: UserWithRealName) => {
    if (targetUser.role !== 'DRIVER') return null

    // 获取详细信息（用于判断是否为新司机）
    const detail = userDetails.get(targetUser.id)
    const isNewDriver = detail?.workDays !== null && detail?.workDays !== undefined && detail.workDays <= 7

    // 根据 driver_type 字段和是否为新司机，返回司机类型
    const baseType = targetUser.driver_type === 'with_vehicle' ? '带车司机' : '纯司机'

    if (isNewDriver) {
      return targetUser.driver_type === 'with_vehicle' ? '新带车司机' : '新纯司机'
    }

    return baseType
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">用户管理</Text>
            <Text className="text-blue-100 text-sm block">管理系统所有用户和角色权限</Text>
          </View>

          {/* 标签页切换 */}
          <View className="bg-white rounded-lg p-2 mb-4 shadow-sm flex flex-row">
            {tabs.map((tab) => (
              <View
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex-1 flex flex-col items-center justify-center py-3 rounded-lg transition-all active:scale-95 ${
                  activeTab === tab.key
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-md'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}>
                <View
                  className={`${tab.icon} text-2xl mb-1 ${activeTab === tab.key ? 'text-white' : 'text-gray-500'}`}
                />
                <Text className={`text-sm font-medium ${activeTab === tab.key ? 'text-white' : 'text-gray-600'}`}>
                  {tab.label}
                </Text>
              </View>
            ))}
          </View>

          {/* 搜索按钮 */}
          <View className="mb-4">
            <View
              onClick={toggleSearch}
              className="flex items-center justify-center bg-white rounded-lg py-3 px-4 shadow-sm border border-gray-200 active:scale-98 transition-all">
              <View className={`${showSearch ? 'i-mdi-close' : 'i-mdi-magnify'} text-blue-600 text-lg mr-2`} />
              <Text className="text-blue-600 text-sm font-medium">
                {showSearch ? '收起搜索' : `搜索${activeTab === 'DRIVER' ? '司机' : '管理员'}`}
              </Text>
            </View>
          </View>

          {/* 搜索框（可展开/收起） */}
          {showSearch && (
            <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
              <Text className="text-sm text-gray-600 mb-2 block">搜索{activeTab === 'DRIVER' ? '司机' : '管理员'}</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  placeholder={`输入${activeTab === 'DRIVER' ? '司机' : '管理员'}姓名、手机号或邮箱`}
                  value={searchKeyword}
                  onInput={handleSearchChange}
                />
              </View>
            </View>
          )}

          {/* 仓库切换器（有多个仓库时显示） */}
          {warehouses.length > 1 && (
            <View className="mb-4">
              <View className="flex items-center mb-2">
                <View className="i-mdi-warehouse text-lg text-blue-900 mr-2" />
                <Text className="text-sm font-bold text-gray-700">选择仓库</Text>
                <Text className="text-xs text-gray-400 ml-2">
                  ({currentWarehouseIndex + 1}/{warehouses.length})
                </Text>
                <Text className="text-xs text-gray-400 ml-auto">
                  {filteredUsers.length} 名{activeTab === 'DRIVER' ? '司机' : '管理员'}
                </Text>
              </View>
              <View className="bg-white rounded-xl shadow-md overflow-hidden">
                <Swiper
                  className="h-16"
                  current={currentWarehouseIndex}
                  onChange={handleWarehouseChange}
                  indicatorDots
                  indicatorColor="rgba(0, 0, 0, 0.2)"
                  indicatorActiveColor="#1E3A8A">
                  {warehouses.map((warehouse) => {
                    // 计算该仓库的用户数量（根据当前标签页）
                    // 只显示分配到该仓库的用户
                    const warehouseUserCount = users.filter((u) => {
                      // 根据当前标签页过滤角色
                      if (activeTab === 'DRIVER') {
                        if (u.role !== 'DRIVER') return false
                      } else {
                        if (u.role !== 'MANAGER' && !isAdminRole(u.role)) return false
                      }
                      const userWarehouseIds = userWarehouseIdsMap.get(u.id) || []
                      return userWarehouseIds.includes(warehouse.id)
                    }).length

                    return (
                      <SwiperItem key={warehouse.id}>
                        <View className="h-full flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 px-4">
                          <View className="i-mdi-warehouse text-2xl text-blue-600 mr-2" />
                          <Text className="text-lg font-bold text-blue-900">{warehouse.name}</Text>
                          <Text className="text-xs text-gray-500 ml-2">({warehouseUserCount}人)</Text>
                        </View>
                      </SwiperItem>
                    )
                  })}
                </Swiper>
              </View>
            </View>
          )}

          {/* 添加用户按钮（仅在司机管理标签页显示） */}
          {activeTab === 'DRIVER' && (
            <View className="mb-4">
              <View
                onClick={toggleAddUser}
                className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg py-3 px-4 flex items-center justify-center shadow-md active:scale-98 transition-all">
                <View className={`${showAddUser ? 'i-mdi-close' : 'i-mdi-plus'} text-white text-base mr-1`} />
                <Text className="text-white text-xs font-medium">{showAddUser ? '取消' : '添加用户'}</Text>
              </View>
            </View>
          )}

          {/* 添加用户表单（仅在司机管理标签页显示） */}
          {activeTab === 'DRIVER' && showAddUser && (
            <View className="bg-blue-50 rounded-lg p-4 mb-3 border-2 border-blue-200">
              {/* 手机号 */}
              <View className="mb-3">
                <Text className="text-gray-700 text-sm block mb-2">手机号</Text>
                <Input
                  type="number"
                  maxlength={11}
                  placeholder="请输入11位手机号"
                  value={newUserPhone}
                  onInput={(e) => setNewUserPhone(e.detail.value)}
                  className="bg-white rounded-lg px-3 py-2 text-sm border border-gray-300"
                />
              </View>

              {/* 姓名 */}
              <View className="mb-3">
                <Text className="text-gray-700 text-sm block mb-2">姓名</Text>
                <Input
                  type="text"
                  placeholder={`请输入${newUserRole === 'DRIVER' ? '司机' : '管理员'}姓名`}
                  value={newUserName}
                  onInput={(e) => setNewUserName(e.detail.value)}
                  className="bg-white rounded-lg px-3 py-2 text-sm border border-gray-300"
                />
              </View>

              {/* 用户角色选择 */}
              <View className="mb-3">
                <Text className="text-gray-700 text-sm block mb-2">用户角色</Text>
                <View className="flex gap-2">
                  <View
                    onClick={() => setNewUserRole('DRIVER')}
                    className={`flex-1 flex items-center justify-center rounded-lg py-2.5 border-2 transition-all ${
                      newUserRole === 'DRIVER'
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300 active:bg-gray-50'
                    }`}>
                    <View
                      className={`i-mdi-account-hard-hat text-base mr-1.5 ${
                        newUserRole === 'DRIVER' ? 'text-white' : 'text-gray-600'
                      }`}
                    />
                    <Text
                      className={`text-sm font-medium ${newUserRole === 'DRIVER' ? 'text-white' : 'text-gray-700'}`}>
                      司机
                    </Text>
                  </View>
                  <View
                    onClick={() => setNewUserRole('MANAGER')}
                    className={`flex-1 flex items-center justify-center rounded-lg py-2.5 border-2 transition-all ${
                      newUserRole === 'MANAGER'
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300 active:bg-gray-50'
                    }`}>
                    <View
                      className={`i-mdi-account-tie text-base mr-1.5 ${
                        newUserRole === 'MANAGER' ? 'text-white' : 'text-gray-600'
                      }`}
                    />
                    <Text
                      className={`text-sm font-medium ${newUserRole === 'MANAGER' ? 'text-white' : 'text-gray-700'}`}>
                      管理员
                    </Text>
                  </View>
                  <View
                    onClick={() => setNewUserRole('BOSS')}
                    className={`flex-1 flex items-center justify-center rounded-lg py-2.5 border-2 transition-all ${
                      newUserRole === 'BOSS'
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300 active:bg-gray-50'
                    }`}>
                    <View
                      className={`i-mdi-account-star text-base mr-1.5 ${
                        newUserRole === 'BOSS' ? 'text-white' : 'text-gray-600'
                      }`}
                    />
                    <Text className={`text-sm font-medium ${newUserRole === 'BOSS' ? 'text-white' : 'text-gray-700'}`}>
                      老板
                    </Text>
                  </View>
                </View>
              </View>

              {/* 司机类型选择（仅当选择司机角色时显示） */}
              {newUserRole === 'DRIVER' && (
                <View className="mb-3">
                  <Text className="text-gray-700 text-sm block mb-2">司机类型</Text>
                  <View className="flex gap-2">
                    <View
                      onClick={() => setNewDriverType('pure')}
                      className={`flex-1 flex items-center justify-center rounded-lg py-2.5 border-2 transition-all ${
                        newDriverType === 'pure'
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white border-gray-300 active:bg-gray-50'
                      }`}>
                      <View
                        className={`i-mdi-account text-base mr-1.5 ${
                          newDriverType === 'pure' ? 'text-white' : 'text-gray-600'
                        }`}
                      />
                      <Text
                        className={`text-sm font-medium ${newDriverType === 'pure' ? 'text-white' : 'text-gray-700'}`}>
                        纯司机
                      </Text>
                    </View>
                    <View
                      onClick={() => setNewDriverType('with_vehicle')}
                      className={`flex-1 flex items-center justify-center rounded-lg py-2.5 border-2 transition-all ${
                        newDriverType === 'with_vehicle'
                          ? 'bg-blue-600 border-blue-600'
                          : 'bg-white border-gray-300 active:bg-gray-50'
                      }`}>
                      <View
                        className={`i-mdi-truck text-base mr-1.5 ${
                          newDriverType === 'with_vehicle' ? 'text-white' : 'text-gray-600'
                        }`}
                      />
                      <Text
                        className={`text-sm font-medium ${
                          newDriverType === 'with_vehicle' ? 'text-white' : 'text-gray-700'
                        }`}>
                        带车司机
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 仓库分配（老板角色不需要） */}
              {newUserRole !== 'BOSS' && (
                <View className="mb-3">
                  <Text className="text-gray-700 text-sm block mb-2">
                    分配仓库 <Text className="text-red-500">*</Text>
                  </Text>
                  {warehouses.length > 0 ? (
                    <CheckboxGroup
                      onChange={(e) => setNewUserWarehouseIds(e.detail.value as string[])}
                      className="space-y-2">
                      {warehouses.map((warehouse) => (
                        <View
                          key={warehouse.id}
                          className={`flex items-center bg-white rounded-lg px-3 py-2.5 border-2 transition-all ${
                            newUserWarehouseIds.includes(warehouse.id)
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-300'
                          }`}>
                          <Checkbox
                            value={warehouse.id}
                            checked={newUserWarehouseIds.includes(warehouse.id)}
                            className="mr-2"
                          />
                          <Text className="text-sm text-gray-700 flex-1">{warehouse.name}</Text>
                        </View>
                      ))}
                    </CheckboxGroup>
                  ) : (
                    <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <Text className="text-yellow-800 text-xs">暂无可分配的仓库</Text>
                    </View>
                  )}
                </View>
              )}

              {/* 密码提示 */}
              <View className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <View className="flex items-start">
                  <View className="i-mdi-information text-yellow-600 text-base mr-2 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-yellow-800 text-xs leading-relaxed">
                      默认密码为 <Text className="font-bold">123456</Text>，用户首次登录后请及时修改密码
                    </Text>
                  </View>
                </View>
              </View>

              {/* 确认添加按钮 */}
              <View
                onClick={addingUser ? undefined : handleAddUser}
                className={`flex items-center justify-center bg-blue-600 rounded-lg py-2 active:scale-98 transition-all ${
                  addingUser ? 'opacity-50' : ''
                }`}>
                <View className="i-mdi-check text-white text-base mr-1" />
                <Text className="text-white text-sm font-medium">确认添加</Text>
              </View>
            </View>
          )}

          {/* 用户列表 */}
          {loading ? (
            <View className="flex items-center justify-center py-12">
              <View className="i-mdi-loading animate-spin text-4xl text-blue-500" />
              <Text className="text-gray-500 mt-2 block">加载中...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View className="bg-white rounded-lg p-8 text-center shadow-sm">
              <View className="i-mdi-account-off text-6xl text-gray-300 mx-auto mb-3" />
              <Text className="text-gray-500 block mb-4">暂无{activeTab === 'DRIVER' ? '司机' : '管理员'}数据</Text>

              {/* 调试信息 */}
              <View className="bg-gray-50 rounded-lg p-4 text-left">
                <Text className="text-xs text-gray-700 font-bold block mb-2">调试信息：</Text>
                <Text className="text-xs text-gray-600 block mb-1">
                  当前标签: {activeTab === 'DRIVER' ? '司机管理' : '管理员管理'}
                </Text>
                <Text className="text-xs text-gray-600 block mb-1">总用户数: {users.length}</Text>
                <Text className="text-xs text-gray-600 block mb-1">过滤后用户数: {filteredUsers.length}</Text>
                <Text className="text-xs text-gray-600 block mb-1">
                  当前角色筛选: {activeTab === 'MANAGER' ? '车队长 + 老板' : getRoleText(roleFilter as UserRole)}
                </Text>
                <Text className="text-xs text-gray-600 block mb-1">搜索关键词: {searchKeyword || '无'}</Text>
                <Text className="text-xs text-gray-600 block mb-1">当前用户ID: {user?.id || '未登录'}</Text>
                <Text className="text-xs text-gray-600 block">请查看浏览器控制台获取详细日志</Text>
              </View>
            </View>
          ) : (
            filteredUsers.map((u) => {
              const detail = userDetails.get(u.id)
              const _isExpanded = expandedUserId === u.id
              const isWarehouseExpanded = warehouseAssignExpanded === u.id

              return (
                <View key={u.id} className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden mb-3">
                  {/* 用户头部信息 */}
                  <View className="p-4 flex items-center justify-between">
                    <View className="flex items-center flex-1">
                      <View className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-full p-3 mr-3 shadow-md">
                        <View className="i-mdi-account text-white text-2xl" />
                      </View>
                      <View className="flex-1">
                        <View className="flex items-center gap-2 mb-1">
                          <Text className="text-gray-900 text-lg font-bold">
                            {u.real_name || u.name || '未设置姓名'}
                          </Text>
                          {/* 实名认证标签 */}
                          {(() => {
                            // 对于司机角色，判断是否已录入身份证信息
                            if (u.role === 'DRIVER') {
                              const hasIdCard = !!(
                                detail?.license?.id_card_number ||
                                detail?.license?.id_card_photo_front ||
                                detail?.license?.id_card_photo_back
                              )
                              if (hasIdCard) {
                                return (
                                  <View className="bg-green-100 px-2 py-0.5 rounded-full">
                                    <Text className="text-green-700 text-xs font-medium">已实名</Text>
                                  </View>
                                )
                              }
                            } else {
                              // 对于其他角色，判断是否已填写姓名和手机号
                              if (u.name && u.phone) {
                                return (
                                  <View className="bg-green-100 px-2 py-0.5 rounded-full">
                                    <Text className="text-green-700 text-xs font-medium">已实名</Text>
                                  </View>
                                )
                              }
                            }
                            return null
                          })()}
                          {/* 角色标签：如果是司机且有详细信息，显示具体司机类型；否则显示角色 */}
                          {u.role === 'DRIVER' && detail && getDriverType(u) ? (
                            <View
                              className={`px-2 py-0.5 rounded-full ${
                                getDriverType(u) === '新带车司机'
                                  ? 'bg-amber-100'
                                  : getDriverType(u) === '带车司机'
                                    ? 'bg-orange-100'
                                    : getDriverType(u) === '新纯司机'
                                      ? 'bg-cyan-100'
                                      : 'bg-blue-100'
                              }`}>
                              <Text
                                className={`text-xs font-medium ${
                                  getDriverType(u) === '新带车司机'
                                    ? 'text-amber-700'
                                    : getDriverType(u) === '带车司机'
                                      ? 'text-orange-700'
                                      : getDriverType(u) === '新纯司机'
                                        ? 'text-cyan-700'
                                        : 'text-blue-700'
                                }`}>
                                {getDriverType(u)}
                              </Text>
                            </View>
                          ) : (
                            <View className={`px-2 py-0.5 rounded-full ${getRoleColor(u.role)}`}>
                              <Text className="text-xs font-medium">{getRoleText(u.role)}</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-gray-500 text-sm">{u.phone || '未设置手机号'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* 用户详细信息 */}
                  {u.role === 'DRIVER' && detail && (
                    <View className="px-4 pb-3 border-t border-gray-100">
                      <View className="grid grid-cols-2 gap-2 mt-3">
                        {/* 年龄 */}
                        {detail.age !== null && (
                          <View className="flex items-center bg-gray-50 rounded-lg p-2">
                            <View className="i-mdi-cake-variant text-blue-600 text-lg mr-2" />
                            <View className="flex-1">
                              <Text className="text-gray-500 text-xs block">年龄</Text>
                              <Text className="text-gray-900 text-sm font-medium">{detail.age}岁</Text>
                            </View>
                          </View>
                        )}

                        {/* 驾龄 */}
                        {detail.drivingYears !== null && (
                          <View className="flex items-center bg-gray-50 rounded-lg p-2">
                            <View className="i-mdi-steering text-green-600 text-lg mr-2" />
                            <View className="flex-1">
                              <Text className="text-gray-500 text-xs block">驾龄</Text>
                              <Text className="text-gray-900 text-sm font-medium">{detail.drivingYears}年</Text>
                            </View>
                          </View>
                        )}

                        {/* 驾驶证类型 */}
                        {detail.license?.license_class && (
                          <View className="flex items-center bg-gray-50 rounded-lg p-2">
                            <View className="i-mdi-card-account-details text-purple-600 text-lg mr-2" />
                            <View className="flex-1">
                              <Text className="text-gray-500 text-xs block">准驾车型</Text>
                              <Text className="text-gray-900 text-sm font-medium">{detail.license.license_class}</Text>
                            </View>
                          </View>
                        )}

                        {/* 车辆数量 */}
                        <View className="flex items-center bg-gray-50 rounded-lg p-2">
                          <View className="i-mdi-car text-orange-600 text-lg mr-2" />
                          <View className="flex-1">
                            <Text className="text-gray-500 text-xs block">车辆</Text>
                            <Text className="text-gray-900 text-sm font-medium">
                              {detail.vehicles.length > 0 ? `${detail.vehicles.length}辆` : '无车辆'}
                            </Text>
                          </View>
                        </View>

                        {/* 入职时间 */}
                        {detail.joinDate && (
                          <View className="flex items-center bg-gray-50 rounded-lg p-2">
                            <View className="i-mdi-calendar-check text-teal-600 text-lg mr-2" />
                            <View className="flex-1">
                              <Text className="text-gray-500 text-xs block">入职时间</Text>
                              <Text className="text-gray-900 text-sm font-medium">{detail.joinDate}</Text>
                            </View>
                          </View>
                        )}

                        {/* 在职天数 */}
                        {detail.workDays !== null && (
                          <View className="flex items-center bg-gray-50 rounded-lg p-2">
                            <View className="i-mdi-clock-outline text-indigo-600 text-lg mr-2" />
                            <View className="flex-1">
                              <Text className="text-gray-500 text-xs block">在职天数</Text>
                              <Text className="text-gray-900 text-sm font-medium">{detail.workDays}天</Text>
                            </View>
                          </View>
                        )}
                      </View>

                      {/* 车牌号（如果有车辆） */}
                      {detail.vehicles.length > 0 && (
                        <View className="mt-2 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-2 border border-orange-200">
                          <View className="flex items-center">
                            <View className="i-mdi-card-text text-orange-600 text-base mr-2" />
                            <Text className="text-gray-600 text-xs mr-2">车牌号：</Text>
                            <Text className="text-gray-900 text-sm font-bold">
                              {detail.vehicles.map((v) => v.plate_number).join('、')}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* 身份证号码 */}
                      {detail.license?.id_card_number && (
                        <View className="mt-2 bg-indigo-50 rounded-lg p-2 border border-indigo-200">
                          <View className="flex items-start">
                            <View className="i-mdi-card-account-details text-indigo-600 text-base mr-2 mt-0.5" />
                            <View className="flex-1">
                              <Text className="text-gray-600 text-xs block mb-0.5">身份证号码</Text>
                              <Text className="text-gray-900 text-xs font-mono tracking-wide">
                                {detail.license.id_card_number}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* 住址 */}
                      {detail.license?.id_card_address && (
                        <View className="mt-2 bg-blue-50 rounded-lg p-2 border border-blue-200">
                          <View className="flex items-start">
                            <View className="i-mdi-home-map-marker text-blue-600 text-base mr-2 mt-0.5" />
                            <View className="flex-1">
                              <Text className="text-gray-600 text-xs block mb-0.5">住址</Text>
                              <Text className="text-gray-900 text-xs leading-relaxed">
                                {detail.license.id_card_address}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* 管理员详细信息 */}
                  {u.role !== 'DRIVER' && (
                    <View className="px-4 pb-3 border-t border-gray-100">
                      <View className="mt-3 space-y-2">
                        {u.login_account && (
                          <View className="flex items-center bg-gray-50 rounded-lg p-2">
                            <View className="i-mdi-account text-blue-600 text-lg mr-2" />
                            <View className="flex-1">
                              <Text className="text-gray-500 text-xs block">登录账号</Text>
                              <Text className="text-gray-900 text-sm font-medium">{u.login_account}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* 操作按钮 */}
                  <View className="grid grid-cols-2 gap-2 p-3 bg-gray-50 border-t border-gray-100">
                    {/* 查看个人信息按钮（仅司机） */}
                    {u.role === 'DRIVER' && (
                      <View
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewUserProfile(u.id)
                        }}
                        className="flex items-center justify-center bg-blue-50 border border-blue-200 rounded-lg py-2.5 active:bg-blue-100 transition-all">
                        <View className="i-mdi-account-card text-blue-600 text-base mr-1.5" />
                        <Text className="text-blue-700 text-sm font-medium">个人信息</Text>
                      </View>
                    )}

                    {/* 车辆管理按钮（仅司机） */}
                    {u.role === 'DRIVER' && (
                      <View
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewUserVehicles(u.id)
                        }}
                        className="flex items-center justify-center bg-green-50 border border-green-200 rounded-lg py-2.5 active:bg-green-100 transition-all">
                        <View className="i-mdi-car text-green-600 text-base mr-1.5" />
                        <Text className="text-green-700 text-sm font-medium">车辆管理</Text>
                      </View>
                    )}

                    {/* 仓库分配按钮（司机、管理员、老板） */}
                    {(u.role === 'DRIVER' || u.role === 'MANAGER' || isAdminRole(u.role)) && (
                      <View
                        onClick={(e) => {
                          e.stopPropagation()
                          handleWarehouseAssignClick(u)
                        }}
                        className="flex items-center justify-center bg-orange-50 border border-orange-200 rounded-lg py-2.5 active:bg-orange-100 transition-all">
                        <View className="i-mdi-warehouse text-orange-600 text-lg mr-1.5" />
                        <Text className="text-orange-700 text-sm font-medium">仓库分配</Text>
                      </View>
                    )}

                    {/* 司机类型切换按钮（仅司机） */}
                    {u.role === 'DRIVER' && (
                      <View
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleUserType(u)
                        }}
                        className="flex items-center justify-center bg-purple-50 border border-purple-200 rounded-lg py-2.5 active:bg-purple-100 transition-all">
                        <View className="i-mdi-swap-horizontal text-purple-600 text-lg mr-1.5" />
                        <Text className="text-purple-700 text-sm font-medium">
                          {u.driver_type === 'with_vehicle' ? '切换为纯司机' : '切换为带车司机'}
                        </Text>
                      </View>
                    )}

                    {/* 配置权限按钮（仅管理员） */}
                    {u.role === 'MANAGER' && (
                      <View
                        onClick={(e) => {
                          e.stopPropagation()
                          handleConfigPermission(u)
                        }}
                        className="flex items-center justify-center bg-rose-50 border border-rose-200 rounded-lg py-2.5 active:bg-rose-100 transition-all">
                        <View className="i-mdi-shield-account text-rose-600 text-lg mr-1.5" />
                        <Text className="text-rose-700 text-sm font-medium">权限</Text>
                      </View>
                    )}
                  </View>

                  {/* 仓库分配面板（展开时显示 - 司机、管理员、老板） */}
                  {(u.role === 'DRIVER' || u.role === 'MANAGER' || isAdminRole(u.role)) && isWarehouseExpanded && (
                    <View className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                      <View className="pt-4">
                        <Text className="text-sm font-medium text-gray-700 mb-3 block">选择仓库</Text>
                        {warehouses.length === 0 ? (
                          <View className="text-center py-4">
                            <Text className="text-gray-500 text-sm">暂无可用仓库</Text>
                          </View>
                        ) : (
                          <View className="space-y-2 mb-3">
                            {warehouses.map((warehouse) => {
                              const isSelected = selectedWarehouseIds.includes(warehouse.id)
                              return (
                                <View
                                  key={warehouse.id}
                                  onClick={() => handleToggleWarehouse(warehouse.id)}
                                  className={`flex items-center p-3 rounded-lg border-2 transition-all ${
                                    isSelected ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-300'
                                  }`}>
                                  {/* Checkbox 在左侧 */}
                                  <View
                                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mr-3 transition-all ${
                                      isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-400'
                                    }`}>
                                    {isSelected && <View className="i-mdi-check text-white text-base" />}
                                  </View>
                                  {/* 仓库名称 */}
                                  <Text
                                    className={`text-sm flex-1 ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                                    {warehouse.name}
                                  </Text>
                                </View>
                              )
                            })}
                          </View>
                        )}
                        <View className="flex gap-2">
                          <View
                            onClick={() => handleSaveWarehouseAssignment(u.id)}
                            className="flex-1 flex items-center justify-center bg-blue-500 rounded-lg py-2.5 active:bg-blue-600 transition-all">
                            <View className="i-mdi-content-save text-white text-lg mr-1.5" />
                            <Text className="text-white text-sm font-medium">保存</Text>
                          </View>
                          <View
                            onClick={() => {
                              setWarehouseAssignExpanded(null)
                              setSelectedWarehouseIds([])
                            }}
                            className="flex-1 flex items-center justify-center bg-gray-300 rounded-lg py-2.5 active:bg-gray-400 transition-all">
                            <View className="i-mdi-close text-gray-700 text-lg mr-1.5" />
                            <Text className="text-gray-700 text-sm font-medium">取消</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )
            })
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default UserManagement
