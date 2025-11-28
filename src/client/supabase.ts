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
      console.log('📦 [Storage] 读取:', key)
      const value = await Taro.getStorage({key})
      console.log('✅ [Storage] 读取成功:', key, '数据长度:', value.data?.length || 0)
      return value.data
    } catch (error) {
      console.log('⚠️ [Storage] 读取失败:', key, error)
      return null
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      console.log('📦 [Storage] 写入:', key, '数据长度:', value?.length || 0)
      await Taro.setStorage({key, data: value})
      console.log('✅ [Storage] 写入成功:', key)
    } catch (error) {
      console.error('❌ [Storage] 写入失败:', key, error)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      console.log('📦 [Storage] 删除:', key)
      await Taro.removeStorage({key})
      console.log('✅ [Storage] 删除成功:', key)
    } catch (error) {
      console.error('❌ [Storage] 删除失败:', key, error)
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
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})
