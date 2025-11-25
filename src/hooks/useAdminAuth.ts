import {redirectTo, showToast} from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import {useCallback, useEffect, useState} from 'react'
import {getCurrentUserProfile} from '@/db/api'
import type {Profile} from '@/db/types'

/**
 * 管理员权限验证 Hook
 * 仅允许管理员和超级管理员访问
 */
export const useAdminAuth = () => {
  const {user} = useAuth({guard: true})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const data = await getCurrentUserProfile()
      setProfile(data)

      // 检查权限：只允许管理员和超级管理员访问
      if (data && (data.role === 'manager' || data.role === 'super_admin')) {
        setIsAuthorized(true)
      } else {
        showToast({
          title: '无权限访问，仅限管理员使用',
          icon: 'none',
          duration: 2000
        })
        // 延迟跳转到工作台
        setTimeout(() => {
          redirectTo({url: '/pages/dashboard/index'})
        }, 2000)
      }
    } catch (error) {
      console.error('权限验证失败:', error)
      showToast({
        title: '权限验证失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return {
    profile,
    isAuthorized,
    isLoading
  }
}
