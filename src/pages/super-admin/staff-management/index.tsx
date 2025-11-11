import {Button, Input, Picker, ScrollView, Swiper, SwiperItem, Text, View} from '@tarojs/components'
import Taro, {navigateTo, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  getAllManagers,
  getAllWarehouses,
  getDriversByWarehouse,
  getManagerPermission,
  getManagerWarehouses,
  resetUserPassword
} from '@/db/api'
import type {ManagerPermission, Profile, Warehouse} from '@/db/types'
import {matchWithPinyin} from '@/utils/pinyin'

const StaffManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [currentTab, setCurrentTab] = useState<'driver' | 'manager'>('driver')
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [currentWarehouseIndex, setCurrentWarehouseIndex] = useState(0)
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [filteredDrivers, setFilteredDrivers] = useState<Profile[]>([])
  const [managers, setManagers] = useState<Profile[]>([])
  const [filteredManagers, setFilteredManagers] = useState<Profile[]>([])
  const [managerPermissions, setManagerPermissions] = useState<Map<string, ManagerPermission>>(new Map())
  const [managerWarehouses, setManagerWarehouses] = useState<Map<string, Warehouse[]>>(new Map())
  const [searchKeyword, setSearchKeyword] = useState('')
  const [driverTypeFilter, setDriverTypeFilter] = useState<'all' | 'pure' | 'with_vehicle'>('all')
  const [loading, setLoading] = useState(false)

  // 司机类型选择器选项
  const driverTypeOptions = [
    {label: '全部司机', value: 'all'},
    {label: '纯司机', value: 'pure'},
    {label: '带车司机', value: 'with_vehicle'}
  ]

  // 加载仓库列表
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

  // 过滤管理员
  const filterManagers = useCallback((managerList: Profile[], keyword: string) => {
    let filtered = managerList

    // 关键词过滤
    if (keyword.trim()) {
      filtered = filtered.filter((m) => {
        const name = m.name || ''
        const phone = m.phone || ''
        const email = m.email || ''
        return (
          matchWithPinyin(name, keyword) ||
          phone.toLowerCase().includes(keyword.toLowerCase()) ||
          email.toLowerCase().includes(keyword.toLowerCase())
        )
      })
    }

    setFilteredManagers(filtered)
  }, [])

  // 加载所有管理员
  const loadManagers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllManagers()
      setManagers(data)
      filterManagers(data, searchKeyword)

      // 加载每个管理员的权限和仓库
      const permissionsMap = new Map<string, ManagerPermission>()
      const warehousesMap = new Map<string, Warehouse[]>()

      for (const manager of data) {
        // 加载权限
        const permission = await getManagerPermission(manager.id)
        if (permission) {
          permissionsMap.set(manager.id, permission)
        }

        // 加载管理的仓库
        const managerWarehouseList = await getManagerWarehouses(manager.id)
        warehousesMap.set(manager.id, managerWarehouseList)
      }

      setManagerPermissions(permissionsMap)
      setManagerWarehouses(warehousesMap)
    } catch (error) {
      console.error('加载管理员列表失败:', error)
      Taro.showToast({title: '加载管理员失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }, [searchKeyword, filterManagers])

  // 搜索关键词变化
  const handleSearchChange = useCallback(
    (e: any) => {
      const keyword = e.detail.value
      setSearchKeyword(keyword)
      if (currentTab === 'driver') {
        filterDrivers(drivers, keyword, driverTypeFilter)
      } else {
        filterManagers(managers, keyword)
      }
    },
    [currentTab, drivers, driverTypeFilter, managers, filterDrivers, filterManagers]
  )

  // 司机类型筛选变化
  const handleDriverTypeFilterChange = useCallback(
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

  // 配置管理员权限
  const handleConfigPermission = useCallback((managerId: string) => {
    navigateTo({url: `/pages/super-admin/permission-config/index?managerId=${managerId}`})
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
  const handleTabChange = useCallback((tab: 'driver' | 'manager') => {
    setCurrentTab(tab)
    setSearchKeyword('')
  }, [])

  // 初始化加载
  useEffect(() => {
    loadWarehouses()
  }, [loadWarehouses])

  // 仓库列表加载完成后，加载第一个仓库的司机
  useEffect(() => {
    if (warehouses.length > 0 && currentTab === 'driver') {
      loadDriversByWarehouse(warehouses[currentWarehouseIndex].id)
    }
  }, [warehouses, currentWarehouseIndex, currentTab, loadDriversByWarehouse])

  // 切换到管理员标签时加载管理员
  useEffect(() => {
    if (currentTab === 'manager') {
      loadManagers()
    }
  }, [currentTab, loadManagers])

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
      loadManagers().finally(() => {
        Taro.stopPullDownRefresh()
      })
    }
  })

  // 获取司机类型文本
  const getDriverTypeText = (driverType: string | null) => {
    if (driverType === 'with_vehicle') return '带车司机'
    if (driverType === 'pure') return '纯司机'
    return '未设置'
  }

  // 获取权限文本
  const getPermissionText = (permission: ManagerPermission) => {
    const permissions: string[] = []
    if (permission.can_edit_user_info) permissions.push('编辑用户信息')
    if (permission.can_edit_piece_work) permissions.push('编辑计件')
    if (permission.can_manage_attendance_rules) permissions.push('管理考勤规则')
    if (permission.can_manage_system) permissions.push('系统管理')
    return permissions.length > 0 ? permissions.join('、') : '无权限'
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

  // 渲染司机卡片
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

  // 渲染管理员卡片
  const renderManagerCard = (manager: Profile) => {
    const permission = managerPermissions.get(manager.id)
    const warehouseList = managerWarehouses.get(manager.id) || []
    const workDays = getWorkDays(manager.join_date)

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
            <View className="space-y-1">
              {manager.phone && (
                <View className="flex items-center">
                  <View className="i-mdi-phone text-sm text-gray-400 mr-1" />
                  <Text className="text-sm text-gray-600">{manager.phone}</Text>
                </View>
              )}
              {manager.email && (
                <View className="flex items-center">
                  <View className="i-mdi-email text-sm text-gray-400 mr-1" />
                  <Text className="text-sm text-gray-600">{manager.email}</Text>
                </View>
              )}
              {manager.login_account && (
                <View className="flex items-center">
                  <View className="i-mdi-account text-sm text-gray-400 mr-1" />
                  <Text className="text-sm text-gray-600">{manager.login_account}</Text>
                </View>
              )}
              {manager.join_date && (
                <View className="flex items-center">
                  <View className="i-mdi-calendar text-sm text-gray-400 mr-1" />
                  <Text className="text-sm text-gray-600">
                    入职：{manager.join_date}
                    {workDays && ` (${workDays}天)`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 管理的仓库 */}
        {warehouseList.length > 0 && (
          <View className="mb-3 p-3 bg-blue-50 rounded-lg">
            <View className="flex items-center mb-2">
              <View className="i-mdi-warehouse text-sm text-blue-600 mr-1" />
              <Text className="text-xs text-blue-800 font-medium">管理的仓库</Text>
            </View>
            <View className="flex flex-wrap gap-2">
              {warehouseList.map((w) => (
                <View key={w.id} className="px-2 py-1 bg-white rounded">
                  <Text className="text-xs text-gray-700">{w.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 权限信息 */}
        {permission && (
          <View className="mb-3 p-3 bg-green-50 rounded-lg">
            <View className="flex items-center mb-2">
              <View className="i-mdi-shield-check text-sm text-green-600 mr-1" />
              <Text className="text-xs text-green-800 font-medium">拥有的权限</Text>
            </View>
            <Text className="text-xs text-gray-700">{getPermissionText(permission)}</Text>
          </View>
        )}

        <View className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
          <Button
            className="flex-1 bg-blue-50 text-blue-600 py-2 rounded text-sm break-keep"
            size="mini"
            onClick={() => handleEditUser(manager.id)}>
            编辑信息
          </Button>
          <Button
            className="flex-1 bg-purple-50 text-purple-600 py-2 rounded text-sm break-keep"
            size="mini"
            onClick={() => handleConfigPermission(manager.id)}>
            配置权限
          </Button>
          <Button
            className="flex-1 bg-orange-50 text-orange-600 py-2 rounded text-sm break-keep"
            size="mini"
            onClick={() => handleResetPassword(manager.id, manager.name || '该管理员')}>
            重置密码
          </Button>
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

  // 渲染管理员管理界面
  const renderManagerManagement = () => {
    return (
      <View>
        {/* 搜索 */}
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
            <View className="i-mdi-shield-account-off text-6xl text-gray-300 mb-4" />
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
            onClick={() => handleTabChange('manager')}
            className={`flex-1 text-center py-3 ${currentTab === 'manager' ? 'border-b-2 border-blue-600' : ''}`}>
            <Text className={`text-sm ${currentTab === 'manager' ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
              管理员管理
            </Text>
          </View>
        </View>
      </View>

      {/* 内容区域 */}
      <ScrollView scrollY className="box-border" style={{height: 'calc(100vh - 120px)', background: 'transparent'}}>
        <View className="p-4">{currentTab === 'driver' ? renderDriverManagement() : renderManagerManagement()}</View>
      </ScrollView>
    </View>
  )
}

export default StaffManagement
