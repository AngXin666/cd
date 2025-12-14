/**
 * Vitest 测试环境配置
 *
 * 配置全局测试环境，包括 Mock 和测试工具
 */
import '@testing-library/jest-dom/vitest'
import {vi} from 'vitest'

// 内存存储，用于模拟 localStorage
// 使用全局变量确保在所有测试中共享
const storage = new Map<string, string>()

// 创建 Storage Mock 函数（确保每次调用都能访问最新的 storage）
const getStorageSyncMock = vi.fn((key: string) => {
  const value = storage.get(key)
  return value ? JSON.parse(value) : undefined
})

const setStorageSyncMock = vi.fn((key: string, data: any) => {
  storage.set(key, JSON.stringify(data))
})

const removeStorageSyncMock = vi.fn((key: string) => {
  storage.delete(key)
})

const clearStorageSyncMock = vi.fn(() => {
  storage.clear()
})

const getStorageInfoSyncMock = vi.fn(() => ({
  keys: Array.from(storage.keys()),
  currentSize: Array.from(storage.values()).reduce((sum, val) => sum + val.length, 0),
  limitSize: 10240 // 10MB
}))

// Mock Taro API（完整版本）
vi.mock('@tarojs/taro', () => ({
  // UI 相关
  showToast: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  showModal: vi.fn().mockResolvedValue({confirm: true}),

  // 导航相关
  navigateTo: vi.fn(),
  redirectTo: vi.fn(),
  switchTab: vi.fn(),
  navigateBack: vi.fn(),

  // 下拉刷新
  usePullDownRefresh: vi.fn(),

  // Storage 相关（同步版本）- 使用上面创建的 Mock 函数
  getStorageSync: getStorageSyncMock,
  setStorageSync: setStorageSyncMock,
  removeStorageSync: removeStorageSyncMock,
  clearStorageSync: clearStorageSyncMock,
  getStorageInfoSync: getStorageInfoSyncMock,

  // Storage 相关（异步版本）
  getStorage: vi.fn((options: {key: string; success?: (res: any) => void; fail?: (err: any) => void}) => {
    try {
      const value = storage.get(options.key)
      const data = value ? JSON.parse(value) : undefined
      options.success?.({data})
      return Promise.resolve({data})
    } catch (error) {
      options.fail?.(error)
      return Promise.reject(error)
    }
  }),

  setStorage: vi.fn((options: {key: string; data: any; success?: () => void; fail?: (err: any) => void}) => {
    try {
      storage.set(options.key, JSON.stringify(options.data))
      options.success?.()
      return Promise.resolve()
    } catch (error) {
      options.fail?.(error)
      return Promise.reject(error)
    }
  }),

  removeStorage: vi.fn((options: {key: string; success?: () => void; fail?: (err: any) => void}) => {
    try {
      storage.delete(options.key)
      options.success?.()
      return Promise.resolve()
    } catch (error) {
      options.fail?.(error)
      return Promise.reject(error)
    }
  }),

  clearStorage: vi.fn((options?: {success?: () => void; fail?: (err: any) => void}) => {
    try {
      storage.clear()
      options?.success?.()
      return Promise.resolve()
    } catch (error) {
      options?.fail?.(error)
      return Promise.reject(error)
    }
  }),

  getStorageInfo: vi.fn((options?: {success?: (res: any) => void; fail?: (err: any) => void}) => {
    try {
      const info = {
        keys: Array.from(storage.keys()),
        currentSize: Array.from(storage.values()).reduce((sum, val) => sum + val.length, 0),
        limitSize: 10240
      }
      options?.success?.(info)
      return Promise.resolve(info)
    } catch (error) {
      options?.fail?.(error)
      return Promise.reject(error)
    }
  }),

  // 默认导出 - 使用相同的 Mock 函数
  default: {
    showToast: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    showModal: vi.fn().mockResolvedValue({confirm: true}),
    navigateTo: vi.fn(),
    redirectTo: vi.fn(),
    switchTab: vi.fn(),
    navigateBack: vi.fn(),
    usePullDownRefresh: vi.fn(),
    getStorageSync: getStorageSyncMock,
    setStorageSync: setStorageSyncMock,
    removeStorageSync: removeStorageSyncMock,
    clearStorageSync: clearStorageSyncMock,
    getStorageInfoSync: getStorageInfoSyncMock,
    getStorage: vi.fn(),
    setStorage: vi.fn(),
    removeStorage: vi.fn(),
    clearStorage: vi.fn(),
    getStorageInfo: vi.fn()
  }
}))

// 在每个测试前清空 storage（可选，根据需要）
// beforeEach(() => {
//   storage.clear()
// })

// Mock miaoda-auth-taro
vi.mock('miaoda-auth-taro', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: {id: 'test-user-id'},
    isAuthenticated: true
  })
}))

// Mock Supabase
vi.mock('@/db/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
    }),
    auth: {
      signUp: vi.fn().mockResolvedValue({data: {user: {id: 'new-user-id'}}, error: null})
    }
  }
}))
