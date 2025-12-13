import {renderHook, waitFor} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {useDashboardData} from './useDashboardData'

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

// Mock dashboard API
const mockGetWarehouseDashboardStats = vi.fn()
vi.mock('@/db/api/dashboard', () => ({
  getWarehouseDashboardStats: (...args: unknown[]) => mockGetWarehouseDashboardStats(...args)
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

describe('useDashboardData', () => {
  const mockWarehouseId = 'warehouse-123'
  const mockDashboardData = {
    totalDrivers: 10,
    activeDrivers: 8,
    totalVehicles: 15,
    activeVehicles: 12,
    todayAttendance: 7,
    todayPiecework: 25,
    pendingLeave: 2
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetWarehouseDashboardStats.mockResolvedValue(mockDashboardData)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('基础功能', () => {
    it('应该初始化为空状态', () => {
      const {result} = renderHook(() =>
        useDashboardData({warehouseId: '', enableRealtime: false})
      )

      expect(result.current.data).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('应该在挂载时加载数据', async () => {
      const {result} = renderHook(() =>
        useDashboardData({warehouseId: mockWarehouseId, enableRealtime: false})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetWarehouseDashboardStats).toHaveBeenCalledWith(mockWarehouseId)
      expect(result.current.data).toEqual(mockDashboardData)
      expect(result.current.error).toBeNull()
    })

    it('应该处理加载错误', async () => {
      const mockError = new Error('加载失败')
      mockGetWarehouseDashboardStats.mockRejectedValue(mockError)

      const {result} = renderHook(() =>
        useDashboardData({warehouseId: mockWarehouseId, enableRealtime: false})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('加载数据失败')
      expect(result.current.data).toBeNull()
    })
  })

  describe('缓存功能', () => {
    it('应该从缓存加载数据', async () => {
      const cachedData = {
        data: mockDashboardData,
        timestamp: Date.now(),
        warehouseId: mockWarehouseId
      }
      mockStorageGet.mockReturnValue(cachedData)

      const {result} = renderHook(() =>
        useDashboardData({warehouseId: mockWarehouseId, enableRealtime: false, cacheEnabled: true})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockStorageGet).toHaveBeenCalled()
      expect(result.current.data).toEqual(mockDashboardData)
      expect(mockGetWarehouseDashboardStats).not.toHaveBeenCalled()
    })

    it('应该在缓存过期时重新加载', async () => {
      const expiredCache = {
        data: mockDashboardData,
        timestamp: Date.now() - 10 * 60 * 1000, // 10分钟前
        warehouseId: mockWarehouseId
      }
      mockStorageGet.mockReturnValue(expiredCache)

      const {result} = renderHook(() =>
        useDashboardData({warehouseId: mockWarehouseId, enableRealtime: false, cacheEnabled: true})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockStorageRemove).toHaveBeenCalled()
      expect(mockGetWarehouseDashboardStats).toHaveBeenCalled()
    })

    it('应该保存数据到缓存', async () => {
      mockStorageGet.mockReturnValue(null)

      const {result} = renderHook(() =>
        useDashboardData({warehouseId: mockWarehouseId, enableRealtime: false, cacheEnabled: true})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockStorageSet).toHaveBeenCalledWith(
        expect.stringContaining('dashboard_cache_'),
        expect.objectContaining({
          data: mockDashboardData,
          warehouseId: mockWarehouseId
        })
      )
    })

    it('应该在禁用缓存时不使用缓存', async () => {
      mockStorageGet.mockReturnValue({
        data: mockDashboardData,
        timestamp: Date.now(),
        warehouseId: mockWarehouseId
      })

      const {result} = renderHook(() =>
        useDashboardData({
          warehouseId: mockWarehouseId,
          enableRealtime: false,
          cacheEnabled: false
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetWarehouseDashboardStats).toHaveBeenCalled()
      expect(mockStorageSet).not.toHaveBeenCalled()
    })
  })

  describe('刷新功能', () => {
    it('应该强制刷新数据', async () => {
      mockStorageGet.mockReturnValue({
        data: mockDashboardData,
        timestamp: Date.now(),
        warehouseId: mockWarehouseId
      })

      const {result} = renderHook(() =>
        useDashboardData({warehouseId: mockWarehouseId, enableRealtime: false})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 清除之前的调用
      mockGetWarehouseDashboardStats.mockClear()

      // 调用刷新
      result.current.refresh()

      await waitFor(() => {
        expect(mockGetWarehouseDashboardStats).toHaveBeenCalled()
      })
    })

    it('应该清除缓存', async () => {
      const {result} = renderHook(() =>
        useDashboardData({warehouseId: mockWarehouseId, enableRealtime: false})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      result.current.clearCache()

      expect(mockStorageRemove).toHaveBeenCalledWith(
        expect.stringContaining('dashboard_cache_')
      )
    })
  })

  describe('实时更新', () => {
    it('应该在启用实时更新时创建频道', async () => {
      const {supabase} = await import('@/client/supabase')

      renderHook(() =>
        useDashboardData({warehouseId: mockWarehouseId, enableRealtime: true})
      )

      await waitFor(() => {
        expect(supabase.channel).toHaveBeenCalled()
      })
    })

    it('应该在禁用实时更新时不订阅', async () => {
      const {supabase} = await import('@/client/supabase')
      mockStorageGet.mockReturnValue(null) // 确保不使用缓存
      const channelCallsBefore = vi.mocked(supabase.channel).mock.calls.length

      const {result} = renderHook(() =>
        useDashboardData({warehouseId: mockWarehouseId, enableRealtime: false, cacheEnabled: false})
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const channelCallsAfter = vi.mocked(supabase.channel).mock.calls.length
      expect(channelCallsAfter).toBe(channelCallsBefore)
    })

    it('应该在卸载时清理订阅', async () => {
      const {supabase} = await import('@/client/supabase')

      const {unmount} = renderHook(() =>
        useDashboardData({warehouseId: mockWarehouseId, enableRealtime: true})
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
    it('应该处理空仓库ID', () => {
      const {result} = renderHook(() =>
        useDashboardData({warehouseId: '', enableRealtime: false})
      )

      expect(result.current.data).toBeNull()
      expect(mockGetWarehouseDashboardStats).not.toHaveBeenCalled()
    })

    it('应该处理仓库ID变化', async () => {
      const {result, rerender} = renderHook(
        ({warehouseId}) => useDashboardData({warehouseId, enableRealtime: false}),
        {initialProps: {warehouseId: mockWarehouseId}}
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const firstCallCount = mockGetWarehouseDashboardStats.mock.calls.length

      // 更改仓库ID
      const newWarehouseId = 'warehouse-456'
      rerender({warehouseId: newWarehouseId})

      await waitFor(() => {
        expect(mockGetWarehouseDashboardStats.mock.calls.length).toBeGreaterThan(firstCallCount)
      })

      expect(mockGetWarehouseDashboardStats).toHaveBeenCalledWith(newWarehouseId)
    })

    it('应该防止重复加载', async () => {
      mockStorageGet.mockReturnValue(null)
      mockGetWarehouseDashboardStats.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockDashboardData), 100))
      )

      const {result} = renderHook(() =>
        useDashboardData({warehouseId: mockWarehouseId, enableRealtime: false})
      )

      // 快速调用多次刷新
      result.current.refresh()
      result.current.refresh()
      result.current.refresh()

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false)
        },
        {timeout: 3000}
      )

      // 应该只调用一次
      expect(mockGetWarehouseDashboardStats).toHaveBeenCalledTimes(1)
    })
  })
})
