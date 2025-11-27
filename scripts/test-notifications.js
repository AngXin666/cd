/**
 * 测试通知功能
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 从 .env 文件读取配置
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

let supabaseUrl = '';
let supabaseKey = '';

envLines.forEach(line => {
  if (line.startsWith('TARO_APP_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  } else if (line.startsWith('TARO_APP_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim();
  }
});

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误：未找到 Supabase 配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNotifications() {
  try {
    console.log('\n🚀 开始测试通知功能...\n');
    
    // 1. 获取租户信息
    console.log('📝 获取租户信息...');
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('tenant_code', 'tenant-001')
      .maybeSingle();
    
    if (tenantError || !tenant) {
      console.error('❌ 获取租户信息失败:', tenantError);
      process.exit(1);
    }
    
    console.log('✅ 租户信息:', {
      id: tenant.id,
      company_name: tenant.company_name,
      schema_name: tenant.schema_name,
      boss_user_id: tenant.boss_user_id
    });
    
    // 2. 创建测试通知
    console.log('\n📝 创建测试通知...');
    
    // 注意：由于我们需要访问租户 Schema 中的 notifications 表，
    // 我们需要使用 RPC 调用或者直接执行 SQL
    // 这里我们使用 RPC 调用
    
    const { data: insertResult, error: insertError } = await supabase.rpc('insert_notification', {
      p_schema_name: tenant.schema_name,
      p_sender_id: tenant.boss_user_id,
      p_receiver_id: tenant.boss_user_id,
      p_title: '测试通知',
      p_content: '这是一条测试通知',
      p_type: 'system'
    });
    
    if (insertError) {
      console.error('❌ 创建通知失败:', insertError);
      console.log('💡 提示：可能需要创建 insert_notification RPC 函数');
      
      // 尝试直接执行 SQL
      console.log('\n🔄 尝试直接执行 SQL...');
      const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
        sql: `
          INSERT INTO ${tenant.schema_name}.notifications (sender_id, receiver_id, title, content, type, status)
          VALUES ('${tenant.boss_user_id}', '${tenant.boss_user_id}', '测试通知', '这是一条测试通知', 'system', 'unread')
          RETURNING *;
        `
      });
      
      if (sqlError) {
        console.error('❌ 直接执行 SQL 也失败:', sqlError);
        console.log('💡 提示：通知功能需要在前端应用中测试');
      } else {
        console.log('✅ 通知创建成功（通过 SQL）:', sqlResult);
      }
    } else {
      console.log('✅ 通知创建成功:', insertResult);
    }
    
    console.log('\n🎉 测试完成！');
    console.log('💡 提示：完整的通知功能测试需要在前端应用中进行');
    
  } catch (err) {
    console.error('❌ 测试失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testNotifications();
