/**
 * 还车录入页面
 * 功能：
 * - 显示车辆基本信息
 * - 上传还车照片
 * - 自动记录还车时间
 * - 更新车辆状态为"已还车"
 */

import {Button, Image, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro, {useLoad} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useState} from 'react'
import {getVehicleById, returnVehicle} from '@/db/api'
import type {Vehicle} from '@/db/types'
import {generateUniqueFileName, uploadImageToStorage} from '@/utils/imageUtils'
import {createLogger} from '@/utils/logger'

const logger = createLogger('ReturnVehicle')
const BUCKET_NAME = `${process.env.TARO_APP_APP_ID}_images`

const ReturnVehicle: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [returnPhotos, setReturnPhotos] = useState<{path: string; size: number}[]>([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  useLoad((options) => {
    const {id} = options
    if (id) {
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

  // 选择还车照片
  const handleChoosePhotos = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 9 - returnPhotos.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      const newPhotos = res.tempFiles.map((file) => ({
        path: file.path,
        size: file.size || 0
      }))

      setReturnPhotos([...returnPhotos, ...newPhotos])
      logger.info('选择还车照片', {count: newPhotos.length})
    } catch (error) {
      logger.error('选择照片失败', error)
    }
  }

  // 删除照片
  const handleDeletePhoto = (index: number) => {
    const newPhotos = returnPhotos.filter((_, i) => i !== index)
    setReturnPhotos(newPhotos)
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

    if (returnPhotos.length === 0) {
      Taro.showToast({
        title: '请至少上传一张还车照片',
        icon: 'none'
      })
      return
    }

    try {
      setUploading(true)
      Taro.showLoading({title: '上传中...'})

      // 上传照片到 Supabase
      const uploadedPaths: string[] = []
      for (let i = 0; i < returnPhotos.length; i++) {
        const photo = returnPhotos[i]
        const fileName = generateUniqueFileName(`return_${vehicle.id}`, 'jpg')
        const uploadedPath = await uploadImageToStorage(photo.path, BUCKET_NAME, fileName, false)
        if (uploadedPath) {
          uploadedPaths.push(uploadedPath)
        }
      }

      if (uploadedPaths.length === 0) {
        throw new Error('照片上传失败')
      }

      logger.info('还车照片上传成功', {count: uploadedPaths.length})

      // 调用还车API
      const result = await returnVehicle(vehicle.id, uploadedPaths)
      Taro.hideLoading()

      if (result) {
        Taro.showToast({
          title: '还车成功',
          icon: 'success'
        })
        logger.info('还车成功', {vehicleId: vehicle.id})
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
            <Text className="text-sm text-gray-500">请上传还车照片并确认还车</Text>
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

          {/* 还车照片上传 */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
            <View className="flex items-center justify-between mb-4">
              <View className="flex items-center">
                <View className="i-mdi-camera text-2xl text-orange-600 mr-2"></View>
                <Text className="text-lg font-bold text-gray-800">还车照片</Text>
                <Text className="text-sm text-red-500 ml-1">*</Text>
              </View>
              <Text className="text-xs text-gray-500">{returnPhotos.length}/9</Text>
            </View>

            <View className="flex flex-wrap gap-3">
              {returnPhotos.map((photo, index) => (
                <View key={index} className="relative">
                  <Image src={photo.path} mode="aspectFill" className="w-24 h-24 rounded-lg border-2 border-gray-200" />
                  <View
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                    onClick={() => handleDeletePhoto(index)}>
                    <View className="i-mdi-close text-white text-sm"></View>
                  </View>
                </View>
              ))}

              {returnPhotos.length < 9 && (
                <View
                  className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50"
                  onClick={handleChoosePhotos}>
                  <View className="flex flex-col items-center">
                    <View className="i-mdi-plus text-3xl text-gray-400 mb-1"></View>
                    <Text className="text-xs text-gray-500">添加照片</Text>
                  </View>
                </View>
              )}
            </View>

            <Text className="text-xs text-gray-500 mt-3">提示：请拍摄车辆外观、内饰等照片，最多上传9张</Text>
          </View>

          {/* 备注（可选） */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-note-text-outline text-2xl text-gray-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">备注</Text>
              <Text className="text-xs text-gray-500 ml-2">（可选）</Text>
            </View>
            <View style={{overflow: 'hidden'}}>
              <Textarea
                className="bg-gray-50 text-gray-800 px-3 py-2 rounded-lg border border-gray-200 w-full"
                placeholder="请输入备注信息（可选）"
                value={notes}
                onInput={(e) => setNotes(e.detail.value)}
                maxlength={200}
                style={{minHeight: '100px'}}
              />
            </View>
            <Text className="text-xs text-gray-500 mt-2 text-right">{notes.length}/200</Text>
          </View>

          {/* 提交按钮 */}
          <View className="mb-8">
            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl break-keep text-base shadow-lg"
              size="default"
              onClick={handleSubmit}
              disabled={uploading || returnPhotos.length === 0}>
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
