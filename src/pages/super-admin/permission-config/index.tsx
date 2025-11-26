import {Button, Checkbox, CheckboxGroup, ScrollView, Switch, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {
  getAllWarehouses,
  getManagerPermissionsEnabled,
  getManagerWarehouseIds,
  setManagerWarehouses,
  updateManagerPermissionsEnabled
} from '@/db/api'
import type {Warehouse} from '@/db/types'

const PermissionConfig: React.FC = () => {
  const {user} = useAuth({guard: true})
  const router = useRouter()
  const {userId, userName} = router.params

  const [loading, setLoading] = useState(false)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<string[]>([])

  // 权限开关状态 - 使用新的 manager_permissions_enabled 字段
  const [managerPermissionsEnabled, setManagerPermissionsEnabled] = useState(true)

  // 加载数据
  const loadData = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    try {
      // 加载所有仓库
      const warehouseData = await getAllWarehouses()
      setWarehouses(warehouseData)

      // 加载车队长权限状态
      const permissionsEnabled = await getManagerPermissionsEnabled(userId)
      if (permissionsEnabled !== null) {
        setManagerPermissionsEnabled(permissionsEnabled)
      }

      // 加载管理员管辖仓库
      const warehouseIds = await getManagerWarehouseIds(userId)
      setSelectedWarehouseIds(warehouseIds)
    } catch (error) {
      console.error('加载数据失败:', error)
      Taro.showToast({title: '加载失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 仓库选择变化
  const handleWarehouseChange = useCallback((e: any) => {
    setSelectedWarehouseIds(e.detail.value)
  }, [])

  // 保存配置
  const handleSave = useCallback(async () => {
    if (!userId) return

    Taro.showLoading({title: '保存中...'})
    try {
      // 保存车队长权限状态
      const permissionSuccess = await updateManagerPermissionsEnabled(userId, managerPermissionsEnabled)

      if (!permissionSuccess) {
        throw new Error('保存权限配置失败')
      }

      // 保存管辖仓库
      const warehouseSuccess = await setManagerWarehouses(userId, selectedWarehouseIds)

      if (!warehouseSuccess) {
        throw new Error('保存管辖仓库失败')
      }

      Taro.showToast({title: '保存成功', icon: 'success'})
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('保存失败:', error)
      Taro.showToast({title: '保存失败', icon: 'error'})
    } finally {
      Taro.hideLoading()
    }
  }, [userId, managerPermissionsEnabled, selectedWarehouseIds])

  return (
    <View className="min-h-screen" style={{background: 'linear-gradient(to bottom, #fef2f2, #fee2e2)'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        {/* 页面标题 */}
        <View className="px-4 pt-6 pb-4">
          <Text className="text-2xl font-bold text-gray-800">权限配置</Text>
          <Text className="text-sm text-gray-500 mt-1">为 {decodeURIComponent(userName || '')} 配置管理权限</Text>
        </View>

        {loading ? (
          <View className="text-center py-8">
            <Text className="text-gray-500">加载中...</Text>
          </View>
        ) : (
          <>
            {/* 管辖仓库分配 */}
            <View className="px-4 mb-4">
              <View className="bg-white rounded-lg p-4 shadow-sm">
                <View className="flex items-center mb-3">
                  <View className="i-mdi-warehouse text-xl text-blue-600 mr-2" />
                  <Text className="text-lg font-semibold text-gray-800">管辖仓库分配</Text>
                </View>
                <Text className="text-sm text-gray-500 mb-3">选择该管理员有权管理的仓库</Text>

                {warehouses.length === 0 ? (
                  <Text className="text-sm text-gray-400 text-center py-4">暂无仓库数据</Text>
                ) : (
                  <CheckboxGroup onChange={handleWarehouseChange}>
                    {warehouses.map((warehouse) => (
                      <View
                        key={warehouse.id}
                        className="flex items-center py-2 border-b border-gray-100 last:border-0">
                        <Checkbox
                          value={warehouse.id}
                          checked={selectedWarehouseIds.includes(warehouse.id)}
                          className="mr-2"
                        />
                        <View className="flex-1">
                          <Text className="text-base text-gray-800">{warehouse.name}</Text>
                        </View>
                      </View>
                    ))}
                  </CheckboxGroup>
                )}
              </View>
            </View>

            {/* 功能权限开关 */}
            <View className="px-4 mb-4">
              <View className="bg-white rounded-lg p-4 shadow-sm">
                <View className="flex items-center mb-3">
                  <View className="i-mdi-shield-account text-xl text-orange-600 mr-2" />
                  <Text className="text-lg font-semibold text-gray-800">功能权限设置</Text>
                </View>
                <Text className="text-sm text-gray-500 mb-3">配置该管理员的具体操作权限</Text>

                {/* 用户信息修改权 - 主开关 */}
                <View className="flex items-center justify-between py-3">
                  <View className="flex-1">
                    <Text className="text-base text-gray-800 mb-1">用户信息修改权</Text>
                    <Text className="text-xs text-gray-500">允许编辑用户的基本信息、分配仓库、切换司机类型等操作</Text>
                  </View>
                  <Switch
                    checked={managerPermissionsEnabled}
                    onChange={(e) => setManagerPermissionsEnabled(e.detail.value)}
                  />
                </View>
              </View>
            </View>

            {/* 保存按钮 */}
            <View className="px-4 pb-6">
              <Button
                size="default"
                className="w-full text-base break-keep"
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  borderRadius: '8px',
                  height: '48px',
                  lineHeight: '48px'
                }}
                onClick={handleSave}>
                保存配置
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

export default PermissionConfig
