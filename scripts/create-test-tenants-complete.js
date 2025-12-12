#!/usr/bin/env node

/**
 * 完整的测试租户创建脚本
 * 
 * 此脚本会：
 * 1. 创建租户记录
 * 2. 创建租户 Schema
 * 3. 创建所有测试用户（包括老板、平级管理员、车队长、司机）
 * 
 * 使用方法：
 * 1. 确保 .env 文件中有 TARO_APP_SUPABASE_URL 和 TARO_APP_SUPABASE_ANON_KEY
 * 2. 运行：node scripts/create-test-tenants-complete.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.TARO_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 错误：缺少环境变量');
  console.error('请确保 .env 文件中包含：');
  console.error('  - TARO_APP_SUPABASE_URL');
  console.error('  - TARO_APP_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 测试租户配置
const testTenants = [
  {
    company_name: '测试租户1',
    tenant_code: 'tenant-test1',
    schema_name: 'tenant_test1',
    users: [
      { name: '老板1', phone: '13900000001', username: 'admin1', role: 'boss' },
      { name: '平级管理员1', phone: '13900000011', username: 'admin11', role: 'peer_admin' },
      { name: '车队长1', phone: '13900000111', username: 'admin111', role: 'manager' },
      { name: '司机1', phone: '13900001111', username: 'admin1111', role: 'driver' }
    ]
  },
  {
    company_name: '测试租户2',
    tenant_code: 'tenant-test2',
    schema_name: 'tenant_test2',
    users: [
      { name: '老板2', phone: '13900000002', username: 'admin2', role: 'boss' },
      { name: '平级管理员2', phone: '13900000022', username: 'admin22', role: 'peer_admin' },
      { name: '车队长2', phone: '13900000222', username: 'admin222', role: 'manager' },
      { name: '司机2', phone: '13900002222', username: 'admin2222', role: 'driver' }
    ]
  }
];

const password = '123456';

/**
 * 步骤1：创建租户记录
 */
async function createTenantRecord(tenantData) {
  console.log(`\n📝 创建租户记录：${tenantData.company_name}`);
  
  try {
    const { data, error } = await supabase
      .from('tenants')
      .insert({
        company_name: tenantData.company_name,
        tenant_code: tenantData.tenant_code,
        schema_name: tenantData.schema_name,
        status: 'active',
        boss_name: tenantData.users[0].name,
        boss_phone: tenantData.users[0].phone
      })
      .select()
      .single();

    if (error) {
      // 如果是重复键错误，尝试获取现有记录
      if (error.code === '23505') {
        console.log('   ℹ️ 租户记录已存在，获取现有记录...');
        const { data: existingData, error: selectError } = await supabase
          .from('tenants')
          .select()
          .eq('tenant_code', tenantData.tenant_code)
          .single();
        
        if (selectError) {
          console.error(`   ❌ 获取现有租户记录失败：${selectError.message}`);
          return null;
        }
        
        console.log(`   ✅ 使用现有租户记录：${existingData.id}`);
        return existingData;
      }
      
      console.error(`   ❌ 创建租户记录失败：${error.message}`);
      return null;
    }

    console.log(`   ✅ 租户记录创建成功：${data.id}`);
    return data;
  } catch (err) {
    console.error(`   ❌ 创建租户记录异常：${err.message}`);
    return null;
  }
}

/**
 * 步骤2：创建租户 Schema
 */
async function createTenantSchema(schemaName) {
  console.log(`\n🏗️ 创建租户 Schema：${schemaName}`);
  
  try {
    const { data, error } = await supabase.rpc('create_tenant_schema', {
      p_schema_name: schemaName
    });

    if (error) {
      console.error(`   ❌ 创建 Schema 失败：${error.message}`);
      return false;
    }

    if (!data || !data.success) {
      console.error(`   ❌ 创建 Schema 失败：${data?.error || '未知错误'}`);
      return false;
    }

    console.log(`   ✅ Schema 创建成功`);
    return true;
  } catch (err) {
    console.error(`   ❌ 创建 Schema 异常：${err.message}`);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始创建测试租户...\n');
  console.log('=' .repeat(60));
  console.log('\n⚠️ 重要提示：');
  console.log('此脚本只能创建租户记录和 Schema 结构');
  console.log('用户账号需要通过以下方式创建：');
  console.log('1. 使用中央管理系统界面创建');
  console.log('2. 使用 Supabase Auth Admin API（需要 SERVICE_ROLE_KEY）');
  console.log('\n' + '=' .repeat(60));

  let successCount = 0;
  let failCount = 0;

  for (const tenantData of testTenants) {
    console.log(`\n\n📦 处理租户：${tenantData.company_name}`);
    console.log('=' .repeat(60));

    // 步骤1：创建租户记录
    const tenant = await createTenantRecord(tenantData);
    if (!tenant) {
      console.log(`\n❌ 租户 ${tenantData.company_name} 创建失败`);
      failCount++;
      continue;
    }

    // 步骤2：创建租户 Schema
    const schemaCreated = await createTenantSchema(tenantData.schema_name);
    if (!schemaCreated) {
      console.log(`\n❌ 租户 ${tenantData.company_name} 的 Schema 创建失败`);
      failCount++;
      continue;
    }

    console.log(`\n✅ 租户 ${tenantData.company_name} 创建成功！`);
    console.log(`   - 租户 ID: ${tenant.id}`);
    console.log(`   - Schema: ${tenantData.schema_name}`);
    console.log(`   - 状态: ${tenant.status}`);
    
    successCount++;
  }

  console.log('\n\n' + '=' .repeat(60));
  console.log('✅ 租户创建完成！');
  console.log(`   成功：${successCount} 个`);
  console.log(`   失败：${failCount} 个`);

  if (successCount > 0) {
    console.log('\n📋 下一步操作：');
    console.log('\n方法1：通过中央管理系统界面创建用户（推荐）');
    console.log('------------------------------------------------------');
    console.log('1. 使用中央管理员账号登录：admin / 123456');
    console.log('2. 进入"租户管理"');
    console.log('3. 为每个租户创建老板账号');
    console.log('4. 使用老板账号登录，在"用户管理"中添加其他用户');
    
    console.log('\n方法2：使用 Supabase Dashboard');
    console.log('------------------------------------------------------');
    console.log('1. 打开 Supabase Dashboard');
    console.log('2. 进入 Authentication > Users');
    console.log('3. 点击"Add user"创建以下账号：');
    
    console.log('\n租户1 用户：');
    testTenants[0].users.forEach(user => {
      console.log(`   - ${user.name}：${user.phone} / ${password} (${user.role})`);
    });
    
    console.log('\n租户2 用户：');
    testTenants[1].users.forEach(user => {
      console.log(`   - ${user.name}：${user.phone} / ${password} (${user.role})`);
    });

    console.log('\n📝 创建用户时的注意事项：');
    console.log('------------------------------------------------------');
    console.log('1. 手机号必须唯一');
    console.log('2. 创建用户后，需要在对应租户的 Schema 中创建 profile 记录');
    console.log('3. 可以使用 SQL 或通过界面的"用户管理"功能创建');
    
    console.log('\n📖 详细步骤请参考：');
    console.log('   - 如何创建测试租户.md');
    console.log('   - 快速开始.md');
  }
}

// 运行脚本
main().catch(err => {
  console.error('❌ 脚本执行失败：', err);
  process.exit(1);
});
