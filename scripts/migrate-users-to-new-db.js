const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 读取.env配置
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
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

// 使用service_role key连接，可以绕过RLS
const supabase = createClient(supabaseUrl, serviceKey);

async function checkAndMigrateUsers() {
  console.log('🔍 检查新数据库中的用户...\n');
  
  try {
    // 1. 查询新数据库中的users表
    const { data: users, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) {
      console.error('❌ 查询users表失败:', error.message);
      return;
    }
    
    console.log(`✅ 找到 ${users?.length || 0} 个用户:\n`);
    
    if (users && users.length > 0) {
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.role})`);
        console.log(`    ID: ${user.id}`);
        console.log(`    手机: ${user.phone || '无'}`);
        console.log(`    邮箱: ${user.email || '无'}`);
        console.log('');
      });
    } else {
      console.log('  📭 数据库中暂无用户\n');
      console.log('需要创建用户：');
      console.log('1. 去 Authentication -> Users 创建认证用户');
      console.log('2. 复制 UID');
      console.log('3. 执行SQL插入users表\n');
    }
    
    // 2. 查询auth.users
    console.log('🔍 检查认证系统中的用户...\n');
    
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('⚠️  无法查询认证用户（需要service_role权限）\n');
    } else {
      console.log(`✅ 认证系统中有 ${authData.users?.length || 0} 个用户:\n`);
      
      if (authData.users && authData.users.length > 0) {
        for (const authUser of authData.users) {
          const existsInUsers = users?.find(u => u.id === authUser.id);
          console.log(`  - ${authUser.email || authUser.phone || authUser.id}`);
          console.log(`    UID: ${authUser.id}`);
          console.log(`    状态: ${existsInUsers ? '✅ 已关联users表' : '❌ 未关联users表'}`);
          console.log('');
          
          // 如果认证用户存在但users表没有，提示创建
          if (!existsInUsers) {
            console.log(`    💡 需要执行SQL:`);
            console.log(`    INSERT INTO users (id, name, phone, role)`);
            console.log(`    VALUES ('${authUser.id}', '用户名', '手机号', 'BOSS');\n`);
          }
        }
      }
    }
    
  } catch (err) {
    console.error('❌ 检查失败:', err);
  }
}

checkAndMigrateUsers();
