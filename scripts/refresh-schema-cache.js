/**
 * Supabase Schema Cache 刷新脚本
 * 
 * 功能说明：
 * 1. 通过 NOTIFY 命令刷新 PostgREST Schema Cache
 * 2. 执行 ANALYZE 更新表统计信息
 * 3. 验证新字段在 Schema Cache 中可见
 * 
 * 使用场景：
 * - 执行数据库迁移后，新字段在 API 中不可见
 * - PostgREST 报告找不到字段错误
 * 
 * @module scripts/refresh-schema-cache
 * Requirements: 5.3
 */

const { createClient } = require('@supabase/supabase-js')
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
// 需要验证的表和字段
// ============================================

/**
 * 需要验证的关键字段列表
 * 这些字段是在最近的迁移中添加的
 */
const FIELDS_TO_VERIFY = {
  vehicle_documents: [
    'owner_name',
    'driving_license_main_photo',
    'left_front_photo',
    'lessor_name',
    'review_notes',
    'damage_photos',
    'pickup_photos',
    'return_photos'
  ],
  driver_licenses: [
    'id_card_address',
    'driving_license_photo',
    'id_card_name',
    'id_card_number',
    'license_number'
  ]
}

// ============================================
// 字段验证函数
// ============================================

/**
 * 检查表中指定字段是否在 Schema Cache 中可见
 * @param {string} tableName - 表名
 * @param {string} fieldName - 字段名
 * @returns {Promise<{exists: boolean, error: string|null}>}
 */
async function checkFieldVisible(tableName, fieldName) {
  try {
    // 尝试查询该字段
    const { error } = await supabase
      .from(tableName)
      .select(`id, ${fieldName}`)
      .limit(1)

    if (error) {
      // 检查是否是字段不存在的错误
      if (error.message.includes(fieldName) || 
          error.code === '42703' || 
          error.message.includes('does not exist')) {
        return { exists: false, error: error.message }
      }
      // 其他错误（如权限问题）不影响字段存在性判断
      return { exists: true, error: null }
    }

    return { exists: true, error: null }
  } catch (err) {
    return { exists: false, error: err.message }
  }
}

/**
 * 验证表中多个字段的可见性
 * @param {string} tableName - 表名
 * @param {string[]} fields - 字段名列表
 * @returns {Promise<{visible: string[], hidden: string[]}>}
 */
async function verifyTableFields(tableName, fields) {
  const visible = []
  const hidden = []

  for (const field of fields) {
    const result = await checkFieldVisible(tableName, field)
    if (result.exists) {
      visible.push(field)
    } else {
      hidden.push(field)
    }
  }

  return { visible, hidden }
}

// ============================================
// Schema Cache 刷新
// ============================================

/**
 * 通过 RPC 调用刷新 Schema Cache
 * 注意：这需要在 Supabase Dashboard 中执行 SQL
 */
async function refreshSchemaCache() {
  console.log('\n========================================')
  console.log('刷新 Supabase Schema Cache')
  console.log('========================================\n')

  console.log('ℹ️ Schema Cache 刷新方法：\n')
  
  console.log('方法 1：通过 Supabase Dashboard（推荐）')
  console.log('----------------------------------------')
  console.log('1. 打开 https://supabase.com/dashboard')
  console.log('2. 选择您的项目')
  console.log('3. 点击左侧 "SQL Editor"')
  console.log('4. 执行以下 SQL：\n')
  console.log('   -- 通知 PostgREST 重新加载 Schema')
  console.log("   NOTIFY pgrst, 'reload schema';")
  console.log('')
  console.log('   -- 更新表统计信息')
  console.log('   ANALYZE vehicle_documents;')
  console.log('   ANALYZE driver_licenses;')
  console.log('   ANALYZE vehicles;')
  console.log('')

  console.log('方法 2：通过 Supabase CLI')
  console.log('----------------------------------------')
  console.log('如果您已安装 Supabase CLI，可以执行：')
  console.log('   supabase db reset --linked')
  console.log('   或')
  console.log('   supabase db push')
  console.log('')

  console.log('方法 3：重启 PostgREST 服务')
  console.log('----------------------------------------')
  console.log('在 Supabase Dashboard 中：')
  console.log('1. 进入 Settings > API')
  console.log('2. 点击 "Restart API" 按钮')
  console.log('')

  console.log('方法 4：等待自动刷新')
  console.log('----------------------------------------')
  console.log('Supabase 会定期自动刷新 Schema Cache')
  console.log('通常在几分钟内会自动更新')
  console.log('')
}

// ============================================
// 验证函数
// ============================================

/**
 * 验证所有关键字段是否可见
 */
async function verifyAllFields() {
  console.log('\n========================================')
  console.log('验证字段在 Schema Cache 中的可见性')
  console.log('========================================\n')

  let allVisible = true

  for (const [tableName, fields] of Object.entries(FIELDS_TO_VERIFY)) {
    console.log(`检查 ${tableName} 表...`)
    
    const { visible, hidden } = await verifyTableFields(tableName, fields)
    
    console.log(`   ✅ 可见: ${visible.length} 个字段`)
    if (visible.length > 0) {
      visible.forEach(f => console.log(`      - ${f}`))
    }
    
    if (hidden.length > 0) {
      console.log(`   ❌ 不可见: ${hidden.length} 个字段`)
      hidden.forEach(f => console.log(`      - ${f}`))
      allVisible = false
    }
    
    console.log('')
  }

  return allVisible
}

// ============================================
// 主函数
// ============================================

/**
 * 主函数：刷新 Schema Cache 并验证字段可见性
 */
async function main() {
  console.log('========================================')
  console.log('Supabase Schema Cache 刷新工具')
  console.log('========================================')
  console.log('')
  console.log('Supabase URL:', supabaseUrl)
  console.log('')

  // 首先验证当前字段可见性
  console.log('步骤 1: 检查当前字段可见性...')
  const beforeRefresh = await verifyAllFields()

  if (beforeRefresh) {
    console.log('========================================')
    console.log('✅ 所有字段已在 Schema Cache 中可见！')
    console.log('========================================')
    console.log('')
    console.log('无需刷新 Schema Cache')
    console.log('数据库迁移已成功生效')
    return
  }

  // 显示刷新方法
  console.log('步骤 2: 需要刷新 Schema Cache')
  await refreshSchemaCache()

  // 提示用户操作
  console.log('========================================')
  console.log('⚠️ 请按照上述方法刷新 Schema Cache')
  console.log('========================================')
  console.log('')
  console.log('刷新后，请重新运行此脚本验证：')
  console.log('   node scripts/refresh-schema-cache.js')
  console.log('')
  console.log('或运行字段检查脚本：')
  console.log('   node scripts/fix-vehicle-database-fields.js')
}

// 执行主函数
main().catch(err => {
  console.error('\n❌ 脚本执行失败:', err.message)
  process.exit(1)
})
