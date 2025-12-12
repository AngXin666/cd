#!/usr/bin/env node

/**
 * 验证测试账号是否创建成功
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 错误：缺少环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 测试账号列表
const testAccounts = [
  // 租户1
  { phone: '13800000001', name: '老板1', role: 'boss', tenant: '租户1' },
  { phone: '13800000011', name: '平级管理员1', role: 'peer_admin', tenant: '租户1' },
  { phone: '13800000111', name: '车队长1', role: 'manager', tenant: '租户1' },
  { phone: '13800001111', name: '司机1', role: 'driver', tenant: '租户1' },
  // 租户2
  { phone: '13800000002', name: '老板2', role: 'boss', tenant: '租户2' },
  { phone: '13800000022', name: '平级管理员2', role: 'peer_admin', tenant: '租户2' },
  { phone: '13800000222', name: '车队长2', role: 'manager', tenant: '租户2' },
  { phone: '13800002222', name: '司机2', role: 'driver', tenant: '租户2' }
];

/**
 * 验证账号是否存在
 */
async function verifyAccount(account) {
  try {
    // 查询 auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error(`   ❌ 查询认证用户失败：${authError.message}`);
      return false;
    }

    const authUser = authData.users.find(u => u.phone === account.phone);
    
    if (!authUser) {
      console.log(`   ❌ 认证账号不存在：${account.phone}`);
      return false;
    }

    console.log(`   ✅ 认证账号存在：${account.phone}`);
    return true;
  } catch (err) {
    console.error(`   ❌ 验证失败：${err.message}`);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🔍 开始验证测试账号...\n');
  console.log('=' .repeat(60));

  let successCount = 0;
  let failCount = 0;

  for (const account of testAccounts) {
    console.log(`\n验证账号：${account.tenant} - ${account.name} (${account.role})`);
    console.log(`手机号：${account.phone}`);
    
    const success = await verifyAccount(account);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log(`\n验证完成！`);
  console.log(`✅ 成功：${successCount} 个账号`);
  console.log(`❌ 失败：${failCount} 个账号`);

  if (failCount === 0) {
    console.log('\n🎉 所有测试账号都已成功创建！');
  } else {
    console.log('\n⚠️ 部分账号创建失败，请运行创建脚本：');
    console.log('   node scripts/create-test-tenants.js');
  }
}

// 运行脚本
main().catch(err => {
  console.error('❌ 脚本执行失败：', err);
  process.exit(1);
});
