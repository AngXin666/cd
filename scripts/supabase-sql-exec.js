/**
 * 通过 Supabase SQL API 执行 DDL 语句
 * 使用 Supabase 的 SQL 执行端点
 */

const https = require('https')

// Supabase 配置
const PROJECT_REF = 'wxvrwkpkioalqdsfswwu'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24'

// 迁移 SQL
const MIGRATION_SQL = `
ALTER TABLE vehicle_documents
ADD COLUMN IF NOT EXISTS supplemented_photos JSONB DEFAULT '{}'::jsonb;
`

/**
 * 发送 HTTPS 请求
 */
function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, data })
      })
    })
    req.on('error', reject)
    if (postData) req.write(postData)
    req.end()
  })
}

/**
 * 尝试通过不同的端点执行 SQL
 */
async function tryExecuteSQL() {
  console.log('========================================')
  console.log('执行 SQL 迁移')
  console.log('========================================\n')

  // 方法 1: 尝试 /pg/query 端点 (Supabase 内部 API)
  console.log('🔧 方法 1: 尝试 /pg/query 端点...')
  try {
    const options1 = {
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/pg/query',
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    }
    
    const response1 = await httpsRequest(options1, JSON.stringify({ query: MIGRATION_SQL }))
    console.log(`   状态: ${response1.status}`)
    
    if (response1.status === 200) {
      console.log('   ✅ 成功！')
      return true
    }
    console.log(`   响应: ${response1.data.substring(0, 200)}`)
  } catch (e) {
    console.log(`   错误: ${e.message}`)
  }

  // 方法 2: 尝试 /rest/v1/rpc/query 端点
  console.log('\n🔧 方法 2: 尝试 /rest/v1/rpc/query 端点...')
  try {
    const options2 = {
      hostname: `${PROJECT_REF}.supabase.co`,
      path: '/rest/v1/rpc/query',
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    }
    
    const response2 = await httpsRequest(options2, JSON.stringify({ sql: MIGRATION_SQL }))
    console.log(`   状态: ${response2.status}`)
    
    if (response2.status === 200) {
      console.log('   ✅ 成功！')
      return true
    }
    console.log(`   响应: ${response2.data.substring(0, 200)}`)
  } catch (e) {
    console.log(`   错误: ${e.message}`)
  }

  // 方法 3: 尝试 Supabase Management API
  console.log('\n🔧 方法 3: 尝试 Management API...')
  console.log('   需要 Supabase Access Token (从 Dashboard 获取)')
  
  return false
}

/**
 * 验证字段
 */
async function verifyField() {
  console.log('\n🔍 验证字段...')
  
  const options = {
    hostname: `${PROJECT_REF}.supabase.co`,
    path: '/rest/v1/vehicle_documents?select=supplemented_photos&limit=1',
    method: 'GET',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  }
  
  try {
    const response = await httpsRequest(options)
    
    if (response.status === 200) {
      console.log('✅ supplemented_photos 字段已存在！')
      return true
    } else {
      console.log(`❌ 字段不存在 (状态: ${response.status})`)
      return false
    }
  } catch (e) {
    console.log(`验证失败: ${e.message}`)
    return false
  }
}

async function main() {
  // 先验证字段是否已存在
  const exists = await verifyField()
  
  if (exists) {
    console.log('\n✨ 字段已存在，无需迁移')
    return
  }
  
  // 尝试执行 SQL
  const success = await tryExecuteSQL()
  
  if (!success) {
    console.log('\n' + '='.repeat(60))
    console.log('❌ 自动迁移失败')
    console.log('='.repeat(60))
    console.log('\n请在 Supabase Dashboard 中手动执行以下 SQL:')
    console.log('\n1. 打开 https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql')
    console.log('2. 粘贴并执行以下 SQL:\n')
    console.log('─'.repeat(60))
    console.log(MIGRATION_SQL)
    console.log('─'.repeat(60))
  }
  
  // 再次验证
  await verifyField()
  
  console.log('\n✨ 脚本执行完成')
}

main().catch(console.error)
