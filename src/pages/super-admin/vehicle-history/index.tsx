/**
 * 超级管理员 - 车辆历史记录页面
 * 显示单个车辆的提车和还车信息
 */

import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getVehicleByPlateNumber} from '@/db/api'
import type {VehicleWithDriver} from '@/db/types'
import {createLogger} from '@/utils/logger'

const logger = createLogger('VehicleHistory')

const VehicleHistory: React.FC = () => {
  useAuth({guard: true})
  const router = useRouter()
  const plateNumber = router.params.plateNumber ? decodeURIComponent(router.params.plateNumber) : ''

  const [vehicle, setVehicle] = useState<VehicleWithDriver | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'pickup' | 'return'>('pickup')

  const loadVehicleInfo = useCallback(async () => {
    if (!plateNumber) {
      Taro.showToast({title: '缺少车牌号参数', icon: 'none'})
      return
    }

    logger.info('加载车辆信息', {plateNumber})
    setLoading(true)

    try {
      const data = await getVehicleByPlateNumber(plateNumber)
      if (data) {
        setVehicle(data)
        logger.info('车辆信息加载成功', {vehicleId: data.id})
      } else {
        Taro.showToast({title: '未找到车辆信息', icon: 'none'})
      }
    } catch (error) {
      logger.error('加载车辆信息失败', {error})
      Taro.showToast({title: '加载失败', icon: 'error'})
    } finally {
      setLoading(false)
    }
  }, [plateNumber])

  useDidShow(() => {
    loadVehicleInfo()
  })

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handlePreviewImage = (current: string, urls: string[]) => {
    Taro.previewImage({
      current,
      urls
    })
  }

  const getVehiclePhotos = (type: 'pickup' | 'return'): string[] => {
    if (!vehicle) return []

    const photos: string[] = []

    if (type === 'pickup') {
      if (vehicle.left_front_photo) photos.push(vehicle.left_front_photo)
      if (vehicle.right_front_photo) photos.push(vehicle.right_front_photo)
      if (vehicle.left_rear_photo) photos.push(vehicle.left_rear_photo)
      if (vehicle.right_rear_photo) photos.push(vehicle.right_rear_photo)
      if (vehicle.dashboard_photo) photos.push(vehicle.dashboard_photo)
      if (vehicle.rear_door_photo) photos.push(vehicle.rear_door_photo)
      if (vehicle.cargo_box_photo) photos.push(vehicle.cargo_box_photo)
    } else {
      if (vehicle.return_photos && Array.isArray(vehicle.return_photos)) {
        photos.push(...vehicle.return_photos)
      }
    }

    return photos
  }

  return (
    <View className="min-h-screen bg-background">
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4 pb-20">
          {loading ? (
            <View className="flex items-center justify-center py-20">
              <Text className="text-muted-foreground">加载中...</Text>
            </View>
          ) : !vehicle ? (
            <View className="flex items-center justify-center py-20">
              <Text className="text-muted-foreground">未找到车辆信息</Text>
            </View>
          ) : (
            <View>
              {/* 车辆基本信息 */}
              <View className="bg-card rounded-lg p-4 mb-4 shadow-sm">
                <View className="flex items-center mb-3">
                  <View className="i-mdi-car text-2xl text-primary mr-2"></View>
                  <Text className="text-xl font-bold text-foreground">{vehicle.plate_number}</Text>
                </View>

                <View className="space-y-2">
                  <View className="flex items-center">
                    <Text className="text-muted-foreground w-20">品牌型号</Text>
                    <Text className="text-foreground">
                      {vehicle.brand} {vehicle.model}
                    </Text>
                  </View>

                  {vehicle.color && (
                    <View className="flex items-center">
                      <Text className="text-muted-foreground w-20">颜色</Text>
                      <Text className="text-foreground">{vehicle.color}</Text>
                    </View>
                  )}

                  {vehicle.vin && (
                    <View className="flex items-center">
                      <Text className="text-muted-foreground w-20">车架号</Text>
                      <Text className="text-foreground text-xs">{vehicle.vin}</Text>
                    </View>
                  )}

                  <View className="flex items-center">
                    <Text className="text-muted-foreground w-20">状态</Text>
                    <View
                      className={`px-2 py-1 rounded ${vehicle.status === 'inactive' ? 'bg-gray-100' : 'bg-green-100'}`}>
                      <Text className={`text-xs ${vehicle.status === 'inactive' ? 'text-gray-600' : 'text-green-600'}`}>
                        {vehicle.status === 'inactive' ? '已停用' : '使用中'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Tab 切换 */}
              <View className="flex bg-card rounded-lg p-1 mb-4 shadow-sm">
                <View
                  className={`flex-1 py-2 rounded-md transition-all ${activeTab === 'pickup' ? 'bg-primary' : 'bg-transparent'}`}
                  onClick={() => setActiveTab('pickup')}>
                  <Text
                    className={`text-center text-sm font-medium ${activeTab === 'pickup' ? 'text-white' : 'text-muted-foreground'}`}>
                    提车信息
                  </Text>
                </View>
                <View
                  className={`flex-1 py-2 rounded-md transition-all ${activeTab === 'return' ? 'bg-primary' : 'bg-transparent'}`}
                  onClick={() => setActiveTab('return')}>
                  <Text
                    className={`text-center text-sm font-medium ${activeTab === 'return' ? 'text-white' : 'text-muted-foreground'}`}>
                    还车信息
                  </Text>
                </View>
              </View>

              {/* 提车信息 */}
              {activeTab === 'pickup' && (
                <View className="bg-card rounded-lg p-4 shadow-sm">
                  <View className="flex items-center mb-3">
                    <View className="i-mdi-car-arrow-right text-xl text-green-600 mr-2"></View>
                    <Text className="text-lg font-bold text-foreground">提车信息</Text>
                  </View>

                  <View className="space-y-3">
                    <View>
                      <Text className="text-muted-foreground text-sm mb-1">提车时间</Text>
                      <Text className="text-foreground">{formatDateTime(vehicle.pickup_time)}</Text>
                    </View>

                    {vehicle.driver && (
                      <View>
                        <Text className="text-muted-foreground text-sm mb-1">司机信息</Text>
                        <Text className="text-foreground">{vehicle.driver.name || '-'}</Text>
                        {vehicle.driver.phone && (
                          <Text className="text-muted-foreground text-sm">{vehicle.driver.phone}</Text>
                        )}
                      </View>
                    )}

                    {getVehiclePhotos('pickup').length > 0 && (
                      <View>
                        <Text className="text-muted-foreground text-sm mb-2">提车照片</Text>
                        <View className="flex flex-wrap gap-2">
                          {getVehiclePhotos('pickup').map((photo, index) => (
                            <View
                              key={index}
                              className="w-20 h-20 rounded-lg overflow-hidden border border-border"
                              onClick={() => handlePreviewImage(photo, getVehiclePhotos('pickup'))}>
                              <Image src={photo} mode="aspectFill" className="w-full h-full" />
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* 还车信息 */}
              {activeTab === 'return' && (
                <View className="bg-card rounded-lg p-4 shadow-sm">
                  <View className="flex items-center mb-3">
                    <View className="i-mdi-car-arrow-left text-xl text-orange-600 mr-2"></View>
                    <Text className="text-lg font-bold text-foreground">还车信息</Text>
                  </View>

                  {vehicle.return_time ? (
                    <View className="space-y-3">
                      <View>
                        <Text className="text-muted-foreground text-sm mb-1">还车时间</Text>
                        <Text className="text-foreground">{formatDateTime(vehicle.return_time)}</Text>
                      </View>

                      {getVehiclePhotos('return').length > 0 && (
                        <View>
                          <Text className="text-muted-foreground text-sm mb-2">还车照片</Text>
                          <View className="flex flex-wrap gap-2">
                            {getVehiclePhotos('return').map((photo, index) => (
                              <View
                                key={index}
                                className="w-20 h-20 rounded-lg overflow-hidden border border-border"
                                onClick={() => handlePreviewImage(photo, getVehiclePhotos('return'))}>
                                <Image src={photo} mode="aspectFill" className="w-full h-full" />
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View className="flex items-center justify-center py-10">
                      <Text className="text-muted-foreground">暂无还车信息</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default VehicleHistory
