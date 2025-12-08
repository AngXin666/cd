/**
 * 检查并修复账户配置，确保有完整的5个账户
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 期望的账户列表
const expectedAccounts = [
  { login_account: 'admin', phone: '13800000001', name: '老板admin', role: 'BOSS' },
  { login_account: 'admin1', phone: '13800000002', name: '调度admin1', role: 'PEER_ADMIN' },
  { login_account: 'admin2', phone: '13800000003', name: '车队长admin2', role: 'MANAGER' },
  { login_account: 'admin3', phone: '13800000004', name: '司机admin3', role: 'DRIVER' },
  { login_account: 'admin4', phone: '13800000005', name: '司机admin4', role: 'DRIVER' },
];

async function checkAndFixAccounts() {
  console.log('========================================');
  console.log('🔍 检查账户配置');
  console.log('========================================\n');

  // 查询现有账户
  const { data: existingUsers } = await supabase
    .from('users')
    .select('login_account, phone, name, role, id');

  const existingMap = new Map();
  existingUsers?.forEach(u => {
    existingMap.set(u.login_account, u);
  });

  console.log(`当前账户数: ${existingUsers?.length || 0}`);
  console.log('\n期望账户配置:');
  
  const toCreate = [];
  const toUpdate = [];
  const correct = [];

  for (const expected of expectedAccounts) {
    const existing = existingMap.get(expected.login_account);
    
    if (!existing) {
      console.log(`❌ ${expected.login_account} - 不存在，需要创建`);
      toCreate.push(expected);
    } else if (existing.phone !== expected.phone || existing.role !== expected.role) {
      console.log(`⚠️  ${expected.login_account} - 信息不匹配`);
      console.log(`   期望: ${expected.phone}, ${expected.role}`);
      console.log(`   实际: ${existing.phone}, ${existing.role}`);
      toUpdate.push({ expected, existing });
    } else {
      console.log(`✅ ${expected.login_account} - 正确`);
      correct.push(existing);
    }
  }

  // 检查多余账户
  const extraAccounts = existingUsers?.filter(u => 
    !expectedAccounts.some(e => e.login_account === u.login_account)
  ) || [];

  if (extraAccounts.length > 0) {
    console.log('\n⚠️  发现多余账户:');
    extraAccounts.forEach(u => {
      console.log(`   - ${u.login_account} (${u.phone})`);
    });
  }

  // 创建缺失账户
  if (toCreate.length > 0) {
    console.log('\n========================================');
    console.log('🔧 创建缺失账户');
    console.log('========================================\n');

    for (const account of toCreate) {
      await createAccount(account);
    }
  }

  // 更新不匹配账户
  if (toUpdate.length > 0) {
    console.log('\n========================================');
    console.log('🔧 更新不匹配账户');
    console.log('========================================\n');

    for (const { expected, existing } of toUpdate) {
      await updateAccount(existing.id, expected);
    }
  }

  console.log('\n========================================');
  console.log('✅ 账户检查完成');
  console.log('========================================\n');
}

async function createAccount(account) {
  console.log(`创建账户: ${account.login_account}`);

  try {
    // 1. 创建 auth.users
    const email = `${account.phone}@phone.local`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      phone: account.phone,
      password: 'admin123',
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        name: account.name,
        role: account.role
      }
    });

    if (authError) {
      console.log(`❌ 创建认证失败: ${authError.message}`);
      return;
    }

    // 2. 创建 users 记录
    const { error: usersError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        phone: account.phone,
        email,
        name: account.name,
        login_account: account.login_account,
        role: account.role
      });

    if (usersError) {
      console.log(`❌ 创建用户记录失败: ${usersError.message}`);
      return;
    }

    console.log(`✅ 创建成功 - ${account.login_account}`);
  } catch (err) {
    console.log(`❌ 创建异常: ${err.message}`);
  }
}

async function updateAccount(userId, expected) {
  console.log(`更新账户: ${expected.login_account}`);

  try {
    // 更新 users 表
    const { error } = await supabase
      .from('users')
      .update({
        phone: expected.phone,
        role: expected.role,
        name: expected.name
      })
      .eq('id', userId);

    if (error) {
      console.log(`❌ 更新失败: ${error.message}`);
      return;
    }

    // 更新 auth.users
    const email = `${expected.phone}@phone.local`;
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      email,
      phone: expected.phone,
      user_metadata: {
        name: expected.name,
        role: expected.role
      }
    });

    if (authError) {
      console.log(`❌ 更新认证失败: ${authError.message}`);
      return;
    }

    console.log(`✅ 更新成功 - ${expected.login_account}`);
  } catch (err) {
    console.log(`❌ 更新异常: ${err.message}`);
  }
}

checkAndFixAccounts();
