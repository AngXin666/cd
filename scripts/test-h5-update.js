/**
 * 测试H5更新功能
 * 运行: node scripts/test-h5-update.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co';
// 使用正确的Anon Key测试
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NTAzNTQsImV4cCI6MjA4MDMyNjM1NH0.6daRgrk8NC8QqSy29r5QpnNCrb9BE82g_HVqipmCOm0';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testH5Update() {
  console.log('========================================');
  console.log('测试H5更新功能');
  console.log('========================================\n');

  // 1. 测试数据库连接
  console.log('1. 测试数据库连接...');
  try {
    const { data, error } = await supabase
      .from('h5_versions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.log('   ❌ 查询失败:', error.message);
      console.log('   错误详情:', error);
      
      if (error.code === '42P01') {
        console.log('\n   ⚠️ 表不存在！请先执行 修复h5_versions表.sql');
      } else if (error.code === 'PGRST301') {
        console.log('\n   ⚠️ RLS策略问题！请检查表的RLS策略');
      }
      return;
    }

    console.log('   ✅ 数据库连接成功');
    console.log('   查询结果:', data);

    if (!data || data.length === 0) {
      console.log('\n   ⚠️ 没有找到激活的版本记录');
      console.log('   请执行 修复h5_versions表.sql 添加测试版本');
      return;
    }

    // 2. 检查版本
    const latestVersion = data[0];
    const currentVersion = '1.0.0'; // APP当前版本

    console.log('\n2. 版本比较...');
    console.log('   当前版本:', currentVersion);
    console.log('   最新版本:', latestVersion.version);
    console.log('   H5 URL:', latestVersion.h5_url);
    console.log('   强制更新:', latestVersion.is_force_update);

    // 3. 比较版本
    const comparison = compareVersions(latestVersion.version, currentVersion);
    console.log('\n3. 比较结果...');
    if (comparison > 0) {
      console.log('   ✅ 需要更新！');
      console.log('   APP应该显示更新对话框');
    } else if (comparison === 0) {
      console.log('   ⚠️ 版本相同，不需要更新');
      console.log('   请在数据库添加更高版本（如1.0.1）来测试');
    } else {
      console.log('   ⚠️ 当前版本更高，不需要更新');
    }

  } catch (err) {
    console.log('   ❌ 异常:', err.message);
  }

  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

testH5Update();
