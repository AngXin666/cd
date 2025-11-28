import {Text, View} from '@tarojs/components'
import Taro, {reLaunch, switchTab} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import type React from 'react'
import {useCallback, useEffect, useRef, useState} from 'react'
import {checkUserLeaseStatus, getCurrentUserRoleAndTenant} from '@/db/api'
import {supabase} from '@/db/supabase'
import type {UserRole} from '@/db/types'

const IndexPage: React.FC = () => {
  const {user, isAuthenticated} = useAuth() // 移除 guard: true
  const [role, setRole] = useState<UserRole | null>(null)
  const [loadingStatus, setLoadingStatus] = useState<string>('正在验证身份...')
  const [error, setError] = useState<string | null>(null)
  const [isSystemAdmin, setIsSystemAdmin] = useState(false)
  const hasRedirected = useRef(false) // 防止重复跳转
  const loadAttempts = useRef(0) // 加载尝试次数
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 检查认证状态，未登录则跳转到登录页
  useEffect(() => {
    // 等待认证状态确定
    if (isAuthenticated === false && !hasRedirected.current) {
      console.log('[IndexPage] 用户未登录，跳转到登录页')
      hasRedirected.current = true
      Taro.reLaunch({url: '/pages/login/index'})
    }
  }, [isAuthenticated])

  // 检查是否是系统管理员
  const checkSystemAdmin = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const {data, error} = await supabase
        .from('system_admins')
        .select('id')
        .eq('id', userId)
        .eq('status', 'active')
        .maybeSingle()

      if (error) {
        console.error('[IndexPage] 检查系统管理员失败:', error)
        return false
      }

      return !!data
    } catch (error) {
      console.error('[IndexPage] 检查系统管理员异常:', error)
      return false
    }
  }, [])

  // 快速获取用户角色（只查询 role 字段，不获取完整档案）
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

      // 1. 先检查是否是系统管理员
      const isSysAdmin = await checkSystemAdmin(user.id)
      if (isSysAdmin) {
        console.log('[IndexPage] 用户是系统管理员')
        setIsSystemAdmin(true)
        setRole('super_admin') // 设置一个角色以触发跳转
        setError(null)
        return
      }

      // 2. 不是系统管理员，获取租户用户角色
      const userInfo = await getCurrentUserRoleAndTenant()

      if (!userInfo) {
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

      const {role: userRole, tenant_id} = userInfo
      console.log('[IndexPage] 用户角色获取成功:', userRole, '租户ID:', tenant_id)

      // 检查租期状态
      // 只对租户内的账号进行检查（tenant_id 不为 NULL）
      // 系统超级管理员（tenant_id 为 NULL）、租赁管理员、司机不需要检查
      const needLeaseCheck = tenant_id !== null && (userRole === 'super_admin' || userRole === 'manager')

      if (needLeaseCheck) {
        console.log('[IndexPage] 需要检查租期状态')
        setLoadingStatus('正在检查租期状态...')
        const leaseStatus = await checkUserLeaseStatus(user.id)

        if (leaseStatus.status !== 'ok') {
          console.log('[IndexPage] 租期检查失败:', leaseStatus)
          setError(leaseStatus.message || '账户已过期')

          // 显示提示后阻止跳转
          Taro.showModal({
            title: '账户已过期',
            content: leaseStatus.message || '账户已过期',
            showCancel: false,
            confirmText: '我知道了',
            success: () => {
              // 跳转到个人中心，让用户查看详情或联系管理员
              if (!hasRedirected.current) {
                hasRedirected.current = true
                switchTab({url: '/pages/profile/index'})
              }
            }
          })
          return
        }
      } else {
        console.log('[IndexPage] 无需检查租期状态，角色:', userRole, '租户ID:', tenant_id)
      }

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
  }, [user, checkSystemAdmin])

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
    if (isAuthenticated && user) {
      loadRole()
    }
  }, [isAuthenticated, user, loadRole])

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
      // 使用 reLaunch 清空页面栈，避免循环跳转
      console.log('[IndexPage] 根据角色快速跳转:', role, '是否系统管理员:', isSystemAdmin)

      // 系统管理员跳转到中央管理系统
      if (isSystemAdmin) {
        reLaunch({url: '/pages/central-admin/tenants/index'})
        return
      }

      // 租户用户根据角色跳转
      switch (role) {
        case 'driver':
          reLaunch({url: '/pages/driver/index'})
          break
        case 'manager':
          reLaunch({url: '/pages/manager/index'})
          break
        case 'super_admin':
        case 'boss':
        case 'peer_admin':
          // 超级管理员、老板、平级管理员都跳转到超级管理员页面
          reLaunch({url: '/pages/super-admin/index'})
          break
        default:
          console.warn('[IndexPage] 未知角色:', role)
          // 如果角色未知，跳转到个人中心
          switchTab({url: '/pages/profile/index'})
      }
    }
  }, [role, isSystemAdmin])

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
