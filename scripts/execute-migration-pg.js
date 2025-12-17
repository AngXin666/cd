/**
 * 数据库迁移执行脚本 - PostgreSQL 直连版本
 * 尝试多种连接方式执行 DDL
 * 
 * @description 添加 supplemented_photos 字段到 vehicle_documents 表
 */

const { Pool } = require('pg')
require('dotenv').config()

// Supabase 项目信息
const PROJECT_REF = 'wxvrwkpkioalqdsfswwu'

// 多种连接配置尝试
const CONNECTION_CONFIGS = [
  {
    name: 'Session Pooler (端口 5432)',
    config: {
      host: 'aws-0-ap-southeast-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: process.env.SUPABASE_DB_PASSWORD || 'Cdgj@2025!',
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Transaction Pooler (端口 6543)',
    config: {
      host: 'aws-0-ap-southeast-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: process.env.SUPABASE_DB_PASSWORD || 'Cdgj@2025!',
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: '直连数据库 (端口 5432)',
    config: {
      host: `db.${PROJECT_REF}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: process.env.SUPABASE_DB_PASSWORD || 'Cdgj@2025!',
      ssl: { rejectUnauthorized: false }
    }
  }
]

// 迁移 SQL
const MIGRATION_SQL = `
  ALTER TABLE vehicle_documents
  ADD COLUMN IF NOT EXISTS supplemented_photos JSONB DEFAULT '{}'::jsonb;
`

// 验证 SQL
const VERIFY_SQL = `
  SELECT column_name, data_type, column_default
  FROM information_schema.columns 
  WHERE table_schema = 'public'
  AND table_name = 'vehicle_documents' 
  AND column_name = 'supplemented_photos'
`

/**
 * 尝试使用指定配置执行迁移
 * @param {object} connConfig - 连接配置
 * @returns {Promise<boolean>} 是否成功
 */
async function tryMigration(connConfig) {
  console.log(`\n🔗 尝试连接: ${connConfig.name}`)
  console.log(`   Host: ${connConfig.config.host}:${connConfig.config.port}`)
  console.log(`   User: ${connConfig.config.user}`)
  
  const pool = new Pool(connConfig.config)
  
  try {
    const client = await pool.connect()
    console.log('   ✅ 连接成功！')
    
    // 执行迁移
    console.log('   🔧 执行迁移...')
    await client.query(MIGRATION_SQL)
    console.log('   ✅ 迁移执行成功！')
    
    // 验证
    console.log('   🔍 验证字段...')
    const result = await client.query(VERIFY_SQL)
    
    if (result.rows.length > 0) {
      console.log('   ✅ 字段已创建:')
      console.log(`      类型: ${result.rows[0].data_type}`)
      console.log(`      默认值: ${result.rows[0].column_default}`)
    }
    
    client.release()
    await pool.end()
    return true
  } catch (error) {
    console.log(`   ❌ 失败: ${error.message}`)
    await pool.end()
    return false
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================')
  console.log('数据库迁移执行脚本 - PostgreSQL 直连')
  console.log('========================================')
  console.log('\n📋 目标: 添加 supplemented_photos 字段')
  console.log('📋 表: vehicle_documents')

  // 尝试所有连接配置
  for (const connConfig of CONNECTION_CONFIGS) {
    const success = await tryMigration(connConfig)
    if (success) {
      console.log('\n✨ 迁移完成！')
      return
    }
  }

  // 所有尝试都失败
  console.log('\n❌ 所有连接方式都失败了')
  console.log('\n📝 请手动在 Supabase Dashboard SQL Editor 中执行以下 SQL:')
  console.log('────────────────────────────────────────────────────────────')
  console.log(MIGRATION_SQL)
  console.log('────────────────────────────────────────────────────────────')
  console.log('\n🔗 Dashboard URL: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql')
}

main().catch(console.error)
