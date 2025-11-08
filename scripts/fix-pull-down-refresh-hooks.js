#!/usr/bin/env node

/**
 * 修复 usePullDownRefresh 钩子
 * 在 useDidShow 后面添加 usePullDownRefresh 钩子
 */

const fs = require('fs');
const path = require('path');

// 需要处理的页面
const PAGES_TO_PROCESS = [
  'src/pages/driver/piece-work-entry/index.tsx',
  'src/pages/driver/warehouse-stats/index.tsx',
  'src/pages/driver/attendance/index.tsx',
  'src/pages/driver/clock-in/index.tsx',
  'src/pages/driver/leave/index.tsx',
  'src/pages/driver/leave/apply/index.tsx',
  
  'src/pages/manager/data-summary/index.tsx',
  'src/pages/manager/piece-work-report/index.tsx',
  'src/pages/manager/piece-work-report-detail/index.tsx',
  'src/pages/manager/driver-management/index.tsx',
  'src/pages/manager/leave-approval/index.tsx',
  'src/pages/manager/driver-leave-detail/index.tsx',
  'src/pages/manager/warehouse-categories/index.tsx',
  
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
  
  'src/pages/profile/index.tsx',
  'src/pages/profile/edit/index.tsx',
  'src/pages/profile/change-password/index.tsx',
  'src/pages/profile/settings/index.tsx',
  'src/pages/profile/feedback/index.tsx',
  'src/pages/profile/help/index.tsx'
];

/**
 * 添加 usePullDownRefresh 钩子
 */
function addPullDownRefreshHook(content) {
  // 检查是否已经有 usePullDownRefresh 钩子调用
  if (/usePullDownRefresh\s*\(/. test(content)) {
    return { content, added: false };
  }

  // 查找 useDidShow 钩子
  const useDidShowRegex = /(useDidShow\(\(\)\s*=>\s*\{[^}]*\}\))/s;
  const match = content.match(useDidShowRegex);
  
  if (!match) {
    return { content, added: false };
  }

  const useDidShowCode = match[1];
  
  // 提取 useDidShow 中的函数调用
  const functionCalls = [];
  const callRegex = /(\w+)\(\)/g;
  let callMatch;
  
  while ((callMatch = callRegex.exec(useDidShowCode)) !== null) {
    const funcName = callMatch[1];
    if (funcName !== 'useDidShow') {
      functionCalls.push(funcName);
    }
  }

  // 生成 usePullDownRefresh 钩子
  let hookCode;
  if (functionCalls.length > 0) {
    const asyncCalls = functionCalls.map(func => `${func}()`).join(', ');
    hookCode = `\n\n  // 下拉刷新\n  usePullDownRefresh(async () => {\n    await Promise.all([${asyncCalls}])\n    Taro.stopPullDownRefresh()\n  })`;
  } else {
    hookCode = `\n\n  // 下拉刷新\n  usePullDownRefresh(async () => {\n    // TODO: 添加刷新逻辑\n    Taro.stopPullDownRefresh()\n  })`;
  }

  // 在 useDidShow 后面添加 usePullDownRefresh
  content = content.replace(useDidShowRegex, `$1${hookCode}`);
  
  return { content, added: true };
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
  
  const result = addPullDownRefreshHook(content);
  
  if (!result.added) {
    console.log(`⏭️  跳过: ${filePath} (已存在或无 useDidShow)`);
    return true;
  }

  // 写回文件
  fs.writeFileSync(filePath, result.content, 'utf-8');
  console.log(`✅ 已更新: ${filePath}`);
  
  return true;
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始修复 usePullDownRefresh 钩子...\n');

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
