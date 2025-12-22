/**
 * 缓存行为属性测试
 * 验证 Repository 的缓存优先查询行为
 *
 * Property 2: 缓存优先查询
 * - 验证缓存命中时不查询数据库
 * - 验证缓存未命中时查询数据库并缓存结果
 * - 验证缓存统计正确更新
 *
 * @module db/repositories/__tests__/cache-behavior.test
 * @validates Requirements 1.3, 3.2, 3.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setCache } from '@/utils/cache'

// Mock Supabase 客户端
const mockSupabaseFrom = vi.fn()
const mockSelect = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockGte = vi.fn().mockReturnThis()
const mockLte = vi.fn().mockReturnThis()
const mockOrder = vi.fn().mockReturnThis()
const mockLimit = vi.fn().mockReturnThis()
const mockMaybeSingle = vi.fn()

vi.mock('@/client/supabase', () => ({
  supabase: {
    from: (tableName: string) => {
      mockSupabaseFrom(tableName)
      return {
        select: mockSelect,
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: mockEq,
        gte: mockGte,
        lte: mockLte,
        in: vi.fn().mockReturnThis(),
        order: mockOrder,
        limit: mockLimit,
        range: vi.fn().mockReturnThis(),
        maybeSingle: mockMaybeSingle,
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      }
    }
  }
}))

// Mock 缓存工具 - 使用内存存储模拟真实缓存行为
const cacheStore = new Map<string, { value: unknown; expiry: number }>()

vi.mock('@/utils/cache', () => ({
  CACHE_KEYS: {},
  getCache: vi.fn((key: string) => {
    const item = cacheStore.get(key)
    if (!item) return null
    if (Date.now() > item.expiry) {
      cacheStore.delete(key)
      return null
    }
    return item.value
  }),
  setCache: vi.fn((key: string, value: unknown, ttl: number) => {
    cacheStore.set(key, { value, expiry: Date.now() + ttl })
  }),
  clearCache: vi.fn((key: string) => {
    cacheStore.delete(key)
  }),
  clearCacheByPrefix: vi.fn((prefix: string) => {
    for (const key of cacheStore.keys()) {
      if (key.startsWith(prefix)) {
        cacheStore.delete(key)
      }
    }
  })
}))

// Mock 日志工具
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn().mockReturnValue({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

// 导入 Repository
import { AttendanceRepository } from '../AttendanceRepository'

// ==================== 测试数据 ====================

/**
 * 模拟考勤记录数据
 */
const mockAttendanceRecord = {
  id: 'attendance-123',
  user_id: 'user-456',
  work_date: '2024-12-21',
  clock_in_time: '09:00:00',
  clock_out_time: '18:00:00',
  warehouse_id: 'warehouse-789',
  status: 'normal',
  notes: null,
  created_at: '2024-12-21T09:00:00Z',
  work_hours: 8
}

// ==================== 属性测试 ====================

describe('Property 2: 缓存优先查询', () => {
  let repo: AttendanceRepository

  beforeEach(() => {
    // 清除缓存存储
    cacheStore.clear()
    // 清除所有 mock 调用记录
    vi.clearAllMocks()
    // 创建新的 Repository 实例
    repo = new AttendanceRepository()
  })

  afterEach(() => {
    // 清除缓存存储
    cacheStore.clear()
  })

  describe('2.1 缓存命中时不查询数据库', () => {
    it('当缓存存在时，getById 不应该查询数据库', async () => {
      // 准备：预先设置缓存
      const cacheKey = 'attendance_id_attendance-123'
      cacheStore.set(cacheKey, { value: mockAttendanceRecord, expiry: Date.now() + 60000 })

      // 执行：调用 getById
      const result = await repo.getById('attendance-123')

      // 验证：返回缓存数据
      expect(result).toEqual(mockAttendanceRecord)
      // 验证：没有调用数据库
      expect(mockSupabaseFrom).not.toHaveBeenCalled()
    })

    it('当缓存存在时，getTodayAttendance 不应该查询数据库', async () => {
      // 准备：预先设置缓存
      const today = new Date().toISOString().split('T')[0]
      const cacheKey = `attendance_today_user-456_${today}`
      cacheStore.set(cacheKey, { value: mockAttendanceRecord, expiry: Date.now() + 60000 })

      // 执行：调用 getTodayAttendance
      const result = await repo.getTodayAttendance('user-456')

      // 验证：返回缓存数据
      expect(result).toEqual(mockAttendanceRecord)
      // 验证：没有调用数据库
      expect(mockSupabaseFrom).not.toHaveBeenCalled()
    })
  })

  describe('2.2 缓存未命中时查询数据库并缓存结果', () => {
    it('当缓存不存在时，getById 应该查询数据库并缓存结果', async () => {
      // 准备：设置数据库返回值
      mockMaybeSingle.mockResolvedValueOnce({ data: mockAttendanceRecord, error: null })

      // 执行：调用 getById
      const result = await repo.getById('attendance-123')

      // 验证：返回数据库数据
      expect(result).toEqual(mockAttendanceRecord)
      // 验证：调用了数据库
      expect(mockSupabaseFrom).toHaveBeenCalledWith('attendance')
      // 验证：结果被缓存
      expect(setCache).toHaveBeenCalled()
    })

    it('当缓存不存在时，getTodayAttendance 应该查询数据库并缓存结果', async () => {
      // 准备：设置数据库返回值
      mockMaybeSingle.mockResolvedValueOnce({ data: mockAttendanceRecord, error: null })

      // 执行：调用 getTodayAttendance
      const result = await repo.getTodayAttendance('user-456')

      // 验证：返回数据库数据
      expect(result).toEqual(mockAttendanceRecord)
      // 验证：调用了数据库
      expect(mockSupabaseFrom).toHaveBeenCalledWith('attendance')
      // 验证：结果被缓存
      expect(setCache).toHaveBeenCalled()
    })
  })

  describe('2.3 useCache=false 时强制查询数据库', () => {
    it('即使缓存存在，useCache=false 时也应该查询数据库', async () => {
      // 准备：预先设置缓存
      const cacheKey = 'attendance_id_attendance-123'
      cacheStore.set(cacheKey, { value: mockAttendanceRecord, expiry: Date.now() + 60000 })
      // 设置数据库返回值
      mockMaybeSingle.mockResolvedValueOnce({ data: mockAttendanceRecord, error: null })

      // 执行：调用 getById，禁用缓存
      const result = await repo.getById('attendance-123', { useCache: false })

      // 验证：返回数据库数据
      expect(result).toEqual(mockAttendanceRecord)
      // 验证：调用了数据库
      expect(mockSupabaseFrom).toHaveBeenCalledWith('attendance')
    })
  })

  describe('2.4 缓存统计正确更新', () => {
    it('缓存命中时应该增加 hits 计数', async () => {
      // 准备：预先设置缓存
      const cacheKey = 'attendance_id_attendance-123'
      cacheStore.set(cacheKey, { value: mockAttendanceRecord, expiry: Date.now() + 60000 })

      // 重置统计
      repo.resetCacheStats()

      // 执行：调用 getById（缓存命中）
      await repo.getById('attendance-123')

      // 验证：hits 增加
      const stats = repo.getCacheStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(0)
    })

    it('缓存未命中时应该增加 misses 计数', async () => {
      // 准备：设置数据库返回值
      mockMaybeSingle.mockResolvedValueOnce({ data: mockAttendanceRecord, error: null })

      // 重置统计
      repo.resetCacheStats()

      // 执行：调用 getById（缓存未命中）
      await repo.getById('attendance-123')

      // 验证：misses 增加
      const stats = repo.getCacheStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(1)
    })

    it('缓存命中率应该正确计算', async () => {
      // 准备：预先设置缓存
      const cacheKey = 'attendance_id_attendance-123'
      cacheStore.set(cacheKey, { value: mockAttendanceRecord, expiry: Date.now() + 60000 })
      // 设置数据库返回值（用于未命中的查询）
      mockMaybeSingle.mockResolvedValue({ data: mockAttendanceRecord, error: null })

      // 重置统计
      repo.resetCacheStats()

      // 执行：2 次缓存命中，1 次缓存未命中
      await repo.getById('attendance-123') // 命中
      await repo.getById('attendance-123') // 命中
      await repo.getById('attendance-456') // 未命中

      // 验证：命中率 = 2/3 ≈ 0.667
      const stats = repo.getCacheStats()
      expect(stats.hits).toBe(2)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBeCloseTo(2 / 3, 2)
    })
  })

  describe('2.5 数据库错误时不缓存结果', () => {
    it('数据库查询失败时不应该缓存错误结果', async () => {
      // 准备：设置数据库返回错误
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } })

      // 执行：调用 getById
      const result = await repo.getById('attendance-123')

      // 验证：返回 null
      expect(result).toBeNull()
      // 验证：没有缓存错误结果
      expect(setCache).not.toHaveBeenCalled()
    })
  })
})

