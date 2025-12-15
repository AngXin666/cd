import {createClient} from '@supabase/supabase-js'
import Taro, {showToast} from '@tarojs/taro'

const supabaseUrl: string = process.env.TARO_APP_SUPABASE_URL
const supabaseAnonKey: string = process.env.TARO_APP_SUPABASE_ANON_KEY || 'TOKEN'
const appId: string = process.env.TARO_APP_APP_ID

// 输出环境配置信息(仅开发环境)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 [Supabase配置]', {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '(未配置)',
    hasAnonKey: !!supabaseAnonKey && supabaseAnonKey !== 'TOKEN',
    appId: appId || '(未配置)',
    env: process.env.TARO_ENV || 'unknown'
  })
}

let noticed = false

// 检测当前运行环境
const isH5 = process.env.TARO_ENV === 'h5'

export const customFetch: typeof fetch = async (url: string, options: RequestInit) => {
  // H5环境直接使用原生fetch
  if (isH5) {
    console.log('🌐 [H5 Fetch]', {
      url,
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body ? '(有数据)' : '(无数据)'
    })
    const response = await fetch(url, options)
    console.log('✅ [H5 Response]', {
      url,
      status: response.status,
      ok: response.ok
    })
    return response
  }

  // 小程序环境使用Taro.request
  let headers: HeadersInit = options.headers || {}
  const {method = 'GET', body} = options

  if (options.headers instanceof Map) {
    headers = Object.fromEntries(options.headers)
  }

  console.log('📱 [小程序 Request]', {url, method, headers})

  const startTime = Date.now()
  const res = await Taro.request({
    url,
    method: method as keyof Taro.request.Method,
    header: headers,
    data: body,
    responseType: 'text'
  })
  const _duration = Date.now() - startTime

  console.log('✅ [小程序 Response]', {
    url,
    status: res.statusCode,
    duration: `${_duration}ms`
  })

  // 只在错误时输出详细错误
  if (res.statusCode >= 400) {
    console.error('❌ HTTP请求失败:', {
      method,
      url,
      status: res.statusCode,
      data: res.data
    })
  }

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

// 自定义Storage适配器，根据环境使用不同的存储API
const taroStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // H5环境使用localStorage
      if (isH5) {
        return localStorage.getItem(key)
      }
      // 小程序环境使用Taro存储
      const value = await Taro.getStorage({key})
      return value.data
    } catch (_error) {
      return null
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      // H5环境使用localStorage
      if (isH5) {
        localStorage.setItem(key, value)
        return
      }
      // 小程序环境使用Taro存储
      await Taro.setStorage({key, data: value})
    } catch (error) {
      console.error('Storage写入失败:', key, error)
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      // H5环境使用localStorage
      if (isH5) {
        localStorage.removeItem(key)
        return
      }
      // 小程序环境使用Taro存储
      await Taro.removeStorage({key})
    } catch (error) {
      console.error('Storage删除失败:', key, error)
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
    },
    // 增加超时时间，避免在移动网络下过早超时
    timeout: 30000,
    // 心跳间隔（毫秒）
    heartbeatIntervalMs: 15000,
    // 重连延迟（毫秒）
    reconnectAfterMs: (tries: number) => {
      // 指数退避：1s, 2s, 4s, 8s, 最大 30s
      return Math.min(1000 * Math.pow(2, tries), 30000)
    }
  }
})

// 监听 Realtime 连接状态（调试用）
if (process.env.NODE_ENV === 'development' || process.env.TARO_ENV === 'h5') {
  console.log('🔌 [Supabase] Realtime 配置已增强，超时时间: 30s')
}
