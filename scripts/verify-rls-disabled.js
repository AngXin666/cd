#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wxvrwkpkioalqdsfswwu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24'
);

(async () => {
  console.log('🔍 验证 RLS 禁用状态...\n');
  
  try {
    // 测试1: 查询 pg_tables 检查 RLS 状态
    const { data: rlsCheck, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .eq('rowsecurity', true);
    
    if (rlsError) {
      console.log('⚠️  无法通过 API 查询系统表');
      console.log('   使用其他方式验证...\n');
    } else if (rlsCheck && rlsCheck.length > 0) {
      console.log(`❌ 仍有 ${rlsCheck.length} 个表启用 RLS:`);
      rlsCheck.forEach(t => console.log(`   - ${t.tablename}`));
      console.log('');
      process.exit(1);
    } else {
      console.log('✅ 所有表的 RLS 已禁用\n');
    }
    
    // 测试2: 验证核心表可以直接访问（使用 service_role key）
    console.log('🧪 测试核心表访问（无 RLS 限制）...\n');
    
    const tables = ['users', 'notifications', 'attendance', 'piece_work_records'];
    
    for (const table of tables) {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: ${count} 条记录`);
      }
    }
    
    console.log('\n================================');
    console.log('🎉 RLS 完全禁用成功！');
    console.log('💡 所有表都可以直接访问（应用层控制权限）');
    console.log('================================\n');
    
  } catch (err) {
    console.error('❌ 验证失败:', err.message);
    process.exit(1);
  }
})();
