import {Button, Input, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {navigateTo, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  addManagerWarehouse,
  getAllManagers,
  getAllWarehouses,
  getDriversByWarehouse,
  getManagerWarehouses,
  removeManagerWarehouse,
  resetUserPassword,
  updateProfile,
  updateUserRole
} from '@/db/api'
import type {Profile, Warehouse} from '@/db/types'
import {matchWithPinyin} from '@/utils/pinyin'

const StaffManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [currentTab, setCurrentTab] = useState<'manager' | 'driver'>('manager')
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState(0)
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [filteredDrivers, setFilteredDrivers] = useState<Profile[]>([])
  const [managers, setManagers] = useState<Profile[]>([])
  const [filteredManagers, setFilteredManagers] = useState<Profile[]>([])
  const [managerWarehouses, setManagerWarehouses] = useState<Map<string, Warehouse[]>>(new Map())
  const [editingManager, setEditingManager] = useState<Profile | null>(null)
  const [editForm, setEditForm] = useState({name: '', phone: '', email: ''})
  const [searchKeyword, setSearchKeyword] = useState('')
  const [driverTypeFilter, setDriverTypeFilter] = useState<'all' | 'pure' | 'with_vehicle'>('all')
  const [loading, setLoading] = useState(false)

  // 司机类型选择器选项
  const driverTypeOptions = [
    {label: '全部司机', value: 'all'},
    {label: '纯司机', value: 'pure'},
    {label: '带车司机', value: 'with_vehicle'}
  ]

  // 加载所有仓库列表（超级管理员可以看到所有仓库）
  const loadWarehouses = useCallback(async () => {
    try {
      const data = await getAllWarehouses()
      const enabledWarehouses = data.filter((w) => w.is_active)
      setWarehouses(enabledWarehouses)
    } catch (error) {
      console.error('加载仓库列表失败:', error)
      Taro.showToast({title: '加载仓库失败', icon: 'error'})
    }
  }, [])

  // 加载所有管理员
  const loadManagers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllManagers()
      setManagers(data)
      setFilteredManagers(data)

      // 加载每个管理员的仓库
      const warehouseMap = new Map<string, Warehouse[]>()
      await Promise.all(
        data.map(async (manager) => {
          const warehouses = await getManagerWarehouses(manager.id)
          warehouseMap.set(manager.id, warehouses)
        })
      )
      setManagerWarehouses(warehouseMap)
    } catch (error) {
      console.error('加载管理员列表失败:', error)
      Taro.showToast({title: '加载管理员失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }, [])

  // 过滤管理员
  const filterManagers = useCallback(
    (keyword: string) => {
      if (!keyword.trim()) {
        setFilteredManagers(managers)
        return
      }

      const filtered = managers.filter((m) => {
        const name = m.name || ''
        const phone = m.phone || ''
        const email = m.email || ''
        return (
          matchWithPinyin(name, keyword) ||
          phone.toLowerCase().includes(keyword.toLowerCase()) ||
          email.toLowerCase().includes(keyword.toLowerCase())
        )
      })
      setFilteredManagers(filtered)
    },
    [managers]
  )

  // 过滤司机
  const filterDrivers = useCallback(
    (driverList: Profile[], keyword: string, typeFilter: 'all' | 'pure' | 'with_vehicle') => {
      let filtered = driverList

      // 司机类型过滤
      if (typeFilter !== 'all') {
        filtered = filtered.filter((d) => d.driver_type === typeFilter)
      }

      // 关键词过滤
      if (keyword.trim()) {
        filtered = filtered.filter((d) => {
          const name = d.name || ''
          const phone = d.phone || ''
          const vehiclePlate = d.vehicle_plate || ''
          return (
            matchWithPinyin(name, keyword) ||
            phone.toLowerCase().includes(keyword.toLowerCase()) ||
            vehiclePlate.toLowerCase().includes(keyword.toLowerCase())
          )
        })
      }

      setFilteredDrivers(filtered)
    },
    []
  )

  // 加载指定仓库的司机
  const loadDriversByWarehouse = useCallback(
    async (warehouseId: string) => {
      setLoading(true)
      try {
        const data = await getDriversByWarehouse(warehouseId)
        setDrivers(data)
        filterDrivers(data, searchKeyword, driverTypeFilter)
      } catch (error) {
        console.error('加载司机列表失败:', error)
        Taro.showToast({title: '加载司机失败', icon: 'error'})
      } finally {
        setLoading(false)
      }
    },
    [searchKeyword, driverTypeFilter, filterDrivers]
  )

  // 搜索关键词变化
  const handleSearchChange = useCallback(
    (e: any) => {
      const keyword = e.detail.value
      setSearchKeyword(keyword)
      filterDrivers(drivers, keyword, driverTypeFilter)
    },
    [drivers, driverTypeFilter, filterDrivers]
  )

  // 司机类型筛选变化
  const _handleDriverTypeFilterChange = useCallback(
    (e: any) => {
      const selectedIndex = e.detail.value
      const selectedType = driverTypeOptions[selectedIndex].value as 'all' | 'pure' | 'with_vehicle'
      setDriverTypeFilter(selectedType)
      filterDrivers(drivers, searchKeyword, selectedType)
    },
    [drivers, searchKeyword, filterDrivers]
  )

  // 编辑用户
  const handleEditUser = useCallback((userId: string) => {
    navigateTo({url: `/pages/super-admin/edit-user/index?userId=${userId}`})
  }, [])

  // 重置密码
  const handleResetPassword = useCallback(async (userId: string, userName: string) => {
    const result = await Taro.showModal({
      title: '重置密码',
      content: `确定要重置 ${userName} 的密码吗？`,
      confirmText: '确定',
      cancelText: '取消'
    })

    if (result.confirm) {
      Taro.showLoading({title: '重置中...'})
      try {
        const success = await resetUserPassword(userId)
        if (success) {
          Taro.showToast({title: '密码已重置', icon: 'success'})
        } else {
          Taro.showToast({title: '重置失败', icon: 'error'})
        }
      } catch (error) {
        console.error('重置密码失败:', error)
        Taro.showToast({title: '重置失败', icon: 'error'})
      } finally {
        Taro.hideLoading()
      }
    }
  }, [])

  // 变更用户角色
  const handleChangeRole = useCallback(
    async (userId: string, userName: string, currentRole: string) => {
      // 确定新角色
      const newRole = currentRole === 'manager' ? 'driver' : 'manager'
      const roleText = newRole === 'manager' ? '管理员' : '司机'
      const currentRoleText = currentRole === 'manager' ? '管理员' : '司机'

      const result = await Taro.showModal({
        title: '变更角色',
        content: `确定要将 ${userName} 从 ${currentRoleText} 变更为 ${roleText} 吗？`,
        confirmText: '确定',
        cancelText: '取消'
      })

      if (result.confirm) {
        Taro.showLoading({title: '变更中...'})
        try {
          const success = await updateUserRole(userId, newRole)
          if (success) {
            Taro.showToast({title: '角色变更成功', icon: 'success'})
            // 刷新管理员列表
            loadManagers()
          } else {
            Taro.showToast({title: '角色变更失败', icon: 'error'})
          }
        } catch (error) {
          console.error('变更角色失败:', error)
          Taro.showToast({title: '角色变更失败', icon: 'error'})
        } finally {
          Taro.hideLoading()
        }
      }
    },
    [loadManagers]
  )

  // 开始编辑管理员
  const handleEditManager = useCallback((manager: Profile) => {
    setEditingManager(manager)
    setEditForm({
      name: manager.name || '',
      phone: manager.phone || '',
      email: manager.email || ''
    })
  }, [])

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingManager(null)
    setEditForm({name: '', phone: '', email: ''})
  }, [])

  // 保存管理员信息
  const handleSaveManager = useCallback(async () => {
    if (!editingManager) return

    if (!editForm.name.trim()) {
      Taro.showToast({title: '请输入姓名', icon: 'none'})
      return
    }

    Taro.showLoading({title: '保存中...'})
    try {
      const success = await updateProfile(editingManager.id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null
      })

      if (success) {
        Taro.showToast({title: '保存成功', icon: 'success'})
        handleCancelEdit()
        loadManagers()
      } else {
        Taro.showToast({title: '保存失败', icon: 'error'})
      }
    } catch (error) {
      console.error('保存管理员信息失败:', error)
      Taro.showToast({title: '保存失败', icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }, [editingManager, editForm, handleCancelEdit, loadManagers])

  // 为管理员分配仓库
  const handleAssignWarehouseToManager = useCallback(
    async (managerId: string, managerName: string) => {
      if (warehouses.length === 0) {
        Taro.showToast({title: '暂无可分配的仓库', icon: 'none'})
        return
      }

      // 获取管理员当前的仓库分配
      const currentWarehouses = managerWarehouses.get(managerId) || []
      const currentWarehouseIds = currentWarehouses.map((w) => w.id)

      // 显示所有仓库供选择
      const warehouseNames = warehouses.map((w) => w.name)

      const result = await Taro.showActionSheet({
        itemList: warehouseNames,
        alertText: `为 ${managerName} 分配仓库（当前已分配 ${currentWarehouses.length} 个）`
      })

      if (result.tapIndex !== undefined) {
        const selectedWarehouse = warehouses[result.tapIndex]
        const isAssigned = currentWarehouseIds.includes(selectedWarehouse.id)

        if (isAssigned) {
          // 移除分配
          const confirmResult = await Taro.showModal({
            title: '移除仓库分配',
            content: `确定要将 ${managerName} 从 ${selectedWarehouse.name} 移除吗？`,
            confirmText: '确定',
            cancelText: '取消'
          })

          if (confirmResult.confirm) {
            Taro.showLoading({title: '处理中...'})
            try {
              const success = await removeManagerWarehouse(managerId, selectedWarehouse.id)
              if (success) {
                Taro.showToast({title: '移除成功', icon: 'success'})
                loadManagers()
              } else {
                Taro.showToast({title: '移除失败', icon: 'error'})
              }
            } catch (error) {
              console.error('移除仓库失败:', error)
              Taro.showToast({title: '移除失败', icon: 'error'})
            } finally {
              Taro.hideLoading()
            }
          }
        } else {
          // 添加分配
          Taro.showLoading({title: '处理中...'})
          try {
            const success = await addManagerWarehouse(managerId, selectedWarehouse.id)
            if (success) {
              Taro.showToast({title: '分配成功', icon: 'success'})
              loadManagers()
            } else {
              Taro.showToast({title: '分配失败', icon: 'error'})
            }
          } catch (error) {
            console.error('分配仓库失败:', error)
            Taro.showToast({title: '分配失败', icon: 'error'})
          } finally {
            Taro.hideLoading()
          }
        }
      }
    },
    [warehouses, managerWarehouses, loadManagers]
  )

  // 仓库切换
  const handleWarehouseChange = useCallback(
    (e: any) => {
      const index = e.detail.current
      setCurrentWarehouseIndex(index)
      if (warehouses[index]) {
        loadDriversByWarehouse(warehouses[index].id)
      }
    },
    [warehouses, loadDriversByWarehouse]
  )

  // 标签切换
  const handleTabChange = useCallback((tab: 'manager' | 'driver') => {
    setCurrentTab(tab)
    setSearchKeyword('')
  }, [])

  // 初始化加载
  useEffect(() => {
    loadWarehouses()
  }, [loadWarehouses])

  // 切换到管理员标签时加载管理员
  useEffect(() => {
    if (currentTab === 'manager') {
      loadManagers()
    }
  }, [currentTab, loadManagers])

  // 仓库列表加载完成后，加载第一个仓库的司机
  useEffect(() => {
    if (warehouses.length > 0 && currentTab === 'driver') {
      loadDriversByWarehouse(warehouses[currentWarehouseIndex].id)
    }
  }, [warehouses, currentWarehouseIndex, currentTab, loadDriversByWarehouse])

  // 管理员搜索
  useEffect(() => {
    if (currentTab === 'manager') {
      filterManagers(searchKeyword)
    }
  }, [currentTab, searchKeyword, filterManagers])

  // 页面显示时刷新数据
  useDidShow(() => {
    loadWarehouses()
    if (currentTab === 'manager') {
      loadManagers()
    }
  })

  // 下拉刷新
  usePullDownRefresh(() => {
    if (currentTab === 'manager') {
      loadManagers().finally(() => {
        Taro.stopPullDownRefresh()
      })
    } else if (currentTab === 'driver') {
      if (warehouses[currentWarehouseIndex]) {
        loadDriversByWarehouse(warehouses[currentWarehouseIndex].id).finally(() => {
          Taro.stopPullDownRefresh()
        })
      }
    }
  })

  // 获取司机类型文本
  const getDriverTypeText = (driverType: string | null) => {
    if (driverType === 'with_vehicle') return '带车司机'
    if (driverType === 'pure') return '纯司机'
    return '未设置'
  }

  // 计算在职天数
  const getWorkDays = (joinDate: string | null) => {
    if (!joinDate) return null
    const join = new Date(joinDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - join.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // 渲染管理员卡片
  const renderManagerCard = (manager: Profile) => {
    const warehouses = managerWarehouses.get(manager.id) || []
    const isEditing = editingManager?.id === manager.id

    if (isEditing) {
      return (
        <View key={manager.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
          <View className="mb-3">
            <Text className="text-sm text-gray-600 mb-1">姓名</Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="bg-gray-50 px-3 py-2 rounded border border-gray-200"
                value={editForm.name}
                onInput={(e) => setEditForm({...editForm, name: e.detail.value})}
                placeholder="请输入姓名"
              />
            </View>
          </View>
          <View className="mb-3">
            <Text className="text-sm text-gray-600 mb-1">电话</Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="bg-gray-50 px-3 py-2 rounded border border-gray-200"
                value={editForm.phone}
                onInput={(e) => setEditForm({...editForm, phone: e.detail.value})}
                placeholder="请输入电话"
              />
            </View>
          </View>
          <View className="mb-3">
            <Text className="text-sm text-gray-600 mb-1">邮箱</Text>
            <View style={{overflow: 'hidden'}}>
              <Input
                className="bg-gray-50 px-3 py-2 rounded border border-gray-200"
                value={editForm.email}
                onInput={(e) => setEditForm({...editForm, email: e.detail.value})}
                placeholder="请输入邮箱"
              />
            </View>
          </View>
          <View className="flex gap-2">
            <Button
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded break-keep text-sm"
              size="default"
              onClick={handleCancelEdit}>
              取消
            </Button>
            <Button
              className="flex-1 bg-blue-600 text-white py-2 rounded break-keep text-sm"
              size="default"
              onClick={handleSaveManager}>
              保存
            </Button>
          </View>
        </View>
      )
    }

    return (
      <View key={manager.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
        <View className="flex items-start justify-between mb-3">
          <View className="flex-1">
            <View className="flex items-center mb-2">
              <Text className="text-lg font-bold text-gray-800 mr-2">{manager.name || '未命名'}</Text>
              <View className="px-2 py-1 rounded bg-blue-100">
                <Text className="text-xs text-blue-600">管理员</Text>
              </View>
            </View>
            {manager.phone && (
              <View className="flex items-center mb-1">
                <View className="i-mdi-phone text-gray-400 mr-1" />
                <Text className="text-sm text-gray-600">{manager.phone}</Text>
              </View>
            )}
            {manager.email && (
              <View className="flex items-center">
                <View className="i-mdi-email text-gray-400 mr-1" />
                <Text className="text-sm text-gray-600">{manager.email}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 管辖仓库 */}
        <View className="mb-3 p-3 bg-gray-50 rounded-lg">
          <View className="flex items-center mb-2">
            <View className="i-mdi-warehouse text-blue-600 mr-1" />
            <Text className="text-sm font-medium text-gray-700">管辖仓库 ({warehouses.length})</Text>
          </View>
          {warehouses.length > 0 ? (
            <View className="flex flex-wrap gap-2">
              {warehouses.map((w) => (
                <View key={w.id} className="px-2 py-1 bg-white rounded border border-gray-200">
                  <Text className="text-xs text-gray-700">{w.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-xs text-gray-400">暂无仓库分配</Text>
          )}
        </View>

        {/* 操作按钮 */}
        <View className="flex flex-col gap-2">
          {/* 第一行按钮 */}
          <View className="flex gap-2">
            <Button
              className="flex-1 bg-blue-50 text-blue-600 py-2 rounded break-keep text-xs"
              size="default"
              onClick={() => handleEditManager(manager)}>
              编辑信息
            </Button>
            <Button
              className="flex-1 bg-green-50 text-green-600 py-2 rounded break-keep text-xs"
              size="default"
              onClick={() => handleAssignWarehouseToManager(manager.id, manager.name || '未命名')}>
              分配仓库
            </Button>
          </View>
          {/* 第二行按钮 */}
          <View className="flex gap-2">
            <Button
              className="flex-1 bg-purple-50 text-purple-600 py-2 rounded break-keep text-xs"
              size="default"
              onClick={() => handleChangeRole(manager.id, manager.name || '未命名', manager.role)}>
              变更角色
            </Button>
            <Button
              className="flex-1 bg-orange-50 text-orange-600 py-2 rounded break-keep text-xs"
              size="default"
              onClick={() => handleResetPassword(manager.id, manager.name || '未命名')}>
              重置密码
            </Button>
          </View>
        </View>
      </View>
    )
  }

  // 渲染司机卡片（司机管理标签）
  const renderDriverCard = (driver: Profile) => {
    const workDays = getWorkDays(driver.join_date)

    return (
      <View key={driver.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
        <View className="flex items-start justify-between mb-3">
          <View className="flex-1">
            <View className="flex items-center mb-2">
              <Text className="text-lg font-bold text-gray-800 mr-2">{driver.name || '未命名'}</Text>
              <View className="px-2 py-1 rounded bg-green-100">
                <Text className="text-xs text-green-600">{getDriverTypeText(driver.driver_type)}</Text>
              </View>
            </View>
            <View className="space-y-1">
              {driver.phone && (
                <View className="flex items-center">
                  <View className="i-mdi-phone text-sm text-gray-400 mr-1" />
                  <Text className="text-sm text-gray-600">{driver.phone}</Text>
                </View>
              )}
              {driver.login_account && (
                <View className="flex items-center">
                  <View className="i-mdi-account text-sm text-gray-400 mr-1" />
                  <Text className="text-sm text-gray-600">{driver.login_account}</Text>
                </View>
              )}
              {driver.vehicle_plate && (
                <View className="flex items-center">
                  <View className="i-mdi-car text-sm text-gray-400 mr-1" />
                  <Text className="text-sm text-gray-600">{driver.vehicle_plate}</Text>
                </View>
              )}
              {driver.join_date && (
                <View className="flex items-center">
                  <View className="i-mdi-calendar text-sm text-gray-400 mr-1" />
                  <Text className="text-sm text-gray-600">
                    入职：{driver.join_date}
                    {workDays && ` (${workDays}天)`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
          <Button
            className="flex-1 bg-blue-50 text-blue-600 py-2 rounded text-sm break-keep"
            size="mini"
            onClick={() => handleEditUser(driver.id)}>
            编辑信息
          </Button>
          <Button
            className="flex-1 bg-orange-50 text-orange-600 py-2 rounded text-sm break-keep"
            size="mini"
            onClick={() => handleResetPassword(driver.id, driver.name || '该司机')}>
            重置密码
          </Button>
        </View>
      </View>
    )
  }

  // 渲染管理员管理界面
  const renderManagerManagement = () => {
    return (
      <View>
        {/* 搜索框 */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View style={{overflow: 'hidden'}}>
            <Input
              className="bg-gray-50 px-4 py-3 rounded-lg w-full"
              placeholder="搜索姓名、手机号、邮箱"
              value={searchKeyword}
              onInput={handleSearchChange}
            />
          </View>
        </View>

        {/* 管理员列表 */}
        {loading ? (
          <View className="flex items-center justify-center py-12">
            <View className="i-mdi-loading animate-spin text-4xl text-blue-600 mb-2" />
            <Text className="text-gray-500 text-sm">加载中...</Text>
          </View>
        ) : filteredManagers.length === 0 ? (
          <View className="bg-white rounded-xl p-8 text-center shadow-sm">
            <View className="i-mdi-account-off text-6xl text-gray-300 mb-4" />
            <Text className="text-gray-500 block mb-2">暂无管理员</Text>
            <Text className="text-gray-400 text-sm">请尝试调整搜索条件</Text>
          </View>
        ) : (
          <View>
            <View className="flex items-center justify-between mb-3">
              <Text className="text-sm text-gray-600">共 {filteredManagers.length} 名管理员</Text>
            </View>
            {filteredManagers.map((manager) => renderManagerCard(manager))}
          </View>
        )}
      </View>
    )
  }

  // 渲染司机管理界面
  const renderDriverManagement = () => {
    if (warehouses.length === 0) {
      return (
        <View className="flex items-center justify-center py-12">
          <View className="i-mdi-warehouse-off text-6xl text-gray-300 mb-4" />
          <Text className="text-gray-500 block mb-2">暂无仓库</Text>
          <Text className="text-gray-400 text-sm">请先创建仓库</Text>
        </View>
      )
    }

    return (
      <View>
        {/* 仓库切换区域 */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex items-center justify-between mb-3">
            <View className="flex items-center">
              <View className="i-mdi-warehouse text-xl text-blue-600 mr-2" />
              <Text className="text-base font-bold text-gray-800">选择仓库</Text>
            </View>
            <Text className="text-xs text-gray-500">
              {currentWarehouseIndex + 1} / {warehouses.length}
            </Text>
          </View>

          {/* Swiper 仓库切换 */}
          <Swiper
            className="h-20"
            current={currentWarehouseIndex}
            onChange={handleWarehouseChange}
            indicatorDots
            indicatorColor="rgba(0, 0, 0, 0.3)"
            indicatorActiveColor="#1E3A8A">
            {warehouses.map((warehouse) => (
              <SwiperItem key={warehouse.id}>
                <View className="flex items-center justify-center h-full bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <View className="text-center">
                    <Text className="text-lg font-bold text-gray-800 block mb-1">{warehouse.name}</Text>
                  </View>
                </View>
              </SwiperItem>
            ))}
          </Swiper>
        </View>

        {/* 搜索和筛选 */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="mb-3">
            <View style={{overflow: 'hidden'}}>
              <Input
                className="bg-gray-50 px-4 py-3 rounded-lg w-full"
                placeholder="搜索姓名、手机号、车牌号"
                value={searchKeyword}
                onInput={handleSearchChange}
              />
            </View>
          </View>
        </View>

        {/* 司机列表 */}
        {loading ? (
          <View className="flex items-center justify-center py-12">
            <View className="i-mdi-loading animate-spin text-4xl text-blue-600 mb-2" />
            <Text className="text-gray-500 text-sm">加载中...</Text>
          </View>
        ) : filteredDrivers.length === 0 ? (
          <View className="bg-white rounded-xl p-8 text-center shadow-sm">
            <View className="i-mdi-account-off text-6xl text-gray-300 mb-4" />
            <Text className="text-gray-500 block mb-2">暂无司机</Text>
            <Text className="text-gray-400 text-sm">请尝试调整搜索条件</Text>
          </View>
        ) : (
          <View>
            <View className="flex items-center justify-between mb-3">
              <Text className="text-sm text-gray-600">共 {filteredDrivers.length} 名司机</Text>
            </View>
            {filteredDrivers.map((driver) => renderDriverCard(driver))}
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      {/* 顶部导航栏 */}
      <View className="bg-white shadow-sm">
        <View className="flex items-center justify-between px-4 py-3">
          <View className="flex items-center">
            <View className="i-mdi-account-group text-2xl text-blue-900 mr-2" />
            <Text className="text-lg font-bold text-gray-800">员工管理</Text>
          </View>
        </View>
        <View className="flex items-center justify-around border-t border-gray-100">
          <View
            onClick={() => handleTabChange('manager')}
            className={`flex-1 text-center py-3 ${currentTab === 'manager' ? 'border-b-2 border-blue-600' : ''}`}>
            <Text className={`text-sm ${currentTab === 'manager' ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
              管理员管理
            </Text>
          </View>
          <View
            onClick={() => handleTabChange('driver')}
            className={`flex-1 text-center py-3 ${currentTab === 'driver' ? 'border-b-2 border-blue-600' : ''}`}>
            <Text className={`text-sm ${currentTab === 'driver' ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
              司机管理
            </Text>
          </View>
        </View>
      </View>

      {/* 内容区域 */}
      <ScrollView scrollY className="box-border" style={{height: 'calc(100vh - 120px)', background: 'transparent'}}>
        <View className="p-4">
          {currentTab === 'manager' && renderManagerManagement()}
          {currentTab === 'driver' && renderDriverManagement()}
        </View>
      </ScrollView>
    </View>
  )
}

export default StaffManagement
