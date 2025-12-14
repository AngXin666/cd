/**
 * SafeAreaTop 集成代码审查脚本
 * 检查所有页面的 SafeAreaTop 集成质量和一致性
 */

const fs = require('fs');
const path = require('path');

/**
 * 代码审查结果
 */
const reviewResults = {
  timestamp: new Date().toISOString(),
  summary: {
    totalPages: 0,
    pagesWithSafeAreaTop: 0,
    pagesWithoutSafeAreaTop: 0,
    pagesWithIssues: 0,
    passedReview: 0
  },
  issues: [],
  passed: [],
  warnings: []
};

/**
 * 检查文件是否包含 SafeAreaTop 导入
 */
function hasSafeAreaTopImport(content) {
  return /import\s+SafeAreaTop\s+from\s+['"]@\/components\/SafeAreaTop['"]/.test(content);
}

/**
 * 检查文件是否使用了 SafeAreaTop 组件
 */
function usesSafeAreaTopComponent(content) {
  return /<SafeAreaTop\s*\/>/.test(content) || /<SafeAreaTop\s+[^>]*\/>/.test(content);
}

/**
 * 检查 SafeAreaTop 位置是否正确
 */
function checkSafeAreaTopPosition(content) {
  // 检查是否在 TopNavBar 之前
  const hasTopNavBar = /<TopNavBar/.test(content);
  
  if (hasTopNavBar) {
    // 查找 SafeAreaTop 和 TopNavBar 的位置
    const safeAreaMatch = content.match(/<SafeAreaTop[^>]*\/>/);
    const topNavBarMatch = content.match(/<TopNavBar/);
    
    if (safeAreaMatch && topNavBarMatch) {
      const safeAreaIndex = content.indexOf(safeAreaMatch[0]);
      const topNavBarIndex = content.indexOf(topNavBarMatch[0]);
      
      return safeAreaIndex < topNavBarIndex;
    }
  }
  
  return true; // 如果没有 TopNavBar，位置就是正确的
}

/**
 * 检查导入语句位置是否正确
 */
function checkImportPosition(content) {
  const lines = content.split('\n');
  let importSectionEnd = 0;
  let safeAreaImportLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ')) {
      importSectionEnd = i;
      if (line.includes('SafeAreaTop')) {
        safeAreaImportLine = i;
      }
    } else if (line && !line.startsWith('//') && !line.startsWith('/*')) {
      break;
    }
  }
  
  // SafeAreaTop 导入应该在导入区域内
  return safeAreaImportLine > 0 && safeAreaImportLine <= importSectionEnd;
}

/**
 * 检查代码风格一致性
 */
function checkCodeStyle(content, filePath) {
  const issues = [];
  
  // 检查是否使用了自闭合标签
  if (content.includes('<SafeAreaTop>') && content.includes('</SafeAreaTop>')) {
    issues.push('应使用自闭合标签 <SafeAreaTop />');
  }
  
  // 检查导入路径是否使用别名
  if (content.includes('from \'../../components/SafeAreaTop\'') || 
      content.includes('from \'../../../components/SafeAreaTop\'')) {
    issues.push('应使用路径别名 @/components/SafeAreaTop');
  }
  
  return issues;
}

/**
 * 审查单个页面文件
 */
function reviewPageFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    reviewResults.summary.totalPages++;
    
    const hasImport = hasSafeAreaTopImport(content);
    const usesComponent = usesSafeAreaTopComponent(content);
    const correctPosition = checkSafeAreaTopPosition(content);
    const correctImportPosition = checkImportPosition(content);
    const styleIssues = checkCodeStyle(content, filePath);
    
    const pageIssues = [];
    
    // 检查是否集成了 SafeAreaTop
    if (!hasImport || !usesComponent) {
      reviewResults.summary.pagesWithoutSafeAreaTop++;
      pageIssues.push('未集成 SafeAreaTop 组件');
    } else {
      reviewResults.summary.pagesWithSafeAreaTop++;
      
      // 检查位置
      if (!correctPosition) {
        pageIssues.push('SafeAreaTop 位置不正确（应在 TopNavBar 之前）');
      }
      
      // 检查导入位置
      if (!correctImportPosition) {
        pageIssues.push('SafeAreaTop 导入位置不正确');
      }
      
      // 添加代码风格问题
      pageIssues.push(...styleIssues);
    }
    
    // 记录结果
    if (pageIssues.length > 0) {
      reviewResults.summary.pagesWithIssues++;
      reviewResults.issues.push({
        file: relativePath,
        issues: pageIssues
      });
    } else if (hasImport && usesComponent) {
      reviewResults.summary.passedReview++;
      reviewResults.passed.push(relativePath);
    }
    
  } catch (error) {
    reviewResults.warnings.push({
      file: filePath,
      error: error.message
    });
  }
}

/**
 * 扫描目录中的所有页面文件
 */
function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // 跳过 components 子目录
      if (entry.name !== 'components') {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile() && entry.name === 'index.tsx') {
      reviewPageFile(fullPath);
    }
  }
}

/**
 * 生成审查报告
 */
function generateReport() {
  console.log('\n=== SafeAreaTop 集成代码审查报告 ===\n');
  console.log(`审查时间: ${reviewResults.timestamp}`);
  console.log(`\n总计: ${reviewResults.summary.totalPages} 个页面`);
  console.log(`✅ 已集成: ${reviewResults.summary.pagesWithSafeAreaTop} 个`);
  console.log(`❌ 未集成: ${reviewResults.summary.pagesWithoutSafeAreaTop} 个`);
  console.log(`⚠️  有问题: ${reviewResults.summary.pagesWithIssues} 个`);
  console.log(`✓  通过审查: ${reviewResults.summary.passedReview} 个`);
  
  if (reviewResults.issues.length > 0) {
    console.log('\n\n=== 发现的问题 ===\n');
    reviewResults.issues.forEach((item, index) => {
      console.log(`${index + 1}. ${item.file}`);
      item.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
      console.log('');
    });
  }
  
  if (reviewResults.warnings.length > 0) {
    console.log('\n=== 警告 ===\n');
    reviewResults.warnings.forEach((item, index) => {
      console.log(`${index + 1}. ${item.file}`);
      console.log(`   错误: ${item.error}`);
      console.log('');
    });
  }
  
  // 保存详细报告到文件
  const reportPath = 'safe-area-code-review-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(reviewResults, null, 2));
  console.log(`\n详细报告已保存到: ${reportPath}`);
  
  // 返回审查是否通过
  return reviewResults.summary.pagesWithIssues === 0 && 
         reviewResults.summary.pagesWithoutSafeAreaTop === 0;
}

// 主函数
function main() {
  console.log('开始代码审查...\n');
  
  const pagesDir = path.join(process.cwd(), 'src', 'pages');
  
  if (!fs.existsSync(pagesDir)) {
    console.error('错误: src/pages 目录不存在');
    process.exit(1);
  }
  
  scanDirectory(pagesDir);
  
  const passed = generateReport();
  
  if (passed) {
    console.log('\n✅ 代码审查通过！所有页面都正确集成了 SafeAreaTop。');
    process.exit(0);
  } else {
    console.log('\n⚠️  代码审查发现问题，请修复后重新审查。');
    process.exit(1);
  }
}

main();
