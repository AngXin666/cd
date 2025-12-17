/**
 * 调试脚本：检查车辆插入时照片字段的处理
 * 模拟 insertVehicle 函数的逻辑，检查照片字段是否被正确过滤
 */

// 模拟 VehicleInput 数据（包含照片字段）
const mockVehicleInput = {
  plate_number: '粤TEST001',
  brand: '测试品牌',
  model: '测试型号',
  user_id: 'test-user-id',
  // 照片字段
  left_front_photo: 'vehicles/test_left_front.jpg',
  right_front_photo: 'vehicles/test_right_front.jpg',
  dashboard_photo: 'vehicles/test_dashboard.jpg',
  driving_license_main_photo: 'vehicles/test_license_main.jpg',
  // 其他扩展字段
  owner_name: '测试车主',
  total_mass: '2700'
}

console.log('🔍 模拟 insertVehicle 函数的字段分离逻辑\n')

// 核心字段（存储在 vehicles 表）
const coreFields = {
  plate_number: mockVehicleInput.plate_number,
  brand: mockVehicleInput.brand,
  model: mockVehicleInput.model,
  color: mockVehicleInput.color,
  vin: mockVehicleInput.vin,
  owner_id: mockVehicleInput.owner_id,
  current_driver_id: mockVehicleInput.current_driver_id,
  driver_id: mockVehicleInput.driver_id,
  user_id: mockVehicleInput.user_id,
  warehouse_id: mockVehicleInput.warehouse_id,
  vehicle_type: mockVehicleInput.vehicle_type,
  purchase_date: mockVehicleInput.purchase_date,
  status: mockVehicleInput.status,
  review_status: mockVehicleInput.review_status,
  ownership_type: mockVehicleInput.ownership_type,
  is_active: mockVehicleInput.is_active,
  notes: mockVehicleInput.notes
}

// 扩展字段（存储在 vehicle_documents 表）
const documentFields = {
  // 行驶证信息
  owner_name: mockVehicleInput.owner_name,
  use_character: mockVehicleInput.use_character,
  register_date: mockVehicleInput.register_date,
  issue_date: mockVehicleInput.issue_date,
  engine_number: mockVehicleInput.engine_number,
  archive_number: mockVehicleInput.archive_number,
  total_mass: mockVehicleInput.total_mass ? Number(mockVehicleInput.total_mass) : null,
  approved_passengers: mockVehicleInput.approved_passengers ? Number(mockVehicleInput.approved_passengers) : null,
  curb_weight: mockVehicleInput.curb_weight ? Number(mockVehicleInput.curb_weight) : null,
  approved_load: mockVehicleInput.approved_load ? Number(mockVehicleInput.approved_load) : null,
  overall_dimension_length: mockVehicleInput.overall_dimension_length ? Number(mockVehicleInput.overall_dimension_length) : null,
  overall_dimension_width: mockVehicleInput.overall_dimension_width ? Number(mockVehicleInput.overall_dimension_width) : null,
  overall_dimension_height: mockVehicleInput.overall_dimension_height ? Number(mockVehicleInput.overall_dimension_height) : null,
  inspection_valid_until: mockVehicleInput.inspection_valid_until,
  inspection_date: mockVehicleInput.inspection_date,
  mandatory_scrap_date: mockVehicleInput.mandatory_scrap_date,
  // 行驶证照片
  driving_license_main_photo: mockVehicleInput.driving_license_main_photo,
  driving_license_sub_photo: mockVehicleInput.driving_license_sub_photo,
  driving_license_back_photo: mockVehicleInput.driving_license_back_photo,
  driving_license_sub_back_photo: mockVehicleInput.driving_license_sub_back_photo,
  // 车辆照片
  left_front_photo: mockVehicleInput.left_front_photo,
  right_front_photo: mockVehicleInput.right_front_photo,
  left_rear_photo: mockVehicleInput.left_rear_photo,
  right_rear_photo: mockVehicleInput.right_rear_photo,
  dashboard_photo: mockVehicleInput.dashboard_photo,
  rear_door_photo: mockVehicleInput.rear_door_photo,
  cargo_box_photo: mockVehicleInput.cargo_box_photo,
  // 租赁信息
  lessor_name: mockVehicleInput.lessor_name,
  lessor_contact: mockVehicleInput.lessor_contact,
  lessee_name: mockVehicleInput.lessee_name,
  lessee_contact: mockVehicleInput.lessee_contact,
  monthly_rent: mockVehicleInput.monthly_rent ? Number(mockVehicleInput.monthly_rent) : null,
  lease_start_date: mockVehicleInput.lease_start_date,
  lease_end_date: mockVehicleInput.lease_end_date,
  rent_payment_day: mockVehicleInput.rent_payment_day ? Number(mockVehicleInput.rent_payment_day) : null
}

console.log('=== 1. 原始输入数据 ===')
console.log('照片字段:')
console.log(`  - left_front_photo: ${mockVehicleInput.left_front_photo || '❌ 无'}`)
console.log(`  - right_front_photo: ${mockVehicleInput.right_front_photo || '❌ 无'}`)
console.log(`  - dashboard_photo: ${mockVehicleInput.dashboard_photo || '❌ 无'}`)
console.log(`  - driving_license_main_photo: ${mockVehicleInput.driving_license_main_photo || '❌ 无'}`)

console.log('\n=== 2. documentFields 对象（过滤前） ===')
console.log('照片字段:')
console.log(`  - left_front_photo: ${documentFields.left_front_photo || '❌ 无'}`)
console.log(`  - right_front_photo: ${documentFields.right_front_photo || '❌ 无'}`)
console.log(`  - dashboard_photo: ${documentFields.dashboard_photo || '❌ 无'}`)
console.log(`  - driving_license_main_photo: ${documentFields.driving_license_main_photo || '❌ 无'}`)

// 检查是否有任何扩展字段有值
const hasDocumentFields = Object.values(documentFields).some(v => v !== undefined && v !== null)
console.log(`\n=== 3. hasDocumentFields 检查 ===`)
console.log(`hasDocumentFields = ${hasDocumentFields}`)

// 过滤掉 undefined 和 null 值
const filteredDocFields = Object.fromEntries(
  Object.entries(documentFields).filter(([_, v]) => v !== undefined && v !== null)
)

console.log('\n=== 4. filteredDocFields（过滤后） ===')
console.log('所有保留的字段:')
Object.entries(filteredDocFields).forEach(([key, value]) => {
  console.log(`  - ${key}: ${value}`)
})

console.log('\n照片字段是否被保留:')
console.log(`  - left_front_photo: ${filteredDocFields.left_front_photo ? '✅ 保留' : '❌ 被过滤掉'}`)
console.log(`  - right_front_photo: ${filteredDocFields.right_front_photo ? '✅ 保留' : '❌ 被过滤掉'}`)
console.log(`  - dashboard_photo: ${filteredDocFields.dashboard_photo ? '✅ 保留' : '❌ 被过滤掉'}`)
console.log(`  - driving_license_main_photo: ${filteredDocFields.driving_license_main_photo ? '✅ 保留' : '❌ 被过滤掉'}`)

console.log('\n=== 5. 最终要插入 vehicle_documents 的数据 ===')
const finalInsertData = {
  vehicle_id: 'test-vehicle-id',
  document_type: 'vehicle_registration',
  ...filteredDocFields
}
console.log(JSON.stringify(finalInsertData, null, 2))

console.log('\n✅ 模拟完成')
console.log('\n📋 结论:')
if (filteredDocFields.left_front_photo) {
  console.log('照片字段在代码逻辑中是正确处理的，问题可能在于:')
  console.log('1. 照片上传失败（uploadImageToStorage 返回空值）')
  console.log('2. 照片路径没有正确传递给 vehicleData')
  console.log('3. 数据库插入时发生了错误但没有被捕获')
} else {
  console.log('⚠️ 照片字段被过滤掉了！需要检查为什么照片值是 undefined 或 null')
}
