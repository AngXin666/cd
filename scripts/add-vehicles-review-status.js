/**
 * 添加 vehicles 表审核相关字段
 * 修复 PGRST204 错误：Could not find the 'review_status' column
 * 
 * 功能说明：
 * 1. 检查 review_status 字段是否存在
 * 2. 如果不存在，提供手动执行 SQL 的指导
 * 3. 验证字段添加成功
 * 
 * @module scripts/add-vehicles-review-status
 * Requirements: 2.3
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

// Supabase 配置
const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
const supabaseAnonKey = process.env.TARO_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少环境变量 TARO_APP_SUPABASE_URL 或 TARO_APP_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * 检查 review_status 字段是否存在
 * @returns {Promise<boolean>} - 字段是否存在
 */
async function checkFieldExists() {
  console.log('检查 review_status 字段是否存在...')
  
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, review_status')
      .limit(1)

    if (error) {
      // 如果错误信息包含 review_status，说明字段不存在
      if (error.message.includes('review_status') || error.code === '42703') {
        console.log('❌ review_status 字段不存在\n')
        return false
      }
      console.log('查询错误:', error.message)
      return false
    }

    console.log('✅ review_status 字段已存在\n')
    return true
  } catch (err) {
    console.log('检查异常:', err.message)
    return false
  }
}

/**
 * 验证所有审核相关字段
 * @returns {Promise<object>} - 字段存在状态
 */
async function verifyAllFields() {
  console.log('验证所有审核相关字段...\n')
  
  const fieldsToCheck = [
    'review_status',
    'user_id', 
    'warehouse_id',
    'owner_id',
    'current_driver_id',
    'color',
    'vin',
    'purchase_date',
    'ownership_type',
    'is_active',
    'notes',
    'reviewed_at',
    'reviewed_by'
  ]
  
  const results = {}
  
  for (const field of fieldsToCheck) {
    try {
      const { error } = await supabase
        .from('vehicles')
        .select(`id, ${field}`)
        .limit(1)
      
      if (error && (error.message.includes(field) || error.code === '42703')) {
        results[field] = false
        console.log(`   ❌ ${field} - 不存在`)
      } else {
        results[field] = true
        console.log(`   ✅ ${field} - 存在`)
      }
    } catch (err) {
      results[field] = false
      console.log(`   ❌ ${field} - 检查失败: ${err.message}`)
    }
  }
  
  return results
}

/**
 * 显示手动执行 SQL 的指导
 */
function showManualInstructions() {
  console.log('\n========================================')
  console.log('⚠️ 需要手动执行数据库迁移')
  console.log('========================================\n')
  
  console.log('请在 Supabase Dashboard SQL Editor 中执行以下 SQL：\n')
  
  // 读取迁移文件内容
  const migrationPath = path.join(__dirname, '../supabase/migrations/00632_add_vehicles_review_status_field.sql')
  if (fs.existsSync(migrationPath)) {
    console.log('----------------------------------------')
    console.log('迁移文件路径: supabase/migrations/00632_add_vehicles_review_status_field.sql')
    console.log('----------------------------------------\n')
  }
  
  console.log('执行步骤：')
  console.log('1. 打开 https://supabase.com/dashboard')
  console.log('2. 选择项目')
  console.log('3. 点击左侧 "SQL Editor"')
  console.log('4. 复制 supabase/migrations/00632_add_vehicles_review_status_field.sql 文件内容')
  console.log('5. 粘贴到 SQL Editor 并执行')
  console.log('6. 确认执行成功后重新运行此脚本验证\n')
}

/**
 * 主函数：检查并验证迁移
 */
async function main() {
  console.log('========================================')
  console.log('Vehicles 表审核字段迁移检查')
  console.log('修复 PGRST204 错误')
  console.log('========================================\n')

  // 检查核心字段是否存在
  const exists = await checkFieldExists()
  
  if (exists) {
    console.log('核心字段 review_status 已存在，验证其他字段...\n')
    
    // 验证所有字段
    const fieldResults = await verifyAllFields()
    
    // 统计结果
    const existingFields = Object.values(fieldResults).filter(v => v).length
    const missingFields = Object.values(fieldResults).filter(v => !v).length
    
    console.log('\n========================================')
    console.log('验证结果')
    console.log('========================================')
    console.log(`存在: ${existingFields} 个字段`)
    console.log(`缺失: ${missingFields} 个字段`)
    
    if (missingFields > 0) {
      console.log('\n⚠️ 部分字段缺失，请执行完整迁移脚本')
      showManualInstructions()
    } else {
      console.log('\n✅ 所有字段验证通过！迁移已完成')
    }
  } else {
    // 字段不存在，显示手动执行指导
    showManualInstructions()
  }
  
  console.log('\n提示：执行迁移后，如果仍然出现 PGRST204 错误，')
  console.log('请在 Supabase Dashboard 中刷新 Schema Cache')
}

// 执行主函数
main().catch(console.error)
