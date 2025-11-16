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
          logger.info('司机证件信息加载成功', {userId, hasLicense: !!licenseData})
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

  // 获取图片公共URL
  const getImageUrl = (path: string | null | undefined): string => {
    if (!path) {
      logger.warn('图片路径为空')
      return ''
    }

    try {
      if (!BUCKET_NAME) {
        logger.error('Supabase bucket 未配置')
        return ''
      }

      const {data} = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
      if (!data?.publicUrl) {
        logger.warn('无法获取图片公共URL', {path})
        return ''
      }

      return data.publicUrl
    } catch (error) {
      logger.error('获取图片URL失败', {error, path})
      return ''
    }
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
    const imageUrl = getImageUrl(path)
    if (!imageUrl) {
      return (
        <View className={`${className} bg-gray-100 rounded-xl flex items-center justify-center`}>
          <View className="text-center">
            <View className="i-mdi-image-off text-4xl text-gray-400 mb-2"></View>
            <Text className="text-xs text-gray-400 block">暂无图片</Text>
          </View>
        </View>
      )
    }

    return (
      <View
        className="relative bg-gray-100 rounded-xl overflow-hidden border-2 border-blue-200 active:scale-95 transition-all"
        onClick={() => handlePreviewImage(imageUrl)}>
        <Image src={imageUrl} mode="aspectFit" className={className} onError={() => logger.error('图片加载失败', {path})} />
        <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <Text className="text-white text-xs font-medium text-center block">{label}</Text>
        </View>
      </View>
    )
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
          {/* 用户头像和基本信息卡片 */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex flex-col items-center mb-6">
              {/* 头像 */}
              {userInfo.avatar_url ? (
                <Image src={userInfo.avatar_url} mode="aspectFill" className="w-24 h-24 rounded-full mb-4" />
              ) : (
                <View className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-4">
                  <View className="i-mdi-account text-5xl text-white"></View>
                </View>
              )}

              {/* 姓名 */}
              <Text className="text-2xl font-bold text-gray-800 mb-2">{userInfo.name || '未设置姓名'}</Text>

              {/* 角色标签 */}
              <View className={`${roleColor.bg} rounded-full px-4 py-1.5 flex items-center`}>
                <View className={`${roleColor.icon} text-base ${roleColor.text} mr-1`}></View>
                <Text className={`text-sm font-medium ${roleColor.text}`}>{getRoleText(userInfo.role)}</Text>
              </View>
            </View>

            {/* 联系方式 */}
            <View className="space-y-3">
              {/* 手机号 */}
              {userInfo.phone && (
                <View className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4">
                  <View className="flex items-center flex-1">
                    <View className="bg-blue-200 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                      <View className="i-mdi-phone text-xl text-blue-700"></View>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-blue-600 mb-1 block">手机号码</Text>
                      <Text className="text-sm text-blue-900 font-medium block">{userInfo.phone}</Text>
                    </View>
                  </View>
                  <View
                    className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center active:scale-95 transition-all"
                    onClick={() => handleCall(userInfo.phone!)}>
                    <View className="i-mdi-phone-outgoing text-xl text-white"></View>
                  </View>
                </View>
              )}

              {/* 邮箱 */}
              {userInfo.email && (
                <View className="flex items-center bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4">
                  <View className="bg-purple-200 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                    <View className="i-mdi-email text-xl text-purple-700"></View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-purple-600 mb-1 block">电子邮箱</Text>
                    <Text className="text-sm text-purple-900 font-medium block">{userInfo.email}</Text>
                  </View>
                </View>
              )}

              {/* 登录账号 */}
              {userInfo.login_account && (
                <View className="flex items-center bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4">
                  <View className="bg-green-200 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                    <View className="i-mdi-account-key text-xl text-green-700"></View>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-green-600 mb-1 block">登录账号</Text>
                    <Text className="text-sm text-green-900 font-medium block">{userInfo.login_account}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* 详细信息卡片 */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex items-center mb-4">
              <View className="i-mdi-information text-2xl text-blue-600 mr-2"></View>
              <Text className="text-lg font-bold text-gray-800">详细信息</Text>
            </View>

            <View className="space-y-3">
              {/* 入职日期 */}
              {userInfo.join_date && (
                <View className="flex items-center justify-between py-3 border-b border-gray-100">
                  <Text className="text-sm text-gray-600">入职日期</Text>
                  <Text className="text-sm text-gray-800 font-medium">{userInfo.join_date}</Text>
                </View>
              )}

              {/* 在职天数 */}
              {userInfo.join_date && (
                <View className="flex items-center justify-between py-3 border-b border-gray-100">
                  <Text className="text-sm text-gray-600">在职天数</Text>
                  <View className="flex items-center">
                    <View className="i-mdi-calendar-clock text-base text-blue-600 mr-1"></View>
                    <Text className="text-sm text-blue-600 font-bold">{calculateWorkDays(userInfo.join_date)}</Text>
                    <Text className="text-xs text-gray-500 ml-1">天</Text>
                  </View>
                </View>
              )}

              {/* 注册时间 */}
              <View className="flex items-center justify-between py-3 border-b border-gray-100">
                <Text className="text-sm text-gray-600">注册时间</Text>
                <Text className="text-sm text-gray-800 font-medium">
                  {new Date(userInfo.created_at).toLocaleString('zh-CN')}
                </Text>
              </View>

              {/* 更新时间 */}
              <View className="flex items-center justify-between py-3">
                <Text className="text-sm text-gray-600">更新时间</Text>
                <Text className="text-sm text-gray-800 font-medium">
                  {new Date(userInfo.updated_at).toLocaleString('zh-CN')}
                </Text>
              </View>
            </View>
          </View>

          {/* 司机证件信息卡片（仅司机显示） */}
          {userInfo.role === 'driver' && driverLicense && (
            <View className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
              <View className="flex items-center mb-4">
                <View className="i-mdi-card-account-details text-2xl text-orange-600 mr-2"></View>
                <Text className="text-lg font-bold text-gray-800">实名认证信息</Text>
              </View>

              {/* 身份证信息 */}
              <View className="mb-6">
                <View className="flex items-center mb-3">
                  <View className="i-mdi-card-account-details-outline text-xl text-blue-600 mr-2"></View>
                  <Text className="text-base font-bold text-gray-800">身份证信息</Text>
                </View>

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

                {/* 姓名 */}
                {driverLicense.id_card_name && (
                  <View className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 mb-3">
                    <View className="flex items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-xs text-green-600 mb-1 block">真实姓名</Text>
                        <Text className="text-base text-green-900 font-bold block">{driverLicense.id_card_name}</Text>
                      </View>
                      <View className="bg-green-200 rounded-full w-10 h-10 flex items-center justify-center">
                        <View className="i-mdi-account text-xl text-green-700"></View>
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

                {/* 住址 */}
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

                {/* 身份证照片 */}
                <View className="mt-4">
                  <Text className="text-sm text-gray-600 mb-3 block">身份证照片</Text>
                  <View className="flex gap-3">
                    {/* 身份证正面 */}
                    <View className="flex-1">{renderImage(driverLicense?.id_card_photo_front, '身份证正面')}</View>

                    {/* 身份证反面 */}
                    <View className="flex-1">{renderImage(driverLicense?.id_card_photo_back, '身份证反面')}</View>
                  </View>
                </View>
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
                        <Text className="text-base text-cyan-900 font-bold block">{driverLicense.license_class}</Text>
                      </View>
                      <View className="bg-cyan-200 rounded-full w-10 h-10 flex items-center justify-center">
                        <View className="i-mdi-car-side text-xl text-cyan-700"></View>
                      </View>
                    </View>
                  </View>
                )}

                {/* 有效期 */}
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

                {/* 发证机关 */}
                {driverLicense.issue_authority && (
                  <View className="bg-gradient-to-r from-rose-50 to-rose-100 rounded-xl p-4 mb-3">
                    <View className="flex items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-xs text-rose-600 mb-1 block">发证机关</Text>
                        <Text className="text-base text-rose-900 font-medium block">
                          {driverLicense.issue_authority}
                        </Text>
                      </View>
                      <View className="bg-rose-200 rounded-full w-10 h-10 flex items-center justify-center">
                        <View className="i-mdi-office-building text-xl text-rose-700"></View>
                      </View>
                    </View>
                  </View>
                )}

                {/* 驾驶证照片 */}
                <View className="mt-4">
                  <Text className="text-sm text-gray-600 mb-3 block">驾驶证照片</Text>
                  {renderImage(driverLicense?.driving_license_photo, '点击查看大图', 'w-full h-48')}
                </View>
              </View>
            </View>
          )}

          {/* 车辆信息卡片（仅司机显示） */}
          {userInfo.role === 'driver' && (
            <View className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
              <View className="flex items-center justify-between mb-4">
                <View className="flex items-center">
                  <View className="i-mdi-car text-2xl text-blue-600 mr-2"></View>
                  <Text className="text-lg font-bold text-gray-800">车辆信息</Text>
                </View>
                <View className="bg-blue-100 rounded-full px-3 py-1">
                  <Text className="text-xs text-blue-700 font-medium">{vehicles.length} 辆</Text>
                </View>
              </View>

              {vehicles.length === 0 ? (
                <View className="flex flex-col items-center justify-center py-8">
                  <View className="bg-gray-50 rounded-full p-4 mb-3">
                    <View className="i-mdi-car-off text-4xl text-gray-300"></View>
                  </View>
                  <Text className="text-gray-500 text-sm">暂无车辆信息</Text>
                </View>
              ) : (
                <View className="space-y-3">
                  {vehicles.map((vehicle) => (
                    <View
                      key={vehicle.id}
                      className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 active:scale-98 transition-all"
                      onClick={() => handleViewVehicle(vehicle.id)}>
                      <View className="flex items-center justify-between">
                        <View className="flex-1">
                          <View className="flex items-center mb-2">
                            <View className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg px-3 py-1 mr-2">
                              <Text className="text-white text-base font-bold">{vehicle.plate_number}</Text>
                            </View>
                            {vehicle.status === 'active' && (
                              <View className="bg-green-100 rounded-full px-2 py-0.5">
                                <Text className="text-xs text-green-600 font-medium">使用中</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-sm text-blue-900 font-medium block">
                            {vehicle.brand} {vehicle.model}
                          </Text>
                          {vehicle.color && <Text className="text-xs text-blue-700 block mt-1">{vehicle.color}</Text>}
                        </View>
                        <View className="i-mdi-chevron-right text-2xl text-blue-400"></View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 仓库信息卡片（仅司机显示） */}
          {userInfo.role === 'driver' && (
            <View className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
              <View className="flex items-center justify-between mb-4">
                <View className="flex items-center">
                  <View className="i-mdi-warehouse text-2xl text-purple-600 mr-2"></View>
                  <Text className="text-lg font-bold text-gray-800">分配仓库</Text>
                </View>
                <View className="bg-purple-100 rounded-full px-3 py-1">
                  <Text className="text-xs text-purple-700 font-medium">{warehouses.length} 个</Text>
                </View>
              </View>

              {warehouses.length === 0 ? (
                <View className="flex flex-col items-center justify-center py-8">
                  <View className="bg-gray-50 rounded-full p-4 mb-3">
                    <View className="i-mdi-warehouse-off text-4xl text-gray-300"></View>
                  </View>
                  <Text className="text-gray-500 text-sm">暂未分配仓库</Text>
                </View>
              ) : (
                <View className="space-y-3">
                  {warehouses.map((warehouse) => (
                    <View key={warehouse.id} className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4">
                      <View className="flex items-center justify-between">
                        <View className="flex-1">
                          <View className="flex items-center mb-2">
                            <View className="i-mdi-warehouse text-lg text-purple-600 mr-2"></View>
                            <Text className="text-base text-purple-900 font-bold">{warehouse.name}</Text>
                          </View>
                          {warehouse.address && (
                            <View className="flex items-center">
                              <View className="i-mdi-map-marker text-sm text-purple-600 mr-1"></View>
                              <Text className="text-xs text-purple-700 block">{warehouse.address}</Text>
                            </View>
                          )}
                          {warehouse.status && (
                            <View className="flex items-center mt-2">
                              <View
                                className={`rounded-full px-2 py-0.5 ${
                                  warehouse.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                <Text
                                  className={`text-xs font-medium ${
                                    warehouse.status === 'active' ? 'text-green-600' : 'text-gray-600'
                                  }`}>
                                  {warehouse.status === 'active' ? '使用中' : '已停用'}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 操作按钮 */}
          <View className="space-y-3 pb-6">
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl break-keep text-base font-medium"
              size="default"
              onClick={handleEdit}>
              <View className="flex items-center justify-center">
                <View className="i-mdi-pencil text-lg text-white mr-2"></View>
                <Text className="text-white">编辑用户信息</Text>
              </View>
            </Button>

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
