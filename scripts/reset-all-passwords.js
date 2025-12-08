/**
 * 重置所有账户密码为 admin123
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

async function getAllAccounts() {
  const { data } = await supabase.from('users').select('id, name, phone, login_account');
  return data || [];
}

const accounts = await getAllAccounts();

async function resetPassword(account) {
  console.log(`\n重置密码: ${account.name} (${account.phone})`);
  
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(
      account.id,
      { password: 'admin123' }
    );

    if (error) {
      console.log(`❌ 重置失败: ${error.message}`);
      return false;
    }

    console.log(`✅ 密码重置成功`);
    return true;
  } catch (err) {
    console.log(`❌ 重置异常: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('🔧 重置所有账户密码为 admin123');
  console.log('========================================');

  let successCount = 0;
  let failCount = 0;

  for (const account of accounts) {
    const success = await resetPassword(account);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n========================================');
  console.log('📊 重置结果');
  console.log('========================================');
  console.log(`✅ 成功: ${successCount} 个账户`);
  console.log(`❌ 失败: ${failCount} 个账户`);
  console.log('========================================\n');
}

// 执行重置
main();
