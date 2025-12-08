/**
 * 统一所有测试账号密码为 admin123
 * 
 * 执行后，以下账号的密码都将变为 admin123：
 * - admin (老板)
 * - admin1 (调度)
 * - admin2 (车队长)
 * - admin3 (司机)
 * - admin4 (司机)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 读取环境变量
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

// 使用 ANON_KEY（通过 RPC 函数执行）
const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY
);

const UNIFIED_PASSWORD = 'admin123';

async function unifyPasswords() {
  console.log('================================');
  console.log('开始统一测试账号密码...');
  console.log('新密码:', UNIFIED_PASSWORD);
  console.log('================================\n');

  // 执行 SQL 更新密码
  const { data, error } = await supabase.rpc('unify_test_passwords');

  if (error) {
    console.error('✗ 密码统一失败:', error.message);
    console.error('详细错误:', error);
    return;
  }

  console.log('\n================================');
  console.log('密码统一完成！');
  console.log('================================\n');

  console.log('测试账号登录信息：');
  console.log('1. admin (老板) - 密码: admin123');
  console.log('2. admin1 (调度) - 密码: admin123');
  console.log('3. admin2 (车队长) - 密码: admin123');
  console.log('4. admin3 (司机) - 密码: admin123');
  console.log('5. admin4 (司机) - 密码: admin123');
  console.log('\n提示：可使用账号名、手机号或邮箱登录');
}

// 执行统一密码操作
unifyPasswords()
  .then(() => {
    console.log('\n操作完成！');
    process.exit(0);
  })
  .catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });
