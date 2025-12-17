/**
 * 数据库迁移执行脚本 v3
 * 使用 Supabase Database API 执行 DDL
 * 
 * @description 通过 Supabase 的 SQL 执行端点添加 supplemented_photos 字段
 */

const https = require('https')
require('dotenv').config()

// Supabase 配置
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.TARO_APP_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// 从 URL 提取项目 ID
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1]

/**
 * 使用 Supabase Management API 执行 SQL
 * @param {string} sql - SQL 语句
 * @returns {Promise<object>} 执行结果
 */
async function executeSqlViaManagementApi(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql })
    
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          resolve({ status: res.statusCode, data: result })
        } catch (e) {
          resolve({ status: res.statusCode, data: data })
        }
      })
    })

    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

/**
 * 使用 PostgREST RPC 调用（如果存在 exec_sql 函数）
 * @param {string} sql - SQL 语句
 * @returns {Promise<object>} 执行结果
 */
async function executeSqlViaRpc(sql) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ sql_query: sql })
    
    const url = new URL(SUPABASE_URL)
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Length': Buffer.byteLength(postData)
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          resolve({ status: res.statusCode, data: result })
        } catch (e) {
          resolve({ status: res.statusCode, data: data })
        }
      })
    })

    req.on('error', reject)
    req.write(postData)
    req.end()
  })
}

/**
 * 检查字段是否存在
 * @returns {Promise<boolean>} 字段是否存在
 */
async function checkFieldExists() {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL)
    
    // 尝试查询 vehicle_documents 表的一条记录，检查是否有 supplemented_photos 字段
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/vehicle_documents?select=supplemented_photos&limit=1',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        // 如果返回 200，说明字段存在
        // 如果返回 400 并包含 "column ... does not exist"，说明字段不存在
        if (res.statusCode === 200) {
          resolve(true)
        } else {
          resolve(false)
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

/**
 * 获取数据库连接字符串
 * @returns {Promise<object>} 连接信息
 */
async function getDatabaseConnectionInfo() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/connection-string`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          resolve({ status: res.statusCode, data: result })
        } catch (e) {
          resolve({ status: res.statusCode, data: data })
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================')
  console.log('数据库迁移执行脚本 v3')
  console.log('========================================\n')

  console.log(`📋 项目 ID: ${PROJECT_REF}`)
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}\n`)

  // 1. 首先检查字段是否已存在
  console.log('🔍 检查 supplemented_photos 字段是否存在...')
  const fieldExists = await checkFieldExists()
  
  if (fieldExists) {
    console.log('✅ supplemented_photos 字段已存在，无需迁移！')
    return
  }
  
  console.log('❌ supplemented_photos 字段不存在，需要执行迁移\n')

  // 2. 尝试获取数据库连接信息
  console.log('🔍 尝试获取数据库连接信息...')
  const connInfo = await getDatabaseConnectionInfo()
  console.log(`   状态: ${connInfo.status}`)
  if (connInfo.status === 200) {
    console.log('   连接信息:', JSON.stringify(connInfo.data, null, 2))
  } else {
    console.log('   无法获取连接信息（可能需要 Management API 访问令牌）')
  }
  console.log('')

  // 3. 迁移 SQL
  const migrationSql = `
    ALTER TABLE vehicle_documents
    ADD COLUMN IF NOT EXISTS supplemented_photos JSONB DEFAULT '{}'::jsonb;
  `

  // 4. 尝试通过 Management API 执行
  console.log('🔧 尝试通过 Management API 执行迁移...')
  const mgmtResult = await executeSqlViaManagementApi(migrationSql)
  console.log(`   状态: ${mgmtResult.status}`)
  
  if (mgmtResult.status === 200 || mgmtResult.status === 201) {
    console.log('✅ Management API 执行成功！')
  } else {
    console.log('   Management API 响应:', JSON.stringify(mgmtResult.data, null, 2))
    
    // 5. 尝试通过 RPC 执行
    console.log('\n🔧 尝试通过 RPC 执行迁移...')
    const rpcResult = await executeSqlViaRpc(migrationSql)
    console.log(`   状态: ${rpcResult.status}`)
    
    if (rpcResult.status === 200 || rpcResult.status === 201) {
      console.log('✅ RPC 执行成功！')
    } else {
      console.log('   RPC 响应:', JSON.stringify(rpcResult.data, null, 2))
    }
  }

  // 6. 再次验证字段是否存在
  console.log('\n🔍 验证迁移结果...')
  const fieldExistsAfter = await checkFieldExists()
  
  if (fieldExistsAfter) {
    console.log('✅ 迁移成功！supplemented_photos 字段已添加')
  } else {
    console.log('❌ 迁移失败，字段仍不存在')
    console.log('\n📝 请手动在 Supabase Dashboard SQL Editor 中执行以下 SQL:')
    console.log('────────────────────────────────────────────────────────────')
    console.log(migrationSql)
    console.log('────────────────────────────────────────────────────────────')
    console.log('\n🔗 Dashboard URL: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql')
  }

  console.log('\n✨ 脚本执行完成')
}

main().catch(console.error)
