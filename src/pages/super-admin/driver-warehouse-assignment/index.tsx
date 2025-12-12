import {Button, Checkbox, CheckboxGroup, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {showLoading, showToast, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import * as UsersAPI from '@/db/api/users'
import * as WarehousesAPI from '@/db/api/warehouses'

import {createNotifications} from '@/db/notificationApi'
import type {Profile, Warehouse} from '@/db/types'

const DriverWarehouseAssignment: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedDriver, setSelectedDriver] = useState<Profile | null>(null)
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)

  // 添加司机相关状�?  const [showAddDriver, setShowAddDriver] = useState(false)
  const [newDriverPhone, setNewDriverPhone] = useState('')
  const [newDriverName, setNewDriverName] = useState('')
  const [addingDriver, setAddingDriver] = useState(false)

  // 加载司机列表
  const loadDrivers = useCallback(async () => {
    const profiles = await UsersAPI.getAllProfiles()
    const driverList = profiles.filter((p) => p.role === 'DRIVER')
    setDrivers(driverList)

    // 同时获取当前用户的profile信息
    if (user?.id) {
      const currentProfile = profiles.find((p) => p.id === user.id)
      setCurrentUserProfile(currentProfile || null)
    }
  }, [user?.id])

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    const data = await WarehousesAPI.getAllWarehouses()
    setWarehouses(data)
  }, [])

  // 加载司机的仓库分�?  const loadDriverWarehouses = useCallback(async (driverId: string) => {
    const warehouseIds = await WarehousesAPI.getDriverWarehouseIds(driverId)
    setSelectedWarehouseIds(warehouseIds)
  }, [])

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

  // 发送仓库分配通知
  const sendWarehouseAssignmentNotifications = async (
    driver: Profile,
    previousWarehouseIds: string[],
    newWarehouseIds: string[],
    allWarehouses: Warehouse[],
    operatorProfile: Profile | null
  ) => {
    try {
      const notifications: Array<{
        userId: string
        type: 'warehouse_assigned' | 'warehouse_unassigned'
        title: string
        message: string
        relatedId?: string
      }> = []

      // 判断是新增还是取消仓�?      const addedWarehouseIds = newWarehouseIds.filter((id) => !previousWarehouseIds.includes(id))
      const removedWarehouseIds = previousWarehouseIds.filter((id) => !newWarehouseIds.includes(id))

      // 如果没有任何变更，不发送通知
      if (addedWarehouseIds.length === 0 && removedWarehouseIds.length === 0) {
        return
      }

      // 1. 通知司机（新增仓库）
      if (addedWarehouseIds.length > 0) {
        const addedWarehouseNames = allWarehouses
          .filter((w) => addedWarehouseIds.includes(w.id))
          .map((w) => w.name)
          .join('�?)

        notifications.push({
          userId: driver.id,
          type: 'warehouse_assigned',
          title: '仓库分配通知',
          message: `您已被分配到新的仓库�?{addedWarehouseNames}`,
          relatedId: driver.id
        })
      }

      // 2. 通知司机（取消仓库）
      if (removedWarehouseIds.length > 0) {
        const removedWarehouseNames = allWarehouses
          .filter((w) => removedWarehouseIds.includes(w.id))
          .map((w) => w.name)
          .join('�?)

        notifications.push({
          userId: driver.id,
          type: 'warehouse_unassigned',
          title: '仓库取消分配通知',
          message: `您已被取消以下仓库的分配�?{removedWarehouseNames}`,
          relatedId: driver.id
        })
      }

      // 3. 通知相关管理�?      if (operatorProfile) {
        if (operatorProfile.role === 'MANAGER') {
          // 车队长操�?�?通知所有老板

          const superAdmins = await UsersAPI.getAllSuperAdmins()
          const operationDesc =
            addedWarehouseIds.length > 0 && removedWarehouseIds.length > 0
              ? '修改了仓库分�?
              : addedWarehouseIds.length > 0
                ? '分配了新仓库'
                : '取消了仓库分�?

          const warehouseDesc =
            addedWarehouseIds.length > 0 && removedWarehouseIds.length > 0
              ? `新增�?{allWarehouses
                  .filter((w) => addedWarehouseIds.includes(w.id))
                  .map((w) => w.name)
                  .join('�?)}；取消：${allWarehouses
                  .filter((w) => removedWarehouseIds.includes(w.id))
                  .map((w) => w.name)
                  .join('�?)}`
              : addedWarehouseIds.length > 0
                ? allWarehouses
                    .filter((w) => addedWarehouseIds.includes(w.id))
                    .map((w) => w.name)
                    .join('�?)
                : allWarehouses
                    .filter((w) => removedWarehouseIds.includes(w.id))
                    .map((w) => w.name)
                    .join('�?)

          for (const admin of superAdmins) {
            notifications.push({
              userId: admin.id,
              type: 'warehouse_assigned',
              title: '仓库分配操作通知',
              message: `车队�?${operatorProfile.name} ${operationDesc}：司�?${driver.name}，仓�?${warehouseDesc}`,
              relatedId: driver.id
            })
          }
        } else if (operatorProfile.role === 'BOSS') {
          // 老板操作 �?通知相关仓库的车队长

          const affectedWarehouseIds = [...new Set([...addedWarehouseIds, ...removedWarehouseIds])]

          const managersSet = new Set<string>()

          for (const warehouseId of affectedWarehouseIds) {
            const managers = await WarehousesAPI.getWarehouseManagers(warehouseId)
            for (const m of managers) {
              managersSet.add(m.id)
            }
          }

          const operationDesc =
            addedWarehouseIds.length > 0 && removedWarehouseIds.length > 0
              ? '修改了仓库分�?
              : addedWarehouseIds.length > 0
                ? '分配了新仓库'
                : '取消了仓库分�?

          const warehouseDesc =
            addedWarehouseIds.length > 0 && removedWarehouseIds.length > 0
              ? `新增�?{allWarehouses
                  .filter((w) => addedWarehouseIds.includes(w.id))
                  .map((w) => w.name)
                  .join('�?)}；取消：${allWarehouses
                  .filter((w) => removedWarehouseIds.includes(w.id))
                  .map((w) => w.name)
                  .join('�?)}`
              : addedWarehouseIds.length > 0
                ? allWarehouses
                    .filter((w) => addedWarehouseIds.includes(w.id))
                    .map((w) => w.name)
                    .join('�?)
                : allWarehouses
                    .filter((w) => removedWarehouseIds.includes(w.id))
                    .map((w) => w.name)
                    .join('�?)

          for (const managerId of managersSet) {
            notifications.push({
              userId: managerId,
              type: 'warehouse_assigned',
              title: '仓库分配操作通知',
              message: `老板 ${operatorProfile.name} ${operationDesc}：司�?${driver.name}，仓�?${warehouseDesc}`,
              relatedId: driver.id
            })
          }
        }
      } else {
      }

      // 批量发送通知
      if (notifications.length > 0) {
        const success = await createNotifications(notifications)
        if (success) {
        } else {
          console.error('�?[通知系统] 发送通知失败')
          showToast({
            title: '通知发送失�?,
            icon: 'none',
            duration: 2000
          })
        }
      } else {
      }
    } catch (error) {
      console.error('�?[通知系统] 发送仓库分配通知异常:', error)
      showToast({
        title: '通知发送异�?,
        icon: 'none',
        duration: 2000
      })
    }
  }

  // 选择司机
  const handleSelectDriver = async (driver: Profile) => {
    setSelectedDriver(driver)
    await loadDriverWarehouses(driver.id)
  }

  // 保存仓库分配
  const handleSave = async () => {
    if (!selectedDriver) {
      console.warn('[仓库管理-司机仓库分配] 未选择司机')
      showToast({title: '请先选择司机', icon: 'none'})
      return
    }

    setLoading(true)
    showLoading({title: '保存�?..'})

    // 获取保存之前的仓库ID，用于判断是新增还是取消
    const previousWarehouseIds = await WarehousesAPI.getDriverWarehouseIds(selectedDriver.id)
    const result = await WarehousesAPI.setDriverWarehouses(selectedDriver.id, selectedWarehouseIds)

    Taro.hideLoading()
    setLoading(false)

    if (result.success) {
      // 显示详细的成功提�?      const warehouseNames = warehouses
        .filter((w) => selectedWarehouseIds.includes(w.id))
        .map((w) => w.name)
        .join('�?)

      const message =
        selectedWarehouseIds.length > 0
          ? `已为 ${selectedDriver.name} 分配仓库�?{warehouseNames}。\n\n司机需要重新进入页面才能看到更新。`
          : `已清�?${selectedDriver.name} 的仓库分配。`

      // 发送通知
      await sendWarehouseAssignmentNotifications(
        selectedDriver,
        previousWarehouseIds,
        selectedWarehouseIds,
        warehouses,
        currentUserProfile
      )

      await Taro.showModal({
        title: '分配成功',
        content: message,
        showCancel: false,
        confirmText: '知道�?
      })
    } else {
      console.error('[仓库管理-司机仓库分配] 保存失败', {error: result.error})
      showToast({
        title: result.error || '保存失败，请重试',
        icon: 'error',
        duration: 3000
      })
    }
  }

  // 处理复选框变化
  const handleCheckboxChange = (e: any) => {
    const newSelected = e.detail.value
    setSelectedWarehouseIds(newSelected)
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
      showToast({title: '请输入姓�?, icon: 'none'})
      return
    }

    // 验证手机号格�?    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(newDriverPhone.trim())) {
      showToast({title: '请输入正确的手机�?, icon: 'none'})
      return
    }

    setAddingDriver(true)
    showLoading({title: '添加�?..'})

    const newDriver = await UsersAPI.createDriver(newDriverPhone.trim(), newDriverName.trim())

    Taro.hideLoading()
    setAddingDriver(false)

    if (newDriver) {
      // 显示详细的创建成功信�?      const loginAccount = `${newDriverPhone.trim()}@fleet.com`
      const driverType = '普通司�?
      const defaultPassword = '123456'
      const plateNumber = newDriver.vehicle_plate || '未设�?

      Taro.showModal({
        title: '司机创建成功',
        content: `姓名�?{newDriverName.trim()}
手机号码�?{newDriverPhone.trim()}
司机类型�?{driverType}
登录账号�?{loginAccount}
默认密码�?{defaultPassword}
车牌号码�?{plateNumber}`,
        showCancel: false,
        confirmText: '知道�?,
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
      showToast({title: '添加失败，手机号可能已存�?, icon: 'error'})
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">司机仓库分配</Text>
            <Text className="text-blue-100 text-sm block">为司机分配工作仓�?/Text>
          </View>

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

            {/* 添加司机表单 */}
            {showAddDriver && (
              <View className="bg-blue-50 rounded-lg p-4 mb-3 border-2 border-blue-200">
                <View className="mb-3">
                  <Text className="text-gray-700 text-sm block mb-2">手机�?/Text>
                  <Input
                    type="number"
                    maxlength={11}
                    placeholder="请输�?1位手机号"
                    value={newDriverPhone}
                    onInput={(e) => setNewDriverPhone(e.detail.value)}
                    className="bg-white rounded-lg px-3 py-2 text-sm border border-gray-300"
                  />
                </View>
                <View className="mb-3">
                  <Text className="text-gray-700 text-sm block mb-2">姓名</Text>
                  <Input
                    type="text"
                    placeholder="请输入司机姓�?
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
                            {driver.name || '未设置姓�?}
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
              {warehouses.length > 0 ? (
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
              ) : (
                <View className="text-center py-8">
                  <View className="i-mdi-warehouse-off text-gray-300 text-5xl mb-2" />
                  <Text className="text-gray-400 text-sm block">暂无仓库</Text>
                </View>
              )}
            </View>
          )}

          {/* 保存按钮 */}
          {selectedDriver && (
            <View className="bg-white rounded-lg p-4 shadow">
              <Button
                size="default"
                className="w-full bg-blue-600 text-white text-base font-bold break-keep"
                onClick={handleSave}
                disabled={loading}>
                保存分配
              </Button>
            </View>
          )}

          {/* 提示信息 */}
          {!selectedDriver && (
            <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <View className="flex items-start">
                <View className="i-mdi-information text-yellow-600 text-xl mr-2 mt-0.5" />
                <View className="flex-1">
                  <Text className="text-yellow-800 text-sm block mb-1 font-medium">操作提示</Text>
                  <Text className="text-yellow-700 text-xs block">1. 先选择要分配仓库的司机</Text>
                  <Text className="text-yellow-700 text-xs block">2. 勾选该司机可以工作的仓�?/Text>
                  <Text className="text-yellow-700 text-xs block">3. 点击保存按钮完成分配</Text>
                  <Text className="text-yellow-700 text-xs block">4. 司机只能在被分配的仓库打�?/Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default DriverWarehouseAssignment
