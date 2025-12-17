/**
 * 通用数据库迁移执行脚本
 * 使用 PostgreSQL 直连执行 DDL 语句
 * 
 * 用法: node scripts/run-migration.js [migration-file]
 * 示例: node scripts/run-migration.js supabase/migrations/00049_add_supplemented_photos_field.sql
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// 加载环境变量
require('dotenv').config()

// Supabase 项目 ID
const PROJECT_REF = 'wxvrwkpkioalqdsfswwu'

// 数据库密码（从环境变量或直接使用）
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || 'hye15766121960'

// Supabase 数据库直连配置
// 使用直连方式（端口 5432）
const DB_CONFIG = {
  host: `db.${PROJECT_REF}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
}

/**
 * 执行 SQL 迁移
 * @param {string} sql - 要执行的 SQL 语句
 */
async function executeMigration(sql) {
  console.log('🔗 连接数据库...')
  
  const pool = new Pool(DB_CONFIG)

  try {
    const client = await pool.connect()
    console.log('✅ 数据库连接成功\n')
    
    console.log('🔧 执行迁移 SQL...')
    await client.query(sql)
    console.log('✅ 迁移执行成功！\n')
    
    client.release()
    return true
  } catch (error) {
    console.error('❌ 迁移失败:', error.message)
    return false
  } finally {
    await pool.end()
  }
}

/**
 * 验证 supplemented_photos 字段
 */
async function verifySupplementedPhotosField() {
  console.log('🔍 验证 supplemented_photos 字段...')
  
  const pool = new Pool(DB_CONFIG)

  try {
    const client = await pool.connect()
    
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'vehicle_documents' 
      AND column_name = 'supplemented_photos'
    `)
    
    if (result.rows.length > 0) {
      console.log('✅ supplemented_photos 字段已存在')
      console.log(`   类型: ${result.rows[0].data_type}`)
      console.log(`   默认值: ${result.rows[0].column_default}`)
      client.release()
      return true
    } else {
      console.log('❌ supplemented_photos 字段不存在')
      client.release()
      return false
    }
  } catch (error) {
    console.error('验证失败:', error.message)
    return false
  } finally {
    await pool.end()
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================')
  console.log('数据库迁移执行脚本')
  console.log('========================================\n')

  // 获取迁移文件路径
  const migrationFile = process.argv[2]
  
  let sql
  if (migrationFile) {
    // 从文件读取 SQL
    const filePath = path.resolve(migrationFile)
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 迁移文件不存在: ${filePath}`)
      process.exit(1)
    }
    sql = fs.readFileSync(filePath, 'utf8')
    console.log(`📄 迁移文件: ${migrationFile}\n`)
  } else {
    // 默认执行 supplemented_photos 字段迁移
    console.log('📄 执行默认迁移: 添加 supplemented_photos 字段\n')
    sql = `
      ALTER TABLE vehicle_documents
      ADD COLUMN IF NOT EXISTS supplemented_photos JSONB DEFAULT '{}'::jsonb;
      
      COMMENT ON COLUMN vehicle_documents.supplemented_photos IS 
        '补录照片元数据，键为 "{field}_{index}"，值包含 field、index、supplemented_at、original_url、supplement_count';
    `
  }

  // 执行迁移
  const success = await executeMigration(sql)
  
  if (success) {
    // 验证结果
    await verifySupplementedPhotosField()
  }
  
  console.log('\n✨ 迁移脚本执行完成')
}

main().catch(console.error)
