/**
 * 测试 Supabase 连接
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 手动读取 .env 文件
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.TARO_APP_SUPABASE_URL;
const supabaseKey = envVars.TARO_APP_SUPABASE_ANON_KEY;

console.log('\n=================================================');
console.log('🔍 测试 Supabase 连接配置');
console.log('=================================================\n');

console.log('📌 配置信息:');
console.log('  URL:', supabaseUrl);
console.log('  Key 长度:', supabaseKey ? supabaseKey.length : 0);
console.log('  Key 前缀:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'N/A');
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置！');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 开始测试连接...\n');

// 测试简单查询
supabase.from('users').select('count').limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ 连接失败!');
      console.error('  错误消息:', error.message);
      console.error('  错误代码:', error.code);
      console.error('  错误详情:', error.details);
      console.error('  错误提示:', error.hint);
      console.error('\n📋 完整错误对象:');
      console.error(JSON.stringify(error, null, 2));
      
      console.log('\n💡 可能的原因:');
      console.log('  1. API 密钥无效或已过期');
      console.log('  2. Supabase URL 不正确');
      console.log('  3. 数据库服务未启动或维护中');
      console.log('  4. 网络连接问题');
      console.log('  5. 需要特殊的认证方式（比如额外的header）\n');
    } else {
      console.log('✅ 连接成功!');
      console.log('  数据:', data);
      console.log('\n🎉 Supabase 配置正常，可以正常使用！\n');
    }
  })
  .catch(err => {
    console.error('❌ 发生异常:', err.message);
    console.error('  异常堆栈:', err.stack);
  });
