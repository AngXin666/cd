const https = require('https');
const fs = require('fs');
const path = require('path');

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

async function checkSchema() {
  return new Promise((resolve, reject) => {
    const url = new URL(supabaseUrl + '/rest/v1/');
    
    const options = {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Accept': 'application/json'
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const schema = JSON.parse(data);
          const tables = Object.keys(schema.definitions || {});
          
          console.log('\n=== Supabase数据库表列表 ===\n');
          console.log(`总共 ${tables.length} 个表:\n`);
          tables.sort().forEach(table => {
            console.log(`  - ${table}`);
          });
          
          console.log('\n=== 关键表检查 ===\n');
          const keyTables = ['users', 'user_roles', 'warehouses', 'attendance', 'vehicles'];
          keyTables.forEach(table => {
            const exists = tables.includes(table);
            console.log(`  ${exists ? '✅' : '❌'} ${table}`);
          });
          
          if (!tables.includes('users')) {
            console.log('\n⚠️  警告：users表不存在！');
            console.log('这就是登录失败的根本原因。\n');
            console.log('解决方案：');
            console.log('1. 登录 Supabase 后台');
            console.log('2. 进入 SQL Editor');
            console.log('3. 执行创建users表的migration');
            console.log('   文件：supabase/migrations/00468_step1_create_new_tables.sql\n');
          }
          
          resolve(tables);
        } catch (err) {
          reject(err);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

checkSchema().catch(err => {
  console.error('❌ 检查失败:', err);
  process.exit(1);
});
