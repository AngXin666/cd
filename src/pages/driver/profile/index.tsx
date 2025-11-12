/**
 * 司机个人信息页面
 * 显示司机的身份证、驾驶证信息和证件照片
 * 只允许修改手机号和密码
 */

import {Button, Image, Input, ScrollView, Text, View} from '@tarojs/components'
import Taro, {useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {supabase} from '@/client/supabase'
import {getCurrentUserProfile, getDriverLicense, updateProfile} from '@/db/api'
import type {DriverLicense, Profile} from '@/db/types'

const DriverProfile: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [driverLicense, setDriverLicense] = useState<DriverLicense | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingPhone, setEditingPhone] = useState(false)
  const [editingPassword, setEditingPassword] = useState(false)

  // 编辑表单状态
  const [editForm, setEditForm] = useState({
    phone: '',
    newPassword: '',
    confirmPassword: ''
  })

  // 加载个人资料和证件信息
  const loadProfile = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      // 加载个人资料
      const profileData = await getCurrentUserProfile()
      console.log('个人资料数据:', profileData)
      setProfile(profileData)
      // 初始化编辑表单
      setEditForm((prev) => ({
        ...prev,
        phone: profileData?.phone || ''
      }))

      // 加载驾驶证信息
      const licenseData = await getDriverLicense(user.id)
      console.log('驾驶证信息:', licenseData)
      console.log('身份证正面路径:', licenseData?.id_card_photo_front)
      console.log('身份证背面路径:', licenseData?.id_card_photo_back)
      console.log('驾驶证照片路径:', licenseData?.driving_license_photo)
      setDriverLicense(licenseData)
    } catch (error) {
      console.error('加载个人资料失败:', error)
      Taro.showToast({
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

  // 开始编辑手机号
  const handleStartEditPhone = () => {
    setEditingPhone(true)
    setEditForm((prev) => ({
      ...prev,
      phone: profile?.phone || ''
    }))
  }

  // 取消编辑手机号
  const handleCancelEditPhone = () => {
    setEditingPhone(false)
    setEditForm((prev) => ({
      ...prev,
      phone: profile?.phone || ''
    }))
  }

  // 保存手机号
  const handleSavePhone = async () => {
    if (!user) return

    if (!editForm.phone.trim()) {
      Taro.showToast({
        title: '请输入手机号',
        icon: 'none'
      })
      return
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(editForm.phone)) {
      Taro.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      })
      return
    }

    Taro.showLoading({title: '保存中...'})
    try {
      await updateProfile(user.id, {phone: editForm.phone})
      await loadProfile()
      setEditingPhone(false)
      Taro.showToast({
        title: '保存成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('保存失败:', error)
      Taro.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      Taro.hideLoading()
    }
  }

  // 开始修改密码
  const handleStartEditPassword = () => {
    setEditingPassword(true)
    setEditForm((prev) => ({
      ...prev,
      newPassword: '',
      confirmPassword: ''
    }))
  }

  // 取消修改密码
  const handleCancelEditPassword = () => {
    setEditingPassword(false)
    setEditForm((prev) => ({
      ...prev,
      newPassword: '',
      confirmPassword: ''
    }))
  }

  // 保存密码
  const handleSavePassword = async () => {
    if (!editForm.newPassword || !editForm.confirmPassword) {
      Taro.showToast({
        title: '请输入新密码',
        icon: 'none'
      })
      return
    }

    if (editForm.newPassword.length < 6) {
      Taro.showToast({
        title: '密码至少6位',
        icon: 'none'
      })
      return
    }

    if (editForm.newPassword !== editForm.confirmPassword) {
      Taro.showToast({
        title: '两次密码不一致',
        icon: 'none'
      })
      return
    }

    Taro.showLoading({title: '修改中...'})
    try {
      const {error} = await supabase.auth.updateUser({
        password: editForm.newPassword
      })

      if (error) throw error

      setEditingPassword(false)
      setEditForm((prev) => ({
        ...prev,
        newPassword: '',
        confirmPassword: ''
      }))
      Taro.showToast({
        title: '密码修改成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('修改密码失败:', error)
      Taro.showToast({
        title: '修改失败',
        icon: 'none'
      })
    } finally {
      Taro.hideLoading()
    }
  }

  // 返回上一页
  const handleGoBack = () => {
    Taro.navigateBack()
  }

  // 获取图片公共URL
  const getImageUrl = (path: string | null): string => {
    if (!path) {
      console.log('图片路径为空')
      return ''
    }
    console.log('原始图片路径:', path)
    const bucketName = `${process.env.TARO_APP_APP_ID}_avatars`
    console.log('使用的bucket:', bucketName)
    const {data} = supabase.storage.from(bucketName).getPublicUrl(path)
    console.log('生成的公共URL:', data.publicUrl)
    return data.publicUrl
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
      manager: '管理员',
      super_admin: '超级管理员'
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
                  <Text className="text-lg font-bold text-gray-800">基本信息</Text>
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

                  {/* 手机号（可编辑） */}
                  <View className="border-b border-gray-100 pb-3">
                    <View className="flex items-center justify-between mb-2">
                      <View className="flex items-center flex-1">
                        <View className="i-mdi-phone text-gray-600 text-lg mr-2" />
                        <Text className="text-gray-600 text-sm">手机号</Text>
                      </View>
                      {!editingPhone && (
                        <Button
                          className="bg-blue-50 text-blue-600 px-3 py-1 rounded break-keep text-xs"
                          size="mini"
                          onClick={handleStartEditPhone}>
                          修改
                        </Button>
                      )}
                    </View>
                    {editingPhone ? (
                      <View>
                        <View style={{overflow: 'hidden'}} className="mb-2">
                          <Input
                            type="number"
                            maxlength={11}
                            placeholder="请输入手机号"
                            value={editForm.phone}
                            onInput={(e) => setEditForm((prev) => ({...prev, phone: e.detail.value}))}
                            className="bg-gray-50 text-gray-800 px-3 py-2 rounded border border-gray-200 w-full text-sm"
                          />
                        </View>
                        <View className="flex gap-2">
                          <Button
                            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded break-keep text-sm"
                            size="mini"
                            onClick={handleCancelEditPhone}>
                            取消
                          </Button>
                          <Button
                            className="flex-1 bg-blue-600 text-white py-2 rounded break-keep text-sm"
                            size="mini"
                            onClick={handleSavePhone}>
                            保存
                          </Button>
                        </View>
                      </View>
                    ) : (
                      <Text className="text-gray-800 text-sm font-medium ml-7">{profile?.phone || '未填写'}</Text>
                    )}
                  </View>

                  {/* 登录密码（可修改） */}
                  <View className="border-b border-gray-100 pb-3">
                    <View className="flex items-center justify-between mb-2">
                      <View className="flex items-center flex-1">
                        <View className="i-mdi-lock text-gray-600 text-lg mr-2" />
                        <Text className="text-gray-600 text-sm">登录密码</Text>
                      </View>
                      {!editingPassword && (
                        <Button
                          className="bg-blue-50 text-blue-600 px-3 py-1 rounded break-keep text-xs"
                          size="mini"
                          onClick={handleStartEditPassword}>
                          修改
                        </Button>
                      )}
                    </View>
                    {editingPassword ? (
                      <View>
                        <View style={{overflow: 'hidden'}} className="mb-2">
                          <Input
                            type="text"
                            password
                            placeholder="请输入新密码（至少6位）"
                            value={editForm.newPassword}
                            onInput={(e) => setEditForm((prev) => ({...prev, newPassword: e.detail.value}))}
                            className="bg-gray-50 text-gray-800 px-3 py-2 rounded border border-gray-200 w-full text-sm mb-2"
                          />
                        </View>
                        <View style={{overflow: 'hidden'}} className="mb-2">
                          <Input
                            type="text"
                            password
                            placeholder="请再次输入新密码"
                            value={editForm.confirmPassword}
                            onInput={(e) => setEditForm((prev) => ({...prev, confirmPassword: e.detail.value}))}
                            className="bg-gray-50 text-gray-800 px-3 py-2 rounded border border-gray-200 w-full text-sm"
                          />
                        </View>
                        <View className="flex gap-2">
                          <Button
                            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded break-keep text-sm"
                            size="mini"
                            onClick={handleCancelEditPassword}>
                            取消
                          </Button>
                          <Button
                            className="flex-1 bg-blue-600 text-white py-2 rounded break-keep text-sm"
                            size="mini"
                            onClick={handleSavePassword}>
                            保存
                          </Button>
                        </View>
                      </View>
                    ) : (
                      <Text className="text-gray-800 text-sm font-medium ml-7">••••••</Text>
                    )}
                  </View>

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

              {/* 身份证信息卡片 */}
              {driverLicense && (driverLicense.id_card_number || driverLicense.id_card_name) && (
                <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                  <View className="flex items-center mb-4">
                    <View className="i-mdi-card-account-details text-green-600 text-xl mr-2" />
                    <Text className="text-lg font-bold text-gray-800">身份证信息</Text>
                    <Text className="text-xs text-gray-500 ml-2">（系统自动读取）</Text>
                  </View>

                  <View className="space-y-3">
                    {/* 姓名 */}
                    {driverLicense.id_card_name && (
                      <View className="flex items-center justify-between py-2 border-b border-gray-100">
                        <Text className="text-gray-600 text-sm">姓名</Text>
                        <Text className="text-gray-800 text-sm font-medium">{driverLicense.id_card_name}</Text>
                      </View>
                    )}

                    {/* 身份证号 */}
                    {driverLicense.id_card_number && (
                      <View className="flex items-center justify-between py-2 border-b border-gray-100">
                        <Text className="text-gray-600 text-sm">身份证号</Text>
                        <Text className="text-gray-800 text-sm font-medium">{driverLicense.id_card_number}</Text>
                      </View>
                    )}

                    {/* 出生日期 */}
                    {driverLicense.id_card_birth_date && (
                      <View className="flex items-center justify-between py-2 border-b border-gray-100">
                        <Text className="text-gray-600 text-sm">出生日期</Text>
                        <Text className="text-gray-800 text-sm font-medium">
                          {formatDate(driverLicense.id_card_birth_date)}
                        </Text>
                      </View>
                    )}

                    {/* 住址 */}
                    {driverLicense.id_card_address && (
                      <View className="flex items-center justify-between py-2">
                        <Text className="text-gray-600 text-sm">住址</Text>
                        <Text className="text-gray-800 text-sm font-medium text-right flex-1 ml-4">
                          {driverLicense.id_card_address}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* 驾驶证信息卡片 */}
              {driverLicense && (driverLicense.license_number || driverLicense.license_class) && (
                <View className="bg-white rounded-2xl p-6 mb-4 shadow-md">
                  <View className="flex items-center mb-4">
                    <View className="i-mdi-card-account-details-outline text-orange-600 text-xl mr-2" />
                    <Text className="text-lg font-bold text-gray-800">驾驶证信息</Text>
                    <Text className="text-xs text-gray-500 ml-2">（系统自动读取）</Text>
                  </View>

                  <View className="space-y-3">
                    {/* 驾驶证号 */}
                    {driverLicense.license_number && (
                      <View className="flex items-center justify-between py-2 border-b border-gray-100">
                        <Text className="text-gray-600 text-sm">驾驶证号</Text>
                        <Text className="text-gray-800 text-sm font-medium">{driverLicense.license_number}</Text>
                      </View>
                    )}

                    {/* 准驾车型 */}
                    {driverLicense.license_class && (
                      <View className="flex items-center justify-between py-2 border-b border-gray-100">
                        <Text className="text-gray-600 text-sm">准驾车型</Text>
                        <Text className="text-gray-800 text-sm font-medium">{driverLicense.license_class}</Text>
                      </View>
                    )}

                    {/* 初次领证日期 */}
                    {driverLicense.valid_from && (
                      <View className="flex items-center justify-between py-2 border-b border-gray-100">
                        <Text className="text-gray-600 text-sm">初次领证日期</Text>
                        <Text className="text-gray-800 text-sm font-medium">
                          {formatDate(driverLicense.valid_from)}
                        </Text>
                      </View>
                    )}

                    {/* 有效期至 */}
                    {driverLicense.valid_to && (
                      <View className="flex items-center justify-between py-2 border-b border-gray-100">
                        <Text className="text-gray-600 text-sm">有效期至</Text>
                        <Text className="text-gray-800 text-sm font-medium">{formatDate(driverLicense.valid_to)}</Text>
                      </View>
                    )}

                    {/* 发证机关 */}
                    {driverLicense.issue_authority && (
                      <View className="flex items-center justify-between py-2">
                        <Text className="text-gray-600 text-sm">发证机关</Text>
                        <Text className="text-gray-800 text-sm font-medium text-right flex-1 ml-4">
                          {driverLicense.issue_authority}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

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

                    <View className="space-y-4">
                      {/* 身份证正面 */}
                      {driverLicense.id_card_photo_front && (
                        <View>
                          <Text className="text-gray-600 text-sm mb-2">身份证正面</Text>
                          <Image
                            src={getImageUrl(driverLicense.id_card_photo_front)}
                            mode="aspectFit"
                            className="w-full rounded-lg border border-gray-200"
                            style={{height: '200px'}}
                            onError={(e) => {
                              console.error('身份证正面图片加载失败:', e)
                              console.error('图片URL:', getImageUrl(driverLicense.id_card_photo_front))
                            }}
                            onLoad={() => {
                              console.log('身份证正面图片加载成功')
                            }}
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
                        <View>
                          <Text className="text-gray-600 text-sm mb-2">身份证背面</Text>
                          <Image
                            src={getImageUrl(driverLicense.id_card_photo_back)}
                            mode="aspectFit"
                            className="w-full rounded-lg border border-gray-200"
                            style={{height: '200px'}}
                            onError={(e) => {
                              console.error('身份证背面图片加载失败:', e)
                              console.error('图片URL:', getImageUrl(driverLicense.id_card_photo_back))
                            }}
                            onLoad={() => {
                              console.log('身份证背面图片加载成功')
                            }}
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
                        <View>
                          <Text className="text-gray-600 text-sm mb-2">驾驶证</Text>
                          <Image
                            src={getImageUrl(driverLicense.driving_license_photo)}
                            mode="aspectFit"
                            className="w-full rounded-lg border border-gray-200"
                            style={{height: '200px'}}
                            onError={(e) => {
                              console.error('驾驶证照片加载失败:', e)
                              console.error('图片URL:', getImageUrl(driverLicense.driving_license_photo))
                            }}
                            onLoad={() => {
                              console.log('驾驶证照片加载成功')
                            }}
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

              {/* 提示信息 */}
              <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <View className="flex items-start">
                  <View className="i-mdi-information text-blue-600 text-xl mr-2 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-blue-800 text-sm block mb-1 font-medium">温馨提示</Text>
                    <Text className="text-blue-700 text-xs block mb-1">• 您只能修改手机号和登录密码</Text>
                    <Text className="text-blue-700 text-xs block mb-1">
                      • 姓名、身份证号等信息由系统从证件自动读取，无法修改
                    </Text>
                    <Text className="text-blue-700 text-xs block">• 如需更新证件信息，请联系管理员</Text>
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
