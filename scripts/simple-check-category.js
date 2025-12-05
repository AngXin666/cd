#!/usr/bin/env node

const {createClient} = require('@supabase/supabase-js')
require('dotenv').config({path: '.env.development'})

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

console.log('URL:', supabaseUrl ? '存在' : '缺失')
console.log('Key:', serviceKey ? '存在' : '缺失')

if (!supabaseUrl || !serviceKey) {
  console.error('缺少环境变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function check() {
  try {
    console.log('\n测试查询 category_prices 表...')
    
    const {data, error} = await supabase
      .from('category_prices')
      .select('*')
      .limit(3)

    if (error) {
      console.error('错误:', error.message)
      console.error('代码:', error.code)
      console.error('详情:', error.details)
      console.error('提示:', error.hint)
    } else {
      console.log('成功! 记录数:', data?.length || 0)
      if (data && data.length > 0) {
        console.log('字段:', Object.keys(data[0]))
        console.log('示例:', data[0])
      }
    }
  } catch (e) {
    console.error('异常:', e.message)
  }
}

check()
