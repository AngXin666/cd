/**
 * 检查车辆照片数据脚本
 * 用于诊断 vehicle_documents 表中是否有照片数据
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkVehiclePhotosData() {
  console.log('🔍 检查车辆照片数据...\n')

  // 1. 查询所有车辆
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('id, plate_number, user_id, status, created_at')
    .order('created_at', { ascending: false })

  if (vehiclesError) {
    console.error('❌ 查询车辆失败:', vehiclesError.message)
    return
  }

  console.log(`📋 共找到 ${vehicles?.length || 0} 辆车辆\n`)

  if (!vehicles || vehicles.length === 0) {
    console.log('⚠️ 没有车辆数据')
    return
  }

  // 2. 查询所有 vehicle_documents
  const { data: documents, error: docsError } = await supabase
    .from('vehicle_documents')
    .select('*')

  if (docsError) {
    console.error('❌ 查询 vehicle_documents 失败:', docsError.message)
    return
  }

  console.log(`📄 vehicle_documents 表共有 ${documents?.length || 0} 条记录\n`)

  // 3. 检查每辆车的照片数据
  for (const vehicle of vehicles) {
    console.log(`\n🚗 车辆: ${vehicle.plate_number} (ID: ${vehicle.id})`)
    console.log(`   状态: ${vehicle.status}`)
    console.log(`   创建时间: ${vehicle.created_at}`)

    // 查找对应的 document
    const doc = documents?.find(d => d.vehicle_id === vehicle.id)

    if (!doc) {
      console.log('   ⚠️ 没有关联的 vehicle_documents 记录')
      continue
    }

    console.log(`   ✅ 找到 vehicle_documents 记录 (ID: ${doc.id})`)

    // 检查各类照片字段
    const photoFields = [
      { name: '左前照片', field: 'left_front_photo' },
      { name: '右前照片', field: 'right_front_photo' },
      { name: '左后照片', field: 'left_rear_photo' },
      { name: '右后照片', field: 'right_rear_photo' },
      { name: '仪表盘照片', field: 'dashboard_photo' },
      { name: '后门照片', field: 'rear_door_photo' },
      { name: '货箱照片', field: 'cargo_box_photo' },
      { name: '行驶证主页', field: 'driving_license_main_photo' },
      { name: '行驶证副页', field: 'driving_license_sub_photo' },
      { name: '行驶证背面', field: 'driving_license_back_photo' },
      { name: '行驶证副页背面', field: 'driving_license_sub_back_photo' },
      { name: '提车照片', field: 'pickup_photos' },
      { name: '还车照片', field: 'return_photos' },
      { name: '行驶证照片数组', field: 'registration_photos' },
      { name: '车损照片', field: 'damage_photos' },
    ]

    let hasAnyPhoto = false
    for (const { name, field } of photoFields) {
      const value = doc[field]
      if (value) {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            console.log(`   📷 ${name}: ${value.length} 张`)
            hasAnyPhoto = true
          }
        } else {
          console.log(`   📷 ${name}: ✓`)
          hasAnyPhoto = true
        }
      }
    }

    if (!hasAnyPhoto) {
      console.log('   ⚠️ 该车辆没有任何照片数据')
    }
  }

  // 4. 检查 Storage 中的文件
  console.log('\n\n📦 检查 Storage (h5-app bucket)...')
  const { data: storageFiles, error: storageError } = await supabase
    .storage
    .from('h5-app')
    .list('', { limit: 100 })

  if (storageError) {
    console.error('❌ 查询 Storage 失败:', storageError.message)
  } else {
    console.log(`   Storage 根目录有 ${storageFiles?.length || 0} 个文件/文件夹`)
    if (storageFiles && storageFiles.length > 0) {
      for (const item of storageFiles.slice(0, 10)) {
        console.log(`   - ${item.name} (${item.metadata?.size || 'folder'})`)
      }
      if (storageFiles.length > 10) {
        console.log(`   ... 还有 ${storageFiles.length - 10} 个`)
      }
    }
  }

  console.log('\n✅ 检查完成')
}

checkVehiclePhotosData().catch(console.error)
