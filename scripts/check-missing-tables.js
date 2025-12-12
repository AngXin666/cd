#!/usr/bin/env node
/**
 * 检查缺失的表
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wxvrwkpkioalqdsfswwu.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24'

const supabase = createClient(supabaseUrl, serviceRoleKey)

const EXPECTED_TABLES = [
  'users',
  'user_roles',
  'warehouses',
  'warehouse_assignments',
  'vehicles',
  'vehicle_documents',
  'attendance',
  'attendance_rules',
  'piece_work_records',
  'category_prices',
  'leave_applications',
  'resignation_applications',
  'notifications',
  'driver_licenses'
]

async function checkTables() {
  console.log('🔍 检查数据库表...\n')

  const existingTables = []
  const missingTables = []

  for (const tableName of EXPECTED_TABLES) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0)

      if (error) {
        if (error.message.includes('does not exist') || error.message.includes('Could not find the table')) {
          console.log(`❌ ${tableName} - 不存在`)
          missingTables.push(tableName)
        } else {
          console.log(`⚠️  ${tableName} - 访问受限: ${error.message}`)
        }
      } else {
        console.log(`✅ ${tableName} - 存在`)
        existingTables.push(tableName)
      }
    } catch (err) {
      console.log(`❌ ${tableName} - 错误: ${err.message}`)
      missingTables.push(tableName)
    }
  }

  console.log(`\n\n📊 统计:`)
  console.log(`存在的表: ${existingTables.length}`)
  console.log(`缺失的表: ${missingTables.length}`)

  if (missingTables.length > 0) {
    console.log(`\n⚠️  缺失的表:`)
    missingTables.forEach(t => console.log(`  - ${t}`))
  }
}

checkTables().catch(console.error)
