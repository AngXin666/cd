/**
 * 权限上下文Hook
 * 用于在React组件中访问和管理用户权限上下文
 */

import Taro from '@tarojs/taro'
import {useAuth} from 'miaoda-auth-taro'
import {useCallback, useEffect, useState} from 'react'
import * as PermissionContextAPI from '@/db/api/permission-context'
import type {
  AdminPermissionContext,
  DriverPermissionContext,
  ManagerPermissionContext,
  PermissionContext,
  SchedulerPermissionContext
} from '@/types/permission-context'

/**
 * 权限上下文存储键
 */
const PERMISSION_CONTEXT_KEY = 'permission_context'
const PERMISSION_CONTEXT_TIMESTAMP_KEY = 'permission_context_timestamp'
const PERMISSION_CONTEXT_CACHE_DURATION = 30 * 60 * 1000 // 30分钟缓存

/**
 * 权限上下文Hook返回值
 */
export interface UsePermissionContextReturn {
  // 权限上下文
  context: PermissionContext | null
  // 是否正在加载
  loading: boolean
  // 错误信息
  error: string | null
  // 刷新权限上下文
  refresh: () => Promise<void>
  // 清除权限上下文
  clear: () => void
  // 类型守卫函数
  isDriver: () => boolean
  isManager: () => boolean
  isScheduler: () => boolean
  isAdmin: () => boolean
  // 权限检查函数
  hasFullControl: () => boolean
  hasViewOnly: () => boolean
}

/**
 * 权限上下文Hook
 * @param autoLoad 是否自动加载权限上下文（默认：true）
 * @returns 权限上下文Hook返回值
 */
export function usePermissionContext(autoLoad: boolean = true): UsePermissionContextReturn {
  const {user} = useAuth()
  const [context, setContext] = useState<PermissionContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * 从缓存加载权限上下文
   */
  const loadFromCache = useCallback((): PermissionContext | null => {
    try {
      const cachedContext = Taro.getStorageSync(PERMISSION_CONTEXT_KEY)
      const cachedTimestamp = Taro.getStorageSync(PERMISSION_CONTEXT_TIMESTAMP_KEY)

      if (cachedContext && cachedTimestamp) {
        const now = Date.now()
        const age = now - cachedTimestamp

        // 如果缓存未过期，返回缓存数据
        if (age < PERMISSION_CONTEXT_CACHE_DURATION) {
          console.log('✅ [权限上下文] 从缓存加载，缓存年龄:', Math.floor(age / 1000), '秒')
          return cachedContext as PermissionContext
        }

        console.log('⚠️ [权限上下文] 缓存已过期，缓存年龄:', Math.floor(age / 1000), '秒')
      }
    } catch (error) {
      console.error('❌ [权限上下文] 从缓存加载失败:', error)
    }

    return null
  }, [])

  /**
   * 保存权限上下文到缓存
   */
  const saveToCache = useCallback((permissionContext: PermissionContext) => {
    try {
      Taro.setStorageSync(PERMISSION_CONTEXT_KEY, permissionContext)
      Taro.setStorageSync(PERMISSION_CONTEXT_TIMESTAMP_KEY, Date.now())
      console.log('✅ [权限上下文] 已保存到缓存')
    } catch (error) {
      console.error('❌ [权限上下文] 保存到缓存失败:', error)
    }
  }, [])

  /**
   * 加载权限上下文
   */
  const loadPermissionContext = useCallback(async () => {
    if (!user?.id) {
      console.warn('⚠️ [权限上下文] 用户未登录，跳过加载')
      return
    }

    // 先尝试从缓存加载
    const cachedContext = loadFromCache()
    if (cachedContext) {
      setContext(cachedContext)
      setError(null)
      return
    }

    // 缓存未命中，从服务器加载
    setLoading(true)
    setError(null)

    try {
      console.log('🔄 [权限上下文] 从服务器加载权限上下文')
      const response = await PermissionContextAPI.getPermissionContext(user.id)

      if (response.success && response.context) {
        setContext(response.context)
        saveToCache(response.context)
        setError(null)
        console.log('✅ [权限上下文] 权限上下文加载成功')
      } else {
        setError(response.error || '获取权限上下文失败')
        console.error('❌ [权限上下文] 权限上下文加载失败:', response.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取权限上下文异常'
      setError(errorMessage)
      console.error('❌ [权限上下文] 权限上下文加载异常:', err)
    } finally {
      setLoading(false)
    }
  }, [user, loadFromCache, saveToCache])

  /**
   * 刷新权限上下文（强制从服务器加载）
   */
  const refresh = useCallback(async () => {
    if (!user?.id) {
      console.warn('⚠️ [权限上下文] 用户未登录，跳过刷新')
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('🔄 [权限上下文] 强制刷新权限上下文')
      const response = await PermissionContextAPI.getPermissionContext(user.id)

      if (response.success && response.context) {
        setContext(response.context)
        saveToCache(response.context)
        setError(null)
        console.log('✅ [权限上下文] 权限上下文刷新成功')
      } else {
        setError(response.error || '刷新权限上下文失败')
        console.error('❌ [权限上下文] 权限上下文刷新失败:', response.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '刷新权限上下文异常'
      setError(errorMessage)
      console.error('❌ [权限上下文] 权限上下文刷新异常:', err)
    } finally {
      setLoading(false)
    }
  }, [user, saveToCache])

  /**
   * 清除权限上下文
   */
  const clear = useCallback(() => {
    setContext(null)
    setError(null)
    try {
      Taro.removeStorageSync(PERMISSION_CONTEXT_KEY)
      Taro.removeStorageSync(PERMISSION_CONTEXT_TIMESTAMP_KEY)
      console.log('✅ [权限上下文] 权限上下文已清除')
    } catch (error) {
      console.error('❌ [权限上下文] 清除权限上下文失败:', error)
    }
  }, [])

  /**
   * 类型守卫：是否为司机
   */
  const isDriver = useCallback((): boolean => {
    return context?.mode === 'own_data_only'
  }, [context])

  /**
   * 类型守卫：是否为车队长
   */
  const isManager = useCallback((): boolean => {
    return context?.mode === 'managed_resources'
  }, [context])

  /**
   * 类型守卫：是否为调度
   */
  const isScheduler = useCallback((): boolean => {
    return context?.mode === 'scheduled_resources'
  }, [context])

  /**
   * 类型守卫：是否为老板/平级管理员
   */
  const isAdmin = useCallback((): boolean => {
    return context?.mode === 'all_access'
  }, [context])

  /**
   * 权限检查：是否有完整控制权
   */
  const hasFullControl = useCallback((): boolean => {
    return context?.level === 'full_control'
  }, [context])

  /**
   * 权限检查：是否仅有查看权
   */
  const hasViewOnly = useCallback((): boolean => {
    return context?.level === 'view_only'
  }, [context])

  /**
   * 自动加载权限上下文
   */
  useEffect(() => {
    if (autoLoad && user?.id) {
      loadPermissionContext()
    }
  }, [autoLoad, user, loadPermissionContext])

  return {
    context,
    loading,
    error,
    refresh,
    clear,
    isDriver,
    isManager,
    isScheduler,
    isAdmin,
    hasFullControl,
    hasViewOnly
  }
}

/**
 * 获取司机权限上下文（类型安全）
 */
export function useDriverPermissionContext(): DriverPermissionContext | null {
  const {context, isDriver} = usePermissionContext()
  return isDriver() ? (context as DriverPermissionContext) : null
}

/**
 * 获取车队长权限上下文（类型安全）
 */
export function useManagerPermissionContext(): ManagerPermissionContext | null {
  const {context, isManager} = usePermissionContext()
  return isManager() ? (context as ManagerPermissionContext) : null
}

/**
 * 获取调度权限上下文（类型安全）
 */
export function useSchedulerPermissionContext(): SchedulerPermissionContext | null {
  const {context, isScheduler} = usePermissionContext()
  return isScheduler() ? (context as SchedulerPermissionContext) : null
}

/**
 * 获取老板/平级管理员权限上下文（类型安全）
 */
export function useAdminPermissionContext(): AdminPermissionContext | null {
  const {context, isAdmin} = usePermissionContext()
  return isAdmin() ? (context as AdminPermissionContext) : null
}
