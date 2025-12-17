/**
 * 调试脚本：检查车辆照片数据
 * 用于诊断车辆列表不显示照片的问题
 */

require('dotenv').config()
const {createClient} = require('@supabase/supabase-js')

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
const supabaseKey = process.env.TARO_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugVehiclePhotos() {
  console.log('🔍 开始调试车辆照片数据...\n')

  // 1. 查询所有车辆（vehicles 表没有 left_front_photo 字段）
  console.log('=== 1. 查询 vehicles 表 ===')
  const {data: vehicles, error: vehiclesError} = await supabase
    .from('vehicles')
    .select('id, plate_number, user_id, driver_id, created_at')
    .order('created_at', {ascending: false})
    .limit(5)

  if (vehiclesError) {
    console.error('❌ 查询 vehicles 失败:', vehiclesError)
    return
  }

  console.log(`找到 ${vehicles.length} 辆车:`)
  vehicles.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.plate_number}`)
    console.log(`     - ID: ${v.id}`)
    console.log(`     - user_id: ${v.user_id}`)
    console.log(`     - driver_id: ${v.driver_id}`)
  })

  // 2. 查询 vehicle_documents 表
  console.log('\n=== 2. 查询 vehicle_documents 表 ===')
  const vehicleIds = vehicles.map(v => v.id)
  const {data: documents, error: documentsError} = await supabase
    .from('vehicle_documents')
    .select('id, vehicle_id, document_type, left_front_photo, right_front_photo, dashboard_photo, created_at')
    .in('vehicle_id', vehicleIds)

  if (documentsError) {
    console.error('❌ 查询 vehicle_documents 失败:', documentsError)
    return
  }

  console.log(`找到 ${documents.length} 条文档记录:`)
  if (documents.length === 0) {
    console.log('  ⚠️ 没有找到任何 vehicle_documents 记录！')
    console.log('  这可能是问题所在：照片数据没有保存到 vehicle_documents 表')
  } else {
    documents.forEach((d, i) => {
      const vehicle = vehicles.find(v => v.id === d.vehicle_id)
      console.log(`  ${i + 1}. 车辆: ${vehicle?.plate_number || d.vehicle_id}`)
      console.log(`     - document_id: ${d.id}`)
      console.log(`     - document_type: ${d.document_type}`)
      console.log(`     - left_front_photo: ${d.left_front_photo ? d.left_front_photo.substring(0, 80) + '...' : '❌ 无'}`)
      console.log(`     - right_front_photo: ${d.right_front_photo ? '✅ 有' : '❌ 无'}`)
      console.log(`     - dashboard_photo: ${d.dashboard_photo ? '✅ 有' : '❌ 无'}`)
    })
  }

  // 3. 测试关联查询
  console.log('\n=== 3. 测试关联查询（模拟 getDriverVehicles） ===')
  const {data: joinedData, error: joinError} = await supabase
    .from('vehicles')
    .select(`
      id,
      plate_number,
      document:vehicle_documents(
        left_front_photo,
        right_front_photo,
        dashboard_photo
      )
    `)
    .in('id', vehicleIds)

  if (joinError) {
    console.error('❌ 关联查询失败:', joinError)
    return
  }

  console.log('关联查询结果:')
  joinedData.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.plate_number}`)
    console.log(`     - document 类型: ${typeof v.document}`)
    console.log(`     - document 是数组: ${Array.isArray(v.document)}`)
    console.log(`     - document 原始值: ${JSON.stringify(v.document)}`)
    if (Array.isArray(v.document)) {
      console.log(`     - document 长度: ${v.document.length}`)
      if (v.document.length > 0) {
        console.log(`     - document[0].left_front_photo: ${v.document[0]?.left_front_photo || '❌ 无'}`)
      }
    } else if (v.document) {
      console.log(`     - document.left_front_photo: ${v.document.left_front_photo || '❌ 无'}`)
    } else {
      console.log(`     - document: null/undefined`)
    }
  })

  // 4. 检查 vehicle_documents 表结构
  console.log('\n=== 4. 检查 vehicle_documents 表中所有记录 ===')
  const {data: allDocs, error: allDocsError} = await supabase
    .from('vehicle_documents')
    .select('*')
    .limit(5)

  if (allDocsError) {
    console.error('❌ 查询所有文档失败:', allDocsError)
  } else {
    console.log(`vehicle_documents 表共有记录数: ${allDocs.length}`)
    if (allDocs.length > 0) {
      console.log('第一条记录的字段:')
      const firstDoc = allDocs[0]
      Object.keys(firstDoc).forEach(key => {
        const value = firstDoc[key]
        const displayValue = value ? (typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value) : '❌ null'
        console.log(`  - ${key}: ${displayValue}`)
      })
    }
  }

  console.log('\n✅ 调试完成')
}

debugVehiclePhotos().catch(console.error)
