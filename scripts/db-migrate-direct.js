/**
 * 数据库迁移脚本 - 直接连接 PostgreSQL
 * 使用 Supabase 的数据库直连功能执行 DDL 语句
 */

const { Pool } = require('pg');

// Supabase 数据库连接信息
// 格式: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres.wxvrwkpkioalqdsfswwu:Cdgj@2025!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const SQL = `
-- 添加 manager_permissions_enabled 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'manager_permissions_enabled'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN manager_permissions_enabled BOOLEAN DEFAULT true;
        
        RAISE NOTICE 'Column manager_permissions_enabled added';
    ELSE
        RAISE NOTICE 'Column already exists';
    END IF;
END $$;

-- 更新现有管理员的默认值
UPDATE public.users 
SET manager_permissions_enabled = true 
WHERE role IN ('MANAGER', 'PEER_ADMIN') 
AND manager_permissions_enabled IS NULL;

-- 创建 RPC 函数
CREATE OR REPLACE FUNCTION update_manager_permission(
    p_user_id UUID,
    p_enabled BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.users
    SET 
        manager_permissions_enabled = p_enabled,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION update_manager_permission(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION update_manager_permission(UUID, BOOLEAN) TO service_role;
`;

async function runMigration() {
  console.log('========================================');
  console.log('数据库迁移 - 直接连接');
  console.log('========================================\n');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('连接数据库...');
    const client = await pool.connect();
    
    console.log('执行迁移 SQL...\n');
    await client.query(SQL);
    
    console.log('✅ 迁移成功！\n');
    
    // 验证
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'manager_permissions_enabled'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ 字段已创建');
    } else {
      console.log('⚠️ 字段创建可能失败');
    }
    
    client.release();
  } catch (error) {
    console.error('迁移失败:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n数据库密码错误，请设置正确的 DATABASE_URL 环境变量');
      console.log('格式: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
    }
  } finally {
    await pool.end();
  }
}

runMigration();
