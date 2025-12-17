/**
 * 添加 manager_permissions_enabled 字段到 users 表
 * 使用 Supabase REST API 直接执行 SQL
 * 
 * @module scripts/add-permission-column
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const SUPABASE_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/**
 * 检查字段是否存在
 */
async function checkFieldExists() {
  console.log('检查 manager_permissions_enabled 字段是否存在...');
  
  const { data, error } = await supabase
    .from('users')
    .select('manager_permissions_enabled')
    .limit(1);
  
  if (error && error.code === '42703') {
    console.log('❌ 字段不存在');
    return false;
  }
  
  if (error) {
    console.error('检查字段时出错:', error);
    return null;
  }
  
  console.log('✅ 字段已存在');
  return true;
}

/**
 * 通过 RPC 调用执行 SQL（如果有 execute_sql 函数）
 */
async function tryRpcExecute() {
  console.log('\n尝试通过 RPC 执行 SQL...');
  
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: `
      ALTER TABLE public.users 
      ADD COLUMN IF NOT EXISTS manager_permissions_enabled BOOLEAN DEFAULT true;
    `
  });
  
  if (error) {
    console.log('RPC 不可用:', error.message);
    return false;
  }
  
  return true;
}

/**
 * 通过 PostgREST 的 /rpc 端点执行
 */
async function tryPostgrestRpc() {
  console.log('\n尝试通过 PostgREST RPC 执行...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        sql_query: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS manager_permissions_enabled BOOLEAN DEFAULT true;`
      })
    });
    
    if (response.ok) {
      console.log('✅ SQL 执行成功');
      return true;
    }
    
    const errorText = await response.text();
    console.log('PostgREST RPC 失败:', response.status, errorText);
    return false;
  } catch (err) {
    console.log('PostgREST RPC 错误:', err.message);
    return false;
  }
}

/**
 * 尝试通过 Supabase Management API 执行 SQL
 */
async function tryManagementApi() {
  console.log('\n尝试通过 Management API 执行 SQL...');
  
  const PROJECT_REF = 'wxvrwkpkioalqdsfswwu';
  
  try {
    // 尝试 SQL 执行端点
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        query: `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS manager_permissions_enabled BOOLEAN DEFAULT true;`
      })
    });
    
    if (response.ok) {
      console.log('✅ Management API 执行成功');
      return true;
    }
    
    const errorText = await response.text();
    console.log('Management API 失败:', response.status, errorText);
    return false;
  } catch (err) {
    console.log('Management API 错误:', err.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('添加 manager_permissions_enabled 字段');
  console.log('========================================\n');
  
  // 1. 检查字段是否存在
  const exists = await checkFieldExists();
  
  if (exists === true) {
    console.log('\n✅ 字段已存在，无需添加');
    return;
  }
  
  // 2. 尝试各种方法执行 SQL
  let success = false;
  
  // 方法 1: RPC
  success = await tryRpcExecute();
  
  // 方法 2: PostgREST RPC
  if (!success) {
    success = await tryPostgrestRpc();
  }
  
  // 方法 3: Management API
  if (!success) {
    success = await tryManagementApi();
  }
  
  // 3. 验证结果
  if (success) {
    const verifyExists = await checkFieldExists();
    if (verifyExists) {
      console.log('\n✅ 字段添加成功！');
      
      // 更新现有用户的默认值
      console.log('\n更新现有 MANAGER/PEER_ADMIN 用户的默认值...');
      const { error: updateError } = await supabase
        .from('users')
        .update({ manager_permissions_enabled: true })
        .in('role', ['MANAGER', 'PEER_ADMIN'])
        .is('manager_permissions_enabled', null);
      
      if (updateError) {
        console.log('更新默认值失败:', updateError.message);
      } else {
        console.log('✅ 默认值更新完成');
      }
      
      return;
    }
  }
  
  // 4. 如果所有方法都失败，输出手动执行的 SQL
  console.log('\n' + '='.repeat(60));
  console.log('❌ 无法自动添加字段');
  console.log('请在 Supabase Dashboard 的 SQL Editor 中手动执行以下 SQL:');
  console.log('='.repeat(60));
  console.log(`
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS manager_permissions_enabled BOOLEAN DEFAULT true;

UPDATE public.users 
SET manager_permissions_enabled = true 
WHERE role IN ('MANAGER', 'PEER_ADMIN') 
AND manager_permissions_enabled IS NULL;
`);
  console.log('='.repeat(60));
  console.log('\nSupabase Dashboard: https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql/new');
}

main().catch(console.error);
