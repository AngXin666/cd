#!/usr/bin/env node

/**
 * 为已创建的测试租户创建老板账号（使用 signUp）
 * 
 * 此脚本会：
 * 1. 使用 Supabase signUp 创建用户账号
 * 2. 在租户 Schema 中创建对应的 profile 记录
 * 3. 更新租户记录
 * 
 * 使用方法：
 * node scripts/create-boss-accounts-v2.js
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
      email: 'admin1@fleet.local',
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
      email: 'admin2@fleet.local',
      username: 'admin2',
      password: '123456'
    }
  }
];

/**
 * 创建用户账号
 */
async function createUserAccount(boss) {
  console.log(`\n👤 创建用户账号：${boss.name}`);
  console.log(`   手机号：${boss.phone}`);
  console.log(`   邮箱：${boss.email}`);

  try {
    const { data, error } = await supabase.auth.signUp({
      phone: boss.phone,
      password: boss.password,
      options: {
        data: {
          name: boss.name
        }
      }
    });

    if (error) {
      console.error(`   ❌ 创建失败:`, error.message);
      return null;
    }

    if (!data.user) {
      console.error(`   ❌ 创建失败：未返回用户信息`);
      return null;
    }

    console.log(`   ✅ 用户账号创建成功`);
    console.log(`   - 用户 ID: ${data.user.id}`);
    
    return data.user.id;
  } catch (err) {
    console.error(`   ❌ 创建异常:`, err.message);
    return null;
  }
}

/**
 * 在租户 Schema 中创建 profile
 */
async function createTenantProfile(userId, tenant) {
  console.log(`\n📝 在租户 Schema 中创建 profile...`);

  try {
    const { error } = await supabase.rpc('insert_tenant_profile', {
      p_schema_name: tenant.schema_name,
      p_user_id: userId,
      p_name: tenant.boss.name,
      p_phone: tenant.boss.phone,
      p_email: tenant.boss.email,
      p_role: 'boss'
    });

    if (error) {
      console.error(`   ❌ 创建 profile 失败:`, error.message);
      return false;
    }

    console.log(`   ✅ Profile 创建成功`);
    return true;
  } catch (err) {
    console.error(`   ❌ 创建 profile 异常:`, err.message);
    return false;
  }
}

/**
 * 更新租户记录
 */
async function updateTenantRecord(userId, tenant) {
  console.log(`\n🔄 更新租户记录...`);

  try {
    const { error } = await supabase
      .from('tenants')
      .update({
        boss_user_id: userId,
        boss_name: tenant.boss.name,
        boss_phone: tenant.boss.phone
      })
      .eq('id', tenant.tenant_id);

    if (error) {
      console.error(`   ❌ 更新失败:`, error.message);
      return false;
    }

    console.log(`   ✅ 租户记录更新成功`);
    return true;
  } catch (err) {
    console.error(`   ❌ 更新异常:`, err.message);
    return false;
  }
}

/**
 * 为租户创建老板账号
 */
async function createBossForTenant(tenant) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 处理租户：${tenant.company_name}`);
  console.log(`${'='.repeat(60)}`);

  // 步骤1：创建用户账号
  const userId = await createUserAccount(tenant.boss);
  if (!userId) {
    console.log(`\n❌ 租户 ${tenant.company_name} 的老板账号创建失败`);
    return false;
  }

  // 步骤2：在租户 Schema 中创建 profile
  const profileCreated = await createTenantProfile(userId, tenant);
  if (!profileCreated) {
    console.log(`\n⚠️ 用户账号已创建，但 profile 创建失败`);
    console.log(`   用户 ID: ${userId}`);
    console.log(`   请手动执行 SQL 创建 profile`);
    return false;
  }

  // 步骤3：更新租户记录
  const tenantUpdated = await updateTenantRecord(userId, tenant);
  if (!tenantUpdated) {
    console.log(`\n⚠️ 用户账号和 profile 已创建，但租户记录更新失败`);
    console.log(`   用户 ID: ${userId}`);
    console.log(`   请手动更新租户记录`);
    return false;
  }

  console.log(`\n✅ 租户 ${tenant.company_name} 的老板账号创建完成！`);
  console.log(`   - 用户 ID: ${userId}`);
  console.log(`   - 姓名: ${tenant.boss.name}`);
  console.log(`   - 手机号: ${tenant.boss.phone}`);
  console.log(`   - 账号名: ${tenant.boss.username}`);
  console.log(`   - 密码: ${tenant.boss.password}`);
  
  return true;
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始为测试租户创建老板账号...\n');

  let successCount = 0;
  let failCount = 0;

  for (const tenant of tenants) {
    const success = await createBossForTenant(tenant);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // 等待一下，避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('✅ 老板账号创建完成！');
  console.log(`   成功：${successCount} 个`);
  console.log(`   失败：${failCount} 个`);

  if (successCount > 0) {
    console.log('\n📋 创建的账号：');
    console.log('-'.repeat(60));
    tenants.forEach(tenant => {
      console.log(`\n${tenant.company_name}：`);
      console.log(`   - 姓名：${tenant.boss.name}`);
      console.log(`   - 手机号：${tenant.boss.phone}`);
      console.log(`   - 账号名：${tenant.boss.username}`);
      console.log(`   - 密码：${tenant.boss.password}`);
    });

    console.log('\n📝 下一步操作：');
    console.log('-'.repeat(60));
    console.log('1. 使用老板账号登录（例如：admin1 / 123456）');
    console.log('2. 进入"用户管理"页面');
    console.log('3. 添加其他用户（平级管理员、车队长、司机）');
    console.log('\n详细步骤请参考：如何创建测试租户.md');
  }

  if (failCount > 0) {
    console.log('\n⚠️ 部分账号创建失败');
    console.log('可能的原因：');
    console.log('1. 手机号已被注册');
    console.log('2. 数据库权限问题');
    console.log('3. RPC 函数不存在或有错误');
    console.log('\n请查看上面的错误信息，或使用 Supabase Dashboard 手动创建');
  }
}

// 运行脚本
main().catch(err => {
  console.error('❌ 脚本执行失败：', err);
  process.exit(1);
});
