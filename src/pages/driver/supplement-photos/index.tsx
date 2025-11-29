/**
 * 图片补录页面
 * 司机补录被管理员标记需要重新上传的图片
 */

import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useLoad} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {supabase} from '@/client/supabase'
import * as VehiclesAPI from '@/db/api/vehicles'

import type {Vehicle} from '@/db/types'
import {generateUniqueFileName, uploadImageToStorage} from '@/utils/imageUtils'
import {createLogger} from '@/utils/logger'

const logger = createLogger('SupplementPhotos')

const BUCKET_NAME = `${process.env.TARO_APP_APP_ID}_vehicles`

// 图片字段配置
interface PhotoFieldConfig {
  field: 'pickup_photos' | 'return_photos' | 'registration_photos'
  label: string
  icon: string
}

const PHOTO_FIELDS: PhotoFieldConfig[] = [
  {field: 'pickup_photos', label: '提车照片', icon: 'i-mdi-car'},
  {field: 'return_photos', label: '还车照片', icon: 'i-mdi-car-arrow-left'},
  {field: 'registration_photos', label: '行驶证照片', icon: 'i-mdi-card-account-details'}
]

const SupplementPhotos: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [requiredPhotos, setRequiredPhotos] = useState<string[]>([])
  const [newPhotos, setNewPhotos] = useState<Record<string, string>>({}) // key: field_index, value: tempPath
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 加载车辆信息和需要补录的图片
  const loadVehicle = useCallback(async (vehicleId: string) => {
    setLoading(true)
    logger.info('加载车辆信息', {vehicleId})

    try {
      const data = await VehiclesAPI.getVehicleById(vehicleId)
      if (!data) {
        throw new Error('车辆不存在')
      }

      setVehicle(data)

      // 获取需要补录的图片列表
      const required = await VehiclesAPI.getRequiredPhotos(vehicleId)
      setRequiredPhotos(required)

      logger.info('加载车辆信息成功', {vehicleId, requiredCount: required.length})
    } catch (error) {
      logger.error('加载车辆信息失败', error)
      Taro.showToast({title: '加载失败', icon: 'none'})
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } finally {
      setLoading(false)
    }
  }, [])

  // 页面加载时获取车辆ID
  useLoad((options) => {
    const {vehicleId} = options
    if (vehicleId) {
      loadVehicle(vehicleId)
    } else {
      Taro.showToast({title: '参数错误', icon: 'none'})
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    }
  })

  // 获取图片公共URL
  const getImageUrl = (path: string | null | undefined): string => {
    if (!path) return ''
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    try {
      const {data} = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
      return data.publicUrl
    } catch (error) {
      logger.error('获取图片URL失败', {path, error})
      return ''
    }
  }

  // 选择图片
  const chooseImage = async (field: string, index: number) => {
    try {
      const res = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        const photoKey = `${field}_${index}`
        setNewPhotos({
          ...newPhotos,
          [photoKey]: res.tempFilePaths[0]
        })
        Taro.showToast({title: '图片已选择', icon: 'success'})
      }
    } catch (error) {
      logger.error('选择图片失败', error)
      Taro.showToast({title: '选择图片失败', icon: 'none'})
    }
  }

  // 提交补录
  const handleSubmit = async () => {
    if (!vehicle || !user) return

    // 检查是否所有需要补录的图片都已选择
    const missingPhotos = requiredPhotos.filter((key) => !newPhotos[key])
    if (missingPhotos.length > 0) {
      Taro.showModal({
        title: '提示',
        content: `还有 ${missingPhotos.length} 张图片未选择`,
        showCancel: false
      })
      return
    }

    Taro.showModal({
      title: '确认提交',
      content: '确认提交补录的图片吗？',
      success: async (res) => {
        if (res.confirm) {
          setSubmitting(true)
          Taro.showLoading({title: '上传中...'})

          try {
            // 上传所有新图片
            for (const [photoKey, tempPath] of Object.entries(newPhotos)) {
              // 正确解析字段名和索引
              // photoKey格式: "pickup_photos_5" 或 "return_photos_3"
              const lastUnderscoreIndex = photoKey.lastIndexOf('_')
              const field = photoKey.substring(0, lastUnderscoreIndex)
              const indexStr = photoKey.substring(lastUnderscoreIndex + 1)
              const index = parseInt(indexStr, 10)

              if (Number.isNaN(index)) {
                logger.error('无效的图片索引', {photoKey, field, indexStr})
                throw new Error(`无效的图片索引: ${photoKey}`)
              }

              logger.info('准备上传补录图片', {photoKey, field, index, tempPath})

              // 上传图片
              const fileName = generateUniqueFileName(`supplement_${field}_${index}`, 'jpg')
              const uploadedPath = await uploadImageToStorage(tempPath, BUCKET_NAME, fileName, false)

              if (!uploadedPath) {
                throw new Error(`上传图片失败: ${photoKey}`)
              }

              logger.info('图片上传成功，准备更新数据库', {photoKey, uploadedPath})

              // 更新数据库
              const success = await VehiclesAPI.supplementPhoto(vehicle.id, field, index, uploadedPath)
              if (!success) {
                throw new Error(`更新图片失败: ${photoKey}`)
              }

              logger.info('图片补录成功', {photoKey})
            }

            // 提交审核
            const success = await VehiclesAPI.submitVehicleForReview(vehicle.id)
            if (!success) {
              throw new Error('提交审核失败')
            }

            Taro.hideLoading()
            Taro.showToast({title: '提交成功', icon: 'success'})

            setTimeout(() => {
              Taro.switchTab({url: '/pages/driver/vehicle-list/index'})
            }, 1500)
          } catch (error) {
            logger.error('提交补录失败', error)
            Taro.hideLoading()
            Taro.showToast({
              title: error instanceof Error ? error.message : '提交失败',
              icon: 'none',
              duration: 3000
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
      <View className="flex items-center justify-center h-screen">
        <View className="i-mdi-loading animate-spin text-4xl text-red-600 mb-4"></View>
        <Text className="text-gray-600">加载中...</Text>
      </View>
    )
  }

  if (!vehicle) {
    return (
      <View className="flex items-center justify-center h-screen">
        <Text className="text-gray-600">车辆信息不存在</Text>
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #FEE2E2, #FECACA)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4 pb-32">
          {/* 提示信息 */}
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <View className="flex items-center mb-2">
              <View className="i-mdi-alert-circle text-xl text-red-600 mr-2"></View>
              <Text className="text-base font-bold text-red-700">需要补录图片</Text>
            </View>
            <Text className="text-sm text-red-600">管理员审核后发现部分图片不符合要求，请重新上传以下图片。</Text>
            {vehicle.review_notes && (
              <View className="mt-3 bg-white rounded-lg p-3">
                <Text className="text-xs text-gray-600 mb-1">审核备注：</Text>
                <Text className="text-sm text-gray-800">{vehicle.review_notes}</Text>
              </View>
            )}
          </View>

          {/* 车辆基本信息 */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
            <View className="flex items-center mb-3">
              <View className="i-mdi-car text-2xl text-red-600 mr-2"></View>
              <Text className="text-xl font-bold text-gray-800">车辆信息</Text>
            </View>
            <View className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-3 py-1 inline-block mb-2">
              <Text className="text-white text-lg font-bold">{vehicle.plate_number}</Text>
            </View>
            <Text className="text-gray-800 text-base font-medium">
              {vehicle.brand} {vehicle.model}
            </Text>
          </View>

          {/* 需要补录的图片 */}
          {PHOTO_FIELDS.map((config) => {
            const photos = vehicle[config.field] || []
            const requiredIndices = requiredPhotos
              .filter((key) => key.startsWith(`${config.field}_`))
              .map((key) => {
                const parts = key.split('_')
                const indexStr = parts[parts.length - 1] // 获取最后一部分作为索引
                const index = parseInt(indexStr, 10)
                return Number.isNaN(index) ? -1 : index // 如果解析失败，返回-1
              })
              .filter((index) => index >= 0) // 过滤掉无效的索引

            if (requiredIndices.length === 0) return null

            return (
              <View key={config.field} className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
                <View className="flex items-center justify-between mb-3">
                  <View className="flex items-center">
                    <View className={`${config.icon} text-xl text-red-600 mr-2`}></View>
                    <Text className="text-lg font-bold text-gray-800">{config.label}</Text>
                  </View>
                  <Text className="text-sm text-red-600">需补录 {requiredIndices.length} 张</Text>
                </View>

                <View className="space-y-4">
                  {requiredIndices.map((index) => {
                    const photoKey = `${config.field}_${index}`
                    const originalUrl = getImageUrl(photos[index])
                    const newPhotoPath = newPhotos[photoKey]

                    return (
                      <View key={photoKey} className="border border-red-200 rounded-lg p-3">
                        <Text className="text-sm text-gray-700 mb-2">第 {index + 1} 张</Text>

                        <View className="flex gap-2">
                          {/* 原图 */}
                          <View className="flex-1">
                            <Text className="text-xs text-gray-500 mb-1">原图（不符合要求）</Text>
                            <View className="relative w-full h-32 rounded-lg overflow-hidden bg-gray-100">
                              {originalUrl ? (
                                <Image
                                  src={originalUrl}
                                  mode="aspectFill"
                                  className="w-full h-full"
                                  onError={() => logger.error('原图加载失败', {originalUrl, index})}
                                />
                              ) : (
                                <View className="w-full h-full flex items-center justify-center">
                                  <View className="i-mdi-image-off text-3xl text-gray-400"></View>
                                </View>
                              )}
                              <View className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                                <View className="bg-red-600 rounded-full p-1">
                                  <View className="i-mdi-close text-lg text-white"></View>
                                </View>
                              </View>
                            </View>
                          </View>

                          {/* 新图 */}
                          <View className="flex-1">
                            <Text className="text-xs text-gray-500 mb-1">新图</Text>
                            {newPhotoPath ? (
                              <View className="relative w-full h-32 rounded-lg overflow-hidden bg-gray-100">
                                <Image
                                  src={newPhotoPath}
                                  mode="aspectFill"
                                  className="w-full h-full"
                                  onError={() => logger.error('新图加载失败', {newPhotoPath, index})}
                                />
                                <View className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                                  <View className="i-mdi-check text-base text-white"></View>
                                </View>
                              </View>
                            ) : (
                              <View
                                className="w-full h-32 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300"
                                onClick={() => chooseImage(config.field, index)}>
                                <View className="flex flex-col items-center">
                                  <View className="i-mdi-camera text-3xl text-gray-400 mb-1"></View>
                                  <Text className="text-xs text-gray-500">点击上传</Text>
                                </View>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* 重新选择按钮 */}
                        {newPhotoPath && (
                          <Button
                            className="w-full bg-blue-500 text-white py-2 rounded-lg break-keep text-xs mt-2"
                            size="mini"
                            onClick={() => chooseImage(config.field, index)}>
                            <View className="flex items-center justify-center">
                              <View className="i-mdi-refresh text-sm mr-1"></View>
                              <Text>重新选择</Text>
                            </View>
                          </Button>
                        )}
                      </View>
                    )
                  })}
                </View>
              </View>
            )
          })}

          {/* 统计信息 */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
            <View className="flex items-center mb-3">
              <View className="i-mdi-chart-box text-xl text-red-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">补录进度</Text>
            </View>
            <View className="flex gap-2">
              <View className="flex-1 bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-3">
                <Text className="text-xs text-red-600 mb-1">需补录</Text>
                <Text className="text-2xl font-bold text-red-700">{requiredPhotos.length}</Text>
              </View>
              <View className="flex-1 bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3">
                <Text className="text-xs text-green-600 mb-1">已选择</Text>
                <Text className="text-2xl font-bold text-green-700">{Object.keys(newPhotos).length}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 底部提交按钮 */}
        <View className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <Button
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl break-keep text-base shadow-lg active:scale-95 transition-all"
            size="default"
            onClick={handleSubmit}
            disabled={submitting || Object.keys(newPhotos).length < requiredPhotos.length}>
            <View className="flex items-center justify-center">
              <View className="i-mdi-check-circle text-xl mr-2"></View>
              <Text className="font-medium">
                {submitting ? '提交中...' : `提交补录 (${Object.keys(newPhotos).length}/${requiredPhotos.length})`}
              </Text>
            </View>
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}

export default SupplementPhotos
