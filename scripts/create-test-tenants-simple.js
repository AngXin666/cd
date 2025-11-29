#!/usr/bin/env node

/**
 * 简化版测试租户创建脚本
 * 只创建租户和老板账号，其他用户通过界面添加
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

// 测试租户配置（只包含老板账号）
const testTenants = [
  {
    company_name: '测试租户1',
    boss_name: '老板1',
    boss_phone: '13900000001',
    boss_account: 'admin1',
    boss_password: '123456'
  },
  {
    company_name: '测试租户2',
    boss_name: '老板2',
    boss_phone: '13900000002',
    boss_account: 'admin2',
    boss_password: '123456'
  }
];

/**
 * 创建租户
 */
async function createTenant(tenantData) {
  console.log(`\n📦 创建租户：${tenantData.company_name}`);
  console.log(`   老板账号：${tenantData.boss_account} / ${tenantData.boss_phone}`);
  console.log(`   密码：${tenantData.boss_password}`);
  
  try {
    // 调用 Edge Function 创建租户
    const { data, error } = await supabase.functions.invoke('create-tenant', {
      body: tenantData
    });

    if (error) {
      console.error(`❌ 创建租户失败：${error.message}`);
      console.error(`   错误详情：`, error);
      return false;
    }

    if (!data || !data.success) {
      console.error(`❌ 创建租户失败：${data?.error || '未知错误'}`);
      return false;
    }

    console.log(`✅ 租户创建成功！`);
    console.log(`   - 租户ID: ${data.tenant.id}`);
    console.log(`   - 公司名称: ${data.tenant.company_name}`);
    console.log(`   - Schema: ${data.tenant.schema_name}`);
    console.log(`   - 老板ID: ${data.tenant.boss_user_id}`);
    console.log(`   - 登录方式：`);
    console.log(`     * 账号名: ${tenantData.boss_account}`);
    console.log(`     * 手机号: ${tenantData.boss_phone}`);
    console.log(`     * 密码: ${tenantData.boss_password}`);
    
    return true;
  } catch (err) {
    console.error(`❌ 创建租户异常：${err.message}`);
    console.error(`   异常详情：`, err);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始创建测试租户...\n');
  console.log('=' .repeat(60));

  let successCount = 0;
  let failCount = 0;

  for (const tenantData of testTenants) {
    const success = await createTenant(tenantData);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    console.log('\n' + '=' .repeat(60));
  }

  console.log('\n✅ 租户创建完成！');
  console.log(`   成功：${successCount} 个`);
  console.log(`   失败：${failCount} 个`);

  if (successCount > 0) {
    console.log('\n📋 测试账号列表（老板账号）：');
    console.log('\n租户1：测试租户1');
    console.log('  账号名：admin1');
    console.log('  手机号：13800000001');
    console.log('  密码：123456');
    console.log('\n租户2：测试租户2');
    console.log('  账号名：admin2');
    console.log('  手机号：13800000002');
    console.log('  密码：123456');
    
    console.log('\n📝 下一步操作：');
    console.log('1. 使用老板账号登录（admin1 或 admin2）');
    console.log('2. 在用户管理页面添加其他角色的用户：');
    console.log('   - 平级管理员（peer_admin）');
    console.log('   - 车队长（manager）');
    console.log('   - 司机（driver）');
  }
}

// 运行脚本
main().catch(err => {
  console.error('❌ 脚本执行失败：', err);
  process.exit(1);
});
