/**
 * 根据车牌号删除车辆记录
 * 用于测试时清理重复的车辆数据
 * 
 * 使用方法：node scripts/delete-vehicle-by-plate.js 粤ADK5007
 */

const {createClient} = require('@supabase/supabase-js')

// 从命令行参数获取车牌号
const plateNumber = process.argv[2]

if (!plateNumber) {
  console.error('❌ 请提供车牌号参数')
  console.log('使用方法: node scripts/delete-vehicle-by-plate.js <车牌号>')
  console.log('示例: node scripts/delete-vehicle-by-plate.js 粤ADK5007')
  process.exit(1)
}

// Supabase 配置（使用 service_role 密钥绕过 RLS）
const SUPABASE_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function deleteVehicleByPlate(plate) {
  console.log(`\n🔍 正在查找车牌号为 "${plate}" 的车辆...`)

  // 1. 先查询车辆信息
  const {data: vehicles, error: queryError} = await supabase
    .from('vehicles')
    .select('id, plate_number, brand, model, user_id, created_at')
    .eq('plate_number', plate)

  if (queryError) {
    console.error('❌ 查询车辆失败:', queryError.message)
    return false
  }

  if (!vehicles || vehicles.length === 0) {
    console.log(`⚠️ 未找到车牌号为 "${plate}" 的车辆`)
    return false
  }

  console.log(`\n📋 找到 ${vehicles.length} 条记录:`)
  vehicles.forEach((v, i) => {
    console.log(`  ${i + 1}. ID: ${v.id}`)
    console.log(`     车牌: ${v.plate_number}`)
    console.log(`     品牌型号: ${v.brand || '未知'} ${v.model || ''}`)
    console.log(`     创建时间: ${v.created_at}`)
    console.log('')
  })

  // 2. 删除关联的 vehicle_documents 记录
  for (const vehicle of vehicles) {
    console.log(`🗑️ 正在删除车辆 ${vehicle.id} 的关联文档...`)
    const {error: docError} = await supabase
      .from('vehicle_documents')
      .delete()
      .eq('vehicle_id', vehicle.id)

    if (docError) {
      console.error(`  ⚠️ 删除文档失败: ${docError.message}`)
    } else {
      console.log(`  ✅ 关联文档已删除`)
    }
  }

  // 3. 删除车辆记录
  console.log(`\n🗑️ 正在删除车辆记录...`)
  const {error: deleteError, count} = await supabase
    .from('vehicles')
    .delete()
    .eq('plate_number', plate)

  if (deleteError) {
    console.error('❌ 删除车辆失败:', deleteError.message)
    return false
  }

  console.log(`\n✅ 成功删除车牌号为 "${plate}" 的车辆记录`)
  return true
}

// 执行删除
deleteVehicleByPlate(plateNumber)
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('❌ 执行出错:', error)
    process.exit(1)
  })
