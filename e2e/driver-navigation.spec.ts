/**
 * 司机端全页面覆盖测试
 * 使用直接 URL 导航确保覆盖所有页面
 * 记录每个页面的 API 调用，分析代码优化空间
 *
 * 司机端分包页面（18个）：
 * 1. /pages/driver/index - 司机工作台
 * 2. /pages/driver/piece-work-entry/index - 计件录入
 * 3. /pages/driver/clock-in/index - 考勤打卡
 * 4. /pages/driver/leave/index - 请假申请
 * 5. /pages/driver/leave/apply/index - 申请请假
 * 6. /pages/driver/leave/resign/index - 离职申请
 * 7. /pages/driver/vehicle-list/index - 车辆列表
 * 8. /pages/driver/add-vehicle/index - 添加车辆
 * 9. /pages/driver/license-ocr/index - 驾照OCR
 * 10. /pages/driver/vehicle-detail/index - 车辆详情
 * 11. /pages/driver/edit-vehicle/index - 编辑车辆
 * 12. /pages/driver/supplement-photos/index - 补充照片
 * 13. /pages/driver/return-vehicle/index - 归还车辆
 * 14. /pages/driver/piece-work/index - 计件记录
 * 15. /pages/driver/warehouse-stats/index - 仓库统计
 * 16. /pages/driver/attendance/index - 考勤记录
 * 17. /pages/driver/notifications/index - 通知中心
 * 18. /pages/driver/profile/index - 个人资料
 *
 * 个人中心分包页面（7个）：
 * 19. /pages/profile/index - 个人中心
 * 20. /pages/profile/settings/index - 设置
 * 21. /pages/profile/account-management/index - 账号管理
 * 22. /pages/profile/change-phone/index - 修改手机号
 * 23. /pages/profile/change-password/index - 修改密码
 * 24. /pages/profile/edit-name/index - 编辑姓名
 * 25. /pages/profile/help/index - 帮助中心
 *
 * @module e2e/driver-navigation
 */

import {test, expect, Page, Request, Response} from '@playwright/test'

// ============ 配置 ============

const CONFIG = {
  baseUrl: 'http://localhost:8080',
  account: { username: 'admin4', password: 'admin123' },
  pageWait: 2500,  // 页面加载等待时间
  timeout: 120000  // 测试超时时间
}

// ============ 所有需要测试的页面 ============

const ALL_PAGES = [
  // 司机端分包页面
  { name: '司机工作台', path: '/pages/driver/index' },
  { name: '计件录入', path: '/pages/driver/piece-work-entry/index' },
  { name: '考勤打卡', path: '/pages/driver/clock-in/index' },
  { name: '请假申请', path: '/pages/driver/leave/index' },
  { name: '申请请假', path: '/pages/driver/leave/apply/index' },
  { name: '离职申请', path: '/pages/driver/leave/resign/index' },
  { name: '车辆列表', path: '/pages/driver/vehicle-list/index' },
  { name: '添加车辆', path: '/pages/driver/add-vehicle/index' },
  { name: '驾照OCR', path: '/pages/driver/license-ocr/index' },
  { name: '车辆详情', path: '/pages/driver/vehicle-detail/index' },
  { name: '编辑车辆', path: '/pages/driver/edit-vehicle/index' },
  { name: '补充照片', path: '/pages/driver/supplement-photos/index' },
  { name: '归还车辆', path: '/pages/driver/return-vehicle/index' },
  { name: '计件记录', path: '/pages/driver/piece-work/index' },
  { name: '仓库统计', path: '/pages/driver/warehouse-stats/index' },
  { name: '考勤记录', path: '/pages/driver/attendance/index' },
  { name: '通知中心', path: '/pages/driver/notifications/index' },
  { name: '个人资料(司机)', path: '/pages/driver/profile/index' },
  // 个人中心分包页面
  { name: '个人中心', path: '/pages/profile/index' },
  { name: '设置', path: '/pages/profile/settings/index' },
  { name: '账号管理', path: '/pages/profile/account-management/index' },
  { name: '修改手机号', path: '/pages/profile/change-phone/index' },
  { name: '修改密码', path: '/pages/profile/change-password/index' },
  { name: '编辑姓名', path: '/pages/profile/edit-name/index' },
  { name: '帮助中心', path: '/pages/profile/help/index' },
]

// ============ 数据类型 ============

interface ApiCall {
  method: string
  table: string
  status: number
  duration: number
}

interface PageResult {
  name: string
  path: string
  success: boolean
  apiCalls: ApiCall[]
  issues: string[]
  error?: string
}

interface OptimizationIssue {
  page: string
  type: string
  description: string
  suggestion: string
}

// ============ 全局变量 ============

let currentApiCalls: ApiCall[] = []
const requestTimes = new Map<string, number>()
const results: PageResult[] = []
const issues: OptimizationIssue[] = []

// ============ 工具函数 ============

/**
 * 从 URL 提取表名
 */
function getTableName(url: string): string {
  try {
    const u = new URL(url)
    const p = u.pathname
    if (p.includes('/rpc/')) return `rpc:${p.match(/\/rpc\/([^?]+)/)?.[1] || 'unknown'}`
    if (p.includes('/auth/')) return `auth:${p.match(/\/auth\/v1\/([^?]+)/)?.[1] || 'unknown'}`
    if (p.includes('/rest/v1/')) return p.match(/\/rest\/v1\/([^?]+)/)?.[1] || 'unknown'
    if (p.includes('/storage/')) return 'storage'
    return 'other'
  } catch { return 'unknown' }
}

/**
 * 设置 API 监听
 */
function setupListener(page: Page): void {
  page.on('request', (req: Request) => {
    if (req.url().includes('supabase')) {
      requestTimes.set(req.url(), Date.now())
      console.log(`    📤 ${req.method()} ${getTableName(req.url())}`)
    }
  })
  
  page.on('response', (res: Response) => {
    if (res.url().includes('supabase')) {
      const start = requestTimes.get(res.url()) || Date.now()
      const duration = Date.now() - start
      requestTimes.delete(res.url())
      
      currentApiCalls.push({
        method: res.request().method(),
        table: getTableName(res.url()),
        status: res.status(),
        duration
      })
      
      const icon = res.status() >= 400 ? '❌' : '✅'
      const slow = duration > 500 ? ' 🐢' : ''
      console.log(`    📥 ${icon} ${res.status()} ${getTableName(res.url())} (${duration}ms)${slow}`)
    }
  })
}

/**
 * 清空并返回 API 调用
 */
function flushApiCalls(): ApiCall[] {
  const calls = [...currentApiCalls]
  currentApiCalls = []
  return calls
}

/**
 * 分析页面问题
 */
function analyzeIssues(pageName: string, calls: ApiCall[]): string[] {
  const pageIssues: string[] = []
  
  // 统计每个 API 的调用次数
  const counts = new Map<string, number>()
  calls.forEach(c => {
    const key = `${c.method}:${c.table}`
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  
  // 检测重复请求
  counts.forEach((count, key) => {
    if (count >= 2) {
      pageIssues.push(`重复: ${key} x${count}`)
      issues.push({
        page: pageName,
        type: 'duplicate',
        description: `${key} 被调用 ${count} 次`,
        suggestion: '检查 useEffect 依赖或添加缓存'
      })
    }
  })
  
  // 检测请求过多
  if (calls.length > 10) {
    pageIssues.push(`请求过多: ${calls.length} 次`)
    issues.push({
      page: pageName,
      type: 'too_many',
      description: `页面发起 ${calls.length} 次请求`,
      suggestion: '合并请求或使用批量查询'
    })
  }
  
  // 检测慢请求
  calls.forEach(c => {
    if (c.duration > 500) {
      pageIssues.push(`慢请求: ${c.table} ${c.duration}ms`)
      issues.push({
        page: pageName,
        type: 'slow',
        description: `${c.table} 耗时 ${c.duration}ms`,
        suggestion: '优化查询或添加索引'
      })
    }
  })
  
  return pageIssues
}

/**
 * 登录
 */
async function login(page: Page): Promise<boolean> {
  console.log('\n🔐 登录中...')
  flushApiCalls()
  
  await page.goto(`${CONFIG.baseUrl}/#/pages/login/index`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  
  // 输入账号密码
  await page.locator('input[placeholder="请输入账号"]').fill(CONFIG.account.username)
  await page.locator('input[placeholder="请输入密码"]').fill(CONFIG.account.password)
  await page.waitForTimeout(500)
  
  // 点击登录
  await page.locator('text=密码登录').first().evaluate((el: HTMLElement) => el.click())
  await page.waitForTimeout(3000)
  
  // 检查是否成功
  const url = page.url()
  const success = !url.includes('/pages/login')
  
  // 记录登录页面结果
  const calls = flushApiCalls()
  results.push({
    name: '登录',
    path: '/pages/login/index',
    success,
    apiCalls: calls,
    issues: analyzeIssues('登录', calls)
  })
  
  console.log(success ? '🔐 登录成功' : '🔐 登录失败')
  return success
}

/**
 * 测试单个页面（直接 URL 导航）
 */
async function testPage(page: Page, name: string, path: string): Promise<void> {
  console.log(`\n📍 [${results.length + 1}/${ALL_PAGES.length + 1}] ${name}`)
  console.log(`   路径: ${path}`)
  
  flushApiCalls()
  
  try {
    // 直接导航到页面
    await page.goto(`${CONFIG.baseUrl}/#${path}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(CONFIG.pageWait)
    
    // 检查是否成功加载
    const currentUrl = page.url()
    const success = currentUrl.includes(path.replace('/index', ''))
    
    const calls = flushApiCalls()
    const pageIssues = analyzeIssues(name, calls)
    
    results.push({
      name,
      path,
      success,
      apiCalls: calls,
      issues: pageIssues,
      error: success ? undefined : `实际URL: ${currentUrl}`
    })
    
    console.log(`   ${success ? '✅' : '❌'} API: ${calls.length} 次`)
    if (pageIssues.length > 0) {
      console.log(`   ⚠️ 问题: ${pageIssues.length} 个`)
    }
    
  } catch (error) {
    results.push({
      name,
      path,
      success: false,
      apiCalls: flushApiCalls(),
      issues: [],
      error: String(error)
    })
    console.log(`   ❌ 错误: ${error}`)
  }
}

// ============ 测试套件 ============

test.describe('司机端全页面覆盖测试', () => {
  
  // 设置超时
  test.setTimeout(CONFIG.timeout)
  
  test.afterAll(async () => {
    // 输出完整报告
    console.log('\n')
    console.log('═'.repeat(70))
    console.log('📊 司机端全页面测试报告')
    console.log('═'.repeat(70))
    
    // 统计
    const total = results.length
    const success = results.filter(r => r.success).length
    const failed = total - success
    const totalApi = results.reduce((sum, r) => sum + r.apiCalls.length, 0)
    
    console.log(`\n📍 测试概览`)
    console.log('─'.repeat(70))
    console.log(`总页面数: ${total}`)
    console.log(`成功: ${success} | 失败: ${failed}`)
    console.log(`覆盖率: ${Math.round(success / total * 100)}%`)
    console.log(`总 API 调用: ${totalApi}`)
    console.log(`发现问题: ${issues.length}`)
    
    // 各页面详情
    console.log(`\n📄 各页面 API 调用统计`)
    console.log('─'.repeat(70))
    
    results.forEach((r, i) => {
      const icon = r.success ? '✅' : '❌'
      console.log(`${i + 1}. ${icon} ${r.name} - API: ${r.apiCalls.length}`)
      
      if (r.apiCalls.length > 0) {
        // 按表名分组
        const stats = new Map<string, number>()
        r.apiCalls.forEach(c => stats.set(c.table, (stats.get(c.table) || 0) + 1))
        stats.forEach((count, table) => {
          const warn = count >= 2 ? ' ⚠️' : ''
          console.log(`      ${table}: ${count}${warn}`)
        })
      }
      
      if (r.issues.length > 0) {
        r.issues.forEach(issue => console.log(`      ⚠️ ${issue}`))
      }
      
      if (r.error) {
        console.log(`      ❌ ${r.error}`)
      }
    })
    
    // 优化建议
    if (issues.length > 0) {
      console.log(`\n🔧 优化建议 (共 ${issues.length} 条)`)
      console.log('─'.repeat(70))
      
      // 按页面分组
      const byPage = new Map<string, OptimizationIssue[]>()
      issues.forEach(i => {
        if (!byPage.has(i.page)) byPage.set(i.page, [])
        byPage.get(i.page)!.push(i)
      })
      
      byPage.forEach((pageIssues, pageName) => {
        console.log(`\n【${pageName}】`)
        pageIssues.forEach(i => {
          console.log(`  - ${i.description}`)
          console.log(`    建议: ${i.suggestion}`)
        })
      })
    }
    
    // 代码质量评分
    const duplicateCount = issues.filter(i => i.type === 'duplicate').length
    const slowCount = issues.filter(i => i.type === 'slow').length
    const tooManyCount = issues.filter(i => i.type === 'too_many').length
    
    const apiScore = Math.max(0, 100 - duplicateCount * 5)
    const speedScore = Math.max(0, 100 - slowCount * 10)
    const efficiencyScore = Math.max(0, 100 - tooManyCount * 10)
    const overallScore = Math.round((apiScore + speedScore + efficiencyScore) / 3)
    
    console.log(`\n📈 代码质量评分`)
    console.log('─'.repeat(70))
    console.log(`API 效率: ${apiScore}/100 (重复请求: ${duplicateCount} 处)`)
    console.log(`响应速度: ${speedScore}/100 (慢请求: ${slowCount} 处)`)
    console.log(`请求效率: ${efficiencyScore}/100 (请求过多: ${tooManyCount} 页)`)
    console.log(`\n总评分: ${overallScore}/100`)
    
    if (overallScore >= 80) {
      console.log(`\n✅ 代码质量良好`)
    } else if (overallScore >= 60) {
      console.log(`\n⚠️ 代码质量一般，建议优化`)
    } else {
      console.log(`\n❌ 代码质量较差，需要重点优化`)
    }
    
    // 是否最优解
    console.log(`\n🎯 是否最优解: ${overallScore >= 80 ? '是' : '否'}`)
    if (overallScore < 80) {
      console.log(`   主要问题:`)
      if (duplicateCount > 0) console.log(`   - 存在 ${duplicateCount} 处重复请求`)
      if (slowCount > 0) console.log(`   - 存在 ${slowCount} 处慢请求`)
      if (tooManyCount > 0) console.log(`   - ${tooManyCount} 个页面请求过多`)
    }
    
    console.log('\n' + '═'.repeat(70))
  })

  test('覆盖所有页面', async ({page}) => {
    // 设置监听
    setupListener(page)
    
    // 1. 登录
    const loginOk = await login(page)
    expect(loginOk).toBe(true)
    
    // 2. 遍历所有页面
    for (const p of ALL_PAGES) {
      await testPage(page, p.name, p.path)
    }
    
    console.log('\n✅ 所有页面测试完成')
  })
})

export { CONFIG, ALL_PAGES }
