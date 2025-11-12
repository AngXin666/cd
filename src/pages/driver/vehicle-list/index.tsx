/**
 * 车辆列表页面
 * 显示司机名下的所有车辆
 */

import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {deleteVehicle, getDriverVehicles} from '@/db/api'
import type {Vehicle} from '@/db/types'

const VehicleList: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)

  // 加载车辆列表
  const loadVehicles = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const data = await getDriverVehicles(user.id)
      setVehicles(data)
    } catch (error) {
      console.error('加载车辆列表失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  // 页面显示时加载数据
  useDidShow(() => {
    loadVehicles()
  })

  // 添加车辆
  const handleAddVehicle = () => {
    Taro.navigateTo({
      url: '/pages/driver/add-vehicle/index'
    })
  }

  // 查看车辆详情
  const handleViewDetail = (vehicleId: string) => {
    Taro.navigateTo({
      url: `/pages/driver/vehicle-detail/index?id=${vehicleId}`
    })
  }

  // 删除车辆
  const handleDeleteVehicle = async (vehicleId: string, plateNumber: string) => {
    const res = await Taro.showModal({
      title: '确认删除',
      content: `确定要删除车辆 ${plateNumber} 吗？`
    })

    if (res.confirm) {
      Taro.showLoading({title: '删除中...'})
      const success = await deleteVehicle(vehicleId)
      Taro.hideLoading()

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
    }
  }

  return (
    <View className="min-h-screen bg-background">
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="mb-4">
            <Text className="text-2xl font-bold text-foreground">我的车辆</Text>
            <Text className="text-sm text-muted-foreground mt-1 block">管理您的车辆信息</Text>
          </View>

          {/* 添加车辆按钮 */}
          <Button
            className="w-full bg-primary text-primary-foreground py-4 rounded break-keep text-base mb-4"
            size="default"
            onClick={handleAddVehicle}>
            <View className="flex items-center justify-center">
              <View className="i-mdi-plus-circle text-xl mr-2"></View>
              <Text>添加车辆</Text>
            </View>
          </Button>

          {/* 车辆列表 */}
          {loading ? (
            <View className="flex items-center justify-center py-20">
              <View className="i-mdi-loading animate-spin text-4xl text-primary"></View>
              <Text className="text-muted-foreground mt-2">加载中...</Text>
            </View>
          ) : vehicles.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-car-off text-6xl text-muted-foreground mb-4"></View>
              <Text className="text-muted-foreground">暂无车辆信息</Text>
              <Text className="text-sm text-muted-foreground mt-2">点击上方按钮添加车辆</Text>
            </View>
          ) : (
            <View className="space-y-4">
              {vehicles.map((vehicle) => (
                <View
                  key={vehicle.id}
                  className="bg-card rounded-lg p-4 shadow-sm"
                  onClick={() => handleViewDetail(vehicle.id)}>
                  <View className="flex items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-foreground">{vehicle.plate_number}</Text>
                      <Text className="text-sm text-muted-foreground mt-1">
                        {vehicle.brand} {vehicle.model}
                      </Text>
                    </View>
                    <View className={`px-3 py-1 rounded ${vehicle.status === 'active' ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Text
                        className={`text-xs ${vehicle.status === 'active' ? 'text-primary' : 'text-muted-foreground'}`}>
                        {vehicle.status === 'active' ? '使用中' : '已停用'}
                      </Text>
                    </View>
                  </View>

                  {/* 车辆照片预览 */}
                  {vehicle.front_photo && (
                    <View className="mb-3">
                      <Image src={vehicle.front_photo} mode="aspectFill" className="w-full h-32 rounded" />
                    </View>
                  )}

                  {/* 车辆信息 */}
                  <View className="flex flex-wrap gap-2 mb-3">
                    {vehicle.color && (
                      <View className="flex items-center bg-muted px-2 py-1 rounded">
                        <View className="i-mdi-palette text-sm text-muted-foreground mr-1"></View>
                        <Text className="text-xs text-muted-foreground">{vehicle.color}</Text>
                      </View>
                    )}
                    {vehicle.vehicle_type && (
                      <View className="flex items-center bg-muted px-2 py-1 rounded">
                        <View className="i-mdi-car-info text-sm text-muted-foreground mr-1"></View>
                        <Text className="text-xs text-muted-foreground">{vehicle.vehicle_type}</Text>
                      </View>
                    )}
                  </View>

                  {/* 操作按钮 */}
                  <View className="flex gap-2">
                    <Button
                      className="flex-1 bg-primary/10 text-primary py-2 rounded break-keep text-sm"
                      size="default"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewDetail(vehicle.id)
                      }}>
                      查看详情
                    </Button>
                    <Button
                      className="flex-1 bg-destructive/10 text-destructive py-2 rounded break-keep text-sm"
                      size="default"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteVehicle(vehicle.id, vehicle.plate_number)
                      }}>
                      删除
                    </Button>
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

export default VehicleList
