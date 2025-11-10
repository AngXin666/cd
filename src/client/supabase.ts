import {createClient} from '@supabase/supabase-js'
import Taro, {showToast} from '@tarojs/taro'

const supabaseUrl: string = process.env.TARO_APP_SUPABASE_URL
const supabaseAnonKey: string = process.env.TARO_APP_SUPABASE_ANON_KEY || 'TOKEN'
const appId: string = process.env.TARO_APP_APP_ID

let noticed = false
export const customFetch: typeof fetch = async (url: string, options: RequestInit) => {
  let headers: HeadersInit = options.headers || {}
  const {method = 'GET', body} = options

  if (options.headers instanceof Map) {
    headers = Object.fromEntries(options.headers)
  }

  const res = await Taro.request({
    url,
    method: method as keyof Taro.request.Method,
    header: headers,
    data: body,
    responseType: 'text'
  })

  // 全局启停提示
  if (res.statusCode > 300 && res.data?.code === 'SupabaseNotReady' && !noticed) {
    const tip = res.data.message || res.data.msg || '服务端报错'
    noticed = true
    showToast({
      title: tip,
      icon: 'error',
      duration: 5000
    })
  }

  return {
    ok: res.statusCode >= 200 && res.statusCode < 300,
    status: res.statusCode,
    json: async () => res.data,
    text: async () => JSON.stringify(res.data),
    data: res.data, // 兼容小程序的返回格式
    headers: {
      get: (key: string) => res.header?.[key]
    }
  } as unknown as Response
}

// 自定义Storage适配器，使用Taro的本地存储API
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch
  },
  auth: {
    storageKey: `${appId}-auth-token`,
    storage: taroStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
  // 注意：Realtime 功能已通过不订阅任何频道来避免 WebSocket 连接
  // 如果看到 WebSocket 错误，可以忽略，不影响应用核心功能
})
