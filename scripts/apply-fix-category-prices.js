#!/usr/bin/env node

/**
 * 应用 category_prices 表修复
 */

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

const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.TARO_APP_SUPABASE_URL
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY || envVars.TARO_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  console.error('请确保 .env 文件中包含以下变量：')
  console.error('  - VITE_SUPABASE_URL 或 TARO_APP_SUPABASE_URL')
  console.error('  - VITE_SUPABASE_ANON_KEY 或 TARO_APP_SUPABASE_ANON_KEY')
  process.exit(1)
}

console.log('🔧 开始修复 category_prices 表...\n')
console.log(`📡 Supabase URL: ${supabaseUrl}`)

const supabase = createClient(supabaseUrl, supabaseKey)

// 读取 SQL 修复脚本
const sqlPath = path.join(__dirname, 'fix-category-prices-table.sql')
const sqlContent = fs.readFileSync(sqlPath, 'utf-8')

async function executeSql() {
  try {
    // 分割 SQL 语句（简单处理，按分号分割）
    const statements = sqlContent
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--') && !s.startsWith('/*'))

    console.log(`📝 共有 ${statements.length} 条 SQL 语句需要执行\n`)

    // 由于 Supabase JS 客户端不支持直接执行 DDL，我们需要使用 SQL Editor
    console.log('⚠️  注意：Supabase JS 客户端无法直接执行 DDL 语句')
    console.log('请按照以下步骤手动执行修复：\n')
    console.log('1. 登录 Supabase Dashboard')
    console.log(`2. 访问 SQL Editor: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/editor/sql`)
    console.log('3. 复制并执行以下 SQL 脚本：\n')
    console.log('=' .repeat(80))
    console.log(sqlContent)
    console.log('=' .repeat(80))
    console.log('\n或者，将以下文件内容复制到 SQL Editor 执行：')
    console.log(`   ${sqlPath}`)

    // 尝试测试表是否可以访问
    console.log('\n🧪 测试当前 category_prices 表状态...')
    const {data, error} = await supabase.from('category_prices').select('id').limit(1)

    if (error) {
      console.log('❌ 表不存在或无法访问:', error.message)
      console.log('   错误代码:', error.code)
      if (error.details) {
        console.log('   详细信息:', error.details)
      }
    } else {
      console.log('✅ category_prices 表已存在且可以访问')
      console.log(`   当前记录数: ${data?.length || 0}`)
    }
  } catch (error) {
    console.error('❌ 执行失败:', error.message)
    process.exit(1)
  }
}

executeSql()
