const fs = require('fs');
const path = require('path');
const https = require('https');

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

// 直接执行 SQL（通过 REST API）
async function executeSqlDirect(sql) {
  const url = new URL(supabaseUrl + '/rest/v1/');
  
  return new Promise((resolve, reject) => {
    const postData = sql;
    
    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port || 443,
      path: '/rest/v1/rpc/exec_sql',
      headers: {
        'Content-Type': 'text/plain',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          resolve({ success: false, error: data, statusCode: res.statusCode });
        }
      });
    });
    
    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

async function migrate() {
  console.log('🚀 开始执行数据库迁移...\n');
  
  const migrationPath = path.join(__dirname, '../supabase/migrations/00607_fix_user_behavior_tracking_for_single_user.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  // 分段执行每个语句
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      if (!s) return false;
      if (s.startsWith('--')) return false;
      if (s.match(/^\/\*[\s\S]*\*\/$/)) return false;
      return true;
    });
  
  console.log(`📋 共 ${statements.length} 条SQL语句\n`);
  
  let successCount = 0;
  let failCount = 0;
  const errors = [];
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 60).replace(/\n/g, ' ');
    
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);
    
    try {
      // 直接通过 pg 协议执行（使用 supabase CLI 风格）
      const { success, error, statusCode } = await executeSqlDirect(statement + ';');
      
      if (success) {
        console.log('✅');
        successCount++;
      } else {
        console.log('❌');
        failCount++;
        errors.push({ statement: preview, error: error || `HTTP ${statusCode}` });
      }
    } catch (err) {
      console.log('❌');
      failCount++;
      errors.push({ statement: preview, error: err.message });
    }
    
    // 添加小延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 执行完成: ${successCount} 成功, ${failCount} 失败\n`);
  
  if (errors.length > 0 && errors.length <= 5) {
    console.log('❌ 错误详情:');
    errors.forEach((e, i) => {
      console.log(`${i + 1}. ${e.statement}`);
      console.log(`   ${e.error}\n`);
    });
  }
  
  if (failCount === 0) {
    console.log('✅ 迁移成功！现在可以启用智能加载功能了。');
  } else {
    console.log('⚠️  部分语句执行失败。');
    console.log('💡 建议: 手动在 Supabase Dashboard 的 SQL Editor 中执行迁移文件');
  }
}

migrate().catch(err => {
  console.error('❌ 执行出错:', err);
  process.exit(1);
});
