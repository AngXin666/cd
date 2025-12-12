#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const {createClient} = require('@supabase/supabase-js')

// 读取环境变量
const envPath = path.join(__dirname, '..', '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}

envContent.split('\n').forEach((line) => {
  const match = line.match(/^(\w+)=(.*)$/)
  if (match) {
    envVars[match[1]] = match[2]
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL
const anonKey = envVars.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

async function test() {
  console.log('🧪 详细测试 category_prices 表...\n')

  // Test 1: 查询所有字段
  console.log('1️⃣ 测试查询所有字段...')
  const {data: allData, error: allError} = await supabase
    .from('category_prices')
    .select('*')

  if (allError) {
    console.log('❌ 查询失败')
    console.log('   消息:', allError.message)
    console.log('   代码:', allError.code)
    console.log('   详情:', allError.details || 'N/A')
    console.log('   提示:', allError.hint || 'N/A')
  } else {
    console.log(`✅ 查询成功，共 ${allData.length} 条记录`)
    if (allData.length > 0) {
      console.log('   字段:', Object.keys(allData[0]))
    }
  }

  // Test 2: 尝试查询 category_name
  console.log('\n2️⃣ 测试查询 category_name 字段...')
  const {data: nameData, error: nameError} = await supabase
    .from('category_prices')
    .select('id, category_name')

  if (nameError) {
    console.log('❌ 查询失败')
    console.log('   消息:', nameError.message)
    console.log('   代码:', nameError.code)
  } else {
    console.log(`✅ 查询成功，共 ${nameData.length} 条记录`)
  }

  // Test 3: 尝试排序查询
  console.log('\n3️⃣ 测试排序查询 (order by category_name)...')
  const {data: orderedData, error: orderedError} = await supabase
    .from('category_prices')
    .select('*')
    .order('category_name', {ascending: true})

  if (orderedError) {
    console.log('❌ 查询失败')
    console.log('   消息:', orderedError.message)
    console.log('   代码:', orderedError.code)
    console.log('   详情:', orderedError.details || 'N/A')
  } else {
    console.log(`✅ 查询成功，共 ${orderedData.length} 条记录`)
  }

  // Test 4: 尝试插入测试数据
  console.log('\n4️⃣ 测试插入数据（需要登录和权限）...')
  const testData = {
    category_name: '测试品类',
    warehouse_id: null,  // 全局配置
    unit_price: 10.00,
    upstairs_price: 2.00,
    sorting_unit_price: 1.00,
    driver_only_price: 9.00,
    driver_with_vehicle_price: 11.00,
    is_active: true
  }

  const {data: insertData, error: insertError} = await supabase
    .from('category_prices')
    .insert(testData)
    .select()

  if (insertError) {
    console.log('⚠️  插入失败（可能需要登录或权限）')
    console.log('   消息:', insertError.message)
    console.log('   代码:', insertError.code)
  } else {
    console.log('✅ 插入成功')
    console.log('   数据:', insertData)
    
    // 清理测试数据
    if (insertData && insertData.length > 0) {
      await supabase
        .from('category_prices')
        .delete()
        .eq('id', insertData[0].id)
      console.log('   已清理测试数据')
    }
  }

  console.log('\n✅ 测试完成')
}

test().catch(console.error)
