/**
 * Playwright E2E 测试配置
 * 用于司机端页面导航测试
 *
 * @module playwright.config
 */

import {defineConfig, devices} from '@playwright/test'

/**
 * Playwright 配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试目录
  testDir: './e2e',

  // 测试文件匹配模式
  testMatch: '**/*.spec.ts',

  // 完全并行运行测试
  fullyParallel: false, // 司机端测试需要顺序执行

  // 禁止 test.only 提交到 CI
  forbidOnly: !!process.env.CI,

  // 失败重试次数
  retries: process.env.CI ? 2 : 0,

  // 并行工作进程数
  workers: 1, // 单进程执行，确保测试顺序

  // 报告器配置
  reporter: [
    ['list'], // 控制台列表输出
    ['html', {outputFolder: 'playwright-report'}], // HTML 报告
    ['json', {outputFile: 'test-results/results.json'}] // JSON 结果
  ],

  // 全局配置
  use: {
    // 基础 URL - 本地 H5 服务
    baseURL: 'http://localhost:8080',

    // 强制使用 headed 模式（根据项目规则）
    headless: false,

    // 收集测试失败时的跟踪信息
    trace: 'on-first-retry',

    // 截图配置
    screenshot: 'only-on-failure',

    // 视频录制
    video: 'on-first-retry',

    // 视口大小（模拟手机）
    viewport: {width: 375, height: 812},

    // 用户代理
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',

    // 设备缩放因子
    deviceScaleFactor: 2,

    // 是否为移动设备
    isMobile: true,

    // 是否支持触摸
    hasTouch: true,

    // 默认超时时间
    actionTimeout: 10000,
    navigationTimeout: 30000
  },

  // 项目配置（不同浏览器/设备）
  projects: [
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        headless: false // 强制 headed 模式
      }
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        headless: false // 强制 headed 模式
      }
    },
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        headless: false, // 强制 headed 模式
        viewport: {width: 1280, height: 720}
      }
    }
  ],

  // 全局超时配置
  timeout: 60000, // 单个测试超时 60 秒
  expect: {
    timeout: 10000 // 断言超时 10 秒
  },

  // 输出目录
  outputDir: 'test-results/',

  // Web 服务器配置（可选，如果需要自动启动服务器）
  // webServer: {
  //   command: 'npx serve dist -l 8080 -s',
  //   url: 'http://localhost:8080',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
})
