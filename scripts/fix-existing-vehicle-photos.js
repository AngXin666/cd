/**
 * 修复现有车辆的照片数组字段
 * 从单张照片字段生成 pickup_photos 和 registration_photos 数组
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

async function fixExistingVehiclePhotos() {
  console.log('🔧 修复现有车辆的照片数组字段...\n')

  // 1. 查询所有 vehicle_documents
  const { data: documents, error: docsError } = await supabase
    .from('vehicle_documents')
    .select('*')

  if (docsError) {
    console.error('❌ 查询 vehicle_documents 失败:', docsError.message)
    return
  }

  console.log(`📄 找到 ${documents?.length || 0} 条 vehicle_documents 记录\n`)

  if (!documents || documents.length === 0) {
    console.log('⚠️ 没有需要修复的数据')
    return
  }

  // 2. 遍历每条记录，生成照片数组
  for (const doc of documents) {
    console.log(`\n🔧 处理 vehicle_documents ID: ${doc.id}`)
    console.log(`   vehicle_id: ${doc.vehicle_id}`)

    // 生成 pickup_photos 数组（车辆照片）
    const pickupPhotos = [
      doc.left_front_photo,
      doc.right_front_photo,
      doc.left_rear_photo,
      doc.right_rear_photo,
      doc.dashboard_photo,
      doc.rear_door_photo,
      doc.cargo_box_photo,
    ].filter(Boolean)

    // 生成 registration_photos 数组（行驶证照片）
    const registrationPhotos = [
      doc.driving_license_main_photo,
      doc.driving_license_sub_photo,
      doc.driving_license_back_photo,
      doc.driving_license_sub_back_photo,
    ].filter(Boolean)

    console.log(`   pickup_photos: ${pickupPhotos.length} 张`)
    console.log(`   registration_photos: ${registrationPhotos.length} 张`)

    // 检查是否需要更新
    const needsUpdate = 
      (pickupPhotos.length > 0 && (!doc.pickup_photos || doc.pickup_photos.length === 0)) ||
      (registrationPhotos.length > 0 && (!doc.registration_photos || doc.registration_photos.length === 0))

    if (!needsUpdate) {
      console.log('   ✅ 已有照片数组，跳过')
      continue
    }

    // 3. 更新记录
    const updateData = {}
    
    if (pickupPhotos.length > 0 && (!doc.pickup_photos || doc.pickup_photos.length === 0)) {
      updateData.pickup_photos = pickupPhotos
    }
    
    if (registrationPhotos.length > 0 && (!doc.registration_photos || doc.registration_photos.length === 0)) {
      updateData.registration_photos = registrationPhotos
    }

    // 如果没有 pickup_time，设置为当前时间
    if (!doc.pickup_time && pickupPhotos.length > 0) {
      updateData.pickup_time = new Date().toISOString()
    }

    if (Object.keys(updateData).length === 0) {
      console.log('   ⚠️ 没有需要更新的字段')
      continue
    }

    console.log('   📝 更新字段:', Object.keys(updateData).join(', '))

    const { error: updateError } = await supabase
      .from('vehicle_documents')
      .update(updateData)
      .eq('id', doc.id)

    if (updateError) {
      console.error('   ❌ 更新失败:', updateError.message)
    } else {
      console.log('   ✅ 更新成功')
    }
  }

  console.log('\n✅ 修复完成')
}

fixExistingVehiclePhotos().catch(console.error)
