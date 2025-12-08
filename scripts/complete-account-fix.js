/**
 * 完整修复账户配置
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function completeAccountFix() {
  console.log('========================================');
  console.log('🔧 完整修复账户配置');
  console.log('========================================\n');

  // 1. 删除angxin4
  console.log('1️⃣ 删除多余账户 angxin4...');
  const { data: angxin4 } = await supabase
    .from('users')
    .select('id')
    .eq('login_account', 'angxin4')
    .maybeSingle();

  if (angxin4) {
    // 删除认证记录
    await supabase.auth.admin.deleteUser(angxin4.id);
    console.log('✅ 已删除 angxin4\n');
  }

  // 2. 创建admin3
  console.log('2️⃣ 创建 admin3 账户...');
  const email = '13800000004@phone.local';
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    phone: '13800000004',
    password: 'admin123',
    email_confirm: true,
    phone_confirm: true,
    user_metadata: {
      name: '司机admin3',
      role: 'DRIVER'
    }
  });

  if (authError) {
    console.log(`❌ 创建认证失败: ${authError.message}\n`);
  } else {
    // 创建users记录
    const { error: usersError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        phone: '13800000004',
        email,
        name: '司机admin3',
        login_account: 'admin3',
        role: 'DRIVER'
      });

    if (usersError) {
      console.log(`❌ 创建用户记录失败: ${usersError.message}\n`);
    } else {
      console.log('✅ admin3 创建成功\n');
    }
  }

  // 3. 确认最终配置
  console.log('3️⃣ 最终账户配置:');
  const { data: finalUsers } = await supabase
    .from('users')
    .select('login_account, phone, name, role')
    .order('phone', { ascending: true });

  if (finalUsers) {
    finalUsers.forEach(u => {
      console.log(`   ✅ ${u.login_account.padEnd(10)} | ${u.phone} | ${u.name.padEnd(12)} | ${u.role}`);
    });
  }

  console.log('\n========================================');
  console.log('✅ 修复完成');
  console.log('========================================\n');
}

completeAccountFix();
