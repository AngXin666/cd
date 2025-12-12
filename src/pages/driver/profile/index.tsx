/**
 * 司机个人信息页面
 * 显示司机的身份证、驾驶证信息和证件照片
 * 允许删除并重新录入个人信息
 */

import {Button, Image, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {supabase} from '@/client/supabase'
import * as UsersAPI from '@/db/api/users'
import * as VehiclesAPI from '@/db/api/vehicles'
import type {DriverLicense, Profile} from '@/db/types'
import {createLogger} from '@/utils/logger'
import {hideLoading, showLoading, showToast} from '@/utils/taroCompat'

// 创建页面日志记录器
const logger = createLogger('DriverProfile')

const DriverProfile: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [driverLicense, setDriverLicense] = useState<DriverLicense | null>(null)
  const [loading, setLoading] = useState(false)

  // 加载个人资料和证件信息
  const loadProfile = useCallback(async () => {
    if (!user) return

    logger.pageView('司机个人信息页面', {userId: user.id})
    setLoading(true)
    try {
      // 加载个人资料
      const profileData = await UsersAPI.getCurrentUserProfile()
      setProfile(profileData)

      // 加载驾驶证信息
      const licenseData = await VehiclesAPI.getDriverLicense(user.id)
      setDriverLicense(licenseData)
    } catch (error) {
      logger.error('加载个人资料失败', error)
      showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useDidShow(() => {
    loadProfile()
  })

  // 删除个人信息
  const handleDeleteInfo = async () => {
    if (!user) return

    logger.userAction('请求删除个人信息', {userId: user.id})

    // 二次确认
    const res = await Taro.showModal({
      title: '确认删除',
      content: '删除后将清空所有个人信息和证件照片，需要重新录入。确定要删除吗？',
      confirmText: '确定删除',
      cancelText: '取消',
      confirmColor: '#ef4444'
    })

    if (!res.confirm) {
      return
    }

    showLoading({title: '删除中...'})
    try {
      const success = await VehiclesAPI.deleteDriverLicense(user.id)

      if (!success) {
        throw new Error('删除失败')
      }

      // 清空本地状态
      setDriverLicense(null)

      showToast({
        title: '删除成功',
        icon: 'success',
        duration: 2000
      })

      // 延迟刷新页面
      setTimeout(() => {
        loadProfile()
      }, 2000)
    } catch (error) {
      logger.error('删除个人信息失败', error)
      showToast({
        title: '删除失败，请重试',
        icon: 'none'
      })
    } finally {
      hideLoading()
    }
  }

  // 跳转到驾驶证拍照页面录入信息
  const handleReEnter = () => {
    Taro.navigateTo({
      url: '/pages/driver/license-ocr/index'
    })
  }

  // 返回上一页
  const handleGoBack = () => {
    Taro.navigateBack()
  }

  // 获取图片公共URL
  const getImageUrl = (path: string | null): string => {
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

  // 预览图片
  const previewImage = (url: string, allUrls: string[]) => {
    Taro.previewImage({
      current: url,
      urls: allUrls
    })
  }

  // 格式化日期
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '未填写'
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN')
    } catch {
      return dateStr
    }
  }

  // 格式化角色
  const formatRole = (role: string): string => {
    const roleMap: Record<string, string> = {
      driver: '司机',
      manager: '车队长',
      super_admin: '老板'
    }
    return roleMap[role] || role
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #EFF6FF, #DBEAFE)', minHeight: '100vh'}}>
      <ScrollView scrollY className="h-screen box-border" style={{background: 'transparent'}}>
        <View className="p-4 pb-20">
          {/* 页面标题卡片 */}
          <View className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex items-center justify-between">
              <View className="flex items-center flex-1">
                <View className="i-mdi-account-circle text-4xl text-blue-600 mr-3" />
                <View>
                  <Text className="text-2xl font-bold text-gray-800 block mb-1">个人信息</Text>
                  <Text className="text-sm text-gray-500 block">查看和管理您的个人资料</Text>
                </View>
              </View>
              <Button
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg break-keep text-sm"
                size="mini"
                onClick={handleGoBack}>
                <View className="flex items-center">
                  <View className="i-mdi-arrow-left text-base mr-1" />
                  <Text>返回</Text>
                </View>
              </Button>
            </View>
          </View>

          {loading ? (
            <View className="bg-white rounded-2xl p-8 text-center">
              <Text className="text-gray-500">加载中...</Text>
            </View>
          ) : (
            <>
              {/* 基本信息卡片 */}
              <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                <View className="flex items-center mb-4">
                  <View className="i-mdi-account-details text-blue-600 text-xl mr-2" />
                  <Text className="text-lg font-bold text-gray-800">个人信息</Text>
                </View>

                <View className="space-y-4">
                  {/* 姓名（只读，从身份证读取） */}
                  <View className="border-b border-gray-100 pb-3">
                    <View className="flex items-center justify-between">
                      <View className="flex items-center flex-1">
                        <View className="i-mdi-account text-gray-600 text-lg mr-2" />
                        <Text className="text-gray-600 text-sm">姓名</Text>
                      </View>
                      <Text className="text-gray-800 text-sm font-medium">
                        {driverLicense?.id_card_name || '未填写'}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-400 mt-1 ml-7">来自身份证信息</Text>
                  </View>

                  {/* 手机号（只读） */}
                  <View className="border-b border-gray-100 pb-3">
                    <View className="flex items-center justify-between">
                      <View className="flex items-center flex-1">
                        <View className="i-mdi-phone text-gray-600 text-lg mr-2" />
                        <Text className="text-gray-600 text-sm">手机号</Text>
                      </View>
                      <Text className="text-gray-800 text-sm font-medium">{profile?.phone || '未填写'}</Text>
                    </View>
                    <Text className="text-xs text-gray-400 mt-1 ml-7">如需修改，请前往设置页面</Text>
                  </View>

                  {/* 身份证号 */}
                  {driverLicense?.id_card_number && (
                    <View className="border-b border-gray-100 pb-3">
                      <View className="flex items-center justify-between">
                        <View className="flex items-center flex-1">
                          <View className="i-mdi-card-account-details text-gray-600 text-lg mr-2" />
                          <Text className="text-gray-600 text-sm">身份证号</Text>
                        </View>
                        <Text className="text-gray-800 text-sm font-medium">{driverLicense.id_card_number}</Text>
                      </View>
                    </View>
                  )}

                  {/* 出生日期 */}
                  {driverLicense?.id_card_birth_date && (
                    <View className="border-b border-gray-100 pb-3">
                      <View className="flex items-center justify-between">
                        <View className="flex items-center flex-1">
                          <View className="i-mdi-cake-variant text-gray-600 text-lg mr-2" />
                          <Text className="text-gray-600 text-sm">出生日期</Text>
                        </View>
                        <Text className="text-gray-800 text-sm font-medium">
                          {formatDate(driverLicense.id_card_birth_date)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* 住址 */}
                  {driverLicense?.id_card_address && (
                    <View className="border-b border-gray-100 pb-3">
                      <View className="flex items-center justify-between">
                        <View className="flex items-center flex-1">
                          <View className="i-mdi-home-map-marker text-gray-600 text-lg mr-2" />
                          <Text className="text-gray-600 text-sm">住址</Text>
                        </View>
                        <Text className="text-gray-800 text-sm font-medium text-right flex-1 ml-4">
                          {driverLicense.id_card_address}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* 驾驶证号 */}
                  {driverLicense?.license_number && (
                    <View className="border-b border-gray-100 pb-3">
                      <View className="flex items-center justify-between">
                        <View className="flex items-center flex-1">
                          <View className="i-mdi-card-account-details-outline text-gray-600 text-lg mr-2" />
                          <Text className="text-gray-600 text-sm">驾驶证号</Text>
                        </View>
                        <Text className="text-gray-800 text-sm font-medium">{driverLicense.license_number}</Text>
                      </View>
                    </View>
                  )}

                  {/* 准驾车型 */}
                  {driverLicense?.license_class && (
                    <View className="border-b border-gray-100 pb-3">
                      <View className="flex items-center justify-between">
                        <View className="flex items-center flex-1">
                          <View className="i-mdi-car text-gray-600 text-lg mr-2" />
                          <Text className="text-gray-600 text-sm">准驾车型</Text>
                        </View>
                        <Text className="text-gray-800 text-sm font-medium">{driverLicense.license_class}</Text>
                      </View>
                    </View>
                  )}

                  {/* 初次领证日期 */}
                  {driverLicense?.valid_from && (
                    <View className="border-b border-gray-100 pb-3">
                      <View className="flex items-center justify-between">
                        <View className="flex items-center flex-1">
                          <View className="i-mdi-calendar-check text-gray-600 text-lg mr-2" />
                          <Text className="text-gray-600 text-sm">初次领证日期</Text>
                        </View>
                        <Text className="text-gray-800 text-sm font-medium">
                          {formatDate(driverLicense.valid_from)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* 有效期至 */}
                  {driverLicense?.valid_to && (
                    <View className="border-b border-gray-100 pb-3">
                      <View className="flex items-center justify-between">
                        <View className="flex items-center flex-1">
                          <View className="i-mdi-calendar-clock text-gray-600 text-lg mr-2" />
                          <Text className="text-gray-600 text-sm">有效期至</Text>
                        </View>
                        <Text className="text-gray-800 text-sm font-medium">{formatDate(driverLicense.valid_to)}</Text>
                      </View>
                    </View>
                  )}

                  {/* 发证机关 */}
                  {driverLicense?.issue_authority && (
                    <View className="border-b border-gray-100 pb-3">
                      <View className="flex items-center justify-between">
                        <View className="flex items-center flex-1">
                          <View className="i-mdi-office-building text-gray-600 text-lg mr-2" />
                          <Text className="text-gray-600 text-sm">发证机关</Text>
                        </View>
                        <Text className="text-gray-800 text-sm font-medium text-right flex-1 ml-4">
                          {driverLicense.issue_authority}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* 用户角色（只读） */}
                  <View className="border-b border-gray-100 pb-3">
                    <View className="flex items-center justify-between">
                      <View className="flex items-center flex-1">
                        <View className="i-mdi-shield-account text-gray-600 text-lg mr-2" />
                        <Text className="text-gray-600 text-sm">用户角色</Text>
                      </View>
                      <Text className="text-gray-800 text-sm font-medium">
                        {profile ? formatRole(profile.role) : '未知'}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-400 mt-1 ml-7">由系统分配</Text>
                  </View>

                  {/* 注册时间（只读） */}
                  <View className="pb-3">
                    <View className="flex items-center justify-between">
                      <View className="flex items-center flex-1">
                        <View className="i-mdi-calendar-clock text-gray-600 text-lg mr-2" />
                        <Text className="text-gray-600 text-sm">注册时间</Text>
                      </View>
                      <Text className="text-gray-800 text-sm font-medium">
                        {profile ? formatDate(profile.created_at) : '未知'}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-400 mt-1 ml-7">账户创建时间</Text>
                  </View>
                </View>
              </View>

              {/* 证件照片卡片 */}
              {driverLicense &&
                (driverLicense.id_card_photo_front ||
                  driverLicense.id_card_photo_back ||
                  driverLicense.driving_license_photo) && (
                  <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                    <View className="flex items-center mb-4">
                      <View className="i-mdi-image-multiple text-purple-600 text-xl mr-2" />
                      <Text className="text-lg font-bold text-gray-800">证件照片</Text>
                    </View>

                    {/* 横向网格布局 */}
                    <View className="flex flex-row flex-wrap gap-3">
                      {/* 身份证正面 */}
                      {driverLicense.id_card_photo_front && (
                        <View className="flex-1" style={{minWidth: '45%'}}>
                          <Text className="text-gray-600 text-xs mb-2">身份证正面</Text>
                          <Image
                            src={getImageUrl(driverLicense.id_card_photo_front)}
                            mode="aspectFit"
                            className="w-full rounded-lg border border-gray-200"
                            style={{height: '120px'}}
                            onError={(e) => {
                              logger.error('身份证正面图片加载失败', {
                                event: e,
                                originalPath: driverLicense.id_card_photo_front,
                                generatedUrl: getImageUrl(driverLicense.id_card_photo_front)
                              })
                            }}
                            onLoad={() => {}}
                            onClick={() =>
                              previewImage(
                                getImageUrl(driverLicense.id_card_photo_front),
                                [
                                  driverLicense.id_card_photo_front,
                                  driverLicense.id_card_photo_back,
                                  driverLicense.driving_license_photo
                                ]
                                  .filter(Boolean)
                                  .map((p) => getImageUrl(p))
                              )
                            }
                          />
                        </View>
                      )}

                      {/* 身份证背面 */}
                      {driverLicense.id_card_photo_back && (
                        <View className="flex-1" style={{minWidth: '45%'}}>
                          <Text className="text-gray-600 text-xs mb-2">身份证背面</Text>
                          <Image
                            src={getImageUrl(driverLicense.id_card_photo_back)}
                            mode="aspectFit"
                            className="w-full rounded-lg border border-gray-200"
                            style={{height: '120px'}}
                            onError={(e) => {
                              logger.error('身份证背面图片加载失败', {
                                event: e,
                                originalPath: driverLicense.id_card_photo_back,
                                generatedUrl: getImageUrl(driverLicense.id_card_photo_back)
                              })
                            }}
                            onLoad={() => {}}
                            onClick={() =>
                              previewImage(
                                getImageUrl(driverLicense.id_card_photo_back),
                                [
                                  driverLicense.id_card_photo_front,
                                  driverLicense.id_card_photo_back,
                                  driverLicense.driving_license_photo
                                ]
                                  .filter(Boolean)
                                  .map((p) => getImageUrl(p))
                              )
                            }
                          />
                        </View>
                      )}

                      {/* 驾驶证照片 */}
                      {driverLicense.driving_license_photo && (
                        <View className="flex-1" style={{minWidth: '45%'}}>
                          <Text className="text-gray-600 text-xs mb-2">驾驶证</Text>
                          <Image
                            src={getImageUrl(driverLicense.driving_license_photo)}
                            mode="aspectFit"
                            className="w-full rounded-lg border border-gray-200"
                            style={{height: '120px'}}
                            onError={(e) => {
                              logger.error('驾驶证照片加载失败', {
                                event: e,
                                originalPath: driverLicense.driving_license_photo,
                                generatedUrl: getImageUrl(driverLicense.driving_license_photo)
                              })
                            }}
                            onLoad={() => {}}
                            onClick={() =>
                              previewImage(
                                getImageUrl(driverLicense.driving_license_photo),
                                [
                                  driverLicense.id_card_photo_front,
                                  driverLicense.id_card_photo_back,
                                  driverLicense.driving_license_photo
                                ]
                                  .filter(Boolean)
                                  .map((p) => getImageUrl(p))
                              )
                            }
                          />
                        </View>
                      )}
                    </View>
                  </View>
                )}

              {/* 操作按钮区域 */}
              {driverLicense ? (
                <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                  <View className="flex items-center mb-3">
                    <View className="i-mdi-cog text-gray-600 text-xl mr-2" />
                    <Text className="text-lg font-bold text-gray-800">信息管理</Text>
                  </View>

                  {/* 编辑证件信息按钮 */}
                  <Button
                    className="w-full bg-blue-600 text-white py-3 rounded-lg break-keep text-sm mb-3"
                    size="default"
                    onClick={handleReEnter}>
                    <View className="flex items-center justify-center">
                      <View className="i-mdi-camera text-lg mr-2" />
                      <Text>重新拍照录入证件</Text>
                    </View>
                  </Button>

                  {/* 删除信息按钮 */}
                  <Button
                    className="w-full bg-red-50 text-red-600 py-3 rounded-lg break-keep text-sm border border-red-200"
                    size="default"
                    onClick={handleDeleteInfo}>
                    <View className="flex items-center justify-center">
                      <View className="i-mdi-delete text-lg mr-2" />
                      <Text>删除所有个人信息</Text>
                    </View>
                  </Button>
                  <Text className="text-xs text-gray-500 mt-2 text-center">
                    可以直接重新拍照更新证件，或删除后重新录入
                  </Text>
                </View>
              ) : (
                <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                  <View className="flex items-center mb-3">
                    <View className="i-mdi-alert-circle text-orange-600 text-xl mr-2" />
                    <Text className="text-lg font-bold text-gray-800">未录入信息</Text>
                  </View>
                  <Text className="text-gray-600 text-sm mb-4 text-center">
                    您还没有录入个人信息，请拍照录入您的身份证和驾驶证
                  </Text>
                  <Button
                    className="w-full bg-blue-600 text-white py-3 rounded-lg break-keep text-sm"
                    size="default"
                    onClick={handleReEnter}>
                    <View className="flex items-center justify-center">
                      <View className="i-mdi-camera text-lg mr-2" />
                      <Text>立即录入证件信息</Text>
                    </View>
                  </Button>
                </View>
              )}

              {/* 提示信息 */}
              <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <View className="flex items-start">
                  <View className="i-mdi-information text-blue-600 text-xl mr-2 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-blue-800 text-sm block mb-1 font-medium">温馨提示</Text>
                    <Text className="text-blue-700 text-xs block mb-1">
                      • 姓名、身份证号等信息由系统从证件自动读取，无法修改
                    </Text>
                    <Text className="text-blue-700 text-xs block mb-1">
                      • 如需修改手机号或密码，请前往"我的 → 设置"页面
                    </Text>
                    <Text className="text-blue-700 text-xs block">• 如需更新证件信息，可以删除后重新录入</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

export default DriverProfile
