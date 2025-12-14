/**
 * SafeAreaTop 集成测试脚本
 * 验证所有页面是否正确集成了 SafeAreaTop 组件
 * 
 * 测试内容：
 * 1. 检查所有页面是否导入了 SafeAreaTop
 * 2. 检查 SafeAreaTop 是否在正确位置（最顶部或 TopNavBar 之前）
 * 3. 生成测试报告
 */

const fs = require('fs');
const path = require('path');

/**
 * 扫描目录下的所有文件
 * @param {string} dir - 目录路径
 * @param {string[]} fileList - 文件列表（递归累积）
 * @returns {string[]} 所有文件路径列表
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file === 'index.tsx') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * 检查文件是否导入了 SafeAreaTop
 * @param {string} content - 文件内容
 * @returns {boolean} 是否导入了 SafeAreaTop
 */
function hasSafeAreaTopImport(content) {
  return /import\s+SafeAreaTop\s+from\s+['"]@\/components\/SafeAreaTop['"]/.test(content);
}

/**
 * 检查文件是否使用了 SafeAreaTop
 * @param {string} content - 文件内容
 * @returns {boolean} 是否使用了 SafeAreaTop
 */
function hasSafeAreaTopUsage(content) {
  return /<SafeAreaTop/.test(content);
}

/**
 * 检查文件是否使用了 TopNavBar
 * @param {string} content - 文件内容
 * @returns {boolean} 是否使用了 TopNavBar
 */
function hasTopNavBar(content) {
  return /<TopNavBar/.test(content);
}

/**
 * 检查 SafeAreaTop 位置是否正确
 * @param {string} content - 文件内容
 * @returns {object} 位置检查结果
 */
function checkSafeAreaTopPosition(content) {
  const hasTopNav = hasTopNavBar(content);
  const hasSafeArea = hasSafeAreaTopUsage(content);

  if (!hasSafeArea) {
    return { correct: false, reason: 'SafeAreaTop 未使用' };
  }

  // 提取 return 语句后的 JSX 内容
  const returnMatch = content.match(/return\s*\(([\s\S]*?)\n\s*\)/);
  if (!returnMatch) {
    return { correct: false, reason: '无法解析 JSX 结构' };
  }

  const jsxContent = returnMatch[1];
  
  // 查找第一个实际的组件（忽略注释和空白）
  const firstComponentMatch = jsxContent.match(/<(\w+)/);
  if (!firstComponentMatch) {
    return { correct: false, reason: '无法找到第一个组件' };
  }

  const firstComponent = firstComponentMatch[1];

  if (hasTopNav) {
    // 如果有 TopNavBar，SafeAreaTop 应该在它之前
    const safeAreaIndex = jsxContent.indexOf('<SafeAreaTop');
    const topNavIndex = jsxContent.indexOf('<TopNavBar');
    
    if (safeAreaIndex === -1) {
      return { correct: false, reason: 'SafeAreaTop 未找到' };
    }
    
    if (topNavIndex === -1) {
      return { correct: false, reason: 'TopNavBar 未找到' };
    }
    
    if (safeAreaIndex > topNavIndex) {
      return { correct: false, reason: 'SafeAreaTop 应该在 TopNavBar 之前' };
    }
    
    return { correct: true, reason: 'SafeAreaTop 在 TopNavBar 之前（正确）' };
  } else {
    // 如果没有 TopNavBar，SafeAreaTop 应该是第一个组件
    if (firstComponent !== 'SafeAreaTop') {
      return { correct: false, reason: `SafeAreaTop 应该是第一个组件，但实际是 ${firstComponent}` };
    }
    
    return { correct: true, reason: 'SafeAreaTop 是第一个组件（正确）' };
  }
}

/**
 * 分析单个页面文件
 * @param {string} filePath - 文件路径
 * @returns {object} 分析结果
 */
function analyzePage(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(process.cwd(), filePath);

  const hasImport = hasSafeAreaTopImport(content);
  const hasUsage = hasSafeAreaTopUsage(content);
  const hasTopNav = hasTopNavBar(content);
  const positionCheck = checkSafeAreaTopPosition(content);

  return {
    path: relativePath,
    hasImport,
    hasUsage,
    hasTopNavBar: hasTopNav,
    positionCheck,
    status: hasImport && hasUsage && positionCheck.correct ? 'PASS' : 'FAIL'
  };
}

/**
 * 生成测试报告
 * @param {object[]} results - 测试结果列表
 */
function generateReport(results) {
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const totalCount = results.length;

  console.log('\n='.repeat(80));
  console.log('SafeAreaTop 集成测试报告');
  console.log('='.repeat(80));
  console.log(`\n总计: ${totalCount} 个页面`);
  console.log(`通过: ${passCount} 个页面 (${((passCount / totalCount) * 100).toFixed(1)}%)`);
  console.log(`失败: ${failCount} 个页面 (${((failCount / totalCount) * 100).toFixed(1)}%)`);
  console.log('\n' + '='.repeat(80));

  if (failCount > 0) {
    console.log('\n失败的页面：\n');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(result => {
        console.log(`❌ ${result.path}`);
        if (!result.hasImport) {
          console.log('   - 缺少 SafeAreaTop 导入');
        }
        if (!result.hasUsage) {
          console.log('   - 未使用 SafeAreaTop 组件');
        }
        if (!result.positionCheck.correct) {
          console.log(`   - 位置错误: ${result.positionCheck.reason}`);
        }
        console.log('');
      });
  }

  if (passCount > 0) {
    console.log('\n通过的页面：\n');
    results
      .filter(r => r.status === 'PASS')
      .forEach(result => {
        console.log(`✅ ${result.path}`);
        if (result.hasTopNavBar) {
          console.log('   - 有 TopNavBar，SafeAreaTop 位置正确');
        } else {
          console.log('   - 无 TopNavBar，SafeAreaTop 是第一个组件');
        }
      });
  }

  console.log('\n' + '='.repeat(80));

  // 保存详细报告到文件
  const reportPath = path.join(process.cwd(), 'safe-area-integration-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n详细报告已保存到: ${reportPath}`);
}

/**
 * 主函数
 */
function main() {
  console.log('开始扫描页面文件...\n');

  const pagesDir = path.join(process.cwd(), 'src', 'pages');
  const pageFiles = getAllFiles(pagesDir);

  console.log(`找到 ${pageFiles.length} 个页面文件\n`);
  console.log('开始分析...\n');

  const results = pageFiles.map(analyzePage);

  generateReport(results);

  // 返回退出码（如果有失败则返回 1）
  const hasFailures = results.some(r => r.status === 'FAIL');
  process.exit(hasFailures ? 1 : 0);
}

// 执行主函数
main();
