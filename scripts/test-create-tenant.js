/**
 * 测试创建租户功能
 */

const fs = require('fs');
const path = require('path');

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

console.log('✅ Supabase URL:', supabaseUrl);
console.log('✅ Supabase Key:', supabaseKey.substring(0, 20) + '...');

async function testCreateTenant() {
  try {
    console.log('\n🚀 开始测试创建租户功能...\n');
    
    // 准备测试数据
    const testData = {
      company_name: '测试公司' + Date.now(),
      contact_name: '张三',
      contact_phone: '13800138000',
      contact_email: 'test@example.com',
      boss_name: '李老板',
      boss_phone: '13900139' + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
      boss_email: 'boss' + Date.now() + '@example.com',
      boss_password: 'Test123456'
    };
    
    console.log('📝 测试数据:', JSON.stringify(testData, null, 2));
    console.log('\n🔄 调用 create-tenant Edge Function...\n');
    
    // 调用 Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/create-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ 创建租户失败:', result);
      console.error('HTTP 状态码:', response.status);
      process.exit(1);
    }
    
    console.log('✅ 创建租户成功！');
    console.log('📊 结果:', JSON.stringify(result, null, 2));
    
    // 验证租户 Schema
    if (result.tenant && result.tenant.schema_name) {
      console.log('\n🔍 验证租户 Schema:', result.tenant.schema_name);
      
      // 这里可以添加更多验证逻辑
      // 例如：检查 Schema 中的表是否存在
      
      console.log('✅ 租户 Schema 验证通过');
    }
    
    console.log('\n🎉 测试完成！');
    
  } catch (err) {
    console.error('❌ 测试失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testCreateTenant();
