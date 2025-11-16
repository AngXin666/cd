/**
 * 车辆编辑页面
 * 功能：
 * - 上传7张车辆照片（左前、右前、左后、右后、仪表盘、后门、货箱）
 * - 上传多张车损特写照片
 * - 更新车辆照片信息
 */

import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {chooseImage, useDidShow, useLoad} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getVehicleById, updateVehicle} from '@/db/api'
import type {Vehicle, VehicleUpdate} from '@/db/types'
import {generateUniqueFileName, uploadImageToStorage} from '@/utils/imageUtils'
import {createLogger} from '@/utils/logger'

const logger = createLogger('EditVehicle')
const BUCKET_NAME = `${process.env.TARO_APP_APP_ID}_vehicles`

// 车辆照片配置（7张）
const VEHICLE_PHOTO_CONFIGS = [
  {key: 'left_front_photo', label: '左前照片', required: true},
  {key: 'right_front_photo', label: '右前照片', required: true},
  {key: 'left_rear_photo', label: '左后照片', required: true},
  {key: 'right_rear_photo', label: '右后照片', required: true},
  {key: 'dashboard_photo', label: '仪表盘照片', required: true},
  {key: 'rear_door_photo', label: '后门照片', required: true},
  {key: 'cargo_box_photo', label: '货箱照片', required: true}
] as const

type VehiclePhotoKey = (typeof VEHICLE_PHOTO_CONFIGS)[number]['key']

const EditVehicle: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 车辆照片（7张）
  const [vehiclePhotos, setVehiclePhotos] = useState<Record<VehiclePhotoKey, string>>({
    left_front_photo: '',
    right_front_photo: '',
    left_rear_photo: '',
    right_rear_photo: '',
    dashboard_photo: '',
    rear_door_photo: '',
    cargo_box_photo: ''
  })

  // 车损特写照片（多张）
  const [damagePhotos, setDamagePhotos] = useState<string[]>([])

  useLoad((options) => {
    const {id} = options
    if (id) {
      loadVehicleData(id)
    }
  })

  useDidShow(() => {
    // 页面显示时刷新数据
    if (vehicle?.id) {
      loadVehicleData(vehicle.id)
    }
  })

  // 加载车辆数据
  const loadVehicleData = useCallback(async (vehicleId: string) => {
    setLoading(true)
    try {
      const vehicleData = await getVehicleById(vehicleId)
      setVehicle(vehicleData)

      // 加载现有的车辆照片
      setVehiclePhotos({
        left_front_photo: vehicleData.left_front_photo || '',
        right_front_photo: vehicleData.right_front_photo || '',
        left_rear_photo: vehicleData.left_rear_photo || '',
        right_rear_photo: vehicleData.right_rear_photo || '',
        dashboard_photo: vehicleData.dashboard_photo || '',
        rear_door_photo: vehicleData.rear_door_photo || '',
        cargo_box_photo: vehicleData.cargo_box_photo || ''
      })

      // 加载现有的车损照片
      setDamagePhotos(vehicleData.damage_photos || [])
    } catch (error) {
      logger.error('加载车辆数据失败', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [])

  // 选择车辆照片
  const handleChooseVehiclePhoto = async (photoKey: VehiclePhotoKey) => {
    try {
      const res = await chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        setVehiclePhotos((prev) => ({
          ...prev,
          [photoKey]: res.tempFilePaths[0]
        }))
      }
    } catch (error) {
      logger.error('选择照片失败', error)
    }
  }

  // 选择车损照片
  const handleChooseDamagePhotos = async () => {
    try {
      const res = await chooseImage({
        count: 9, // 最多选择9张
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        setDamagePhotos((prev) => [...prev, ...res.tempFilePaths])
      }
    } catch (error) {
      logger.error('选择照片失败', error)
    }
  }

  // 删除车损照片
  const handleDeleteDamagePhoto = (index: number) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          setDamagePhotos((prev) => prev.filter((_, i) => i !== index))
        }
      }
    })
  }

  // 预览图片
  const previewImage = (url: string, urls: string[]) => {
    Taro.previewImage({
      current: url,
      urls: urls
    })
  }

  // 上传照片到存储桶
  const uploadPhoto = async (localPath: string): Promise<string> => {
    const fileName = generateUniqueFileName('vehicle')
    const publicUrl = await uploadImageToStorage(localPath, BUCKET_NAME, fileName, false)
    if (!publicUrl) {
      throw new Error('上传失败')
    }
    return publicUrl
  }

  // 提交更新
  const handleSubmit = async () => {
    if (!vehicle) return

    // 验证必填照片
    const missingPhotos = VEHICLE_PHOTO_CONFIGS.filter((config) => config.required && !vehiclePhotos[config.key]).map(
      (config) => config.label
    )

    if (missingPhotos.length > 0) {
      Taro.showModal({
        title: '提示',
        content: `请上传以下照片：${missingPhotos.join('、')}`,
        showCancel: false
      })
      return
    }

    Taro.showModal({
      title: '确认提交',
      content: '确定要更新车辆照片吗？',
      success: async (res) => {
        if (res.confirm) {
          setSubmitting(true)
          Taro.showLoading({title: '上传中...'})

          try {
            // 上传车辆照片
            const uploadedVehiclePhotos: Partial<Record<VehiclePhotoKey, string>> = {}
            for (const config of VEHICLE_PHOTO_CONFIGS) {
              const localPath = vehiclePhotos[config.key]
              if (localPath?.startsWith('http')) {
                // 已经是URL，不需要重新上传
                uploadedVehiclePhotos[config.key] = localPath
              } else if (localPath) {
                // 需要上传
                const uploadedPath = await uploadPhoto(localPath)
                uploadedVehiclePhotos[config.key] = uploadedPath
              }
            }

            // 上传车损照片
            const uploadedDamagePhotos: string[] = []
            for (const localPath of damagePhotos) {
              if (localPath.startsWith('http')) {
                // 已经是URL，不需要重新上传
                uploadedDamagePhotos.push(localPath)
              } else {
                // 需要上传
                const uploadedPath = await uploadPhoto(localPath)
                uploadedDamagePhotos.push(uploadedPath)
              }
            }

            // 更新车辆信息
            const updateData: VehicleUpdate = {
              ...uploadedVehiclePhotos,
              damage_photos: uploadedDamagePhotos
            }

            const success = await updateVehicle(vehicle.id, updateData)
            if (!success) {
              throw new Error('更新失败')
            }

            Taro.hideLoading()
            Taro.showToast({
              title: '更新成功',
              icon: 'success',
              duration: 2000
            })

            setTimeout(() => {
              Taro.navigateBack()
            }, 2000)
          } catch (error) {
            logger.error('更新车辆照片失败', error)
            Taro.hideLoading()
            Taro.showToast({
              title: error instanceof Error ? error.message : '更新失败',
              icon: 'none'
            })
          } finally {
            setSubmitting(false)
          }
        }
      }
    })
  }

  if (loading) {
    return (
      <View className="flex items-center justify-center min-h-screen bg-background">
        <Text className="text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  if (!vehicle) {
    return (
      <View className="flex items-center justify-center min-h-screen bg-background">
        <Text className="text-muted-foreground">车辆不存在</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-background">
      <ScrollView scrollY className="h-screen box-border">
        <View className="p-4 pb-32">
          {/* 车辆基本信息 */}
          <View className="bg-card rounded-lg p-4 mb-4 shadow-sm">
            <Text className="text-lg font-bold text-foreground mb-2">{vehicle.plate_number}</Text>
            <Text className="text-sm text-muted-foreground">
              {vehicle.brand} {vehicle.model}
            </Text>
          </View>

          {/* 车辆照片（7张） */}
          <View className="bg-card rounded-lg p-4 mb-4 shadow-sm">
            <View className="flex items-center justify-between mb-3">
              <Text className="text-base font-semibold text-foreground">车辆照片</Text>
              <Text className="text-xs text-muted-foreground">共7张，必填</Text>
            </View>

            <View className="grid grid-cols-2 gap-3">
              {VEHICLE_PHOTO_CONFIGS.map((config) => (
                <View key={config.key} className="flex flex-col">
                  <Text className="text-sm text-foreground mb-2">
                    {config.label}
                    {config.required && <Text className="text-destructive ml-1">*</Text>}
                  </Text>
                  {vehiclePhotos[config.key] ? (
                    <View className="relative">
                      <Image
                        src={vehiclePhotos[config.key]}
                        mode="aspectFill"
                        className="w-full h-32 rounded-lg"
                        onClick={() => previewImage(vehiclePhotos[config.key], [vehiclePhotos[config.key]])}
                      />
                      <View
                        className="absolute top-1 right-1 bg-black/50 rounded-full p-1"
                        onClick={() => handleChooseVehiclePhoto(config.key)}>
                        <View className="i-mdi-camera text-white text-lg"></View>
                      </View>
                    </View>
                  ) : (
                    <View
                      className="w-full h-32 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border active:bg-muted/80 transition-colors"
                      onClick={() => handleChooseVehiclePhoto(config.key)}>
                      <View className="flex flex-col items-center">
                        <View className="i-mdi-camera text-3xl text-muted-foreground mb-1"></View>
                        <Text className="text-xs text-muted-foreground">点击上传</Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* 车损特写照片（多张） */}
          <View className="bg-card rounded-lg p-4 mb-4 shadow-sm">
            <View className="flex items-center justify-between mb-3">
              <Text className="text-base font-semibold text-foreground">车损特写照片</Text>
              <Text className="text-xs text-muted-foreground">已上传 {damagePhotos.length} 张</Text>
            </View>

            <View className="grid grid-cols-3 gap-2 mb-3">
              {damagePhotos.map((photo, index) => (
                <View key={index} className="relative">
                  <Image
                    src={photo}
                    mode="aspectFill"
                    className="w-full h-24 rounded-lg"
                    onClick={() => previewImage(photo, damagePhotos)}
                  />
                  <View
                    className="absolute top-1 right-1 bg-destructive rounded-full p-1 active:scale-95 transition-transform"
                    onClick={() => handleDeleteDamagePhoto(index)}>
                    <View className="i-mdi-close text-white text-base"></View>
                  </View>
                </View>
              ))}
            </View>

            <Button
              className="w-full bg-secondary text-secondary-foreground py-3 rounded-lg break-keep text-sm active:scale-98 transition-transform"
              size="default"
              onClick={handleChooseDamagePhotos}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-plus text-lg mr-2"></View>
                <Text>添加车损照片</Text>
              </View>
            </Button>
          </View>

          {/* 提示信息 */}
          <View className="bg-muted/50 rounded-lg p-3 mb-4">
            <View className="flex items-start">
              <View className="i-mdi-information text-primary text-lg mr-2 mt-0.5"></View>
              <View className="flex-1">
                <Text className="text-xs text-muted-foreground leading-relaxed">
                  • 车辆照片需要拍摄7个角度，每个角度1张照片
                  {'\n'}• 车损特写照片可以添加多张，用于记录车辆损伤情况
                  {'\n'}• 照片将用于车辆审核，请确保清晰可见
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 底部操作按钮 */}
        <View className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 shadow-lg">
          <Button
            className="w-full bg-primary text-primary-foreground py-4 rounded-lg break-keep text-base shadow-md active:scale-98 transition-transform"
            size="default"
            onClick={handleSubmit}
            disabled={submitting}>
            <View className="flex items-center justify-center">
              <View className="i-mdi-check-circle text-lg mr-2"></View>
              <Text className="font-medium">保存更新</Text>
            </View>
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}

export default EditVehicle
