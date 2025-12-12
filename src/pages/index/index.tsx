import {Text, View} from '@tarojs/components'
import Taro, {switchTab} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useEffect, useRef, useState} from 'react'
import {useUserContext} from '@/contexts/UserContext'

const IndexPage: React.FC = () => {
  const {user} = useAuth({guard: true}) // 启用 guard，自动处理未登录跳转
  const {role, loading} = useUserContext() // 从UserContext获取用户角色
  const [loadingStatus, setLoadingStatus] = useState<string>('正在验证身份...')
  const [error, setError] = useState<string | null>(null)
  const hasRedirected = useRef(false) // 防止重复跳转
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 设置超时处理（8秒）
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!role && !hasRedirected.current && !loading) {
        setError('加载超时，请重新登录')
        setTimeout(() => {
          if (!hasRedirected.current) {
            hasRedirected.current = true
            Taro.reLaunch({url: '/pages/login/index'})
          }
        }, 2000)
      }
    }, 8000)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [role, loading])

  // 根据角色快速跳转
  useEffect(() => {
    if (role && !hasRedirected.current) {
      hasRedirected.current = true
      setLoadingStatus('正在跳转...')

      // 清除超时定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // 根据角色跳转
      switch (role) {
        case 'DRIVER':
          switchTab({url: '/pages/driver/index'})
          break
        case 'MANAGER':
          switchTab({url: '/pages/manager/index'})
          break
        case 'BOSS':
        case 'PEER_ADMIN':
          switchTab({url: '/pages/super-admin/index'})
          break
        default:
          switchTab({url: '/pages/profile/index'})
      }
    }
  }, [role])

  return (
    <View className="flex items-center justify-center" style={{minHeight: '100vh', background: '#F8FAFC'}}>
      <View className="text-center px-8">
        <View className="i-mdi-loading animate-spin text-6xl text-blue-900 mb-4" />
        <Text className="text-gray-800 text-lg block mb-2">{loadingStatus}</Text>
        {error && (
          <View className="mt-4 p-4 bg-red-50 rounded-lg">
            <View className="i-mdi-alert-circle text-2xl text-red-600 mb-2" />
            <Text className="text-red-600 text-sm block">{error}</Text>
          </View>
        )}
        {!error && (
          <Text className="text-gray-500 text-xs block mt-2">
            {user ? `用户ID: ${user.id.substring(0, 8)}...` : '等待认证...'}
          </Text>
        )}
      </View>
    </View>
  )
}

export default IndexPage
