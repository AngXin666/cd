/**
 * 添加 supplemented_photos 字段到 vehicle_documents 表
 * 使用 Supabase REST API 和 service_role key
 */

const https = require('https')

// Supabase 配置
const SUPABASE_URL = 'https://wxvrwkpkioalqdsfswwu.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24'

/**
 * 发送 HTTPS 请求
 */
function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({ status: res.statusCode, data })
      })
    })
    req.on('error', reject)
    if (postData) req.write(postData)
    req.end()
  })
}

/**
 * 检查字段是否存在
 */
async function checkFieldExists() {
  console.log('🔍 检查 supplemented_photos 字段是否存在...')
  
  const options = {
    hostname: 'wxvrwkpkioalqdsfswwu.supabase.co',
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
    } else if (response.status === 400 && response.data.includes('supplemented_photos')) {
      console.log('❌ supplemented_photos 字段不存在')
      return false
    } else {
      console.log(`响应状态: ${response.status}`)
      console.log(`响应内容: ${response.data}`)
      return response.status === 200
    }
  } catch (error) {
    console.error('检查失败:', error.message)
    return false
  }
}

/**
 * 通过更新一条记录来"创建"字段
 * 注意：这种方法在 Supabase 中不会自动创建字段
 */
async function tryAddFieldViaUpdate() {
  console.log('\n🔧 尝试通过 REST API 添加字段...')
  
  // 首先获取一条记录的 ID
  const getOptions = {
    hostname: 'wxvrwkpkioalqdsfswwu.supabase.co',
    path: '/rest/v1/vehicle_documents?select=id&limit=1',
    method: 'GET',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  }
  
  try {
    const getResponse = await httpsRequest(getOptions)
    
    if (getResponse.status !== 200) {
      console.log('获取记录失败:', getResponse.data)
      return false
    }
    
    const records = JSON.parse(getResponse.data)
    if (records.length === 0) {
      console.log('表中没有记录')
      return false
    }
    
    const recordId = records[0].id
    console.log(`找到记录 ID: ${recordId}`)
    
    // 尝试更新这条记录，添加 supplemented_photos 字段
    const updateOptions = {
      hostname: 'wxvrwkpkioalqdsfswwu.supabase.co',
      path: `/rest/v1/vehicle_documents?id=eq.${recordId}`,
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    }
    
    const updateData = JSON.stringify({
      supplemented_photos: {}
    })
    
    const updateResponse = await httpsRequest(updateOptions, updateData)
    
    if (updateResponse.status === 204 || updateResponse.status === 200) {
      console.log('✅ 更新成功！字段可能已存在或已添加')
      return true
    } else {
      console.log(`更新响应: ${updateResponse.status}`)
      console.log(`响应内容: ${updateResponse.data}`)
      return false
    }
  } catch (error) {
    console.error('操作失败:', error.message)
    return false
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================')
  console.log('添加 supplemented_photos 字段')
  console.log('========================================\n')
  
  // 检查字段是否存在
  const exists = await checkFieldExists()
  
  if (exists) {
    console.log('\n✨ 字段已存在，无需迁移')
    return
  }
  
  // 尝试添加字段
  const success = await tryAddFieldViaUpdate()
  
  if (!success) {
    console.log('\n❌ 无法通过 REST API 添加字段')
    console.log('\n📋 请在 Supabase Dashboard SQL Editor 中执行以下 SQL:')
    console.log('─'.repeat(60))
    console.log(`
ALTER TABLE vehicle_documents
ADD COLUMN IF NOT EXISTS supplemented_photos JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN vehicle_documents.supplemented_photos IS 
  '补录照片元数据';
    `)
    console.log('─'.repeat(60))
  }
  
  // 再次验证
  console.log('\n🔍 再次验证...')
  await checkFieldExists()
  
  console.log('\n✨ 脚本执行完成')
}

main().catch(console.error)
