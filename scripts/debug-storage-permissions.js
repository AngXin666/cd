/**
 * 调试脚本：检查 Supabase Storage 权限
 */

require('dotenv').config()
const {createClient} = require('@supabase/supabase-js')

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
const supabaseKey = process.env.TARO_APP_SUPABASE_ANON_KEY

console.log('🔍 检查 Supabase Storage 配置和权限...\n')
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : '❌ 未设置')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 使用已存在的 h5-app 存储桶
const BUCKET_NAME = 'h5-app'

async function debugStoragePermissions() {
  // 1. 检查认证状态
  console.log('\n=== 1. 检查认证状态 ===')
  const {data: {session}, error: sessionError} = await supabase.auth.getSession()
  
  if (sessionError) {
    console.error('❌ 获取 session 失败:', sessionError)
  } else if (!session) {
    console.log('⚠️ 未登录（匿名访问）')
  } else {
    console.log('✅ 已登录')
    console.log(`   用户ID: ${session.user.id}`)
    console.log(`   邮箱: ${session.user.email}`)
  }

  // 2. 尝试直接访问存储桶
  console.log(`\n=== 2. 尝试访问存储桶 ${BUCKET_NAME} ===`)
  
  // 尝试列出文件
  const {data: files, error: listError} = await supabase.storage
    .from(BUCKET_NAME)
    .list('', {limit: 5})
  
  if (listError) {
    console.error('❌ 列出文件失败:', listError.message)
    console.log('   这可能是因为:')
    console.log('   1. 存储桶不存在')
    console.log('   2. 没有读取权限')
    console.log('   3. RLS 策略阻止了访问')
  } else {
    console.log(`✅ 可以访问存储桶，找到 ${files?.length || 0} 个文件`)
  }

  // 3. 尝试上传测试文件
  console.log('\n=== 3. 尝试上传测试文件 ===')
  const testContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47]) // PNG 文件头
  const testFileName = `test_upload_${Date.now()}.png`
  
  const {data: uploadData, error: uploadError} = await supabase.storage
    .from(BUCKET_NAME)
    .upload(testFileName, testContent, {
      contentType: 'image/png',
      upsert: false
    })
  
  if (uploadError) {
    console.error('❌ 上传测试文件失败:', uploadError.message)
    console.log('   错误详情:', JSON.stringify(uploadError, null, 2))
    console.log('\n   可能的原因:')
    console.log('   1. 存储桶不存在 - 需要在 Supabase 控制台创建')
    console.log('   2. 没有上传权限 - 需要配置 Storage 策略')
    console.log('   3. 用户未登录 - 需要先登录')
  } else {
    console.log('✅ 上传测试文件成功!')
    console.log(`   文件路径: ${uploadData.path}`)
    
    // 获取公开URL
    const {data: urlData} = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path)
    console.log(`   公开URL: ${urlData.publicUrl}`)
    
    // 清理测试文件
    const {error: deleteError} = await supabase.storage
      .from(BUCKET_NAME)
      .remove([testFileName])
    
    if (deleteError) {
      console.log('⚠️ 清理测试文件失败:', deleteError.message)
    } else {
      console.log('✅ 测试文件已清理')
    }
  }

  console.log('\n✅ 检查完成')
}

debugStoragePermissions().catch(console.error)
