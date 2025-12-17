import {Text, View} from '@tarojs/components'
import Taro, {switchTab} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useEffect, useRef, useState} from 'react'
import SafeAreaTop from '@/components/SafeAreaTop'
import TopNavBar from '@/components/TopNavBar'
import {useBackButtonBlock} from '@/hooks'
import {useUserContext} from '@/contexts/UserContext'
import {hideLoading, showLoading} from '@/utils/taroCompat'

const IndexPage: React.FC = () => {
  const {user} = useAuth({guard: true}) // 启用 guard，自动处理未登录跳转
  const {role, loading} = useUserContext() // 从UserContext获取用户角色
  const [loadingStatus, setLoadingStatus] = useState<string>('正在验证身份...')
  const [error, setError] = useState<string | null>(null)
  const hasRedirected = useRef(false) // 防止重复跳转
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 首页返回键拦截：防止用户在首页按返回键退出应用
  useBackButtonBlock(true, false) // 不显示提示，直接阻止返回

  // 显示加载状态
  useEffect(() => {
    if (!error && !hasRedirected.current) {
      showLoading({title: loadingStatus})
    }
    return () => {
      hideLoading()
    }
  }, [loadingStatus, error])

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

  // 加载状态由 showLoading/hideLoading 处理
  // 只在出错时显示错误信息
  if (error) {
    return (
      <View style={{minHeight: '100vh', background: '#F8FAFC'}}>
        <SafeAreaTop backgroundColor="#F8FAFC" />
        <TopNavBar />
        <View className="flex items-center justify-center" style={{minHeight: 'calc(100vh - 44px)'}}>
          <View className="text-center px-8">
            <View className="mt-4 p-4 bg-red-50 rounded-lg">
              <View className="i-mdi-alert-circle text-2xl text-red-600 mb-2" />
              <Text className="text-red-600 text-sm block">{error}</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  // 正常加载时返回空视图，加载状态由 showLoading 显示
  return null
}

export default IndexPage
