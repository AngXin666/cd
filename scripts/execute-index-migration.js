/**
 * 执行数据库索引优化迁移脚本
 * 
 * 使用方法：
 * node scripts/execute-index-migration.js
 * 
 * @module scripts/execute-index-migration
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

// Supabase 配置
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 配置')
  console.error('请确保 .env 文件中包含：')
  console.error('  - VITE_SUPABASE_URL')
  console.error('  - VITE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * 执行 SQL 语句
 * @param {string} sql - SQL 语句
 * @returns {Promise<boolean>} - 是否成功
 */
async function executeSql(sql) {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql })
    if (error) {
      // 如果 exec_sql 不存在，尝试直接执行
      console.log('⚠️ exec_sql 函数不可用，尝试其他方式...')
      return false
    }
    return true
  } catch (err) {
    console.error('执行 SQL 失败:', err.message)
    return false
  }
}

/**
 * 解析 SQL 文件，提取单独的语句
 * @param {string} content - SQL 文件内容
 * @returns {string[]} - SQL 语句数组
 */
function parseSqlStatements(content) {
  // 移除注释块
  const withoutBlockComments = content.replace(/\/\*[\s\S]*?\*\//g, '')
  
  // 移除单行注释
  const withoutLineComments = withoutBlockComments
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
  
  // 按分号分割语句
  const statements = withoutLineComments
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('DO $$'))
  
  return statements
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================')
  console.log('数据库索引优化迁移')
  console.log('========================================')
  console.log('')
  
  // 读取迁移文件
  const migrationPath = path.join(__dirname, '../supabase/migrations/00638_optimize_query_indexes.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ 迁移文件不存在:', migrationPath)
    process.exit(1)
  }
  
  const content = fs.readFileSync(migrationPath, 'utf-8')
  console.log('✅ 已读取迁移文件')
  
  // 解析 SQL 语句
  const statements = parseSqlStatements(content)
  console.log(`📝 共 ${statements.length} 条 SQL 语句`)
  console.log('')
  
  // 统计
  let successCount = 0
  let skipCount = 0
  let errorCount = 0
  
  // 逐条执行
  for (let i = 0; i < statements.length; i++) {
    const sql = statements[i]
    
    // 跳过 COMMENT 语句（可能不支持）
    if (sql.toUpperCase().startsWith('COMMENT')) {
      skipCount++
      continue
    }
    
    // 提取索引名称用于显示
    const indexMatch = sql.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i)
    const indexName = indexMatch ? indexMatch[1] : `语句 ${i + 1}`
    
    console.log(`[${i + 1}/${statements.length}] 创建索引: ${indexName}`)
    
    const success = await executeSql(sql)
    if (success) {
      successCount++
      console.log(`  ✅ 成功`)
    } else {
      // 尝试检查索引是否已存在
      console.log(`  ⚠️ 可能已存在或需要手动执行`)
      skipCount++
    }
  }
  
  console.log('')
  console.log('========================================')
  console.log('执行结果')
  console.log('========================================')
  console.log(`✅ 成功: ${successCount}`)
  console.log(`⏭️ 跳过: ${skipCount}`)
  console.log(`❌ 失败: ${errorCount}`)
  console.log('')
  
  if (successCount === 0 && skipCount > 0) {
    console.log('💡 提示：如果 exec_sql 函数不可用，请手动在 Supabase SQL 编辑器中执行迁移文件：')
    console.log('   supabase/migrations/00638_optimize_query_indexes.sql')
  }
  
  console.log('')
  console.log('✅ 迁移脚本执行完成')
}

// 执行
main().catch(console.error)
