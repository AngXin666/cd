/**
 * 车辆信息审核列表页面
 * 显示所有待审核的车辆
 * 超级管理员专用
 */

import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getPendingReviewVehicles, getProfileById} from '@/db/api'
import type {Profile, Vehicle} from '@/db/types'
import {createLogger} from '@/utils/logger'

const logger = createLogger('VehicleReview')

const VehicleReview: React.FC = () => {
  useAuth({guard: true}) // 确保用户已登录
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(false)

  // 加载待审核车辆列表
  const loadVehicles = useCallback(async () => {
    setLoading(true)
    logger.info('加载待审核车辆列表')

    try {
      const data = await getPendingReviewVehicles()
      setVehicles(data)

      // 加载司机信息
      const driverIds = [...new Set(data.map((v) => v.user_id))]
      const driverData: Record<string, Profile> = {}

      for (const driverId of driverIds) {
        const driver = await getProfileById(driverId)
        if (driver) {
          driverData[driverId] = driver
        }
      }

      setDrivers(driverData)
      logger.info('加载待审核车辆列表成功', {count: data.length})
    } catch (error) {
      logger.error('加载待审核车辆列表失败', error)
      Taro.showToast({title: '加载失败', icon: 'none'})
    } finally {
      setLoading(false)
    }
  }, [])

  // 页面显示时加载数据
  useDidShow(() => {
    loadVehicles()
  })

  // 进入审核详情
  const handleReview = (vehicleId: string) => {
    Taro.navigateTo({url: `/pages/super-admin/vehicle-review-detail/index?vehicleId=${vehicleId}`})
  }

  // 格式化时间
  const formatTime = (time: string | null): string => {
    if (!time) return '未记录'
    return new Date(time).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #FEF3C7, #FDE68A)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex items-center justify-between">
              <View className="flex-1">
                <View className="flex items-center mb-2">
                  <View className="i-mdi-clipboard-check text-3xl text-white mr-3"></View>
                  <Text className="text-2xl font-bold text-white">车辆信息审核</Text>
                </View>
                <Text className="text-orange-100 text-sm">审核司机提交的车辆信息</Text>
              </View>
              <View className="bg-white/20 backdrop-blur rounded-full px-4 py-2">
                <Text className="text-white text-lg font-bold">{vehicles.length}</Text>
              </View>
            </View>
          </View>

          {/* 加载状态 */}
          {loading && (
            <View className="flex items-center justify-center py-20">
              <View className="i-mdi-loading animate-spin text-4xl text-orange-600 mb-4"></View>
              <Text className="text-gray-600">加载中...</Text>
            </View>
          )}

          {/* 空状态 */}
          {!loading && vehicles.length === 0 && (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-check-circle-outline text-6xl text-green-500 mb-4"></View>
              <Text className="text-xl font-medium text-gray-700 mb-2">暂无待审核车辆</Text>
              <Text className="text-sm text-gray-500">所有车辆信息已审核完毕</Text>
            </View>
          )}

          {/* 车辆列表 */}
          {!loading && vehicles.length > 0 && (
            <View className="space-y-4">
              {vehicles.map((vehicle) => {
                const driver = drivers[vehicle.user_id]
                return (
                  <View
                    key={vehicle.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-lg active:scale-98 transition-all">
                    {/* 车辆照片 */}
                    {vehicle.pickup_photos && vehicle.pickup_photos.length > 0 && (
                      <View className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                        <Image src={vehicle.pickup_photos[0]} mode="aspectFill" className="w-full h-full" />
                        {/* 待审核标签 */}
                        <View className="absolute top-3 right-3">
                          <View className="backdrop-blur rounded-full px-3 py-1 bg-orange-500/90">
                            <View className="flex items-center">
                              <View className="w-2 h-2 rounded-full mr-1 bg-white animate-pulse"></View>
                              <Text className="text-white text-xs font-medium">待审核</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 车辆信息 */}
                    <View className="p-4">
                      {/* 车牌号 */}
                      <View className="mb-3">
                        <View className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-3 py-1 inline-block mb-2">
                          <Text className="text-white text-lg font-bold">{vehicle.plate_number}</Text>
                        </View>
                        <Text className="text-gray-800 text-base font-medium">
                          {vehicle.brand} {vehicle.model}
                        </Text>
                      </View>

                      {/* 司机信息 */}
                      <View className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-3 mb-3">
                        <View className="flex items-center">
                          <View className="i-mdi-account text-lg text-purple-600 mr-2"></View>
                          <Text className="text-sm text-purple-700 font-medium">司机：{driver?.name || '未知'}</Text>
                        </View>
                        {driver?.phone && (
                          <View className="flex items-center mt-1">
                            <View className="i-mdi-phone text-lg text-purple-600 mr-2"></View>
                            <Text className="text-sm text-purple-700">{driver.phone}</Text>
                          </View>
                        )}
                      </View>

                      {/* 提交时间 */}
                      <View className="flex items-center mb-4">
                        <View className="i-mdi-clock-outline text-base text-gray-600 mr-2"></View>
                        <Text className="text-xs text-gray-600">提交时间：{formatTime(vehicle.created_at)}</Text>
                      </View>

                      {/* 图片统计 */}
                      <View className="flex gap-2 mb-4">
                        <View className="flex-1 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-2">
                          <Text className="text-xs text-blue-600 mb-1">提车照片</Text>
                          <Text className="text-lg font-bold text-blue-700">{vehicle.pickup_photos?.length || 0}</Text>
                        </View>
                        <View className="flex-1 bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-2">
                          <Text className="text-xs text-green-600 mb-1">行驶证照片</Text>
                          <Text className="text-lg font-bold text-green-700">
                            {vehicle.registration_photos?.length || 0}
                          </Text>
                        </View>
                      </View>

                      {/* 审核按钮 */}
                      <Button
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg break-keep text-sm shadow-md active:scale-95 transition-all"
                        size="default"
                        onClick={() => handleReview(vehicle.id)}>
                        <View className="flex items-center justify-center">
                          <View className="i-mdi-clipboard-check text-lg mr-2"></View>
                          <Text className="font-medium">开始审核</Text>
                        </View>
                      </Button>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default VehicleReview
