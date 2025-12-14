/**
 * Taro API Mock
 * 用于测试环境中模拟 Taro API
 *
 * 包含所有常用的 Taro API Mock，特别是 Storage 相关 API
 */
import {vi} from 'vitest'

// 内存存储，用于模拟 localStorage
const storage = new Map<string, string>()

// UI 相关 API
export const showToast = vi.fn()
export const showLoading = vi.fn()
export const hideLoading = vi.fn()
export const showModal = vi.fn().mockResolvedValue({confirm: true})

// 导航相关 API
export const navigateTo = vi.fn()
export const redirectTo = vi.fn()
export const switchTab = vi.fn()
export const navigateBack = vi.fn()

// 下拉刷新
export const usePullDownRefresh = vi.fn()

// Storage 相关 API（同步版本）
export const getStorageSync = vi.fn((key: string) => {
  const value = storage.get(key)
  return value ? JSON.parse(value) : undefined
})

export const setStorageSync = vi.fn((key: string, data: any) => {
  storage.set(key, JSON.stringify(data))
})

export const removeStorageSync = vi.fn((key: string) => {
  storage.delete(key)
})

export const clearStorageSync = vi.fn(() => {
  storage.clear()
})

export const getStorageInfoSync = vi.fn(() => ({
  keys: Array.from(storage.keys()),
  currentSize: Array.from(storage.values()).reduce((sum, val) => sum + val.length, 0),
  limitSize: 10240 // 10MB
}))

// Storage 相关 API（异步版本）
export const getStorage = vi.fn((options: {key: string; success?: (res: any) => void; fail?: (err: any) => void}) => {
  try {
    const data = getStorageSync(options.key)
    options.success?.({data})
    return Promise.resolve({data})
  } catch (error) {
    options.fail?.(error)
    return Promise.reject(error)
  }
})

export const setStorage = vi.fn(
  (options: {key: string; data: any; success?: () => void; fail?: (err: any) => void}) => {
    try {
      setStorageSync(options.key, options.data)
      options.success?.()
      return Promise.resolve()
    } catch (error) {
      options.fail?.(error)
      return Promise.reject(error)
    }
  }
)

export const removeStorage = vi.fn((options: {key: string; success?: () => void; fail?: (err: any) => void}) => {
  try {
    removeStorageSync(options.key)
    options.success?.()
    return Promise.resolve()
  } catch (error) {
    options.fail?.(error)
    return Promise.reject(error)
  }
})

export const clearStorage = vi.fn((options?: {success?: () => void; fail?: (err: any) => void}) => {
  try {
    clearStorageSync()
    options?.success?.()
    return Promise.resolve()
  } catch (error) {
    options?.fail?.(error)
    return Promise.reject(error)
  }
})

export const getStorageInfo = vi.fn((options?: {success?: (res: any) => void; fail?: (err: any) => void}) => {
  try {
    const info = getStorageInfoSync()
    options?.success?.(info)
    return Promise.resolve(info)
  } catch (error) {
    options?.fail?.(error)
    return Promise.reject(error)
  }
})

// 默认导出
const Taro = {
  // UI
  showToast,
  showLoading,
  hideLoading,
  showModal,

  // 导航
  navigateTo,
  redirectTo,
  switchTab,
  navigateBack,

  // 下拉刷新
  usePullDownRefresh,

  // Storage（同步）
  getStorageSync,
  setStorageSync,
  removeStorageSync,
  clearStorageSync,
  getStorageInfoSync,

  // Storage（异步）
  getStorage,
  setStorage,
  removeStorage,
  clearStorage,
  getStorageInfo
}

export default Taro
