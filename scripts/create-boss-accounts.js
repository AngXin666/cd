#!/usr/bin/env node

/**
 * 为已创建的测试租户创建老板账号
 * 
 * 此脚本会：
 * 1. 使用中央管理员账号登录
 * 2. 为每个租户创建老板账号
 * 3. 在租户 Schema 中创建对应的 profile 记录
 * 
 * 使用方法：
 * node scripts/create-boss-accounts.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.TARO_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 错误：缺少环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 租户配置
const tenants = [
  {
    tenant_id: '26d10bc2-d13b-44b0-ac9f-dec469cfadc9',
    schema_name: 'tenant_test1',
    company_name: '测试租户1',
    boss: {
      name: '老板1',
      phone: '13900000001',
      username: 'admin1',
      password: '123456'
    }
  },
  {
    tenant_id: '52ff28a4-5edc-46eb-bc94-69252cadaf97',
    schema_name: 'tenant_test2',
    company_name: '测试租户2',
    boss: {
      name: '老板2',
      phone: '13900000002',
      username: 'admin2',
      password: '123456'
    }
  }
];

/**
 * 使用中央管理员账号登录
 */
async function loginAsAdmin() {
  console.log('🔐 使用中央管理员账号登录...');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      phone: '13800000001',
      password: '123456'
    });

    if (error) {
      console.error('❌ 登录失败:', error.message);
      return null;
    }

    if (!data.session) {
      console.error('❌ 登录失败：未获取到 session');
      return null;
    }

    console.log('✅ 登录成功');
    return data.session.access_token;
  } catch (err) {
    console.error('❌ 登录异常:', err.message);
    return null;
  }
}

/**
 * 为租户创建老板账号
 */
async function createBossAccount(tenant, accessToken) {
  console.log(`\n📝 为租户 ${tenant.company_name} 创建老板账号...`);
  console.log(`   姓名：${tenant.boss.name}`);
  console.log(`   手机号：${tenant.boss.phone}`);
  console.log(`   密码：${tenant.boss.password}`);

  try {
    // 调用 Edge Function 创建老板账号
    const response = await fetch(`${supabaseUrl}/functions/v1/create-boss-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        tenant_id: tenant.tenant_id,
        boss_name: tenant.boss.name,
        boss_phone: tenant.boss.phone,
        boss_password: tenant.boss.password
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`   ❌ 创建失败 (${response.status}):`, result.error || result);
      return false;
    }

    if (!result.success) {
      console.error(`   ❌ 创建失败:`, result.error);
      return false;
    }

    console.log(`   ✅ 老板账号创建成功`);
    console.log(`   - 用户 ID: ${result.user_id}`);
    console.log(`   - 手机号: ${tenant.boss.phone}`);
    console.log(`   - 账号名: ${tenant.boss.username}`);
    
    return true;
  } catch (err) {
    console.error(`   ❌ 创建异常:`, err.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始为测试租户创建老板账号...\n');
  console.log('=' .repeat(60));

  // 步骤1：登录
  const accessToken = await loginAsAdmin();
  if (!accessToken) {
    console.error('\n❌ 无法继续：登录失败');
    process.exit(1);
  }

  console.log('\n' + '=' .repeat(60));

  // 步骤2：为每个租户创建老板账号
  let successCount = 0;
  let failCount = 0;

  for (const tenant of tenants) {
    const success = await createBossAccount(tenant, accessToken);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // 步骤3：退出登录
  console.log('\n' + '=' .repeat(60));
  console.log('🔓 退出登录...');
  await supabase.auth.signOut();

  // 总结
  console.log('\n' + '=' .repeat(60));
  console.log('✅ 老板账号创建完成！');
  console.log(`   成功：${successCount} 个`);
  console.log(`   失败：${failCount} 个`);

  if (successCount > 0) {
    console.log('\n📋 创建的账号：');
    console.log('------------------------------------------------------');
    tenants.forEach(tenant => {
      console.log(`\n${tenant.company_name}：`);
      console.log(`   - 姓名：${tenant.boss.name}`);
      console.log(`   - 手机号：${tenant.boss.phone}`);
      console.log(`   - 账号名：${tenant.boss.username}`);
      console.log(`   - 密码：${tenant.boss.password}`);
    });

    console.log('\n📝 下一步操作：');
    console.log('------------------------------------------------------');
    console.log('1. 使用老板账号登录（例如：admin1 / 123456）');
    console.log('2. 进入"用户管理"页面');
    console.log('3. 添加其他用户（平级管理员、车队长、司机）');
    console.log('\n详细步骤请参考：如何创建测试租户.md');
  }
}

// 运行脚本
main().catch(err => {
  console.error('❌ 脚本执行失败：', err);
  process.exit(1);
});
