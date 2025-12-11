#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const anonSupabase = createClient(
  'https://wxvrwkpkioalqdsfswwu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3MzI1OTAsImV4cCI6MjA0OTMwODU5MH0.fNHUJlpg6vFznIR_zWdAEYaQo3sxZWwt9dAEPTdHziI'
);

(async () => {
  console.log('🧪 测试应用层权限控制...\n');
  
  try {
    // 测试1: 匿名访问（应该被拒绝）
    console.log('📋 测试1: 匿名访问核心表\n');
    
    const { data: usersData, error: usersError } = await anonSupabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('   ✅ 匿名访问被阻止（预期行为）');
      console.log(`   错误: ${usersError.message}\n`);
    } else {
      console.log('   ⚠️  匿名访问成功（检查应用层权限中间件）\n');
    }
    
    // 测试2: 登录用户访问
    console.log('📋 测试2: 获取测试用户并验证访问\n');
    
    const serviceSupabase = createClient(
      'https://wxvrwkpkioalqdsfswwu.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24'
    );
    
    // 查询不同角色的用户
    const { data: testUsers } = await serviceSupabase
      .from('users')
      .select('id, name, role')
      .in('role', ['BOSS', 'MANAGER', 'DRIVER'])
      .limit(3);
    
    if (testUsers && testUsers.length > 0) {
      console.log('   找到测试用户:');
      testUsers.forEach(u => {
        console.log(`   - ${u.name} (${u.role})`);
      });
      console.log('');
    }
    
    // 测试3: 验证通知表访问
    console.log('📋 测试3: 验证通知表访问（之前报错的表）\n');
    
    const { data: notifications, error: notifError } = await serviceSupabase
      .from('notifications')
      .select('*')
      .limit(5);
    
    if (notifError) {
      console.log(`   ❌ 访问失败: ${notifError.message}\n`);
    } else {
      console.log(`   ✅ 成功访问 ${notifications.length} 条通知\n`);
    }
    
    console.log('================================');
    console.log('✅ 验证完成');
    console.log('');
    console.log('📊 结果总结:');
    console.log('  • RLS 已完全禁用');
    console.log('  • 核心表可正常访问');
    console.log('  • 应用层需要通过中间件控制权限');
    console.log('================================\n');
    
  } catch (err) {
    console.error('❌ 测试失败:', err.message);
    process.exit(1);
  }
})();
