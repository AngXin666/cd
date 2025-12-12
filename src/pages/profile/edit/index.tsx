import {Button, Image, Input, Picker, ScrollView, Text, Textarea, View} from '@tarojs/components'
import Taro, {chooseImage, navigateBack, showLoading, showToast, useDidShow, usePullDownRefresh} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import * as UsersAPI from '@/db/api/users'

import type {Profile} from '@/db/types'

// 中国省份列表
const provinces = [
  '北京市',
  '天津市',
  '河北省',
  '山西省',
  '内蒙古自治区',
  '辽宁省',
  '吉林省',
  '黑龙江省',
  '上海市',
  '江苏省',
  '浙江省',
  '安徽省',
  '福建省',
  '江西省',
  '山东省',
  '河南省',
  '湖北省',
  '湖南省',
  '广东省',
  '广西壮族自治区',
  '海南省',
  '重庆市',
  '四川省',
  '贵州省',
  '云南省',
  '西藏自治区',
  '陕西省',
  '甘肃省',
  '青海省',
  '宁夏回族自治区',
  '新疆维吾尔自治区',
  '台湾省',
  '香港特别行政区',
  '澳门特别行政区'
]

const ProfileEditPage: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)

  // 表单字段
  const [avatarUrl, setAvatarUrl] = useState('')
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [provinceIndex, setProvinceIndex] = useState(0)
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [addressDetail, setAddressDetail] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')

  const loadProfile = useCallback(async () => {
    const data = await UsersAPI.getCurrentUserProfile()
    if (data) {
      setProfile(data)
      setAvatarUrl(data.avatar_url || '')
      setName(data.name || '')
      setNickname(data.nickname || '')
      setEmail(data.email || '')
      setCity(data.address_city || '')
      setDistrict(data.address_district || '')
      setAddressDetail(data.address_detail || '')
      setEmergencyContactName(data.emergency_contact_name || '')
      setEmergencyContactPhone(data.emergency_contact_phone || '')

      // 设置省份索引
      if (data.address_province) {
        const index = provinces.indexOf(data.address_province)
        if (index !== -1) {
          setProvinceIndex(index)
        }
      }
    }
  }, [])

  useDidShow(() => {
    loadProfile()
  })

  // 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([loadProfile()])
    Taro.stopPullDownRefresh()
  })

  // 选择头像
  const handleChooseAvatar = async () => {
    try {
      const res = await chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      if (res.tempFiles && res.tempFiles.length > 0) {
        const file = res.tempFiles[0]

        // 检查文件大小
        if (file.size > 1048576) {
          showToast({title: '图片大小不能超过1MB', icon: 'none'})
          return
        }

        showLoading({title: '上传中...'})

        // 上传头像
        const uploadResult = await UsersAPI.uploadAvatar(user?.id || '', {
          path: file.path,
          size: file.size,
          name: `avatar_${Date.now()}.jpg`,
          originalFileObj: (file as any).originalFileObj
        })

        if (uploadResult.success && uploadResult.url) {
          setAvatarUrl(uploadResult.url)
          showToast({title: '上传成功', icon: 'success'})
        } else {
          showToast({title: uploadResult.error || '上传失败', icon: 'error'})
        }
      }
    } catch (error) {
      console.error('选择头像失败:', error)
      showToast({title: '选择图片失败', icon: 'error'})
    }
  }

  // 保存资料
  const handleSave = async () => {
    if (!profile) return

    // 验证必填字段
    if (!name.trim()) {
      showToast({title: '请输入姓名', icon: 'none'})
      return
    }

    // 验证邮箱格式
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast({title: '邮箱格式不正确', icon: 'none'})
      return
    }

    // 验证紧急联系人电话格式
    if (emergencyContactPhone && !/^1[3-9]\d{9}$/.test(emergencyContactPhone)) {
      showToast({title: '紧急联系人电话格式不正确', icon: 'none'})
      return
    }

    setLoading(true)
    showLoading({title: '保存中...'})

    const result = await UsersAPI.updateUserProfile(profile.id, {
      avatar_url: avatarUrl || undefined,
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      email: email.trim() || undefined,
      address_province: provinces[provinceIndex] || undefined,
      address_city: city.trim() || undefined,
      address_district: district.trim() || undefined,
      address_detail: addressDetail.trim() || undefined,
      emergency_contact_name: emergencyContactName.trim() || undefined,
      emergency_contact_phone: emergencyContactPhone.trim() || undefined
    })

    setLoading(false)

    if (result.success) {
      showToast({title: '保存成功', icon: 'success'})
      setTimeout(() => {
        navigateBack()
      }, 1500)
    } else {
      showToast({title: result.error || '保存失败', icon: 'error'})
    }
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 头像上传 */}
          <View className="bg-white rounded-xl p-6 mb-4 shadow">
            <Text className="text-base font-bold text-gray-800 block mb-4">头像</Text>
            <View className="flex flex-col items-center">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  mode="aspectFill"
                  className="w-24 h-24 rounded-full mb-4"
                  style={{border: '3px solid #1E3A8A'}}
                />
              ) : (
                <View className="i-mdi-account-circle text-8xl text-gray-400 mb-4" />
              )}
              <Button
                className="text-sm break-keep"
                size="default"
                style={{
                  backgroundColor: '#1E3A8A',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none'
                }}
                onClick={handleChooseAvatar}>
                {avatarUrl ? '更换头像' : '上传头像'}
              </Button>
              <Text className="text-xs text-gray-500 block mt-2">支持JPG、PNG格式，大小不超过1MB</Text>
            </View>
          </View>

          {/* 基本信息 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow">
            <Text className="text-base font-bold text-gray-800 block mb-4">基本信息</Text>

            {/* 姓名 */}
            <View className="mb-4">
              <View className="flex items-center mb-2">
                <Text className="text-sm text-gray-700">姓名</Text>
                <Text className="text-xs text-red-500 ml-1">*</Text>
              </View>
              <Input
                className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm"
                value={name}
                onInput={(e) => setName(e.detail.value)}
                placeholder="请输入姓名"
                maxlength={20}
              />
            </View>

            {/* 昵称 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">昵称</Text>
              <Input
                className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm"
                value={nickname}
                onInput={(e) => setNickname(e.detail.value)}
                placeholder="请输入昵称"
                maxlength={20}
              />
            </View>

            {/* 邮箱 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">邮箱</Text>
              <Input
                className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm"
                value={email}
                onInput={(e) => setEmail(e.detail.value)}
                placeholder="请输入邮箱地址"
                type="text"
              />
            </View>

            {/* 手机号（只读） */}
            <View>
              <Text className="text-sm text-gray-700 block mb-2">手机号</Text>
              <View className="w-full px-4 py-3 bg-gray-100 rounded-lg">
                <Text className="text-sm text-gray-500">{profile?.phone || '未设置'}</Text>
              </View>
              <Text className="text-xs text-gray-500 block mt-1">手机号不可修改</Text>
            </View>
          </View>

          {/* 居住地址 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow">
            <Text className="text-base font-bold text-gray-800 block mb-4">居住地址</Text>

            {/* 省份 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">省份</Text>
              <Picker
                mode="selector"
                range={provinces}
                value={provinceIndex}
                onChange={(e) => setProvinceIndex(Number(e.detail.value))}>
                <View className="w-full px-4 py-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <Text className="text-sm text-gray-800">{provinces[provinceIndex] || '请选择省份'}</Text>
                  <View className="i-mdi-chevron-down text-lg text-gray-400" />
                </View>
              </Picker>
            </View>

            {/* 城市 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">城市</Text>
              <Input
                className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm"
                value={city}
                onInput={(e) => setCity(e.detail.value)}
                placeholder="请输入城市"
                maxlength={20}
              />
            </View>

            {/* 区县 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">区县</Text>
              <Input
                className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm"
                value={district}
                onInput={(e) => setDistrict(e.detail.value)}
                placeholder="请输入区县"
                maxlength={20}
              />
            </View>

            {/* 详细地址 */}
            <View>
              <Text className="text-sm text-gray-700 block mb-2">详细地址</Text>
              <Textarea
                className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm"
                value={addressDetail}
                onInput={(e) => setAddressDetail(e.detail.value)}
                placeholder="请输入详细地址"
                maxlength={100}
                style={{minHeight: '80px'}}
              />
            </View>
          </View>

          {/* 紧急联系人 */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow">
            <Text className="text-base font-bold text-gray-800 block mb-4">紧急联系人</Text>

            {/* 姓名 */}
            <View className="mb-4">
              <Text className="text-sm text-gray-700 block mb-2">姓名</Text>
              <Input
                className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm"
                value={emergencyContactName}
                onInput={(e) => setEmergencyContactName(e.detail.value)}
                placeholder="请输入紧急联系人姓名"
                maxlength={20}
              />
            </View>

            {/* 电话 */}
            <View>
              <Text className="text-sm text-gray-700 block mb-2">电话</Text>
              <Input
                className="w-full px-4 py-3 bg-gray-50 rounded-lg text-sm"
                value={emergencyContactPhone}
                onInput={(e) => setEmergencyContactPhone(e.detail.value)}
                placeholder="请输入紧急联系人电话"
                type="number"
                maxlength={11}
              />
            </View>
          </View>

          {/* 保存按钮 */}
          <Button
            className="w-full text-base break-keep"
            size="default"
            style={{
              backgroundColor: '#1E3A8A',
              color: 'white',
              borderRadius: '12px',
              border: 'none',
              padding: '16px'
            }}
            onClick={handleSave}
            disabled={loading}>
            保存
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}

export default ProfileEditPage
