/**
 * useDataCache Hook 集成测试
 * 测试通用数据缓存 Hook 的核心功能
 *
 * @feature user-list-cache-optimization
 */

import {act, renderHook, waitFor} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {cacheManager} from '@/utils/cacheManager'
import {useDataCache} from './useDataCache'

// Mock RealtimeListener
vi.mock('@/utils/realtimeListener', () => ({
  RealtimeListener: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    isListening: vi.fn().mockReturnValue(false)
  }))
}))

describe('useDataCache', () => {
  // Mock 数据加载函数
  let loadDataMock: ReturnType<typeof vi.fn>

  // 测试数据
  const testData = {users: [{id: '1', name: 'Test User'}]}
  const cacheKey = 'test_cache_key'

  beforeEach(() => {
    // 清除所有缓存
    cacheManager.clear()

    // 重置 Mock
    vi.clearAllMocks()

    // 创建 Mock 加载函数
    loadDataMock = vi.fn().mockResolvedValue(testData)
  })

  afterEach(() => {
    // 清理
    cacheManager.clear()
  })

  describe('基本功能', () => {
    it('应该正确加载数据', async () => {
      const {result} = renderHook(() =>
        useDataCache({
          cacheKey,
          loadData: loadDataMock,
          cacheEnabled: false // 禁用缓存以测试加载
        })
      )

      // 初始状态
      expect(result.current.loading).toBe(true)
      expect(result.current.data).toBeNull()

      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 验证数据
      expect(result.current.data).toEqual(testData)
      expect(result.current.error).toBeNull()
      expect(loadDataMock).toHaveBeenCalledTimes(1)
    })

    it('应该正确处理加载错误', async () => {
      const error = new Error('Load failed')
      loadDataMock.mockRejectedValue(error)

      const {result} = renderHook(() =>
        useDataCache({
          cacheKey,
          loadData: loadDataMock,
          cacheEnabled: false
        })
      )

      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 验证错误
      expect(result.current.error).toEqual(error)
      expect(result.current.data).toBeNull()
    })
  })

  describe('缓存功能', () => {
    it('应该优先从缓存加载数据', async () => {
      // 预先写入缓存
      cacheManager.set(cacheKey, testData)

      const {result} = renderHook(() =>
        useDataCache({
          cacheKey,
          loadData: loadDataMock,
          cacheEnabled: true
        })
      )

      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 应该从缓存加载，不调用 loadData
      expect(result.current.data).toEqual(testData)
      expect(result.current.fromCache).toBe(true)
      expect(loadDataMock).not.toHaveBeenCalled()
    })

    it('应该在缓存不存在时从数据源加载', async () => {
      const {result} = renderHook(() =>
        useDataCache({
          cacheKey,
          loadData: loadDataMock,
          cacheEnabled: true
        })
      )

      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 应该从数据源加载
      expect(result.current.data).toEqual(testData)
      expect(result.current.fromCache).toBe(false)
      expect(loadDataMock).toHaveBeenCalledTimes(1)

      // 验证数据已写入缓存
      const cached = cacheManager.get(cacheKey)
      expect(cached).toEqual(testData)
    })

    it('应该在缓存过期时重新加载', async () => {
      // 写入立即过期的缓存
      cacheManager.set(cacheKey, testData, 0)

      const {result} = renderHook(() =>
        useDataCache({
          cacheKey,
          loadData: loadDataMock,
          cacheEnabled: true
        })
      )

      // 等待一小段时间确保缓存过期
      await new Promise((resolve) => setTimeout(resolve, 10))

      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 应该重新加载
      expect(loadDataMock).toHaveBeenCalled()
    })
  })

  describe('刷新功能', () => {
    it('应该在调用 refresh 时强制重新加载', async () => {
      // 预先写入缓存
      cacheManager.set(cacheKey, testData)

      const {result} = renderHook(() =>
        useDataCache({
          cacheKey,
          loadData: loadDataMock,
          cacheEnabled: true
        })
      )

      // 等待初始加载完成（从缓存）
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.fromCache).toBe(true)
      expect(loadDataMock).not.toHaveBeenCalled()

      // 调用 refresh
      await result.current.refresh()

      // 等待刷新完成
      await waitFor(() => {
        expect(loadDataMock).toHaveBeenCalledTimes(1)
      })

      // 应该强制重新加载
      expect(result.current.fromCache).toBe(false)
    })

    it('应该在调用 clearCache 时清除缓存', async () => {
      // 预先写入缓存
      cacheManager.set(cacheKey, testData)

      const {result} = renderHook(() =>
        useDataCache({
          cacheKey,
          loadData: loadDataMock,
          cacheEnabled: true
        })
      )

      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 验证缓存存在
      expect(cacheManager.has(cacheKey)).toBe(true)

      // 清除缓存
      result.current.clearCache()

      // 验证缓存已清除
      expect(cacheManager.has(cacheKey)).toBe(false)
    })
  })

  describe('依赖项变化', () => {
    it('应该在依赖项变化时重新加载', async () => {
      let dependency = 'value1'

      const {result, rerender} = renderHook(
        ({dep}) =>
          useDataCache({
            cacheKey,
            loadData: loadDataMock,
            cacheEnabled: false,
            dependencies: [dep]
          }),
        {
          initialProps: {dep: dependency}
        }
      )

      // 等待初始加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(loadDataMock).toHaveBeenCalledTimes(1)

      // 改变依赖项
      dependency = 'value2'
      rerender({dep: dependency})

      // 等待重新加载完成
      await waitFor(() => {
        expect(loadDataMock).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('离线模式', () => {
    it('应该在加载失败时显示缓存数据', async () => {
      // 预先写入缓存
      cacheManager.set(cacheKey, testData)

      // Mock 加载失败
      const error = new Error('Network error')
      loadDataMock.mockRejectedValue(error)

      const {result} = renderHook(() =>
        useDataCache({
          cacheKey,
          loadData: loadDataMock,
          cacheEnabled: true
        })
      )

      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 应该显示缓存数据（从缓存加载成功，所以 error 为 null）
      expect(result.current.data).toEqual(testData)
      expect(result.current.fromCache).toBe(true)
      // 注意：从缓存加载成功时，error 会被清除
      expect(result.current.error).toBeNull()
    })

    it('应该在没有缓存时显示错误', async () => {
      // Mock 加载失败
      const error = new Error('Network error')
      loadDataMock.mockRejectedValue(error)

      const {result} = renderHook(() =>
        useDataCache({
          cacheKey,
          loadData: loadDataMock,
          cacheEnabled: true
        })
      )

      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 应该显示错误，没有数据
      expect(result.current.data).toBeNull()
      expect(result.current.error).toEqual(error)
    })
  })

  describe('setData 功能', () => {
    it('应该允许手动更新数据', async () => {
      const {result} = renderHook(() =>
        useDataCache({
          cacheKey,
          loadData: loadDataMock,
          cacheEnabled: false
        })
      )

      // 等待初始加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toEqual(testData)

      // 手动更新数据
      const newData = {users: [{id: '2', name: 'New User'}]}
      act(() => {
        result.current.setData(newData)
      })

      // 等待状态更新
      await waitFor(() => {
        expect(result.current.data).toEqual(newData)
      })
    })
  })

  describe('配置选项', () => {
    it('应该支持禁用缓存', async () => {
      const {result} = renderHook(() =>
        useDataCache({
          cacheKey,
          loadData: loadDataMock,
          cacheEnabled: false
        })
      )

      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 验证数据未写入缓存
      expect(cacheManager.has(cacheKey)).toBe(false)
    })

    it('应该支持自定义缓存有效期', async () => {
      const customTTL = 10 * 60 * 1000 // 10 分钟

      const {result} = renderHook(() =>
        useDataCache({
          cacheKey,
          loadData: loadDataMock,
          cacheEnabled: true,
          cacheTTL: customTTL
        })
      )

      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 验证数据已写入缓存
      expect(cacheManager.has(cacheKey)).toBe(true)
    })

    it('应该支持禁用实时更新', async () => {
      const {result} = renderHook(() =>
        useDataCache({
          cacheKey,
          loadData: loadDataMock,
          realtimeEnabled: false
        })
      )

      // 等待加载完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toEqual(testData)
    })
  })
})
