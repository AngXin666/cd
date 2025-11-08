import {View} from '@tarojs/components'
import {reLaunch, switchTab} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useRef, useState} from 'react'
import {getCurrentUserProfile} from '@/db/api'
import type {Profile} from '@/db/types'

const IndexPage: React.FC = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const hasRedirected = useRef(false) // 防止重复跳转

  const loadProfile = useCallback(async () => {
    if (!user) return
    try {
      const data = await getCurrentUserProfile()
      setProfile(data)
    } catch (error) {
      console.error('加载用户档案失败:', error)
      // 如果加载失败，跳转到个人中心
      if (!hasRedirected.current) {
        hasRedirected.current = true
        switchTab({url: '/pages/profile/index'})
      }
    }
  }, [user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    if (profile?.role && !hasRedirected.current) {
      hasRedirected.current = true
      // 根据用户角色跳转到对应的工作台
      // 使用 reLaunch 清空页面栈，避免循环跳转
      switch (profile.role) {
        case 'driver':
          reLaunch({url: '/pages/driver/index'})
          break
        case 'manager':
          reLaunch({url: '/pages/manager/index'})
          break
        case 'super_admin':
          reLaunch({url: '/pages/super-admin/index'})
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
