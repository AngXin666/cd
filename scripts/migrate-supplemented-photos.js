/**
 * 数据库迁移脚本 - 添加 supplemented_photos 字段
 * 使用 Supabase 的数据库直连功能执行 DDL 语句
 */

const { Pool } = require('pg');

// Supabase 数据库连接信息
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres.wxvrwkpkioalqdsfswwu:Cdgj@2025!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

// 迁移 SQL - 添加 supplemented_photos 字段
const SQL = `
-- =====================================================
-- 迁移：添加补录照片元数据字段
-- 描述：在 vehicle_documents 表中添加 supplemented_photos 字段
--       用于记录补录照片的元数据（补录时间、原始URL、补录次数等）
-- =====================================================

DO $$
BEGIN
    -- 检查字段是否已存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vehicle_documents' 
        AND column_name = 'supplemented_photos'
    ) THEN
        -- 添加 supplemented_photos 字段
        ALTER TABLE public.vehicle_documents 
        ADD COLUMN supplemented_photos JSONB DEFAULT '{}'::jsonb;
        
        -- 添加字段注释
        COMMENT ON COLUMN public.vehicle_documents.supplemented_photos IS 
            '补录照片元数据，键为 "{field}_{index}"，值包含 field(字段名)、index(索引)、supplemented_at(补录时间)、original_url(原始URL)、supplement_count(补录次数)';
        
        RAISE NOTICE '✅ supplemented_photos 字段已添加';
    ELSE
        RAISE NOTICE '⚠️ supplemented_photos 字段已存在，跳过';
    END IF;
END $$;
`;

/**
 * 执行迁移
 */
async function runMigration() {
  console.log('========================================');
  console.log('数据库迁移 - 添加 supplemented_photos 字段');
  console.log('========================================\n');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 连接数据库...');
    const client = await pool.connect();
    
    console.log('🔧 执行迁移 SQL...\n');
    await client.query(SQL);
    
    console.log('✅ 迁移执行完成！\n');
    
    // 验证字段是否已创建
    console.log('🔍 验证迁移结果...');
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'vehicle_documents' 
      AND column_name = 'supplemented_photos'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ supplemented_photos 字段已存在');
      console.log(`   类型: ${result.rows[0].data_type}`);
      console.log(`   默认值: ${result.rows[0].column_default}`);
    } else {
      console.log('❌ 字段创建失败');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n数据库密码错误，请检查 DATABASE_URL');
    }
  } finally {
    await pool.end();
  }
}

runMigration();
