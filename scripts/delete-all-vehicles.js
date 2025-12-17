/**
 * 删除数据库中所有车辆记录
 * 用于测试前清理数据
 * 
 * 使用方法：node scripts/delete-all-vehicles.js
 * 
 * 警告：此脚本会删除所有车辆数据，请谨慎使用！
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase 配置（使用 service_role 密钥绕过 RLS）
const SUPABASE_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function deleteAllVehicles() {
  console.log('\n🚗 开始删除所有车辆数据...\n')

  // 1. 先查询所有车辆
  const { data: vehicles, error: queryError } = await supabase
    .from('vehicles')
    .select('id, plate_number, brand, model, created_at')

  if (queryError) {
    console.error('❌ 查询车辆失败:', queryError.message)
    return false
  }

  if (!vehicles || vehicles.length === 0) {
    console.log('ℹ️ 数据库中没有车辆记录')
    return true
  }

  console.log(`📋 找到 ${vehicles.length} 条车辆记录:\n`)
  vehicles.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.plate_number} - ${v.brand || '未知'} ${v.model || ''} (创建于: ${v.created_at})`)
  })

  // 2. 删除所有 vehicle_documents 记录
  console.log('\n🗑️ 正在删除所有车辆文档...')
  const { error: docError } = await supabase
    .from('vehicle_documents')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // 删除所有记录的技巧

  if (docError) {
    console.error('  ⚠️ 删除文档失败:', docError.message)
  } else {
    console.log('  ✅ 所有车辆文档已删除')
  }

  // 3. 删除所有 driver_licenses 记录
  console.log('\n🗑️ 正在删除所有驾驶证记录...')
  const { error: licenseError } = await supabase
    .from('driver_licenses')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (licenseError) {
    console.error('  ⚠️ 删除驾驶证失败:', licenseError.message)
  } else {
    console.log('  ✅ 所有驾驶证记录已删除')
  }

  // 4. 删除所有车辆记录
  console.log('\n🗑️ 正在删除所有车辆记录...')
  const { error: deleteError } = await supabase
    .from('vehicles')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (deleteError) {
    console.error('❌ 删除车辆失败:', deleteError.message)
    return false
  }

  console.log('  ✅ 所有车辆记录已删除')

  // 5. 验证删除结果
  const { data: remaining, error: checkError } = await supabase
    .from('vehicles')
    .select('id')

  if (checkError) {
    console.error('\n⚠️ 验证失败:', checkError.message)
  } else {
    console.log(`\n✅ 删除完成！当前车辆数量: ${remaining?.length || 0}`)
  }

  return true
}

// 执行删除
deleteAllVehicles()
  .then((success) => {
    console.log('\n' + (success ? '🎉 操作成功完成' : '❌ 操作失败'))
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('❌ 执行出错:', error)
    process.exit(1)
  })
