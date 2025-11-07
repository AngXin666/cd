import {Checkbox, CheckboxGroup, ScrollView, Text, View} from '@tarojs/components'
import Taro, {showLoading, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getAllProfiles, getDriverWarehouseIds, getManagerWarehouses, setDriverWarehouses} from '@/db/api'
import type {Profile, Warehouse} from '@/db/types'

const DriverManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedDriver, setSelectedDriver] = useState<Profile | null>(null)
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // 加载司机列表
  const loadDrivers = useCallback(async () => {
    const profiles = await getAllProfiles()
    const driverList = profiles.filter((p) => p.role === 'driver')
    setDrivers(driverList)
  }, [])

  // 加载管理员负责的仓库列表
  const loadWarehouses = useCallback(async () => {
    if (!user?.id) return
    const data = await getManagerWarehouses(user.id)
    setWarehouses(data)
  }, [user?.id])

  // 加载司机的仓库分配
  const loadDriverWarehouses = useCallback(
    async (driverId: string) => {
      const warehouseIds = await getDriverWarehouseIds(driverId)
      // 只显示管理员负责的仓库
      const managerWarehouseIds = warehouses.map((w) => w.id)
      const filteredIds = warehouseIds.filter((id) => managerWarehouseIds.includes(id))
      setSelectedWarehouseIds(filteredIds)
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

  // 选择司机
  const handleSelectDriver = async (driver: Profile) => {
    setSelectedDriver(driver)
    await loadDriverWarehouses(driver.id)
  }

  // 保存仓库分配
  const handleSave = async () => {
    if (!selectedDriver) {
      showToast({title: '请先选择司机', icon: 'none'})
      return
    }

    setLoading(true)
    showLoading({title: '保存中...'})

    // 获取司机当前所有的仓库分配
    const allWarehouseIds = await getDriverWarehouseIds(selectedDriver.id)
    // 移除管理员负责的仓库
    const managerWarehouseIds = warehouses.map((w) => w.id)
    const otherWarehouseIds = allWarehouseIds.filter((id) => !managerWarehouseIds.includes(id))
    // 合并：其他仓库 + 管理员新分配的仓库
    const finalWarehouseIds = [...otherWarehouseIds, ...selectedWarehouseIds]

    const success = await setDriverWarehouses(selectedDriver.id, finalWarehouseIds)

    Taro.hideLoading()
    setLoading(false)

    if (success) {
      showToast({title: '保存成功', icon: 'success'})
    } else {
      showToast({title: '保存失败', icon: 'error'})
    }
  }

  // 处理复选框变化
  const handleCheckboxChange = (e: any) => {
    setSelectedWarehouseIds(e.detail.value)
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
                <View className="flex items-center mb-3">
                  <View className="i-mdi-account-group text-blue-600 text-xl mr-2" />
                  <Text className="text-gray-800 text-base font-bold">选择司机</Text>
                </View>
                {drivers.length > 0 ? (
                  <View className="space-y-2">
                    {drivers.map((driver) => (
                      <View
                        key={driver.id}
                        className={`p-3 rounded-lg border-2 ${
                          selectedDriver?.id === driver.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50'
                        }`}
                        onClick={() => handleSelectDriver(driver)}>
                        <View className="flex items-center justify-between">
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
                      </View>
                    ))}
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
