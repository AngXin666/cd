/**
 * 车辆数据库字段修复脚本
 * 
 * 功能说明：
 * 1. 检查 vehicle_documents 表结构是否正确
 * 2. 检查 driver_licenses 表字段是否完整
 * 3. 提供手动执行迁移 SQL 的指导
 * 4. 验证迁移执行结果
 * 
 * 执行的迁移文件：
 * - 00634_fix_vehicle_documents_structure.sql
 * - 00635_fix_driver_licenses_fields.sql
 * 
 * @module scripts/fix-vehicle-database-fields
 * Requirements: 4.4
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

// ============================================
// Supabase 配置
// ============================================

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
const supabaseAnonKey = process.env.TARO_APP_SUPABASE_ANON_KEY

// 验证环境变量
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少环境变量 TARO_APP_SUPABASE_URL 或 TARO_APP_SUPABASE_ANON_KEY')
  console.error('请确保 .env 文件中配置了正确的 Supabase 连接信息')
  process.exit(1)
}

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// vehicle_documents 表字段定义
// ============================================

/**
 * vehicle_documents 表需要检查的扩展字段列表
 * 这些字段在 00634 迁移中添加
 */
const VEHICLE_DOCUMENTS_FIELDS = [
  // 行驶证信息字段（20列）
  'owner_name',
  'use_character',
  'register_date',
  'issue_date',
  'engine_number',
  'archive_number',
  'total_mass',
  'approved_passengers',
  'curb_weight',
  'approved_load',
  'overall_dimension_length',
  'overall_dimension_width',
  'overall_dimension_height',
  'inspection_valid_until',
  'inspection_date',
  'mandatory_scrap_date',
  'driving_license_main_photo',
  'driving_license_sub_photo',
  'driving_license_back_photo',
  'driving_license_sub_back_photo',
  // 车辆照片字段（7列）
  'left_front_photo',
  'right_front_photo',
  'left_rear_photo',
  'right_rear_photo',
  'dashboard_photo',
  'rear_door_photo',
  'cargo_box_photo',
  // 租赁信息字段（8列）
  'lessor_name',
  'lessor_contact',
  'lessee_name',
  'lessee_contact',
  'monthly_rent',
  'lease_start_date',
  'lease_end_date',
  'rent_payment_day',
  // 审核和其他信息字段（9列）
  'review_notes',
  'locked_photos',
  'required_photos',
  'damage_photos',
  'pickup_photos',
  'pickup_time',
  'registration_photos',
  'return_photos',
  'return_time'
]

// ============================================
// driver_licenses 表字段定义
// ============================================

/**
 * driver_licenses 表需要检查的字段列表
 * 这些字段在 00635 迁移中添加
 */
const DRIVER_LICENSES_FIELDS = [
  // 身份证相关字段（6列）
  'id_card_name',
  'id_card_number',
  'id_card_photo_front',
  'id_card_photo_back',
  'id_card_address',      // ⚠️ 关键字段
  'id_card_birth_date',
  // 驾驶证相关字段（7列）
  'driving_license_photo', // ⚠️ 关键字段
  'license_number',
  'license_class',
  'first_issue_date',
  'valid_from',
  'valid_to',
  'issue_authority'
]

/**
 * 关键字段列表（必须存在）
 */
const CRITICAL_FIELDS = {
  driver_licenses: ['id_card_address', 'driving_license_photo']
}

// ============================================
// 字段检查函数
// ============================================

/**
 * 检查表中指定字段是否存在
 * @param {string} tableName - 表名
 * @param {string} fieldName - 字段名
 * @returns {Promise<boolean>} - 字段是否存在
 */
async function checkFieldExists(tableName, fieldName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select(`id, ${fieldName}`)
      .limit(1)

    // 如果错误信息包含字段名或错误码为 42703（字段不存在），说明字段不存在
    if (error && (error.message.includes(fieldName) || error.code === '42703')) {
      return false
    }

    return true
  } catch (err) {
    // 捕获异常，返回 false
    return false
  }
}

/**
 * 检查表中多个字段的存在状态
 * @param {string} tableName - 表名
 * @param {string[]} fields - 字段名列表
 * @returns {Promise<{existing: string[], missing: string[]}>} - 存在和缺失的字段
 */
async function checkTableFields(tableName, fields) {
  const existing = []
  const missing = []

  for (const field of fields) {
    const exists = await checkFieldExists(tableName, field)
    if (exists) {
      existing.push(field)
    } else {
      missing.push(field)
    }
  }

  return { existing, missing }
}

// ============================================
// vehicle_documents 表检查
// ============================================

/**
 * 检查 vehicle_documents 表结构
 * @returns {Promise<{success: boolean, existing: string[], missing: string[]}>}
 */
async function checkVehicleDocumentsTable() {
  console.log('\n========================================')
  console.log('检查 vehicle_documents 表结构')
  console.log('========================================\n')

  // 首先检查表是否存在
  try {
    const { error } = await supabase
      .from('vehicle_documents')
      .select('id')
      .limit(1)

    if (error && error.code === '42P01') {
      console.log('❌ vehicle_documents 表不存在')
      return { success: false, existing: [], missing: VEHICLE_DOCUMENTS_FIELDS }
    }
  } catch (err) {
    console.log('❌ 检查表存在性失败:', err.message)
    return { success: false, existing: [], missing: VEHICLE_DOCUMENTS_FIELDS }
  }

  console.log('✅ vehicle_documents 表存在\n')
  console.log('检查扩展字段...\n')

  // 检查所有扩展字段
  const { existing, missing } = await checkTableFields('vehicle_documents', VEHICLE_DOCUMENTS_FIELDS)

  // 输出检查结果
  console.log(`   存在: ${existing.length} 个字段`)
  console.log(`   缺失: ${missing.length} 个字段`)

  if (missing.length > 0) {
    console.log('\n   缺失的字段:')
    missing.forEach(field => console.log(`   - ${field}`))
  }

  // 检查 document_type 字段是否为 NOT NULL（这是需要修复的问题）
  console.log('\n检查 document_type 字段约束...')
  const docTypeExists = await checkFieldExists('vehicle_documents', 'document_type')
  if (docTypeExists) {
    console.log('   ℹ️ document_type 字段存在（需要确保为可空）')
  } else {
    console.log('   ℹ️ document_type 字段不存在（这是正常的，00599版本不包含此字段）')
  }

  return {
    success: missing.length === 0,
    existing,
    missing
  }
}

// ============================================
// driver_licenses 表检查
// ============================================

/**
 * 检查 driver_licenses 表字段
 * @returns {Promise<{success: boolean, existing: string[], missing: string[], criticalMissing: string[]}>}
 */
async function checkDriverLicensesTable() {
  console.log('\n========================================')
  console.log('检查 driver_licenses 表字段')
  console.log('========================================\n')

  // 首先检查表是否存在
  try {
    const { error } = await supabase
      .from('driver_licenses')
      .select('id')
      .limit(1)

    if (error && error.code === '42P01') {
      console.log('❌ driver_licenses 表不存在')
      return { 
        success: false, 
        existing: [], 
        missing: DRIVER_LICENSES_FIELDS,
        criticalMissing: CRITICAL_FIELDS.driver_licenses
      }
    }
  } catch (err) {
    console.log('❌ 检查表存在性失败:', err.message)
    return { 
      success: false, 
      existing: [], 
      missing: DRIVER_LICENSES_FIELDS,
      criticalMissing: CRITICAL_FIELDS.driver_licenses
    }
  }

  console.log('✅ driver_licenses 表存在\n')
  console.log('检查字段...\n')

  // 检查所有字段
  const { existing, missing } = await checkTableFields('driver_licenses', DRIVER_LICENSES_FIELDS)

  // 检查关键字段
  const criticalMissing = CRITICAL_FIELDS.driver_licenses.filter(f => missing.includes(f))

  // 输出检查结果
  console.log(`   存在: ${existing.length} 个字段`)
  console.log(`   缺失: ${missing.length} 个字段`)

  if (missing.length > 0) {
    console.log('\n   缺失的字段:')
    missing.forEach(field => {
      const isCritical = CRITICAL_FIELDS.driver_licenses.includes(field)
      console.log(`   - ${field}${isCritical ? ' ⚠️ 关键字段' : ''}`)
    })
  }

  if (criticalMissing.length > 0) {
    console.log('\n   ⚠️ 关键字段缺失:')
    criticalMissing.forEach(field => console.log(`   - ${field}`))
  }

  return {
    success: missing.length === 0,
    existing,
    missing,
    criticalMissing
  }
}

// ============================================
// 迁移指导
// ============================================

/**
 * 显示手动执行迁移的指导
 * @param {string[]} migrationFiles - 需要执行的迁移文件列表
 */
function showMigrationInstructions(migrationFiles) {
  console.log('\n========================================')
  console.log('⚠️ 需要手动执行数据库迁移')
  console.log('========================================\n')

  console.log('请在 Supabase Dashboard SQL Editor 中执行以下迁移文件：\n')

  migrationFiles.forEach((file, index) => {
    const filePath = path.join(__dirname, '../supabase/migrations', file)
    const exists = fs.existsSync(filePath)
    
    console.log(`${index + 1}. ${file}`)
    if (exists) {
      console.log(`   路径: supabase/migrations/${file}`)
      console.log('   状态: ✅ 文件存在')
    } else {
      console.log(`   路径: supabase/migrations/${file}`)
      console.log('   状态: ❌ 文件不存在')
    }
    console.log('')
  })

  console.log('执行步骤：')
  console.log('1. 打开 https://supabase.com/dashboard')
  console.log('2. 选择项目')
  console.log('3. 点击左侧 "SQL Editor"')
  console.log('4. 依次复制上述迁移文件内容并执行')
  console.log('5. 确认执行成功后重新运行此脚本验证')
  console.log('')
  console.log('提示：执行迁移后，如果仍然出现字段缺失错误，')
  console.log('请在 Supabase Dashboard 中刷新 Schema Cache')
}

/**
 * 显示迁移文件内容
 * @param {string} fileName - 迁移文件名
 */
function showMigrationContent(fileName) {
  const filePath = path.join(__dirname, '../supabase/migrations', fileName)
  
  if (fs.existsSync(filePath)) {
    console.log(`\n========================================`)
    console.log(`迁移文件: ${fileName}`)
    console.log('========================================\n')
    
    const content = fs.readFileSync(filePath, 'utf8')
    // 只显示前 100 行，避免输出过长
    const lines = content.split('\n')
    if (lines.length > 100) {
      console.log(lines.slice(0, 100).join('\n'))
      console.log(`\n... (省略 ${lines.length - 100} 行，请查看完整文件)`)
    } else {
      console.log(content)
    }
  } else {
    console.log(`\n❌ 迁移文件不存在: ${fileName}`)
  }
}

// ============================================
// 主函数
// ============================================

/**
 * 主函数：检查数据库字段并提供迁移指导
 */
async function main() {
  console.log('========================================')
  console.log('车辆数据库字段修复检查')
  console.log('========================================')
  console.log('')
  console.log('本脚本检查以下内容：')
  console.log('1. vehicle_documents 表扩展字段')
  console.log('2. driver_licenses 表身份证和驾驶证字段')
  console.log('')
  console.log('迁移文件：')
  console.log('- 00634_fix_vehicle_documents_structure.sql')
  console.log('- 00635_fix_driver_licenses_fields.sql')

  // 需要执行的迁移文件列表
  const migrationFiles = []

  // 检查 vehicle_documents 表
  const vehicleDocsResult = await checkVehicleDocumentsTable()
  if (!vehicleDocsResult.success) {
    migrationFiles.push('00634_fix_vehicle_documents_structure.sql')
  }

  // 检查 driver_licenses 表
  const driverLicensesResult = await checkDriverLicensesTable()
  if (!driverLicensesResult.success) {
    migrationFiles.push('00635_fix_driver_licenses_fields.sql')
  }

  // 输出总结
  console.log('\n========================================')
  console.log('检查结果总结')
  console.log('========================================\n')

  // vehicle_documents 表结果
  if (vehicleDocsResult.success) {
    console.log('✅ vehicle_documents 表: 所有扩展字段已存在')
  } else {
    console.log(`❌ vehicle_documents 表: 缺失 ${vehicleDocsResult.missing.length} 个字段`)
  }

  // driver_licenses 表结果
  if (driverLicensesResult.success) {
    console.log('✅ driver_licenses 表: 所有字段已存在')
  } else {
    console.log(`❌ driver_licenses 表: 缺失 ${driverLicensesResult.missing.length} 个字段`)
    if (driverLicensesResult.criticalMissing.length > 0) {
      console.log(`   ⚠️ 其中 ${driverLicensesResult.criticalMissing.length} 个是关键字段`)
    }
  }

  // 如果有需要执行的迁移
  if (migrationFiles.length > 0) {
    showMigrationInstructions(migrationFiles)

    // 询问是否显示迁移文件内容
    console.log('\n----------------------------------------')
    console.log('如需查看迁移文件内容，请使用以下命令：')
    migrationFiles.forEach(file => {
      console.log(`  type supabase\\migrations\\${file}`)
    })
    console.log('----------------------------------------')
  } else {
    console.log('\n✅ 所有字段检查通过！数据库结构正确')
    console.log('')
    console.log('如果仍然出现字段缺失错误，请尝试：')
    console.log('1. 在 Supabase Dashboard 中刷新 Schema Cache')
    console.log('2. 重启应用程序')
  }
}

// 执行主函数
main().catch(err => {
  console.error('\n❌ 脚本执行失败:', err.message)
  process.exit(1)
})
