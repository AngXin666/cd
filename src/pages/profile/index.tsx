import {Button, Input, ScrollView, Text, View} from '@tarojs/components'
import {showModal, showToast, useDidShow} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getCurrentUserProfile, updateProfile} from '@/db/api'
import type {Profile} from '@/db/types'

const ProfilePage: React.FC = () => {
  const {user, logout} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')

  const loadProfile = useCallback(async () => {
    const data = await getCurrentUserProfile()
    setProfile(data)
    setName(data?.name || '')
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useDidShow(() => {
    loadProfile()
  })

  const handleSave = async () => {
    if (!profile) return

    const success = await updateProfile(profile.id, {name})
    if (success) {
      showToast({title: '保存成功', icon: 'success'})
      setIsEditing(false)
      loadProfile()
    } else {
      showToast({title: '保存失败', icon: 'error'})
    }
  }

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

  return (
    <View style={{background: 'linear-gradient(to bottom, #F8FAFC, #E2E8F0)', minHeight: '100vh'}}>
      <ScrollView scrollY className="box-border" style={{height: '100vh', background: 'transparent'}}>
        <View className="p-4">
          {/* 用户信息卡片 */}
          <View className="bg-white rounded-lg p-6 mb-4 shadow">
            <View className="flex flex-col items-center mb-6">
              <View className="i-mdi-account-circle text-7xl text-blue-900 mb-3" />
              {isEditing ? (
                <Input
                  className="text-center text-xl font-bold text-gray-800 border-b-2 border-blue-900 px-4 py-2"
                  value={name}
                  onInput={(e) => setName(e.detail.value)}
                  placeholder="请输入姓名"
                />
              ) : (
                <Text className="text-xl font-bold text-gray-800 block mb-2">{profile?.name || '未设置姓名'}</Text>
              )}
              <View className={`${getRoleBgColor(profile?.role || '')} px-3 py-1 rounded-full mt-2`}>
                <Text className={`text-sm font-medium ${getRoleTextColor(profile?.role || '')}`}>
                  {getRoleText(profile?.role || '')}
                </Text>
              </View>
            </View>

            <View className="border-t border-gray-200 pt-4">
              <View className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                <Text className="text-sm text-gray-600">手机号</Text>
                <Text className="text-sm text-gray-800">{profile?.phone || '未设置'}</Text>
              </View>
              <View className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                <Text className="text-sm text-gray-600">邮箱</Text>
                <Text className="text-sm text-gray-800">{profile?.email || '未设置'}</Text>
              </View>
              <View className="flex justify-between items-center">
                <Text className="text-sm text-gray-600">用户ID</Text>
                <Text className="text-xs text-gray-400">{user?.id?.substring(0, 16)}...</Text>
              </View>
            </View>

            <View className="mt-6">
              {isEditing ? (
                <View className="flex gap-2">
                  <Button
                    className="flex-1 text-sm break-keep"
                    size="default"
                    style={{
                      backgroundColor: '#1E3A8A',
                      color: 'white',
                      borderRadius: '8px',
                      border: 'none'
                    }}
                    onClick={handleSave}>
                    保存
                  </Button>
                  <Button
                    className="flex-1 text-sm break-keep"
                    size="default"
                    style={{
                      backgroundColor: '#E5E7EB',
                      color: '#374151',
                      borderRadius: '8px',
                      border: 'none'
                    }}
                    onClick={() => {
                      setIsEditing(false)
                      setName(profile?.name || '')
                    }}>
                    取消
                  </Button>
                </View>
              ) : (
                <Button
                  className="w-full text-sm break-keep"
                  size="default"
                  style={{
                    backgroundColor: '#1E3A8A',
                    color: 'white',
                    borderRadius: '8px',
                    border: 'none'
                  }}
                  onClick={() => setIsEditing(true)}>
                  编辑资料
                </Button>
              )}
            </View>
          </View>

          {/* 功能菜单 */}
          <View className="bg-white rounded-lg mb-4 shadow overflow-hidden">
            <View className="flex items-center justify-between p-4 border-b border-gray-100">
              <View className="flex items-center">
                <View className="i-mdi-bell text-2xl text-blue-900 mr-3" />
                <Text className="text-sm text-gray-800">消息通知</Text>
              </View>
              <View className="i-mdi-chevron-right text-xl text-gray-400" />
            </View>
            <View className="flex items-center justify-between p-4 border-b border-gray-100">
              <View className="flex items-center">
                <View className="i-mdi-shield-lock text-2xl text-blue-900 mr-3" />
                <Text className="text-sm text-gray-800">隐私设置</Text>
              </View>
              <View className="i-mdi-chevron-right text-xl text-gray-400" />
            </View>
            <View className="flex items-center justify-between p-4">
              <View className="flex items-center">
                <View className="i-mdi-help-circle text-2xl text-blue-900 mr-3" />
                <Text className="text-sm text-gray-800">帮助与反馈</Text>
              </View>
              <View className="i-mdi-chevron-right text-xl text-gray-400" />
            </View>
          </View>

          {/* 退出登录 */}
          <Button
            className="w-full text-sm break-keep"
            size="default"
            style={{
              backgroundColor: '#EF4444',
              color: 'white',
              borderRadius: '8px',
              border: 'none'
            }}
            onClick={handleLogout}>
            <View className="flex items-center justify-center">
              <View className="i-mdi-logout mr-2" />
              <Text>退出登录</Text>
            </View>
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}

export default ProfilePage
