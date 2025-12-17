/**
 * 数据库迁移脚本 - 添加 supplemented_photos 字段
 * 使用 Supabase service_role key 执行 DDL 语句
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase 配置
const SUPABASE_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24'

// 使用 service_role key 创建客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/**
 * 执行迁移
 */
async function runMigration() {
  console.log('========================================')
  console.log('数据库迁移 - 添加 supplemented_photos 字段')
  console.log('========================================\n')

  // 迁移 SQL
  const migrationSQL = `
    ALTER TABLE vehicle_documents
    ADD COLUMN IF NOT EXISTS supplemented_photos JSONB DEFAULT '{}'::jsonb;
    
    COMMENT ON COLUMN vehicle_documents.supplemented_photos IS 
      '补录照片元数据，键为 "{field}_{index}"，值包含 field、index、supplemented_at、original_url、supplement_count';
  `

  try {
    // 尝试使用 rpc 执行 SQL
    console.log('🔧 尝试通过 RPC 执行迁移...')
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (!rpcError) {
      console.log('✅ 迁移成功（通过 RPC）')
      await verifyMigration()
      return
    }
    
    console.log('⚠️ RPC 方法不可用:', rpcError.message)
    console.log('\n🔧 尝试通过 REST API 直接操作...')
    
    // 方法 2：尝试直接查询来验证字段是否存在
    const { data, error: selectError } = await supabase
      .from('vehicle_documents')
      .select('supplemented_photos')
      .limit(1)
    
    if (!selectError) {
      console.log('✅ supplemented_photos 字段已存在！')
      return
    }
    
    // 如果字段不存在，需要通过 SQL Editor 添加
    if (selectError.message.includes('supplemented_photos') || selectError.code === '42703') {
      console.log('❌ supplemented_photos 字段不存在')
      console.log('\n📋 请在 Supabase Dashboard SQL Editor 中执行以下 SQL:')
      console.log('─'.repeat(60))
      console.log(migrationSQL)
      console.log('─'.repeat(60))
      
      // 尝试使用 Supabase Management API
      console.log('\n🔧 尝试通过 Management API 执行...')
      await executeViaDatabaseAPI(migrationSQL)
    } else {
      console.log('查询错误:', selectError)
    }
    
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message)
  }
}

/**
 * 通过 Supabase Database API 执行 SQL
 */
async function executeViaDatabaseAPI(sql) {
  const fetch = require('node-fetch') || globalThis.fetch
  
  try {
    // 使用 Supabase REST API 的 /rest/v1/rpc 端点
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql })
    })
    
    if (response.ok) {
      console.log('✅ 通过 REST API 执行成功')
      await verifyMigration()
    } else {
      const errorText = await response.text()
      console.log('REST API 响应:', response.status, errorText)
    }
  } catch (error) {
    console.log('REST API 调用失败:', error.message)
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
    if (error.message.includes('supplemented_photos') || error.code === '42703') {
      console.log('❌ 字段仍不存在')
    } else {
      console.log('查询错误:', error.message)
    }
    return false
  }
  
  console.log('✅ 验证通过：supplemented_photos 字段已存在')
  if (data && data.length > 0) {
    console.log('   当前值:', JSON.stringify(data[0].supplemented_photos))
  }
  return true
}

runMigration()
