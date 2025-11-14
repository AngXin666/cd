/**
 * 超级管理端 - 用户管理页面
 * 功能：管理所有用户（司机、管理员、超级管理员）
 * 参考普通管理端的司机管理实现
 */

import {Input, Picker, ScrollView, Text, View} from '@tarojs/components'
import Taro, {navigateTo, showLoading, showToast, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {
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
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [loading, setLoading] = useState(false)

  // 用户详细信息展开状态
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [userDetails, setUserDetails] = useState<Map<string, DriverDetailInfo>>(new Map())

  // 仓库相关状态
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseAssignExpanded, setWarehouseAssignExpanded] = useState<string | null>(null)
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([])

  // 角色选择器选项
  const roleOptions = [
    {label: '全部角色', value: 'all'},
    {label: '超级管理员', value: 'super_admin'},
    {label: '管理员', value: 'manager'},
    {label: '司机', value: 'driver'}
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
  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllUsers()

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

      setUsers(usersWithRealName)
      filterUsers(usersWithRealName, searchKeyword, roleFilter)
    } catch (error) {
      console.error('❌ 加载用户列表失败:', error)
      showToast({title: '加载失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }, [searchKeyword, roleFilter, filterUsers])

  // 搜索关键词变化
  const handleSearchChange = useCallback(
    (e: any) => {
      const keyword = e.detail.value
      setSearchKeyword(keyword)
      filterUsers(users, keyword, roleFilter)
    },
    [users, roleFilter, filterUsers]
  )

  // 角色筛选变化
  const handleRoleFilterChange = useCallback(
    (e: any) => {
      const selectedIndex = Number(e.detail.value)
      const role = roleOptions[selectedIndex].value as 'all' | UserRole
      setRoleFilter(role)
      filterUsers(users, searchKeyword, role)
    },
    [users, searchKeyword, filterUsers]
  )

  // 切换用户详细信息展开状态
  const handleToggleUserDetail = useCallback(
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
      url: `/pages/manager/vehicle-management/index?driverId=${userId}`
    })
  }, [])

  // 切换用户类型（仅司机）
  const handleToggleUserType = useCallback(
    async (targetUser: UserWithRealName) => {
      if (targetUser.role !== 'driver') {
        showToast({title: '只能切换司机类型', icon: 'none'})
        return
      }

      const currentType = targetUser.driver_type
      const newType = currentType === 'driver_with_vehicle' ? 'driver' : 'driver_with_vehicle'
      const currentTypeText = currentType === 'driver_with_vehicle' ? '带车司机' : '纯司机'
      const newTypeText = newType === 'driver_with_vehicle' ? '带车司机' : '纯司机'

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
        await loadUsers()
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
        confirmMessage = `确认将管理员"${targetUser.real_name || targetUser.name || targetUser.phone}"降级为司机吗？`
      } else {
        targetRole = 'manager'
        confirmMessage = `确认将司机"${targetUser.real_name || targetUser.name || targetUser.phone}"升级为管理员吗？`
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
          await loadUsers()
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
    return targetUser.driver_type === 'driver_with_vehicle' ? '带车司机' : '纯司机'
  }

  // 获取司机类型颜色
  const getDriverTypeColor = (targetUser: UserWithRealName) => {
    if (targetUser.role !== 'driver') return ''
    return targetUser.driver_type === 'driver_with_vehicle'
      ? 'bg-purple-100 text-purple-700'
      : 'bg-orange-100 text-orange-700'
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

          {/* 搜索和筛选 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            {/* 搜索框 */}
            <View className="mb-3">
              <Text className="text-sm text-gray-600 mb-2 block">搜索用户</Text>
              <View style={{overflow: 'hidden'}}>
                <Input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  placeholder="输入姓名、手机号或邮箱"
                  value={searchKeyword}
                  onInput={handleSearchChange}
                />
              </View>
            </View>

            {/* 角色筛选 */}
            <View>
              <Text className="text-sm text-gray-600 mb-2 block">角色筛选</Text>
              <Picker mode="selector" range={roleOptions.map((o) => o.label)} onChange={handleRoleFilterChange}>
                <View className="flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <Text className="text-gray-800">{roleOptions.find((o) => o.value === roleFilter)?.label}</Text>
                  <View className="i-mdi-chevron-down text-gray-400 text-xl" />
                </View>
              </Picker>
            </View>
          </View>

          {/* 用户列表 */}
          {loading ? (
            <View className="flex items-center justify-center py-12">
              <View className="i-mdi-loading animate-spin text-4xl text-blue-500" />
              <Text className="text-gray-500 mt-2 block">加载中...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View className="bg-white rounded-lg p-8 text-center shadow-sm">
              <View className="i-mdi-account-off text-6xl text-gray-300 mx-auto mb-3" />
              <Text className="text-gray-500 block">暂无用户数据</Text>
            </View>
          ) : (
            filteredUsers.map((u) => {
              const detail = userDetails.get(u.id)
              const isExpanded = expandedUserId === u.id
              const isWarehouseExpanded = warehouseAssignExpanded === u.id

              return (
                <View key={u.id} className="bg-white rounded-xl mb-3 shadow-sm overflow-hidden">
                  {/* 用户基本信息 - 可点击展开 */}
                  <View
                    className="p-4"
                    onClick={() => {
                      if (u.role === 'driver') {
                        handleToggleUserDetail(u.id)
                      }
                    }}>
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
                      {u.role === 'driver' && (
                        <View className={`i-mdi-chevron-${isExpanded ? 'up' : 'down'} text-gray-400 text-2xl`} />
                      )}
                    </View>

                    {/* 基本信息 */}
                    <View className="space-y-1">
                      {u.phone && (
                        <View className="flex items-center">
                          <View className="i-mdi-phone text-gray-400 text-base mr-2" />
                          <Text className="text-sm text-gray-600">{u.phone}</Text>
                        </View>
                      )}
                      {u.login_account && (
                        <View className="flex items-center">
                          <View className="i-mdi-account text-gray-400 text-base mr-2" />
                          <Text className="text-sm text-gray-600">{u.login_account}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* 司机详细信息（展开时显示） */}
                  {u.role === 'driver' && isExpanded && detail && (
                    <View className="px-4 pb-3 border-t border-gray-100">
                      <View className="pt-3 space-y-2">
                        {/* 车辆信息 */}
                        {detail.vehicles && detail.vehicles.length > 0 && (
                          <View className="bg-green-50 rounded-lg p-3 border border-green-200">
                            <View className="flex items-center mb-1">
                              <View className="i-mdi-car text-green-600 text-lg mr-2" />
                              <Text className="text-green-800 text-xs font-medium">车辆信息</Text>
                            </View>
                            <View className="flex items-center">
                              <Text className="text-gray-600 text-xs mr-2">车牌号：</Text>
                              <Text className="text-gray-900 text-sm font-bold">
                                {detail.vehicles.map((v) => v.plate_number).join('、')}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* 身份证号码 */}
                        {detail.license?.id_card_number && (
                          <View className="bg-indigo-50 rounded-lg p-2 border border-indigo-200">
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
                          <View className="bg-blue-50 rounded-lg p-2 border border-blue-200">
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
                    </View>
                  )}

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
                        <Text className="text-purple-700 text-sm font-medium">类型切换</Text>
                      </View>
                    )}

                    {/* 编辑按钮 */}
                    <View
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditUser(u)
                      }}
                      className="flex items-center justify-center bg-emerald-50 border border-emerald-200 rounded-lg py-2.5 active:bg-emerald-100 transition-all">
                      <View className="i-mdi-pencil text-emerald-600 text-lg mr-1.5" />
                      <Text className="text-emerald-700 text-sm font-medium">编辑</Text>
                    </View>

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
                          {u.role === 'manager' ? '降级' : '升级'}
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
                            {warehouses.map((warehouse) => (
                              <View
                                key={warehouse.id}
                                onClick={() => handleToggleWarehouse(warehouse.id)}
                                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                  selectedWarehouseIds.includes(warehouse.id)
                                    ? 'bg-blue-50 border-blue-500'
                                    : 'bg-white border-gray-200'
                                }`}>
                                <View className="flex items-center">
                                  <View
                                    className={`i-mdi-${selectedWarehouseIds.includes(warehouse.id) ? 'checkbox-marked' : 'checkbox-blank-outline'} text-xl mr-2 ${
                                      selectedWarehouseIds.includes(warehouse.id) ? 'text-blue-600' : 'text-gray-400'
                                    }`}
                                  />
                                  <Text
                                    className={`text-sm ${selectedWarehouseIds.includes(warehouse.id) ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                                    {warehouse.name}
                                  </Text>
                                </View>
                              </View>
                            ))}
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
