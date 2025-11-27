/**
 * 租户 Supabase 客户端管理器
 *
 * 功能：
 * 1. 根据用户所属租户动态创建 Supabase 客户端
 * 2. 缓存客户端实例，避免重复创建
 * 3. 支持切换租户
 */

import {createClient, type SupabaseClient} from '@supabase/supabase-js'
import Taro from '@tarojs/taro'
import {customFetch} from './supabase'

// 租户配置接口
export interface TenantConfig {
  id: string
  tenant_name: string
  schema_name: string
  supabase_url: string
  supabase_anon_key: string
  status: string
}

// 客户端缓存
const clientCache = new Map<string, SupabaseClient>()

// 当前租户配置
let currentTenantConfig: TenantConfig | null = null

/**
 * 获取租户配置
 * @param userId 用户ID
 * @returns 租户配置
 */
export async function getTenantConfig(userId: string): Promise<TenantConfig | null> {
  try {
    // 从本地存储获取缓存的配置
    const cachedConfig = await Taro.getStorage({key: `tenant-config-${userId}`})
    if (cachedConfig.data) {
      return JSON.parse(cachedConfig.data) as TenantConfig
    }
  } catch (_error) {
    console.log('本地缓存中没有租户配置，将从服务器获取')
  }

  // 从服务器获取配置
  try {
    const {supabase} = await import('./supabase')
    const {data, error} = await supabase.rpc('get_tenant_config', {user_id: userId})

    if (error) {
      console.error('获取租户配置失败:', error)
      return null
    }

    if (!data || data.length === 0) {
      console.error('未找到租户配置')
      return null
    }

    const config = data[0] as TenantConfig

    // 缓存到本地存储
    await Taro.setStorage({
      key: `tenant-config-${userId}`,
      data: JSON.stringify(config)
    })

    return config
  } catch (error) {
    console.error('获取租户配置异常:', error)
    return null
  }
}

/**
 * 创建租户 Supabase 客户端
 * @param config 租户配置
 * @returns Supabase 客户端
 */
export function createTenantSupabaseClient(config: TenantConfig): SupabaseClient {
  const appId: string = process.env.TARO_APP_APP_ID

  // 检查缓存
  const cacheKey = config.id
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!
  }

  // 自定义Storage适配器
  const taroStorage = {
    getItem: async (key: string): Promise<string | null> => {
      try {
        const value = await Taro.getStorage({key})
        return value.data
      } catch {
        return null
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        await Taro.setStorage({key, data: value})
      } catch (error) {
        console.error('存储session失败:', error)
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        await Taro.removeStorage({key})
      } catch (error) {
        console.error('删除session失败:', error)
      }
    }
  }

  // 创建客户端
  const client = createClient(config.supabase_url, config.supabase_anon_key, {
    global: {
      fetch: customFetch
    },
    auth: {
      storageKey: `${appId}-${config.id}-auth-token`,
      storage: taroStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })

  // 缓存客户端
  clientCache.set(cacheKey, client)

  return client
}

/**
 * 获取当前租户的 Supabase 客户端
 * @returns Supabase 客户端
 */
export async function getTenantSupabaseClient(): Promise<SupabaseClient> {
  // 如果已有当前租户配置，直接返回客户端
  if (currentTenantConfig) {
    return createTenantSupabaseClient(currentTenantConfig)
  }

  // 获取当前用户
  const {supabase} = await import('./supabase')
  const {
    data: {user}
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('用户未登录')
  }

  // 获取租户配置
  const config = await getTenantConfig(user.id)
  if (!config) {
    throw new Error('未找到租户配置')
  }

  // 保存当前租户配置
  currentTenantConfig = config

  // 创建并返回客户端
  return createTenantSupabaseClient(config)
}

/**
 * 切换租户
 * @param userId 用户ID
 */
export async function switchTenant(userId: string): Promise<void> {
  // 清除当前租户配置
  currentTenantConfig = null

  // 清除本地缓存
  try {
    await Taro.removeStorage({key: `tenant-config-${userId}`})
  } catch (error) {
    console.error('清除租户配置缓存失败:', error)
  }

  // 重新获取租户配置
  const config = await getTenantConfig(userId)
  if (config) {
    currentTenantConfig = config
  }
}

/**
 * 清除所有客户端缓存
 */
export function clearClientCache(): void {
  clientCache.clear()
  currentTenantConfig = null
}

/**
 * 获取当前租户配置
 * @returns 当前租户配置
 */
export function getCurrentTenantConfig(): TenantConfig | null {
  return currentTenantConfig
}
