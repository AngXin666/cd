#!/usr/bin/env node

/**
 * 批量为所有页面添加下拉刷新功能
 */

const fs = require('fs');
const path = require('path');

// 需要排除的页面（登录页面、首页等不需要下拉刷新）
const EXCLUDE_PAGES = [
  'src/pages/login',
  'src/pages/index',
  'src/pages/home'
];

// 需要处理的页面配置
const PAGES_TO_PROCESS = [
  // 司机端
  { dir: 'src/pages/driver', name: '司机工作台' },
  { dir: 'src/pages/driver/piece-work', name: '计件列表' },
  { dir: 'src/pages/driver/piece-work-entry', name: '计件录入' },
  { dir: 'src/pages/driver/warehouse-stats', name: '仓库统计' },
  { dir: 'src/pages/driver/attendance', name: '考勤记录' },
  { dir: 'src/pages/driver/clock-in', name: '打卡' },
  { dir: 'src/pages/driver/leave', name: '请假记录' },
  { dir: 'src/pages/driver/leave/apply', name: '请假申请' },
  
  // 管理员端
  { dir: 'src/pages/manager', name: '管理员工作台' },
  { dir: 'src/pages/manager/data-summary', name: '数据汇总' },
  { dir: 'src/pages/manager/piece-work-report', name: '计件报表' },
  { dir: 'src/pages/manager/piece-work-report-detail', name: '计件报表详情' },
  { dir: 'src/pages/manager/driver-management', name: '司机管理' },
  { dir: 'src/pages/manager/leave-approval', name: '请假审批' },
  { dir: 'src/pages/manager/driver-leave-detail', name: '请假详情' },
  { dir: 'src/pages/manager/warehouse-categories', name: '仓库品类' },
  
  // 超级管理员端
  { dir: 'src/pages/super-admin', name: '超级管理员工作台' },
  { dir: 'src/pages/super-admin/piece-work-report', name: '计件报表' },
  { dir: 'src/pages/super-admin/piece-work-report-detail', name: '计件报表详情' },
  { dir: 'src/pages/super-admin/category-management', name: '品类管理' },
  { dir: 'src/pages/super-admin/warehouse-management', name: '仓库管理' },
  { dir: 'src/pages/super-admin/warehouse-detail', name: '仓库详情' },
  { dir: 'src/pages/super-admin/user-management', name: '用户管理' },
  { dir: 'src/pages/super-admin/edit-user', name: '编辑用户' },
  { dir: 'src/pages/super-admin/leave-approval', name: '请假审批' },
  { dir: 'src/pages/super-admin/driver-leave-detail', name: '请假详情' },
  { dir: 'src/pages/super-admin/driver-warehouse-assignment', name: '司机仓库分配' },
  { dir: 'src/pages/super-admin/manager-warehouse-assignment', name: '管理员仓库分配' },
  { dir: 'src/pages/super-admin/permission-config', name: '权限配置' },
  
  // 个人中心
  { dir: 'src/pages/profile', name: '个人中心' },
  { dir: 'src/pages/profile/edit', name: '编辑资料' },
  { dir: 'src/pages/profile/change-password', name: '修改密码' },
  { dir: 'src/pages/profile/settings', name: '设置' },
  { dir: 'src/pages/profile/feedback', name: '意见反馈' },
  { dir: 'src/pages/profile/help', name: '帮助中心' }
];

/**
 * 更新页面配置文件，启用下拉刷新
 */
function updatePageConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    console.log(`⚠️  配置文件不存在: ${configPath}`);
    return false;
  }

  let content = fs.readFileSync(configPath, 'utf-8');
  
  // 检查是否已经启用下拉刷新
  if (content.includes('enablePullDownRefresh')) {
    console.log(`✅ 已启用: ${configPath}`);
    return true;
  }

  // 在 definePageConfig 的对象中添加 enablePullDownRefresh
  // 匹配 definePageConfig({ ... })
  const regex = /(definePageConfig\(\{[^}]*)(}\))/s;
  
  if (regex.test(content)) {
    content = content.replace(regex, (match, p1, p2) => {
      // 移除最后的逗号（如果有）
      let config = p1.trim();
      if (!config.endsWith(',')) {
        config += ',';
      }
      return `${config}\n  enablePullDownRefresh: true,\n  backgroundTextStyle: 'dark'\n${p2}`;
    });
    
    fs.writeFileSync(configPath, content, 'utf-8');
    console.log(`✅ 已更新: ${configPath}`);
    return true;
  }

  console.log(`⚠️  无法解析: ${configPath}`);
  return false;
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始批量启用下拉刷新功能...\n');

  let successCount = 0;
  let failCount = 0;

  for (const page of PAGES_TO_PROCESS) {
    const configPath = path.join(process.cwd(), page.dir, 'index.config.ts');
    
    // 检查是否在排除列表中
    const isExcluded = EXCLUDE_PAGES.some(exclude => page.dir.includes(exclude));
    if (isExcluded) {
      console.log(`⏭️  跳过: ${page.name} (${page.dir})`);
      continue;
    }

    console.log(`📝 处理: ${page.name} (${page.dir})`);
    
    if (updatePageConfig(configPath)) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n✨ 完成！成功: ${successCount}, 失败: ${failCount}`);
}

// 运行主函数
main();
