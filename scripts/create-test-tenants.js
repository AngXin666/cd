#!/usr/bin/env node

/**
 * 创建测试租户和测试账号脚本
 * 
 * 租户1：测试租户1
 *   - 老板：admin1 / 123456
 *   - 平级管理员：admin11 / 123456
 *   - 车队长：admin111 / 123456
 *   - 司机：admin1111 / 123456
 * 
 * 租户2：测试租户2
 *   - 老板：admin2 / 123456
 *   - 平级管理员：admin22 / 123456
 *   - 车队长：admin222 / 123456
 *   - 司机：admin2222 / 123456
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 错误：缺少环境变量');
  console.error('请确保 .env 文件中包含：');
  console.error('  - TARO_APP_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 测试租户配置
const testTenants = [
  {
    name: '测试租户1',
    code: 'test-tenant-1',
    users: [
      { phone: '13800000001', name: '老板1', role: 'boss', username: 'admin1' },
      { phone: '13800000011', name: '平级管理员1', role: 'peer_admin', username: 'admin11' },
      { phone: '13800000111', name: '车队长1', role: 'manager', username: 'admin111' },
      { phone: '13800001111', name: '司机1', role: 'driver', username: 'admin1111' }
    ]
  },
  {
    name: '测试租户2',
    code: 'test-tenant-2',
    users: [
      { phone: '13800000002', name: '老板2', role: 'boss', username: 'admin2' },
      { phone: '13800000022', name: '平级管理员2', role: 'peer_admin', username: 'admin22' },
      { phone: '13800000222', name: '车队长2', role: 'manager', username: 'admin222' },
      { phone: '13800002222', name: '司机2', role: 'driver', username: 'admin2222' }
    ]
  }
];

const password = '123456';

/**
 * 创建租户
 */
async function createTenant(tenantData) {
  console.log(`\n📦 创建租户：${tenantData.name}`);
  
  try {
    // 调用 Edge Function 创建租户
    const { data, error } = await supabase.functions.invoke('create-tenant', {
      body: {
        tenant_name: tenantData.name,
        tenant_code: tenantData.code,
        boss_phone: tenantData.users[0].phone,
        boss_name: tenantData.users[0].name,
        boss_password: password
      }
    });

    if (error) {
      console.error(`❌ 创建租户失败：${error.message}`);
      return null;
    }

    console.log(`✅ 租户创建成功`);
    console.log(`   - 租户ID: ${data.tenant_id}`);
    console.log(`   - Schema: ${data.schema_name}`);
    console.log(`   - 老板账号: ${tenantData.users[0].phone} / ${password}`);
    
    return data;
  } catch (err) {
    console.error(`❌ 创建租户异常：${err.message}`);
    return null;
  }
}

/**
 * 创建租户内的其他用户
 */
async function createTenantUsers(tenantId, schemaName, users) {
  console.log(`\n👥 创建租户用户...`);
  
  // 跳过第一个用户（老板已经创建）
  for (let i = 1; i < users.length; i++) {
    const user = users[i];
    console.log(`\n   创建用户：${user.name} (${user.role})`);
    
    try {
      // 1. 创建 auth.users 账号
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        phone: user.phone,
        password: password,
        phone_confirm: true,
        user_metadata: {
          name: user.name,
          tenant_id: tenantId
        }
      });

      if (authError) {
        console.error(`   ❌ 创建认证账号失败：${authError.message}`);
        continue;
      }

      console.log(`   ✅ 认证账号创建成功：${authData.user.id}`);

      // 2. 在租户 schema 中创建 profile
      const { error: profileError } = await supabase
        .from(`${schemaName}.profiles`)
        .insert({
          id: authData.user.id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          tenant_id: tenantId
        });

      if (profileError) {
        console.error(`   ❌ 创建用户资料失败：${profileError.message}`);
        // 删除已创建的 auth 用户
        await supabase.auth.admin.deleteUser(authData.user.id);
        continue;
      }

      console.log(`   ✅ 用户资料创建成功`);
      console.log(`   📱 登录账号：${user.phone} / ${password}`);
      
    } catch (err) {
      console.error(`   ❌ 创建用户异常：${err.message}`);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始创建测试租户和账号...\n');
  console.log('=' .repeat(60));

  for (const tenantData of testTenants) {
    const result = await createTenant(tenantData);
    
    if (result) {
      await createTenantUsers(result.tenant_id, result.schema_name, tenantData.users);
    }
    
    console.log('\n' + '=' .repeat(60));
  }

  console.log('\n✅ 所有测试租户和账号创建完成！');
  console.log('\n📋 测试账号列表：');
  console.log('\n租户1：测试租户1');
  console.log('  老板：13800000001 / 123456 (admin1)');
  console.log('  平级管理员：13800000011 / 123456 (admin11)');
  console.log('  车队长：13800000111 / 123456 (admin111)');
  console.log('  司机：13800001111 / 123456 (admin1111)');
  console.log('\n租户2：测试租户2');
  console.log('  老板：13800000002 / 123456 (admin2)');
  console.log('  平级管理员：13800000022 / 123456 (admin22)');
  console.log('  车队长：13800000222 / 123456 (admin222)');
  console.log('  司机：13800002222 / 123456 (admin2222)');
}

// 运行脚本
main().catch(err => {
  console.error('❌ 脚本执行失败：', err);
  process.exit(1);
});
