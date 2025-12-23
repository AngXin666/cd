/**
 * 导航工具函数属性测试
 *
 * 使用 fast-check 进行属性测试，验证 isDashboardPage 函数的正确性
 *
 * **Feature: back-navigation-optimization, Property 3: 工作台页面识别**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 *
 * @module utils/navigation.test
 */

import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { isDashboardPage, DASHBOARD_PATHS, isLoginPage, LOGIN_PATH } from './navigation'

// ==================== 常量定义 ====================

/**
 * 普通页面路径示例（非工作台页面）
 * 用于测试 isDashboardPage 返回 false 的情况
 */
const NORMAL_PAGE_PATHS = [
  '/pages/driver/attendance/index',
  '/pages/driver/leave/index',
  '/pages/driver/vehicle/index',
  '/pages/manager/users/index',
  '/pages/manager/attendance/index',
  '/pages/common/settings/index',
  '/pages/common/about/index',
  '/pages/login/index',
  '/pages/shared/notification/index'
]

/**
 * 无效路径示例
 * 用于测试边界情况
 * 注意：根据设计规范规则 2，/pages/driver、/pages/manager 等路径
 * 会被识别为工作台页面，因此不在此列表中
 */
const INVALID_PATHS = [
  '',
  '/',
  '/pages',
  '/pages/',
  'pages/driver/index',
  'driver/index',
  '/index',
  '/pages/index'
]

// ==================== 生成器定义 ====================

/**
 * 生成工作台页面路径
 * 从 DASHBOARD_PATHS 中随机选择一个
 */
const dashboardPathArb = fc.constantFrom(...DASHBOARD_PATHS)

/**
 * 生成带查询参数的工作台页面路径
 * 例如：/pages/driver/index?tab=1&id=123
 */
const dashboardPathWithQueryArb = fc.tuple(
  dashboardPathArb,
  fc.webQueryParameters()
).map(([path, query]) => query ? `${path}?${query}` : path)

/**
 * 生成带 hash 的工作台页面路径
 * 例如：/pages/driver/index#section1
 */
const dashboardPathWithHashArb = fc.tuple(
  dashboardPathArb,
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9-_]+$/.test(s))
).map(([path, hash]) => `${path}#${hash}`)

/**
 * 生成普通页面路径
 * 从 NORMAL_PAGE_PATHS 中随机选择一个
 */
const normalPagePathArb = fc.constantFrom(...NORMAL_PAGE_PATHS)

/**
 * 生成随机的非工作台页面路径
 * 确保生成的路径不包含任何工作台路径
 */
const randomNonDashboardPathArb = fc.tuple(
  fc.constantFrom('driver', 'manager', 'common', 'shared', 'login'),
  fc.constantFrom('attendance', 'leave', 'vehicle', 'users', 'settings', 'about', 'notification'),
  fc.constantFrom('index', 'detail', 'list', 'edit', 'create')
).map(([module, feature, page]) => `/pages/${module}/${feature}/${page}`)

/**
 * 生成无效路径
 * 用于测试边界情况
 */
const invalidPathArb = fc.oneof(
  fc.constant(''),
  fc.constant('/'),
  fc.constant('/pages'),
  fc.string({ minLength: 0, maxLength: 5 }),
  fc.string({ minLength: 1, maxLength: 50 }).filter(s => 
    !DASHBOARD_PATHS.some(dp => s.includes(dp))
  )
)

// ==================== 属性测试 ====================

describe('isDashboardPage 属性测试', () => {
  /**
   * **Feature: back-navigation-optimization, Property 3: 工作台页面识别**
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
   *
   * 验证 isDashboardPage 函数能正确识别工作台页面
   */
  describe('Property 3: 工作台页面识别', () => {
    it('对于任意工作台页面路径，应返回 true', () => {
      fc.assert(
        fc.property(dashboardPathArb, (path) => {
          // 执行函数
          const result = isDashboardPage(path)

          // 验证返回 true
          expect(result).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('对于带查询参数的工作台页面路径，应返回 true', () => {
      fc.assert(
        fc.property(dashboardPathWithQueryArb, (path) => {
          const result = isDashboardPage(path)
          expect(result).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('对于带 hash 的工作台页面路径，应返回 true', () => {
      fc.assert(
        fc.property(dashboardPathWithHashArb, (path) => {
          const result = isDashboardPage(path)
          expect(result).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('对于任意普通页面路径，应返回 false', () => {
      fc.assert(
        fc.property(normalPagePathArb, (path) => {
          const result = isDashboardPage(path)
          expect(result).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('对于随机生成的非工作台页面路径，应返回 false', () => {
      fc.assert(
        fc.property(randomNonDashboardPathArb, (path) => {
          const result = isDashboardPage(path)
          expect(result).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('对于无效路径，应返回 false', () => {
      fc.assert(
        fc.property(invalidPathArb, (path) => {
          const result = isDashboardPage(path)
          expect(result).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('工作台页面路径数量应为 5 个', () => {
      expect(DASHBOARD_PATHS).toHaveLength(5)
    })

    it('所有预定义的工作台路径都应被正确识别', () => {
      // 验证所有 5 个工作台路径
      const expectedPaths = [
        '/pages/index/index',      // 路由分发页
        '/pages/driver/index',     // 司机工作台
        '/pages/manager/index',    // 管理员工作台
        '/pages/super-admin/index', // 老板工作台
        '/pages/profile/index'     // 个人中心
      ]

      for (const path of expectedPaths) {
        expect(isDashboardPage(path)).toBe(true)
      }
    })
  })
})

// ==================== 单元测试（边界情况）====================

describe('isDashboardPage 单元测试', () => {
  describe('工作台页面路径测试', () => {
    it('应正确识别 /pages/index/index（路由分发页）', () => {
      expect(isDashboardPage('/pages/index/index')).toBe(true)
    })

    it('应正确识别 /pages/driver/index（司机工作台）', () => {
      expect(isDashboardPage('/pages/driver/index')).toBe(true)
    })

    it('应正确识别 /pages/manager/index（管理员工作台）', () => {
      expect(isDashboardPage('/pages/manager/index')).toBe(true)
    })

    it('应正确识别 /pages/super-admin/index（老板工作台）', () => {
      expect(isDashboardPage('/pages/super-admin/index')).toBe(true)
    })

    it('应正确识别 /pages/profile/index（个人中心）', () => {
      expect(isDashboardPage('/pages/profile/index')).toBe(true)
    })
  })

  describe('带查询参数的路径测试', () => {
    it('应正确识别带查询参数的工作台路径', () => {
      expect(isDashboardPage('/pages/driver/index?tab=1')).toBe(true)
      expect(isDashboardPage('/pages/manager/index?id=123&name=test')).toBe(true)
      expect(isDashboardPage('/pages/super-admin/index?')).toBe(true)
    })
  })

  describe('普通页面路径测试', () => {
    it('应正确识别普通页面路径（返回 false）', () => {
      expect(isDashboardPage('/pages/driver/attendance/index')).toBe(false)
      expect(isDashboardPage('/pages/driver/leave/index')).toBe(false)
      expect(isDashboardPage('/pages/manager/users/index')).toBe(false)
      expect(isDashboardPage('/pages/common/settings/index')).toBe(false)
    })

    it('应正确识别登录页面（返回 false）', () => {
      expect(isDashboardPage('/pages/login/index')).toBe(false)
    })
  })

  describe('边界情况测试', () => {
    it('空字符串应返回 false', () => {
      expect(isDashboardPage('')).toBe(false)
    })

    it('根路径应返回 false', () => {
      expect(isDashboardPage('/')).toBe(false)
    })

    it('不完整的路径应返回 false', () => {
      expect(isDashboardPage('/pages')).toBe(false)
      expect(isDashboardPage('/pages/')).toBe(false)
    })

    it('不含 /index 后缀的工作台路径应返回 true（设计规范规则 2）', () => {
      // 根据设计文档规则 2：路径以工作台路径结尾（不含 /index 后缀）
      // 例如：/pages/driver 匹配 /pages/driver/index
      expect(isDashboardPage('/pages/driver')).toBe(true)
      expect(isDashboardPage('/pages/manager')).toBe(true)
      expect(isDashboardPage('/pages/super-admin')).toBe(true)
      expect(isDashboardPage('/pages/profile')).toBe(true)
    })

    it('相似但不完全匹配的路径应返回 false', () => {
      // 这些路径包含工作台路径的部分，但不是完整匹配
      expect(isDashboardPage('/pages/driver/index/detail')).toBe(true) // 包含完整路径
      expect(isDashboardPage('/pages/driver-new/index')).toBe(false)
      expect(isDashboardPage('/pages/super-admin-new/index')).toBe(false)
    })
  })
})

// ==================== isLoginPage 测试 ====================

describe('isLoginPage 单元测试', () => {
  it('应正确识别登录页面', () => {
    expect(isLoginPage('/pages/login/index')).toBe(true)
    expect(isLoginPage('/pages/login/index?redirect=/pages/driver/index')).toBe(true)
  })

  it('应正确识别非登录页面', () => {
    expect(isLoginPage('/pages/driver/index')).toBe(false)
    expect(isLoginPage('/pages/index/index')).toBe(false)
    expect(isLoginPage('')).toBe(false)
  })

  it('LOGIN_PATH 常量应正确定义', () => {
    expect(LOGIN_PATH).toBe('/pages/login/index')
  })
})

// ==================== DASHBOARD_PATHS 常量测试 ====================

describe('DASHBOARD_PATHS 常量测试', () => {
  it('应包含所有 5 个工作台页面路径', () => {
    expect(DASHBOARD_PATHS).toContain('/pages/index/index')
    expect(DASHBOARD_PATHS).toContain('/pages/driver/index')
    expect(DASHBOARD_PATHS).toContain('/pages/manager/index')
    expect(DASHBOARD_PATHS).toContain('/pages/super-admin/index')
    expect(DASHBOARD_PATHS).toContain('/pages/profile/index')
  })

  it('应只包含 5 个路径', () => {
    expect(DASHBOARD_PATHS).toHaveLength(5)
  })

  it('所有路径应以 /pages 开头', () => {
    for (const path of DASHBOARD_PATHS) {
      expect(path.startsWith('/pages')).toBe(true)
    }
  })

  it('所有路径应以 /index 结尾', () => {
    for (const path of DASHBOARD_PATHS) {
      expect(path.endsWith('/index')).toBe(true)
    }
  })
})
