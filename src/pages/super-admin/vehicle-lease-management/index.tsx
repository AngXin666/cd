/**
 * 超级管理端 - 车辆租赁管理页面
 */

import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import type {VehicleLeaseInfo} from '@/db/types'
import {deleteVehicle, getAllVehicleLeaseInfo, searchVehiclesByPlateNumber} from '@/db/vehicle-lease'

const VehicleLeaseManagement: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [vehicles, setVehicles] = useState<VehicleLeaseInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')

  // 加载车辆列表
  const loadVehicles = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllVehicleLeaseInfo()
      setVehicles(data)
    } catch (error) {
      console.error('加载车辆列表失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  // 搜索车辆
  const handleSearch = useCallback(async () => {
    if (!searchKeyword.trim()) {
      loadVehicles()
      return
    }

    setLoading(true)
    try {
      const data = await searchVehiclesByPlateNumber(searchKeyword)
      setVehicles(data)
    } catch (error) {
      console.error('搜索车辆失败:', error)
      Taro.showToast({
        title: '搜索失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [searchKeyword, loadVehicles])

  // 清空搜索
  const handleClearSearch = useCallback(() => {
    setSearchKeyword('')
    loadVehicles()
  }, [loadVehicles])

  // 添加车辆
  const handleAddVehicle = useCallback(() => {
    Taro.navigateTo({
      url: '/pages/super-admin/vehicle-lease-edit/index'
    })
  }, [])

  // 编辑车辆
  const handleEditVehicle = useCallback((vehicleId: string) => {
    Taro.navigateTo({
      url: `/pages/super-admin/vehicle-lease-edit/index?id=${vehicleId}`
    })
  }, [])

  // 删除车辆
  const handleDeleteVehicle = useCallback(
    async (vehicleId: string, plateNumber: string) => {
      const result = await Taro.showModal({
        title: '确认删除',
        content: `确定要删除车辆 ${plateNumber} 吗？此操作不可恢复。`
      })

      if (!result.confirm) return

      try {
        const success = await deleteVehicle(vehicleId)
        if (success) {
          Taro.showToast({
            title: '删除成功',
            icon: 'success'
          })
          loadVehicles()
        } else {
          Taro.showToast({
            title: '删除失败',
            icon: 'error'
          })
        }
      } catch (error) {
        console.error('删除车辆失败:', error)
        Taro.showToast({
          title: '删除失败',
          icon: 'error'
        })
      }
    },
    [loadVehicles]
  )

  // 格式化日期
  const formatDate = (date: string | null): string => {
    if (!date) return '--'
    return date
  }

  // 格式化租金
  const formatRent = (rent: number): string => {
    return `¥${rent.toFixed(2)}`
  }

  // 页面显示时加载数据
  useDidShow(() => {
    loadVehicles()
  })

  useEffect(() => {
    loadVehicles()
  }, [loadVehicles])

  if (!user) {
    return null
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="mb-4">
            <Text className="text-2xl font-bold text-primary">车辆租赁管理</Text>
            <Text className="text-sm text-muted-foreground mt-1">管理车辆租赁信息和租金缴纳</Text>
          </View>

          {/* 搜索栏 */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <View className="flex items-center gap-2">
              <View className="flex-1" style={{overflow: 'hidden'}}>
                <Input
                  className="bg-input text-foreground px-3 py-2 rounded border border-border w-full"
                  placeholder="搜索车牌号"
                  value={searchKeyword}
                  onInput={(e) => setSearchKeyword(e.detail.value)}
                />
              </View>
              <Button
                className="bg-primary text-white px-4 py-2 rounded break-keep text-sm"
                size="default"
                onClick={handleSearch}>
                搜索
              </Button>
              {searchKeyword && (
                <Button
                  className="bg-muted text-muted-foreground px-4 py-2 rounded break-keep text-sm"
                  size="default"
                  onClick={handleClearSearch}>
                  清空
                </Button>
              )}
            </View>
          </View>

          {/* 添加按钮 */}
          <View className="mb-4">
            <Button
              className="w-full bg-primary text-white py-4 rounded break-keep text-base"
              size="default"
              onClick={handleAddVehicle}>
              <View className="flex items-center justify-center gap-2">
                <View className="i-mdi-plus text-xl" />
                <Text>添加车辆</Text>
              </View>
            </Button>
          </View>

          {/* 车辆列表 */}
          {loading ? (
            <View className="flex items-center justify-center py-8">
              <Text className="text-muted-foreground">加载中...</Text>
            </View>
          ) : vehicles.length === 0 ? (
            <View className="bg-white rounded-lg p-8 text-center">
              <View className="i-mdi-car text-6xl text-muted-foreground mb-4" />
              <Text className="text-muted-foreground">暂无车辆数据</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {vehicles.map((vehicle) => (
                <View key={vehicle.id} className="bg-white rounded-lg p-4 shadow-sm">
                  {/* 车辆基本信息 */}
                  <View className="flex items-center justify-between mb-3">
                    <View className="flex items-center gap-2">
                      <View className="i-mdi-car text-2xl text-primary" />
                      <Text className="text-lg font-bold text-foreground">{vehicle.plate_number}</Text>
                      {vehicle.is_lease_active && (
                        <View className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">租赁中</View>
                      )}
                    </View>
                    <View className="flex items-center gap-2">
                      <View
                        className="i-mdi-pencil text-xl text-primary"
                        onClick={() => handleEditVehicle(vehicle.id)}
                      />
                      <View
                        className="i-mdi-delete text-xl text-destructive"
                        onClick={() => handleDeleteVehicle(vehicle.id, vehicle.plate_number)}
                      />
                    </View>
                  </View>

                  {/* 车辆详情 */}
                  <View className="space-y-2">
                    <View className="flex items-center gap-2">
                      <Text className="text-sm text-muted-foreground w-20">车辆信息</Text>
                      <Text className="text-sm text-foreground flex-1">
                        {vehicle.brand} {vehicle.model} {vehicle.vehicle_type ? `(${vehicle.vehicle_type})` : ''}
                      </Text>
                    </View>

                    {vehicle.ownership_type && (
                      <View className="flex items-center gap-2">
                        <Text className="text-sm text-muted-foreground w-20">车辆归属</Text>
                        <Text className="text-sm text-foreground flex-1">
                          {vehicle.ownership_type === 'company' ? '公司车' : '个人车'}
                        </Text>
                      </View>
                    )}

                    {vehicle.lessor_name && (
                      <View className="flex items-center gap-2">
                        <Text className="text-sm text-muted-foreground w-20">租赁方</Text>
                        <Text className="text-sm text-foreground flex-1">
                          {vehicle.lessor_name}
                          {vehicle.lessor_contact && ` (${vehicle.lessor_contact})`}
                        </Text>
                      </View>
                    )}

                    {vehicle.lessee_name && (
                      <View className="flex items-center gap-2">
                        <Text className="text-sm text-muted-foreground w-20">承租方</Text>
                        <Text className="text-sm text-foreground flex-1">
                          {vehicle.lessee_name}
                          {vehicle.lessee_contact && ` (${vehicle.lessee_contact})`}
                        </Text>
                      </View>
                    )}

                    {vehicle.lease_start_date && vehicle.lease_end_date && (
                      <View className="flex items-center gap-2">
                        <Text className="text-sm text-muted-foreground w-20">租赁时间</Text>
                        <Text className="text-sm text-foreground flex-1">
                          {formatDate(vehicle.lease_start_date)} 至 {formatDate(vehicle.lease_end_date)}
                        </Text>
                      </View>
                    )}

                    {vehicle.monthly_rent > 0 && (
                      <View className="flex items-center gap-2">
                        <Text className="text-sm text-muted-foreground w-20">租金费用</Text>
                        <Text className="text-sm font-bold text-primary flex-1">
                          {formatRent(vehicle.monthly_rent)}/月
                        </Text>
                      </View>
                    )}

                    {vehicle.next_payment_date && (
                      <View className="flex items-center gap-2">
                        <Text className="text-sm text-muted-foreground w-20">下次缴纳</Text>
                        <Text className="text-sm text-orange-600 flex-1">{formatDate(vehicle.next_payment_date)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default VehicleLeaseManagement
