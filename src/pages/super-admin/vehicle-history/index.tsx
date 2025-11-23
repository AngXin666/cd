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
import {calculateAge, calculateDrivingYears} from '@/utils/date'
import {createLogger} from '@/utils/logger'

const logger = createLogger('VehicleHistory')

const VehicleHistory: React.FC = () => {
  useAuth({guard: true})
  const router = useRouter()
  const plateNumber = router.params.plateNumber ? decodeURIComponent(router.params.plateNumber) : ''

  const [vehicle, setVehicle] = useState<VehicleWithDriver | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'pickup' | 'return' | 'driver'>('pickup')

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
        logger.info('车辆信息加载成功', {
          vehicleId: data.id,
          driverId: data.driver_id,
          hasDriver: !!data.driver,
          hasDriverLicense: !!(data as any).driver_license,
          driverLicenseData: (data as any).driver_license
        })
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

  // 获取提车照片（7个固定角度）
  const getPickupPhotos = (): string[] => {
    if (!vehicle) return []
    const photos: string[] = []
    if (vehicle.left_front_photo) photos.push(vehicle.left_front_photo)
    if (vehicle.right_front_photo) photos.push(vehicle.right_front_photo)
    if (vehicle.left_rear_photo) photos.push(vehicle.left_rear_photo)
    if (vehicle.right_rear_photo) photos.push(vehicle.right_rear_photo)
    if (vehicle.dashboard_photo) photos.push(vehicle.dashboard_photo)
    if (vehicle.rear_door_photo) photos.push(vehicle.rear_door_photo)
    if (vehicle.cargo_box_photo) photos.push(vehicle.cargo_box_photo)
    return photos
  }

  // 获取行驶证照片
  const getRegistrationPhotos = (): string[] => {
    if (!vehicle) return []
    const photos: string[] = []
    if (vehicle.driving_license_main_photo) photos.push(vehicle.driving_license_main_photo)
    if (vehicle.driving_license_sub_photo) photos.push(vehicle.driving_license_sub_photo)
    if (vehicle.driving_license_sub_back_photo) photos.push(vehicle.driving_license_sub_back_photo)
    return photos
  }

  // 获取身份证照片
  const getIdCardPhotos = (): string[] => {
    if (!vehicle || !vehicle.driver_license) return []
    const photos: string[] = []
    if (vehicle.driver_license.id_card_photo_front) photos.push(vehicle.driver_license.id_card_photo_front)
    if (vehicle.driver_license.id_card_photo_back) photos.push(vehicle.driver_license.id_card_photo_back)
    return photos
  }

  // 获取驾驶证照片
  const getDriverLicensePhotos = (): string[] => {
    if (!vehicle || !vehicle.driver_license) return []
    const photos: string[] = []
    if (vehicle.driver_license.driving_license_photo) photos.push(vehicle.driver_license.driving_license_photo)
    return photos
  }

  // 获取还车照片
  const getReturnPhotos = (): string[] => {
    if (!vehicle || !vehicle.return_photos) return []
    return Array.isArray(vehicle.return_photos) ? vehicle.return_photos : []
  }

  // 获取车损照片
  const getDamagePhotos = (): string[] => {
    if (!vehicle || !vehicle.damage_photos) return []
    return Array.isArray(vehicle.damage_photos) ? vehicle.damage_photos : []
  }

  // 获取提车时的车损照片（文件名包含 pickup_damage）
  const getPickupDamagePhotos = (): string[] => {
    const allDamagePhotos = getDamagePhotos()
    const pickupPhotos = allDamagePhotos.filter((url) => url.includes('pickup_damage'))
    logger.info('提车车损照片', {
      total: allDamagePhotos.length,
      pickup: pickupPhotos.length,
      photos: pickupPhotos
    })
    return pickupPhotos
  }

  // 获取还车时的车损照片（文件名包含 return_damage）
  const getReturnDamagePhotos = (): string[] => {
    const allDamagePhotos = getDamagePhotos()
    return allDamagePhotos.filter((url) => url.includes('return_damage'))
  }

  // 渲染照片网格
  const renderPhotoGrid = (photos: string[], title: string) => {
    if (photos.length === 0) return null

    return (
      <View className="mb-4">
        <Text className="text-sm font-medium text-foreground mb-2">{title}</Text>
        <View className="flex flex-wrap gap-2">
          {photos.map((photo, index) => (
            <View
              key={index}
              className="w-[calc(33.333%-0.5rem)] aspect-square rounded-lg overflow-hidden border border-border bg-gray-50"
              onClick={() => handlePreviewImage(photo, photos)}>
              <Image src={photo} mode="aspectFill" className="w-full h-full" />
            </View>
          ))}
        </View>
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
                  <View className="flex items-start">
                    <Text className="text-muted-foreground w-20 flex-shrink-0">品牌型号</Text>
                    <Text className="text-foreground flex-1">
                      {vehicle.brand} {vehicle.model}
                    </Text>
                  </View>

                  {vehicle.color && (
                    <View className="flex items-start">
                      <Text className="text-muted-foreground w-20 flex-shrink-0">颜色</Text>
                      <Text className="text-foreground flex-1">{vehicle.color}</Text>
                    </View>
                  )}

                  {vehicle.vin && (
                    <View className="flex items-start">
                      <Text className="text-muted-foreground w-20 flex-shrink-0">车架号</Text>
                      <Text className="text-foreground text-xs flex-1 break-all">{vehicle.vin}</Text>
                    </View>
                  )}

                  <View className="flex items-start">
                    <Text className="text-muted-foreground w-20 flex-shrink-0">状态</Text>
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
              <View className="flex gap-2 mb-4">
                <View
                  className={`flex-1 py-3 rounded-lg transition-all shadow-sm ${activeTab === 'pickup' ? 'bg-green-500' : 'bg-gray-100'}`}
                  onClick={() => setActiveTab('pickup')}>
                  <Text
                    className={`text-center text-sm font-bold ${activeTab === 'pickup' ? 'text-white' : 'text-gray-600'}`}>
                    提车信息
                  </Text>
                </View>
                <View
                  className={`flex-1 py-3 rounded-lg transition-all shadow-sm ${activeTab === 'return' ? 'bg-blue-500' : 'bg-gray-100'}`}
                  onClick={() => setActiveTab('return')}>
                  <Text
                    className={`text-center text-sm font-bold ${activeTab === 'return' ? 'text-white' : 'text-gray-600'}`}>
                    还车信息
                  </Text>
                </View>
                <View
                  className={`flex-1 py-3 rounded-lg transition-all shadow-sm ${activeTab === 'driver' ? 'bg-orange-500' : 'bg-gray-100'}`}
                  onClick={() => setActiveTab('driver')}>
                  <Text
                    className={`text-center text-sm font-bold ${activeTab === 'driver' ? 'text-white' : 'text-gray-600'}`}>
                    实名信息
                  </Text>
                </View>
              </View>

              {/* 提车信息 */}
              {activeTab === 'pickup' && (
                <View className="space-y-4">
                  {/* 提车时间 */}
                  <View className="bg-card rounded-lg p-4 shadow-sm">
                    <View className="flex items-center mb-3">
                      <View className="i-mdi-car-arrow-right text-xl text-green-600 mr-2"></View>
                      <Text className="text-lg font-bold text-foreground">提车信息</Text>
                    </View>

                    <View>
                      <Text className="text-muted-foreground text-sm mb-1">提车时间</Text>
                      <Text className="text-foreground">{formatDateTime(vehicle.pickup_time)}</Text>
                    </View>
                  </View>

                  {/* 车辆照片 */}
                  {getPickupPhotos().length > 0 && (
                    <View className="bg-card rounded-lg p-4 shadow-sm">
                      {renderPhotoGrid(getPickupPhotos(), '车辆照片（7个角度）')}
                    </View>
                  )}

                  {/* 行驶证照片 */}
                  {getRegistrationPhotos().length > 0 && (
                    <View className="bg-card rounded-lg p-4 shadow-sm">
                      {renderPhotoGrid(getRegistrationPhotos(), '行驶证照片')}
                    </View>
                  )}

                  {/* 提车时的车损照片 */}
                  {getPickupDamagePhotos().length > 0 && (
                    <View className="bg-card rounded-lg p-4 shadow-sm">
                      {renderPhotoGrid(getPickupDamagePhotos(), '车损特写（提车时）')}
                    </View>
                  )}

                  {/* 提示：没有照片 */}
                  {getPickupPhotos().length === 0 &&
                    getRegistrationPhotos().length === 0 &&
                    getPickupDamagePhotos().length === 0 && (
                      <View className="bg-card rounded-lg p-4 shadow-sm">
                        <View className="flex items-center justify-center py-10">
                          <Text className="text-muted-foreground">暂无提车照片</Text>
                        </View>
                      </View>
                    )}
                </View>
              )}

              {/* 还车信息 */}
              {activeTab === 'return' && (
                <View className="space-y-4">
                  {vehicle.return_time ? (
                    <View>
                      {/* 还车时间 */}
                      <View className="bg-card rounded-lg p-4 mb-4 shadow-sm">
                        <View className="flex items-center mb-3">
                          <View className="i-mdi-car-arrow-left text-xl text-orange-600 mr-2"></View>
                          <Text className="text-lg font-bold text-foreground">还车信息</Text>
                        </View>

                        <View>
                          <Text className="text-muted-foreground text-sm mb-1">还车时间</Text>
                          <Text className="text-foreground">{formatDateTime(vehicle.return_time)}</Text>
                        </View>
                      </View>

                      {/* 还车照片 */}
                      {getReturnPhotos().length > 0 && (
                        <View className="bg-card rounded-lg p-4 shadow-sm">
                          {renderPhotoGrid(getReturnPhotos(), '还车照片')}
                        </View>
                      )}

                      {/* 还车时的车损照片 */}
                      {getReturnDamagePhotos().length > 0 && (
                        <View className="bg-card rounded-lg p-4 shadow-sm">
                          {renderPhotoGrid(getReturnDamagePhotos(), '车损特写（还车时）')}
                        </View>
                      )}

                      {/* 提示：没有照片 */}
                      {getReturnPhotos().length === 0 && getReturnDamagePhotos().length === 0 && (
                        <View className="bg-card rounded-lg p-4 shadow-sm">
                          <View className="flex items-center justify-center py-10">
                            <Text className="text-muted-foreground">暂无还车照片</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View className="bg-card rounded-lg p-4 shadow-sm">
                      <View className="flex items-center justify-center py-10">
                        <Text className="text-muted-foreground">暂无还车信息</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* 实名信息 */}
              {activeTab === 'driver' && (
                <View className="space-y-4">
                  {/* 司机实名信息（合并基本信息和身份证信息） */}
                  <View className="bg-card rounded-lg p-4 shadow-sm">
                    <View className="flex items-center mb-3">
                      <View className="i-mdi-account-card text-xl text-blue-600 mr-2"></View>
                      <Text className="text-lg font-bold text-foreground">司机实名信息</Text>
                    </View>

                    {vehicle.driver || vehicle.driver_license ? (
                      <View className="space-y-2">
                        {/* 姓名 - 优先显示身份证姓名 */}
                        {(vehicle.driver_license?.id_card_name || vehicle.driver?.name) && (
                          <View className="flex items-start">
                            <Text className="text-muted-foreground w-24 flex-shrink-0">姓名</Text>
                            <Text className="text-foreground flex-1">
                              {vehicle.driver_license?.id_card_name || vehicle.driver?.name || '-'}
                            </Text>
                          </View>
                        )}

                        {/* 电话 */}
                        {vehicle.driver?.phone && (
                          <View className="flex items-start">
                            <Text className="text-muted-foreground w-24 flex-shrink-0">电话</Text>
                            <Text className="text-foreground flex-1">{vehicle.driver.phone}</Text>
                          </View>
                        )}

                        {/* 邮箱 */}
                        {vehicle.driver?.email && (
                          <View className="flex items-start">
                            <Text className="text-muted-foreground w-24 flex-shrink-0">邮箱</Text>
                            <Text className="text-foreground flex-1">{vehicle.driver.email}</Text>
                          </View>
                        )}

                        {/* 身份证号 */}
                        {vehicle.driver_license?.id_card_number && (
                          <View className="flex items-start">
                            <Text className="text-muted-foreground w-24 flex-shrink-0">身份证号</Text>
                            <Text className="text-foreground flex-1 text-xs break-all">
                              {vehicle.driver_license.id_card_number}
                            </Text>
                          </View>
                        )}

                        {/* 出生日期 */}
                        {vehicle.driver_license?.id_card_birth_date && (
                          <View className="flex items-start">
                            <Text className="text-muted-foreground w-24 flex-shrink-0">出生日期</Text>
                            <View className="flex-1">
                              <Text className="text-foreground">{vehicle.driver_license.id_card_birth_date}</Text>
                              {(() => {
                                const age = calculateAge(
                                  vehicle.driver_license?.id_card_birth_date ||
                                    vehicle.driver_license?.id_card_number ||
                                    null
                                )
                                return age !== null ? (
                                  <Text className="text-muted-foreground text-sm ml-2">（{age}岁）</Text>
                                ) : null
                              })()}
                            </View>
                          </View>
                        )}

                        {/* 地址 */}
                        {vehicle.driver_license?.id_card_address && (
                          <View className="flex items-start">
                            <Text className="text-muted-foreground w-24 flex-shrink-0">地址</Text>
                            <Text className="text-foreground flex-1">{vehicle.driver_license.id_card_address}</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View className="flex items-center justify-center py-6">
                        <Text className="text-muted-foreground">暂无司机信息</Text>
                      </View>
                    )}
                  </View>

                  {/* 驾驶证信息 */}
                  {vehicle.driver_license &&
                    (vehicle.driver_license.license_number ||
                      vehicle.driver_license.license_class ||
                      vehicle.driver_license.first_issue_date ||
                      vehicle.driver_license.valid_to ||
                      vehicle.driver_license.issue_authority) && (
                      <View className="bg-card rounded-lg p-4 shadow-sm">
                        <View className="flex items-center mb-3">
                          <View className="i-mdi-card-account-details-outline text-xl text-green-600 mr-2"></View>
                          <Text className="text-lg font-bold text-foreground">驾驶证信息</Text>
                        </View>

                        <View className="space-y-2">
                          {/* 驾驶证号 */}
                          {vehicle.driver_license.license_number && (
                            <View className="flex items-start">
                              <Text className="text-muted-foreground w-24 flex-shrink-0">驾驶证号</Text>
                              <Text className="text-foreground flex-1 text-xs break-all">
                                {vehicle.driver_license.license_number}
                              </Text>
                            </View>
                          )}

                          {/* 准驾车型 */}
                          {vehicle.driver_license.license_class && (
                            <View className="flex items-start">
                              <Text className="text-muted-foreground w-24 flex-shrink-0">准驾车型</Text>
                              <Text className="text-foreground flex-1">{vehicle.driver_license.license_class}</Text>
                            </View>
                          )}

                          {/* 初次领证日期 */}
                          {vehicle.driver_license.first_issue_date && (
                            <View className="flex items-start">
                              <Text className="text-muted-foreground w-24 flex-shrink-0">初次领证</Text>
                              <View className="flex-1">
                                <Text className="text-foreground">{vehicle.driver_license.first_issue_date}</Text>
                                {(() => {
                                  const drivingYears = calculateDrivingYears(
                                    vehicle.driver_license?.first_issue_date || null
                                  )
                                  return drivingYears !== null ? (
                                    <Text className="text-muted-foreground text-sm ml-2">（驾龄{drivingYears}年）</Text>
                                  ) : null
                                })()}
                              </View>
                            </View>
                          )}

                          {/* 有效期至 */}
                          {vehicle.driver_license.valid_to && (
                            <View className="flex items-start">
                              <Text className="text-muted-foreground w-24 flex-shrink-0">有效期至</Text>
                              <Text className="text-foreground flex-1">{vehicle.driver_license.valid_to}</Text>
                            </View>
                          )}

                          {/* 签发机关 */}
                          {vehicle.driver_license.issue_authority && (
                            <View className="flex items-start">
                              <Text className="text-muted-foreground w-24 flex-shrink-0">签发机关</Text>
                              <Text className="text-foreground flex-1">{vehicle.driver_license.issue_authority}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                  {/* 身份证照片 */}
                  {getIdCardPhotos().length > 0 && (
                    <View className="bg-card rounded-lg p-4 shadow-sm">
                      {renderPhotoGrid(getIdCardPhotos(), '身份证照片')}
                    </View>
                  )}

                  {/* 驾驶证照片 */}
                  {getDriverLicensePhotos().length > 0 && (
                    <View className="bg-card rounded-lg p-4 shadow-sm">
                      {renderPhotoGrid(getDriverLicensePhotos(), '驾驶证照片')}
                    </View>
                  )}

                  {/* 提示：没有任何信息 */}
                  {!vehicle.driver &&
                    !vehicle.driver_license &&
                    getIdCardPhotos().length === 0 &&
                    getDriverLicensePhotos().length === 0 && (
                      <View className="bg-card rounded-lg p-4 shadow-sm">
                        <View className="flex items-center justify-center py-10">
                          <Text className="text-muted-foreground">暂无司机实名信息</Text>
                        </View>
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
