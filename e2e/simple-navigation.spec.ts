/**
 * 简化版司机端导航测试
 * 验证登录和基本页面导航功能
 *
 * @module e2e/simple-navigation
 */

import {test, expect, Page} from '@playwright/test'

/**
 * 测试配置常量
 */
const CONFIG = {
  baseUrl: 'http://localhost:8080',
  username: 'admin4',
  password: 'admin123',
  // 等待时间（毫秒）
  waitTime: 2000
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
 * 简化版登录函数
 * @param page - Playwright 页面对象
 * @returns 是否登录成功
 */
async function doLogin(page: Page): Promise<boolean> {
  // 打开登录页
  await page.goto(`${CONFIG.baseUrl}/#/pages/login/index`)
  await page.waitForTimeout(CONFIG.waitTime)

  // 输入账号密码
  await page.fill('input[placeholder="请输入账号"]', CONFIG.username)
  await page.fill('input[placeholder="请输入密码"]', CONFIG.password)
  await page.waitForTimeout(500)

  // 点击登录
  await page.locator('text=密码登录').first().click()
  await page.waitForTimeout(3000)

  // 检查是否离开登录页
  const path = getHashPath(page)
  console.log(`登录后路径: ${path}`)
  return !path.includes('/pages/login')
}

/**
 * 测试套件
 */
test.describe('简化导航测试', () => {
  
  test('登录并访问工作台', async ({page}) => {
    // 设置较长超时
    test.setTimeout(60000)
    
    // 1. 登录
    console.log('步骤1: 登录')
    const ok = await doLogin(page)
    expect(ok).toBe(true)
    
    // 2. 导航到工作台
    console.log('步骤2: 进入工作台')
    await page.goto(`${CONFIG.baseUrl}/#/pages/driver/index`)
    await page.waitForTimeout(CONFIG.waitTime)
    
    const path = getHashPath(page)
    console.log(`当前路径: ${path}`)
    expect(path).toContain('/pages/driver/index')
    
    // 3. 点击计件录入
    console.log('步骤3: 点击计件录入')
    const btn = page.locator('text=计件录入').first()
    if (await btn.isVisible()) {
      await btn.click()
      await page.waitForTimeout(CONFIG.waitTime)
      const newPath = getHashPath(page)
      console.log(`计件录入后路径: ${newPath}`)
    }
    
    // 4. 返回
    console.log('步骤4: 返回')
    await page.goBack()
    await page.waitForTimeout(CONFIG.waitTime)
    
    console.log('测试完成')
  })
})
