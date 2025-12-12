const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 从 .env 读取配置
const envPath = path.join(__dirname, '../.env');
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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function dropDeprecatedFunctions() {
  console.log('🚀 开始删除废弃的权限函数...\n');
  
  const functions = [
    'get_user_permissions(uuid)',
    'has_permission(uuid, text)',
    'has_any_permission(uuid, text[])',
    'has_all_permissions(uuid, text[])'
  ];
  
  for (const func of functions) {
    try {
      const { error } = await supabase.rpc('exec_raw_sql', {
        sql: `DROP FUNCTION IF EXISTS ${func};`
      });
      
      if (error) {
        console.log(`❌ 删除失败 ${func}:`, error.message);
      } else {
        console.log(`✅ 已删除: ${func}`);
      }
    } catch (err) {
      console.log(`⚠️  跳过 ${func}: RPC方法不可用，这是正常的`);
    }
  }
  
  console.log('\n✅ 清理完成!');
  console.log('\n注意: 权限控制现在直接使用 users.role 字段');
}

dropDeprecatedFunctions().catch(err => {
  console.error('❌ 执行出错:', err);
  process.exit(1);
});

