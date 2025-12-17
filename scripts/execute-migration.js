/**
 * 数据库迁移执行脚本
 * 通过 Supabase REST API 执行 SQL 迁移
 * 
 * 由于 Supabase REST API 不支持 DDL 语句，
 * 这个脚本会尝试多种方法来添加字段
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkFieldExists() {
  console.log('检查 manager_permissions_enabled 字段是否存在...');
  
  const { data, error } = await supabase
    .from('users')
    .select('id, manager_permissions_enabled')
    .limit(1);

  if (error) {
    if (error.message.includes('manager_permissions_enabled') || error.code === '42703') {
      console.log('❌ 字段不存在\n');
      return false;
    }
    console.log('查询错误:', error);
    return false;
  }

  console.log('✅ 字段已存在\n');
  return true;
}

async function testUpdate() {
  console.log('测试更新操作...');
  
  // 获取一个 MANAGER 用户
  const { data: manager, error: selectError } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('role', 'MANAGER')
    .limit(1)
    .maybeSingle();

  if (selectError || !manager) {
    console.log('没有找到 MANAGER 用户，尝试 PEER_ADMIN...');
    
    const { data: peerAdmin, error: peerError } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('role', 'PEER_ADMIN')
      .limit(1)
      .maybeSingle();

    if (peerError || !peerAdmin) {
      console.log('没有找到可测试的用户');
      return false;
    }
    
    return await tryUpdate(peerAdmin);
  }

  return await tryUpdate(manager);
}

async function tryUpdate(user) {
  console.log(`尝试更新用户 ${user.name} (${user.id}) 的权限...`);
  
  const { data, error } = await supabase
    .from('users')
    .update({ 
      manager_permissions_enabled: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)
    .select('id, manager_permissions_enabled');

  if (error) {
    console.log('更新失败:', error.message);
    return false;
  }

  console.log('更新结果:', data);
  
  // 验证更新
  const { data: verify, error: verifyError } = await supabase
    .from('users')
    .select('manager_permissions_enabled')
    .eq('id', user.id)
    .maybeSingle();

  if (verifyError) {
    console.log('验证失败:', verifyError.message);
    return false;
  }

  console.log('验证结果:', verify);
  return verify?.manager_permissions_enabled === true;
}

async function main() {
  console.log('========================================');
  console.log('数据库迁移检查');
  console.log('========================================\n');

  const exists = await checkFieldExists();
  
  if (exists) {
    console.log('字段已存在，测试更新功能...\n');
    const updateWorks = await testUpdate();
    
    if (updateWorks) {
      console.log('\n✅ 迁移已完成，功能正常！');
    } else {
      console.log('\n⚠️ 更新测试失败，请检查权限');
    }
  } else {
    console.log('========================================');
    console.log('⚠️ 需要手动执行数据库迁移');
    console.log('========================================\n');
    
    console.log('请在 Supabase Dashboard SQL Editor 中执行以下 SQL：\n');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/00628_add_manager_permissions_enabled_field.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      console.log('----------------------------------------');
      console.log(sql);
      console.log('----------------------------------------\n');
    } else {
      console.log('----------------------------------------');
      console.log(`
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS manager_permissions_enabled BOOLEAN DEFAULT true;

UPDATE public.users 
SET manager_permissions_enabled = true 
WHERE role IN ('MANAGER', 'PEER_ADMIN') 
AND manager_permissions_enabled IS NULL;
`);
      console.log('----------------------------------------\n');
    }
    
    console.log('执行步骤：');
    console.log('1. 打开 https://supabase.com/dashboard');
    console.log('2. 选择项目 wxvrwkpkioalqdsfswwu');
    console.log('3. 点击左侧 "SQL Editor"');
    console.log('4. 粘贴上面的 SQL 并执行');
    console.log('5. 确认执行成功后重新测试\n');
  }
}

main().catch(console.error);
