import {Button, Input, Picker, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {navigateTo, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  setDriverWarehouses as assignDriverWarehouses,
  getAllDrivers,
  getCurrentUserPermissions,
  getDriversByWarehouse,
  getDriverWarehouses,
  getManagerWarehouses,
  resetUserPassword,
  updateProfile
} from '@/db/api'
import type {ManagerPermission, Profile, Warehouse} from '@/db/types'
import {matchWithPinyin} from '@/utils/pinyin'

const StaffManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [currentTab, setCurrentTab] = useState<'driver' | 'assignment'>('driver')
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState(0)
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [filteredDrivers, setFilteredDrivers] = useState<Profile[]>([])
  const [allDrivers, setAllDrivers] = useState<Profile[]>([])
  const [filteredAllDrivers, setFilteredAllDrivers] = useState<Profile[]>([])
  const [driverWarehouses, setDriverWarehouses] = useState<Map<string, Warehouse[]>>(new Map())
  const [permissions, setPermissions] = useState<ManagerPermission | null>(null)
  const [editingDriver, setEditingDriver] = useState<Profile | null>(null)
  const [editForm, setEditForm] = useState({name: '', phone: '', vehicle_plate: ''})
  const [assigningWarehouseDriver, setAssigningWarehouseDriver] = useState<{id: string; name: string} | null>(null)
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [driverTypeFilter, setDriverTypeFilter] = useState<'all' | 'pure' | 'with_vehicle'>('all')
  const [loading, setLoading] = useState(false)

  // 司机类型选择器选项
  const driverTypeOptions = [
    {label: '全部司机', value: 'all'},
    {label: '纯司机', value: 'pure'},
    {label: '带车司机', value: 'with_vehicle'}
  ]

  // 加载管理员管辖的仓库列表
  const loadWarehouses = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await getManagerWarehouses(user.id)
      const enabledWarehouses = data.filter((w) => w.is_active)
      setWarehouses(enabledWarehouses)
    } catch (error) {
      console.error('加载仓库列表失败:', error)
      Taro.showToast({title: '加载仓库失败', icon: 'error'})
    }
  }, [user?.id])

  // 加载当前管理员的权限
  const loadPermissions = useCallback(async () => {
    try {
      const data = await getCurrentUserPermissions()
      setPermissions(data)
    } catch (error) {
      console.error('加载权限失败:', error)
    }
  }, [])

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

      if (currentTab === 'driver') {
        setFilteredDrivers(filtered)
      } else {
        setFilteredAllDrivers(filtered)
      }
    },
    [currentTab]
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

  // 加载所有司机（用于司机分配）
  const loadAllDrivers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllDrivers()
      setAllDrivers(data)
      filterDrivers(data, searchKeyword, driverTypeFilter)

      // 加载每个司机的仓库分配
      const warehousesMap = new Map<string, Warehouse[]>()
      for (const driver of data) {
        const driverWarehouseList = await getDriverWarehouses(driver.id)
        warehousesMap.set(driver.id, driverWarehouseList)
      }
      setDriverWarehouses(warehousesMap)
    } catch (error) {
      console.error('加载司机列表失败:', error)
      Taro.showToast({title: '加载司机失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }, [searchKeyword, driverTypeFilter, filterDrivers])

  // 搜索关键词变化
  const handleSearchChange = useCallback(
    (e: any) => {
      const keyword = e.detail.value
      setSearchKeyword(keyword)
      if (currentTab === 'driver') {
        filterDrivers(drivers, keyword, driverTypeFilter)
      } else {
        filterDrivers(allDrivers, keyword, driverTypeFilter)
      }
    },
    [currentTab, drivers, allDrivers, driverTypeFilter, filterDrivers]
  )

  // 司机类型筛选变化
  const handleDriverTypeFilterChange = useCallback(
    (e: any) => {
      const selectedIndex = e.detail.value
      const selectedType = driverTypeOptions[selectedIndex].value as 'all' | 'pure' | 'with_vehicle'
      setDriverTypeFilter(selectedType)
      if (currentTab === 'driver') {
        filterDrivers(drivers, searchKeyword, selectedType)
      } else {
        filterDrivers(allDrivers, searchKeyword, selectedType)
      }
    },
    [currentTab, drivers, allDrivers, searchKeyword, filterDrivers]
  )

  // 编辑用户
  const _handleEditUser = useCallback((userId: string) => {
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

  // 开始编辑司机
  const handleEditDriver = useCallback((driver: Profile) => {
    setEditingDriver(driver)
    setEditForm({
      name: driver.name || '',
      phone: driver.phone || '',
      vehicle_plate: driver.vehicle_plate || ''
    })
  }, [])

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingDriver(null)
    setEditForm({name: '', phone: '', vehicle_plate: ''})
  }, [])

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!editingDriver) return

    if (!editForm.name.trim()) {
      Taro.showToast({title: '请输入姓名', icon: 'none'})
      return
    }

    Taro.showLoading({title: '保存中...'})
    try {
      const success = await updateProfile(editingDriver.id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        vehicle_plate: editForm.vehicle_plate.trim() || null
      })

      if (success) {
        Taro.showToast({title: '保存成功', icon: 'success'})
        handleCancelEdit()
        // 刷新司机列表
        if (currentTab === 'driver' && warehouses.length > 0) {
          loadDriversByWarehouse(warehouses[currentWarehouseIndex].id)
        } else if (currentTab === 'assignment') {
          loadAllDrivers()
        }
      } else {
        Taro.showToast({title: '保存失败', icon: 'error'})
      }
    } catch (error) {
      console.error('保存失败:', error)
      Taro.showToast({title: '保存失败', icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }, [
    editingDriver,
    editForm,
    handleCancelEdit,
    currentTab,
    warehouses,
    currentWarehouseIndex,
    loadDriversByWarehouse,
    loadAllDrivers
  ])

  // 分配司机到仓库 - 打开对话框
  const handleAssignDriver = useCallback(
    (driverId: string, driverName: string) => {
      if (warehouses.length === 0) {
        Taro.showToast({title: '暂无可分配的仓库', icon: 'none'})
        return
      }

      // 获取司机当前的仓库分配
      const currentWarehouses = driverWarehouses.get(driverId) || []
      // 只保留启用的仓库ID（过滤掉已禁用的仓库）
      const enabledWarehouseIds = warehouses.map((w) => w.id)
      const currentWarehouseIds = currentWarehouses.filter((w) => enabledWarehouseIds.includes(w.id)).map((w) => w.id)

      // 设置状态，打开对话框
      setAssigningWarehouseDriver({id: driverId, name: driverName})
      setSelectedWarehouseIds(currentWarehouseIds)
    },
    [warehouses, driverWarehouses]
  )

  // 保存司机仓库分配
  const handleSaveDriverWarehouses = useCallback(async () => {
    if (!assigningWarehouseDriver) return

    const {id: driverId, name: driverName} = assigningWarehouseDriver
    const currentWarehouses = driverWarehouses.get(driverId) || []
    const currentWarehouseIds = currentWarehouses.map((w) => w.id)

    // 检查是否有修改
    const hasChanges =
      selectedWarehouseIds.length !== currentWarehouseIds.length ||
      selectedWarehouseIds.some((id) => !currentWarehouseIds.includes(id))

    if (!hasChanges) {
      Taro.showToast({title: '未做任何修改', icon: 'none'})
      setAssigningWarehouseDriver(null)
      return
    }

    Taro.showLoading({title: '保存中...'})
    try {
      const result = await assignDriverWarehouses(driverId, selectedWarehouseIds)
      if (result.success) {
        Taro.showToast({title: '保存成功', icon: 'success'})
        setAssigningWarehouseDriver(null)
        loadAllDrivers()
      } else {
        Taro.showToast({title: result.error || '保存失败', icon: 'error'})
      }
    } catch (error) {
      console.error('保存仓库分配失败:', error)
      Taro.showToast({title: '保存失败', icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }, [assigningWarehouseDriver, selectedWarehouseIds, driverWarehouses, loadAllDrivers])

  // 取消仓库分配
  const handleCancelWarehouseAssignment = useCallback(() => {
    setAssigningWarehouseDriver(null)
    setSelectedWarehouseIds([])
  }, [])

  // 切换仓库选择
  const handleToggleWarehouse = useCallback((warehouseId: string) => {
    setSelectedWarehouseIds((prev) => {
      if (prev.includes(warehouseId)) {
        return prev.filter((id) => id !== warehouseId)
      }
      return [...prev, warehouseId]
    })
  }, [])

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
  const handleTabChange = useCallback((tab: 'driver' | 'assignment') => {
    setCurrentTab(tab)
    setSearchKeyword('')
  }, [])

  // 初始化加载
  useEffect(() => {
    loadWarehouses()
    loadPermissions()
  }, [loadWarehouses, loadPermissions])

  // 仓库列表加载完成后，加载第一个仓库的司机
  useEffect(() => {
    if (warehouses.length > 0 && currentTab === 'driver') {
      loadDriversByWarehouse(warehouses[currentWarehouseIndex].id)
    }
  }, [warehouses, currentWarehouseIndex, currentTab, loadDriversByWarehouse])

  // 切换到司机分配标签时加载所有司机
  useEffect(() => {
    if (currentTab === 'assignment') {
      loadAllDrivers()
    }
  }, [currentTab, loadAllDrivers])

  // 页面显示时刷新数据
  useDidShow(() => {
    loadWarehouses()
  })

  // 下拉刷新
  usePullDownRefresh(() => {
    if (currentTab === 'driver') {
      if (warehouses[currentWarehouseIndex]) {
        loadDriversByWarehouse(warehouses[currentWarehouseIndex].id).finally(() => {
          Taro.stopPullDownRefresh()
        })
      }
    } else {
      loadAllDrivers().finally(() => {
        Taro.stopPullDownRefresh()
      })
    }
  })

  // 获取司机类型文本
  const getDriverTypeText = (driverType: string | null) => {
    if (driverType === 'driver_with_vehicle') return '带车司机'
    if (driverType === 'driver') return '纯司机'
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
              <View className="flex items-center">
                <View className="i-mdi-car text-sm text-gray-400 mr-1" />
                <Text className="text-sm text-gray-600">车牌：{driver.vehicle_plate || '无'}</Text>
              </View>
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

        {/* 只有有权限时才显示操作按钮 */}
        {permissions?.can_edit_user_info && (
          <View className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
            <Button
              className="flex-1 bg-blue-50 text-blue-600 py-2 rounded text-sm break-keep"
              size="mini"
              onClick={() => handleEditDriver(driver)}>
              编辑信息
            </Button>
            <Button
              className="flex-1 bg-orange-50 text-orange-600 py-2 rounded text-sm break-keep"
              size="mini"
              onClick={() => handleResetPassword(driver.id, driver.name || '该司机')}>
              重置密码
            </Button>
          </View>
        )}
      </View>
    )
  }

  // 渲染司机卡片（司机分配标签）
  const renderDriverAssignmentCard = (driver: Profile) => {
    const warehouseList = driverWarehouses.get(driver.id) || []
    // 只显示管理员管辖的仓库
    const managedWarehouses = warehouseList.filter((w) => warehouses.some((mw) => mw.id === w.id))
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
              <View className="flex items-center">
                <View className="i-mdi-car text-sm text-gray-400 mr-1" />
                <Text className="text-sm text-gray-600">车牌：{driver.vehicle_plate || '无'}</Text>
              </View>
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

        {/* 已分配的仓库（仅显示管理员管辖的） */}
        {managedWarehouses.length > 0 && (
          <View className="mb-3 p-3 bg-blue-50 rounded-lg">
            <View className="flex items-center mb-2">
              <View className="i-mdi-warehouse text-sm text-blue-600 mr-1" />
              <Text className="text-xs text-blue-800 font-medium">已分配的仓库</Text>
            </View>
            <View className="flex flex-wrap gap-2">
              {managedWarehouses.map((w) => (
                <View key={w.id} className="px-2 py-1 bg-white rounded">
                  <Text className="text-xs text-gray-700">{w.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
          <Button
            className="flex-1 bg-purple-50 text-purple-600 py-2 rounded text-sm break-keep"
            size="mini"
            onClick={() => handleAssignDriver(driver.id, driver.name || '该司机')}>
            分配仓库
          </Button>
          {permissions?.can_edit_user_info && (
            <Button
              className="flex-1 bg-blue-50 text-blue-600 py-2 rounded text-sm break-keep"
              size="mini"
              onClick={() => handleEditDriver(driver)}>
              编辑信息
            </Button>
          )}
        </View>
      </View>
    )
  }

  // 渲染司机管理界面
  const renderDriverManagement = () => {
    if (warehouses.length === 0) {
      return (
        <View className="flex items-center justify-center py-12">
          <View className="i-mdi-warehouse-off text-6xl text-gray-300 mb-4" />
          <Text className="text-gray-500 block mb-2">暂无管辖仓库</Text>
          <Text className="text-gray-400 text-sm">请联系超级管理员分配仓库</Text>
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
          <Picker mode="selector" range={driverTypeOptions.map((r) => r.label)} onChange={handleDriverTypeFilterChange}>
            <View className="bg-gray-50 px-4 py-3 rounded-lg flex items-center justify-between">
              <Text className="text-gray-700">
                {driverTypeOptions.find((r) => r.value === driverTypeFilter)?.label || '全部司机'}
              </Text>
              <View className="i-mdi-chevron-down text-gray-400" />
            </View>
          </Picker>
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
            <Text className="text-gray-500 block mb-2">该仓库暂无司机</Text>
            <Text className="text-gray-400 text-sm">请尝试调整筛选条件或切换仓库</Text>
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

  // 渲染司机分配界面
  const renderDriverAssignment = () => {
    return (
      <View>
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
          <Picker mode="selector" range={driverTypeOptions.map((r) => r.label)} onChange={handleDriverTypeFilterChange}>
            <View className="bg-gray-50 px-4 py-3 rounded-lg flex items-center justify-between">
              <Text className="text-gray-700">
                {driverTypeOptions.find((r) => r.value === driverTypeFilter)?.label || '全部司机'}
              </Text>
              <View className="i-mdi-chevron-down text-gray-400" />
            </View>
          </Picker>
        </View>

        {/* 司机列表 */}
        {loading ? (
          <View className="flex items-center justify-center py-12">
            <View className="i-mdi-loading animate-spin text-4xl text-blue-600 mb-2" />
            <Text className="text-gray-500 text-sm">加载中...</Text>
          </View>
        ) : filteredAllDrivers.length === 0 ? (
          <View className="bg-white rounded-xl p-8 text-center shadow-sm">
            <View className="i-mdi-account-off text-6xl text-gray-300 mb-4" />
            <Text className="text-gray-500 block mb-2">暂无司机</Text>
            <Text className="text-gray-400 text-sm">请尝试调整搜索条件</Text>
          </View>
        ) : (
          <View>
            <View className="flex items-center justify-between mb-3">
              <Text className="text-sm text-gray-600">共 {filteredAllDrivers.length} 名司机</Text>
            </View>
            {filteredAllDrivers.map((driver) => renderDriverAssignmentCard(driver))}
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
            onClick={() => handleTabChange('driver')}
            className={`flex-1 text-center py-3 ${currentTab === 'driver' ? 'border-b-2 border-blue-600' : ''}`}>
            <Text className={`text-sm ${currentTab === 'driver' ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
              司机管理
            </Text>
          </View>
          <View
            onClick={() => handleTabChange('assignment')}
            className={`flex-1 text-center py-3 ${currentTab === 'assignment' ? 'border-b-2 border-blue-600' : ''}`}>
            <Text className={`text-sm ${currentTab === 'assignment' ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
              司机分配
            </Text>
          </View>
        </View>
      </View>

      {/* 内容区域 */}
      <ScrollView scrollY className="box-border" style={{height: 'calc(100vh - 120px)', background: 'transparent'}}>
        <View className="p-4">{currentTab === 'driver' ? renderDriverManagement() : renderDriverAssignment()}</View>
      </ScrollView>

      {/* 编辑司机信息对话框 */}
      {editingDriver && (
        <View
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCancelEdit}>
          <View className="bg-white rounded-xl p-6 mx-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <View className="flex items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-800">编辑司机信息</Text>
              <View className="i-mdi-close text-xl text-gray-400" onClick={handleCancelEdit} />
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-sm text-gray-600 mb-2">姓名 *</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-gray-50 text-gray-800 px-3 py-2 rounded border border-gray-200 w-full"
                    value={editForm.name}
                    onInput={(e) => setEditForm({...editForm, name: e.detail.value})}
                    placeholder="请输入姓名"
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm text-gray-600 mb-2">手机号</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-gray-50 text-gray-800 px-3 py-2 rounded border border-gray-200 w-full"
                    value={editForm.phone}
                    onInput={(e) => setEditForm({...editForm, phone: e.detail.value})}
                    placeholder="请输入手机号"
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm text-gray-600 mb-2">车牌号</Text>
                <View style={{overflow: 'hidden'}}>
                  <Input
                    className="bg-gray-50 text-gray-800 px-3 py-2 rounded border border-gray-200 w-full"
                    value={editForm.vehicle_plate}
                    onInput={(e) => setEditForm({...editForm, vehicle_plate: e.detail.value})}
                    placeholder="请输入车牌号"
                  />
                </View>
              </View>
            </View>

            <View className="flex gap-3 mt-6">
              <Button
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded break-keep text-base"
                size="default"
                onClick={handleCancelEdit}>
                取消
              </Button>
              <Button
                className="flex-1 bg-blue-600 text-white py-3 rounded break-keep text-base"
                size="default"
                onClick={handleSaveEdit}>
                保存
              </Button>
            </View>
          </View>
        </View>
      )}

      {/* 仓库分配对话框 */}
      {assigningWarehouseDriver && (
        <View
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={handleCancelWarehouseAssignment}>
          <View
            className="bg-white rounded-lg w-11/12 max-w-md max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}>
            {/* 对话框标题 */}
            <View className="p-4 border-b border-gray-200">
              <Text className="text-lg font-bold text-gray-800">为 {assigningWarehouseDriver.name} 分配仓库</Text>
              <Text className="text-xs text-gray-500 mt-1">已选择 {selectedWarehouseIds.length} 个仓库</Text>
            </View>

            {/* 仓库列表 */}
            <ScrollView scrollY className="flex-1 p-4">
              {warehouses.map((warehouse) => {
                const isSelected = selectedWarehouseIds.includes(warehouse.id)
                return (
                  <View
                    key={warehouse.id}
                    onClick={() => handleToggleWarehouse(warehouse.id)}
                    className="flex flex-row items-center p-3 mb-2 bg-gray-50 rounded-lg active:bg-gray-100">
                    {/* 复选框 */}
                    <View
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                      {isSelected && <Text className="text-white text-xs">✓</Text>}
                    </View>
                    {/* 仓库名称 */}
                    <Text className={`flex-1 ${isSelected ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                      {warehouse.name}
                    </Text>
                  </View>
                )
              })}
            </ScrollView>

            {/* 操作按钮 */}
            <View className="p-4 border-t border-gray-200 flex flex-row gap-3">
              <Button
                onClick={handleCancelWarehouseAssignment}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded break-keep text-sm"
                size="default">
                取消
              </Button>
              <Button
                onClick={handleSaveDriverWarehouses}
                className="flex-1 bg-blue-600 text-white py-3 rounded break-keep text-sm"
                size="default">
                保存
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default StaffManagement
