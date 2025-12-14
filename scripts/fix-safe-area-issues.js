/**
 * 自动修复 SafeAreaTop 集成问题
 * 
 * 此脚本会：
 * 1. 为缺少 SafeAreaTop 的页面添加导入和使用
 * 2. 为已导入但未使用的页面添加使用
 * 3. 跳过组件文件（components 目录下的文件）
 */

const fs = require('fs');
const path = require('path');

/**
 * 读取测试报告
 * @returns {object[]} 测试结果列表
 */
function readTestReport() {
  const reportPath = path.join(process.cwd(), 'safe-area-integration-test-report.json');
  const content = fs.readFileSync(reportPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * 检查是否是组件文件（而非页面文件）
 * @param {string} filePath - 文件路径
 * @returns {boolean} 是否是组件文件
 */
function isComponentFile(filePath) {
  return filePath.includes('\\components\\') || filePath.includes('/components/');
}

/**
 * 为文件添加 SafeAreaTop 导入
 * @param {string} content - 文件内容
 * @returns {string} 修改后的内容
 */
function addSafeAreaTopImport(content) {
  // 查找最后一个 import 语句的位置
  const importRegex = /import\s+.*?from\s+['"].*?['"]/g;
  const imports = content.match(importRegex);
  
  if (!imports || imports.length === 0) {
    // 如果没有 import，在文件开头添加
    return `import SafeAreaTop from '@/components/SafeAreaTop'\n${content}`;
  }
  
  // 在最后一个 import 后添加
  const lastImport = imports[imports.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const insertPosition = lastImportIndex + lastImport.length;
  
  return content.slice(0, insertPosition) + 
         '\nimport SafeAreaTop from \'@/components/SafeAreaTop\'' +
         content.slice(insertPosition);
}

/**
 * 为文件添加 SafeAreaTop 使用
 * @param {string} content - 文件内容
 * @param {boolean} hasTopNavBar - 是否有 TopNavBar
 * @returns {string} 修改后的内容
 */
function addSafeAreaTopUsage(content, hasTopNavBar) {
  // 查找 return 语句
  const returnMatch = content.match(/return\s*\(/);
  if (!returnMatch) {
    console.log('  ⚠️  无法找到 return 语句');
    return content;
  }
  
  const returnIndex = returnMatch.index + returnMatch[0].length;
  
  // 查找 return 后的第一个 < 符号（JSX 开始）
  let jsxStartIndex = content.indexOf('<', returnIndex);
  if (jsxStartIndex === -1) {
    console.log('  ⚠️  无法找到 JSX 开始位置');
    return content;
  }
  
  // 跳过注释
  while (content.substring(jsxStartIndex, jsxStartIndex + 4) === '<!--' ||
         content.substring(jsxStartIndex, jsxStartIndex + 3) === '{/*') {
    const commentEnd = content.indexOf('>', jsxStartIndex);
    if (commentEnd === -1) break;
    jsxStartIndex = content.indexOf('<', commentEnd);
    if (jsxStartIndex === -1) {
      console.log('  ⚠️  无法找到 JSX 开始位置（跳过注释后）');
      return content;
    }
  }
  
  // 获取缩进
  const lineStart = content.lastIndexOf('\n', jsxStartIndex) + 1;
  const indent = content.substring(lineStart, jsxStartIndex);
  
  // 插入 SafeAreaTop
  const safeAreaTopLine = `${indent}<SafeAreaTop />\n`;
  
  return content.slice(0, jsxStartIndex) + 
         safeAreaTopLine +
         content.slice(jsxStartIndex);
}

/**
 * 修复单个文件
 * @param {object} result - 测试结果对象
 * @returns {boolean} 是否成功修复
 */
function fixFile(result) {
  const filePath = result.path.replace(/\\/g, '/');
  const fullPath = path.join(process.cwd(), filePath);
  
  console.log(`\n处理: ${filePath}`);
  
  // 跳过组件文件
  if (isComponentFile(filePath)) {
    console.log('  ⏭️  跳过（组件文件，不是页面）');
    return false;
  }
  
  try {
    let content = fs.readFileSync(fullPath, 'utf-8');
    let modified = false;
    
    // 1. 添加导入（如果缺少）
    if (!result.hasImport) {
      console.log('  ➕ 添加 SafeAreaTop 导入');
      content = addSafeAreaTopImport(content);
      modified = true;
    }
    
    // 2. 添加使用（如果缺少）
    if (!result.hasUsage) {
      console.log('  ➕ 添加 SafeAreaTop 使用');
      content = addSafeAreaTopUsage(content, result.hasTopNavBar);
      modified = true;
    }
    
    // 3. 保存文件
    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log('  ✅ 修复完成');
      return true;
    } else {
      console.log('  ℹ️  无需修改');
      return false;
    }
  } catch (error) {
    console.log(`  ❌ 修复失败: ${error.message}`);
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('开始自动修复 SafeAreaTop 集成问题...\n');
  console.log('='.repeat(80));
  
  const results = readTestReport();
  const failedResults = results.filter(r => r.status === 'FAIL');
  
  console.log(`\n找到 ${failedResults.length} 个需要修复的文件`);
  
  let fixedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  
  failedResults.forEach(result => {
    const success = fixFile(result);
    if (success) {
      fixedCount++;
    } else if (isComponentFile(result.path)) {
      skippedCount++;
    } else {
      failedCount++;
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('\n修复总结:');
  console.log(`  ✅ 成功修复: ${fixedCount} 个文件`);
  console.log(`  ⏭️  跳过: ${skippedCount} 个文件（组件文件）`);
  console.log(`  ❌ 修复失败: ${failedCount} 个文件`);
  console.log('\n' + '='.repeat(80));
  
  if (fixedCount > 0) {
    console.log('\n建议：运行测试脚本验证修复结果');
    console.log('  node scripts/test-safe-area-integration.js');
  }
}

// 执行主函数
main();
