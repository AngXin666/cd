/**
 * 页面扫描脚本
 * 扫描 src/pages 目录下的所有页面文件，检测 TopNavBar 和 SafeAreaTop 的使用情况
 * 生成页面清单 JSON 文件，用于后续的批量集成
 */

const fs = require('fs');
const path = require('path');

/**
 * 页面信息接口
 * @typedef {Object} PageInfo
 * @property {string} filePath - 页面文件路径（相对于项目根目录）
 * @property {string} pageName - 页面名称
 * @property {boolean} hasTopNavBar - 是否已使用 TopNavBar
 * @property {boolean} hasSafeAreaTop - 是否已使用 SafeAreaTop
 * @property {string} pageType - 页面类型（driver/manager/super-admin等）
 */

/**
 * 递归扫描目录，查找所有 index.tsx 文件
 * @param {string} dir - 要扫描的目录路径
 * @param {string} baseDir - 基础目录路径（用于计算相对路径）
 * @returns {string[]} 所有找到的 index.tsx 文件路径数组
 */
function findAllIndexFiles(dir, baseDir = dir) {
  const results = [];
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // 递归扫描子目录
        results.push(...findAllIndexFiles(filePath, baseDir));
      } else if (file === 'index.tsx') {
        // 找到 index.tsx 文件，记录相对路径
        const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
        results.push(relativePath);
      }
    }
  } catch (error) {
    console.error(`扫描目录 ${dir} 时出错:`, error.message);
  }
  
  return results;
}

/**
 * 检测文件内容中是否包含指定的导入语句
 * @param {string} content - 文件内容
 * @param {string} componentName - 组件名称
 * @returns {boolean} 是否包含该组件的导入
 */
function hasImport(content, componentName) {
  // 匹配各种导入格式
  const patterns = [
    // import ComponentName from '...'
    new RegExp(`import\\s+${componentName}\\s+from\\s+['"]`, 'i'),
    // import { ComponentName } from '...'
    new RegExp(`import\\s+{[^}]*\\b${componentName}\\b[^}]*}\\s+from\\s+['"]`, 'i'),
    // import * as name from '...' (不太常见，但也检查)
    new RegExp(`import\\s+\\*\\s+as\\s+\\w+\\s+from\\s+['"][^'"]*${componentName}`, 'i'),
  ];
  
  return patterns.some(pattern => pattern.test(content));
}

/**
 * 检测文件内容中是否使用了指定的组件
 * @param {string} content - 文件内容
 * @param {string} componentName - 组件名称
 * @returns {boolean} 是否使用了该组件
 */
function hasComponentUsage(content, componentName) {
  // 匹配 JSX 标签使用: <ComponentName /> 或 <ComponentName>
  const pattern = new RegExp(`<${componentName}[\\s/>]`, 'i');
  return pattern.test(content);
}

/**
 * 分析单个页面文件
 * @param {string} filePath - 页面文件路径（相对于 src/pages）
 * @param {string} pagesDir - pages 目录的绝对路径
 * @returns {PageInfo} 页面信息对象
 */
function analyzePage(filePath, pagesDir) {
  const fullPath = path.join(pagesDir, filePath);
  
  try {
    // 读取文件内容
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // 检测 TopNavBar 使用情况
    const hasTopNavBar = hasImport(content, 'TopNavBar') && hasComponentUsage(content, 'TopNavBar');
    
    // 检测 SafeAreaTop 使用情况
    const hasSafeAreaTop = hasImport(content, 'SafeAreaTop') && hasComponentUsage(content, 'SafeAreaTop');
    
    // 确定页面类型（基于路径）
    const pathParts = filePath.split('/');
    let pageType = 'other';
    
    if (pathParts.includes('driver')) {
      pageType = 'driver';
    } else if (pathParts.includes('manager')) {
      pageType = 'manager';
    } else if (pathParts.includes('super-admin')) {
      pageType = 'super-admin';
    } else if (pathParts.includes('profile')) {
      pageType = 'profile';
    } else if (pathParts.includes('shared')) {
      pageType = 'shared';
    } else if (pathParts.includes('common')) {
      pageType = 'common';
    } else if (pathParts.includes('login')) {
      pageType = 'login';
    } else if (pathParts.includes('index')) {
      pageType = 'index';
    }
    
    // 生成页面名称（去掉 index.tsx，使用目录名）
    const pageName = pathParts.slice(0, -1).join('/') || 'index';
    
    return {
      filePath: `src/pages/${filePath}`,
      pageName,
      hasTopNavBar,
      hasSafeAreaTop,
      pageType,
    };
  } catch (error) {
    console.error(`分析文件 ${filePath} 时出错:`, error.message);
    return null;
  }
}

/**
 * 主函数：扫描所有页面并生成清单
 */
function main() {
  console.log('开始扫描页面...\n');
  
  // 确定 src/pages 目录的路径
  const projectRoot = path.resolve(__dirname, '..');
  const pagesDir = path.join(projectRoot, 'src', 'pages');
  
  // 检查目录是否存在
  if (!fs.existsSync(pagesDir)) {
    console.error(`错误: 找不到 src/pages 目录: ${pagesDir}`);
    process.exit(1);
  }
  
  // 扫描所有 index.tsx 文件
  console.log(`扫描目录: ${pagesDir}\n`);
  const indexFiles = findAllIndexFiles(pagesDir, pagesDir);
  console.log(`找到 ${indexFiles.length} 个页面文件\n`);
  
  // 分析每个页面
  const pages = [];
  for (const file of indexFiles) {
    const pageInfo = analyzePage(file, pagesDir);
    if (pageInfo) {
      pages.push(pageInfo);
    }
  }
  
  // 统计信息
  const stats = {
    total: pages.length,
    withTopNavBar: pages.filter(p => p.hasTopNavBar).length,
    withSafeAreaTop: pages.filter(p => p.hasSafeAreaTop).length,
    withoutSafeAreaTop: pages.filter(p => !p.hasSafeAreaTop).length,
    byType: {},
  };
  
  // 按类型统计
  for (const page of pages) {
    if (!stats.byType[page.pageType]) {
      stats.byType[page.pageType] = {
        total: 0,
        withTopNavBar: 0,
        withSafeAreaTop: 0,
        withoutSafeAreaTop: 0,
      };
    }
    stats.byType[page.pageType].total++;
    if (page.hasTopNavBar) stats.byType[page.pageType].withTopNavBar++;
    if (page.hasSafeAreaTop) stats.byType[page.pageType].withSafeAreaTop++;
    if (!page.hasSafeAreaTop) stats.byType[page.pageType].withoutSafeAreaTop++;
  }
  
  // 生成输出数据
  const output = {
    scanDate: new Date().toISOString(),
    stats,
    pages,
  };
  
  // 保存到 JSON 文件
  const outputPath = path.join(projectRoot, 'page-scan-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  
  // 打印统计信息
  console.log('=== 扫描结果统计 ===\n');
  console.log(`总页面数: ${stats.total}`);
  console.log(`已使用 TopNavBar: ${stats.withTopNavBar}`);
  console.log(`已使用 SafeAreaTop: ${stats.withSafeAreaTop}`);
  console.log(`未使用 SafeAreaTop: ${stats.withoutSafeAreaTop}\n`);
  
  console.log('=== 按页面类型统计 ===\n');
  for (const [type, typeStat] of Object.entries(stats.byType)) {
    console.log(`${type}:`);
    console.log(`  总数: ${typeStat.total}`);
    console.log(`  已使用 TopNavBar: ${typeStat.withTopNavBar}`);
    console.log(`  已使用 SafeAreaTop: ${typeStat.withSafeAreaTop}`);
    console.log(`  未使用 SafeAreaTop: ${typeStat.withoutSafeAreaTop}\n`);
  }
  
  console.log(`\n结果已保存到: ${outputPath}`);
  
  // 如果有页面已经使用了 SafeAreaTop，列出它们
  const pagesWithSafeArea = pages.filter(p => p.hasSafeAreaTop);
  if (pagesWithSafeArea.length > 0) {
    console.log('\n=== 已使用 SafeAreaTop 的页面 ===\n');
    for (const page of pagesWithSafeArea) {
      console.log(`  - ${page.pageName} (${page.filePath})`);
    }
  }
  
  console.log('\n扫描完成！');
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  findAllIndexFiles,
  hasImport,
  hasComponentUsage,
  analyzePage,
};
