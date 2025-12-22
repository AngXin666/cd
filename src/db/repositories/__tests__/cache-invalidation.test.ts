/**
 * 写操作缓存失效属性测试
 * 验证 Repository 的写操作是否正确清除缓存
 *
 * Property 3: 写操作缓存失效
 * - 验证 create 操作后缓存被清除
 * - 验证 update 操作后缓存被清除
 * - 验证 delete 操作后缓存被清除
 *
 * @module db/repositories/__tests__/cache-invalidation.test
 * @validates Requirements 1.4, 4.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// 使用 vi.hoisted 确保 mock 函数在 vi.mock 提升后仍可访问
const { mockClearCacheByPrefix } = vi.hoisted(() => ({
  mockClearCacheByPrefix: vi.fn()
}))

vi.mock('@/utils/cache', () => ({
  CACHE_KEYS: {},
  getCache: vi.fn().mockReturnValue(null),
  setCache: vi.fn(),
  clearCache: vi.fn(),
  clearCacheByPrefix: mockClearCacheByPrefix
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

// Mock Supabase 客户端 - 使用工厂函数内部定义，支持链式调用
vi.mock('@/client/supabase', () => {
  /**
   * 创建支持链式调用的 mock 对象
   * 所有方法都返回 this，支持无限链式调用
   */
  const createChainableMock = () => {
    const mock: Record<string, unknown> = {}
    const methods = [
      'select', 'insert', 'update', 'delete', 'eq', 'neq',
      'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in',
      'contains', 'containedBy', 'range', 'order', 'limit',
      'offset', 'single', 'maybeSingle', 'match', 'not', 'or', 'filter'
    ]
    
    // 所有方法都返回 mock 自身，支持链式调用
    for (const method of methods) {
      mock[method] = vi.fn().mockImplementation(() => mock)
    }
    
    // 终结方法返回 Promise
    mock.single = vi.fn().mockResolvedValue({ data: null, error: null })
    mock.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    
    // then 方法使 mock 可以被 await
    mock.then = (resolve: (value: { data: null; error: null }) => void) => {
      resolve({ data: null, error: null })
      return mock
    }
    
    return mock
  }
  
  return {
    supabase: {
      from: vi.fn().mockImplementation(() => createChainableMock())
    }
  }
})

// 导入 Repository
import { AttendanceRepository } from '../AttendanceRepository'
import { PieceWorkRepository } from '../PieceWorkRepository'
import { WarehousesRepository } from '../WarehousesRepository'
import { NotificationsRepository } from '../NotificationsRepository'

// ==================== 属性测试 ====================

describe('Property 3: 写操作缓存失效', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('3.1 AttendanceRepository 写操作缓存失效', () => {
    it('createAttendance 应该清除 attendance 前缀的所有缓存', async () => {
      const repo = new AttendanceRepository()
      await repo.createAttendance({
        user_id: 'user-456',
        work_date: '2024-12-21',
        clock_in_time: '09:00:00'
      })
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('attendance')
    })

    it('updateAttendance 应该清除 attendance 前缀的所有缓存', async () => {
      const repo = new AttendanceRepository()
      await repo.updateAttendance('attendance-123', {
        clock_out_time: '18:00:00',
        work_hours: 8
      })
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('attendance')
    })
  })

  describe('3.2 PieceWorkRepository 写操作缓存失效', () => {
    it('createRecord 应该清除 piece_work 前缀的所有缓存', async () => {
      const repo = new PieceWorkRepository()
      await repo.createRecord({
        user_id: 'user-456',
        warehouse_id: 'warehouse-789',
        work_date: '2024-12-21',
        category_id: 'category-001',
        quantity: 100,
        unit_price: 1.5,
        total_amount: 150
      })
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('piece_work')
    })

    it('updateRecord 应该清除 piece_work 前缀的所有缓存', async () => {
      const repo = new PieceWorkRepository()
      await repo.updateRecord('piecework-123', {
        quantity: 150,
        total_amount: 225
      })
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('piece_work')
    })

    it('deleteRecord 应该清除 piece_work 前缀的所有缓存', async () => {
      const repo = new PieceWorkRepository()
      await repo.deleteRecord('piecework-123')
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('piece_work')
    })
  })

  describe('3.3 WarehousesRepository 写操作缓存失效', () => {
    it('createWarehouse 应该清除 warehouses 前缀的所有缓存', async () => {
      const repo = new WarehousesRepository()
      await repo.createWarehouse({
        name: '测试仓库',
        address: '测试地址'
      })
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('warehouses')
    })

    it('updateWarehouse 应该清除 warehouses 前缀的所有缓存', async () => {
      const repo = new WarehousesRepository()
      await repo.updateWarehouse('warehouse-123', {
        name: '更新后的仓库名'
      })
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('warehouses')
    })

    it('deleteWarehouse 应该清除 warehouses 前缀的所有缓存', async () => {
      const repo = new WarehousesRepository()
      await repo.deleteWarehouse('warehouse-123')
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('warehouses')
    })
  })

  describe('3.4 NotificationsRepository 写操作缓存失效', () => {
    it('createNotification 应该清除 notifications 前缀的所有缓存', async () => {
      const repo = new NotificationsRepository()
      await repo.createNotification({
        title: '测试通知',
        content: '这是一条测试通知',
        recipient_id: 'user-456'
      })
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('notifications')
    })

    it('markAsRead 应该清除 notifications 前缀的所有缓存', async () => {
      const repo = new NotificationsRepository()
      await repo.markAsRead('notification-123')
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('notifications')
    })

    it('markAllAsRead 应该清除 notifications 前缀的所有缓存', async () => {
      const repo = new NotificationsRepository()
      await repo.markAllAsRead('user-456')
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('notifications')
    })
  })
})
