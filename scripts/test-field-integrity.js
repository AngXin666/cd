#!/usr/bin/env node
/**
 * 深度字段完整性测试脚本
 * 检查数据库表结构和TypeScript类型定义的一致性
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://wxvrwkpkioalqdsfswwu.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24'

const supabase = createClient(supabaseUrl, serviceRoleKey)

const testResults = {
  tables: {},
  missingFields: [],
  extraFields: [],
  typeMismatches: [],
  summary: {
    totalTables: 0,
    totalFields: 0,
    issuesFound: 0
  }
}

// 核心表列表
const CORE_TABLES = [
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

/**
 * 获取表的所有字段
 */
async function getTableColumns(tableName) {
  try {
    // 直接查询表获取字段信息
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (error) {
      console.error(`❌ 获取表 ${tableName} 字段失败:`, error.message)
      return null
    }

    if (!data || data.length === 0) {
      // 表为空，但我们可以通过尝试插入来获取字段
      const { error: selectError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0)
      
      if (selectError) {
        return null
      }
      
      // 使用空查询的方式获取字段名
      return []
    }

    // 从第一条记录中提取字段名
    const firstRow = data[0]
    return Object.keys(firstRow).map(name => ({
      name,
      type: typeof firstRow[name],
      nullable: firstRow[name] === null,
      default: null
    }))
  } catch (error) {
    console.error(`❌ 获取表 ${tableName} 字段异常:`, error.message)
    return null
  }
}

/**
 * 测试表数据完整性
 */
async function testTableData(tableName) {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error && error.code !== 'PGRST116') {
      console.error(`   ⚠️  查询表 ${tableName} 失败:`, error.message)
      return { exists: false, count: 0, accessible: false }
    }

    return { 
      exists: true, 
      count: count || 0,
      accessible: !error 
    }
  } catch (error) {
    return { exists: false, count: 0, accessible: false }
  }
}

/**
 * 分析字段使用情况
 */
async function analyzeFieldUsage(tableName, sampleSize = 10) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(sampleSize)

    if (error) {
      return { analyzed: false, nullFields: [], emptyFields: [] }
    }

    if (!data || data.length === 0) {
      return { analyzed: true, nullFields: [], emptyFields: [], noData: true }
    }

    const fieldStats = {}
    const firstRow = data[0]
    
    // 初始化统计
    Object.keys(firstRow).forEach(field => {
      fieldStats[field] = {
        nullCount: 0,
        emptyCount: 0,
        validCount: 0
      }
    })

    // 统计每个字段
    data.forEach(row => {
      Object.keys(row).forEach(field => {
        const value = row[field]
        if (value === null) {
          fieldStats[field].nullCount++
        } else if (value === '' || (Array.isArray(value) && value.length === 0)) {
          fieldStats[field].emptyCount++
        } else {
          fieldStats[field].validCount++
        }
      })
    })

    const nullFields = []
    const emptyFields = []

    Object.keys(fieldStats).forEach(field => {
      const stats = fieldStats[field]
      const totalCount = data.length
      
      if (stats.nullCount === totalCount) {
        nullFields.push(field)
      } else if (stats.validCount === 0) {
        emptyFields.push(field)
      }
    })

    return { 
      analyzed: true, 
      nullFields, 
      emptyFields,
      sampleSize: data.length 
    }
  } catch (error) {
    return { analyzed: false, nullFields: [], emptyFields: [] }
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('🔍 开始深度字段完整性测试...\n')
  console.log('═══════════════════════════════════════')
  console.log('📊 第1阶段：表结构检查')
  console.log('═══════════════════════════════════════\n')

  for (const tableName of CORE_TABLES) {
    console.log(`\n📋 检查表: ${tableName}`)
    console.log('─'.repeat(50))

    // 1. 获取表字段信息
    const columns = await getTableColumns(tableName)
    if (!columns) {
      console.log('   ❌ 无法获取表结构')
      testResults.tables[tableName] = { error: '无法获取表结构' }
      continue
    }

    console.log(`   ✅ 字段数量: ${columns.length}`)
    console.log(`   📝 字段列表:`)
    columns.forEach(col => {
      const nullable = col.nullable ? 'NULL' : 'NOT NULL'
      console.log(`      - ${col.name} (${col.type}, ${nullable})`)
    })

    // 2. 测试表数据访问
    const dataInfo = await testTableData(tableName)
    if (dataInfo.accessible) {
      console.log(`   ✅ 数据可访问，记录数: ${dataInfo.count}`)
    } else {
      console.log(`   ⚠️  数据不可访问`)
    }

    // 3. 分析字段使用情况
    if (dataInfo.count > 0) {
      const usage = await analyzeFieldUsage(tableName, 10)
      if (usage.analyzed) {
        if (usage.nullFields.length > 0) {
          console.log(`   ⚠️  完全为NULL的字段 (${usage.nullFields.length}):`)
          usage.nullFields.forEach(field => console.log(`      - ${field}`))
          testResults.missingFields.push({
            table: tableName,
            fields: usage.nullFields,
            reason: '字段值全为NULL'
          })
        }
        
        if (usage.emptyFields.length > 0) {
          console.log(`   ⚠️  完全为空的字段 (${usage.emptyFields.length}):`)
          usage.emptyFields.forEach(field => console.log(`      - ${field}`))
        }

        if (usage.nullFields.length === 0 && usage.emptyFields.length === 0) {
          console.log(`   ✅ 所有字段都有有效数据`)
        }
      }
    } else if (dataInfo.count === 0) {
      console.log(`   ℹ️  表为空，无法分析字段使用情况`)
    }

    testResults.tables[tableName] = {
      fieldCount: columns.length,
      recordCount: dataInfo.count,
      accessible: dataInfo.accessible,
      columns: columns.map(c => c.name)
    }

    testResults.summary.totalTables++
    testResults.summary.totalFields += columns.length
  }

  console.log('\n\n═══════════════════════════════════════')
  console.log('🔎 第2阶段：关键业务字段检查')
  console.log('═══════════════════════════════════════\n')

  // 检查关键字段
  const criticalFields = [
    { table: 'users', fields: ['id', 'name', 'phone', 'email'] },
    { table: 'user_roles', fields: ['user_id', 'role'] },
    { table: 'warehouses', fields: ['id', 'name', 'address'] },
    { table: 'warehouse_assignments', fields: ['user_id', 'warehouse_id', 'assigned_by'] },
    { table: 'vehicles', fields: ['id', 'plate_number', 'brand', 'model', 'current_driver_id'] },
    { table: 'vehicle_documents', fields: ['vehicle_id', 'owner_name', 'vin'] },
    { table: 'attendance', fields: ['user_id', 'warehouse_id', 'check_in_time', 'work_date'] },
    { table: 'piece_work_records', fields: ['user_id', 'warehouse_id', 'category', 'quantity', 'work_date'] },
    { table: 'leave_applications', fields: ['user_id', 'leave_type', 'start_date', 'end_date', 'status'] },
    { table: 'notifications', fields: ['recipient_id', 'title', 'content', 'is_read'] }
  ]

  for (const { table, fields } of criticalFields) {
    console.log(`\n📌 ${table} 关键字段:`)
    
    const tableInfo = testResults.tables[table]
    if (!tableInfo || tableInfo.error) {
      console.log('   ❌ 表不存在或无法访问')
      continue
    }

    if (!tableInfo.columns || tableInfo.columns.length === 0) {
      console.log('   ⚠️  表为空，无法检查字段')
      continue
    }

    const missingFields = fields.filter(f => !tableInfo.columns.includes(f))
    const existingFields = fields.filter(f => tableInfo.columns.includes(f))

    if (existingFields.length > 0) {
      console.log(`   ✅ 存在的字段 (${existingFields.length}/${fields.length}):`)
      existingFields.forEach(f => console.log(`      - ${f}`))
    }

    if (missingFields.length > 0) {
      console.log(`   ❌ 缺失的字段 (${missingFields.length}):`)
      missingFields.forEach(f => console.log(`      - ${f}`))
      testResults.missingFields.push({
        table,
        fields: missingFields,
        reason: '关键字段缺失'
      })
      testResults.summary.issuesFound += missingFields.length
    }
  }

  // 生成报告
  console.log('\n\n═══════════════════════════════════════')
  console.log('📊 测试总结')
  console.log('═══════════════════════════════════════\n')

  console.log(`检查的表数量: ${testResults.summary.totalTables}`)
  console.log(`总字段数量: ${testResults.summary.totalFields}`)
  console.log(`发现的问题: ${testResults.summary.issuesFound}`)

  if (testResults.missingFields.length > 0) {
    console.log('\n\n⚠️  缺失或有问题的字段:')
    testResults.missingFields.forEach(issue => {
      console.log(`\n  表: ${issue.table}`)
      console.log(`  原因: ${issue.reason}`)
      console.log(`  字段:`)
      issue.fields.forEach(f => console.log(`    - ${f}`))
    })
  } else {
    console.log('\n✅ 所有关键字段都完整存在！')
  }

  // 保存报告
  const reportPath = path.join(__dirname, '..', 'field-integrity-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2))
  console.log(`\n📝 详细报告已保存到: ${reportPath}`)

  console.log('\n测试完成！\n')
}

// 运行测试
runTests().catch(console.error)
