/**
 * 检查所有账户的登录状态
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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAccountsLogin() {
  console.log('========================================');
  console.log('🔍 检查所有账户登录状态');
  console.log('========================================\n');

  try {
    // 1. 查询 users 表中的所有账户
    console.log('📊 查询 users 表...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, phone, email, name, login_account, role')
      .order('created_at', { ascending: true });

    if (usersError) {
      console.error('❌ 查询 users 表失败:', usersError);
      return;
    }

    console.log(`✅ users 表中共有 ${usersData?.length || 0} 条记录\n`);

    // 2. 查询 auth.users 表中的所有认证账号
    console.log('📊 查询 auth.users 表...');
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ 查询 auth.users 表失败:', authError);
      return;
    }

    console.log(`✅ auth.users 表中共有 ${authUsers?.length || 0} 条记录\n`);

    // 3. 创建映射表
    const authMap = new Map();
    authUsers.forEach(user => {
      authMap.set(user.id, user);
      if (user.phone) {
        authMap.set(user.phone, user);
      }
      if (user.email) {
        authMap.set(user.email, user);
      }
    });

    // 4. 对比检查每个账户
    console.log('========================================');
    console.log('📋 账户详情对比\n');

    const canLogin = [];
    const cannotLogin = [];

    for (const user of usersData || []) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`👤 ${user.name || '未命名'} (${user.role})`);
      console.log(`${'='.repeat(60)}`);
      
      console.log(`Users表信息:`);
      console.log(`  - ID: ${user.id}`);
      console.log(`  - 手机号: ${user.phone || '未设置'}`);
      console.log(`  - Email: ${user.email || '未设置'}`);
      console.log(`  - 登录账号: ${user.login_account || '未设置'}`);

      // 检查是否存在 auth.users 记录
      const authUser = authMap.get(user.id);
      
      if (authUser) {
        console.log(`\nAuth.users信息:`);
        console.log(`  - ID: ${authUser.id}`);
        console.log(`  - Email: ${authUser.email || '未设置'}`);
        console.log(`  - Phone: ${authUser.phone || '未设置'}`);
        console.log(`  - Email确认: ${authUser.email_confirmed_at ? '✅' : '❌'}`);
        console.log(`  - Phone确认: ${authUser.phone_confirmed_at ? '✅' : '❌'}`);
        console.log(`  - 创建时间: ${authUser.created_at}`);

        // 检查可用的登录方式
        const loginMethods = [];
        if (user.phone) {
          // 手机号登录
          const phoneEmail = `${user.phone}@phone.local`;
          if (authUser.email === phoneEmail) {
            loginMethods.push(`手机号: ${user.phone}`);
          }
        }
        if (user.login_account) {
          // 账号名登录
          loginMethods.push(`账号名: ${user.login_account}`);
        }
        if (user.email && !user.email.includes('@phone.local') && !user.email.includes('@fleet.local')) {
          // 真实邮箱
          loginMethods.push(`邮箱: ${user.email}`);
        }

        console.log(`\n登录方式:`);
        if (loginMethods.length > 0) {
          loginMethods.forEach(method => console.log(`  ✅ ${method}`));
          console.log(`\n状态: ✅ 可以登录`);
          canLogin.push({ user, authUser, loginMethods });
        } else {
          console.log(`  ❌ 无可用登录方式`);
          console.log(`\n状态: ❌ 无法登录`);
          cannotLogin.push({ user, authUser, reason: '无可用登录方式' });
        }
      } else {
        console.log(`\n❌ Auth.users记录: 不存在`);
        console.log(`\n状态: ❌ 无法登录`);
        cannotLogin.push({ user, authUser: null, reason: 'auth.users中无记录' });
      }
    }

    // 5. 输出统计
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📊 统计结果');
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ 可以登录: ${canLogin.length} 个账户`);
    console.log(`❌ 无法登录: ${cannotLogin.length} 个账户`);

    if (cannotLogin.length > 0) {
      console.log(`\n无法登录的账户详情:`);
      cannotLogin.forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.user.name || '未命名'} (${item.user.role})`);
        console.log(`   手机号: ${item.user.phone || '未设置'}`);
        console.log(`   账号名: ${item.user.login_account || '未设置'}`);
        console.log(`   原因: ${item.reason}`);
      });
    }

    // 6. 检查是否有孤立的 auth.users 记录
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('🔍 检查孤立的认证记录');
    console.log(`${'='.repeat(60)}`);
    
    const userIds = new Set(usersData?.map(u => u.id) || []);
    const orphanedAuthUsers = authUsers.filter(au => !userIds.has(au.id));

    if (orphanedAuthUsers.length > 0) {
      console.log(`⚠️ 发现 ${orphanedAuthUsers.length} 个孤立的认证记录（auth.users有但users表没有）:`);
      orphanedAuthUsers.forEach((au, index) => {
        console.log(`\n${index + 1}. ID: ${au.id}`);
        console.log(`   Email: ${au.email || '未设置'}`);
        console.log(`   Phone: ${au.phone || '未设置'}`);
        console.log(`   创建时间: ${au.created_at}`);
      });
    } else {
      console.log(`✅ 无孤立记录`);
    }

    console.log('\n========================================\n');

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

// 执行检查
checkAccountsLogin();
