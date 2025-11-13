import {Checkbox, CheckboxGroup, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {showLoading, showToast, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {createDriver, getAllProfiles, getDriverWarehouseIds, getManagerWarehouses, setDriverWarehouses} from '@/db/api'
import type {Profile, Warehouse} from '@/db/types'
import {createLogger} from '@/utils/logger'

// 创建页面日志记录器
const logger = createLogger('DriverManagement')

const DriverManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedDriver, setSelectedDriver] = useState<Profile | null>(null)
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // 搜索相关状态
  const [searchKeyword, setSearchKeyword] = useState('')

  // 添加司机相关状态
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [newDriverPhone, setNewDriverPhone] = useState('')
  const [newDriverName, setNewDriverName] = useState('')
  const [addingDriver, setAddingDriver] = useState(false)

  // 过滤后的司机列表
  const filteredDrivers = useMemo(() => {
    if (!searchKeyword.trim()) {
      return drivers
    }
    const keyword = searchKeyword.trim().toLowerCase()
    return drivers.filter(
      (driver) =>
        driver.name?.toLowerCase().includes(keyword) ||
        driver.phone?.toLowerCase().includes(keyword) ||
        driver.email?.toLowerCase().includes(keyword)
    )
  }, [drivers, searchKeyword])

  // 加载司机列表
  const loadDrivers = useCallback(async () => {
    logger.info('开始加载司机列表')
    try {
      const profiles = await getAllProfiles()
      const driverList = profiles.filter((p) => p.role === 'driver')
      setDrivers(driverList)
      logger.info(`成功加载司机列表，共 ${driverList.length} 名司机`)
    } catch (error) {
      logger.error('加载司机列表失败', error)
    }
  }, [])

  // 加载管理员负责的仓库列表（只加载启用的仓库）
  const loadWarehouses = useCallback(async () => {
    if (!user?.id) return
    logger.info('开始加载管理员仓库列表', {managerId: user.id})
    try {
      const data = await getManagerWarehouses(user.id)
      const enabledWarehouses = data.filter((w) => w.is_active)
      setWarehouses(enabledWarehouses)
      logger.info(`成功加载仓库列表，共 ${enabledWarehouses.length} 个启用仓库`)
    } catch (error) {
      logger.error('加载仓库列表失败', error)
    }
  }, [user?.id])

  // 加载司机的仓库分配
  const loadDriverWarehouses = useCallback(
    async (driverId: string) => {
      logger.info('开始加载司机仓库分配', {driverId})
      try {
        const warehouseIds = await getDriverWarehouseIds(driverId)
        // 只显示管理员负责的且启用的仓库
        const managerWarehouseIds = warehouses.map((w) => w.id)
        const filteredIds = warehouseIds.filter((id) => managerWarehouseIds.includes(id))
        setSelectedWarehouseIds(filteredIds)
        logger.info(`成功加载司机仓库分配，共 ${filteredIds.length} 个仓库`, {driverId, warehouseIds: filteredIds})
      } catch (error) {
        logger.error('加载司机仓库分配失败', error)
      }
    },
    [warehouses]
  )

  useEffect(() => {
    loadDrivers()
    loadWarehouses()
  }, [loadDrivers, loadWarehouses])

  useDidShow(() => {
    loadDrivers()
    loadWarehouses()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadDrivers(), loadWarehouses()])
    Taro.stopPullDownRefresh()
  })

  // 选择司机
  const handleSelectDriver = async (driver: Profile) => {
    logger.userAction('选择司机', {driverId: driver.id, driverName: driver.name})
    setSelectedDriver(driver)
    await loadDriverWarehouses(driver.id)
  }

  // 查看司机的个人信息
  const handleViewDriverProfile = (driverId: string) => {
    logger.userAction('查看司机个人信息', {driverId})
    Taro.navigateTo({
      url: `/pages/manager/driver-profile/index?driverId=${driverId}`
    })
  }

  // 查看司机的车辆
  const handleViewDriverVehicles = (driverId: string) => {
    logger.userAction('查看司机车辆', {driverId})
    Taro.navigateTo({
      url: `/pages/driver/vehicle-list/index?driverId=${driverId}`
    })
  }

  // 保存仓库分配
  const handleSave = async () => {
    if (!selectedDriver) {
      showToast({title: '请先选择司机', icon: 'none'})
      return
    }

    logger.userAction('保存司机仓库分配', {
      driverId: selectedDriver.id,
      driverName: selectedDriver.name,
      selectedWarehouses: selectedWarehouseIds
    })

    setLoading(true)
    showLoading({title: '保存中...'})

    try {
      // 获取司机当前所有的仓库分配
      const allWarehouseIds = await getDriverWarehouseIds(selectedDriver.id)
      // 移除管理员负责的仓库
      const managerWarehouseIds = warehouses.map((w) => w.id)
      const otherWarehouseIds = allWarehouseIds.filter((id) => !managerWarehouseIds.includes(id))
      // 合并：其他仓库 + 管理员新分配的仓库
      const finalWarehouseIds = [...otherWarehouseIds, ...selectedWarehouseIds]

      logger.debug('仓库分配详情', {
        allWarehouseIds,
        managerWarehouseIds,
        otherWarehouseIds,
        selectedWarehouseIds,
        finalWarehouseIds
      })

      const success = await setDriverWarehouses(selectedDriver.id, finalWarehouseIds)

      Taro.hideLoading()
      setLoading(false)

      if (success) {
        logger.info('保存司机仓库分配成功', {driverId: selectedDriver.id, warehouseCount: finalWarehouseIds.length})
        showToast({
          title: '保存成功，司机端将实时同步',
          icon: 'success',
          duration: 3000
        })
      } else {
        logger.error('保存司机仓库分配失败', {driverId: selectedDriver.id})
        showToast({
          title: '保存失败，请重试',
          icon: 'error',
          duration: 2000
        })
      }
    } catch (error) {
      logger.error('保存司机仓库分配异常', error)
      Taro.hideLoading()
      setLoading(false)
      showToast({
        title: '保存失败，请重试',
        icon: 'error',
        duration: 2000
      })
    }
  }

  // 处理复选框变化
  const handleCheckboxChange = (e: any) => {
    setSelectedWarehouseIds(e.detail.value)
  }

  // 切换添加司机表单显示
  const toggleAddDriver = () => {
    setShowAddDriver(!showAddDriver)
    if (!showAddDriver) {
      // 重置表单
      setNewDriverPhone('')
      setNewDriverName('')
    }
  }

  // 处理添加司机
  const handleAddDriver = async () => {
    // 验证输入
    if (!newDriverPhone.trim()) {
      showToast({title: '请输入手机号', icon: 'none'})
      return
    }
    if (!newDriverName.trim()) {
      showToast({title: '请输入姓名', icon: 'none'})
      return
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(newDriverPhone.trim())) {
      showToast({title: '请输入正确的手机号', icon: 'none'})
      return
    }

    setAddingDriver(true)
    showLoading({title: '添加中...'})

    const newDriver = await createDriver(newDriverPhone.trim(), newDriverName.trim())

    Taro.hideLoading()
    setAddingDriver(false)

    if (newDriver) {
      // 显示详细的创建成功信息
      const loginAccount = `${newDriverPhone.trim()}@fleet.com`
      const driverType = '普通司机'
      const defaultPassword = '123456'
      const plateNumber = newDriver.vehicle_plate || '未设置'

      Taro.showModal({
        title: '司机创建成功',
        content: `姓名：${newDriverName.trim()}\n手机号码：${newDriverPhone.trim()}\n司机类型：${driverType}\n登录账号：${loginAccount}\n默认密码：${defaultPassword}\n车牌号码：${plateNumber}`,
        showCancel: false,
        confirmText: '知道了',
        success: () => {
          // 重置表单
          setNewDriverPhone('')
          setNewDriverName('')
          setShowAddDriver(false)
          // 刷新司机列表
          loadDrivers()
        }
      })
    } else {
      showToast({title: '添加失败，手机号可能已存在', icon: 'error'})
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">司机管理</Text>
            <Text className="text-blue-100 text-sm block">为司机分配您负责的仓库</Text>
          </View>

          {/* 提示信息 */}
          {warehouses.length === 0 && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <View className="flex items-start">
                <View className="i-mdi-alert text-yellow-600 text-xl mr-2 mt-0.5" />
                <View className="flex-1">
                  <Text className="text-yellow-800 text-sm block mb-1 font-medium">暂无仓库</Text>
                  <Text className="text-yellow-700 text-xs block">您还没有被分配任何仓库，无法管理司机</Text>
                </View>
              </View>
            </View>
          )}

          {warehouses.length > 0 && (
            <>
              {/* 司机列表 */}
              <View className="bg-white rounded-lg p-4 mb-4 shadow">
                <View className="flex items-center justify-between mb-3">
                  <View className="flex items-center">
                    <View className="i-mdi-account-group text-blue-600 text-xl mr-2" />
                    <Text className="text-gray-800 text-base font-bold">选择司机</Text>
                  </View>
                  {/* 添加司机按钮 */}
                  <View
                    onClick={toggleAddDriver}
                    className="flex items-center bg-blue-600 rounded-lg px-3 py-2 active:scale-95 transition-all">
                    <View className={`${showAddDriver ? 'i-mdi-close' : 'i-mdi-plus'} text-white text-base mr-1`} />
                    <Text className="text-white text-xs font-medium">{showAddDriver ? '取消' : '添加司机'}</Text>
                  </View>
                </View>

                {/* 搜索框 */}
                <View className="mb-3">
                  <View className="flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    <View className="i-mdi-magnify text-gray-400 text-xl mr-2" />
                    <Input
                      type="text"
                      placeholder="搜索司机姓名、手机号或邮箱"
                      value={searchKeyword}
                      onInput={(e) => setSearchKeyword(e.detail.value)}
                      className="flex-1 text-sm"
                    />
                    {searchKeyword && (
                      <View className="i-mdi-close-circle text-gray-400 text-lg" onClick={() => setSearchKeyword('')} />
                    )}
                  </View>
                </View>

                {/* 添加司机表单 */}
                {showAddDriver && (
                  <View className="bg-blue-50 rounded-lg p-4 mb-3 border-2 border-blue-200">
                    <View className="mb-3">
                      <Text className="text-gray-700 text-sm block mb-2">手机号</Text>
                      <Input
                        type="number"
                        maxlength={11}
                        placeholder="请输入11位手机号"
                        value={newDriverPhone}
                        onInput={(e) => setNewDriverPhone(e.detail.value)}
                        className="bg-white rounded-lg px-3 py-2 text-sm border border-gray-300"
                      />
                    </View>
                    <View className="mb-3">
                      <Text className="text-gray-700 text-sm block mb-2">姓名</Text>
                      <Input
                        type="text"
                        placeholder="请输入司机姓名"
                        value={newDriverName}
                        onInput={(e) => setNewDriverName(e.detail.value)}
                        className="bg-white rounded-lg px-3 py-2 text-sm border border-gray-300"
                      />
                    </View>
                    <View
                      onClick={addingDriver ? undefined : handleAddDriver}
                      className={`flex items-center justify-center bg-blue-600 rounded-lg py-2 active:scale-98 transition-all ${
                        addingDriver ? 'opacity-50' : ''
                      }`}>
                      <View className="i-mdi-check text-white text-base mr-1" />
                      <Text className="text-white text-sm font-medium">确认添加</Text>
                    </View>
                  </View>
                )}

                {filteredDrivers.length > 0 ? (
                  <View className="space-y-2">
                    {filteredDrivers.map((driver) => (
                      <View
                        key={driver.id}
                        className={`p-3 rounded-lg border-2 ${
                          selectedDriver?.id === driver.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50'
                        }`}>
                        <View
                          className="flex items-center justify-between mb-2"
                          onClick={() => handleSelectDriver(driver)}>
                          <View className="flex items-center flex-1">
                            <View className="i-mdi-account text-blue-600 text-2xl mr-3" />
                            <View className="flex-1">
                              <Text className="text-gray-800 text-base font-medium block">
                                {driver.name || '未设置姓名'}
                              </Text>
                              <Text className="text-gray-500 text-xs block">{driver.phone || driver.email}</Text>
                            </View>
                          </View>
                          {selectedDriver?.id === driver.id && (
                            <View className="i-mdi-check-circle text-blue-600 text-xl" />
                          )}
                        </View>
                        {/* 操作按钮 */}
                        <View className="flex gap-2 mt-2">
                          {/* 查看个人信息按钮 */}
                          <View
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDriverProfile(driver.id)
                            }}
                            className="flex-1 flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg py-2 active:scale-98 transition-all">
                            <View className="i-mdi-account-card text-white text-base mr-1" />
                            <Text className="text-white text-xs font-medium">个人信息</Text>
                          </View>
                          {/* 查看车辆按钮 */}
                          <View
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDriverVehicles(driver.id)
                            }}
                            className="flex-1 flex items-center justify-center bg-gradient-to-r from-green-600 to-green-700 rounded-lg py-2 active:scale-98 transition-all">
                            <View className="i-mdi-car text-white text-base mr-1" />
                            <Text className="text-white text-xs font-medium">车辆管理</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : searchKeyword ? (
                  <View className="text-center py-8">
                    <View className="i-mdi-account-search text-gray-300 text-5xl mb-2" />
                    <Text className="text-gray-400 text-sm block">未找到匹配的司机</Text>
                  </View>
                ) : (
                  <View className="text-center py-8">
                    <View className="i-mdi-account-off text-gray-300 text-5xl mb-2" />
                    <Text className="text-gray-400 text-sm block">暂无司机</Text>
                  </View>
                )}
              </View>

              {/* 仓库分配 */}
              {selectedDriver && (
                <View className="bg-white rounded-lg p-4 mb-4 shadow">
                  <View className="flex items-center mb-3">
                    <View className="i-mdi-warehouse text-blue-600 text-xl mr-2" />
                    <Text className="text-gray-800 text-base font-bold">分配仓库</Text>
                  </View>
                  <View className="mb-3 bg-blue-50 rounded-lg p-3">
                    <Text className="text-blue-800 text-sm block">
                      当前司机：{selectedDriver.name || selectedDriver.phone || selectedDriver.email}
                    </Text>
                  </View>
                  <CheckboxGroup onChange={handleCheckboxChange}>
                    <View className="space-y-2">
                      {warehouses.map((warehouse) => (
                        <View key={warehouse.id} className="flex items-center bg-gray-50 rounded-lg p-3">
                          <Checkbox
                            value={warehouse.id}
                            checked={selectedWarehouseIds.includes(warehouse.id)}
                            className="mr-3"
                          />
                          <View className="flex-1">
                            <Text className="text-gray-800 text-sm block">{warehouse.name}</Text>
                          </View>
                          <View className={`px-2 py-1 rounded ${warehouse.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <Text className={`text-xs ${warehouse.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                              {warehouse.is_active ? '启用' : '禁用'}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </CheckboxGroup>
                </View>
              )}

              {/* 保存按钮 */}
              {selectedDriver && (
                <View className="bg-white rounded-lg p-4 shadow">
                  <View
                    className={`flex items-center justify-center bg-blue-600 rounded-xl p-4 active:scale-98 transition-all ${
                      loading ? 'opacity-50' : ''
                    }`}
                    onClick={loading ? undefined : handleSave}>
                    <View className="i-mdi-content-save text-2xl text-white mr-2" />
                    <Text className="text-base font-bold text-white">保存分配</Text>
                  </View>
                </View>
              )}

              {/* 操作提示 */}
              {!selectedDriver && (
                <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <View className="flex items-start">
                    <View className="i-mdi-information text-yellow-600 text-xl mr-2 mt-0.5" />
                    <View className="flex-1">
                      <Text className="text-yellow-800 text-sm block mb-1 font-medium">操作提示</Text>
                      <Text className="text-yellow-700 text-xs block">1. 先选择要分配仓库的司机</Text>
                      <Text className="text-yellow-700 text-xs block">2. 勾选该司机可以工作的仓库</Text>
                      <Text className="text-yellow-700 text-xs block">3. 点击保存按钮完成分配</Text>
                      <Text className="text-yellow-700 text-xs block">4. 您只能分配自己负责的仓库</Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default DriverManagement
