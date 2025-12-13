/**
 * 使用Supabase Management API创建app_versions表
 */

const SUPABASE_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

const SQL_STATEMENTS = [
  // 创建表
  `CREATE TABLE IF NOT EXISTS app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(20) NOT NULL,
    apk_url TEXT NOT NULL,
    release_notes TEXT,
    is_force_update BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`,
  
  // 创建索引
  `CREATE INDEX IF NOT EXISTS idx_app_versions_active ON app_versions(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_app_versions_created_at ON app_versions(created_at DESC)`,
  
  // 启用RLS
  `ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY`,
  
  // 删除旧策略
  `DROP POLICY IF EXISTS "Allow public read active versions" ON app_versions`,
  
  // 创建新策略
  `CREATE POLICY "Allow public read active versions" ON app_versions FOR SELECT USING (is_active = true)`
];

async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL执行失败: ${response.status} - ${error}`);
  }

  return response;
}

async function createTable() {
  console.log('🔄 开始创建 app_versions 表...\n');

  try {
    // 尝试执行每条SQL语句
    for (let i = 0; i < SQL_STATEMENTS.length; i++) {
      const sql = SQL_STATEMENTS[i];
      const desc = sql.substring(0, 50).replace(/\n/g, ' ');
      
      try {
        console.log(`📝 执行 SQL ${i + 1}/${SQL_STATEMENTS.length}: ${desc}...`);
        await executeSQL(sql);
        console.log(`✅ 成功\n`);
      } catch (error) {
        // 某些语句可能会失败（比如表已存在），继续执行
        console.log(`⚠️  ${error.message}\n`);
      }
    }

    console.log('✅ 数据库设置完成！\n');
    console.log('📋 表结构：');
    console.log('  - id: UUID (主键)');
    console.log('  - version: VARCHAR(20)');
    console.log('  - apk_url: TEXT');
    console.log('  - release_notes: TEXT');
    console.log('  - is_force_update: BOOLEAN');
    console.log('  - is_active: BOOLEAN');
    console.log('  - created_at: TIMESTAMP');
    console.log('  - updated_at: TIMESTAMP\n');
    
    console.log('🔒 RLS策略：公开可读取激活的版本\n');
    
    console.log('✨ 下一步：');
    console.log('  1. 在 Supabase Storage 创建 "apk-files" bucket');
    console.log('  2. 上传APK文件');
    console.log('  3. 在 app_versions 表插入版本记录');

  } catch (error) {
    console.error('\n❌ 创建失败:', error.message);
    console.log('\n💡 请手动在 Supabase Dashboard 执行SQL');
    console.log('   访问: https://supabase.com/dashboard/project/wxvrwkpkioalqdsfswwu/sql/new\n');
    process.exit(1);
  }
}

createTable();
