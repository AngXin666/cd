/**
 * 管理员查看司机个人信息页面
 * 显示司机的身份证、驾驶证信息和证件照片（只读模式）
 */

import {Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow, useRouter} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {supabase} from '@/client/supabase'
import * as UsersAPI from '@/db/api/users'
import * as VehiclesAPI from '@/db/api/vehicles'

import type {DriverLicense, Profile} from '@/db/types'
import {createLogger} from '@/utils/logger'

// 创建页面日志记录器
const logger = createLogger('DriverProfileView')

const DriverProfileView: React.FC = () => {
  const {user} = useAuth({guard: true})
  const router = useRouter()
  const driverId = router.params.driverId || ''

  const [profile, setProfile] = useState<Profile | null>(null)
  const [driverLicense, setDriverLicense] = useState<DriverLicense | null>(null)
  const [loading, setLoading] = useState(false)

  // 加载司机资料和证件信息
  const loadProfile = useCallback(async () => {
    if (!driverId) {
      Taro.showToast({
        title: '缺少司机ID',
        icon: 'none'
      })
      return
    }

    logger.pageView('司机个人信息页面', {driverId, managerId: user?.id})
    setLoading(true)
    try {
      // 加载司机资料
      const profileData = await UsersAPI.getProfileById(driverId)
      setProfile(profileData)

      // 加载驾驶证信息
      const licenseData = await VehiclesAPI.getDriverLicense(driverId)
      setDriverLicense(licenseData)
    } catch (error) {
      logger.error('加载司机资料失败', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [driverId, user?.id])

  useDidShow(() => {
    loadProfile()
  })

  // 获取图片的公开URL
  const getImageUrl = (path: string | null | undefined): string => {
    if (!path) {
      return ''
    }

    // 如果已经是完整的URL，直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }

    // 否则从storage生成公共URL
    const bucketName = `${process.env.TARO_APP_APP_ID}_vehicles`

    try {
      const {data} = supabase.storage.from(bucketName).getPublicUrl(path)
      return data.publicUrl
    } catch (error) {
      logger.error('获取图片URL失败', {path, bucketName, error})
      return ''
    }
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

  if (!profile) {
    return (
      <ScrollView scrollY className="min-h-screen bg-gray-50">
        <View className="p-6">
          <View className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <View className="i-mdi-alert-circle text-7xl text-gray-300 mx-auto mb-4" />
            <Text className="text-gray-800 text-xl font-bold block mb-2">暂无个人信息</Text>
            <Text className="text-gray-500 text-base block">该司机尚未录入个人信息</Text>
          </View>
        </View>
      </ScrollView>
    )
  }

  const age = driverLicense ? calculateAge(driverLicense.id_card_birth_date) : null
  const drivingYears = driverLicense ? calculateDrivingYears(driverLicense.first_issue_date) : null

  return (
    <ScrollView scrollY className="min-h-screen bg-gray-50">
      <View className="p-4 pb-8">
        {/* 司机头部信息卡片 */}
        <View className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 mb-4 shadow-lg">
          <View className="flex items-center">
            <View className="bg-white bg-opacity-20 rounded-full p-4 mr-4">
              <View className="i-mdi-account text-white text-4xl" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-2xl font-bold block mb-1">
                {driverLicense?.id_card_name || profile.name || '未设置姓名'}
              </Text>
              <Text className="text-blue-100 text-sm block">{profile.phone || '未设置手机号'}</Text>
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

        {/* 如果没有驾驶证信息，显示提示 */}
        {!driverLicense && (
          <View className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-4">
            <View className="flex items-center">
              <View className="i-mdi-information text-yellow-600 text-2xl mr-3" />
              <View className="flex-1">
                <Text className="text-yellow-800 text-base font-medium block mb-1">尚未录入证件信息</Text>
                <Text className="text-yellow-700 text-sm block">该司机还未录入身份证和驾驶证信息</Text>
              </View>
            </View>
          </View>
        )}

        {/* 身份证信息卡片 - 只在有驾驶证信息时显示 */}
        {driverLicense && (
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
            <View className="flex items-center mb-5 pb-4 border-b border-gray-100">
              <View className="bg-blue-50 rounded-full p-2.5 mr-3">
                <View className="i-mdi-card-account-details text-blue-600 text-2xl" />
              </View>
              <Text className="text-gray-800 text-lg font-bold">身份证信息</Text>
            </View>

            <View className="space-y-4">
              {/* 身份证号 */}
              <View className="bg-gray-50 rounded-xl p-4">
                <Text className="text-gray-500 text-xs mb-1.5 block">身份证号码</Text>
                <Text className="text-gray-900 text-base font-mono tracking-wide">
                  {driverLicense.id_card_number || '未识别'}
                </Text>
              </View>

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

              {/* 地址 */}
              <View className="bg-gray-50 rounded-xl p-4">
                <View className="flex items-start">
                  <View className="i-mdi-map-marker text-blue-500 text-xl mr-3 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-gray-500 text-xs block mb-1.5">户籍地址</Text>
                    <Text className="text-gray-900 text-sm leading-relaxed">
                      {driverLicense.id_card_address || '未识别'}
                    </Text>
                  </View>
                </View>
              </View>
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

        {/* 驾驶证信息卡片 - 只在有驾驶证信息时显示 */}
        {driverLicense && (
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <View className="flex items-center mb-5 pb-4 border-b border-gray-100">
              <View className="bg-green-50 rounded-full p-2.5 mr-3">
                <View className="i-mdi-card-account-details-outline text-green-600 text-2xl" />
              </View>
              <Text className="text-gray-800 text-lg font-bold">驾驶证信息</Text>
            </View>

            <View className="space-y-4">
              {/* 驾驶证号 */}
              <View className="bg-gray-50 rounded-xl p-4">
                <Text className="text-gray-500 text-xs mb-1.5 block">驾驶证号</Text>
                <Text className="text-gray-900 text-base font-mono tracking-wide">
                  {driverLicense.license_number || '未识别'}
                </Text>
              </View>

              {/* 准驾车型 */}
              <View className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <View className="flex items-center">
                  <View className="i-mdi-car text-green-500 text-xl mr-3" />
                  <View>
                    <Text className="text-gray-500 text-xs block mb-0.5">准驾车型</Text>
                    <Text className="text-gray-900 text-sm font-medium">{driverLicense.license_class || '未识别'}</Text>
                  </View>
                </View>
              </View>

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
              <View className="bg-gray-50 rounded-xl p-4">
                <View className="flex items-start mb-3">
                  <View className="i-mdi-clock-outline text-orange-500 text-xl mr-3 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-gray-500 text-xs block mb-2">证件有效期</Text>
                    <View className="space-y-2">
                      <View className="flex items-center">
                        <Text className="text-gray-600 text-xs mr-2">起：</Text>
                        <Text className="text-gray-900 text-sm">{driverLicense.valid_from || '未识别'}</Text>
                      </View>
                      <View className="flex items-center">
                        <Text className="text-gray-600 text-xs mr-2">至：</Text>
                        <Text className="text-gray-900 text-sm">{driverLicense.valid_to || '未识别'}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* 发证机关 */}
              <View className="bg-gray-50 rounded-xl p-4">
                <View className="flex items-start">
                  <View className="i-mdi-office-building text-purple-500 text-xl mr-3 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-gray-500 text-xs block mb-1.5">发证机关</Text>
                    <Text className="text-gray-900 text-sm leading-relaxed">
                      {driverLicense.issue_authority || '未识别'}
                    </Text>
                  </View>
                </View>
              </View>
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

        {/* 账号管理操作 - 独立卡片，始终显示 */}
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <View className="flex items-center mb-5 pb-4 border-b border-gray-100">
            <View className="bg-purple-50 rounded-full p-2.5 mr-3">
              <View className="i-mdi-account-cog text-purple-600 text-2xl" />
            </View>
            <Text className="text-gray-800 text-lg font-bold">账号管理</Text>
          </View>
          <View className="grid grid-cols-2 gap-3">
            {/* 重置密码按钮 */}
            <View
              onClick={async () => {
                const {confirm} = await Taro.showModal({
                  title: '重置密码',
                  content: `确认将用户"${profile.name || profile.phone}"的密码重置为 123456 吗？`
                })

                if (!confirm) return

                try {
                  Taro.showLoading({title: '处理中...'})
                  logger.userAction('重置密码', {driverId, operatorId: user?.id})

                  const {error} = await supabase.rpc('reset_user_password', {
                    target_user_id: driverId,
                    new_password: '123456'
                  })

                  Taro.hideLoading()

                  if (error) {
                    logger.error('重置密码失败', {error, driverId})
                    Taro.showToast({
                      title: '重置密码失败',
                      icon: 'none'
                    })
                    return
                  }

                  Taro.showToast({
                    title: '密码已重置为 123456',
                    icon: 'success'
                  })
                } catch (err) {
                  Taro.hideLoading()
                  logger.error('重置密码异常', {error: err, driverId})
                  Taro.showToast({
                    title: '操作失败',
                    icon: 'none'
                  })
                }
              }}
              className="flex items-center justify-center bg-amber-50 border border-amber-200 rounded-lg py-3 active:bg-amber-100 transition-all">
              <View className="i-mdi-lock-reset text-amber-600 text-xl mr-2" />
              <Text className="text-amber-700 text-sm font-medium">重置密码</Text>
            </View>

            {/* 提升为管理员按钮 */}
            <View
              onClick={async () => {
                const {confirm} = await Taro.showModal({
                  title: '提升为管理员',
                  content: `确认将司机"${profile.name || profile.phone}"提升为管理员吗？\n\n提升后将获得管理员权限。`
                })

                if (!confirm) return

                try {
                  Taro.showLoading({title: '处理中...'})
                  logger.userAction('提升为管理员', {driverId, operatorId: user?.id})

                  // 单用户架构：更新 user_roles 表
                  const {error} = await supabase.from('users').update({role: 'MANAGER'}).eq('id', driverId)

                  Taro.hideLoading()

                  if (error) {
                    logger.error('提升为管理员失败', {error, driverId})
                    Taro.showToast({
                      title: '操作失败',
                      icon: 'none'
                    })
                    return
                  }

                  Taro.showToast({
                    title: '已提升为管理员',
                    icon: 'success',
                    duration: 2000
                  })

                  // 延迟返回上一页
                  setTimeout(() => {
                    Taro.navigateBack()
                  }, 2000)
                } catch (err) {
                  Taro.hideLoading()
                  logger.error('提升为管理员异常', {error: err, driverId})
                  Taro.showToast({
                    title: '操作失败',
                    icon: 'none'
                  })
                }
              }}
              className="flex items-center justify-center bg-sky-50 border border-sky-200 rounded-lg py-3 active:bg-sky-100 transition-all">
              <View className="i-mdi-account-convert text-sky-600 text-xl mr-2" />
              <Text className="text-sky-700 text-sm font-medium">提升为管理员</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

export default DriverProfileView
