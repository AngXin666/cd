/**
 * Repository 配置正确性属性测试
 * 验证所有 Repository 的配置是否符合设计规范
 *
 * Property 1: Repository 配置正确性
 * - 验证 tableName 配置正确
 * - 验证 cachePrefix 配置正确
 * - 验证 TTL 配置在合理范围内
 *
 * @module db/repositories/__tests__/repository-config.test
 * @validates Requirements 1.2, 4.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase 客户端
vi.mock('@/client/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null })
    })
  }
}))

// Mock 缓存工具
vi.mock('@/utils/cache', () => ({
  CACHE_KEYS: {},
  getCache: vi.fn().mockReturnValue(null),
  setCache: vi.fn(),
  clearCache: vi.fn(),
  clearCacheByPrefix: vi.fn()
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

// 导入 Repository 类
import { AttendanceRepository } from '../AttendanceRepository'
import { PieceWorkRepository } from '../PieceWorkRepository'
import { WarehousesRepository } from '../WarehousesRepository'
import { WarehouseAssignmentsRepository } from '../WarehouseAssignmentsRepository'
import { NotificationsRepository } from '../NotificationsRepository'
import { DriverLicensesRepository } from '../DriverLicensesRepository'
import { CategoryPricesRepository } from '../CategoryPricesRepository'
import { ResignationApplicationsRepository } from '../ResignationApplicationsRepository'

// ==================== 测试配置 ====================

/**
 * Repository 配置规范
 * 定义每个 Repository 的预期配置
 */
interface RepositoryConfig {
  /** Repository 类名 */
  name: string
  /** 预期的表名 */
  expectedTableName: string
  /** 预期的缓存前缀 */
  expectedCachePrefix: string
  /** 预期的 TTL（毫秒） */
  expectedTTL: number
  /** Repository 实例工厂函数 */
  createInstance: () => unknown
}

/**
 * 所有 Repository 的配置规范
 * 根据 tasks.md 中的设计规范定义
 */
const REPOSITORY_CONFIGS: RepositoryConfig[] = [
  {
    name: 'AttendanceRepository',
    expectedTableName: 'attendance',
    expectedCachePrefix: 'attendance',
    expectedTTL: 2 * 60 * 1000, // 2 分钟
    createInstance: () => new AttendanceRepository()
  },
  {
    name: 'PieceWorkRepository',
    expectedTableName: 'piece_work_records',
    expectedCachePrefix: 'piece_work',
    expectedTTL: 2 * 60 * 1000, // 2 分钟
    createInstance: () => new PieceWorkRepository()
  },
  {
    name: 'WarehousesRepository',
    expectedTableName: 'warehouses',
    expectedCachePrefix: 'warehouses',
    expectedTTL: 10 * 60 * 1000, // 10 分钟
    createInstance: () => new WarehousesRepository()
  },
  {
    name: 'WarehouseAssignmentsRepository',
    expectedTableName: 'warehouse_assignments',
    expectedCachePrefix: 'warehouse_assignments',
    expectedTTL: 5 * 60 * 1000, // 5 分钟
    createInstance: () => new WarehouseAssignmentsRepository()
  },
  {
    name: 'NotificationsRepository',
    expectedTableName: 'notifications',
    expectedCachePrefix: 'notifications',
    expectedTTL: 1 * 60 * 1000, // 1 分钟
    createInstance: () => new NotificationsRepository()
  },
  {
    name: 'DriverLicensesRepository',
    expectedTableName: 'driver_licenses',
    expectedCachePrefix: 'driver_licenses',
    expectedTTL: 5 * 60 * 1000, // 5 分钟
    createInstance: () => new DriverLicensesRepository()
  },
  {
    name: 'CategoryPricesRepository',
    expectedTableName: 'category_prices',
    expectedCachePrefix: 'category_prices',
    expectedTTL: 5 * 60 * 1000, // 5 分钟
    createInstance: () => new CategoryPricesRepository()
  },
  {
    name: 'ResignationApplicationsRepository',
    expectedTableName: 'resignation_applications',
    expectedCachePrefix: 'resignation',
    expectedTTL: 2 * 60 * 1000, // 2 分钟
    createInstance: () => new ResignationApplicationsRepository()
  }
]

// ==================== 属性测试 ====================

describe('Property 1: Repository 配置正确性', () => {
  beforeEach(() => {
    // 清除所有 mock 调用记录
    vi.clearAllMocks()
  })

  describe('1.1 表名配置验证', () => {
    it.each(REPOSITORY_CONFIGS)(
      '$name 的 tableName 应该是 "$expectedTableName"',
      ({ name, expectedTableName, createInstance }) => {
        // 创建 Repository 实例
        const repo = createInstance() as { tableName: string }

        // 验证表名配置
        expect(repo).toHaveProperty('tableName')
        expect(repo.tableName).toBe(expectedTableName)
      }
    )
  })

  describe('1.2 缓存前缀配置验证', () => {
    it.each(REPOSITORY_CONFIGS)(
      '$name 的 cachePrefix 应该是 "$expectedCachePrefix"',
      ({ name, expectedCachePrefix, createInstance }) => {
        // 创建 Repository 实例
        const repo = createInstance() as { cachePrefix: string }

        // 验证缓存前缀配置
        expect(repo).toHaveProperty('cachePrefix')
        expect(repo.cachePrefix).toBe(expectedCachePrefix)
      }
    )
  })

  describe('1.3 TTL 配置验证', () => {
    it.each(REPOSITORY_CONFIGS)(
      '$name 的 defaultTTL 应该是 $expectedTTL 毫秒',
      ({ name, expectedTTL, createInstance }) => {
        // 创建 Repository 实例
        const repo = createInstance() as { defaultTTL: number }

        // 验证 TTL 配置
        expect(repo).toHaveProperty('defaultTTL')
        expect(repo.defaultTTL).toBe(expectedTTL)
      }
    )

    it.each(REPOSITORY_CONFIGS)(
      '$name 的 TTL 应该在合理范围内（1秒 - 1小时）',
      ({ name, createInstance }) => {
        // 创建 Repository 实例
        const repo = createInstance() as { defaultTTL: number }

        // TTL 应该在 1 秒到 1 小时之间
        const MIN_TTL = 1000 // 1 秒
        const MAX_TTL = 60 * 60 * 1000 // 1 小时

        expect(repo.defaultTTL).toBeGreaterThanOrEqual(MIN_TTL)
        expect(repo.defaultTTL).toBeLessThanOrEqual(MAX_TTL)
      }
    )
  })

  describe('1.4 缓存启用状态验证', () => {
    it.each(REPOSITORY_CONFIGS)(
      '$name 应该默认启用缓存',
      ({ name, createInstance }) => {
        // 创建 Repository 实例
        const repo = createInstance() as { enableCache: boolean }

        // 验证缓存默认启用
        expect(repo).toHaveProperty('enableCache')
        expect(repo.enableCache).toBe(true)
      }
    )
  })

  describe('1.5 缓存键生成验证', () => {
    it.each(REPOSITORY_CONFIGS)(
      '$name 应该能正确生成缓存键',
      ({ name, expectedCachePrefix, createInstance }) => {
        // 创建 Repository 实例
        const repo = createInstance() as { getCacheKey: (suffix: string) => string }

        // 验证缓存键生成方法存在
        expect(repo).toHaveProperty('getCacheKey')
        expect(typeof repo.getCacheKey).toBe('function')

        // 验证缓存键格式
        const testSuffix = 'test_123'
        const cacheKey = repo.getCacheKey(testSuffix)
        expect(cacheKey).toBe(`${expectedCachePrefix}_${testSuffix}`)
      }
    )
  })

  describe('1.6 缓存统计功能验证', () => {
    it.each(REPOSITORY_CONFIGS)(
      '$name 应该支持缓存统计功能',
      ({ name, createInstance }) => {
        // 创建 Repository 实例
        const repo = createInstance() as {
          getCacheStats: () => { hits: number; misses: number; hitRate: number }
          resetCacheStats: () => void
        }

        // 验证缓存统计方法存在
        expect(repo).toHaveProperty('getCacheStats')
        expect(repo).toHaveProperty('resetCacheStats')
        expect(typeof repo.getCacheStats).toBe('function')
        expect(typeof repo.resetCacheStats).toBe('function')

        // 验证初始统计数据
        const stats = repo.getCacheStats()
        expect(stats).toHaveProperty('hits')
        expect(stats).toHaveProperty('misses')
        expect(stats).toHaveProperty('hitRate')
        expect(stats.hits).toBe(0)
        expect(stats.misses).toBe(0)
        expect(stats.hitRate).toBe(0)
      }
    )
  })
})

describe('Property 1.7: Repository 继承关系验证', () => {
  it.each(REPOSITORY_CONFIGS)(
    '$name 应该继承自 BaseRepository',
    ({ name, createInstance }) => {
      // 创建 Repository 实例
      const repo = createInstance()

      // 验证基类方法存在
      expect(repo).toHaveProperty('getById')
      expect(repo).toHaveProperty('getAll')
      expect(repo).toHaveProperty('create')
      expect(repo).toHaveProperty('update')
      expect(repo).toHaveProperty('delete')
      expect(repo).toHaveProperty('findBy')
      expect(repo).toHaveProperty('findOneBy')
      expect(repo).toHaveProperty('count')
      expect(repo).toHaveProperty('exists')
    }
  )
})

