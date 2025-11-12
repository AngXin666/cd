/**
 * 车辆详情页面 - 优化版
 * 显示车辆的完整信息和照片
 */

import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useLoad} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useState} from 'react'
import {supabase} from '@/client/supabase'
import {getVehicleById} from '@/db/api'
import type {Vehicle} from '@/db/types'

const VehicleDetail: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  useLoad((options) => {
    const {id} = options
    if (id) {
      loadVehicleDetail(id)
    }
  })

  // 加载车辆详情
  const loadVehicleDetail = async (vehicleId: string) => {
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
  }

  // 预览图片
  const previewImage = (url: string, urls: string[]) => {
    Taro.previewImage({
      current: url,
      urls: urls
    })
  }

  // 获取图片公开URL
  const getPublicUrl = (path: string | null) => {
    if (!path) return ''
    const {data} = supabase.storage.from('app-7cdqf07mbu9t_vehicles').getPublicUrl(path)
    return data.publicUrl
  }

  // 收集所有照片URL
  const getAllPhotos = () => {
    if (!vehicle) return []
    const photos: string[] = []
    if (vehicle.front_photo) photos.push(getPublicUrl(vehicle.front_photo))
    if (vehicle.back_photo) photos.push(getPublicUrl(vehicle.back_photo))
    if (vehicle.left_photo) photos.push(getPublicUrl(vehicle.left_photo))
    if (vehicle.right_photo) photos.push(getPublicUrl(vehicle.right_photo))
    if (vehicle.tire_photo) photos.push(getPublicUrl(vehicle.tire_photo))
    if (vehicle.driving_license_photo) photos.push(getPublicUrl(vehicle.driving_license_photo))
    return photos
  }

  if (loading) {
    return (
      <View className="flex items-center justify-center" style={{minHeight: '100vh', background: '#F8FAFC'}}>
        <View className="text-center">
          <View className="i-mdi-loading animate-spin text-5xl text-blue-600 mb-4"></View>
          <Text className="text-gray-600 font-medium">加载中...</Text>
        </View>
      </View>
    )
  }

  if (!vehicle) {
    return (
      <View className="flex items-center justify-center" style={{minHeight: '100vh', background: '#F8FAFC'}}>
        <View className="text-center">
          <View className="i-mdi-alert-circle text-5xl text-red-500 mb-4"></View>
          <Text className="text-gray-800 text-lg font-medium">车辆不存在</Text>
        </View>
      </View>
    )
  }

  const allPhotos = getAllPhotos()

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4">
          {/* 车辆头部卡片 */}
          <View className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex items-center justify-between mb-4">
              <View className="flex-1">
                <View className="bg-white rounded-lg px-4 py-2 mb-3 inline-block">
                  <Text className="text-blue-900 text-2xl font-bold">{vehicle.plate_number}</Text>
                </View>
                <Text className="text-white text-lg font-medium mb-1">
                  {vehicle.brand} {vehicle.model}
                </Text>
                {vehicle.color && <Text className="text-blue-100 text-sm">颜色：{vehicle.color}</Text>}
              </View>
              <View
                className={`rounded-full px-4 py-2 ${vehicle.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}>
                <Text className="text-white text-sm font-medium">
                  {vehicle.status === 'active' ? '使用中' : '已停用'}
                </Text>
              </View>
            </View>
          </View>

          {/* 基本信息卡片 */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-information text-2xl text-blue-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">基本信息</Text>
            </View>
            <View className="space-y-3">
              <InfoRow icon="i-mdi-car" label="车辆类型" value={vehicle.vehicle_type || '未填写'} />
              <InfoRow icon="i-mdi-barcode" label="车辆识别代号" value={vehicle.vin || '未填写'} />
              <InfoRow icon="i-mdi-account" label="所有人" value={vehicle.owner_name || '未填写'} />
              <InfoRow icon="i-mdi-file-document" label="使用性质" value={vehicle.use_character || '未填写'} />
              <InfoRow
                icon="i-mdi-calendar"
                label="注册日期"
                value={vehicle.register_date ? new Date(vehicle.register_date).toLocaleDateString('zh-CN') : '未填写'}
              />
              <InfoRow
                icon="i-mdi-calendar-check"
                label="发证日期"
                value={vehicle.issue_date ? new Date(vehicle.issue_date).toLocaleDateString('zh-CN') : '未填写'}
              />
            </View>
          </View>

          {/* 车辆照片卡片 */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-camera text-2xl text-blue-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">车辆照片</Text>
            </View>
            <View className="grid grid-cols-2 gap-3">
              <PhotoCard
                title="前方照片"
                icon="i-mdi-car-front"
                url={getPublicUrl(vehicle.front_photo)}
                allPhotos={allPhotos}
                onPreview={previewImage}
              />
              <PhotoCard
                title="后方照片"
                icon="i-mdi-car-back"
                url={getPublicUrl(vehicle.back_photo)}
                allPhotos={allPhotos}
                onPreview={previewImage}
              />
              <PhotoCard
                title="左侧照片"
                icon="i-mdi-car-side"
                url={getPublicUrl(vehicle.left_photo)}
                allPhotos={allPhotos}
                onPreview={previewImage}
              />
              <PhotoCard
                title="右侧照片"
                icon="i-mdi-car-side"
                url={getPublicUrl(vehicle.right_photo)}
                allPhotos={allPhotos}
                onPreview={previewImage}
              />
              <PhotoCard
                title="轮胎照片"
                icon="i-mdi-tire"
                url={getPublicUrl(vehicle.tire_photo)}
                allPhotos={allPhotos}
                onPreview={previewImage}
              />
              <PhotoCard
                title="行驶证"
                icon="i-mdi-card-account-details"
                url={getPublicUrl(vehicle.driving_license_photo)}
                allPhotos={allPhotos}
                onPreview={previewImage}
              />
            </View>
          </View>

          {/* 底部间距 */}
          <View className="h-4"></View>
        </View>
      </ScrollView>
    </View>
  )
}

// 信息行组件
interface InfoRowProps {
  icon: string
  label: string
  value: string
}

const InfoRow: React.FC<InfoRowProps> = ({icon, label, value}) => (
  <View className="flex items-center py-2 border-b border-gray-100 last:border-0">
    <View className={`${icon} text-lg text-blue-600 mr-3`}></View>
    <View className="flex-1">
      <Text className="text-sm text-gray-500 block mb-0.5">{label}</Text>
      <Text className="text-base text-gray-800 font-medium">{value}</Text>
    </View>
  </View>
)

// 照片卡片组件
interface PhotoCardProps {
  title: string
  icon: string
  url: string
  allPhotos: string[]
  onPreview: (url: string, urls: string[]) => void
}

const PhotoCard: React.FC<PhotoCardProps> = ({title, icon, url, allPhotos, onPreview}) => (
  <View
    className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden active:scale-95 transition-all"
    onClick={() => url && onPreview(url, allPhotos)}>
    {url ? (
      <View className="relative">
        <Image src={url} mode="aspectFill" className="w-full h-32" />
        <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
          <View className="flex items-center">
            <View className={`${icon} text-base text-white mr-1`}></View>
            <Text className="text-white text-xs font-medium">{title}</Text>
          </View>
        </View>
      </View>
    ) : (
      <View className="flex flex-col items-center justify-center h-32">
        <View className={`${icon} text-3xl text-gray-300 mb-2`}></View>
        <Text className="text-xs text-gray-400">{title}</Text>
        <Text className="text-xs text-gray-400">未上传</Text>
      </View>
    )}
  </View>
)

export default VehicleDetail
