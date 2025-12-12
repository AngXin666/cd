#!/usr/bin/env node

/**
 * 检查 category_prices 表的结构
 */

const {createClient} = require('@supabase/supabase-js')
require('dotenv').config({path: '.env.development'})

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ 缺少必要的环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function checkSchema() {
  console.log('🔍 检查 category_prices 表结构...\n')

  // 1. 尝试查询表结构
  const {data: columns, error: schemaError} = await supabase.rpc('execute_sql', {
    query: `
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'category_prices'
      ORDER BY ordinal_position;
    `
  })

  if (schemaError) {
    console.log('⚠️  无法通过 RPC 查询，尝试直接查询...')
    
    // 2. 尝试直接查询表数据
    const {data, error, count} = await supabase
      .from('category_prices')
      .select('*', {count: 'exact'})
      .limit(1)

    if (error) {
      console.error('❌ 查询失败:', error.message)
      console.error('错误详情:', JSON.stringify(error, null, 2))
      
      // 检查表是否存在
      const {data: tables} = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'category_prices')
      
      if (!tables || tables.length === 0) {
        console.log('\n❌ category_prices 表不存在！')
        console.log('需要运行迁移: 00503_recreate_category_prices_table.sql')
      }
      return
    }

    console.log(`✅ category_prices 表存在`)
    console.log(`📊 记录数: ${count || 0}`)
    
    if (data && data.length > 0) {
      console.log('\n📋 表字段（从数据推断）:')
      const sampleRow = data[0]
      Object.keys(sampleRow).forEach(key => {
        const value = sampleRow[key]
        const type = typeof value === 'object' && value !== null ? 'object' : typeof value
        console.log(`  - ${key}: ${type}`)
      })
    } else {
      console.log('\n⚠️  表中没有数据，无法推断字段结构')
    }
  } else {
    console.log('✅ category_prices 表结构:\n')
    columns.forEach(col => {
      console.log(`  - ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
    })
  }

  // 3. 检查是否可以查询 category_name
  console.log('\n🧪 测试查询 category_name 字段...')
  const {data: testData, error: testError} = await supabase
    .from('category_prices')
    .select('id, category_name, warehouse_id')
    .limit(5)

  if (testError) {
    console.error('❌ 查询 category_name 失败:', testError.message)
    console.error('错误代码:', testError.code)
    console.error('错误详情:', testError.details)
  } else {
    console.log(`✅ 成功查询到 ${testData.length} 条记录`)
    if (testData.length > 0) {
      console.log('示例数据:')
      testData.forEach((row, idx) => {
        console.log(`  ${idx + 1}. category_name: ${row.category_name}, warehouse_id: ${row.warehouse_id || 'NULL'}`)
      })
    }
  }
}

checkSchema().catch(console.error)
