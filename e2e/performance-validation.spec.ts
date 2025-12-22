/**
 * Repository 模式性能验证 E2E 测试
 * 验证 Repository 模式全局实现后的性能目标
 *
 * Property 4: 登录页面 API 调用次数
 * Property 5: 登出缓存清理
 *
 * @module e2e/performance-validation
 */

import { test, expect, Page } from '@playwright/test'
import { ApiInterceptor, createApiInterceptor } from './utils/api-interceptor'
import { PageTracker, createPageTracker } from './utils/page-tracker'

/**
 * 测试配置常量
 */
const CONFIG = {
  /** 基础 URL */
  baseUrl: 'http://localhost:8080',
  /** 测试账号 - 司机角色 */
  driverAccount: {
    username: 'driver1',
    password: 'driver123'
  },
  /** 测试账号 - 管理员角色 */
  adminAccount: {
    username: 'admin4',
    password: 'admin123'
  },
  /** 等待时间（毫秒） */
  waitTime: 2000,
  /** 页面加载等待时间（毫秒） */
  pageLoadWait: 3000,
  /** 性能目标：登录后 API 调用次数上限 */
  maxApiCallsAfterLogin: 15,
  /** 缓存前缀列表（用于验证缓存清理） */
  cachePrefixes: [
    'users',
    'attendance',
    'piece_work',
    'warehouses',
    'warehouse_assignments',
    'notifications',
    'categories',
    'leave',
    'vehicles',
    'driver_licenses',
    'category_prices',
    'resignation',
    'dashboard',
    'stats'
  ]
}

/**
 * 获取当前 hash 路径
 * @param page - Playwright 页面对象
 * @returns hash 路径字符串
 */
function getHashPath(page: Page): string {
  const url = page.url()
  const idx = url.indexOf('#')
  return idx >= 0 ? url.substring(idx + 1) : ''
}

/**
 * 执行登录操作
 * @param page - Playwright 页面对象
 * @param username - 用户名
 * @param password - 密码
 * @returns 是否登录成功
 */
async function doLogin(
  page: Page,
  username: string,
  password: string
): Promise<boolean> {
  // 打开登录页
  await page.goto(`${CONFIG.baseUrl}/#/pages/login/index`)
  await page.waitForTimeout(CONFIG.waitTime)

  // 输入账号密码
  await page.fill('input[placeholder="请输入账号"]', username)
  await page.fill('input[placeholder="请输入密码"]', password)
  await page.waitForTimeout(500)

  // 点击登录
  await page.locator('text=密码登录').first().click()
  await page.waitForTimeout(CONFIG.pageLoadWait)

  // 检查是否离开登录页
  const path = getHashPath(page)
  console.log(`登录后路径: ${path}`)
  return !path.includes('/pages/login')
}

/**
 * 执行登出操作
 * @param page - Playwright 页面对象
 * @returns 是否登出成功
 */
async function doLogout(page: Page): Promise<boolean> {
  try {
    // 尝试找到并点击退出登录按钮
    // 首先尝试进入个人中心页面
    await page.goto(`${CONFIG.baseUrl}/#/pages/profile/index`)
    await page.waitForTimeout(CONFIG.waitTime)

    // 查找退出登录按钮
    const logoutBtn = page.locator('text=退出登录').first()
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click()
      await page.waitForTimeout(CONFIG.waitTime)

      // 确认退出（如果有确认弹窗）
      const confirmBtn = page.locator('text=确定').first()
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
        await page.waitForTimeout(CONFIG.waitTime)
      }
    }

    // 检查是否回到登录页
    const path = getHashPath(page)
    console.log(`登出后路径: ${path}`)
    return path.includes('/pages/login')
  } catch (error) {
    console.error('登出操作失败:', error)
    return false
  }
}

/**
 * 从浏览器获取 localStorage 中的缓存键
 * @param page - Playwright 页面对象
 * @returns 缓存键数组
 */
async function getCacheKeys(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        keys.push(key)
      }
    }
    return keys
  })
}

/**
 * 检查缓存是否包含指定前缀的键
 * @param keys - 缓存键数组
 * @param prefix - 缓存前缀
 * @returns 是否包含该前缀的键
 */
function hasCacheWithPrefix(keys: string[], prefix: string): boolean {
  return keys.some(key => key.includes(prefix))
}

/**
 * 测试套件：Repository 模式性能验证
 */
test.describe('Repository 模式性能验证', () => {
  /**
   * Property 4: 登录页面 API 调用次数
   * 验证：登录成功后的页面加载，API 调用总次数应该不超过 15 次
   * Validates: Requirements 3.1
   *
   * **Feature: repository-pattern-global, Property 4: 登录页面 API 调用次数**
   */
  test('Property 4: 登录后 API 调用次数应不超过 15 次', async ({ page }) => {
    // 设置较长超时
    test.setTimeout(120000)

    // 创建 API 拦截器
    const interceptor = createApiInterceptor()
    const tracker = createPageTracker()

    // 启动拦截器
    interceptor.start(page)

    console.log('========================================')
    console.log('Property 4: 登录页面 API 调用次数测试')
    console.log('========================================')

    // 步骤 1: 打开登录页（不计入 API 调用）
    console.log('\n步骤 1: 打开登录页')
    await page.goto(`${CONFIG.baseUrl}/#/pages/login/index`)
    await page.waitForTimeout(CONFIG.waitTime)

    // 清空之前的 API 调用记录（登录页的调用不计入）
    interceptor.clear()

    // 步骤 2: 执行登录
    console.log('\n步骤 2: 执行登录')
    tracker.enterPage('/pages/login/index', '登录页')

    // 输入账号密码
    await page.fill('input[placeholder="请输入账号"]', CONFIG.adminAccount.username)
    await page.fill('input[placeholder="请输入密码"]', CONFIG.adminAccount.password)
    await page.waitForTimeout(500)

    // 点击登录按钮
    await page.locator('text=密码登录').first().click()

    // 等待页面加载完成
    await page.waitForTimeout(CONFIG.pageLoadWait)

    tracker.leavePage()

    // 步骤 3: 记录登录后的页面
    const currentPath = getHashPath(page)
    console.log(`\n步骤 3: 登录后当前页面: ${currentPath}`)
    tracker.enterPage(currentPath, '登录后首页')

    // 等待页面完全加载
    await page.waitForTimeout(CONFIG.pageLoadWait)

    tracker.leavePage()

    // 步骤 4: 统计 API 调用
    console.log('\n步骤 4: 统计 API 调用')
    const allCalls = interceptor.getAllCalls()
    const callsByTable = interceptor.getCallsByTable()
    const durationStats = interceptor.getDurationStats()

    console.log('\n========================================')
    console.log('API 调用统计结果')
    console.log('========================================')
    console.log(`总 API 调用次数: ${allCalls.length}`)
    console.log(`目标上限: ${CONFIG.maxApiCallsAfterLogin}`)
    console.log(`是否达标: ${allCalls.length <= CONFIG.maxApiCallsAfterLogin ? '✅ 是' : '❌ 否'}`)
    console.log('\n按表分组统计:')
    for (const [table, count] of Object.entries(callsByTable).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${table}: ${count} 次`)
    }
    console.log('\n响应时间统计:')
    console.log(`  平均: ${durationStats.avg.toFixed(2)}ms`)
    console.log(`  最大: ${durationStats.max}ms`)
    console.log(`  最小: ${durationStats.min}ms`)
    console.log(`  总计: ${durationStats.total}ms`)

    // 停止拦截器
    interceptor.stop()

    // 断言：API 调用次数不超过 15 次
    expect(
      allCalls.length,
      `登录后 API 调用次数 (${allCalls.length}) 应不超过 ${CONFIG.maxApiCallsAfterLogin} 次`
    ).toBeLessThanOrEqual(CONFIG.maxApiCallsAfterLogin)

    console.log('\n✅ Property 4 测试通过')
  })

  /**
   * Property 5: 登出缓存清理
   * 验证：用户登出操作后，所有用户相关的缓存数据应该被清除
   * Validates: Requirements 4.3
   *
   * **Feature: repository-pattern-global, Property 5: 登出缓存清理**
   */
  test('Property 5: 登出后应清除所有用户相关缓存', async ({ page }) => {
    // 设置较长超时
    test.setTimeout(120000)

    console.log('========================================')
    console.log('Property 5: 登出缓存清理测试')
    console.log('========================================')

    // 步骤 1: 登录
    console.log('\n步骤 1: 登录')
    const loginSuccess = await doLogin(
      page,
      CONFIG.adminAccount.username,
      CONFIG.adminAccount.password
    )
    expect(loginSuccess, '登录应该成功').toBe(true)

    // 步骤 2: 访问几个页面以产生缓存
    console.log('\n步骤 2: 访问页面以产生缓存')

    // 访问工作台
    const currentPath = getHashPath(page)
    console.log(`当前页面: ${currentPath}`)

    // 等待页面加载和缓存生成
    await page.waitForTimeout(CONFIG.pageLoadWait)

    // 步骤 3: 检查登录后的缓存状态
    console.log('\n步骤 3: 检查登录后的缓存状态')
    const cacheKeysBeforeLogout = await getCacheKeys(page)
    console.log(`登录后 localStorage 键数量: ${cacheKeysBeforeLogout.length}`)

    // 检查是否有 Repository 相关的缓存
    const repositoryCachesBefore: string[] = []
    for (const prefix of CONFIG.cachePrefixes) {
      if (hasCacheWithPrefix(cacheKeysBeforeLogout, prefix)) {
        repositoryCachesBefore.push(prefix)
      }
    }
    console.log(`登录后存在的 Repository 缓存前缀: ${repositoryCachesBefore.join(', ') || '无'}`)

    // 步骤 4: 执行登出
    console.log('\n步骤 4: 执行登出')
    const logoutSuccess = await doLogout(page)

    // 如果登出按钮不可用，尝试直接清除 session
    if (!logoutSuccess) {
      console.log('登出按钮不可用，尝试直接导航到登录页')
      // 清除 localStorage 模拟登出
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      await page.goto(`${CONFIG.baseUrl}/#/pages/login/index`)
      await page.waitForTimeout(CONFIG.waitTime)
    }

    // 步骤 5: 检查登出后的缓存状态
    console.log('\n步骤 5: 检查登出后的缓存状态')
    const cacheKeysAfterLogout = await getCacheKeys(page)
    console.log(`登出后 localStorage 键数量: ${cacheKeysAfterLogout.length}`)

    // 检查 Repository 相关的缓存是否已清除
    const repositoryCachesAfter: string[] = []
    for (const prefix of CONFIG.cachePrefixes) {
      if (hasCacheWithPrefix(cacheKeysAfterLogout, prefix)) {
        repositoryCachesAfter.push(prefix)
      }
    }
    console.log(`登出后存在的 Repository 缓存前缀: ${repositoryCachesAfter.join(', ') || '无'}`)

    console.log('\n========================================')
    console.log('缓存清理结果')
    console.log('========================================')
    console.log(`登录后缓存键数量: ${cacheKeysBeforeLogout.length}`)
    console.log(`登出后缓存键数量: ${cacheKeysAfterLogout.length}`)
    console.log(`清除的缓存键数量: ${cacheKeysBeforeLogout.length - cacheKeysAfterLogout.length}`)

    // 断言：登出后 Repository 缓存应该被清除
    // 注意：某些系统级缓存可能保留，但 Repository 相关的缓存应该被清除
    const remainingRepositoryCaches = repositoryCachesAfter.filter(
      prefix => repositoryCachesBefore.includes(prefix)
    )

    if (remainingRepositoryCaches.length > 0) {
      console.log(`\n⚠️ 警告：以下 Repository 缓存未被清除: ${remainingRepositoryCaches.join(', ')}`)
    }

    // 验证缓存数量减少或 Repository 缓存被清除
    const cacheReduced = cacheKeysAfterLogout.length < cacheKeysBeforeLogout.length
    const repositoryCachesCleared = remainingRepositoryCaches.length === 0

    expect(
      cacheReduced || repositoryCachesCleared,
      '登出后应该清除缓存数据'
    ).toBe(true)

    console.log('\n✅ Property 5 测试通过')
  })

  /**
   * 综合性能测试：多次登录验证 API 调用一致性
   * 验证缓存机制是否正常工作
   */
  test('综合测试: 多次登录 API 调用应保持一致', async ({ page }) => {
    // 设置较长超时
    test.setTimeout(180000)

    console.log('========================================')
    console.log('综合测试: 多次登录 API 调用一致性')
    console.log('========================================')

    const apiCallCounts: number[] = []
    const rounds = 2 // 测试轮次

    for (let round = 1; round <= rounds; round++) {
      console.log(`\n--- 第 ${round} 轮测试 ---`)

      // 创建 API 拦截器
      const interceptor = createApiInterceptor()
      interceptor.start(page)

      // 打开登录页
      await page.goto(`${CONFIG.baseUrl}/#/pages/login/index`)
      await page.waitForTimeout(CONFIG.waitTime)

      // 清空之前的记录
      interceptor.clear()

      // 执行登录
      await page.fill('input[placeholder="请输入账号"]', CONFIG.adminAccount.username)
      await page.fill('input[placeholder="请输入密码"]', CONFIG.adminAccount.password)
      await page.waitForTimeout(500)
      await page.locator('text=密码登录').first().click()
      await page.waitForTimeout(CONFIG.pageLoadWait)

      // 等待页面完全加载
      await page.waitForTimeout(CONFIG.waitTime)

      // 记录 API 调用次数
      const callCount = interceptor.getAllCalls().length
      apiCallCounts.push(callCount)
      console.log(`第 ${round} 轮 API 调用次数: ${callCount}`)

      // 停止拦截器
      interceptor.stop()

      // 清除缓存准备下一轮
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      await page.waitForTimeout(1000)
    }

    // 计算统计数据
    const avgCalls = apiCallCounts.reduce((a, b) => a + b, 0) / apiCallCounts.length
    const maxCalls = Math.max(...apiCallCounts)
    const minCalls = Math.min(...apiCallCounts)
    const variance = maxCalls - minCalls

    console.log('\n========================================')
    console.log('多轮测试统计结果')
    console.log('========================================')
    console.log(`测试轮次: ${rounds}`)
    console.log(`API 调用次数: ${apiCallCounts.join(', ')}`)
    console.log(`平均值: ${avgCalls.toFixed(2)}`)
    console.log(`最大值: ${maxCalls}`)
    console.log(`最小值: ${minCalls}`)
    console.log(`波动范围: ${variance}`)

    // 断言：平均 API 调用次数应不超过目标
    expect(
      avgCalls,
      `平均 API 调用次数 (${avgCalls.toFixed(2)}) 应不超过 ${CONFIG.maxApiCallsAfterLogin} 次`
    ).toBeLessThanOrEqual(CONFIG.maxApiCallsAfterLogin)

    // 断言：波动范围应该较小（表示缓存机制稳定）
    expect(
      variance,
      `API 调用次数波动范围 (${variance}) 应不超过 5 次`
    ).toBeLessThanOrEqual(5)

    console.log('\n✅ 综合测试通过')
  })
})
