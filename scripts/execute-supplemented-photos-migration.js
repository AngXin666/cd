/**
 * 执行 supplemented_photos 字段迁移
 * 在 vehicle_documents 表中添加补录照片元数据字段
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// 获取 Supabase 配置
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 配置')
  console.error('   需要: VITE_SUPABASE_URL 和 VITE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// 使用 service_role key 创建客户端（有管理员权限）
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * 执行迁移 SQL
 */
async function executeMigration() {
  console.log('🔧 开始执行 supplemented_photos 字段迁移...\n')

  // 迁移 SQL
  const migrationSQL = `
    ALTER TABLE vehicle_documents
    ADD COLUMN IF NOT EXISTS supplemented_photos JSONB DEFAULT '{}'::jsonb;
  `

  try {
    // 方法 1：尝试使用 rpc 执行 SQL（如果有 exec_sql 函数）
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (!rpcError) {
      console.log('✅ 迁移成功（通过 RPC）')
      return true
    }

    // 方法 2：如果 RPC 失败，尝试直接更新一条记录来触发字段检查
    console.log('⚠️ RPC 方法不可用，尝试其他方式...')
    
    // 查询一条记录
    const { data: testData, error: selectError } = await supabase
      .from('vehicle_documents')
      .select('id, supplemented_photos')
      .limit(1)

    if (selectError) {
      // 如果查询失败且错误是字段不存在，说明需要手动添加
      if (selectError.message.includes('supplemented_photos')) {
        console.error('❌ supplemented_photos 字段不存在，需要手动添加')
        console.log('\n📋 请在 Supabase Dashboard SQL Editor 中执行以下 SQL:')
        console.log('─'.repeat(60))
        console.log(migrationSQL)
        console.log('─'.repeat(60))
        return false
      }
      throw selectError
    }

    // 如果查询成功，说明字段已存在
    console.log('✅ supplemented_photos 字段已存在')
    return true

  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message)
    console.log('\n📋 请在 Supabase Dashboard SQL Editor 中执行以下 SQL:')
    console.log('─'.repeat(60))
    console.log(migrationSQL)
    console.log('─'.repeat(60))
    return false
  }
}

/**
 * 验证迁移结果
 */
async function verifyMigration() {
  console.log('\n🔍 验证迁移结果...')

  const { data, error } = await supabase
    .from('vehicle_documents')
    .select('id, supplemented_photos')
    .limit(1)

  if (error) {
    console.error('❌ 验证失败:', error.message)
    return false
  }

  if (data && data.length > 0) {
    const hasField = 'supplemented_photos' in data[0]
    if (hasField) {
      console.log('✅ 验证通过：supplemented_photos 字段已存在')
      return true
    }
  }

  // 如果没有数据，尝试插入测试
  console.log('⚠️ 表中没有数据，无法完全验证')
  return true
}

/**
 * 主函数
 */
async function main() {
  const migrationSuccess = await executeMigration()
  
  if (migrationSuccess) {
    await verifyMigration()
  }
  
  console.log('\n✨ 迁移脚本执行完成')
}

main().catch(console.error)
