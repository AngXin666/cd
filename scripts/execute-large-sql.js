/**
 * 执行大型 SQL 文件的脚本
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

console.log('✅ Supabase URL:', supabaseUrl);
console.log('✅ Supabase Key:', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeLargeSQL() {
  try {
    console.log('\n📖 读取 SQL 文件...');
    const sqlPath = path.join(__dirname, '../supabase/migrations/20009_restore_create_tenant_schema_final.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 SQL 文件大小:', sqlContent.length, '字符');
    console.log('🚀 开始执行 SQL...\n');
    
    // 移除注释
    const sqlWithoutComments = sqlContent.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    
    // 通过 Supabase 的 rpc 执行（如果有的话）
    // 或者直接通过 REST API 执行
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ sql: sqlWithoutComments })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ 执行失败:', error);
      
      // 尝试另一种方式：直接执行
      console.log('\n🔄 尝试直接执行...');
      const { data, error: execError } = await supabase.rpc('exec', { sql: sqlWithoutComments });
      
      if (execError) {
        console.error('❌ 直接执行也失败:', execError);
        process.exit(1);
      }
      
      console.log('✅ 直接执行成功！');
      console.log('📊 结果:', data);
      return;
    }
    
    const result = await response.json();
    console.log('✅ 执行成功！');
    console.log('📊 结果:', result);
    
  } catch (err) {
    console.error('❌ 发生错误:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

executeLargeSQL();
