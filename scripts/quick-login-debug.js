/**
 * 快速登录调试脚本
 * 使用 Playwright 在 headed 模式下快速登录不同角色账号
 * 支持 5 个内置测试账号：admin, admin1, admin2, admin3, admin4
 * 
 * 使用方法：
 *   node scripts/quick-login-debug.js [账号索引]
 *   node scripts/quick-login-debug.js 0  # 登录 admin
 *   node scripts/quick-login-debug.js 1  # 登录 admin1
 *   node scripts/quick-login-debug.js    # 显示菜单选择
 * 
 * @module scripts/quick-login-debug
 */

const { chromium } = require('playwright');
const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ============================================
// 测试账号配置（从环境变量读取密码）
// ============================================
const TEST_ACCOUNTS = [
  {
    name: 'admin',
    username: 'admin',
    // 从环境变量读取密码，如果没有则使用默认值
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
    description: '超级管理员'
  },
  {
    name: 'admin1',
    username: 'admin1',
    password: process.env.TEST_ADMIN1_PASSWORD || 'admin123',
    description: '管理员1'
  },
  {
    name: 'admin2',
    username: 'admin2',
    password: process.env.TEST_ADMIN2_PASSWORD || 'admin123',
    description: '管理员2'
  },
  {
    name: 'admin3',
    username: 'admin3',
    password: process.env.TEST_ADMIN3_PASSWORD || 'admin123',
    description: '管理员3'
  },
  {
    name: 'admin4',
    username: 'admin4',
    password: process.env.TEST_ADMIN4_PASSWORD || 'admin123',
    description: '管理员4'
  }
];

// 本地 H5 服务地址
const BASE_URL = 'http://localhost:8080';

/**
 * 创建命令行交互接口
 * @returns {readline.Interface} readline 接口
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * 显示账号选择菜单
 */
function showMenu() {
  console.log('\n========================================');
  console.log('🚀 快速登录调试工具');
  console.log('========================================\n');
  console.log('可用的测试账号：\n');
  
  TEST_ACCOUNTS.forEach((account, index) => {
    console.log(`  [${index}] ${account.name.padEnd(10)} - ${account.description}`);
  });
  
  console.log('\n  [q] 退出\n');
  console.log('========================================\n');
}

/**
 * 等待用户输入
 * @param {readline.Interface} rl - readline 接口
 * @param {string} question - 提示问题
 * @returns {Promise<string>} 用户输入
 */
function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * 执行登录操作
 * @param {object} account - 账号信息
 * @param {boolean} keepOpen - 是否保持浏览器打开
 */
async function performLogin(account, keepOpen = true) {
  console.log(`\n🔐 正在登录账号: ${account.name} (${account.description})`);
  console.log(`   用户名: ${account.username}`);
  console.log(`   密码: ${'*'.repeat(account.password.length)}`);
  
  let browser;
  let context;
  
  try {
    // 启动浏览器（headed 模式，方便调试）
    browser = await chromium.launch({
      headless: false,  // 强制使用 headed 模式
      slowMo: 100,      // 稍微减慢操作速度，便于观察
      args: [
        '--start-maximized',  // 最大化窗口
        '--disable-web-security',  // 禁用跨域限制（开发环境）
      ]
    });
    
    // 创建浏览器上下文（使用移动端视口模拟手机）
    context = await browser.newContext({
      // 使用 iPhone 12 Pro 的视口尺寸
      viewport: { width: 390, height: 844 },
      // 设置设备像素比
      deviceScaleFactor: 3,
      // 模拟移动端
      isMobile: true,
      // 模拟触摸屏
      hasTouch: true,
      // 设置 User-Agent 为移动端
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
      // 忽略 HTTPS 错误（开发环境）
      ignoreHTTPSErrors: true
    });
    
    // 监听控制台消息（自动捕获错误）
    const page = await context.newPage();
    
    // 自动捕获并显示控制台错误
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`\n❌ [控制台错误] ${msg.text()}`);
      }
    });
    
    // 自动捕获页面错误
    page.on('pageerror', (error) => {
      console.log(`\n❌ [页面错误] ${error.message}`);
    });
    
    // 自动捕获请求失败
    page.on('requestfailed', (request) => {
      console.log(`\n⚠️ [请求失败] ${request.url()} - ${request.failure()?.errorText}`);
    });
    
    console.log(`\n📱 正在打开登录页面: ${BASE_URL}`);
    
    // 导航到登录页面
    await page.goto(BASE_URL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // 等待页面加载完成
    await page.waitForTimeout(1000);
    
    // 查找并填写账号输入框
    console.log('📝 正在填写登录表单...');
    
    // 使用 placeholder 定位账号输入框
    const accountInput = page.locator('input[placeholder="请输入账号"]');
    await accountInput.waitFor({ state: 'visible', timeout: 10000 });
    
    // 清空并填写账号
    await accountInput.clear();
    await accountInput.fill(account.username);
    
    // 查找并填写密码输入框
    const passwordInput = page.locator('input[placeholder="请输入密码"]');
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // 清空并填写密码
    await passwordInput.clear();
    await passwordInput.fill(account.password);
    
    console.log('✅ 表单填写完成');
    console.log('\n========================================');
    console.log('🎯 请手动点击登录按钮进行登录');
    console.log('   浏览器将保持打开状态供您调试');
    console.log('   关闭浏览器窗口即可退出');
    console.log('========================================\n');
    
    if (keepOpen) {
      // 保持浏览器打开，等待用户手动关闭
      await new Promise((resolve) => {
        // 监听浏览器关闭事件
        browser.on('disconnected', () => {
          console.log('\n👋 浏览器已关闭');
          resolve();
        });
      });
    }
    
  } catch (error) {
    console.error(`\n❌ 登录过程出错: ${error.message}`);
    
    // 如果浏览器已打开，保持打开状态便于调试
    if (browser && keepOpen) {
      console.log('\n⚠️ 发生错误，浏览器保持打开状态供您检查');
      console.log('   关闭浏览器窗口即可退出\n');
      
      await new Promise((resolve) => {
        browser.on('disconnected', resolve);
      });
    }
  }
}

/**
 * 主函数
 */
async function main() {
  // 检查命令行参数
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // 直接使用命令行参数指定的账号
    const index = parseInt(args[0], 10);
    
    if (isNaN(index) || index < 0 || index >= TEST_ACCOUNTS.length) {
      console.error(`\n❌ 无效的账号索引: ${args[0]}`);
      console.log(`   有效范围: 0-${TEST_ACCOUNTS.length - 1}`);
      process.exit(1);
    }
    
    await performLogin(TEST_ACCOUNTS[index]);
    return;
  }
  
  // 显示交互式菜单
  const rl = createReadlineInterface();
  
  while (true) {
    showMenu();
    
    const answer = await askQuestion(rl, '请选择账号 (0-4) 或 q 退出: ');
    
    if (answer.toLowerCase() === 'q') {
      console.log('\n👋 再见！\n');
      rl.close();
      break;
    }
    
    const index = parseInt(answer, 10);
    
    if (isNaN(index) || index < 0 || index >= TEST_ACCOUNTS.length) {
      console.log('\n⚠️ 无效的选择，请重新输入\n');
      continue;
    }
    
    rl.close();
    await performLogin(TEST_ACCOUNTS[index]);
    break;
  }
}

// 运行主函数
main().catch((error) => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
