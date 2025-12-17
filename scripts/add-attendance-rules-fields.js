/**
 * 为 attendance_rules 表添加缺失的字段
 * 
 * 问题：代码中使用 clock_in_time 和 clock_out_time 字段，
 * 但数据库表中只有 start_time 和 end_time 字段
 * 
 * 运行方式：node scripts/add-attendance-rules-fields.js
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

// 尝试多种环境变量名称
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

// 优先使用 service role key，如果没有则使用 anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少环境变量')
  console.error('  VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  console.error('  VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗')
  process.exit(1)
}

console.log('使用的 Key 类型:', supabaseServiceKey ? 'Service Role Key' : 'Anon Key')

const supabase = createClient(supabaseUrl, supabaseKey)

async function addMissingFields() {
  console.log('🚀 开始为 attendance_rules 表添加缺失字段...\n')

  const sql = `
    -- 1. 添加 clock_in_time 字段
    ALTER TABLE public.attendance_rules 
    ADD COLUMN IF NOT EXISTS clock_in_time TIME;

    -- 2. 添加 clock_out_time 字段
    ALTER TABLE public.attendance_rules 
    ADD COLUMN IF NOT EXISTS clock_out_time TIME;

    -- 3. 添加 work_start_time 字段
    ALTER TABLE public.attendance_rules 
    ADD COLUMN IF NOT EXISTS work_start_time TIME;

    -- 4. 添加 work_end_time 字段
    ALTER TABLE public.attendance_rules 
    ADD COLUMN IF NOT EXISTS work_end_time TIME;

    -- 5. 添加 early_threshold 字段
    ALTER TABLE public.attendance_rules 
    ADD COLUMN IF NOT EXISTS early_threshold INTEGER DEFAULT 15;

    -- 6. 添加 require_clock_out 字段
    ALTER TABLE public.attendance_rules 
    ADD COLUMN IF NOT EXISTS require_clock_out BOOLEAN DEFAULT true;
  `

  try {
    // 执行 SQL
    const { error: alterError } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (alterError) {
      // 如果 exec_sql 不存在，尝试直接执行
      console.log('⚠️ exec_sql 函数不可用，尝试逐个添加字段...\n')
      
      // 逐个添加字段
      const fields = [
        { name: 'clock_in_time', type: 'TIME' },
        { name: 'clock_out_time', type: 'TIME' },
        { name: 'work_start_time', type: 'TIME' },
        { name: 'work_end_time', type: 'TIME' },
        { name: 'early_threshold', type: 'INTEGER', default: 15 },
        { name: 'require_clock_out', type: 'BOOLEAN', default: true }
      ]

      for (const field of fields) {
        console.log(`  添加字段: ${field.name}...`)
      }
      
      console.log('\n⚠️ 请手动在 Supabase Dashboard 中执行以下 SQL：\n')
      console.log(sql)
      console.log('\n或者运行迁移文件：')
      console.log('supabase/migrations/00631_add_clock_time_fields_to_attendance_rules.sql')
      return
    }

    console.log('✅ 字段添加成功！\n')

    // 更新现有数据
    const updateSql = `
      UPDATE public.attendance_rules 
      SET 
        clock_in_time = COALESCE(clock_in_time, start_time),
        clock_out_time = COALESCE(clock_out_time, end_time),
        work_start_time = COALESCE(work_start_time, start_time),
        work_end_time = COALESCE(work_end_time, end_time)
      WHERE clock_in_time IS NULL OR clock_out_time IS NULL;
    `

    const { error: updateError } = await supabase.rpc('exec_sql', { sql_query: updateSql })
    
    if (updateError) {
      console.log('⚠️ 数据更新需要手动执行')
    } else {
      console.log('✅ 现有数据已更新！')
    }

  } catch (error) {
    console.error('❌ 执行失败:', error.message)
    console.log('\n请手动在 Supabase Dashboard 中执行迁移文件：')
    console.log('supabase/migrations/00631_add_clock_time_fields_to_attendance_rules.sql')
  }
}

// 检查当前表结构
async function checkTableStructure() {
  console.log('📋 检查 attendance_rules 表当前结构...\n')

  const { data, error } = await supabase
    .from('attendance_rules')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ 查询失败:', error.message)
    return
  }

  if (data && data.length > 0) {
    console.log('当前表字段：')
    console.log(Object.keys(data[0]).join(', '))
    console.log('\n示例数据：')
    console.log(JSON.stringify(data[0], null, 2))
  } else {
    console.log('表中没有数据')
  }
}

async function main() {
  await checkTableStructure()
  console.log('\n' + '='.repeat(50) + '\n')
  await addMissingFields()
}

main()
