import {Text, View} from '@tarojs/components'
import Taro, {switchTab} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useRef, useState} from 'react'
import {supabase} from '@/db/supabase'
import type {UserRole} from '@/db/types'

const IndexPage: React.FC = () => {
  const {user} = useAuth({guard: true}) // 启用 guard，自动处理未登录跳转
  const [role, setRole] = useState<UserRole | null>(null)
  const [loadingStatus, setLoadingStatus] = useState<string>('正在验证身份...')
  const [error, setError] = useState<string | null>(null)
  const hasRedirected = useRef(false) // 防止重复跳转
  const loadAttempts = useRef(0) // 加载尝试次数
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 获取用户角色
  const loadRole = useCallback(async () => {
    if (!user) {
      setLoadingStatus('等待用户认证...')
      return
    }

    // 限制重试次数
    if (loadAttempts.current >= 3) {
      console.error('[IndexPage] 加载用户角色失败：超过最大重试次数')
      setError('加载失败，请重新登录')
      setTimeout(() => {
        if (!hasRedirected.current) {
          hasRedirected.current = true
          Taro.reLaunch({url: '/pages/login/index'})
        }
      }, 2000)
      return
    }

    loadAttempts.current += 1
    setLoadingStatus(`正在获取角色信息... (${loadAttempts.current}/3)`)

    try {
      console.log('[IndexPage] 开始获取用户角色，用户ID:', user.id)

      // 查询用户角色
      const {data: userRoles, error: roleError} = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (roleError) {
        console.error('[IndexPage] 查询用户角色失败:', roleError)
        throw roleError
      }

      if (!userRoles) {
        console.error('[IndexPage] 用户角色不存在')
        setError('用户角色不存在，请联系管理员')
        setTimeout(() => {
          if (!hasRedirected.current) {
            hasRedirected.current = true
            switchTab({url: '/pages/profile/index'})
          }
        }, 2000)
        return
      }

      const userRole = userRoles.role
      console.log('[IndexPage] 用户角色获取成功:', userRole)

      setRole(userRole)
      setError(null)
    } catch (error) {
      console.error('[IndexPage] 获取用户角色失败:', error)
      setError('加载失败，正在重试...')

      // 重试
      setTimeout(() => {
        loadRole()
      }, 1000)
    }
  }, [user])

  // 设置超时处理（8秒，比之前的10秒更快）
  useEffect(() => {
    // 8秒超时
    timeoutRef.current = setTimeout(() => {
      if (!role && !hasRedirected.current) {
        console.error('[IndexPage] 加载超时')
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
  }, [role])

  // 加载用户角色
  useEffect(() => {
    if (user) {
      loadRole()
    }
  }, [user, loadRole])

  // 根据角色快速跳转
  useEffect(() => {
    if (role && !hasRedirected.current) {
      hasRedirected.current = true
      setLoadingStatus('正在跳转...')

      // 清除超时定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // 根据用户角色跳转到对应的工作台
      console.log('[IndexPage] 根据角色快速跳转:', role)

      // 根据角色跳转
      switch (role) {
        case 'DRIVER':
          switchTab({url: '/pages/driver/index'})
          break
        case 'MANAGER':
          switchTab({url: '/pages/manager/index'})
          break
        case 'BOSS':
          switchTab({url: '/pages/super-admin/index'})
          break
        default:
          console.warn('[IndexPage] 未知角色:', role)
          // 如果角色未知，跳转到个人中心
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
