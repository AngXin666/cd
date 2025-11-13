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
import {getDriverLicense, getProfileById} from '@/db/api'
import type {DriverLicense, Profile} from '@/db/types'

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

    setLoading(true)
    try {
      // 加载司机资料
      const profileData = await getProfileById(driverId)
      console.log('👤 司机资料数据:', profileData)
      setProfile(profileData)

      // 加载驾驶证信息
      const licenseData = await getDriverLicense(driverId)
      console.log('📋 驾驶证信息:', licenseData)
      setDriverLicense(licenseData)
    } catch (error) {
      console.error('❌ 加载司机资料失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [driverId])

  useDidShow(() => {
    loadProfile()
  })

  // 获取图片的公开URL
  const getImageUrl = (path: string | null | undefined): string => {
    if (!path) return ''
    const bucketName = process.env.TARO_APP_APP_ID || ''
    const {data} = supabase.storage.from(bucketName).getPublicUrl(path)
    return data.publicUrl
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
      <View className="flex items-center justify-center min-h-screen bg-background">
        <View className="i-mdi-loading animate-spin text-4xl text-primary" />
        <Text className="text-muted-foreground mt-4">加载中...</Text>
      </View>
    )
  }

  if (!driverLicense) {
    return (
      <ScrollView scrollY className="min-h-screen bg-background">
        <View className="p-6">
          <View className="bg-card rounded-xl p-8 text-center shadow-sm">
            <View className="i-mdi-alert-circle text-6xl text-muted-foreground mx-auto mb-4" />
            <Text className="text-foreground text-lg font-medium block mb-2">暂无个人信息</Text>
            <Text className="text-muted-foreground text-sm block">该司机尚未录入个人信息</Text>
          </View>
        </View>
      </ScrollView>
    )
  }

  const age = calculateAge(driverLicense.id_card_birth_date)
  const drivingYears = calculateDrivingYears(driverLicense.first_issue_date)

  return (
    <ScrollView scrollY className="min-h-screen bg-background">
      <View className="p-4 pb-8">
        {/* 司机基本信息 */}
        <View className="bg-card rounded-xl p-5 mb-4 shadow-sm">
          <View className="flex items-center mb-4">
            <View className="i-mdi-account-circle text-primary text-3xl mr-3" />
            <Text className="text-foreground text-xl font-bold">司机信息</Text>
          </View>
          <View className="space-y-3">
            <View className="flex justify-between py-2 border-b border-border">
              <Text className="text-muted-foreground text-sm">姓名</Text>
              <Text className="text-foreground text-sm font-medium">
                {profile?.name || driverLicense.id_card_name || '未设置'}
              </Text>
            </View>
            <View className="flex justify-between py-2 border-b border-border">
              <Text className="text-muted-foreground text-sm">手机号</Text>
              <Text className="text-foreground text-sm font-medium">{profile?.phone || '未设置'}</Text>
            </View>
            <View className="flex justify-between py-2">
              <Text className="text-muted-foreground text-sm">邮箱</Text>
              <Text className="text-foreground text-sm font-medium">{profile?.email || '未设置'}</Text>
            </View>
          </View>
        </View>

        {/* 身份证信息 */}
        <View className="bg-card rounded-xl p-5 mb-4 shadow-sm">
          <View className="flex items-center mb-4">
            <View className="i-mdi-card-account-details text-primary text-3xl mr-3" />
            <Text className="text-foreground text-xl font-bold">身份证信息</Text>
          </View>
          <View className="space-y-3">
            <View className="flex justify-between py-2 border-b border-border">
              <Text className="text-muted-foreground text-sm">姓名</Text>
              <Text className="text-foreground text-sm font-medium">{driverLicense.id_card_name || '未识别'}</Text>
            </View>
            <View className="flex justify-between py-2 border-b border-border">
              <Text className="text-muted-foreground text-sm">身份证号</Text>
              <Text className="text-foreground text-sm font-medium">{driverLicense.id_card_number || '未识别'}</Text>
            </View>
            {driverLicense.id_card_birth_date && (
              <View className="flex justify-between py-2 border-b border-border">
                <Text className="text-muted-foreground text-sm">出生日期</Text>
                <Text className="text-foreground text-sm font-medium">
                  {driverLicense.id_card_birth_date}
                  {age !== null && <Text className="text-muted-foreground ml-2">({age}岁)</Text>}
                </Text>
              </View>
            )}
            <View className="flex justify-between py-2">
              <Text className="text-muted-foreground text-sm">地址</Text>
              <Text className="text-foreground text-sm font-medium text-right flex-1 ml-4">
                {driverLicense.id_card_address || '未识别'}
              </Text>
            </View>
          </View>

          {/* 身份证照片 */}
          <View className="mt-4">
            <Text className="text-foreground text-base font-medium mb-3 block">身份证照片</Text>
            <View className="space-y-3">
              {/* 身份证正面 */}
              {driverLicense.id_card_photo_front && (
                <View>
                  <Text className="text-muted-foreground text-sm mb-2 block">正面</Text>
                  <Image
                    src={getImageUrl(driverLicense.id_card_photo_front)}
                    mode="aspectFit"
                    className="w-full h-48 bg-muted rounded-lg"
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
                  <Text className="text-muted-foreground text-sm mb-2 block">背面</Text>
                  <Image
                    src={getImageUrl(driverLicense.id_card_photo_back)}
                    mode="aspectFit"
                    className="w-full h-48 bg-muted rounded-lg"
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
        </View>

        {/* 驾驶证信息 */}
        <View className="bg-card rounded-xl p-5 shadow-sm">
          <View className="flex items-center mb-4">
            <View className="i-mdi-card-account-details-outline text-primary text-3xl mr-3" />
            <Text className="text-foreground text-xl font-bold">驾驶证信息</Text>
          </View>
          <View className="space-y-3">
            <View className="flex justify-between py-2 border-b border-border">
              <Text className="text-muted-foreground text-sm">驾驶证号</Text>
              <Text className="text-foreground text-sm font-medium">{driverLicense.license_number || '未识别'}</Text>
            </View>
            <View className="flex justify-between py-2 border-b border-border">
              <Text className="text-muted-foreground text-sm">准驾车型</Text>
              <Text className="text-foreground text-sm font-medium">{driverLicense.license_class || '未识别'}</Text>
            </View>
            {driverLicense.first_issue_date && (
              <View className="flex justify-between py-2 border-b border-border">
                <Text className="text-muted-foreground text-sm">初次领证日期</Text>
                <Text className="text-foreground text-sm font-medium">
                  {driverLicense.first_issue_date}
                  {drivingYears !== null && <Text className="text-muted-foreground ml-2">(驾龄{drivingYears}年)</Text>}
                </Text>
              </View>
            )}
            <View className="flex justify-between py-2 border-b border-border">
              <Text className="text-muted-foreground text-sm">有效期起</Text>
              <Text className="text-foreground text-sm font-medium">{driverLicense.valid_from || '未识别'}</Text>
            </View>
            <View className="flex justify-between py-2 border-b border-border">
              <Text className="text-muted-foreground text-sm">有效期至</Text>
              <Text className="text-foreground text-sm font-medium">{driverLicense.valid_to || '未识别'}</Text>
            </View>
            <View className="flex justify-between py-2">
              <Text className="text-muted-foreground text-sm">发证机关</Text>
              <Text className="text-foreground text-sm font-medium text-right flex-1 ml-4">
                {driverLicense.issue_authority || '未识别'}
              </Text>
            </View>
          </View>

          {/* 驾驶证照片 */}
          {driverLicense.driving_license_photo && (
            <View className="mt-4">
              <Text className="text-foreground text-base font-medium mb-3 block">驾驶证照片</Text>
              <Image
                src={getImageUrl(driverLicense.driving_license_photo)}
                mode="aspectFit"
                className="w-full h-48 bg-muted rounded-lg"
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
      </View>
    </ScrollView>
  )
}

export default DriverProfileView
