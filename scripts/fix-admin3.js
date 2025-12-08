/**
 * 修复admin3账户
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

async function fixAdmin3() {
  console.log('🔍 查找admin3认证记录...\n');

  // 查找手机号为 13800000004 的认证记录
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
  const admin3Auth = authUsers.find(u => u.phone === '13800000004' || u.email === '13800000004@phone.local');

  if (!admin3Auth) {
    console.log('❌ 未找到admin3的认证记录');
    return;
  }

  console.log('✅ 找到认证记录:');
  console.log(`   ID: ${admin3Auth.id}`);
  console.log(`   Email: ${admin3Auth.email}`);
  console.log(`   Phone: ${admin3Auth.phone}\n`);

  // 检查users表是否已有此ID
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', admin3Auth.id)
    .maybeSingle();

  if (existingUser) {
    console.log('⚠️  users表已有记录，更新为admin3:');
    const { error } = await supabase
      .from('users')
      .update({
        login_account: 'admin3',
        name: '司机admin3',
        phone: '13800000004',
        role: 'DRIVER'
      })
      .eq('id', admin3Auth.id);

    if (error) {
      console.log(`❌ 更新失败: ${error.message}`);
    } else {
      console.log('✅ 更新成功');
    }
  } else {
    console.log('创建users表记录...');
    const { error } = await supabase
      .from('users')
      .insert({
        id: admin3Auth.id,
        login_account: 'admin3',
        name: '司机admin3',
        phone: '13800000004',
        email: '13800000004@phone.local',
        role: 'DRIVER'
      });

    if (error) {
      console.log(`❌ 创建失败: ${error.message}`);
    } else {
      console.log('✅ 创建成功');
    }
  }

  // 重置密码
  console.log('\n重置密码为admin123...');
  const { error: pwdError } = await supabase.auth.admin.updateUserById(admin3Auth.id, {
    password: 'admin123'
  });

  if (pwdError) {
    console.log(`❌ 密码重置失败: ${pwdError.message}`);
  } else {
    console.log('✅ 密码重置成功\n');
  }
}

fixAdmin3();
