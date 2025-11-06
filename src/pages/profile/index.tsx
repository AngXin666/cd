import {Image, ScrollView, Text, View} from '@tarojs/components'
import {navigateTo, showModal, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useState} from 'react'
import {getCurrentUserProfile} from '@/db/api'
import type {Profile} from '@/db/types'

const ProfilePage: React.FC = () => {
  const {user, logout} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = useCallback(async () => {
    const data = await getCurrentUserProfile()
    setProfile(data)
  }, [])

  useDidShow(() => {
    loadProfile()
  })

  const handleLogout = () => {
    showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout()
        }
      }
    })
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'driver':
        return '司机'
      case 'manager':
        return '管理员'
      case 'super_admin':
        return '超级管理员'
      default:
        return '未知'
    }
  }

  const getRoleBgColor = (role: string) => {
    switch (role) {
      case 'driver':
        return 'bg-blue-100'
      case 'manager':
        return 'bg-orange-100'
      case 'super_admin':
        return 'bg-red-100'
      default:
        return 'bg-gray-100'
    }
  }

  const getRoleTextColor = (role: string) => {
    switch (role) {
      case 'driver':
        return 'text-blue-900'
      case 'manager':
        return 'text-orange-600'
      case 'super_admin':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  // 隐藏手机号中间4位
  const maskPhone = (phone: string | null) => {
    if (!phone) return '未设置'
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 用户信息卡片 */}
          <View className="bg-white rounded-xl p-6 mb-4 shadow">
            <View className="flex flex-col items-center mb-6">
              {/* 头像 */}
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  mode="aspectFill"
                  className="w-20 h-20 rounded-full mb-3"
                  style={{border: '3px solid #1E3A8A'}}
                />
              ) : (
                <View className="i-mdi-account-circle text-7xl text-blue-900 mb-3" />
              )}

              {/* 姓名和昵称 */}
              <Text className="text-xl font-bold text-gray-800 block mb-1">
                {profile?.name || profile?.nickname || '未设置姓名'}
              </Text>
              {profile?.nickname && profile?.name && (
                <Text className="text-sm text-gray-500 block mb-2">@{profile.nickname}</Text>
              )}

              {/* 角色标签 */}
              <View className={`${getRoleBgColor(profile?.role || '')} px-3 py-1 rounded-full mt-2`}>
                <Text className={`text-sm font-medium ${getRoleTextColor(profile?.role || '')}`}>
                  {getRoleText(profile?.role || '')}
                </Text>
              </View>
            </View>

            {/* 基本信息 */}
            <View className="border-t border-gray-200 pt-4">
              <View className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                <View className="flex items-center">
                  <View className="i-mdi-phone text-lg text-gray-600 mr-2" />
                  <Text className="text-sm text-gray-600">手机号</Text>
                </View>
                <Text className="text-sm text-gray-800">{maskPhone(profile?.phone)}</Text>
              </View>

              <View className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                <View className="flex items-center">
                  <View className="i-mdi-email text-lg text-gray-600 mr-2" />
                  <Text className="text-sm text-gray-600">邮箱</Text>
                </View>
                <Text className="text-sm text-gray-800">{profile?.email || '未设置'}</Text>
              </View>

              {profile?.address_province && (
                <View className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                  <View className="flex items-center">
                    <View className="i-mdi-map-marker text-lg text-gray-600 mr-2" />
                    <Text className="text-sm text-gray-600">居住地</Text>
                  </View>
                  <Text className="text-sm text-gray-800">
                    {profile.address_province} {profile.address_city}
                  </Text>
                </View>
              )}

              {profile?.emergency_contact_name && (
                <View className="flex justify-between items-center">
                  <View className="flex items-center">
                    <View className="i-mdi-account-alert text-lg text-gray-600 mr-2" />
                    <Text className="text-sm text-gray-600">紧急联系人</Text>
                  </View>
                  <Text className="text-sm text-gray-800">
                    {profile.emergency_contact_name} {maskPhone(profile.emergency_contact_phone)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 功能菜单 */}
          <View className="bg-white rounded-xl mb-4 shadow overflow-hidden">
            {/* 编辑资料 */}
            <View
              className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50 transition-all"
              onClick={() => navigateTo({url: '/pages/profile/edit/index'})}>
              <View className="flex items-center">
                <View className="i-mdi-account-edit text-2xl text-blue-900 mr-3" />
                <Text className="text-sm text-gray-800">编辑资料</Text>
              </View>
              <View className="i-mdi-chevron-right text-xl text-gray-400" />
            </View>

            {/* 设置 */}
            <View
              className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50 transition-all"
              onClick={() => navigateTo({url: '/pages/profile/settings/index'})}>
              <View className="flex items-center">
                <View className="i-mdi-cog text-2xl text-blue-900 mr-3" />
                <Text className="text-sm text-gray-800">设置</Text>
              </View>
              <View className="i-mdi-chevron-right text-xl text-gray-400" />
            </View>

            {/* 帮助与反馈 */}
            <View
              className="flex items-center justify-between p-4 active:bg-gray-50 transition-all"
              onClick={() => navigateTo({url: '/pages/profile/help/index'})}>
              <View className="flex items-center">
                <View className="i-mdi-help-circle text-2xl text-blue-900 mr-3" />
                <Text className="text-sm text-gray-800">帮助与反馈</Text>
              </View>
              <View className="i-mdi-chevron-right text-xl text-gray-400" />
            </View>
          </View>

          {/* 退出登录 */}
          <View className="bg-white rounded-xl p-4 shadow active:scale-95 transition-all" onClick={handleLogout}>
            <View className="flex items-center justify-center">
              <View className="i-mdi-logout text-xl text-red-600 mr-2" />
              <Text className="text-base font-medium text-red-600">退出登录</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

export default ProfilePage
