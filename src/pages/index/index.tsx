import {View} from '@tarojs/components'
import {redirectTo, switchTab} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {getCurrentUserProfile} from '@/db/api'
import type {Profile} from '@/db/types'

const IndexPage: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)

  const loadProfile = useCallback(async () => {
    const data = await getCurrentUserProfile()
    setProfile(data)
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    if (profile?.role) {
      // 根据用户角色跳转到对应的工作台
      switch (profile.role) {
        case 'driver':
          redirectTo({url: '/pages/driver/index'})
          break
        case 'manager':
          redirectTo({url: '/pages/manager/index'})
          break
        case 'super_admin':
          redirectTo({url: '/pages/super-admin/index'})
          break
        default:
          // 如果角色未知，跳转到个人中心
          switchTab({url: '/pages/profile/index'})
      }
    }
  }, [profile])

  return (
    <View className="flex items-center justify-center" style={{minHeight: '100vh', background: '#F8FAFC'}}>
      <View className="text-center">
        <View className="i-mdi-loading animate-spin text-6xl text-blue-900 mb-4" />
        <View className="text-gray-600">加载中...</View>
      </View>
    </View>
  )
}

export default IndexPage
