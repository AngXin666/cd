/**
 * 修复 vehicle_documents 表的 document_type NOT NULL 约束
 * 
 * 问题：document_type 字段有 NOT NULL 约束，但代码不需要这个字段
 * 解决：移除 NOT NULL 约束，使字段可空
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.TARO_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少环境变量 TARO_APP_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixDocumentTypeConstraint() {
  console.log('🔧 开始修复 document_type NOT NULL 约束...\n')

  try {
    // 方法1：直接执行 ALTER TABLE 语句
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.vehicle_documents ALTER COLUMN document_type DROP NOT NULL;`
    })

    if (alterError) {
      console.log('⚠️ 使用 RPC 执行失败，尝试其他方法...')
      console.log('错误信息:', alterError.message)
      
      // 方法2：检查当前约束状态
      const { data: columnInfo, error: infoError } = await supabase
        .from('information_schema.columns')
        .select('is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'vehicle_documents')
        .eq('column_name', 'document_type')
        .single()

      if (infoError) {
        console.log('无法查询列信息:', infoError.message)
      } else if (columnInfo) {
        console.log('当前 document_type 字段 is_nullable:', columnInfo.is_nullable)
      }

      console.log('\n📋 请手动在 Supabase Dashboard 执行以下 SQL:')
      console.log('----------------------------------------')
      console.log('ALTER TABLE public.vehicle_documents ALTER COLUMN document_type DROP NOT NULL;')
      console.log('----------------------------------------')
      return false
    }

    console.log('✅ 成功移除 document_type NOT NULL 约束')
    return true
  } catch (error) {
    console.error('❌ 执行失败:', error.message)
    
    console.log('\n📋 请手动在 Supabase Dashboard 执行以下 SQL:')
    console.log('----------------------------------------')
    console.log('ALTER TABLE public.vehicle_documents ALTER COLUMN document_type DROP NOT NULL;')
    console.log('----------------------------------------')
    return false
  }
}

fixDocumentTypeConstraint()
  .then(success => {
    if (success) {
      console.log('\n🎉 修复完成！')
    } else {
      console.log('\n⚠️ 自动修复失败，请手动执行 SQL')
    }
  })
  .catch(err => {
    console.error('脚本执行错误:', err)
  })
