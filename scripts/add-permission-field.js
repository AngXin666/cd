/**
 * 添加 manager_permissions_enabled 字段到 users 表
 * 
 * 由于 Supabase REST API 不支持 DDL 语句，
 * 此脚本使用 Supabase 的 SQL 执行功能（通过 rpc 调用）
 * 
 * @module scripts/add-permission-field
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 创建 Supabase 客户端
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('错误: 缺少 Supabase 配置');
  console.error('请确保 .env 文件中包含 VITE_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    console.log('字段不存在，需要添加');
    return false;
  }
  
  if (error) {
    console.error('检查字段时出错:', error);
    return null;
  }
  
  console.log('字段已存在');
  return true;
}

/**
 * 尝试通过 RPC 执行 SQL
 */
async function tryExecuteSQL() {
  console.log('\n尝试通过 RPC 执行 SQL...');
  
  // 尝试调用可能存在的 execute_sql 函数
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: `
      ALTER TABLE public.users 
      ADD COLUMN IF NOT EXISTS manager_permissions_enabled BOOLEAN DEFAULT true;
    `
  });
  
  if (error) {
    console.log('RPC execute_sql 不可用:', error.message);
    return false;
  }
  
  console.log('SQL 执行成功');
  return true;
}

/**
 * 输出手动执行的 SQL
 */
function printManualSQL() {
  console.log('\n' + '='.repeat(60));
  console.log('请在 Supabase Dashboard 的 SQL Editor 中执行以下 SQL:');
  console.log('='.repeat(60));
  console.log(`
-- 添加 manager_permissions_enabled 字段
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS manager_permissions_enabled BOOLEAN DEFAULT true;

-- 为现有的 MANAGER 和 PEER_ADMIN 用户设置默认值
UPDATE public.users 
SET manager_permissions_enabled = true 
WHERE role IN ('MANAGER', 'PEER_ADMIN') 
AND manager_permissions_enabled IS NULL;

-- 添加注释
COMMENT ON COLUMN public.users.manager_permissions_enabled IS 
  '管理员权限启用状态：true=完整权限(full_control)，false=仅查看权限(view_only)，默认为true';
`);
  console.log('='.repeat(60));
  console.log('\nSupabase Dashboard SQL Editor 地址:');
  console.log(`${supabaseUrl.replace('.supabase.co', '')}/project/sql`);
  console.log('\n或者直接访问: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new');
}

/**
 * 主函数
 */
async function main() {
  console.log('开始检查和添加 manager_permissions_enabled 字段\n');
  
  // 1. 检查字段是否存在
  const exists = await checkFieldExists();
  
  if (exists === true) {
    console.log('\n✅ 字段已存在，无需添加');
    return;
  }
  
  if (exists === null) {
    console.log('\n⚠️ 无法确定字段状态');
    printManualSQL();
    return;
  }
  
  // 2. 尝试通过 RPC 执行
  const rpcSuccess = await tryExecuteSQL();
  
  if (rpcSuccess) {
    // 验证字段是否添加成功
    const verifyExists = await checkFieldExists();
    if (verifyExists) {
      console.log('\n✅ 字段添加成功！');
      return;
    }
  }
  
  // 3. 如果 RPC 不可用，输出手动执行的 SQL
  console.log('\n❌ 无法自动添加字段');
  printManualSQL();
}

main().catch(console.error);
