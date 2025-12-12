#!/usr/bin/env node

/**
 * 批量为所有页面添加 usePullDownRefresh 钩子
 */

const fs = require('fs');
const path = require('path');

// 需要处理的页面
const PAGES_TO_PROCESS = [
  // 司机端
  'src/pages/driver/piece-work/index.tsx',
  'src/pages/driver/piece-work-entry/index.tsx',
  'src/pages/driver/warehouse-stats/index.tsx',
  'src/pages/driver/attendance/index.tsx',
  'src/pages/driver/clock-in/index.tsx',
  'src/pages/driver/leave/index.tsx',
  'src/pages/driver/leave/apply/index.tsx',
  
  // 管理员端
  'src/pages/manager/index.tsx',
  'src/pages/manager/data-summary/index.tsx',
  'src/pages/manager/piece-work-report/index.tsx',
  'src/pages/manager/piece-work-report-detail/index.tsx',
  'src/pages/manager/driver-management/index.tsx',
  'src/pages/manager/leave-approval/index.tsx',
  'src/pages/manager/driver-leave-detail/index.tsx',
  'src/pages/manager/warehouse-categories/index.tsx',
  
  // 超级管理员端
  'src/pages/super-admin/index.tsx',
  'src/pages/super-admin/piece-work-report/index.tsx',
  'src/pages/super-admin/piece-work-report-detail/index.tsx',
  'src/pages/super-admin/category-management/index.tsx',
  'src/pages/super-admin/warehouse-management/index.tsx',
  'src/pages/super-admin/warehouse-detail/index.tsx',
  'src/pages/super-admin/user-management/index.tsx',
  'src/pages/super-admin/edit-user/index.tsx',
  'src/pages/super-admin/leave-approval/index.tsx',
  'src/pages/super-admin/driver-leave-detail/index.tsx',
  'src/pages/super-admin/driver-warehouse-assignment/index.tsx',
  'src/pages/super-admin/manager-warehouse-assignment/index.tsx',
  'src/pages/super-admin/permission-config/index.tsx',
  
  // 个人中心
  'src/pages/profile/index.tsx',
  'src/pages/profile/edit/index.tsx',
  'src/pages/profile/change-password/index.tsx',
  'src/pages/profile/settings/index.tsx',
  'src/pages/profile/feedback/index.tsx',
  'src/pages/profile/help/index.tsx'
];

/**
 * 添加 usePullDownRefresh 到导入语句
 */
function addUsePullDownRefreshImport(content) {
  // 检查是否已经导入
  if (content.includes('usePullDownRefresh')) {
    return content;
  }

  // 查找 Taro 导入语句
  const taroImportRegex = /import Taro,\s*\{([^}]+)\}\s*from\s*['"]@tarojs\/taro['"]/;
  
  if (taroImportRegex.test(content)) {
    content = content.replace(taroImportRegex, (match, imports) => {
      // 添加 usePullDownRefresh 到导入列表
      const importList = imports.split(',').map(i => i.trim());
      if (!importList.includes('usePullDownRefresh')) {
        importList.push('usePullDownRefresh');
      }
      return `import Taro, {${importList.join(', ')}} from '@tarojs/taro'`;
    });
  }

  return content;
}

/**
 * 添加 usePullDownRefresh 钩子到组件
 */
function addUsePullDownRefreshHook(content, pagePath) {
  // 检查是否已经有 usePullDownRefresh 钩子
  if (content.includes('usePullDownRefresh')) {
    return content;
  }

  // 查找 useDidShow 钩子的位置
  const useDidShowRegex = /useDidShow\(\(\)\s*=>\s*\{[^}]*\}\)/s;
  
  if (useDidShowRegex.test(content)) {
    // 在 useDidShow 后面添加 usePullDownRefresh
    content = content.replace(useDidShowRegex, (match) => {
      // 提取 useDidShow 中的函数调用
      const functionCalls = extractFunctionCalls(match);
      
      // 生成 usePullDownRefresh 钩子
      const pullDownRefreshHook = generatePullDownRefreshHook(functionCalls);
      
      return `${match}\n\n  ${pullDownRefreshHook}`;
    });
  }

  return content;
}

/**
 * 从 useDidShow 中提取函数调用
 */
function extractFunctionCalls(useDidShowCode) {
  const calls = [];
  
  // 匹配函数调用，如 loadData(), loadRecords() 等
  const callRegex = /(\w+)\(\)/g;
  let match;
  
  while ((match = callRegex.exec(useDidShowCode)) !== null) {
    const funcName = match[1];
    if (funcName !== 'useDidShow') {
      calls.push(funcName);
    }
  }
  
  return calls;
}

/**
 * 生成 usePullDownRefresh 钩子代码
 */
function generatePullDownRefreshHook(functionCalls) {
  if (functionCalls.length === 0) {
    return `// 下拉刷新
  usePullDownRefresh(async () => {
    // TODO: 添加刷新逻辑
    Taro.stopPullDownRefresh()
  })`;
  }

  const asyncCalls = functionCalls.map(func => `${func}()`).join(', ');
  
  return `// 下拉刷新
  usePullDownRefresh(async () => {
    await Promise.all([${asyncCalls}])
    Taro.stopPullDownRefresh()
  })`;
}

/**
 * 处理单个页面文件
 */
function processPageFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查是否已经有 usePullDownRefresh
  if (content.includes('usePullDownRefresh')) {
    console.log(`✅ 已添加: ${filePath}`);
    return true;
  }

  // 添加导入
  content = addUsePullDownRefreshImport(content);
  
  // 添加钩子
  content = addUsePullDownRefreshHook(content, filePath);
  
  // 写回文件
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ 已更新: ${filePath}`);
  
  return true;
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始批量添加 usePullDownRefresh 钩子...\n');

  let successCount = 0;
  let failCount = 0;

  for (const pagePath of PAGES_TO_PROCESS) {
    const fullPath = path.join(process.cwd(), pagePath);
    console.log(`📝 处理: ${pagePath}`);
    
    if (processPageFile(fullPath)) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n✨ 完成！成功: ${successCount}, 失败: ${failCount}`);
}

// 运行主函数
main();
