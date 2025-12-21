/**
 * 页面追踪器属性测试
 * 使用 fast-check 进行属性测试，验证页面分组统计的正确性
 * 
 * **Feature: e2e-api-statistics, Property 3: 页面分组统计正确性**
 * **Validates: Requirements 2.3**
 * 
 * @module e2e/utils/__tests__/page-tracker.test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { PageTracker, createPageTracker } from '../page-tracker'
import type { ApiCallRecord } from '../api-interceptor'

/**
 * 生成有效的页面路径
 */
const pagePathArb = fc.constantFrom(
  '/pages/driver/index',
  '/pages/driver/piece-work-entry/index',
  '/pages/driver/clock-in/index',
  '/pages/driver/leave/index',
  '/pages/profile/index',
  '/pages/manager/dashboard',
  '/pages/manager/drivers',
  '/pages/login/index'
)

/**
 * 生成有效的页面标题
 */
const pageTitleArb = fc.constantFrom(
  '司机工作台',
  '计件录入',
  '打卡签到',
  '请假申请',
  '个人中心',
  '管理后台',
  '司机管理',
  '登录'
)

/**
 * 生成有效的 HTTP 方法
 */
const httpMethodArb = fc.constantFrom('GET', 'POST', 'PATCH', 'DELETE')

/**
 * 生成有效的 Supabase 表名
 */
const tableNameArb = fc.constantFrom(
  'users',
  'attendance',
  'piece_work_records',
  'leave_applications',
  'vehicles',
  'warehouses'
)

/**
 * 生成有效的 Supabase REST API URL
 */
const supabaseUrlArb = fc.tuple(
  fc.constant('https://abc123.supabase.co'),
  tableNameArb
).map(([baseUrl, table]) => `${baseUrl}/rest/v1/${table}`)

/**
 * 生成有效的 HTTP 状态码
 */
const statusCodeArb = fc.constantFrom(200, 201, 204, 400, 401, 403, 404, 500)

/**
 * 生成有效的响应时间（毫秒）
 */
const durationArb = fc.integer({ min: 1, max: 5000 })

/**
 * 生成单个 API 调用记录
 */
const apiCallRecordArb: fc.Arbitrary<ApiCallRecord> = fc.record({
  url: supabaseUrlArb,
  method: httpMethodArb,
  timestamp: fc.integer({ min: 1700000000000, max: 1800000000000 }),
  status: statusCodeArb,
  duration: durationArb,
  table: tableNameArb,
  operation: fc.constantFrom('select', 'insert', 'update', 'delete')
})

/**
 * 生成页面访问数据（路径、标题、API 调用数量）
 */
const pageVisitDataArb = fc.record({
  path: pagePathArb,
  title: pageTitleArb,
  apiCallCount: fc.integer({ min: 0, max: 10 })
})

/**
 * 生成多个页面访问数据
 */
const multiplePageVisitsArb = fc.array(pageVisitDataArb, { minLength: 1, maxLength: 10 })

describe('PageTracker', () => {
  let tracker: PageTracker

  beforeEach(() => {
    tracker = createPageTracker()
  })

  describe('基本功能测试', () => {
    it('应该正确创建追踪器实例', () => {
      expect(tracker).toBeInstanceOf(PageTracker)
      expect(tracker.hasCurrentPage()).toBe(false)
      expect(tracker.getPageVisits()).toEqual([])
    })

    it('应该正确进入和离开页面', () => {
      tracker.enterPage('/test/page', '测试页面')
      expect(tracker.hasCurrentPage()).toBe(true)
      expect(tracker.getCurrentPagePath()).toBe('/test/page')
      
      tracker.leavePage()
      expect(tracker.hasCurrentPage()).toBe(false)
      expect(tracker.getPageVisits().length).toBe(1)
    })

    it('应该正确添加 API 调用到当前页面', () => {
      tracker.enterPage('/test/page', '测试页面')
      
      const apiCall: ApiCallRecord = {
        url: 'https://abc.supabase.co/rest/v1/users',
        method: 'GET',
        timestamp: Date.now(),
        status: 200,
        duration: 100
      }
      
      tracker.addApiCall(apiCall)
      
      const current = tracker.getCurrentPage()
      expect(current?.apiCalls.length).toBe(1)
      expect(current?.apiCalls[0].pagePath).toBe('/test/page')
    })

    it('应该正确添加错误到当前页面', () => {
      tracker.enterPage('/test/page', '测试页面')
      tracker.addError('测试错误')
      
      const current = tracker.getCurrentPage()
      expect(current?.errors.length).toBe(1)
      expect(current?.errors[0]).toBe('测试错误')
    })

    it('应该正确清空记录', () => {
      tracker.enterPage('/test/page', '测试页面')
      tracker.leavePage()
      tracker.clear()
      
      expect(tracker.getPageVisits()).toEqual([])
      expect(tracker.hasCurrentPage()).toBe(false)
    })
  })

  /**
   * Property 3: 页面分组统计正确性
   * 
   * *For any* 测试记录集合，按页面分组后的 API 调用总数应等于所有 API 调用的总数。
   * 
   * **Feature: e2e-api-statistics, Property 3: 页面分组统计正确性**
   * **Validates: Requirements 2.3**
   */
  describe('Property 3: 页面分组统计正确性', () => {
    it('对于任意页面访问序列，按页面分组后的 API 调用总数应等于所有 API 调用的总数', () => {
      fc.assert(
        fc.property(
          multiplePageVisitsArb,
          fc.array(apiCallRecordArb, { minLength: 0, maxLength: 20 }),
          (pageVisits, apiCalls) => {
            const testTracker = createPageTracker()
            let totalApiCallsAdded = 0
            let apiCallIndex = 0

            // 模拟页面访问和 API 调用
            for (const visit of pageVisits) {
              testTracker.enterPage(visit.path, visit.title)
              
              // 为每个页面添加指定数量的 API 调用
              for (let i = 0; i < visit.apiCallCount && apiCallIndex < apiCalls.length; i++) {
                testTracker.addApiCall(apiCalls[apiCallIndex])
                totalApiCallsAdded++
                apiCallIndex++
              }
              
              testTracker.leavePage()
            }

            // 验证：按页面分组后的 API 调用总数应等于添加的总数
            const allApiCalls = testTracker.getAllApiCalls()
            expect(allApiCalls.length).toBe(totalApiCallsAdded)

            // 验证：通过 getPageStats 统计的 API 调用总数也应相等
            const stats = testTracker.getPageStats()
            let statsTotal = 0
            for (const pageStat of Object.values(stats)) {
              statsTotal += pageStat.apiCallCount
            }
            expect(statsTotal).toBe(totalApiCallsAdded)

            // 验证：getTotalApiCalls 返回的总数也应相等
            expect(testTracker.getTotalApiCalls()).toBe(totalApiCallsAdded)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于任意页面访问序列，每个页面的 API 调用应正确关联到该页面', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              path: pagePathArb,
              title: pageTitleArb,
              apiCallCount: fc.integer({ min: 1, max: 5 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (pageVisits) => {
            const testTracker = createPageTracker()
            const expectedApiCallsByPage: Record<string, number> = {}

            // 模拟页面访问和 API 调用
            for (const visit of pageVisits) {
              testTracker.enterPage(visit.path, visit.title)
              
              // 初始化或累加该页面的预期 API 调用数
              if (!expectedApiCallsByPage[visit.path]) {
                expectedApiCallsByPage[visit.path] = 0
              }
              
              // 为每个页面添加指定数量的 API 调用
              for (let i = 0; i < visit.apiCallCount; i++) {
                const apiCall: ApiCallRecord = {
                  url: `https://abc.supabase.co/rest/v1/users?page=${visit.path}`,
                  method: 'GET',
                  timestamp: Date.now() + i
                }
                testTracker.addApiCall(apiCall)
                expectedApiCallsByPage[visit.path]++
              }
              
              testTracker.leavePage()
            }

            // 验证：每个页面的 API 调用数应与预期相符
            const stats = testTracker.getPageStats()
            for (const [path, expected] of Object.entries(expectedApiCallsByPage)) {
              expect(stats[path]?.apiCallCount).toBe(expected)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('对于任意页面访问序列，所有 API 调用的 pagePath 应正确设置', () => {
      fc.assert(
        fc.property(
          fc.array(pagePathArb, { minLength: 1, maxLength: 5 }),
          (paths) => {
            const testTracker = createPageTracker()

            // 模拟页面访问和 API 调用
            for (const path of paths) {
              testTracker.enterPage(path, `页面 ${path}`)
              
              // 添加一个 API 调用
              const apiCall: ApiCallRecord = {
                url: 'https://abc.supabase.co/rest/v1/users',
                method: 'GET',
                timestamp: Date.now()
              }
              testTracker.addApiCall(apiCall)
              
              testTracker.leavePage()
            }

            // 验证：所有 API 调用的 pagePath 应正确设置
            const allCalls = testTracker.getAllApiCalls()
            const visits = testTracker.getPageVisits()
            
            expect(allCalls.length).toBe(paths.length)
            
            for (let i = 0; i < allCalls.length; i++) {
              expect(allCalls[i].pagePath).toBe(visits[i].path)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('页面访问记录', () => {
    it('对于任意页面路径和标题，enterPage 后 getCurrentPage 应返回正确的记录', () => {
      fc.assert(
        fc.property(
          pagePathArb,
          pageTitleArb,
          (path, title) => {
            const testTracker = createPageTracker()
            testTracker.enterPage(path, title)
            
            const current = testTracker.getCurrentPage()
            expect(current).not.toBeNull()
            expect(current?.path).toBe(path)
            expect(current?.title).toBe(title)
            expect(current?.apiCalls).toEqual([])
            expect(current?.errors).toEqual([])
            expect(current?.enterTime).toBeGreaterThan(0)
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('对于任意页面访问，leavePage 后应正确计算停留时长', () => {
      fc.assert(
        fc.property(
          pagePathArb,
          pageTitleArb,
          (path, title) => {
            const testTracker = createPageTracker()
            const beforeEnter = Date.now()
            
            testTracker.enterPage(path, title)
            testTracker.leavePage()
            
            const afterLeave = Date.now()
            const visits = testTracker.getPageVisits()
            
            expect(visits.length).toBe(1)
            expect(visits[0].duration).toBeDefined()
            expect(visits[0].duration).toBeGreaterThanOrEqual(0)
            expect(visits[0].duration).toBeLessThanOrEqual(afterLeave - beforeEnter + 10) // 允许 10ms 误差
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('连续进入多个页面时，前一个页面应自动关闭', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({ path: pagePathArb, title: pageTitleArb }),
            { minLength: 2, maxLength: 5 }
          ),
          (pages) => {
            const testTracker = createPageTracker()

            // 连续进入多个页面（不手动调用 leavePage）
            for (const page of pages) {
              testTracker.enterPage(page.path, page.title)
            }

            // 最后手动离开
            testTracker.leavePage()

            // 验证：所有页面都应该被记录
            const visits = testTracker.getPageVisits()
            expect(visits.length).toBe(pages.length)

            return true
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('错误处理', () => {
    it('对于任意错误信息，addError 应正确记录到当前页面', () => {
      fc.assert(
        fc.property(
          pagePathArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          (path, errorMsg) => {
            const testTracker = createPageTracker()
            testTracker.enterPage(path, '测试页面')
            testTracker.addError(errorMsg)
            
            const current = testTracker.getCurrentPage()
            expect(current?.errors.length).toBe(1)
            expect(current?.errors[0]).toBe(errorMsg)
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('对于任意错误序列，getTotalErrors 应返回正确的总数', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              path: pagePathArb,
              errorCount: fc.integer({ min: 0, max: 5 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (pageErrors) => {
            const testTracker = createPageTracker()
            let totalErrors = 0

            for (const page of pageErrors) {
              testTracker.enterPage(page.path, '测试页面')
              
              for (let i = 0; i < page.errorCount; i++) {
                testTracker.addError(`错误 ${i}`)
                totalErrors++
              }
              
              testTracker.leavePage()
            }

            expect(testTracker.getTotalErrors()).toBe(totalErrors)
            
            return true
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe('统计功能', () => {
    it('getPageStats 应返回空对象当没有记录时', () => {
      const stats = tracker.getPageStats()
      expect(stats).toEqual({})
    })

    it('getTotalApiCalls 应返回 0 当没有记录时', () => {
      expect(tracker.getTotalApiCalls()).toBe(0)
    })

    it('getTotalErrors 应返回 0 当没有记录时', () => {
      expect(tracker.getTotalErrors()).toBe(0)
    })

    it('getVisitCount 应返回 0 当没有记录时', () => {
      expect(tracker.getVisitCount()).toBe(0)
    })

    it('getAllApiCalls 应返回空数组当没有记录时', () => {
      expect(tracker.getAllApiCalls()).toEqual([])
    })
  })

  describe('边界情况', () => {
    it('没有当前页面时 addApiCall 不应崩溃', () => {
      const apiCall: ApiCallRecord = {
        url: 'https://abc.supabase.co/rest/v1/users',
        method: 'GET',
        timestamp: Date.now()
      }
      
      // 不应抛出错误
      expect(() => tracker.addApiCall(apiCall)).not.toThrow()
    })

    it('没有当前页面时 addError 不应崩溃', () => {
      // 不应抛出错误
      expect(() => tracker.addError('测试错误')).not.toThrow()
    })

    it('没有当前页面时 leavePage 不应崩溃', () => {
      // 不应抛出错误
      expect(() => tracker.leavePage()).not.toThrow()
    })

    it('getAllPageVisits 应包含当前正在访问的页面', () => {
      tracker.enterPage('/test/page', '测试页面')
      
      const allVisits = tracker.getAllPageVisits()
      expect(allVisits.length).toBe(1)
      expect(allVisits[0].path).toBe('/test/page')
    })
  })
})
