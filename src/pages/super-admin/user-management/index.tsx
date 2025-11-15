/**
 * 超级管理端 - 用户管理页面
 * 功能：管理所有用户（司机、管理员、超级管理员）
 * 参考普通管理端的司机管理实现
 */

import {Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {navigateTo, showLoading, showToast, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {
  createUser,
  deleteWarehouseAssignmentsByDriver,
  getAllUsers,
  getAllWarehouses,
  getDriverDetailInfo,
  getDriverLicense,
  getWarehouseAssignmentsByDriver,
  insertWarehouseAssignment,
  resetUserPassword,
  updateProfile,
  updateUserRole
} from '@/db/api'
import type {Profile, UserRole, Warehouse} from '@/db/types'
import {CACHE_KEYS, getVersionedCache, onDataUpdated, setVersionedCache} from '@/utils/cache'
import {matchWithPinyin} from '@/utils/pinyin'

// 司机详细信息类型
type DriverDetailInfo = Awaited<ReturnType<typeof getDriverDetailInfo>>

// 扩展用户类型，包含真实姓名
interface UserWithRealName extends Profile {
  real_name?: string
}

const UserManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [users, setUsers] = useState<UserWithRealName[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserWithRealName[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('driver') // 默认显示司机
  const [loading, setLoading] = useState(false)

  // 标签页状态：'driver' 或 'manager'
  const [activeTab, setActiveTab] = useState<'driver' | 'manager'>('driver')

  // 用户详细信息展开状态
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<Map<string, DriverDetailInfo>>(new Map())

  // 仓库相关状态
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseAssignExpanded, setWarehouseAssignExpanded] = useState<string | null>(null)
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([])
  // 存储每个司机已分配的仓库信息
  const [driverWarehouseMap, setDriverWarehouseMap] = useState<Map<string, Warehouse[]>>(new Map())

  // 添加用户相关状态
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserPhone, setNewUserPhone] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState<'driver' | 'manager'>('driver')
  const [newDriverType, setNewDriverType] = useState<'pure' | 'with_vehicle'>('pure')
  const [addingUser, setAddingUser] = useState(false)

  // 标签页选项
  const tabs = [
    {key: 'driver' as const, label: '司机管理', icon: 'i-mdi-account-hard-hat'},
    {key: 'manager' as const, label: '管理员管理', icon: 'i-mdi-account-tie'}
  ]

  // 过滤用户
  const filterUsers = useCallback((userList: UserWithRealName[], keyword: string, role: 'all' | UserRole) => {
    let filtered = userList

    // 角色过滤
    if (role !== 'all') {
      filtered = filtered.filter((u) => u.role === role)
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
  }, [])

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    const data = await getAllWarehouses()
    setWarehouses(data.filter((w) => w.is_active))
  }, [])

  // 加载用户列表
  const loadUsers = useCallback(
    async (forceRefresh: boolean = false) => {
      console.log('========================================')
      console.log('📋 超级管理端用户管理：开始加载用户列表')
      console.log('当前登录用户:', user)
      console.log('强制刷新:', forceRefresh)
      console.log('========================================')

      // 如果不是强制刷新，先尝试从缓存加载
      if (!forceRefresh) {
        const cachedUsers = getVersionedCache<UserWithRealName[]>(CACHE_KEYS.SUPER_ADMIN_USERS)
        const cachedDetails = getVersionedCache<Map<string, DriverDetailInfo>>(CACHE_KEYS.SUPER_ADMIN_USER_DETAILS)

        if (cachedUsers && cachedDetails) {
          console.log(`✅ 从缓存加载用户列表，共 ${cachedUsers.length} 名用户`)
          setUsers(cachedUsers)
          filterUsers(cachedUsers, searchKeyword, roleFilter)
          // 将普通对象转换为 Map
          const detailsMap = new Map(Object.entries(cachedDetails))
          setUserDetails(detailsMap)
          return
        }
      }

      // 从数据库加载
      setLoading(true)
      try {
        const data = await getAllUsers()

        console.log('✅ 成功获取用户数据，数量:', data.length)
        console.log('用户列表:', data)

        // 为每个用户获取真实姓名（从驾驶证信息中）
        const usersWithRealName = await Promise.all(
          data.map(async (u) => {
            if (u.role === 'driver') {
              const license = await getDriverLicense(u.id)
              return {
                ...u,
                real_name: license?.id_card_name || u.name
              }
            }
            return {...u, real_name: u.name}
          })
        )

        console.log('✅ 处理后的用户数据（含真实姓名）:', usersWithRealName)

        setUsers(usersWithRealName)
        filterUsers(usersWithRealName, searchKeyword, roleFilter)

        // 为所有司机加载详细信息（用于显示入职时间、在职天数等）
        const driverDetails = new Map<string, DriverDetailInfo>()
        const driverWarehouses = new Map<string, Warehouse[]>()
        const allWarehouses = await getAllWarehouses()

        await Promise.all(
          usersWithRealName
            .filter((u) => u.role === 'driver')
            .map(async (u) => {
              const detail = await getDriverDetailInfo(u.id)
              if (detail) {
                driverDetails.set(u.id, detail)
              }

              // 加载司机已分配的仓库
              const assignments = await getWarehouseAssignmentsByDriver(u.id)
              const assignedWarehouses = allWarehouses.filter((w) => assignments.some((a) => a.warehouse_id === w.id))
              driverWarehouses.set(u.id, assignedWarehouses)
            })
        )
        setUserDetails(driverDetails)
        setDriverWarehouseMap(driverWarehouses)
        console.log('✅ 已加载司机详细信息，数量:', driverDetails.size)
        console.log('✅ 已加载司机仓库分配信息')

        // 使用带版本号的缓存（5分钟有效期）
        setVersionedCache(CACHE_KEYS.SUPER_ADMIN_USERS, usersWithRealName, 5 * 60 * 1000)
        // Map 需要转换为普通对象才能缓存
        const detailsObj = Object.fromEntries(driverDetails)
        setVersionedCache(CACHE_KEYS.SUPER_ADMIN_USER_DETAILS, detailsObj, 5 * 60 * 1000)
      } catch (error) {
        console.error('❌ 加载用户列表失败:', error)
        showToast({title: '加载失败', icon: 'error'})
      } finally {
        setLoading(false)
      }
    },
    [searchKeyword, roleFilter, filterUsers, user]
  )

  // 搜索关键词变化
  const handleSearchChange = useCallback(
    (e: any) => {
      const keyword = e.detail.value
      setSearchKeyword(keyword)
      filterUsers(users, keyword, roleFilter)
    },
    [users, roleFilter, filterUsers]
  )

  // 标签页切换
  const handleTabChange = useCallback(
    (tab: 'driver' | 'manager') => {
      setActiveTab(tab)
      // 切换标签时自动设置角色筛选
      const role: UserRole = tab === 'driver' ? 'driver' : 'manager'
      setRoleFilter(role)
      filterUsers(users, searchKeyword, role)
      // 收起所有展开的详情
      setExpandedUserId(null)
      setWarehouseAssignExpanded(null)
    },
    [users, searchKeyword, filterUsers]
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
          const detail = await getDriverDetailInfo(userId)
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
      setNewUserRole('driver')
      setNewDriverType('pure')
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

    setAddingUser(true)
    showLoading({title: '添加中...'})

    // 调用创建用户函数
    const newUser = await createUser(
      newUserPhone.trim(),
      newUserName.trim(),
      newUserRole,
      newUserRole === 'driver' ? newDriverType : undefined
    )

    Taro.hideLoading()
    setAddingUser(false)

    if (newUser) {
      // 显示详细的创建成功信息
      const loginAccount = `${newUserPhone.trim()}@fleet.com`
      const roleText = newUserRole === 'driver' ? '司机' : '管理员'
      const driverTypeText = newDriverType === 'with_vehicle' ? '带车司机' : '纯司机'
      const defaultPassword = '123456'

      let content = `姓名：${newUserName.trim()}\n手机号码：${newUserPhone.trim()}\n用户角色：${roleText}\n`

      if (newUserRole === 'driver') {
        content += `司机类型：${driverTypeText}\n`
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
          setNewUserRole('driver')
          setNewDriverType('pure')
          setShowAddUser(false)
          // 数据更新，增加版本号并清除相关缓存
          onDataUpdated([CACHE_KEYS.SUPER_ADMIN_USERS, CACHE_KEYS.SUPER_ADMIN_USER_DETAILS])
          loadUsers(true)
        }
      })
    } else {
      showToast({title: '添加失败，手机号可能已存在', icon: 'error'})
    }
  }

  // 切换用户类型（仅司机）
  const handleToggleUserType = useCallback(
    async (targetUser: UserWithRealName) => {
      if (targetUser.role !== 'driver') {
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

      const success = await updateProfile(targetUser.id, {driver_type: newType})

      Taro.hideLoading()

      if (success) {
        showToast({title: `已切换为${newTypeText}`, icon: 'success'})
        // 数据更新，增加版本号并清除相关缓存
        onDataUpdated([CACHE_KEYS.SUPER_ADMIN_USERS, CACHE_KEYS.SUPER_ADMIN_USER_DETAILS])
        await loadUsers(true)
        // 重新加载该用户的详细信息
        const detail = await getDriverDetailInfo(targetUser.id)
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
      if (targetUser.role !== 'driver') {
        showToast({title: '只能为司机分配仓库', icon: 'none'})
        return
      }

      if (warehouseAssignExpanded === targetUser.id) {
        // 如果已经展开，则收起
        setWarehouseAssignExpanded(null)
        setSelectedWarehouseIds([])
      } else {
        // 展开仓库分配面板
        setWarehouseAssignExpanded(targetUser.id)
        // 加载该司机已分配的仓库
        showLoading({title: '加载中...'})
        const assignments = await getWarehouseAssignmentsByDriver(targetUser.id)
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

      // 获取选中的仓库名称
      const selectedWarehouseNames = warehouses
        .filter((w) => selectedWarehouseIds.includes(w.id))
        .map((w) => w.name)
        .join('、')

      const warehouseText = selectedWarehouseIds.length > 0 ? selectedWarehouseNames : '无'

      // 二次确认
      const result = await Taro.showModal({
        title: '确认保存仓库分配',
        content: `确定要为 ${userName} 分配以下仓库吗？\n\n${warehouseText}\n\n${selectedWarehouseIds.length === 0 ? '（将清除该用户的所有仓库分配）' : ''}`,
        confirmText: '确定',
        cancelText: '取消'
      })

      if (!result.confirm) {
        return
      }

      showLoading({title: '保存中...'})

      // 先删除该用户的所有仓库分配
      await deleteWarehouseAssignmentsByDriver(userId)

      // 添加新的仓库分配
      for (const warehouseId of selectedWarehouseIds) {
        await insertWarehouseAssignment({
          driver_id: userId,
          warehouse_id: warehouseId
        })
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

  // 修改用户角色
  const handleChangeRole = useCallback(
    async (targetUser: UserWithRealName) => {
      // 不能修改超级管理员角色
      if (targetUser.role === 'super_admin') {
        showToast({
          title: '不可修改最高权限角色',
          icon: 'none'
        })
        return
      }

      // 确定目标角色和提示信息
      let targetRole: UserRole
      let confirmMessage: string

      if (targetUser.role === 'manager') {
        targetRole = 'driver'
        confirmMessage = `确认将管理员"${targetUser.real_name || targetUser.name || targetUser.phone}"降级为司机吗？\n\n降级后将失去管理员权限。`
      } else {
        targetRole = 'manager'
        confirmMessage = `确认将司机"${targetUser.real_name || targetUser.name || targetUser.phone}"提升为管理员吗？\n\n提升后将获得管理员权限。`
      }

      // 显示确认对话框
      const {confirm} = await Taro.showModal({
        title: '修改角色',
        content: confirmMessage
      })

      if (!confirm) return

      // 执行角色修改
      showLoading({title: '修改中...'})
      try {
        const success = await updateUserRole(targetUser.id, targetRole)
        if (success) {
          showToast({title: '修改成功', icon: 'success'})
          // 数据更新，增加版本号并清除相关缓存
          onDataUpdated([CACHE_KEYS.SUPER_ADMIN_USERS, CACHE_KEYS.SUPER_ADMIN_USER_DETAILS])
          await loadUsers(true)
        } else {
          showToast({title: '修改失败', icon: 'error'})
        }
      } catch (error) {
        console.error('修改角色失败:', error)
        showToast({title: '修改失败', icon: 'error'})
      } finally {
        Taro.hideLoading()
      }
    },
    [loadUsers]
  )

  // 编辑用户信息
  const handleEditUser = useCallback((targetUser: UserWithRealName) => {
    navigateTo({
      url: `/pages/super-admin/edit-user/index?userId=${targetUser.id}`
    })
  }, [])

  // 重置密码
  const handleResetPassword = useCallback(async (targetUser: UserWithRealName) => {
    const {confirm} = await Taro.showModal({
      title: '重置密码',
      content: `确认将用户"${targetUser.real_name || targetUser.name || targetUser.phone}"的密码重置为 123456 吗？`
    })

    if (!confirm) {
      return
    }

    showLoading({title: '重置中...'})
    try {
      const result = await resetUserPassword(targetUser.id)

      if (result.success) {
        showToast({title: '密码已重置为 123456', icon: 'success', duration: 3000})
      } else {
        const errorMessage = result.error || '重置失败，原因未知'
        Taro.showModal({
          title: '重置失败',
          content: errorMessage,
          showCancel: false,
          confirmText: '知道了'
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      Taro.showModal({
        title: '重置失败',
        content: `发生异常: ${errorMessage}`,
        showCancel: false,
        confirmText: '知道了'
      })
    } finally {
      Taro.hideLoading()
    }
  }, [])

  // 配置权限
  const handleConfigPermission = useCallback((targetUser: UserWithRealName) => {
    navigateTo({
      url: `/pages/super-admin/permission-config/index?userId=${targetUser.id}&userName=${encodeURIComponent(targetUser.real_name || targetUser.name || targetUser.phone || '')}`
    })
  }, [])

  // 拨打电话
  const handleCall = useCallback((phone: string) => {
    Taro.makePhoneCall({
      phoneNumber: phone
    })
  }, [])

  // 页面显示时加载数据
  useDidShow(() => {
    loadUsers()
    loadWarehouses()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadUsers(), loadWarehouses()])
    Taro.stopPullDownRefresh()
  })

  // 获取角色显示文本
  const getRoleText = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return '超级管理员'
      case 'manager':
        return '管理员'
      case 'driver':
        return '司机'
      default:
        return role
    }
  }

  // 获取角色颜色
  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-700'
      case 'manager':
        return 'bg-blue-100 text-blue-700'
      case 'driver':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // 获取司机类型
  const getDriverType = (targetUser: UserWithRealName) => {
    if (targetUser.role !== 'driver') return null
    return targetUser.driver_type === 'with_vehicle' ? '带车司机' : '纯司机'
  }

  // 获取司机类型颜色
  const getDriverTypeColor = (targetUser: UserWithRealName) => {
    if (targetUser.role !== 'driver') return ''
    return targetUser.driver_type === 'with_vehicle' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
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

          {/* 搜索框 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <Text className="text-sm text-gray-600 mb-2 block">搜索{activeTab === 'driver' ? '司机' : '管理员'}</Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                placeholder={`输入${activeTab === 'driver' ? '司机' : '管理员'}姓名、手机号或邮箱`}
                value={searchKeyword}
                onInput={handleSearchChange}
              />
            </View>
          </View>

          {/* 添加用户按钮（仅在司机管理标签页显示） */}
          {activeTab === 'driver' && (
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
          {activeTab === 'driver' && showAddUser && (
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
                  placeholder={`请输入${newUserRole === 'driver' ? '司机' : '管理员'}姓名`}
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
                    onClick={() => setNewUserRole('driver')}
                    className={`flex-1 flex items-center justify-center rounded-lg py-2.5 border-2 transition-all ${
                      newUserRole === 'driver'
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300 active:bg-gray-50'
                    }`}>
                    <View
                      className={`i-mdi-account-hard-hat text-base mr-1.5 ${
                        newUserRole === 'driver' ? 'text-white' : 'text-gray-600'
                      }`}
                    />
                    <Text
                      className={`text-sm font-medium ${newUserRole === 'driver' ? 'text-white' : 'text-gray-700'}`}>
                      司机
                    </Text>
                  </View>
                  <View
                    onClick={() => setNewUserRole('manager')}
                    className={`flex-1 flex items-center justify-center rounded-lg py-2.5 border-2 transition-all ${
                      newUserRole === 'manager'
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300 active:bg-gray-50'
                    }`}>
                    <View
                      className={`i-mdi-account-tie text-base mr-1.5 ${
                        newUserRole === 'manager' ? 'text-white' : 'text-gray-600'
                      }`}
                    />
                    <Text
                      className={`text-sm font-medium ${newUserRole === 'manager' ? 'text-white' : 'text-gray-700'}`}>
                      管理员
                    </Text>
                  </View>
                </View>
              </View>

              {/* 司机类型选择（仅当选择司机角色时显示） */}
              {newUserRole === 'driver' && (
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
              <Text className="text-gray-500 block mb-4">暂无{activeTab === 'driver' ? '司机' : '管理员'}数据</Text>

              {/* 调试信息 */}
              <View className="bg-gray-50 rounded-lg p-4 text-left">
                <Text className="text-xs text-gray-700 font-bold block mb-2">调试信息：</Text>
                <Text className="text-xs text-gray-600 block mb-1">
                  当前标签: {activeTab === 'driver' ? '司机管理' : '管理员管理'}
                </Text>
                <Text className="text-xs text-gray-600 block mb-1">总用户数: {users.length}</Text>
                <Text className="text-xs text-gray-600 block mb-1">过滤后用户数: {filteredUsers.length}</Text>
                <Text className="text-xs text-gray-600 block mb-1">当前角色筛选: {roleFilter}</Text>
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
                <View key={u.id} className="bg-white rounded-xl mb-3 shadow-sm overflow-hidden">
                  {/* 用户基本信息 */}
                  <View className="p-4">
                    <View className="flex items-center justify-between mb-2">
                      <View className="flex items-center flex-1">
                        <Text className="text-lg font-bold text-gray-800 mr-2">
                          {u.real_name || u.name || '未设置姓名'}
                        </Text>
                        <View className={`px-2 py-0.5 rounded-full ${getRoleColor(u.role)}`}>
                          <Text className="text-xs font-medium">{getRoleText(u.role)}</Text>
                        </View>
                        {getDriverType(u) && (
                          <View className={`ml-2 px-2 py-0.5 rounded-full ${getDriverTypeColor(u)}`}>
                            <Text className="text-xs font-medium">{getDriverType(u)}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* 基本信息 */}
                    <View className="space-y-1">
                      {/* 司机显示：电话、年龄、驾龄、在职天数、入职时间 */}
                      {u.role === 'driver' && (
                        <>
                          {/* 电话号码 */}
                          {u.phone && (
                            <View className="flex items-center" onClick={() => handleCall(u.phone!)}>
                              <View className="i-mdi-phone text-blue-500 text-base mr-2" />
                              <Text className="text-sm text-blue-600 underline">{u.phone}</Text>
                            </View>
                          )}
                          {/* 年龄 */}
                          {detail?.age !== null && detail?.age !== undefined && (
                            <View className="flex items-center">
                              <View className="i-mdi-account-clock text-gray-400 text-base mr-2" />
                              <Text className="text-sm text-gray-600">年龄：{detail.age}岁</Text>
                            </View>
                          )}
                          {/* 驾龄 */}
                          {detail?.drivingYears !== null && detail?.drivingYears !== undefined && (
                            <View className="flex items-center">
                              <View className="i-mdi-steering text-gray-400 text-base mr-2" />
                              <Text className="text-sm text-gray-600">驾龄：{detail.drivingYears}年</Text>
                            </View>
                          )}
                          {/* 在职天数 */}
                          {detail?.workDays !== null && detail?.workDays !== undefined && (
                            <View className="flex items-center">
                              <View className="i-mdi-calendar-clock text-gray-400 text-base mr-2" />
                              <Text className="text-sm text-gray-600">在职天数：{detail.workDays}天</Text>
                            </View>
                          )}
                          {/* 入职时间 */}
                          {detail?.joinDate && (
                            <View className="flex items-center">
                              <View className="i-mdi-calendar-check text-gray-400 text-base mr-2" />
                              <Text className="text-sm text-gray-600">入职时间：{detail.joinDate}</Text>
                            </View>
                          )}
                          {/* 车牌号码 */}
                          {detail?.vehicles && detail.vehicles.length > 0 && (
                            <View className="flex items-center">
                              <View className="i-mdi-car text-gray-400 text-base mr-2" />
                              <Text className="text-sm text-gray-600">
                                车牌：{detail.vehicles.map((v) => v.plate_number).join('、')}
                              </Text>
                            </View>
                          )}
                          {/* 已分配仓库 */}
                          {(() => {
                            const assignedWarehouses = driverWarehouseMap.get(u.id) || []
                            if (assignedWarehouses.length > 0) {
                              return (
                                <View className="flex items-center">
                                  <View className="i-mdi-warehouse text-gray-400 text-base mr-2" />
                                  <Text className="text-sm text-gray-600">
                                    仓库：{assignedWarehouses.map((w) => w.name).join('、')}
                                  </Text>
                                </View>
                              )
                            }
                            return null
                          })()}
                        </>
                      )}
                      {/* 管理员显示：电话和登录账号 */}
                      {u.role !== 'driver' && (
                        <>
                          {u.phone && (
                            <View className="flex items-center" onClick={() => handleCall(u.phone!)}>
                              <View className="i-mdi-phone text-blue-500 text-base mr-2" />
                              <Text className="text-sm text-blue-600 underline">{u.phone}</Text>
                            </View>
                          )}
                          {u.login_account && (
                            <View className="flex items-center">
                              <View className="i-mdi-account text-gray-400 text-base mr-2" />
                              <Text className="text-sm text-gray-600">{u.login_account}</Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  </View>

                  {/* 操作按钮 */}
                  <View className="grid grid-cols-2 gap-2 p-3 bg-gray-50 border-t border-gray-100">
                    {/* 查看个人信息按钮（仅司机） */}
                    {u.role === 'driver' && (
                      <View
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewUserProfile(u.id)
                        }}
                        className="flex items-center justify-center bg-blue-50 border border-blue-200 rounded-lg py-2.5 active:bg-blue-100 transition-all">
                        <View className="i-mdi-account-circle text-blue-600 text-lg mr-1.5" />
                        <Text className="text-blue-700 text-sm font-medium">个人信息</Text>
                      </View>
                    )}

                    {/* 车辆管理按钮（仅司机） */}
                    {u.role === 'driver' && (
                      <View
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewUserVehicles(u.id)
                        }}
                        className="flex items-center justify-center bg-green-50 border border-green-200 rounded-lg py-2.5 active:bg-green-100 transition-all">
                        <View className="i-mdi-car text-green-600 text-lg mr-1.5" />
                        <Text className="text-green-700 text-sm font-medium">车辆管理</Text>
                      </View>
                    )}

                    {/* 仓库分配按钮（仅司机） */}
                    {u.role === 'driver' && (
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
                    {u.role === 'driver' && (
                      <View
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleUserType(u)
                        }}
                        className="flex items-center justify-center bg-purple-50 border border-purple-200 rounded-lg py-2.5 active:bg-purple-100 transition-all">
                        <View className="i-mdi-swap-horizontal text-purple-600 text-lg mr-1.5" />
                        <Text className="text-purple-700 text-sm font-medium">
                          {u.driver_type === 'with_vehicle' ? '切换成纯司机' : '切换成带车司机'}
                        </Text>
                      </View>
                    )}

                    {/* 编辑按钮（仅管理员可见） */}
                    {u.role !== 'driver' && (
                      <View
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditUser(u)
                        }}
                        className="flex items-center justify-center bg-emerald-50 border border-emerald-200 rounded-lg py-2.5 active:bg-emerald-100 transition-all">
                        <View className="i-mdi-pencil text-emerald-600 text-lg mr-1.5" />
                        <Text className="text-emerald-700 text-sm font-medium">编辑</Text>
                      </View>
                    )}

                    {/* 重置密码按钮 */}
                    <View
                      onClick={(e) => {
                        e.stopPropagation()
                        handleResetPassword(u)
                      }}
                      className="flex items-center justify-center bg-amber-50 border border-amber-200 rounded-lg py-2.5 active:bg-amber-100 transition-all">
                      <View className="i-mdi-lock-reset text-amber-600 text-lg mr-1.5" />
                      <Text className="text-amber-700 text-sm font-medium">重置密码</Text>
                    </View>

                    {/* 修改角色按钮（非超级管理员） */}
                    {u.role !== 'super_admin' && (
                      <View
                        onClick={(e) => {
                          e.stopPropagation()
                          handleChangeRole(u)
                        }}
                        className="flex items-center justify-center bg-sky-50 border border-sky-200 rounded-lg py-2.5 active:bg-sky-100 transition-all">
                        <View className="i-mdi-account-convert text-sky-600 text-lg mr-1.5" />
                        <Text className="text-sky-700 text-sm font-medium">
                          {u.role === 'manager' ? '降级为司机' : '提升为管理员'}
                        </Text>
                      </View>
                    )}

                    {/* 配置权限按钮（仅管理员） */}
                    {u.role === 'manager' && (
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

                    {/* 超级管理员提示 */}
                    {u.role === 'super_admin' && (
                      <View className="col-span-2 flex items-center justify-center bg-gray-100 rounded-lg py-2.5">
                        <View className="i-mdi-shield-crown text-gray-500 text-lg mr-1.5" />
                        <Text className="text-gray-600 text-sm font-medium">最高权限，无法修改</Text>
                      </View>
                    )}
                  </View>

                  {/* 仓库分配面板（展开时显示） */}
                  {u.role === 'driver' && isWarehouseExpanded && (
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
