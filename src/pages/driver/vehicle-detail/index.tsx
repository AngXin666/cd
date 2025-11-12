/**
 * 车辆详情页面
 * 显示车辆的完整信息
 */

import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getVehicleById} from '@/db/api'
import type {Vehicle} from '@/db/types'

const VehicleDetail: React.FC = () => {
  const router = useRouter()
  const vehicleId = router.params.id || ''
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(false)

  // 加载车辆详情
  const loadVehicleDetail = useCallback(async () => {
    if (!vehicleId) return

    setLoading(true)
    try {
      const data = await getVehicleById(vehicleId)
      setVehicle(data)
    } catch (error) {
      console.error('加载车辆详情失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [vehicleId])

  // 页面显示时加载数据
  useDidShow(() => {
    loadVehicleDetail()
  })

  // 预览图片
  const handlePreviewImage = (url: string, urls: string[]) => {
    Taro.previewImage({
      urls,
      current: url
    })
  }

  if (loading) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <View className="i-mdi-loading animate-spin text-4xl text-primary"></View>
        <Text className="text-muted-foreground mt-2">加载中...</Text>
      </View>
    )
  }

  if (!vehicle) {
    return (
      <View className="min-h-screen bg-background flex items-center justify-center">
        <View className="i-mdi-alert-circle text-6xl text-muted-foreground mb-4"></View>
        <Text className="text-muted-foreground">车辆信息不存在</Text>
      </View>
    )
  }

  // 收集所有照片URL
  const allPhotos = [
    vehicle.front_photo,
    vehicle.back_photo,
    vehicle.left_photo,
    vehicle.right_photo,
    vehicle.tire_photo,
    vehicle.driving_license_photo
  ].filter((url) => url) as string[]

  return (
    <View className="min-h-screen bg-background">
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4">
          {/* 车辆基本信息 */}
          <View className="bg-card rounded-lg p-4 mb-4">
            <View className="flex items-start justify-between mb-4">
              <View>
                <Text className="text-2xl font-bold text-foreground">{vehicle.plate_number}</Text>
                <Text className="text-lg text-muted-foreground mt-1">
                  {vehicle.brand} {vehicle.model}
                </Text>
              </View>
              <View className={`px-3 py-1 rounded ${vehicle.status === 'active' ? 'bg-primary/10' : 'bg-muted'}`}>
                <Text className={`text-sm ${vehicle.status === 'active' ? 'text-primary' : 'text-muted-foreground'}`}>
                  {vehicle.status === 'active' ? '使用中' : '已停用'}
                </Text>
              </View>
            </View>

            {/* 详细信息 */}
            <View className="space-y-3">
              {vehicle.color && (
                <View className="flex items-center">
                  <View className="i-mdi-palette text-xl text-muted-foreground mr-2"></View>
                  <Text className="text-sm text-muted-foreground mr-2">颜色：</Text>
                  <Text className="text-sm text-foreground">{vehicle.color}</Text>
                </View>
              )}
              {vehicle.vehicle_type && (
                <View className="flex items-center">
                  <View className="i-mdi-car-info text-xl text-muted-foreground mr-2"></View>
                  <Text className="text-sm text-muted-foreground mr-2">车辆类型：</Text>
                  <Text className="text-sm text-foreground">{vehicle.vehicle_type}</Text>
                </View>
              )}
              {vehicle.vin && (
                <View className="flex items-center">
                  <View className="i-mdi-barcode text-xl text-muted-foreground mr-2"></View>
                  <Text className="text-sm text-muted-foreground mr-2">车辆识别代号：</Text>
                  <Text className="text-sm text-foreground">{vehicle.vin}</Text>
                </View>
              )}
              {vehicle.owner_name && (
                <View className="flex items-center">
                  <View className="i-mdi-account text-xl text-muted-foreground mr-2"></View>
                  <Text className="text-sm text-muted-foreground mr-2">所有人：</Text>
                  <Text className="text-sm text-foreground">{vehicle.owner_name}</Text>
                </View>
              )}
              {vehicle.use_character && (
                <View className="flex items-center">
                  <View className="i-mdi-file-document text-xl text-muted-foreground mr-2"></View>
                  <Text className="text-sm text-muted-foreground mr-2">使用性质：</Text>
                  <Text className="text-sm text-foreground">{vehicle.use_character}</Text>
                </View>
              )}
              {vehicle.register_date && (
                <View className="flex items-center">
                  <View className="i-mdi-calendar text-xl text-muted-foreground mr-2"></View>
                  <Text className="text-sm text-muted-foreground mr-2">注册日期：</Text>
                  <Text className="text-sm text-foreground">{vehicle.register_date}</Text>
                </View>
              )}
            </View>
          </View>

          {/* 行驶证照片 */}
          {vehicle.driving_license_photo && (
            <View className="bg-card rounded-lg p-4 mb-4">
              <Text className="text-lg font-medium text-foreground mb-3">行驶证</Text>
              <Image
                src={vehicle.driving_license_photo}
                mode="aspectFit"
                className="w-full h-48 rounded"
                onClick={() => handlePreviewImage(vehicle.driving_license_photo!, allPhotos)}
              />
            </View>
          )}

          {/* 车辆照片 */}
          <View className="bg-card rounded-lg p-4 mb-4">
            <Text className="text-lg font-medium text-foreground mb-3">车辆照片</Text>
            <View className="grid grid-cols-2 gap-3">
              {vehicle.front_photo && (
                <View>
                  <Text className="text-sm text-muted-foreground mb-1">前方</Text>
                  <Image
                    src={vehicle.front_photo}
                    mode="aspectFill"
                    className="w-full h-32 rounded"
                    onClick={() => handlePreviewImage(vehicle.front_photo!, allPhotos)}
                  />
                </View>
              )}
              {vehicle.back_photo && (
                <View>
                  <Text className="text-sm text-muted-foreground mb-1">后方</Text>
                  <Image
                    src={vehicle.back_photo}
                    mode="aspectFill"
                    className="w-full h-32 rounded"
                    onClick={() => handlePreviewImage(vehicle.back_photo!, allPhotos)}
                  />
                </View>
              )}
              {vehicle.left_photo && (
                <View>
                  <Text className="text-sm text-muted-foreground mb-1">左侧</Text>
                  <Image
                    src={vehicle.left_photo}
                    mode="aspectFill"
                    className="w-full h-32 rounded"
                    onClick={() => handlePreviewImage(vehicle.left_photo!, allPhotos)}
                  />
                </View>
              )}
              {vehicle.right_photo && (
                <View>
                  <Text className="text-sm text-muted-foreground mb-1">右侧</Text>
                  <Image
                    src={vehicle.right_photo}
                    mode="aspectFill"
                    className="w-full h-32 rounded"
                    onClick={() => handlePreviewImage(vehicle.right_photo!, allPhotos)}
                  />
                </View>
              )}
              {vehicle.tire_photo && (
                <View>
                  <Text className="text-sm text-muted-foreground mb-1">轮胎</Text>
                  <Image
                    src={vehicle.tire_photo}
                    mode="aspectFill"
                    className="w-full h-32 rounded"
                    onClick={() => handlePreviewImage(vehicle.tire_photo!, allPhotos)}
                  />
                </View>
              )}
            </View>
          </View>

          {/* 备注信息 */}
          {vehicle.notes && (
            <View className="bg-card rounded-lg p-4 mb-4">
              <Text className="text-lg font-medium text-foreground mb-2">备注</Text>
              <Text className="text-sm text-muted-foreground">{vehicle.notes}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default VehicleDetail
