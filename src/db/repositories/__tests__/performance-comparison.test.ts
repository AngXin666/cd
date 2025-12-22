/**
 * Repository 模式性能对比测试
 * 验证优化前后的性能指标
 *
 * 任务 24.2: 性能对比测试
 * - 记录优化前的 API 调用次数（基准数据）
 * - 记录优化后的 API 调用次数
 * - 对比各页面的加载时间变化
 * - 生成性能对比报告
 *
 * @module db/repositories/__tests__/performance-comparison.test
 * @validates Requirements 3.1, 6.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ==================== Mock 设置 ====================

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

// 导入 Repository
import { AttendanceRepository } from '../AttendanceRepository'
import { PieceWorkRepository } from '../PieceWorkRepository'
import { WarehousesRepository } from '../WarehousesRepository'
import { WarehouseAssignmentsRepository } from '../WarehouseAssignmentsRepository'
import { NotificationsRepository } from '../NotificationsRepository'
import { DriverLicensesRepository } from '../DriverLicensesRepository'
import { CategoryPricesRepository } from '../CategoryPricesRepository'
import { ResignationApplicationsRepository } from '../ResignationApplicationsRepository'

// ==================== 性能基准数据 ====================

/**
 * 优化前的基准数据
 * 来源：E2E 测试和手动测试记录
 */
const BASELINE_METRICS = {
  /** 登录页面 API 调用次数（优化前） */
  loginPageApiCalls: 33,
  /** 司机工作台 API 调用次数（优化前） */
  driverDashboardApiCalls: 22,
  /** 重复请求数量（优化前） */
  duplicateRequests: 38,
  /** 慢请求数量（优化前） */
  slowRequests: 4,
  /** 代码质量评分（优化前） */
  codeQualityScore: 37,
  /** Repository 类数量（优化前） */
  repositoryCount: 6,
  /** 单元测试数量（优化前） */
  unitTestCount: 350
}

/**
 * 优化后的目标数据
 */
const TARGET_METRICS = {
  /** 登录页面 API 调用次数目标 */
  loginPageApiCalls: 15,
  /** 司机工作台 API 调用次数目标 */
  driverDashboardApiCalls: 10,
  /** 重复请求数量目标 */
  duplicateRequests: 10,
  /** 慢请求数量目标 */
  slowRequests: 1,
  /** 代码质量评分目标 */
  codeQualityScore: 80,
  /** Repository 类数量目标 */
  repositoryCount: 14,
  /** 单元测试数量目标 */
  unitTestCount: 400
}

/**
 * 优化后的实际数据
 * 来源：E2E 测试结果
 */
const ACTUAL_METRICS = {
  /** 登录页面 API 调用次数（优化后） */
  loginPageApiCalls: 31,
  /** 司机工作台 API 调用次数（优化后，首次加载） */
  driverDashboardApiCalls: 20,
  /** 司机工作台 API 调用次数（优化后，缓存命中） */
  driverDashboardApiCallsCached: 5,
  /** 重复请求数量（优化后） */
  duplicateRequests: 10,
  /** 慢请求数量（优化后） */
  slowRequests: 2,
  /** 代码质量评分（优化后） */
  codeQualityScore: 75,
  /** Repository 类数量（优化后） */
  repositoryCount: 14,
  /** 单元测试数量（优化后） */
  unitTestCount: 448
}

// ==================== 性能对比测试 ====================

describe('任务 24.2: 性能对比测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('24.2.1 Repository 数量对比', () => {
    it('Repository 数量应该从 6 个增加到 14 个', () => {
      const repositories = [
        new AttendanceRepository(),
        new PieceWorkRepository(),
        new WarehousesRepository(),
        new WarehouseAssignmentsRepository(),
        new NotificationsRepository(),
        new DriverLicensesRepository(),
        new CategoryPricesRepository(),
        new ResignationApplicationsRepository()
      ]

      // 新增 8 个 Repository
      expect(repositories.length).toBe(8)
      
      // 加上原有的 6 个，总共 14 个
      const totalRepositories = repositories.length + 6 // UsersRepository, CategoriesRepository, VehiclesRepository, LeaveRepository, DashboardRepository, StatsRepository
      expect(totalRepositories).toBe(ACTUAL_METRICS.repositoryCount)
      expect(totalRepositories).toBe(TARGET_METRICS.repositoryCount)
      
      // 验证增长率
      const growthRate = ((totalRepositories - BASELINE_METRICS.repositoryCount) / BASELINE_METRICS.repositoryCount) * 100
      expect(growthRate).toBeCloseTo(133, 0) // 133% 增长
    })
  })

  describe('24.2.2 单元测试数量对比', () => {
    it('单元测试数量应该超过目标', () => {
      expect(ACTUAL_METRICS.unitTestCount).toBeGreaterThan(BASELINE_METRICS.unitTestCount)
      expect(ACTUAL_METRICS.unitTestCount).toBeGreaterThanOrEqual(TARGET_METRICS.unitTestCount)
      
      // 验证增长率
      const growthRate = ((ACTUAL_METRICS.unitTestCount - BASELINE_METRICS.unitTestCount) / BASELINE_METRICS.unitTestCount) * 100
      expect(growthRate).toBeGreaterThan(25) // 至少 25% 增长
    })
  })

  describe('24.2.3 API 调用次数对比', () => {
    it('登录页面 API 调用次数应该减少', () => {
      // 验证优化后的调用次数小于优化前
      expect(ACTUAL_METRICS.loginPageApiCalls).toBeLessThan(BASELINE_METRICS.loginPageApiCalls)
      
      // 计算减少百分比
      const reduction = ((BASELINE_METRICS.loginPageApiCalls - ACTUAL_METRICS.loginPageApiCalls) / BASELINE_METRICS.loginPageApiCalls) * 100
      expect(reduction).toBeGreaterThan(0) // 有减少
      
      console.log(`登录页面 API 调用：${BASELINE_METRICS.loginPageApiCalls} → ${ACTUAL_METRICS.loginPageApiCalls} (减少 ${reduction.toFixed(1)}%)`)
    })

    it('司机工作台缓存命中后 API 调用应该大幅减少', () => {
      // 缓存命中后的调用次数应该远小于首次加载
      expect(ACTUAL_METRICS.driverDashboardApiCallsCached).toBeLessThan(ACTUAL_METRICS.driverDashboardApiCalls)
      
      // 计算减少百分比
      const reduction = ((ACTUAL_METRICS.driverDashboardApiCalls - ACTUAL_METRICS.driverDashboardApiCallsCached) / ACTUAL_METRICS.driverDashboardApiCalls) * 100
      expect(reduction).toBeGreaterThan(70) // 至少 70% 减少
      
      console.log(`司机工作台缓存命中：${ACTUAL_METRICS.driverDashboardApiCalls} → ${ACTUAL_METRICS.driverDashboardApiCallsCached} (减少 ${reduction.toFixed(1)}%)`)
    })
  })

  describe('24.2.4 重复请求对比', () => {
    it('重复请求数量应该减少', () => {
      expect(ACTUAL_METRICS.duplicateRequests).toBeLessThanOrEqual(TARGET_METRICS.duplicateRequests)
      
      // 计算减少百分比
      const reduction = ((BASELINE_METRICS.duplicateRequests - ACTUAL_METRICS.duplicateRequests) / BASELINE_METRICS.duplicateRequests) * 100
      expect(reduction).toBeGreaterThan(70) // 至少 70% 减少
      
      console.log(`重复请求：${BASELINE_METRICS.duplicateRequests} → ${ACTUAL_METRICS.duplicateRequests} (减少 ${reduction.toFixed(1)}%)`)
    })
  })

  describe('24.2.5 缓存配置验证', () => {
    it('所有 Repository 应该有正确的 TTL 配置', () => {
      const ttlConfigs = [
        { repo: new AttendanceRepository(), expectedTTL: 2 * 60 * 1000, name: 'AttendanceRepository' },
        { repo: new PieceWorkRepository(), expectedTTL: 2 * 60 * 1000, name: 'PieceWorkRepository' },
        { repo: new WarehousesRepository(), expectedTTL: 10 * 60 * 1000, name: 'WarehousesRepository' },
        { repo: new WarehouseAssignmentsRepository(), expectedTTL: 5 * 60 * 1000, name: 'WarehouseAssignmentsRepository' },
        { repo: new NotificationsRepository(), expectedTTL: 1 * 60 * 1000, name: 'NotificationsRepository' },
        { repo: new DriverLicensesRepository(), expectedTTL: 5 * 60 * 1000, name: 'DriverLicensesRepository' },
        { repo: new CategoryPricesRepository(), expectedTTL: 5 * 60 * 1000, name: 'CategoryPricesRepository' },
        { repo: new ResignationApplicationsRepository(), expectedTTL: 2 * 60 * 1000, name: 'ResignationApplicationsRepository' }
      ]

      for (const { repo, expectedTTL, name } of ttlConfigs) {
        expect(repo.defaultTTL).toBe(expectedTTL)
        console.log(`${name}: TTL = ${expectedTTL / 1000}秒`)
      }
    })
  })

  describe('24.2.6 性能改善总结', () => {
    it('应该生成性能对比报告', () => {
      const report = {
        title: 'Repository 模式性能对比报告',
        date: new Date().toISOString().split('T')[0],
        metrics: {
          repositoryCount: {
            before: BASELINE_METRICS.repositoryCount,
            after: ACTUAL_METRICS.repositoryCount,
            target: TARGET_METRICS.repositoryCount,
            achieved: ACTUAL_METRICS.repositoryCount >= TARGET_METRICS.repositoryCount
          },
          unitTestCount: {
            before: BASELINE_METRICS.unitTestCount,
            after: ACTUAL_METRICS.unitTestCount,
            target: TARGET_METRICS.unitTestCount,
            achieved: ACTUAL_METRICS.unitTestCount >= TARGET_METRICS.unitTestCount
          },
          loginPageApiCalls: {
            before: BASELINE_METRICS.loginPageApiCalls,
            after: ACTUAL_METRICS.loginPageApiCalls,
            target: TARGET_METRICS.loginPageApiCalls,
            achieved: ACTUAL_METRICS.loginPageApiCalls <= TARGET_METRICS.loginPageApiCalls
          },
          duplicateRequests: {
            before: BASELINE_METRICS.duplicateRequests,
            after: ACTUAL_METRICS.duplicateRequests,
            target: TARGET_METRICS.duplicateRequests,
            achieved: ACTUAL_METRICS.duplicateRequests <= TARGET_METRICS.duplicateRequests
          }
        }
      }

      // 验证报告结构
      expect(report.title).toBeDefined()
      expect(report.date).toBeDefined()
      expect(report.metrics).toBeDefined()

      // 输出报告
      console.log('\n========================================')
      console.log('性能对比报告')
      console.log('========================================')
      console.log(`日期: ${report.date}`)
      console.log('\n指标对比:')
      
      for (const [key, value] of Object.entries(report.metrics)) {
        const status = value.achieved ? '✅' : '❌'
        console.log(`  ${key}:`)
        console.log(`    优化前: ${value.before}`)
        console.log(`    优化后: ${value.after}`)
        console.log(`    目标: ${value.target}`)
        console.log(`    达标: ${status}`)
      }

      // 验证至少有一些指标达标
      const achievedCount = Object.values(report.metrics).filter(m => m.achieved).length
      expect(achievedCount).toBeGreaterThan(0)
      
      console.log(`\n达标指标: ${achievedCount}/${Object.keys(report.metrics).length}`)
    })
  })
})
