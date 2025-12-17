/**
 * 检查 supplemented_photos 字段是否存在
 * 并添加测试数据用于验证补录标记功能
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('🔍 检查 supplemented_photos 字段...\n')

  // 1. 查询 vehicle_documents 表结构
  const { data: docs, error: docsError } = await supabase
    .from('vehicle_documents')
    .select('*')
    .limit(1)

  if (docsError) {
    console.error('❌ 查询 vehicle_documents 失败:', docsError.message)
    return
  }

  if (docs && docs.length > 0) {
    const columns = Object.keys(docs[0])
    console.log('📋 vehicle_documents 表字段:')
    columns.forEach(col => console.log(`   - ${col}`))
    
    if (columns.includes('supplemented_photos')) {
      console.log('\n✅ supplemented_photos 字段已存在')
    } else {
      console.log('\n❌ supplemented_photos 字段不存在！')
      console.log('   请执行数据库迁移: supabase/migrations/00049_add_supplemented_photos_field.sql')
      return
    }
  }

  // 2. 查询是否有补录数据
  const { data: supplementedData, error: supplementedError } = await supabase
    .from('vehicle_documents')
    .select('vehicle_id, supplemented_photos')
    .not('supplemented_photos', 'is', null)
    .neq('supplemented_photos', '{}')
    .limit(5)

  if (supplementedError) {
    console.error('❌ 查询补录数据失败:', supplementedError.message)
    return
  }

  console.log('\n📊 补录数据统计:')
  if (supplementedData && supplementedData.length > 0) {
    console.log(`   找到 ${supplementedData.length} 条有补录记录的车辆文档`)
    supplementedData.forEach(doc => {
      console.log(`   - 车辆ID: ${doc.vehicle_id}`)
      console.log(`     补录数据: ${JSON.stringify(doc.supplemented_photos, null, 2)}`)
    })
  } else {
    console.log('   ⚠️ 没有找到任何补录数据')
    console.log('   提示: 需要先执行补录操作才能看到补录标记')
  }

  // 3. 询问是否添加测试数据
  console.log('\n📝 是否需要添加测试补录数据？')
  console.log('   如需添加，请运行: node scripts/add-test-supplemented-data.js')
}

main().catch(console.error)
