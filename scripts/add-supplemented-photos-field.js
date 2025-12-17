/**
 * 添加 supplemented_photos 字段到 vehicle_documents 表
 * 用于记录补录照片的元数据
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  console.error('   需要 VITE_SUPABASE_URL 和 VITE_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('🔧 添加 supplemented_photos 字段...\n')

  // 使用 RPC 执行 SQL（需要 service_role key）
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE vehicle_documents
      ADD COLUMN IF NOT EXISTS supplemented_photos JSONB DEFAULT '{}'::jsonb;
      
      COMMENT ON COLUMN vehicle_documents.supplemented_photos IS '补录照片元数据，键为 "{field}_{index}"，值包含 field(字段名)、index(索引)、supplemented_at(补录时间)、original_url(原始URL)、supplement_count(补录次数)';
    `
  })

  if (error) {
    console.error('❌ 执行迁移失败:', error.message)
    console.log('\n💡 请手动在 Supabase Dashboard 中执行以下 SQL:')
    console.log(`
ALTER TABLE vehicle_documents
ADD COLUMN IF NOT EXISTS supplemented_photos JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN vehicle_documents.supplemented_photos IS '补录照片元数据';
    `)
    return
  }

  console.log('✅ supplemented_photos 字段添加成功！')
}

main().catch(console.error)
