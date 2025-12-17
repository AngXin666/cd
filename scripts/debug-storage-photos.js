/**
 * 调试脚本：检查 Supabase Storage 中的照片
 */

require('dotenv').config()
const {createClient} = require('@supabase/supabase-js')

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
const supabaseKey = process.env.TARO_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 使用已存在的 h5-app 存储桶
const BUCKET_NAME = 'h5-app'

async function debugStoragePhotos() {
  console.log('🔍 检查 Supabase Storage 中的照片...\n')

  // 1. 列出存储桶
  console.log('=== 1. 列出所有存储桶 ===')
  const {data: buckets, error: bucketsError} = await supabase.storage.listBuckets()
  
  if (bucketsError) {
    console.error('❌ 列出存储桶失败:', bucketsError)
  } else {
    console.log(`找到 ${buckets.length} 个存储桶:`)
    buckets.forEach(b => {
      console.log(`  - ${b.name} (public: ${b.public})`)
    })
  }

  // 2. 列出目标存储桶中的文件
  console.log(`\n=== 2. 列出 ${BUCKET_NAME} 存储桶中的文件 ===`)
  const {data: files, error: filesError} = await supabase.storage
    .from(BUCKET_NAME)
    .list('', {
      limit: 20,
      sortBy: {column: 'created_at', order: 'desc'}
    })

  if (filesError) {
    console.error('❌ 列出文件失败:', filesError)
  } else if (!files || files.length === 0) {
    console.log('⚠️ 存储桶为空，没有任何文件')
  } else {
    console.log(`找到 ${files.length} 个文件/文件夹:`)
    files.forEach(f => {
      if (f.id) {
        console.log(`  📄 ${f.name} (${f.metadata?.size || 'unknown'} bytes)`)
      } else {
        console.log(`  📁 ${f.name}/`)
      }
    })
  }

  // 3. 尝试列出 vehicles 子目录
  console.log(`\n=== 3. 列出 vehicles 子目录 ===`)
  const {data: vehicleFiles, error: vehicleFilesError} = await supabase.storage
    .from(BUCKET_NAME)
    .list('vehicles', {
      limit: 20,
      sortBy: {column: 'created_at', order: 'desc'}
    })

  if (vehicleFilesError) {
    console.error('❌ 列出 vehicles 目录失败:', vehicleFilesError)
  } else if (!vehicleFiles || vehicleFiles.length === 0) {
    console.log('⚠️ vehicles 目录为空或不存在')
  } else {
    console.log(`找到 ${vehicleFiles.length} 个文件:`)
    vehicleFiles.forEach(f => {
      console.log(`  📄 vehicles/${f.name}`)
    })
  }

  // 4. 检查最近上传的照片
  console.log(`\n=== 4. 检查根目录下的照片文件 ===`)
  const {data: rootFiles, error: rootFilesError} = await supabase.storage
    .from(BUCKET_NAME)
    .list('', {
      limit: 50,
      sortBy: {column: 'created_at', order: 'desc'}
    })

  if (rootFilesError) {
    console.error('❌ 列出根目录失败:', rootFilesError)
  } else {
    const photoFiles = (rootFiles || []).filter(f => 
      f.name && (f.name.endsWith('.jpg') || f.name.endsWith('.png') || f.name.endsWith('.jpeg'))
    )
    
    if (photoFiles.length === 0) {
      console.log('⚠️ 根目录下没有照片文件')
    } else {
      console.log(`找到 ${photoFiles.length} 个照片文件:`)
      photoFiles.slice(0, 10).forEach(f => {
        console.log(`  📷 ${f.name}`)
      })
    }
  }

  console.log('\n✅ 检查完成')
}

debugStoragePhotos().catch(console.error)
