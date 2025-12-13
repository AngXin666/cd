import {renderHook, waitFor} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {useWarehousesData} from './useWarehousesData'
import type {Warehouse} from '@/db/types'

// Mock Taro
vi.mock('@tarojs/taro', () => ({
  default: {
    showToast: vi.fn()
  }
}))

// Mock Supabase
vi.mock('@/client/supabase', () => {
  const mockOn = vi.fn().mockReturnThis()
  const mockSubscribe = vi.fn().mockReturnThis()
  const mockChannel = vi.fn(() => ({
    on: mockOn,
    subscribe: mockSubscribe
  }))
  const mockRemoveChannel = vi.fn()

  return {
    supabase: {
      channel: mockChannel,
      removeChannel: mockRemoveChannel
    }
  }
})

// Mock warehouses API
const mockGetManagerWarehouses = vi.fn()
vi.mock('@/db/api/warehouses', () => ({
  getManagerWarehouses: (...args: unknown[]) => mockGetManagerWarehouses(...args)
}))

// Mock storage
const mockStorageGet = vi.fn()
const mockStorageSet = vi.fn()
const mockStorageRemove = vi.fn()

vi.mock('@/utils/storage', () => ({
  TypeSafeStorage: {
    get: (...args: unknown[]) => mockStorageGet(...args),
    set: (...args: unknown[]) => mockStorageSet(...args),
    remove: (...args: unknown[]) => mockStorageRemove(...args)
  }
}))

describe('useWarehousesData', () => {
  const mockManagerId = 'manager-123'
  const mockWarehouses: Warehouse[] = [
    {
      id: 'warehouse-1',
      name: '仓库1',
      address: '地址1',
      contact_person: '联系人1',
      contact_phone: '13800138001',
      status: 'active',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    },
    {
      id: 'warehouse-2',
      name: '仓库2',
      address: '地址2',
      contact_person: '联系人2',
      contact_phone: '13800138002',
      status: 'active',
      created_at: '2024-01-01',
      updated_at: '2024-01-01'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageGet.mockReturnValue(null)
    mockGetManagerWarehouses.mockResolvedValue(mockWarehouses)
  })

  describe('基础功能', () => {
    it('应该初始化为空状态', () => {
      const {result} = renderHook(() =>
        useWarehousesData({managerId: '', enableRealtime: false})
      )

      expect(result.current.warehouses).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('应该在挂载时加载仓库列表', async () => {
      const {result} = renderHook(() =>
        useWarehousesData({managerId: mockManagerId, enableRealtime: false})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetManagerWarehouses).toHaveBeenCalledWith(mockManagerId)
      expect(result.current.warehouses).toEqual(mockWarehouses)
      expect(result.current.error).toBeNull()
    })

    it('应该处理加载错误', async () => {
      const mockError = new Error('加载失败')
      mockGetManagerWarehouses.mockRejectedValue(mockError)

      const {result} = renderHook(() =>
        useWarehousesData({managerId: mockManagerId, enableRealtime: false})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('加载仓库列表失败')
      expect(result.current.warehouses).toEqual([])
    })
  })

  describe('缓存功能', () => {
    it('应该从缓存加载数据', async () => {
      const cachedData = {
        data: mockWarehouses,
        timestamp: Date.now(),
        managerId: mockManagerId
      }
      mockStorageGet.mockReturnValue(cachedData)

      const {result} = renderHook(() =>
        useWarehousesData({managerId: mockManagerId, enableRealtime: false, cacheEnabled: true})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockStorageGet).toHaveBeenCalled()
      expect(result.current.warehouses).toEqual(mockWarehouses)
      expect(mockGetManagerWarehouses).not.toHaveBeenCalled()
    })

    it('应该在缓存过期时重新加载', async () => {
      const expiredCache = {
        data: mockWarehouses,
        timestamp: Date.now() - 11 * 60 * 1000, // 11分钟前
        managerId: mockManagerId
      }
      mockStorageGet.mockReturnValue(expiredCache)

      const {result} = renderHook(() =>
        useWarehousesData({managerId: mockManagerId, enableRealtime: false, cacheEnabled: true})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockStorageRemove).toHaveBeenCalled()
      expect(mockGetManagerWarehouses).toHaveBeenCalled()
    })

    it('应该保存数据到缓存', async () => {
      mockStorageGet.mockReturnValue(null)

      const {result} = renderHook(() =>
        useWarehousesData({managerId: mockManagerId, enableRealtime: false, cacheEnabled: true})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockStorageSet).toHaveBeenCalledWith(
        'manager_warehouses_cache',
        expect.objectContaining({
          data: mockWarehouses,
          managerId: mockManagerId
        })
      )
    })

    it('应该在禁用缓存时不使用缓存', async () => {
      mockStorageGet.mockReturnValue({
        data: mockWarehouses,
        timestamp: Date.now(),
        managerId: mockManagerId
      })

      const {result} = renderHook(() =>
        useWarehousesData({
          managerId: mockManagerId,
          enableRealtime: false,
          cacheEnabled: false
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetManagerWarehouses).toHaveBeenCalled()
      expect(mockStorageSet).not.toHaveBeenCalled()
    })

    it('应该忽略不匹配的缓存', async () => {
      const cachedData = {
        data: mockWarehouses,
        timestamp: Date.now(),
        managerId: 'different-manager'
      }
      mockStorageGet.mockReturnValue(cachedData)

      const {result} = renderHook(() =>
        useWarehousesData({managerId: mockManagerId, enableRealtime: false, cacheEnabled: true})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetManagerWarehouses).toHaveBeenCalled()
    })
  })

  describe('刷新功能', () => {
    it('应该强制刷新数据', async () => {
      mockStorageGet.mockReturnValue({
        data: mockWarehouses,
        timestamp: Date.now(),
        managerId: mockManagerId
      })

      const {result} = renderHook(() =>
        useWarehousesData({managerId: mockManagerId, enableRealtime: false})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockGetManagerWarehouses.mockClear()

      await result.current.refresh()

      await waitFor(() => {
        expect(mockGetManagerWarehouses).toHaveBeenCalled()
      })
    })

    it('应该清除缓存', async () => {
      const {result} = renderHook(() =>
        useWarehousesData({managerId: mockManagerId, enableRealtime: false})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      result.current.clearCache()

      expect(mockStorageRemove).toHaveBeenCalledWith('manager_warehouses_cache')
    })

    it('应该在刷新时清除缓存', async () => {
      const {result} = renderHook(() =>
        useWarehousesData({managerId: mockManagerId, enableRealtime: false})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockStorageRemove.mockClear()

      await result.current.refresh()

      expect(mockStorageRemove).toHaveBeenCalled()
    })
  })

  describe('实时更新', () => {
    it('应该在启用实时更新时创建频道', async () => {
      const {supabase} = await import('@/client/supabase')

      renderHook(() =>
        useWarehousesData({managerId: mockManagerId, enableRealtime: true})
      )

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalled()
      })
    })

    it('应该在禁用实时更新时不订阅', async () => {
      const {supabase} = await import('@/client/supabase')
      vi.mocked(supabase.channel).mockClear()

      renderHook(() =>
        useWarehousesData({managerId: mockManagerId, enableRealtime: false})
      )

      await waitFor(() => {
        expect(mockGetManagerWarehouses).toHaveBeenCalled()
      })

      expect(supabase.channel).not.toHaveBeenCalled()
    })

    it('应该在卸载时清理订阅', async () => {
      const {supabase} = await import('@/client/supabase')

      const {unmount} = renderHook(() =>
        useWarehousesData({managerId: mockManagerId, enableRealtime: true})
      )

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalled()
      })

      unmount()

      await waitFor(() => {
        expect(supabase.removeChannel).toHaveBeenCalled()
      })
    })
  })

  describe('边界情况', () => {
    it('应该处理空管理员ID', () => {
      const {result} = renderHook(() =>
        useWarehousesData({managerId: '', enableRealtime: false})
      )

      expect(result.current.warehouses).toEqual([])
      expect(mockGetManagerWarehouses).not.toHaveBeenCalled()
    })

    it('应该处理管理员ID变化', async () => {
      const {result, rerender} = renderHook(
        ({managerId}) => useWarehousesData({managerId, enableRealtime: false}),
        {initialProps: {managerId: mockManagerId}}
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetManagerWarehouses).toHaveBeenCalledWith(mockManagerId)

      const newManagerId = 'manager-456'
      rerender({managerId: newManagerId})

      await waitFor(() => {
        expect(mockGetManagerWarehouses).toHaveBeenCalledWith(newManagerId)
      })
    })

    it('应该处理空仓库列表', async () => {
      mockGetManagerWarehouses.mockResolvedValue([])

      const {result} = renderHook(() =>
        useWarehousesData({managerId: mockManagerId, enableRealtime: false})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.warehouses).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('应该在错误时返回空数组', async () => {
      mockGetManagerWarehouses.mockRejectedValue(new Error('网络错误'))

      const {result} = renderHook(() =>
        useWarehousesData({managerId: mockManagerId, enableRealtime: false})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.warehouses).toEqual([])
    })
  })
})
