import {Button, Checkbox, CheckboxGroup, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import * as UsersAPI from '@/db/api/users'
import * as WarehousesAPI from '@/db/api/warehouses'

import type {Profile, Warehouse} from '@/db/types'

const ManagerWarehouseAssignment: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [managers, setManagers] = useState<Profile[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedManager, setSelectedManager] = useState<Profile | null>(null)
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // 加载管理员列表
  const loadManagers = useCallback(async () => {
    const allProfiles = await UsersAPI.getAllProfiles()
    const managerList = allProfiles.filter((p) => p.role === 'MANAGER')
    setManagers(managerList)
  }, [])

  // 加载仓库列表
  const loadWarehouses = useCallback(async () => {
    const data = await WarehousesAPI.getAllWarehouses()
    setWarehouses(data)
  }, [])

  // 加载管理员的仓库分配
  const loadManagerWarehouses = useCallback(async (managerId: string) => {
    console.log('[仓库管理-管理员仓库分配] 加载管理员的仓库分配', {managerId})
    const data = await WarehousesAPI.getManagerWarehouses(managerId)
    const warehouseIds = data.map((w) => w.id)
    console.log('[仓库管理-管理员仓库分配] 管理员已分配仓库', {
      managerId,
      warehouses: data,
      warehouseIds,
      count: warehouseIds.length
    })
    setSelectedWarehouseIds(warehouseIds)
  }, [])

  useEffect(() => {
    loadManagers()
    loadWarehouses()
  }, [loadManagers, loadWarehouses])

  useDidShow(() => {
    loadManagers()
    loadWarehouses()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadManagers(), loadWarehouses()])
    Taro.stopPullDownRefresh()
  })

  // 选择管理员
  const handleSelectManager = async (manager: Profile) => {
    console.log('[仓库管理-管理员仓库分配] 选择管理员', {
      managerId: manager.id,
      managerName: manager.name,
      role: manager.role
    })
    setSelectedManager(manager)
    await loadManagerWarehouses(manager.id)
  }

  // 处理仓库选择变化
  const handleWarehouseChange = (e: any) => {
    const newSelected = e.detail.value
    console.log('[仓库管理-管理员仓库分配] 仓库选择变化', {
      selectedWarehouseIds: newSelected,
      count: newSelected.length
    })
    setSelectedWarehouseIds(newSelected)
  }

  // 保存分配
  const handleSave = async () => {
    if (!selectedManager) {
      console.warn('[仓库管理-管理员仓库分配] 未选择管理员')
      Taro.showToast({
        title: '请先选择管理员',
        icon: 'none'
      })
      return
    }

    console.log('[仓库管理-管理员仓库分配] 开始保存仓库分配', {
      managerId: selectedManager.id,
      managerName: selectedManager.name,
      selectedWarehouseIds,
      warehouseCount: selectedWarehouseIds.length
    })
    setLoading(true)
    const success = await UsersAPI.setManagerWarehouses(selectedManager.id, selectedWarehouseIds)
    setLoading(false)

    if (success) {
      console.log('[仓库管理-管理员仓库分配] 保存成功')
      Taro.showToast({
        title: '分配成功，数据已同步',
        icon: 'success',
        duration: 2000
      })
      // 提示管理员重新登录以查看最新数据
      setTimeout(() => {
        Taro.showModal({
          title: '提示',
          content: `已为 ${selectedManager.name || selectedManager.phone} 分配仓库。管理员下次登录时将自动同步最新数据。`,
          showCancel: false,
          confirmText: '知道了'
        })
      }, 2000)
    } else {
      console.error('[仓库管理-管理员仓库分配] 保存失败')
      Taro.showToast({
        title: '保存失败',
        icon: 'error'
      })
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-lg p-6 mb-4 shadow-lg">
            <Text className="text-white text-2xl font-bold block mb-2">管理员仓库分配</Text>
            <Text className="text-blue-100 text-sm block">为管理员分配可管理的仓库</Text>
          </View>

          {/* 管理员列表 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow">
            <View className="flex items-center mb-3">
              <View className="i-mdi-account-group text-blue-600 text-xl mr-2" />
              <Text className="text-gray-800 text-base font-bold">选择管理员</Text>
              <View className="ml-auto">
                <Text className="text-xs text-gray-500">共 {managers.length} 位管理员</Text>
              </View>
            </View>

            {managers.length > 0 ? (
              <View className="space-y-2">
                {managers.map((manager) => (
                  <View
                    key={manager.id}
                    className={`rounded-lg p-4 ${selectedManager?.id === manager.id ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50'}`}
                    onClick={() => handleSelectManager(manager)}>
                    <View className="flex items-center justify-between">
                      <View className="flex items-center">
                        <View className="i-mdi-account-circle text-3xl text-blue-900 mr-3" />
                        <View>
                          <Text className="text-gray-800 text-base font-medium block">
                            {manager.name || '未设置姓名'}
                          </Text>
                          <Text className="text-xs text-gray-500 block">{manager.phone || manager.email}</Text>
                        </View>
                      </View>
                      {selectedManager?.id === manager.id && (
                        <View className="i-mdi-check-circle text-2xl text-blue-600" />
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="text-center py-8">
                <View className="i-mdi-account-off text-gray-300 text-5xl mb-2" />
                <Text className="text-gray-400 text-sm block">暂无管理员</Text>
              </View>
            )}
          </View>

          {/* 仓库选择 */}
          {selectedManager && (
            <View className="bg-white rounded-lg p-4 mb-4 shadow">
              <View className="flex items-center mb-3">
                <View className="i-mdi-warehouse text-orange-600 text-xl mr-2" />
                <Text className="text-gray-800 text-base font-bold">分配仓库</Text>
                <View className="ml-auto">
                  <Text className="text-xs text-gray-500">已选 {selectedWarehouseIds.length} 个</Text>
                </View>
              </View>

              <View className="mb-4 p-3 bg-blue-50 rounded-lg">
                <Text className="text-sm text-blue-800 block">
                  为 <Text className="font-bold">{selectedManager.name || selectedManager.phone}</Text> 分配仓库
                </Text>
              </View>

              {warehouses.length > 0 ? (
                <CheckboxGroup onChange={handleWarehouseChange}>
                  <View className="space-y-2">
                    {warehouses.map((warehouse) => (
                      <View key={warehouse.id} className="bg-gray-50 rounded-lg p-4">
                        <View className="flex items-center">
                          <Checkbox
                            value={warehouse.id}
                            checked={selectedWarehouseIds.includes(warehouse.id)}
                            color="#3B82F6"
                          />
                          <View className="ml-3 flex-1">
                            <View className="flex items-center justify-between">
                              <View className="flex items-center">
                                <View className="i-mdi-warehouse text-orange-600 text-xl mr-2" />
                                <Text className="text-gray-800 text-base font-medium">{warehouse.name}</Text>
                              </View>
                              <View
                                className={`px-2 py-1 rounded ${warehouse.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <Text className={`text-xs ${warehouse.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                                  {warehouse.is_active ? '启用中' : '已禁用'}
                                </Text>
                              </View>
                            </View>
                          </View>
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

              {/* 保存按钮 */}
              <View className="mt-4">
                <Button
                  size="default"
                  className="w-full text-sm break-keep"
                  style={{
                    backgroundColor: '#1E3A8A',
                    color: 'white',
                    borderRadius: '8px',
                    border: 'none'
                  }}
                  onClick={handleSave}
                  loading={loading}>
                  保存分配
                </Button>
              </View>
            </View>
          )}

          {/* 提示信息 */}
          {!selectedManager && (
            <View className="bg-white rounded-lg p-4 shadow">
              <View className="text-center py-8">
                <View className="i-mdi-information text-blue-600 text-5xl mb-3" />
                <Text className="text-gray-600 text-sm block mb-2">请先选择一位管理员</Text>
                <Text className="text-gray-400 text-xs block">然后为其分配可管理的仓库</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default ManagerWarehouseAssignment
