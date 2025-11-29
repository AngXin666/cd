/**
 * 车辆详情页面 - 标签页版
 * 功能：
 * - 使用标签页展示提车照片、还车照片、行驶证照片
 * - 显示提车时间和还车时间
 * - 展示车辆基本信息
 */

import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useLoad} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useState} from 'react'
import * as VehiclesAPI from '@/db/api/vehicles'

import type {Vehicle} from '@/db/types'
import {getImagePublicUrl} from '@/utils/imageUtils'
import {logger} from '@/utils/logger'

type TabType = 'pickup' | 'return' | 'registration' | 'damage'

const VehicleDetail: React.FC = () => {
  useAuth({guard: true})
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('pickup')
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

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
      const vehicleData = await VehiclesAPI.getVehicleById(vehicleId)
      setVehicle(vehicleData)
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

  // 获取照片的公开URL
  const getPhotoUrl = (path: string): string => {
    const bucketName = `${process.env.TARO_APP_APP_ID}_vehicles`
    return getImagePublicUrl(path, bucketName)
  }

  // 预览图片
  const previewImage = (url: string, urls: string[]) => {
    Taro.previewImage({
      current: url,
      urls: urls
    })
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

  // 处理图片加载失败
  const handleImageError = (photoUrl: string, photoType: string, index: number) => {
    logger.error(`${photoType}加载失败`, {photoUrl, index})
    setFailedImages((prev) => new Set(prev).add(photoUrl))
  }

  // 获取车辆状态文本
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'picked_up':
        return '已提车'
      case 'returned':
        return '已还车'
      case 'active':
        return '使用中'
      case 'inactive':
        return '已停用'
      case 'maintenance':
        return '维护中'
      default:
        return status
    }
  }

  // 获取车辆状态颜色
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'picked_up':
        return 'bg-green-500'
      case 'returned':
        return 'bg-gray-500'
      case 'active':
        return 'bg-blue-500'
      case 'inactive':
        return 'bg-red-500'
      case 'maintenance':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
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
              <View className={`rounded-full px-4 py-2 ${getStatusColor(vehicle.status)}`}>
                <Text className="text-white text-sm font-medium">{getStatusText(vehicle.status)}</Text>
              </View>
            </View>
          </View>

          {/* 补录照片按钮 - 只在审核不通过且有需要补录的照片时显示 */}
          {vehicle.review_status === 'need_supplement' &&
            vehicle.required_photos &&
            vehicle.required_photos.length > 0 && (
              <View className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                <View className="flex items-center justify-between">
                  <View className="flex-1">
                    <View className="flex items-center mb-1">
                      <View className="i-mdi-alert-circle text-xl text-red-600 mr-2"></View>
                      <Text className="text-red-900 font-bold">需要补录照片</Text>
                    </View>
                    <Text className="text-red-700 text-sm">
                      审核未通过，需要重新拍摄 {vehicle.required_photos.length} 张照片
                    </Text>
                  </View>
                  <View
                    className="bg-red-500 rounded-lg px-6 py-3 ml-4 active:bg-red-600 transition-colors"
                    onClick={() => {
                      Taro.navigateTo({
                        url: `/pages/driver/edit-vehicle/index?id=${vehicle.id}`
                      })
                    }}
                    style={{cursor: 'pointer'}}>
                    <View className="flex items-center">
                      <View className="i-mdi-camera-plus text-xl text-white mr-1"></View>
                      <Text className="text-white font-bold">补录照片</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

          {/* 基本信息卡片 */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-md">
            <View className="flex items-center mb-4">
              <View className="i-mdi-information text-2xl text-blue-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">基本信息</Text>
            </View>
            <View className="space-y-3">
              <InfoRow icon="i-mdi-car" label="车辆类型" value={vehicle.vehicle_type || '未填写'} />
              <InfoRow icon="i-mdi-barcode" label="车辆识别代号" value={vehicle.vin || '未填写'} />
              <InfoRow icon="i-mdi-file-document" label="使用性质" value={vehicle.use_character || '未填写'} />
              <InfoRow
                icon="i-mdi-calendar"
                label="注册日期"
                value={vehicle.register_date ? new Date(vehicle.register_date).toLocaleDateString('zh-CN') : '未填写'}
              />
            </View>
          </View>

          {/* 标签页导航 */}
          <View className="bg-white rounded-t-2xl shadow-md">
            <View className="flex border-b border-gray-200">
              <View
                className={`flex-1 py-4 text-center ${activeTab === 'pickup' ? 'border-b-2 border-blue-600' : ''}`}
                onClick={() => setActiveTab('pickup')}>
                <Text className={`font-medium ${activeTab === 'pickup' ? 'text-blue-600' : 'text-gray-600'}`}>
                  提车照片
                </Text>
              </View>
              <View
                className={`flex-1 py-4 text-center ${activeTab === 'return' ? 'border-b-2 border-blue-600' : ''}`}
                onClick={() => setActiveTab('return')}>
                <Text className={`font-medium ${activeTab === 'return' ? 'text-blue-600' : 'text-gray-600'}`}>
                  还车照片
                </Text>
              </View>
              <View
                className={`flex-1 py-4 text-center ${activeTab === 'registration' ? 'border-b-2 border-blue-600' : ''}`}
                onClick={() => setActiveTab('registration')}>
                <Text className={`font-medium ${activeTab === 'registration' ? 'text-blue-600' : 'text-gray-600'}`}>
                  行驶证照片
                </Text>
              </View>
              <View
                className={`flex-1 py-4 text-center ${activeTab === 'damage' ? 'border-b-2 border-blue-600' : ''}`}
                onClick={() => setActiveTab('damage')}>
                <Text className={`font-medium ${activeTab === 'damage' ? 'text-blue-600' : 'text-gray-600'}`}>
                  车损特写
                </Text>
              </View>
            </View>
          </View>

          {/* 标签页内容 */}
          <View className="bg-white rounded-b-2xl p-5 mb-4 shadow-md">
            {/* 提车照片标签页 */}
            {activeTab === 'pickup' && (
              <View>
                {/* 提车时间 */}
                <View className="bg-green-50 rounded-lg p-4 mb-4">
                  <View className="flex items-center">
                    <View className="i-mdi-clock-check-outline text-2xl text-green-600 mr-2"></View>
                    <View className="flex-1">
                      <Text className="text-sm text-gray-600 mb-1">提车录入时间</Text>
                      <Text className="text-base text-gray-800 font-bold">{formatTime(vehicle.pickup_time)}</Text>
                    </View>
                  </View>
                </View>

                {/* 提车照片网格 */}
                {vehicle.pickup_photos && vehicle.pickup_photos.length > 0 ? (
                  <View className="grid grid-cols-3 gap-3">
                    {vehicle.pickup_photos.map((photo, index) => {
                      const photoUrl = getPhotoUrl(photo)
                      return (
                        <View
                          key={index}
                          className="relative rounded-lg overflow-hidden bg-gray-100"
                          onClick={() => {
                            const urls = vehicle.pickup_photos?.map((p) => getPhotoUrl(p)).filter(Boolean) || []
                            if (photoUrl && urls.length > 0 && !failedImages.has(photoUrl)) {
                              previewImage(photoUrl, urls)
                            }
                          }}>
                          {photoUrl ? (
                            failedImages.has(photoUrl) ? (
                              <View className="w-full h-24 flex flex-col items-center justify-center bg-red-50">
                                <View className="i-mdi-image-broken text-2xl text-red-400 mb-1"></View>
                                <Text className="text-red-600 text-xs">加载失败</Text>
                              </View>
                            ) : (
                              <Image
                                src={photoUrl}
                                mode="aspectFill"
                                className="w-full h-24"
                                onError={() => handleImageError(photoUrl, '提车照片', index)}
                              />
                            )
                          ) : (
                            <View className="w-full h-24 flex items-center justify-center">
                              <View className="i-mdi-image-off text-2xl text-gray-400"></View>
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                ) : (
                  <View className="flex flex-col items-center justify-center py-12">
                    <View className="i-mdi-image-off text-5xl text-gray-300 mb-2"></View>
                    <Text className="text-gray-500">暂无提车照片</Text>
                  </View>
                )}
              </View>
            )}

            {/* 还车照片标签页 */}
            {activeTab === 'return' && (
              <View>
                {/* 还车时间 */}
                <View className="bg-gray-50 rounded-lg p-4 mb-4">
                  <View className="flex items-center">
                    <View className="i-mdi-clock-check text-2xl text-gray-600 mr-2"></View>
                    <View className="flex-1">
                      <Text className="text-sm text-gray-600 mb-1">还车录入时间</Text>
                      <Text className="text-base text-gray-800 font-bold">{formatTime(vehicle.return_time)}</Text>
                    </View>
                  </View>
                </View>

                {/* 还车照片网格 */}
                {vehicle.return_photos && vehicle.return_photos.length > 0 ? (
                  <View className="grid grid-cols-3 gap-3">
                    {vehicle.return_photos.map((photo, index) => {
                      const photoUrl = getPhotoUrl(photo)
                      return (
                        <View
                          key={index}
                          className="relative rounded-lg overflow-hidden bg-gray-100"
                          onClick={() => {
                            const urls = vehicle.return_photos?.map((p) => getPhotoUrl(p)).filter(Boolean) || []
                            if (photoUrl && urls.length > 0 && !failedImages.has(photoUrl)) {
                              previewImage(photoUrl, urls)
                            }
                          }}>
                          {photoUrl ? (
                            failedImages.has(photoUrl) ? (
                              <View className="w-full h-24 flex flex-col items-center justify-center bg-red-50">
                                <View className="i-mdi-image-broken text-2xl text-red-400 mb-1"></View>
                                <Text className="text-red-600 text-xs">加载失败</Text>
                              </View>
                            ) : (
                              <Image
                                src={photoUrl}
                                mode="aspectFill"
                                className="w-full h-24"
                                onError={() => handleImageError(photoUrl, '还车照片', index)}
                              />
                            )
                          ) : (
                            <View className="w-full h-24 flex items-center justify-center">
                              <View className="i-mdi-image-off text-2xl text-gray-400"></View>
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                ) : (
                  <View className="flex flex-col items-center justify-center py-12">
                    <View className="i-mdi-image-off text-5xl text-gray-300 mb-2"></View>
                    <Text className="text-gray-500">暂无还车照片</Text>
                  </View>
                )}
              </View>
            )}

            {/* 行驶证照片标签页 */}
            {activeTab === 'registration' && (
              <View>
                {/* 提示信息 */}
                <View className="bg-blue-50 rounded-lg p-4 mb-4">
                  <View className="flex items-center">
                    <View className="i-mdi-information-outline text-2xl text-blue-600 mr-2"></View>
                    <Text className="text-sm text-gray-600">行驶证照片在提车时录入</Text>
                  </View>
                </View>

                {/* 行驶证照片网格 */}
                {vehicle.registration_photos && vehicle.registration_photos.length > 0 ? (
                  <View className="grid grid-cols-2 gap-3">
                    {vehicle.registration_photos.map((photo, index) => {
                      const photoUrl = getPhotoUrl(photo)
                      return (
                        <View
                          key={index}
                          className="relative rounded-lg overflow-hidden bg-gray-100"
                          onClick={() => {
                            const urls = vehicle.registration_photos?.map((p) => getPhotoUrl(p)).filter(Boolean) || []
                            if (photoUrl && urls.length > 0 && !failedImages.has(photoUrl)) {
                              previewImage(photoUrl, urls)
                            }
                          }}>
                          {photoUrl ? (
                            failedImages.has(photoUrl) ? (
                              <View className="w-full h-32 flex flex-col items-center justify-center bg-red-50">
                                <View className="i-mdi-image-broken text-3xl text-red-400 mb-1"></View>
                                <Text className="text-red-600 text-xs">加载失败</Text>
                              </View>
                            ) : (
                              <>
                                <Image
                                  src={photoUrl}
                                  mode="aspectFit"
                                  className="w-full h-32 bg-gray-100"
                                  onError={() => handleImageError(photoUrl, '行驶证照片', index)}
                                />
                                <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                  <Text className="text-white text-xs font-medium">
                                    {index === 0 ? '主页' : index === 1 ? '副页' : '副页背面'}
                                  </Text>
                                </View>
                              </>
                            )
                          ) : (
                            <View className="w-full h-32 flex items-center justify-center">
                              <View className="i-mdi-image-off text-3xl text-gray-400"></View>
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                ) : (
                  <View className="flex flex-col items-center justify-center py-12">
                    <View className="i-mdi-image-off text-5xl text-gray-300 mb-2"></View>
                    <Text className="text-gray-500">暂无行驶证照片</Text>
                  </View>
                )}
              </View>
            )}

            {/* 车损特写照片标签页 */}
            {activeTab === 'damage' && (
              <View>
                {/* 提示信息 */}
                <View className="bg-orange-50 rounded-lg p-4 mb-4">
                  <View className="flex items-center">
                    <View className="i-mdi-information-outline text-2xl text-orange-600 mr-2"></View>
                    <Text className="text-sm text-gray-600">车损特写照片用于记录车辆损伤情况</Text>
                  </View>
                </View>

                {/* 车损照片网格 */}
                {vehicle.damage_photos && vehicle.damage_photos.length > 0 ? (
                  <View className="grid grid-cols-3 gap-2">
                    {vehicle.damage_photos.map((photo, index) => {
                      const photoUrl = getPhotoUrl(photo)
                      return (
                        <View
                          key={index}
                          className="relative rounded-lg overflow-hidden bg-gray-100"
                          onClick={() => {
                            const urls = vehicle.damage_photos?.map((p) => getPhotoUrl(p)).filter(Boolean) || []
                            if (photoUrl && urls.length > 0 && !failedImages.has(photoUrl)) {
                              previewImage(photoUrl, urls)
                            }
                          }}>
                          {photoUrl ? (
                            failedImages.has(photoUrl) ? (
                              <View className="w-full h-24 flex flex-col items-center justify-center bg-red-50">
                                <View className="i-mdi-image-broken text-2xl text-red-400 mb-1"></View>
                                <Text className="text-red-600 text-xs">加载失败</Text>
                              </View>
                            ) : (
                              <>
                                <Image
                                  src={photoUrl}
                                  mode="aspectFill"
                                  className="w-full h-24 bg-gray-100"
                                  onError={() => handleImageError(photoUrl, '车损照片', index)}
                                />
                                <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                                  <Text className="text-white text-xs font-medium">车损 {index + 1}</Text>
                                </View>
                              </>
                            )
                          ) : (
                            <View className="w-full h-24 flex items-center justify-center">
                              <View className="i-mdi-image-off text-2xl text-gray-400"></View>
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                ) : (
                  <View className="flex flex-col items-center justify-center py-12">
                    <View className="i-mdi-image-off text-5xl text-gray-300 mb-2"></View>
                    <Text className="text-gray-500">暂无车损照片</Text>
                  </View>
                )}
              </View>
            )}
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

export default VehicleDetail
