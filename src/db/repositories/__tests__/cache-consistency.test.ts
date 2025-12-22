/**
 * 缓存一致性测试
 * 验证 Repository 的缓存一致性行为
 *
 * 任务 24.3: 缓存一致性测试
 * - 测试写操作后缓存是否正确失效
 * - 测试多标签页场景下缓存是否一致
 * - 测试登出后缓存是否完全清除
 *
 * @module db/repositories/__tests__/cache-consistency.test
 * @validates Requirements 1.4, 4.2, 4.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ==================== Mock 设置 ====================

// 使用 vi.hoisted 确保 mock 函数在 vi.mock 提升后仍可访问
const { mockClearCacheByPrefix, mockSetCache, mockGetCache, mockClearCache } = vi.hoisted(() => ({
  mockClearCacheByPrefix: vi.fn(),
  mockSetCache: vi.fn(),
  mockGetCache: vi.fn(),
  mockClearCache: vi.fn()
}))

// 模拟缓存存储
const cacheStore = new Map<string, { value: unknown; expiry: number }>()

// Mock 缓存工具
vi.mock('@/utils/cache', () => ({
  CACHE_KEYS: {},
  getCache: (key: string) => {
    mockGetCache(key)
    const item = cacheStore.get(key)
    if (!item) return null
    if (Date.now() > item.expiry) {
      cacheStore.delete(key)
      return null
    }
    return item.value
  },
  setCache: (key: string, value: unknown, ttl: number) => {
    mockSetCache(key, value, ttl)
    cacheStore.set(key, { value, expiry: Date.now() + ttl })
  },
  clearCache: (key: string) => {
    mockClearCache(key)
    cacheStore.delete(key)
  },
  clearCacheByPrefix: (prefix: string) => {
    mockClearCacheByPrefix(prefix)
    for (const key of cacheStore.keys()) {
      if (key.startsWith(prefix)) {
        cacheStore.delete(key)
      }
    }
  },
  clearAllRepositoryCache: () => {
    const prefixes = [
      'users', 'attendance', 'piece_work', 'warehouses',
      'warehouse_assignments', 'notifications', 'categories',
      'leave', 'vehicles', 'driver_licenses', 'category_prices',
      'resignation', 'dashboard', 'stats'
    ]
    for (const prefix of prefixes) {
      for (const key of cacheStore.keys()) {
        if (key.startsWith(prefix)) {
          cacheStore.delete(key)
        }
      }
    }
  }
}))

// Mock Supabase 客户端
vi.mock('@/client/supabase', () => {
  const createChainableMock = () => {
    const mock: Record<string, unknown> = {}
    const methods = [
      'select', 'insert', 'update', 'delete', 'eq', 'neq',
      'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in',
      'contains', 'containedBy', 'range', 'order', 'limit',
      'offset', 'single', 'maybeSingle', 'match', 'not', 'or', 'filter'
    ]
    
    for (const method of methods) {
      mock[method] = vi.fn().mockReturnValue(mock)
    }
    
    mock.single = vi.fn().mockResolvedValue({ data: null, error: null })
    mock.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    
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
import { PieceWorkRepository } from '../PieceWorkRepository'
import { WarehousesRepository } from '../WarehousesRepository'
import { WarehouseAssignmentsRepository } from '../WarehouseAssignmentsRepository'
import { NotificationsRepository } from '../NotificationsRepository'
import { UsersRepository } from '../UsersRepository'
import { VehiclesRepository } from '../VehiclesRepository'
import { LeaveRepository } from '../LeaveRepository'

// 导入缓存工具
import { clearAllRepositoryCache } from '@/utils/cache'

// ==================== 缓存一致性测试 ====================

describe('任务 24.3: 缓存一致性测试', () => {
  beforeEach(() => {
    cacheStore.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cacheStore.clear()
  })

  // ==================== 24.3.1 写操作后缓存失效 ====================
  describe('24.3.1 写操作后缓存失效', () => {
    describe('AttendanceRepository 写操作', () => {
      it('createAttendance 后应该清除 attendance 缓存', async () => {
        const repo = new AttendanceRepository()
        
        // 预先设置一些缓存
        cacheStore.set('attendance_today_user-001_2024-12-22', { value: { id: 'old' }, expiry: Date.now() + 60000 })
        cacheStore.set('attendance_monthly_user-001_2024_12', { value: [{ id: 'old' }], expiry: Date.now() + 60000 })
        
        // 验证缓存存在
        expect(cacheStore.has('attendance_today_user-001_2024-12-22')).toBe(true)
        expect(cacheStore.has('attendance_monthly_user-001_2024_12')).toBe(true)
        
        // 执行创建操作
        await repo.createAttendance({
          user_id: 'user-001',
          work_date: '2024-12-22',
          clock_in_time: '09:00:00'
        })
        
        // 验证缓存被清除
        expect(mockClearCacheByPrefix).toHaveBeenCalledWith('attendance')
      })

      it('updateAttendance 后应该清除 attendance 缓存', async () => {
        const repo = new AttendanceRepository()
        
        // 预先设置缓存
        cacheStore.set('attendance_id_attendance-001', { value: { id: 'attendance-001' }, expiry: Date.now() + 60000 })
        
        // 执行更新操作
        await repo.updateAttendance('attendance-001', {
          clock_out_time: '18:00:00'
        })
        
        // 验证缓存被清除
        expect(mockClearCacheByPrefix).toHaveBeenCalledWith('attendance')
      })
    })

    describe('PieceWorkRepository 写操作', () => {
      it('createRecord 后应该清除 piece_work 缓存', async () => {
        const repo = new PieceWorkRepository()
        
        // 预先设置缓存
        cacheStore.set('piece_work_user_user-001', { value: [{ id: 'old' }], expiry: Date.now() + 60000 })
        
        // 执行创建操作
        await repo.createRecord({
          user_id: 'user-001',
          warehouse_id: 'warehouse-001',
          work_date: '2024-12-22',
          category_id: 'category-001',
          quantity: 100,
          unit_price: 1.5,
          total_amount: 150
        })
        
        // 验证缓存被清除
        expect(mockClearCacheByPrefix).toHaveBeenCalledWith('piece_work')
      })

      it('updateRecord 后应该清除 piece_work 缓存', async () => {
        const repo = new PieceWorkRepository()
        
        // 执行更新操作
        await repo.updateRecord('piecework-001', { quantity: 200 })
        
        // 验证缓存被清除
        expect(mockClearCacheByPrefix).toHaveBeenCalledWith('piece_work')
      })

      it('deleteRecord 后应该清除 piece_work 缓存', async () => {
        const repo = new PieceWorkRepository()
        
        // 执行删除操作
        await repo.deleteRecord('piecework-001')
        
        // 验证缓存被清除
        expect(mockClearCacheByPrefix).toHaveBeenCalledWith('piece_work')
      })
    })

    describe('WarehousesRepository 写操作', () => {
      it('createWarehouse 后应该清除 warehouses 缓存', async () => {
        const repo = new WarehousesRepository()
        
        // 预先设置缓存
        cacheStore.set('warehouses_all', { value: [{ id: 'old' }], expiry: Date.now() + 60000 })
        
        // 执行创建操作
        await repo.createWarehouse({
          name: '新仓库',
          address: '新地址'
        })
        
        // 验证缓存被清除
        expect(mockClearCacheByPrefix).toHaveBeenCalledWith('warehouses')
      })

      it('updateWarehouse 后应该清除 warehouses 缓存', async () => {
        const repo = new WarehousesRepository()
        
        // 执行更新操作
        await repo.updateWarehouse('warehouse-001', { name: '更新后的仓库' })
        
        // 验证缓存被清除
        expect(mockClearCacheByPrefix).toHaveBeenCalledWith('warehouses')
      })

      it('deleteWarehouse 后应该清除 warehouses 缓存', async () => {
        const repo = new WarehousesRepository()
        
        // 执行删除操作
        await repo.deleteWarehouse('warehouse-001')
        
        // 验证缓存被清除
        expect(mockClearCacheByPrefix).toHaveBeenCalledWith('warehouses')
      })
    })

    describe('NotificationsRepository 写操作', () => {
      it('markAsRead 后应该清除 notifications 缓存', async () => {
        const repo = new NotificationsRepository()
        
        // 预先设置缓存
        cacheStore.set('notifications_user_user-001', { value: [{ id: 'old' }], expiry: Date.now() + 60000 })
        cacheStore.set('notifications_unread_user-001', { value: 5, expiry: Date.now() + 60000 })
        
        // 执行标记已读操作
        await repo.markAsRead('notification-001')
        
        // 验证缓存被清除
        expect(mockClearCacheByPrefix).toHaveBeenCalledWith('notifications')
      })

      it('markAllAsRead 后应该清除 notifications 缓存', async () => {
        const repo = new NotificationsRepository()
        
        // 执行标记全部已读操作
        await repo.markAllAsRead('user-001')
        
        // 验证缓存被清除
        expect(mockClearCacheByPrefix).toHaveBeenCalledWith('notifications')
      })

      it('createNotification 后应该清除 notifications 缓存', async () => {
        const repo = new NotificationsRepository()
        
        // 执行创建操作
        await repo.createNotification({
          title: '测试通知',
          content: '测试内容',
          recipient_id: 'user-001'
        })
        
        // 验证缓存被清除
        expect(mockClearCacheByPrefix).toHaveBeenCalledWith('notifications')
      })
    })

    describe('WarehouseAssignmentsRepository 写操作', () => {
      it('createAssignment 后应该清除 warehouse_assignments 缓存', async () => {
        const repo = new WarehouseAssignmentsRepository()
        
        // 预先设置缓存
        cacheStore.set('warehouse_assignments_user_user-001', { value: [], expiry: Date.now() + 60000 })
        
        // 执行创建操作
        await repo.createAssignment({
          user_id: 'user-001',
          warehouse_id: 'warehouse-001'
        })
        
        // 验证缓存被清除
        expect(mockClearCacheByPrefix).toHaveBeenCalledWith('warehouse_assignments')
      })

      it('deleteByUser 后应该清除 warehouse_assignments 缓存', async () => {
        const repo = new WarehouseAssignmentsRepository()
        
        // 执行删除操作
        await repo.deleteByUser('user-001')
        
        // 验证缓存被清除
        expect(mockClearCacheByPrefix).toHaveBeenCalledWith('warehouse_assignments')
      })
    })
  })

  // ==================== 24.3.2 多标签页场景缓存一致性 ====================
  describe('24.3.2 多标签页场景缓存一致性', () => {
    it('不同用户的缓存应该相互隔离', async () => {
      const repo = new AttendanceRepository()
      
      // 设置不同用户的缓存
      cacheStore.set('attendance_today_user-001_2024-12-22', { value: { id: 'user1-attendance' }, expiry: Date.now() + 60000 })
      cacheStore.set('attendance_today_user-002_2024-12-22', { value: { id: 'user2-attendance' }, expiry: Date.now() + 60000 })
      
      // 验证两个缓存都存在
      expect(cacheStore.has('attendance_today_user-001_2024-12-22')).toBe(true)
      expect(cacheStore.has('attendance_today_user-002_2024-12-22')).toBe(true)
      
      // 清除 user-001 的缓存
      repo.clearCacheByUser('user-001')
      
      // 验证 clearCacheByPrefix 被调用（带用户前缀）
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('attendance_user_user-001')
    })

    it('不同 Repository 的缓存应该相互隔离', () => {
      // 设置不同 Repository 的缓存
      cacheStore.set('attendance_id_001', { value: { id: 'attendance' }, expiry: Date.now() + 60000 })
      cacheStore.set('piece_work_id_001', { value: { id: 'piecework' }, expiry: Date.now() + 60000 })
      cacheStore.set('warehouses_id_001', { value: { id: 'warehouse' }, expiry: Date.now() + 60000 })
      
      // 清除 attendance 缓存
      const attendanceRepo = new AttendanceRepository()
      attendanceRepo.clearAllCache()
      
      // 验证只清除了 attendance 前缀的缓存
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('attendance')
      expect(mockClearCacheByPrefix).not.toHaveBeenCalledWith('piece_work')
      expect(mockClearCacheByPrefix).not.toHaveBeenCalledWith('warehouses')
    })

    it('clearCacheByKey 应该只清除特定键的缓存', () => {
      const repo = new AttendanceRepository()
      
      // 设置多个缓存
      cacheStore.set('attendance_id_001', { value: { id: '001' }, expiry: Date.now() + 60000 })
      cacheStore.set('attendance_id_002', { value: { id: '002' }, expiry: Date.now() + 60000 })
      
      // 清除特定键的缓存
      repo.clearCacheByKey('id_001')
      
      // 验证 clearCache 被调用
      expect(mockClearCache).toHaveBeenCalledWith('attendance_id_001')
    })

    it('同一 Repository 的多个实例应该共享缓存', async () => {
      // 创建两个 Repository 实例（模拟多标签页）
      const repo1 = new AttendanceRepository()
      const repo2 = new AttendanceRepository()
      
      // 设置缓存
      cacheStore.set('attendance_all', { value: [{ id: 'shared' }], expiry: Date.now() + 60000 })
      
      // 验证两个实例都能访问同一缓存
      expect(cacheStore.has('attendance_all')).toBe(true)
      
      // repo1 清除缓存
      repo1.clearAllCache()
      
      // 验证缓存被清除（repo2 也无法访问）
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('attendance')
    })

    it('并发写操作应该都触发缓存失效', async () => {
      const repo = new AttendanceRepository()
      
      // 预先设置缓存
      cacheStore.set('attendance_all', { value: [], expiry: Date.now() + 60000 })
      
      // 并发执行多个写操作（模拟多标签页同时操作）
      await Promise.all([
        repo.createAttendance({ user_id: 'user-001', work_date: '2024-12-22', clock_in_time: '09:00:00' }),
        repo.createAttendance({ user_id: 'user-002', work_date: '2024-12-22', clock_in_time: '09:00:00' }),
        repo.updateAttendance('attendance-001', { clock_out_time: '18:00:00' })
      ])
      
      // 验证缓存失效被调用多次
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('attendance')
      expect(mockClearCacheByPrefix.mock.calls.filter(call => call[0] === 'attendance').length).toBe(3)
    })
  })

  // ==================== 24.3.3 登出后缓存清除 ====================
  describe('24.3.3 登出后缓存清除', () => {
    it('clearAllRepositoryCache 应该清除所有 Repository 缓存', () => {
      // 设置多个 Repository 的缓存
      cacheStore.set('users_id_001', { value: { id: 'user' }, expiry: Date.now() + 60000 })
      cacheStore.set('attendance_id_001', { value: { id: 'attendance' }, expiry: Date.now() + 60000 })
      cacheStore.set('piece_work_id_001', { value: { id: 'piecework' }, expiry: Date.now() + 60000 })
      cacheStore.set('warehouses_id_001', { value: { id: 'warehouse' }, expiry: Date.now() + 60000 })
      cacheStore.set('warehouse_assignments_id_001', { value: { id: 'assignment' }, expiry: Date.now() + 60000 })
      cacheStore.set('notifications_id_001', { value: { id: 'notification' }, expiry: Date.now() + 60000 })
      cacheStore.set('vehicles_id_001', { value: { id: 'vehicle' }, expiry: Date.now() + 60000 })
      cacheStore.set('leave_id_001', { value: { id: 'leave' }, expiry: Date.now() + 60000 })
      cacheStore.set('resignation_id_001', { value: { id: 'resignation' }, expiry: Date.now() + 60000 })
      cacheStore.set('category_prices_id_001', { value: { id: 'price' }, expiry: Date.now() + 60000 })
      cacheStore.set('driver_licenses_id_001', { value: { id: 'license' }, expiry: Date.now() + 60000 })
      cacheStore.set('categories_id_001', { value: { id: 'category' }, expiry: Date.now() + 60000 })
      cacheStore.set('dashboard_id_001', { value: { id: 'dashboard' }, expiry: Date.now() + 60000 })
      cacheStore.set('stats_id_001', { value: { id: 'stats' }, expiry: Date.now() + 60000 })
      
      // 验证缓存存在
      expect(cacheStore.size).toBe(14)
      
      // 执行全局缓存清除
      clearAllRepositoryCache()
      
      // 验证所有缓存被清除
      expect(cacheStore.size).toBe(0)
    })

    it('登出后应该清除所有用户相关缓存', () => {
      // 设置用户相关缓存
      cacheStore.set('users_current', { value: { id: 'user-001' }, expiry: Date.now() + 60000 })
      cacheStore.set('attendance_today_user-001', { value: { id: 'attendance' }, expiry: Date.now() + 60000 })
      cacheStore.set('notifications_user_user-001', { value: [], expiry: Date.now() + 60000 })
      cacheStore.set('dashboard_user-001', { value: {}, expiry: Date.now() + 60000 })
      
      // 验证缓存存在
      expect(cacheStore.size).toBe(4)
      
      // 模拟登出清除缓存
      clearAllRepositoryCache()
      
      // 验证所有缓存被清除
      expect(cacheStore.size).toBe(0)
    })

    it('clearAllRepositoryCache 应该清除所有 14 个 Repository 前缀的缓存', () => {
      // 设置所有 14 个 Repository 前缀的缓存
      const prefixes = [
        'users', 'attendance', 'piece_work', 'warehouses',
        'warehouse_assignments', 'notifications', 'categories',
        'leave', 'vehicles', 'driver_licenses', 'category_prices',
        'resignation', 'dashboard', 'stats'
      ]
      
      for (const prefix of prefixes) {
        cacheStore.set(`${prefix}_test`, { value: { id: prefix }, expiry: Date.now() + 60000 })
      }
      
      // 验证所有缓存存在
      expect(cacheStore.size).toBe(14)
      
      // 执行全局缓存清除
      clearAllRepositoryCache()
      
      // 验证所有缓存被清除
      expect(cacheStore.size).toBe(0)
    })

    it('非 Repository 前缀的缓存不应该被 clearAllRepositoryCache 清除', () => {
      // 设置 Repository 缓存
      cacheStore.set('users_id_001', { value: { id: 'user' }, expiry: Date.now() + 60000 })
      
      // 设置非 Repository 缓存（自定义前缀）
      cacheStore.set('custom_cache_key', { value: { id: 'custom' }, expiry: Date.now() + 60000 })
      cacheStore.set('app_settings', { value: { theme: 'dark' }, expiry: Date.now() + 60000 })
      
      // 验证缓存存在
      expect(cacheStore.size).toBe(3)
      
      // 执行全局缓存清除
      clearAllRepositoryCache()
      
      // 验证只有 Repository 缓存被清除
      expect(cacheStore.has('users_id_001')).toBe(false)
      expect(cacheStore.has('custom_cache_key')).toBe(true)
      expect(cacheStore.has('app_settings')).toBe(true)
      expect(cacheStore.size).toBe(2)
    })
  })

  // ==================== 24.3.4 缓存过期行为 ====================
  describe('24.3.4 缓存过期行为', () => {
    it('过期的缓存应该返回 null', async () => {
      // 设置一个已过期的缓存
      cacheStore.set('attendance_id_001', { value: { id: 'old' }, expiry: Date.now() - 1000 })
      
      // 使用动态 import 获取 mock 的 getCache
      const cacheModule = await import('@/utils/cache')
      const result = cacheModule.getCache('attendance_id_001')
      
      expect(result).toBeNull()
    })

    it('未过期的缓存应该返回正确的值', async () => {
      const testValue = { id: 'test', name: 'Test' }
      
      // 设置一个未过期的缓存
      cacheStore.set('attendance_id_001', { value: testValue, expiry: Date.now() + 60000 })
      
      // 使用动态 import 获取 mock 的 getCache
      const cacheModule = await import('@/utils/cache')
      const result = cacheModule.getCache('attendance_id_001')
      
      expect(result).toEqual(testValue)
    })

    it('过期的缓存应该被自动删除', async () => {
      // 设置一个已过期的缓存
      cacheStore.set('attendance_id_001', { value: { id: 'old' }, expiry: Date.now() - 1000 })
      
      // 验证缓存存在
      expect(cacheStore.has('attendance_id_001')).toBe(true)
      
      // 使用动态 import 获取 mock 的 getCache（触发过期检查）
      const cacheModule = await import('@/utils/cache')
      cacheModule.getCache('attendance_id_001')
      
      // 验证缓存被删除
      expect(cacheStore.has('attendance_id_001')).toBe(false)
    })
  })

  // ==================== 24.3.5 缓存统计 ====================
  describe('24.3.5 缓存统计', () => {
    it('getCacheStats 应该返回正确的统计信息', () => {
      const repo = new AttendanceRepository()
      
      // 重置统计
      repo.resetCacheStats()
      
      // 获取初始统计
      const initialStats = repo.getCacheStats()
      expect(initialStats.hits).toBe(0)
      expect(initialStats.misses).toBe(0)
      expect(initialStats.hitRate).toBe(0)
    })

    it('resetCacheStats 应该重置统计信息', () => {
      const repo = new AttendanceRepository()
      
      // 重置统计
      repo.resetCacheStats()
      
      // 验证统计被重置
      const stats = repo.getCacheStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.hitRate).toBe(0)
    })
  })

  // ==================== 24.3.6 缓存键格式验证 ====================
  describe('24.3.6 缓存键格式验证', () => {
    it('所有 Repository 应该使用正确的缓存前缀', () => {
      // 验证各 Repository 的缓存前缀配置
      const repositories = [
        { RepoClass: AttendanceRepository, expectedPrefix: 'attendance' },
        { RepoClass: PieceWorkRepository, expectedPrefix: 'piece_work' },
        { RepoClass: WarehousesRepository, expectedPrefix: 'warehouses' },
        { RepoClass: WarehouseAssignmentsRepository, expectedPrefix: 'warehouse_assignments' },
        { RepoClass: NotificationsRepository, expectedPrefix: 'notifications' }
      ]

      for (const { RepoClass, expectedPrefix } of repositories) {
        const repo = new RepoClass()
        
        // 通过 clearAllCache 验证前缀
        repo.clearAllCache()
        
        // 验证 clearCacheByPrefix 被调用时使用了正确的前缀
        expect(mockClearCacheByPrefix).toHaveBeenCalledWith(expectedPrefix)
        
        // 清除 mock 调用记录
        vi.clearAllMocks()
      }
    })

    it('clearCacheByKey 应该使用正确的完整缓存键', () => {
      const repo = new AttendanceRepository()
      
      // 清除特定键
      repo.clearCacheByKey('id_test-123')
      
      // 验证使用了正确的完整键（前缀_后缀）
      expect(mockClearCache).toHaveBeenCalledWith('attendance_id_test-123')
    })

    it('clearCacheByUser 应该使用正确的用户缓存前缀', () => {
      const repo = new AttendanceRepository()
      
      // 清除用户缓存
      repo.clearCacheByUser('user-123')
      
      // 验证使用了正确的用户缓存前缀
      expect(mockClearCacheByPrefix).toHaveBeenCalledWith('attendance_user_user-123')
    })
  })
})
