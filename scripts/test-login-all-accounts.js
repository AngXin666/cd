/**
 * 测试所有账户的登录功能
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.TARO_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 配置');
  process.exit(1);
}

// 获取所有测试账户
async function getTestAccounts() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data } = await supabase
    .from('users')
    .select('login_account, phone, name, role')
    .order('phone', { ascending: true });
  
  return (data || []).map(u => ({
    name: u.name,
    account: u.login_account,
    phone: u.phone,
    password: 'admin123',
    role: u.role
  }));
}

const testAccounts = await getTestAccounts();

async function testAccountLogin(account) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧪 测试账户: ${account.name} (${account.role})`);
  console.log(`${'='.repeat(70)}`);

  // 测试1: 使用手机号登录
  console.log(`\n1️⃣ 测试手机号登录: ${account.phone}`);
  try {
    const loginEmail = `${account.phone}@phone.local`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: account.password
    });

    if (error) {
      console.log(`   ❌ 手机号登录失败: ${error.message}`);
    } else if (data.user) {
      console.log(`   ✅ 手机号登录成功`);
      console.log(`   - 用户ID: ${data.user.id}`);
      console.log(`   - Email: ${data.user.email}`);
      console.log(`   - Phone: ${data.user.phone}`);
      // 登出
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.log(`   ❌ 手机号登录异常: ${err.message}`);
  }

  // 测试2: 使用账号名登录
  console.log(`\n2️⃣ 测试账号名登录: ${account.account}`);
  try {
    // 创建新的客户端实例（确保没有残留session）
    const supabase2 = createClient(supabaseUrl, supabaseAnonKey);
    
    // 先查询获取手机号
    const { data: userData } = await supabase2
      .from('users')
      .select('phone')
      .eq('login_account', account.account)
      .maybeSingle();

    if (userData?.phone) {
      const loginEmail = `${userData.phone}@phone.local`;
      const { data, error } = await supabase2.auth.signInWithPassword({
        email: loginEmail,
        password: account.password
      });

      if (error) {
        console.log(`   ❌ 账号名登录失败: ${error.message}`);
      } else if (data.user) {
        console.log(`   ✅ 账号名登录成功`);
        console.log(`   - 用户ID: ${data.user.id}`);
        console.log(`   - Email: ${data.user.email}`);
        console.log(`   - Phone: ${data.user.phone}`);
        // 登出
        await supabase2.auth.signOut();
      }
    } else {
      console.log(`   ❌ 找不到账号名对应的用户`);
    }
  } catch (err) {
    console.log(`   ❌ 账号名登录异常: ${err.message}`);
  }

  // 测试3: 检查用户数据完整性
  console.log(`\n3️⃣ 测试登录后数据获取`);
  try {
    const supabase3 = createClient(supabaseUrl, supabaseAnonKey);
    const loginEmail = `${account.phone}@phone.local`;
    const { data: authData, error: authError } = await supabase3.auth.signInWithPassword({
      email: loginEmail,
      password: account.password
    });

    if (authError) {
      console.log(`   ❌ 登录失败，无法测试数据: ${authError.message}`);
    } else {
      // 查询 users 表
      const { data: userData, error: userError } = await supabase3
        .from('users')
        .select('id, name, phone, email, login_account, role')
        .eq('id', authData.user.id)
        .single();

      if (userError) {
        console.log(`   ❌ 查询用户数据失败: ${userError.message}`);
      } else if (userData) {
        console.log(`   ✅ 用户数据完整`);
        console.log(`   - 姓名: ${userData.name}`);
        console.log(`   - 角色: ${userData.role}`);
        console.log(`   - 手机号: ${userData.phone}`);
        console.log(`   - 登录账号: ${userData.login_account}`);
      }
      
      await supabase3.auth.signOut();
    }
  } catch (err) {
    console.log(`   ❌ 数据获取异常: ${err.message}`);
  }
}

async function main() {
  console.log('========================================');
  console.log('🧪 测试所有账户登录功能');
  console.log('========================================\n');

  const results = {
    success: [],
    failed: []
  };

  for (const account of testAccounts) {
    try {
      await testAccountLogin(account);
      results.success.push(account.name);
    } catch (err) {
      console.error(`\n❌ 账户 ${account.name} 测试过程出错: ${err.message}`);
      results.failed.push({ name: account.name, error: err.message });
    }
  }

  console.log('\n\n========================================');
  console.log('📊 测试结果汇总');
  console.log('========================================');
  console.log(`✅ 成功测试: ${results.success.length} 个账户`);
  console.log(`❌ 测试失败: ${results.failed.length} 个账户`);

  if (results.failed.length > 0) {
    console.log('\n失败详情:');
    results.failed.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}: ${item.error}`);
    });
  }

  console.log('\n========================================\n');
}

// 执行测试
main();
