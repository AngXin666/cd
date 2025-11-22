/**
 * 车辆照片补录页面
 * 功能：
 * - 根据审核要求，补录指定位置的照片
 * - 只显示需要补录的照片位置
 * - 上传补录照片后重新提交审核
 */

import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {chooseImage, useLoad} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getRegistrationPhotoConfigByIndex, getVehiclePhotoConfigByIndex} from '@/constants/photo-positions'
import {getVehicleById, updateVehicle} from '@/db/api'
import type {Vehicle} from '@/db/types'
import {generateUniqueFileName, uploadImageToStorage} from '@/utils/imageUtils'
import {createLogger} from '@/utils/logger'

const logger = createLogger('SupplementVehicle')
const BUCKET_NAME = `${process.env.TARO_APP_APP_ID}_vehicles`

// 补录照片项接口
interface SupplementPhotoItem {
  field: 'pickup_photos' | 'return_photos' | 'registration_photos' | 'damage_photos'
  index: number
  key: string // 例如: "pickup_photos_0"
  currentUrl: string // 当前照片URL
  newUrl: string // 新上传的照片URL
}

const SupplementVehicle: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [supplementItems, setSupplementItems] = useState<SupplementPhotoItem[]>([])

  useLoad((options) => {
    const {id} = options
    if (id) {
      loadVehicleData(id)
    }
  })

  // 加载车辆数据
  const loadVehicleData = useCallback(async (vehicleId: string) => {
    setLoading(true)
    try {
      const vehicleData = await getVehicleById(vehicleId)
      if (!vehicleData) {
        throw new Error('车辆不存在')
      }
      setVehicle(vehicleData)

      // 解析需要补录的照片
      const items: SupplementPhotoItem[] = []
      const requiredPhotos = vehicleData.required_photos || []

      for (const photoKey of requiredPhotos) {
        // photoKey格式: "pickup_photos_0", "registration_photos_1"
        const parts = photoKey.split('_')
        const lastPart = parts[parts.length - 1]
        const index = Number.parseInt(lastPart, 10)

        if (Number.isNaN(index)) {
          logger.warn('无效的照片key', {photoKey})
          continue
        }

        // 提取字段名
        let field: SupplementPhotoItem['field']
        if (photoKey.startsWith('pickup_photos')) {
          field = 'pickup_photos'
        } else if (photoKey.startsWith('return_photos')) {
          field = 'return_photos'
        } else if (photoKey.startsWith('registration_photos')) {
          field = 'registration_photos'
        } else if (photoKey.startsWith('damage_photos')) {
          field = 'damage_photos'
        } else {
          logger.warn('未知的照片字段', {photoKey})
          continue
        }

        // 获取当前照片URL
        const photos = vehicleData[field] || []
        const currentUrl = photos[index] || ''

        items.push({
          field,
          index,
          key: photoKey,
          currentUrl,
          newUrl: ''
        })
      }

      setSupplementItems(items)
      logger.info('需要补录的照片', {items})
    } catch (error) {
      logger.error('加载车辆数据失败', error)
      Taro.showToast({
        title: error instanceof Error ? error.message : '加载失败',
        icon: 'none'
      })
      setTimeout(() => {
        Taro.navigateBack()
      }, 2000)
    } finally {
      setLoading(false)
    }
  }, [])

  // 选择照片
  const handleChoosePhoto = useCallback(async (itemIndex: number) => {
    try {
      const res = await chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera', 'album']
      })

      if (res.tempFiles && res.tempFiles.length > 0) {
        const file = res.tempFiles[0]

        // 检查文件大小（1MB限制）
        if (file.size > 1024 * 1024) {
          Taro.showToast({
            title: '照片大小不能超过1MB',
            icon: 'none'
          })
          return
        }

        // 更新补录项的新照片URL（临时路径）
        setSupplementItems((prev) => {
          const newItems = [...prev]
          newItems[itemIndex].newUrl = file.path
          return newItems
        })

        Taro.showToast({
          title: '照片已选择',
          icon: 'success'
        })
      }
    } catch (error) {
      logger.error('选择照片失败', error)
      Taro.showToast({
        title: '选择照片失败',
        icon: 'none'
      })
    }
  }, [])

  // 提交补录
  const handleSubmit = useCallback(async () => {
    if (!vehicle) return

    // 检查是否所有照片都已补录
    const unfinishedItems = supplementItems.filter((item) => !item.newUrl)
    if (unfinishedItems.length > 0) {
      Taro.showToast({
        title: '请补录所有需要的照片',
        icon: 'none'
      })
      return
    }

    setSubmitting(true)
    Taro.showLoading({title: '上传中...'})

    try {
      // 上传所有新照片
      const uploadPromises = supplementItems.map(async (item) => {
        const fileName = generateUniqueFileName('supplement')
        const uploadResult = await uploadImageToStorage(item.newUrl, BUCKET_NAME, fileName)

        if (!uploadResult) {
          throw new Error(`上传照片失败`)
        }

        return {
          field: item.field,
          index: item.index,
          url: uploadResult
        }
      })

      const uploadResults = await Promise.all(uploadPromises)

      // 更新车辆照片数组
      const updatedPhotos: Record<string, string[]> = {}

      for (const result of uploadResults) {
        if (!updatedPhotos[result.field]) {
          updatedPhotos[result.field] = [...(vehicle[result.field] || [])]
        }
        updatedPhotos[result.field][result.index] = result.url
      }

      // 更新车辆信息，清空required_photos
      await updateVehicle(vehicle.id, {
        ...updatedPhotos,
        required_photos: [],
        review_status: 'pending_review' // 重新提交审核
      })

      Taro.hideLoading()
      Taro.showToast({
        title: '补录成功，已重新提交审核',
        icon: 'success',
        duration: 2000
      })

      setTimeout(() => {
        Taro.navigateBack()
      }, 2000)
    } catch (error) {
      logger.error('提交补录失败', error)
      Taro.hideLoading()
      Taro.showToast({
        title: error instanceof Error ? error.message : '提交失败',
        icon: 'none'
      })
    } finally {
      setSubmitting(false)
    }
  }, [vehicle, supplementItems])

  // 预览照片
  const previewPhoto = (url: string) => {
    if (!url) return
    Taro.previewImage({
      current: url,
      urls: [url]
    })
  }

  if (loading) {
    return (
      <View className="flex items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-blue-100">
        <View className="i-mdi-loading animate-spin text-4xl text-blue-600 mb-4"></View>
        <Text className="text-gray-600">加载中...</Text>
      </View>
    )
  }

  if (!vehicle) {
    return (
      <View className="flex items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-blue-100">
        <View className="i-mdi-alert-circle text-4xl text-red-600 mb-4"></View>
        <Text className="text-gray-600">车辆信息不存在</Text>
      </View>
    )
  }

  if (supplementItems.length === 0) {
    return (
      <View className="flex items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-blue-100">
        <View className="i-mdi-check-circle text-4xl text-green-600 mb-4"></View>
        <Text className="text-gray-600">没有需要补录的照片</Text>
        <Button
          className="mt-4 bg-blue-600 text-white px-6 py-2 rounded break-keep text-base"
          size="default"
          onClick={() => Taro.navigateBack()}>
          返回
        </Button>
      </View>
    )
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4 pb-32">
          {/* 页面标题 */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
            <View className="flex items-center mb-3">
              <View className="i-mdi-camera-plus text-2xl text-blue-600 mr-2"></View>
              <Text className="text-xl font-bold text-gray-800">照片补录</Text>
            </View>
            <View className="bg-blue-50 rounded-lg p-3">
              <Text className="text-sm text-blue-900">
                审核未通过，请根据以下要求重新拍摄照片。请确保照片清晰、完整，符合拍摄要求。
              </Text>
            </View>
          </View>

          {/* 车辆信息 */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
            <View className="flex items-center mb-2">
              <View className="i-mdi-car text-xl text-blue-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">车辆信息</Text>
            </View>
            <View className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-3 py-1 inline-block mb-2">
              <Text className="text-white text-lg font-bold">{vehicle.plate_number}</Text>
            </View>
            <Text className="text-gray-800 text-base">
              {vehicle.brand} {vehicle.model}
            </Text>
          </View>

          {/* 审核备注 */}
          {vehicle.review_notes && (
            <View className="bg-red-50 rounded-2xl p-4 mb-4 shadow-lg border-2 border-red-200">
              <View className="flex items-center mb-2">
                <View className="i-mdi-alert-circle text-xl text-red-600 mr-2"></View>
                <Text className="text-lg font-bold text-red-900">审核意见</Text>
              </View>
              <Text className="text-sm text-red-800">{vehicle.review_notes}</Text>
            </View>
          )}

          {/* 需要补录的照片列表 */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-lg">
            <View className="flex items-center mb-3">
              <View className="i-mdi-image-multiple text-xl text-blue-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">需要补录的照片</Text>
            </View>

            {supplementItems.map((item, itemIndex) => {
              // 获取照片位置配置
              let positionConfig
              if (item.field === 'pickup_photos' || item.field === 'return_photos') {
                positionConfig = getVehiclePhotoConfigByIndex(item.index)
              } else if (item.field === 'registration_photos') {
                positionConfig = getRegistrationPhotoConfigByIndex(item.index)
              }

              // 字段名称映射
              const fieldNameMap = {
                pickup_photos: '提车照片',
                return_photos: '还车照片',
                registration_photos: '行驶证照片',
                damage_photos: '车损特写'
              }

              return (
                <View key={item.key} className="mb-4 pb-4 border-b border-gray-200 last:border-b-0">
                  {/* 照片位置信息 */}
                  <View className="bg-blue-50 rounded-lg p-3 mb-3">
                    <View className="flex items-center mb-2">
                      <View className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2">
                        <Text className="text-xs font-bold">{itemIndex + 1}</Text>
                      </View>
                      <Text className="text-base font-bold text-blue-900">
                        {fieldNameMap[item.field]}
                        {positionConfig ? ` - ${positionConfig.title}` : ` 第${item.index + 1}张`}
                      </Text>
                    </View>
                    {positionConfig && (
                      <View>
                        <View className="flex items-start mb-1">
                          <View className={`${positionConfig.icon} text-base text-blue-600 mr-2 mt-0.5`}></View>
                          <Text className="text-sm text-blue-800 flex-1">{positionConfig.description}</Text>
                        </View>
                        {positionConfig.example && (
                          <Text className="text-xs text-blue-600 ml-6">提示：{positionConfig.example}</Text>
                        )}
                      </View>
                    )}
                  </View>

                  {/* 照片对比 */}
                  <View className="flex gap-2">
                    {/* 原照片 */}
                    <View className="flex-1">
                      <Text className="text-xs text-gray-600 mb-1">原照片</Text>
                      <View
                        className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-300"
                        onClick={() => previewPhoto(item.currentUrl)}>
                        {item.currentUrl ? (
                          <Image src={item.currentUrl} mode="aspectFill" className="w-full h-full" />
                        ) : (
                          <View className="w-full h-full flex items-center justify-center">
                            <View className="i-mdi-image-off text-3xl text-gray-400"></View>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* 新照片 */}
                    <View className="flex-1">
                      <Text className="text-xs text-gray-600 mb-1">新照片</Text>
                      <View
                        className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 border-2 border-blue-500"
                        onClick={() => item.newUrl && previewPhoto(item.newUrl)}>
                        {item.newUrl ? (
                          <Image src={item.newUrl} mode="aspectFill" className="w-full h-full" />
                        ) : (
                          <View className="w-full h-full flex items-center justify-center">
                            <View className="i-mdi-camera-plus text-3xl text-gray-400"></View>
                            <Text className="text-xs text-gray-500 mt-1">待上传</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* 拍照按钮 */}
                  <Button
                    className="w-full bg-blue-600 text-white py-3 rounded mt-3 break-keep text-base"
                    size="default"
                    onClick={() => handleChoosePhoto(itemIndex)}>
                    <View className="flex items-center justify-center">
                      <View className="i-mdi-camera text-xl mr-2"></View>
                      <Text>{item.newUrl ? '重新拍摄' : '拍摄照片'}</Text>
                    </View>
                  </Button>
                </View>
              )
            })}
          </View>
        </View>

        {/* 底部提交按钮 */}
        <View className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
          <Button
            className="w-full bg-blue-600 text-white py-4 rounded break-keep text-lg font-bold"
            size="default"
            disabled={submitting || supplementItems.some((item) => !item.newUrl)}
            onClick={handleSubmit}>
            <View className="flex items-center justify-center">
              <View className="i-mdi-check-circle text-xl mr-2"></View>
              <Text>{submitting ? '提交中...' : '提交补录'}</Text>
            </View>
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}

export default SupplementVehicle
