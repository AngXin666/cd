/**
 * 老板 - 用户详情页面
 * 显示用户的完整个人信息
 */

import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'
import * as UsersAPI from '@/db/api/users'
import * as VehiclesAPI from '@/db/api/vehicles'
import * as WarehousesAPI from '@/db/api/warehouses'

import type {DriverLicense, Profile, Vehicle, Warehouse} from '@/db/types'
import {createLogger} from '@/utils/logger'

// 创建页面日志记录器
const logger = createLogger('SuperAdminUserDetail')

// Supabase Storage Bucket 名称
const BUCKET_NAME = `${process.env.TARO_APP_APP_ID}_vehicles`

// 获取图片公共URL的辅助函数
const getImageUrl = (path: string | null | undefined): string => {
  if (!path) {
    return ''
  }

  // 如果已经是完整的URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  // 否则从storage生成公共URL
  try {
    if (!BUCKET_NAME) {
      logger.error('Supabase bucket 未配置')
      return ''
    }

    const {data} = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
    if (!data?.publicUrl) {
      return ''
    }

    return data.publicUrl
  } catch (error) {
    logger.error('获取图片URL失败', {error, path})
    return ''
  }
}

// 图片组件（带错误处理和占位符）
const ImageWithFallback: React.FC<{
  path: string | null | undefined
  label: string
  className: string
  onPreview: (url: string) => void
}> = ({path, label, className, onPreview}) => {
  const [imageError, setImageError] = useState(false)
  const imageUrl = getImageUrl(path)

  // 记录图片URL生成结果
  useEffect(() => {}, [])

  if (!imageUrl || imageError) {
    return (
      <View className={`${className} bg-gray-100 rounded-xl flex items-center justify-center`}>
        <View className="text-center">
          <View className="i-mdi-image-off text-4xl text-gray-400 mb-2"></View>
          <Text className="text-xs text-gray-400 block">{imageError ? '图片加载失败' : '暂无图片'}</Text>
        </View>
      </View>
    )
  }

  return (
    <View
      className="relative bg-gray-100 rounded-xl overflow-hidden border-2 border-blue-200 active:scale-95 transition-all"
      onClick={() => onPreview(imageUrl)}>
      <Image
        src={imageUrl}
        mode="aspectFit"
        className={className}
        onError={(e) => {
          logger.error('图片加载失败', {
            event: e,
            originalPath: path,
            generatedUrl: imageUrl
          })
          setImageError(true)
        }}
        onLoad={() => {}}
      />
      <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <Text className="text-white text-xs font-medium text-center block">{label}</Text>
      </View>
    </View>
  )
}

const UserDetail: React.FC = () => {
  const {user} = useAuth({guard: true})
  const router = useRouter()
  const userId = router.params.id || ''

  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<Profile | null>(null)
  const [_vehicles, setVehicles] = useState<Vehicle[]>([])
  const [_warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [driverLicense, setDriverLicense] = useState<DriverLicense | null>(null) // 司机证件信息

  // 计算在职天数
  const _calculateWorkDays = (joinDate: string | null) => {
    if (!joinDate) return 0
    const join = new Date(joinDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - join.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // 加载用户信息
  const loadUserInfo = useCallback(async () => {
    if (!userId) {
      Taro.showToast({
        title: '用户ID不存在',
        icon: 'error'
      })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
      return
    }

    setLoading(true)
    try {
      const data = await UsersAPI.getUserById(userId)
      if (data) {
        setUserInfo(data)

        // 如果是司机，加载车辆信息和仓库信息
        if (data.role === 'DRIVER') {
          const vehicleData = await VehiclesAPI.getDriverVehicles(userId)
          setVehicles(vehicleData)

          const warehouseData = await WarehousesAPI.getDriverWarehouses(userId)
          setWarehouses(warehouseData)

          // 加载司机证件信息
          const licenseData = await VehiclesAPI.getDriverLicense(userId)
          setDriverLicense(licenseData)
        }
      } else {
        Taro.showToast({
          title: '用户不存在',
          icon: 'error'
        })
        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      }
    } catch (error) {
      logger.error('加载用户信息失败', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadUserInfo()
  }, [loadUserInfo])

  // 获取角色显示文本
  const _getRoleText = (role: string) => {
    switch (role) {
      case 'DRIVER':
        return '司机'
      case 'MANAGER':
        return '车队长'
      case 'BOSS':
        return '老板'
      default:
        return '未知'
    }
  }

  // 获取角色颜色
  const _getRoleColor = (role: string) => {
    switch (role) {
      case 'DRIVER':
        return {bg: 'bg-blue-100', text: 'text-blue-700', icon: 'i-mdi-steering'}
      case 'MANAGER':
        return {bg: 'bg-purple-100', text: 'text-purple-700', icon: 'i-mdi-account-tie'}
      case 'admin':
        return {bg: 'bg-red-100', text: 'text-red-700', icon: 'i-mdi-shield-crown'}
      default:
        return {bg: 'bg-gray-100', text: 'text-gray-700', icon: 'i-mdi-account'}
    }
  }

  // 编辑用户
  const _handleEdit = () => {
    Taro.navigateTo({
      url: `/pages/super-admin/edit-user/index?userId=${userId}`
    })
  }

  // 查看车辆详情
  const _handleViewVehicle = (vehicleId: string) => {
    Taro.navigateTo({
      url: `/pages/driver/vehicle-detail/index?id=${vehicleId}`
    })
  }

  // 拨打电话
  const _handleCall = (phone: string) => {
    Taro.makePhoneCall({
      phoneNumber: phone
    })
  }

  // 预览图片
  const handlePreviewImage = (url: string) => {
    if (!url) {
      Taro.showToast({
        title: '图片不存在',
        icon: 'none'
      })
      return
    }

    try {
      Taro.previewImage({
        urls: [url],
        current: url
      }).catch((error) => {
        logger.error('预览图片失败', {error, url})
        Taro.showToast({
          title: '预览图片失败',
          icon: 'none'
        })
      })
    } catch (error) {
      logger.error('预览图片异常', {error, url})
      Taro.showToast({
        title: '预览图片失败',
        icon: 'none'
      })
    }
  }

  // 渲染图片组件（带错误处理）
  const _renderImage = (path: string | null | undefined, label: string, className: string = 'w-full h-40') => {
    return <ImageWithFallback path={path} label={label} className={className} onPreview={handlePreviewImage} />
  }

  // 计算年龄
  const calculateAge = (birthDate: string | null | undefined): number | null => {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // 计算驾龄
  const calculateDrivingYears = (firstIssueDate: string | null | undefined): number | null => {
    if (!firstIssueDate) return null
    const issueDate = new Date(firstIssueDate)
    const today = new Date()
    let years = today.getFullYear() - issueDate.getFullYear()
    const monthDiff = today.getMonth() - issueDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < issueDate.getDate())) {
      years--
    }
    return years
  }

  if (loading) {
    return (
      <View className="flex items-center justify-center min-h-screen bg-gray-50">
        <View className="i-mdi-loading animate-spin text-5xl text-blue-500" />
        <Text className="text-gray-600 mt-4 text-base">加载中...</Text>
      </View>
    )
  }

  if (!userInfo) {
    return (
      <ScrollView scrollY className="min-h-screen bg-gray-50">
        <View className="p-6">
          <View className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <View className="i-mdi-alert-circle text-7xl text-gray-300 mx-auto mb-4" />
            <Text className="text-gray-800 text-xl font-bold block mb-2">用户不存在</Text>
            <Text className="text-gray-500 text-base block">无法找到该用户信息</Text>
          </View>
        </View>
      </ScrollView>
    )
  }

  // 计算年龄和驾龄
  const age = calculateAge(driverLicense?.id_card_birth_date)
  const drivingYears = calculateDrivingYears(driverLicense?.first_issue_date)

  return (
    <ScrollView scrollY className="min-h-screen bg-gray-50">
      <View className="p-4 pb-8">
        {/* 司机头部信息卡片 */}
        {userInfo.role === 'DRIVER' && driverLicense && (
          <View className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex items-center">
              <View className="bg-white bg-opacity-20 rounded-full p-4 mr-4">
                <View className="i-mdi-account text-white text-4xl" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-2xl font-bold block mb-1">
                  {driverLicense.id_card_name || '未识别'}
                </Text>
                <Text className="text-blue-100 text-sm block">{userInfo.phone || '未设置手机号'}</Text>
              </View>
            </View>
            {age !== null && (
              <View className="mt-4 pt-4 border-t border-white border-opacity-20 flex items-center justify-between">
                <View className="flex items-center">
                  <View className="i-mdi-cake-variant text-white text-xl mr-2" />
                  <Text className="text-white text-sm">{age} 岁</Text>
                </View>
                {drivingYears !== null && (
                  <View className="flex items-center">
                    <View className="i-mdi-steering text-white text-xl mr-2" />
                    <Text className="text-white text-sm">驾龄 {drivingYears} 年</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* 身份证信息卡片 */}
        {userInfo.role === 'DRIVER' && driverLicense && (
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
            <View className="flex items-center mb-5 pb-4 border-b border-gray-100">
              <View className="bg-blue-50 rounded-full p-2.5 mr-3">
                <View className="i-mdi-card-account-details text-blue-600 text-2xl" />
              </View>
              <Text className="text-gray-800 text-lg font-bold">身份证信息</Text>
            </View>

            <View className="space-y-4">
              {/* 姓名 */}
              {driverLicense.id_card_name && (
                <View className="bg-gray-50 rounded-xl p-4">
                  <Text className="text-gray-500 text-xs mb-1.5 block">真实姓名</Text>
                  <Text className="text-gray-900 text-base font-medium">{driverLicense.id_card_name}</Text>
                </View>
              )}

              {/* 电话号码 */}
              {userInfo.phone && (
                <View className="bg-gray-50 rounded-xl p-4">
                  <Text className="text-gray-500 text-xs mb-1.5 block">电话号码</Text>
                  <Text className="text-gray-900 text-base font-mono tracking-wide">{userInfo.phone}</Text>
                </View>
              )}

              {/* 出生日期 */}
              {driverLicense.id_card_birth_date && (
                <View className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                  <View className="flex items-center">
                    <View className="i-mdi-calendar text-blue-500 text-xl mr-3" />
                    <View>
                      <Text className="text-gray-500 text-xs block mb-0.5">出生日期</Text>
                      <Text className="text-gray-900 text-sm font-medium">{driverLicense.id_card_birth_date}</Text>
                    </View>
                  </View>
                  {age !== null && (
                    <View className="bg-blue-100 px-3 py-1.5 rounded-full">
                      <Text className="text-blue-700 text-xs font-medium">{age} 岁</Text>
                    </View>
                  )}
                </View>
              )}

              {/* 身份证号 */}
              {driverLicense.id_card_number && (
                <View className="bg-gray-50 rounded-xl p-4">
                  <Text className="text-gray-500 text-xs mb-1.5 block">身份证号码</Text>
                  <Text className="text-gray-900 text-base font-mono tracking-wide">
                    {driverLicense.id_card_number}
                  </Text>
                </View>
              )}

              {/* 地址 */}
              {driverLicense.id_card_address && (
                <View className="bg-gray-50 rounded-xl p-4">
                  <View className="flex items-start">
                    <View className="i-mdi-map-marker text-blue-500 text-xl mr-3 mt-0.5" />
                    <View className="flex-1">
                      <Text className="text-gray-500 text-xs block mb-1.5">户籍地址</Text>
                      <Text className="text-gray-900 text-sm leading-relaxed">{driverLicense.id_card_address}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 签发机关 */}
              {driverLicense.issue_authority && (
                <View className="bg-gray-50 rounded-xl p-4">
                  <View className="flex items-start">
                    <View className="i-mdi-office-building text-blue-500 text-xl mr-3 mt-0.5" />
                    <View className="flex-1">
                      <Text className="text-gray-500 text-xs block mb-1.5">签发机关</Text>
                      <Text className="text-gray-900 text-sm leading-relaxed">{driverLicense.issue_authority}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* 身份证照片 */}
            {(driverLicense.id_card_photo_front || driverLicense.id_card_photo_back) && (
              <View className="mt-5 pt-5 border-t border-gray-100">
                <Text className="text-gray-700 text-base font-medium mb-4 block">证件照片</Text>
                <View className="grid grid-cols-2 gap-3">
                  {/* 身份证正面 */}
                  {driverLicense.id_card_photo_front && (
                    <View>
                      <View className="bg-blue-50 px-2 py-1 rounded-t-lg">
                        <Text className="text-blue-700 text-xs font-medium text-center">正面</Text>
                      </View>
                      <Image
                        src={getImageUrl(driverLicense.id_card_photo_front)}
                        mode="aspectFit"
                        className="w-full h-40 bg-gray-100 rounded-b-lg border border-gray-200"
                        onClick={() => {
                          Taro.previewImage({
                            urls: [getImageUrl(driverLicense.id_card_photo_front!)],
                            current: getImageUrl(driverLicense.id_card_photo_front!)
                          })
                        }}
                      />
                    </View>
                  )}
                  {/* 身份证背面 */}
                  {driverLicense.id_card_photo_back && (
                    <View>
                      <View className="bg-green-50 px-2 py-1 rounded-t-lg">
                        <Text className="text-green-700 text-xs font-medium text-center">背面</Text>
                      </View>
                      <Image
                        src={getImageUrl(driverLicense.id_card_photo_back)}
                        mode="aspectFit"
                        className="w-full h-40 bg-gray-100 rounded-b-lg border border-gray-200"
                        onClick={() => {
                          Taro.previewImage({
                            urls: [getImageUrl(driverLicense.id_card_photo_back!)],
                            current: getImageUrl(driverLicense.id_card_photo_back!)
                          })
                        }}
                      />
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* 驾驶证信息卡片 */}
        {userInfo.role === 'DRIVER' && driverLicense && (
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <View className="flex items-center mb-5 pb-4 border-b border-gray-100">
              <View className="bg-green-50 rounded-full p-2.5 mr-3">
                <View className="i-mdi-card-account-details-outline text-green-600 text-2xl" />
              </View>
              <Text className="text-gray-800 text-lg font-bold">驾驶证信息</Text>
            </View>

            <View className="space-y-4">
              {/* 驾驶证号 */}
              {driverLicense.license_number && (
                <View className="bg-gray-50 rounded-xl p-4">
                  <Text className="text-gray-500 text-xs mb-1.5 block">驾驶证号</Text>
                  <Text className="text-gray-900 text-base font-mono tracking-wide">
                    {driverLicense.license_number}
                  </Text>
                </View>
              )}

              {/* 准驾车型 */}
              {driverLicense.license_class && (
                <View className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                  <View className="flex items-center">
                    <View className="i-mdi-car text-green-500 text-xl mr-3" />
                    <View>
                      <Text className="text-gray-500 text-xs block mb-0.5">准驾车型</Text>
                      <Text className="text-gray-900 text-sm font-medium">{driverLicense.license_class}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 初次领证日期 */}
              {driverLicense.first_issue_date && (
                <View className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                  <View className="flex items-center">
                    <View className="i-mdi-calendar-check text-green-500 text-xl mr-3" />
                    <View>
                      <Text className="text-gray-500 text-xs block mb-0.5">初次领证日期</Text>
                      <Text className="text-gray-900 text-sm font-medium">{driverLicense.first_issue_date}</Text>
                    </View>
                  </View>
                  {drivingYears !== null && (
                    <View className="bg-green-100 px-3 py-1.5 rounded-full">
                      <Text className="text-green-700 text-xs font-medium">驾龄 {drivingYears} 年</Text>
                    </View>
                  )}
                </View>
              )}

              {/* 有效期 */}
              {driverLicense.valid_from && driverLicense.valid_to && (
                <View className="bg-gray-50 rounded-xl p-4">
                  <View className="flex items-start mb-3">
                    <View className="i-mdi-clock-outline text-orange-500 text-xl mr-3 mt-0.5" />
                    <View className="flex-1">
                      <Text className="text-gray-500 text-xs block mb-2">证件有效期</Text>
                      <View className="space-y-2">
                        <View className="flex items-center">
                          <Text className="text-gray-600 text-xs mr-2">起：</Text>
                          <Text className="text-gray-900 text-sm">{driverLicense.valid_from}</Text>
                        </View>
                        <View className="flex items-center">
                          <Text className="text-gray-600 text-xs mr-2">至：</Text>
                          <Text className="text-gray-900 text-sm">{driverLicense.valid_to}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* 驾驶证照片 */}
            {driverLicense.driving_license_photo && (
              <View className="mt-5 pt-5 border-t border-gray-100">
                <Text className="text-gray-700 text-base font-medium mb-4 block">驾驶证照片</Text>
                <View className="bg-purple-50 px-2 py-1 rounded-t-lg">
                  <Text className="text-purple-700 text-xs font-medium text-center">驾驶证</Text>
                </View>
                <Image
                  src={getImageUrl(driverLicense.driving_license_photo)}
                  mode="aspectFit"
                  className="w-full h-48 bg-gray-100 rounded-b-lg border border-gray-200"
                  onClick={() => {
                    Taro.previewImage({
                      urls: [getImageUrl(driverLicense.driving_license_photo!)],
                      current: getImageUrl(driverLicense.driving_license_photo!)
                    })
                  }}
                />
              </View>
            )}
          </View>
        )}

        {/* 如果司机没有实名认证信息 */}
        {userInfo.role === 'DRIVER' && !driverLicense && (
          <View className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 mb-4">
            <View className="i-mdi-alert-circle text-7xl text-gray-300 mx-auto mb-4" />
            <Text className="text-gray-800 text-xl font-bold block mb-2">暂无实名认证信息</Text>
            <Text className="text-gray-500 text-base block">该司机尚未录入实名认证信息</Text>
          </View>
        )}

        {/* 用户车辆信息 */}
        {userInfo.role === 'DRIVER' && _vehicles.length > 0 && (
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <View className="flex items-center mb-5 pb-4 border-b border-gray-100">
              <View className="bg-purple-50 rounded-full p-2.5 mr-3">
                <View className="i-mdi-car-multiple text-purple-600 text-2xl" />
              </View>
              <Text className="text-gray-800 text-lg font-bold">车辆信息</Text>
            </View>

            <View className="space-y-3">
              {_vehicles.map((vehicle, index) => (
                <View key={vehicle.id} className="bg-gray-50 rounded-xl p-4">
                  <View className="flex items-center justify-between mb-2">
                    <Text className="text-gray-900 text-base font-bold">{vehicle.plate_number}</Text>
                    <View className="bg-purple-100 px-3 py-1 rounded-full">
                      <Text className="text-purple-700 text-xs font-medium">车辆 {index + 1}</Text>
                    </View>
                  </View>
                  {vehicle.model && <Text className="text-gray-600 text-sm">车型：{vehicle.model}</Text>}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 用户仓库信息 */}
        {userInfo.role === 'MANAGER' && _warehouses.length > 0 && (
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <View className="flex items-center mb-5 pb-4 border-b border-gray-100">
              <View className="bg-orange-50 rounded-full p-2.5 mr-3">
                <View className="i-mdi-warehouse text-orange-600 text-2xl" />
              </View>
              <Text className="text-gray-800 text-lg font-bold">管理仓库</Text>
            </View>

            <View className="space-y-3">
              {_warehouses.map((warehouse, index) => (
                <View key={warehouse.id} className="bg-gray-50 rounded-xl p-4">
                  <View className="flex items-center justify-between">
                    <Text className="text-gray-900 text-base font-bold">{warehouse.name}</Text>
                    <View className="bg-orange-100 px-3 py-1 rounded-full">
                      <Text className="text-orange-700 text-xs font-medium">仓库 {index + 1}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

export default UserDetail
