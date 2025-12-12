/**
 * 应用大型迁移文件的脚本
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 从环境变量读取 Supabase 配置
require('dotenv').config();

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL;
const supabaseKey = process.env.TARO_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误：未找到 Supabase 配置');
  console.error('请确保 .env 文件中包含 TARO_APP_SUPABASE_URL 和 TARO_APP_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('📖 读取迁移文件...');
    const migrationPath = path.join(__dirname, '../supabase/migrations/20009_restore_create_tenant_schema_final.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 迁移文件大小:', migrationSQL.length, '字符');
    console.log('🚀 开始应用迁移...');
    
    // 执行 SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ 迁移失败:', error);
      process.exit(1);
    }
    
    console.log('✅ 迁移成功应用！');
    console.log('📊 结果:', data);
    
  } catch (err) {
    console.error('❌ 发生错误:', err.message);
    process.exit(1);
  }
}

applyMigration();
