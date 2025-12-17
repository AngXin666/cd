/**
 * 数据库迁移执行脚本 - 使用 Supabase Management API
 * 用于添加 manager_permissions_enabled 字段到 users 表
 */

const https = require('https');

// Supabase 项目配置
const PROJECT_REF = 'wxvrwkpkioalqdsfswwu';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

// 要执行的 SQL
const SQL = `
-- 添加 manager_permissions_enabled 字段
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS manager_permissions_enabled BOOLEAN DEFAULT true;

-- 为现有管理员设置默认值
UPDATE public.users 
SET manager_permissions_enabled = true 
WHERE role IN ('MANAGER', 'PEER_ADMIN') 
AND manager_permissions_enabled IS NULL;
`;

/**
 * 使用 PostgREST RPC 执行 SQL（如果有 exec_sql 函数）
 */
async function tryRpcExecSql() {
  const fetch = (await import('node-fetch')).default;
  
  // 尝试调用 exec_sql RPC 函数（如果存在）
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ sql: SQL })
  });

  if (response.ok) {
    return { success: true, method: 'rpc' };
  }
  
  return { success: false, error: await response.text() };
}

/**
 * 直接通过 pg 连接执行（需要数据库连接字符串）
 */
async function runMigration() {
  console.log('========================================');
  console.log('执行数据库迁移 - manager_permissions_enabled');
  console.log('========================================\n');

  try {
    // 方法1: 尝试 RPC
    console.log('尝试通过 RPC 执行...');
    const rpcResult = await tryRpcExecSql();
    
    if (rpcResult.success) {
      console.log('✅ 迁移成功（通过 RPC）\n');
      return;
    }
    
    console.log('RPC 方法不可用，尝试其他方法...\n');

    // 方法2: 使用 Supabase 的 SQL 执行端点
    const fetch = (await import('node-fetch')).default;
    
    // 尝试通过 pg-meta API 执行
    const pgMetaResponse = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ query: SQL })
    });

    if (pgMetaResponse.ok) {
      console.log('✅ 迁移成功（通过 pg-meta）\n');
      return;
    }

    // 如果都失败，输出手动执行的 SQL
    console.log('⚠️ 自动执行失败，需要手动执行\n');
    console.log('请在 Supabase Dashboard SQL Editor 中执行以下 SQL：');
    console.log('----------------------------------------');
    console.log(SQL);
    console.log('----------------------------------------\n');
    
    console.log('或者使用 Supabase CLI：');
    console.log('supabase db push');

  } catch (error) {
    console.error('迁移失败:', error.message);
  }
}

runMigration();
