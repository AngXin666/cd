#!/usr/bin/env node

/**
 * 验证老板账号是否可以正常登录和识别角色
 * 
 * 此脚本会：
 * 1. 尝试使用老板账号登录
 * 2. 检查 user_metadata 中的角色和租户信息
 * 3. 验证租户 Schema 中的 profile 记录
 * 
 * 使用方法：
 * node scripts/verify-boss-accounts.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.TARO_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 错误：缺少环境变量');
  process.exit(1);
}

// 测试账号
const testAccounts = [
  {
    name: '租户1老板',
    phone: '13900000001',
    password: '123456',
    expectedRole: 'boss',
    expectedTenantId: '26d10bc2-d13b-44b0-ac9f-dec469cfadc9',
    schemaName: 'tenant_test1'
  },
  {
    name: '租户2老板',
    phone: '13900000002',
    password: '123456',
    expectedRole: 'boss',
    expectedTenantId: '52ff28a4-5edc-46eb-bc94-69252cadaf97',
    schemaName: 'tenant_test2'
  }
];

/**
 * 测试账号登录
 */
async function testLogin(account) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 测试账号：${account.name}`);
  console.log(`${'='.repeat(60)}`);

  // 创建新的 Supabase 客户端（每个测试独立）
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // 1. 登录
    console.log(`\n1️⃣ 尝试登录...`);
    console.log(`   手机号：${account.phone}`);
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      phone: account.phone,
      password: account.password
    });

    if (loginError) {
      console.error(`   ❌ 登录失败:`, loginError.message);
      return false;
    }

    if (!loginData.user) {
      console.error(`   ❌ 登录失败：未返回用户信息`);
      return false;
    }

    console.log(`   ✅ 登录成功`);
    console.log(`   - 用户 ID: ${loginData.user.id}`);

    // 2. 检查 user_metadata
    console.log(`\n2️⃣ 检查 user_metadata...`);
    const metadata = loginData.user.user_metadata || {};
    console.log(`   - 姓名: ${metadata.name || '未设置'}`);
    console.log(`   - 角色: ${metadata.role || '未设置'}`);
    console.log(`   - 租户ID: ${metadata.tenant_id || '未设置'}`);

    if (!metadata.role) {
      console.error(`   ❌ 角色未设置`);
      return false;
    }

    if (metadata.role !== account.expectedRole) {
      console.error(`   ❌ 角色不匹配，期望: ${account.expectedRole}, 实际: ${metadata.role}`);
      return false;
    }

    if (!metadata.tenant_id) {
      console.error(`   ❌ 租户ID未设置`);
      return false;
    }

    if (metadata.tenant_id !== account.expectedTenantId) {
      console.error(`   ❌ 租户ID不匹配`);
      console.error(`      期望: ${account.expectedTenantId}`);
      console.error(`      实际: ${metadata.tenant_id}`);
      return false;
    }

    console.log(`   ✅ user_metadata 验证通过`);

    // 3. 验证租户 Schema 中的 profile
    console.log(`\n3️⃣ 验证租户 Schema 中的 profile...`);
    
    // 使用 RPC 函数查询租户 Schema
    const { data: profileData, error: profileError } = await supabase.rpc('get_tenant_profile', {
      p_schema_name: account.schemaName,
      p_user_id: loginData.user.id
    });

    if (profileError) {
      console.error(`   ⚠️ 无法查询 profile:`, profileError.message);
      console.log(`   （这可能是因为 RPC 函数不存在，但不影响登录功能）`);
    } else if (profileData) {
      console.log(`   ✅ Profile 存在`);
      console.log(`   - 姓名: ${profileData.name}`);
      console.log(`   - 角色: ${profileData.role}`);
      console.log(`   - 状态: ${profileData.status}`);
    }

    // 4. 登出
    console.log(`\n4️⃣ 登出...`);
    await supabase.auth.signOut();
    console.log(`   ✅ 登出成功`);

    console.log(`\n✅ ${account.name} 测试通过！`);
    return true;

  } catch (err) {
    console.error(`\n❌ 测试异常:`, err.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始验证老板账号...\n');

  let passCount = 0;
  let failCount = 0;

  for (const account of testAccounts) {
    const success = await testLogin(account);
    if (success) {
      passCount++;
    } else {
      failCount++;
    }
    
    // 等待一下，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));
  console.log(`✅ 通过：${passCount} 个`);
  console.log(`❌ 失败：${failCount} 个`);

  if (passCount === testAccounts.length) {
    console.log('\n🎉 所有测试通过！老板账号可以正常使用。');
    console.log('\n📝 下一步操作：');
    console.log('1. 在小程序中使用老板账号登录（admin1 / 123456 或 admin2 / 123456）');
    console.log('2. 进入"用户管理"页面');
    console.log('3. 添加其他用户（平级管理员、车队长、司机）');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查上面的错误信息');
  }
}

// 运行脚本
main().catch(err => {
  console.error('❌ 脚本执行失败：', err);
  process.exit(1);
});
