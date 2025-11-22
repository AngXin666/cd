/**
 * 还车录入页面
 * 功能：
 * - 显示车辆基本信息
 * - 按顺序拍摄7张车辆照片（与提车相同）
 * - 上传多张车损特写照片
 * - 自动记录还车时间
 * - 更新车辆状态为"已还车"
 */

import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useLoad} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import PhotoCapture from '@/components/PhotoCapture'
import {getVehicleById, returnVehicle, updateVehicle} from '@/db/api'
import type {Vehicle} from '@/db/types'
import {deleteDraft, getDraft, saveDraft, type VehicleDraft} from '@/utils/draftUtils'
import {generateUniqueFileName, uploadImageToStorage} from '@/utils/imageUtils'
import {createLogger} from '@/utils/logger'

const logger = createLogger('ReturnVehicle')
const BUCKET_NAME = `${process.env.TARO_APP_APP_ID}_vehicles`

// 车辆照片标签（与提车相同的7张照片）
const VEHICLE_PHOTO_LABELS = [
  {key: 'left_front', label: '左前照片', icon: 'i-mdi-car-side'},
  {key: 'right_front', label: '右前照片', icon: 'i-mdi-car-side'},
  {key: 'left_rear', label: '左后照片', icon: 'i-mdi-car-side'},
  {key: 'right_rear', label: '右后照片', icon: 'i-mdi-car-side'},
  {key: 'dashboard', label: '仪表盘照片', icon: 'i-mdi-speedometer'},
  {key: 'rear_door', label: '后门照片', icon: 'i-mdi-car-back'},
  {key: 'cargo_box', label: '货箱照片', icon: 'i-mdi-package-variant'}
] as const

const ReturnVehicle: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [vehicleId, setVehicleId] = useState<string>('')

  // 7张车辆照片（与提车相同）
  const [vehiclePhotos, setVehiclePhotos] = useState({
    left_front: '',
    right_front: '',
    left_rear: '',
    right_rear: '',
    dashboard: '',
    rear_door: '',
    cargo_box: ''
  })

  // 车损特写照片（多张）
  const [damagePhotos, setDamagePhotos] = useState<{path: string; size: number}[]>([])

  // 恢复草稿
  useEffect(() => {
    if (!user?.id || !vehicleId) return

    const loadDraft = async () => {
      try {
        const draft = await getDraft('return', `${user.id}_${vehicleId}`)
        if (draft) {
          // 询问用户是否恢复草稿
          Taro.showModal({
            title: '发现未完成的还车录入',
            content: `上次保存时间：${draft.saved_at ? new Date(draft.saved_at).toLocaleString('zh-CN') : '未知'}\n是否继续录入？`,
            confirmText: '继续录入',
            cancelText: '重新开始',
            success: (res) => {
              if (res.confirm) {
                // 恢复草稿数据
                if (draft.vehicle_photos && draft.vehicle_photos.length > 0) {
                  setVehiclePhotos({
                    left_front: draft.vehicle_photos[0] || '',
                    right_front: draft.vehicle_photos[1] || '',
                    left_rear: draft.vehicle_photos[2] || '',
                    right_rear: draft.vehicle_photos[3] || '',
                    dashboard: draft.vehicle_photos[4] || '',
                    rear_door: draft.vehicle_photos[5] || '',
                    cargo_box: draft.vehicle_photos[6] || ''
                  })
                }

                if (draft.damage_photos && draft.damage_photos.length > 0) {
                  setDamagePhotos(draft.damage_photos.map((path) => ({path, size: 0})))
                }

                Taro.showToast({
                  title: '草稿已恢复',
                  icon: 'success'
                })
              } else {
                // 删除草稿
                deleteDraft('return', `${user.id}_${vehicleId}`)
              }
            }
          })
        }
      } catch (error) {
        console.error('恢复草稿失败:', error)
      }
    }

    loadDraft()
  }, [user?.id, vehicleId])

  // 自动保存草稿
  const saveCurrentDraft = useCallback(async () => {
    if (!user?.id || !vehicleId) return

    const draft: VehicleDraft = {
      vehicle_photos: [
        vehiclePhotos.left_front,
        vehiclePhotos.right_front,
        vehiclePhotos.left_rear,
        vehiclePhotos.right_rear,
        vehiclePhotos.dashboard,
        vehiclePhotos.rear_door,
        vehiclePhotos.cargo_box
      ],
      damage_photos: damagePhotos.map((p) => p.path)
    }

    await saveDraft('return', `${user.id}_${vehicleId}`, draft)
  }, [user?.id, vehicleId, vehiclePhotos, damagePhotos])

  // 监听数据变化，自动保存草稿
  useEffect(() => {
    // 防抖保存
    const timer = setTimeout(() => {
      saveCurrentDraft()
    }, 1000)

    return () => clearTimeout(timer)
  }, [saveCurrentDraft])

  useLoad((options) => {
    const {id} = options
    if (id) {
      setVehicleId(id)
      loadVehicleInfo(id)
    } else {
      Taro.showToast({
        title: '缺少车辆ID',
        icon: 'error'
      })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    }
  })

  // 加载车辆信息
  const loadVehicleInfo = async (vehicleId: string) => {
    setLoading(true)
    try {
      const data = await getVehicleById(vehicleId)
      if (data) {
        setVehicle(data)
        logger.info('车辆信息加载成功', {vehicleId, plate: data.plate_number})
      } else {
        Taro.showToast({
          title: '车辆不存在',
          icon: 'error'
        })
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      }
    } catch (error) {
      logger.error('加载车辆信息失败', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  // 选择车损特写照片
  const handleChooseDamagePhotos = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 9 - damagePhotos.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      const newPhotos = res.tempFiles.map((file) => ({
        path: file.path,
        size: file.size || 0
      }))

      setDamagePhotos([...damagePhotos, ...newPhotos])
      logger.info('选择车损照片', {count: newPhotos.length})
    } catch (error) {
      logger.error('选择照片失败', error)
    }
  }

  // 删除车损照片
  const handleDeleteDamagePhoto = (index: number) => {
    const newPhotos = damagePhotos.filter((_, i) => i !== index)
    setDamagePhotos(newPhotos)
  }

  // 检查是否所有必填照片都已拍摄
  const checkRequiredPhotos = (): boolean => {
    const missingPhotos: string[] = []
    VEHICLE_PHOTO_LABELS.forEach(({key, label}) => {
      if (!vehiclePhotos[key]) {
        missingPhotos.push(label)
      }
    })

    if (missingPhotos.length > 0) {
      Taro.showToast({
        title: `请拍摄：${missingPhotos[0]}`,
        icon: 'none',
        duration: 2000
      })
      return false
    }
    return true
  }

  // 提交还车
  const handleSubmit = async () => {
    if (!vehicle) {
      Taro.showToast({
        title: '车辆信息不存在',
        icon: 'error'
      })
      return
    }

    // 检查必填照片
    if (!checkRequiredPhotos()) {
      return
    }

    try {
      setUploading(true)
      Taro.showLoading({title: '上传中...'})

      // 1. 上传7张车辆照片
      const uploadedVehiclePhotos: Record<string, string> = {}
      for (const [key, path] of Object.entries(vehiclePhotos)) {
        if (path) {
          const fileName = generateUniqueFileName(`return_${key}`, 'jpg')
          const uploadedPath = await uploadImageToStorage(path, BUCKET_NAME, fileName, false)
          if (!uploadedPath) {
            throw new Error(`上传${key}照片失败`)
          }
          uploadedVehiclePhotos[key] = uploadedPath
        }
      }

      // 2. 上传车损特写照片
      const uploadedDamagePhotos: string[] = []
      for (let i = 0; i < damagePhotos.length; i++) {
        const photo = damagePhotos[i]
        const fileName = generateUniqueFileName(`return_damage_${i}`, 'jpg')
        const uploadedPath = await uploadImageToStorage(photo.path, BUCKET_NAME, fileName, false)
        if (uploadedPath) {
          uploadedDamagePhotos.push(uploadedPath)
        }
      }

      logger.info('还车照片上传成功', {
        vehiclePhotos: Object.keys(uploadedVehiclePhotos).length,
        damagePhotos: uploadedDamagePhotos.length
      })

      // 3. 构建还车照片数组（7张车辆照片）
      const returnPhotoUrls = [
        uploadedVehiclePhotos.left_front,
        uploadedVehiclePhotos.right_front,
        uploadedVehiclePhotos.left_rear,
        uploadedVehiclePhotos.right_rear,
        uploadedVehiclePhotos.dashboard,
        uploadedVehiclePhotos.rear_door,
        uploadedVehiclePhotos.cargo_box
      ].filter(Boolean)

      // 4. 调用还车API
      const result = await returnVehicle(vehicle.id, returnPhotoUrls)

      // 5. 如果有车损照片，追加到车辆的damage_photos字段（保留提车时的车损照片）
      if (uploadedDamagePhotos.length > 0 && result) {
        // 获取现有的车损照片
        const existingDamagePhotos = vehicle.damage_photos || []
        // 合并提车和还车的车损照片
        const allDamagePhotos = [...existingDamagePhotos, ...uploadedDamagePhotos]
        await updateVehicle(vehicle.id, {
          damage_photos: allDamagePhotos
        })
      }

      Taro.hideLoading()

      if (result) {
        Taro.showToast({
          title: '还车成功',
          icon: 'success'
        })
        logger.info('还车成功', {vehicleId: vehicle.id})

        // 删除草稿
        if (user?.id && vehicleId) {
          await deleteDraft('return', `${user.id}_${vehicleId}`)
        }

        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      } else {
        throw new Error('还车失败')
      }
    } catch (error) {
      Taro.hideLoading()
      logger.error('还车失败', error)
      Taro.showToast({
        title: '还车失败，请重试',
        icon: 'error'
      })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <View className="flex items-center justify-center h-screen bg-gray-50">
        <View className="i-mdi-loading animate-spin text-5xl text-blue-600 mb-4"></View>
        <Text className="text-gray-600">加载中...</Text>
      </View>
    )
  }

  if (!vehicle) {
    return (
      <View className="flex items-center justify-center h-screen bg-gray-50">
        <Text className="text-gray-600">车辆信息不存在</Text>
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #FFF7ED, #FFEDD5)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4">
          {/* 页面标题 */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
            <View className="flex items-center mb-2">
              <View className="i-mdi-car-arrow-left text-3xl text-orange-600 mr-3"></View>
              <Text className="text-2xl font-bold text-gray-800">还车录入</Text>
            </View>
            <Text className="text-sm text-gray-500">请按顺序拍摄车辆照片并上传车损特写</Text>
          </View>

          {/* 车辆信息卡片 */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-information-outline text-2xl text-blue-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">车辆信息</Text>
            </View>
            <View className="space-y-3">
              <View className="flex items-center">
                <Text className="text-sm text-gray-600 w-20">车牌号：</Text>
                <View className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-3 py-1">
                  <Text className="text-white font-bold">{vehicle.plate_number}</Text>
                </View>
              </View>
              <View className="flex items-center">
                <Text className="text-sm text-gray-600 w-20">品牌型号：</Text>
                <Text className="text-sm text-gray-800 font-medium">
                  {vehicle.brand} {vehicle.model}
                </Text>
              </View>
              {vehicle.pickup_time && (
                <View className="flex items-center">
                  <Text className="text-sm text-gray-600 w-20">提车时间：</Text>
                  <Text className="text-sm text-gray-800">
                    {new Date(vehicle.pickup_time).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 车辆照片（7张，按顺序拍摄） */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-camera text-2xl text-orange-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">车辆照片</Text>
              <Text className="text-sm text-red-500 ml-1">*</Text>
            </View>
            <Text className="text-xs text-gray-500 mb-4">请按顺序拍摄以下7张车辆照片</Text>

            {VEHICLE_PHOTO_LABELS.map(({key, label, icon}) => (
              <View key={key} className="mb-4">
                <PhotoCapture
                  title={label}
                  description=""
                  tips={[]}
                  value={vehiclePhotos[key]}
                  onChange={(path) => setVehiclePhotos((prev) => ({...prev, [key]: path}))}
                />
              </View>
            ))}
          </View>

          {/* 车损特写照片（多张，可选） */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
            <View className="flex items-center justify-between mb-4">
              <View className="flex items-center">
                <View className="i-mdi-image-multiple text-2xl text-red-600 mr-2"></View>
                <Text className="text-lg font-bold text-gray-800">车损特写</Text>
                <Text className="text-xs text-gray-500 ml-2">（可选）</Text>
              </View>
              <Text className="text-xs text-gray-500">{damagePhotos.length}/9</Text>
            </View>

            <View className="flex flex-wrap gap-3">
              {damagePhotos.map((photo, index) => (
                <View key={index} className="relative">
                  <Image src={photo.path} mode="aspectFill" className="w-24 h-24 rounded-lg border-2 border-gray-200" />
                  <View
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                    onClick={() => handleDeleteDamagePhoto(index)}>
                    <View className="i-mdi-close text-white text-sm"></View>
                  </View>
                </View>
              ))}

              {damagePhotos.length < 9 && (
                <View
                  className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50"
                  onClick={handleChooseDamagePhotos}>
                  <View className="flex flex-col items-center">
                    <View className="i-mdi-plus text-3xl text-gray-400 mb-1"></View>
                    <Text className="text-xs text-gray-500">添加照片</Text>
                  </View>
                </View>
              )}
            </View>

            <Text className="text-xs text-gray-500 mt-3">提示：如有车辆损伤，请拍摄特写照片，最多上传9张</Text>
          </View>

          {/* 提交按钮 */}
          <View className="mb-8">
            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl break-keep text-base shadow-lg"
              size="default"
              onClick={handleSubmit}
              disabled={uploading}>
              <View className="flex items-center justify-center">
                {uploading ? (
                  <>
                    <View className="i-mdi-loading animate-spin text-xl mr-2"></View>
                    <Text className="font-medium">上传中...</Text>
                  </>
                ) : (
                  <>
                    <View className="i-mdi-check-circle text-xl mr-2"></View>
                    <Text className="font-medium">确认还车</Text>
                  </>
                )}
              </View>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default ReturnVehicle
