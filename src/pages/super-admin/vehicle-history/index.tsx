/**
 * 超级管理员 - 车辆历史记录页面
 * 显示单个车辆的完整提车和还车信息
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

type PhotoCategory = 'vehicle' | 'registration' | 'damage' | 'id_card' | 'driver_license'

const VehicleHistory: React.FC = () => {
  useAuth({guard: true})
  const router = useRouter()
  const plateNumber = router.params.plateNumber ? decodeURIComponent(router.params.plateNumber) : ''

  const [vehicle, setVehicle] = useState<VehicleWithDriver | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'pickup' | 'return'>('pickup')
  const [pickupPhotoCategory, setPickupPhotoCategory] = useState<PhotoCategory>('vehicle')
  const [returnPhotoCategory, setReturnPhotoCategory] = useState<PhotoCategory>('vehicle')

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

  // 获取不同类别的照片
  const getPhotos = (category: PhotoCategory, type: 'pickup' | 'return'): string[] => {
    if (!vehicle) return []

    const photos: string[] = []

    switch (category) {
      case 'vehicle':
        // 车辆照片
        if (type === 'pickup') {
          if (vehicle.left_front_photo) photos.push(vehicle.left_front_photo)
          if (vehicle.right_front_photo) photos.push(vehicle.right_front_photo)
          if (vehicle.left_rear_photo) photos.push(vehicle.left_rear_photo)
          if (vehicle.right_rear_photo) photos.push(vehicle.right_rear_photo)
          if (vehicle.dashboard_photo) photos.push(vehicle.dashboard_photo)
          if (vehicle.rear_door_photo) photos.push(vehicle.rear_door_photo)
          if (vehicle.cargo_box_photo) photos.push(vehicle.cargo_box_photo)
          // 如果有 pickup_photos 数组，也添加进来
          if (vehicle.pickup_photos && Array.isArray(vehicle.pickup_photos)) {
            photos.push(...vehicle.pickup_photos)
          }
        } else {
          // 还车照片
          if (vehicle.return_photos && Array.isArray(vehicle.return_photos)) {
            photos.push(...vehicle.return_photos)
          }
        }
        break

      case 'registration':
        // 行驶证照片（只在提车时显示）
        if (type === 'pickup') {
          if (vehicle.driving_license_main_photo) photos.push(vehicle.driving_license_main_photo)
          if (vehicle.driving_license_sub_photo) photos.push(vehicle.driving_license_sub_photo)
          if (vehicle.driving_license_sub_back_photo) photos.push(vehicle.driving_license_sub_back_photo)
          // 如果有 registration_photos 数组，也添加进来
          if (vehicle.registration_photos && Array.isArray(vehicle.registration_photos)) {
            photos.push(...vehicle.registration_photos)
          }
        }
        break

      case 'damage':
        // 车损照片
        if (vehicle.damage_photos && Array.isArray(vehicle.damage_photos)) {
          photos.push(...vehicle.damage_photos)
        }
        break

      case 'id_card':
        // 身份证照片（只在提车时显示）
        if (type === 'pickup' && vehicle.driver_license) {
          if (vehicle.driver_license.id_card_photo_front) photos.push(vehicle.driver_license.id_card_photo_front)
          if (vehicle.driver_license.id_card_photo_back) photos.push(vehicle.driver_license.id_card_photo_back)
        }
        break

      case 'driver_license':
        // 驾驶证照片（只在提车时显示）
        if (type === 'pickup' && vehicle.driver_license) {
          if (vehicle.driver_license.driving_license_photo) photos.push(vehicle.driver_license.driving_license_photo)
        }
        break
    }

    return photos
  }

  // 渲染照片分类标签
  const renderPhotoTabs = (type: 'pickup' | 'return') => {
    const currentCategory = type === 'pickup' ? pickupPhotoCategory : returnPhotoCategory
    const setCategory = type === 'pickup' ? setPickupPhotoCategory : setReturnPhotoCategory

    const tabs: Array<{key: PhotoCategory; label: string; showInReturn: boolean}> = [
      {key: 'vehicle', label: type === 'pickup' ? '车辆照片' : '还车照片', showInReturn: true},
      {key: 'registration', label: '行驶证', showInReturn: false},
      {key: 'id_card', label: '身份证', showInReturn: false},
      {key: 'driver_license', label: '驾驶证', showInReturn: false},
      {key: 'damage', label: '车损特写', showInReturn: true}
    ]

    const visibleTabs = type === 'return' ? tabs.filter((t) => t.showInReturn) : tabs

    return (
      <View className="flex flex-wrap gap-2 mb-3">
        {visibleTabs.map((tab) => (
          <View
            key={tab.key}
            className={`px-3 py-1.5 rounded-full transition-all ${
              currentCategory === tab.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-muted-foreground active:bg-gray-200'
            }`}
            onClick={() => setCategory(tab.key)}>
            <Text
              className={`text-sm ${currentCategory === tab.key ? 'text-white font-medium' : 'text-muted-foreground'}`}>
              {tab.label}
            </Text>
          </View>
        ))}
      </View>
    )
  }

  // 渲染照片网格
  const renderPhotoGrid = (photos: string[]) => {
    if (photos.length === 0) {
      return (
        <View className="flex items-center justify-center py-10 bg-gray-50 rounded-lg">
          <Text className="text-muted-foreground text-sm">暂无照片</Text>
        </View>
      )
    }

    return (
      <View className="flex flex-wrap gap-2">
        {photos.map((photo, index) => (
          <View
            key={index}
            className="w-[calc(33.333%-0.5rem)] aspect-square rounded-lg overflow-hidden border border-border bg-gray-100"
            onClick={() => handlePreviewImage(photo, photos)}>
            <Image src={photo} mode="aspectFill" className="w-full h-full" />
          </View>
        ))}
      </View>
    )
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

                  {/* 时间和司机信息 */}
                  <View className="space-y-3 mb-4 pb-4 border-b border-border">
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
                  </View>

                  {/* 照片分类标签 */}
                  {renderPhotoTabs('pickup')}

                  {/* 照片展示 */}
                  {renderPhotoGrid(getPhotos(pickupPhotoCategory, 'pickup'))}
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
                    <View>
                      {/* 还车时间 */}
                      <View className="mb-4 pb-4 border-b border-border">
                        <Text className="text-muted-foreground text-sm mb-1">还车时间</Text>
                        <Text className="text-foreground">{formatDateTime(vehicle.return_time)}</Text>
                      </View>

                      {/* 照片分类标签 */}
                      {renderPhotoTabs('return')}

                      {/* 照片展示 */}
                      {renderPhotoGrid(getPhotos(returnPhotoCategory, 'return'))}
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
