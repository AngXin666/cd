/**
 * 自动创建 app_versions 表的脚本
 * 使用 Service Role Key 直接执行SQL
 */

const SUPABASE_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24';

const SQL = `
-- 创建应用版本管理表
CREATE TABLE IF NOT EXISTS app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL,
  apk_url TEXT NOT NULL,
  release_notes TEXT,
  is_force_update BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_app_versions_active ON app_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_app_versions_created_at ON app_versions(created_at DESC);

-- 启用RLS
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）
DROP POLICY IF EXISTS "Allow public read active versions" ON app_versions;

-- 创建新策略
CREATE POLICY "Allow public read active versions"
ON app_versions FOR SELECT
USING (is_active = true);
`;

async function createTable() {
  console.log('🔄 开始创建 app_versions 表...');
  console.log('📍 Supabase URL:', SUPABASE_URL);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        query: SQL
      })
    });

    if (!response.ok) {
      // 如果 exec_sql 不存在，尝试直接通过 PostgREST 执行
      console.log('⚠️  exec_sql 函数不可用，尝试备用方案...');
      
      // 备用方案：使用 Supabase Management API
      const mgmtResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          query: SQL
        })
      });

      if (!mgmtResponse.ok) {
        const errorText = await mgmtResponse.text();
        throw new Error(`HTTP ${mgmtResponse.status}: ${errorText}`);
      }
    }

    console.log('✅ app_versions 表创建成功！');
    console.log('');
    console.log('📋 表结构：');
    console.log('  - id: UUID (主键)');
    console.log('  - version: VARCHAR(20) (版本号，如 "1.0.0")');
    console.log('  - apk_url: TEXT (APK下载链接)');
    console.log('  - release_notes: TEXT (更新说明)');
    console.log('  - is_force_update: BOOLEAN (是否强制更新)');
    console.log('  - is_active: BOOLEAN (是否激活)');
    console.log('  - created_at: TIMESTAMP');
    console.log('  - updated_at: TIMESTAMP');
    console.log('');
    console.log('🔒 RLS策略已启用：公开可读取激活的版本');
    console.log('');
    console.log('✨ 下一步：');
    console.log('  1. 在 Supabase Storage 中创建 "apk-files" bucket');
    console.log('  2. 上传APK文件到bucket');
    console.log('  3. 在 app_versions 表中插入版本记录');

  } catch (error) {
    console.error('❌ 创建表失败:', error);
    console.log('');
    console.log('💡 请手动在 Supabase Dashboard 中执行以下SQL：');
    console.log('');
    console.log(SQL);
    process.exit(1);
  }
}

createTable();
