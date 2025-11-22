/**
 * 超级管理员 - 用户详情页面
 * 显示用户的完整个人信息
 */

import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useRouter} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {supabase} from '@/client/supabase'
import {getDriverLicense, getDriverVehicles, getDriverWarehouses, getUserById} from '@/db/api'
import type {DriverLicense, Profile, Vehicle, Warehouse} from '@/db/types'
import {createLogger} from '@/utils/logger'

// 创建页面日志记录器
const logger = createLogger('SuperAdminUserDetail')

// Supabase Storage Bucket 名称
const BUCKET_NAME = `${process.env.TARO_APP_APP_ID}_vehicles`

// 获取图片公共URL的辅助函数
const getImageUrl = (path: string | null | undefined): string => {
  if (!path) {
    logger.warn('图片路径为空')
    return ''
  }

  logger.debug('处理图片路径', {path, pathType: typeof path, pathLength: path.length})

  // 如果已经是完整的URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    logger.debug('已经是完整URL，直接使用', {path})
    return path
  }

  // 否则从storage生成公共URL
  try {
    if (!BUCKET_NAME) {
      logger.error('Supabase bucket 未配置')
      return ''
    }

    logger.debug('从存储桶生成图片URL', {bucketName: BUCKET_NAME, relativePath: path})

    const {data} = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
    if (!data?.publicUrl) {
      logger.warn('无法获取图片公共URL', {path})
      return ''
    }

    logger.debug('图片URL生成成功', {path, url: data.publicUrl})
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
  useEffect(() => {
    logger.debug('ImageWithFallback 渲染', {
      path,
      imageUrl,
      hasUrl: !!imageUrl,
      imageError
    })
  }, [path, imageUrl, imageError])

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
        onLoad={() => {
          logger.debug('图片加载成功', {path, imageUrl})
        }}
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
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [driverLicense, setDriverLicense] = useState<DriverLicense | null>(null) // 司机证件信息

  // 计算在职天数
  const calculateWorkDays = (joinDate: string | null) => {
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

    logger.info('开始加载用户信息', {userId})
    setLoading(true)
    try {
      const data = await getUserById(userId)
      if (data) {
        setUserInfo(data)
        logger.info('用户信息加载成功', {userId, name: data.name})

        // 如果是司机，加载车辆信息和仓库信息
        if (data.role === 'driver') {
          const vehicleData = await getDriverVehicles(userId)
          setVehicles(vehicleData)
          logger.info('司机车辆信息加载成功', {userId, vehicleCount: vehicleData.length})

          const warehouseData = await getDriverWarehouses(userId)
          setWarehouses(warehouseData)
          logger.info('司机仓库信息加载成功', {userId, warehouseCount: warehouseData.length})

          // 加载司机证件信息
          const licenseData = await getDriverLicense(userId)
          setDriverLicense(licenseData)
          logger.info('司机证件信息加载成功', {
            userId,
            hasLicense: !!licenseData,
            hasIdCardFront: !!licenseData?.id_card_photo_front,
            hasIdCardBack: !!licenseData?.id_card_photo_back,
            hasDriverLicense: !!licenseData?.driving_license_photo
          })
          logger.debug('证件照片路径详情', {
            idCardFront: licenseData?.id_card_photo_front,
            idCardBack: licenseData?.id_card_photo_back,
            driverLicense: licenseData?.driving_license_photo
          })
        }
      } else {
        logger.warn('用户不存在', {userId})
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
  const getRoleText = (role: string) => {
    switch (role) {
      case 'driver':
        return '司机'
      case 'manager':
        return '管理员'
      case 'admin':
        return '超级管理员'
      default:
        return '未知'
    }
  }

  // 获取角色颜色
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'driver':
        return {bg: 'bg-blue-100', text: 'text-blue-700', icon: 'i-mdi-steering'}
      case 'manager':
        return {bg: 'bg-purple-100', text: 'text-purple-700', icon: 'i-mdi-account-tie'}
      case 'admin':
        return {bg: 'bg-red-100', text: 'text-red-700', icon: 'i-mdi-shield-crown'}
      default:
        return {bg: 'bg-gray-100', text: 'text-gray-700', icon: 'i-mdi-account'}
    }
  }

  // 编辑用户
  const handleEdit = () => {
    Taro.navigateTo({
      url: `/pages/super-admin/edit-user/index?userId=${userId}`
    })
  }

  // 查看车辆详情
  const handleViewVehicle = (vehicleId: string) => {
    Taro.navigateTo({
      url: `/pages/driver/vehicle-detail/index?id=${vehicleId}`
    })
  }

  // 拨打电话
  const handleCall = (phone: string) => {
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
  const renderImage = (path: string | null | undefined, label: string, className: string = 'w-full h-40') => {
    return <ImageWithFallback path={path} label={label} className={className} onPreview={handlePreviewImage} />
  }

  if (loading) {
    return (
      <View className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-blue-100">
        <View className="i-mdi-loading animate-spin text-5xl text-blue-600 mb-4"></View>
        <Text className="text-gray-600 font-medium">加载中...</Text>
      </View>
    )
  }

  if (!userInfo) {
    return (
      <View className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-blue-50 to-blue-100">
        <View className="bg-blue-50 rounded-full p-6 mb-4">
          <View className="i-mdi-account-off text-6xl text-blue-300"></View>
        </View>
        <Text className="text-gray-800 text-lg font-medium">用户不存在</Text>
      </View>
    )
  }

  const roleColor = getRoleColor(userInfo.role)

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4">
          {/* 司机实名认证信息 */}
          {userInfo.role === 'driver' && (
            <View className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
              <View className="flex items-center mb-4">
                <View className="i-mdi-card-account-details text-2xl text-orange-600 mr-2"></View>
                <Text className="text-lg font-bold text-gray-800">实名认证信息</Text>
              </View>

              {driverLicense ? (
                <>
                  {/* 身份证信息 */}
                  <View className="mb-6">
                    <View className="flex items-center mb-3">
                      <View className="i-mdi-card-account-details-outline text-xl text-blue-600 mr-2"></View>
                      <Text className="text-base font-bold text-gray-800">身份证信息</Text>
                    </View>

                    {/* 姓名 */}
                    {driverLicense.id_card_name && (
                      <View className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 mb-3">
                        <View className="flex items-center justify-between">
                          <View className="flex-1">
                            <Text className="text-xs text-green-600 mb-1 block">真实姓名</Text>
                            <Text className="text-base text-green-900 font-bold block">
                              {driverLicense.id_card_name}
                            </Text>
                          </View>
                          <View className="bg-green-200 rounded-full w-10 h-10 flex items-center justify-center">
                            <View className="i-mdi-account text-xl text-green-700"></View>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 电话号码 */}
                    {userInfo.phone && (
                      <View className="bg-gradient-to-r from-sky-50 to-sky-100 rounded-xl p-4 mb-3">
                        <View className="flex items-center justify-between">
                          <View className="flex-1">
                            <Text className="text-xs text-sky-600 mb-1 block">电话号码</Text>
                            <Text className="text-base text-sky-900 font-bold block tracking-wider">
                              {userInfo.phone}
                            </Text>
                          </View>
                          <View className="bg-sky-200 rounded-full w-10 h-10 flex items-center justify-center">
                            <View className="i-mdi-phone text-xl text-sky-700"></View>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 出生日期 */}
                    {driverLicense.id_card_birth_date && (
                      <View className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 mb-3">
                        <View className="flex items-center justify-between">
                          <View className="flex-1">
                            <Text className="text-xs text-purple-600 mb-1 block">出生日期</Text>
                            <Text className="text-base text-purple-900 font-medium block">
                              {new Date(driverLicense.id_card_birth_date).toLocaleDateString('zh-CN')}
                            </Text>
                          </View>
                          <View className="bg-purple-200 rounded-full w-10 h-10 flex items-center justify-center">
                            <View className="i-mdi-cake-variant text-xl text-purple-700"></View>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 身份证号码 */}
                    {driverLicense.id_card_number && (
                      <View className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 mb-3">
                        <View className="flex items-center justify-between">
                          <View className="flex-1">
                            <Text className="text-xs text-blue-600 mb-1 block">身份证号码</Text>
                            <Text className="text-base text-blue-900 font-bold block tracking-wider">
                              {driverLicense.id_card_number}
                            </Text>
                          </View>
                          <View className="bg-blue-200 rounded-full w-10 h-10 flex items-center justify-center">
                            <View className="i-mdi-identifier text-xl text-blue-700"></View>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 身份证地址 */}
                    {driverLicense.id_card_address && (
                      <View className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-4 mb-3">
                        <View className="flex items-center">
                          <View className="bg-amber-200 rounded-full w-10 h-10 flex items-center justify-center mr-3 shrink-0">
                            <View className="i-mdi-home-map-marker text-xl text-amber-700"></View>
                          </View>
                          <View className="flex-1">
                            <Text className="text-xs text-amber-600 mb-1 block">身份证地址</Text>
                            <Text className="text-sm text-amber-900 font-medium block leading-relaxed">
                              {driverLicense.id_card_address}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 签发机关 */}
                    {driverLicense.issue_authority && (
                      <View className="bg-gradient-to-r from-rose-50 to-rose-100 rounded-xl p-4 mb-3">
                        <View className="flex items-center">
                          <View className="bg-rose-200 rounded-full w-10 h-10 flex items-center justify-center mr-3 shrink-0">
                            <View className="i-mdi-shield-account text-xl text-rose-700"></View>
                          </View>
                          <View className="flex-1">
                            <Text className="text-xs text-rose-600 mb-1 block">签发机关</Text>
                            <Text className="text-sm text-rose-900 font-medium block leading-relaxed">
                              {driverLicense.issue_authority}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 身份证照片 */}
                    {(driverLicense.id_card_photo_front || driverLicense.id_card_photo_back) && (
                      <View className="mt-4">
                        <Text className="text-sm text-gray-600 mb-3 block">身份证照片</Text>
                        <View className="flex gap-3">
                          {/* 身份证正面 */}
                          {driverLicense.id_card_photo_front && (
                            <View className="flex-1">
                              {renderImage(driverLicense.id_card_photo_front, '身份证正面')}
                            </View>
                          )}

                          {/* 身份证反面 */}
                          {driverLicense.id_card_photo_back && (
                            <View className="flex-1">
                              {renderImage(driverLicense.id_card_photo_back, '身份证反面')}
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    {/* 如果没有任何身份证信息 */}
                    {!driverLicense.id_card_number &&
                      !driverLicense.id_card_name &&
                      !driverLicense.id_card_birth_date &&
                      !driverLicense.id_card_address &&
                      !driverLicense.issue_authority &&
                      !driverLicense.id_card_photo_front &&
                      !driverLicense.id_card_photo_back && (
                        <View className="bg-gray-50 rounded-xl p-6 text-center">
                          <View className="i-mdi-alert-circle-outline text-4xl text-gray-400 mb-2"></View>
                          <Text className="text-gray-500 text-sm">暂无身份证信息</Text>
                        </View>
                      )}
                  </View>

                  {/* 驾驶证信息 */}
                  <View className="border-t border-gray-200 pt-6">
                    <View className="flex items-center mb-3">
                      <View className="i-mdi-card-account-details text-xl text-orange-600 mr-2"></View>
                      <Text className="text-base font-bold text-gray-800">驾驶证信息</Text>
                    </View>

                    {/* 驾驶证号码 */}
                    {driverLicense.license_number && (
                      <View className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 mb-3">
                        <View className="flex items-center justify-between">
                          <View className="flex-1">
                            <Text className="text-xs text-orange-600 mb-1 block">驾驶证号码</Text>
                            <Text className="text-base text-orange-900 font-bold block tracking-wider">
                              {driverLicense.license_number}
                            </Text>
                          </View>
                          <View className="bg-orange-200 rounded-full w-10 h-10 flex items-center justify-center">
                            <View className="i-mdi-card-text text-xl text-orange-700"></View>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 准驾车型 */}
                    {driverLicense.license_class && (
                      <View className="bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-xl p-4 mb-3">
                        <View className="flex items-center justify-between">
                          <View className="flex-1">
                            <Text className="text-xs text-cyan-600 mb-1 block">准驾车型</Text>
                            <Text className="text-base text-cyan-900 font-bold block">
                              {driverLicense.license_class}
                            </Text>
                          </View>
                          <View className="bg-cyan-200 rounded-full w-10 h-10 flex items-center justify-center">
                            <View className="i-mdi-car-side text-xl text-cyan-700"></View>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 初次领证日期 */}
                    {driverLicense.first_issue_date && (
                      <View className="bg-gradient-to-r from-teal-50 to-teal-100 rounded-xl p-4 mb-3">
                        <View className="flex items-center justify-between">
                          <View className="flex-1">
                            <Text className="text-xs text-teal-600 mb-1 block">初次领证日期</Text>
                            <Text className="text-base text-teal-900 font-medium block">
                              {new Date(driverLicense.first_issue_date).toLocaleDateString('zh-CN')}
                            </Text>
                          </View>
                          <View className="bg-teal-200 rounded-full w-10 h-10 flex items-center justify-center">
                            <View className="i-mdi-calendar-check text-xl text-teal-700"></View>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 有效期限 */}
                    {driverLicense.valid_from && driverLicense.valid_to && (
                      <View className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl p-4 mb-3">
                        <View className="flex items-center">
                          <View className="bg-indigo-200 rounded-full w-10 h-10 flex items-center justify-center mr-3 shrink-0">
                            <View className="i-mdi-calendar-range text-xl text-indigo-700"></View>
                          </View>
                          <View className="flex-1">
                            <Text className="text-xs text-indigo-600 mb-1 block">有效期限</Text>
                            <Text className="text-sm text-indigo-900 font-medium block">
                              {new Date(driverLicense.valid_from).toLocaleDateString('zh-CN')} 至{' '}
                              {new Date(driverLicense.valid_to).toLocaleDateString('zh-CN')}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* 驾驶证照片 */}
                    {driverLicense.driving_license_photo && (
                      <View className="mt-4">
                        <Text className="text-sm text-gray-600 mb-3 block">驾驶证照片</Text>
                        {renderImage(driverLicense.driving_license_photo, '驾驶证照片')}
                      </View>
                    )}

                    {/* 如果没有任何驾驶证信息 */}
                    {!driverLicense.license_number &&
                      !driverLicense.license_class &&
                      !driverLicense.valid_from &&
                      !driverLicense.valid_to &&
                      !driverLicense.first_issue_date &&
                      !driverLicense.driving_license_photo && (
                        <View className="bg-gray-50 rounded-xl p-6 text-center">
                          <View className="i-mdi-alert-circle-outline text-4xl text-gray-400 mb-2"></View>
                          <Text className="text-gray-500 text-sm">暂无驾驶证信息</Text>
                        </View>
                      )}
                  </View>
                </>
              ) : (
                /* 如果完全没有驾驶证记录 */
                <View className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-6 border-2 border-yellow-200">
                  <View className="flex items-center justify-center mb-3">
                    <View className="bg-yellow-200 rounded-full w-16 h-16 flex items-center justify-center">
                      <View className="i-mdi-alert text-3xl text-yellow-700"></View>
                    </View>
                  </View>
                  <Text className="text-center text-yellow-800 font-medium mb-2 block">该司机尚未录入实名信息</Text>
                  <Text className="text-center text-yellow-600 text-sm block">
                    请提醒司机在个人中心完成身份证和驾驶证的实名认证
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 返回按钮 */}
          <View className="pb-6">
            <Button
              className="w-full bg-white text-gray-700 py-4 rounded-xl break-keep text-base font-medium border border-gray-200"
              size="default"
              onClick={() => Taro.navigateBack()}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-arrow-left text-lg text-gray-700 mr-2"></View>
                <Text className="text-gray-700">返回</Text>
              </View>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default UserDetail
