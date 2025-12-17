/**
 * 列出 Supabase 中所有存储桶
 */

require('dotenv').config()
const {createClient} = require('@supabase/supabase-js')

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
const supabaseKey = process.env.TARO_APP_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function listAllBuckets() {
  console.log('🔍 列出所有存储桶...\n')

  // 使用 service_role key 可能需要，但先尝试 anon key
  const {data: buckets, error} = await supabase.storage.listBuckets()

  if (error) {
    console.error('❌ 列出存储桶失败:', error.message)
    console.log('\n可能需要使用 service_role key 来列出存储桶')
    console.log('或者在 Supabase 控制台手动检查存储桶')
    return
  }

  if (!buckets || buckets.length === 0) {
    console.log('⚠️ 没有找到任何存储桶（可能是权限问题）')
    console.log('\n请在 Supabase 控制台检查:')
    console.log('1. Storage -> 查看所有存储桶')
    console.log('2. 确认是否存在 app-7cdqf07mbu9t_vehicles 存储桶')
    console.log('3. 如果不存在，需要创建它')
    return
  }

  console.log(`找到 ${buckets.length} 个存储桶:`)
  buckets.forEach(b => {
    console.log(`  - ${b.name}`)
    console.log(`    public: ${b.public}`)
    console.log(`    created_at: ${b.created_at}`)
  })

  // 检查目标存储桶是否存在
  // 使用已存在的 h5-app 存储桶
  const targetBucket = 'h5-app'
  const exists = buckets.some(b => b.name === targetBucket)
  
  console.log(`\n目标存储桶 "${targetBucket}": ${exists ? '✅ 存在' : '❌ 不存在'}`)
  
  if (!exists) {
    console.log('\n⚠️ 需要在 Supabase 控制台创建存储桶:')
    console.log(`   名称: ${targetBucket}`)
    console.log('   公开: 是 (public)')
    console.log('   并配置适当的 Storage 策略')
  }
}

listAllBuckets().catch(console.error)
