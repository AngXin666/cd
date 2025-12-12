/**
 * 列出所有 super_admin 用户
 */

import {createClient} from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// 加载环境变量
dotenv.config({path: path.resolve(__dirname, '../.env')})

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
const supabaseAnonKey = process.env.TARO_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function listAllSuperAdmins() {
  console.log('========================================')
  console.log('📋 查询所有 super_admin 用户')
  console.log('========================================\n')

  try {
    // 查询所有 super_admin 用户
    const {data: admins, error} = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'super_admin')
      .order('created_at', {ascending: true})

    if (error) {
      console.error('❌ 查询失败:', error)
      process.exit(1)
    }

    if (!admins || admins.length === 0) {
      console.log('❌ 没有找到任何 super_admin 用户')
      return
    }

    console.log(`✅ 找到 ${admins.length} 个 super_admin 用户：\n`)

    for (let i = 0; i < admins.length; i++) {
      const admin = admins[i]
      console.log(`${i + 1}. ${admin.name || '未命名'}`)
      console.log(`   ID: ${admin.id}`)
      console.log(`   手机号: ${admin.phone || '未设置'}`)
      console.log(`   邮箱: ${admin.email || '未设置'}`)
      console.log(`   boss_id: ${admin.boss_id || 'NULL'}`)
      console.log(`   main_account_id: ${admin.main_account_id || 'NULL (主账号)'}`)
      console.log(`   公司: ${admin.company_name || '未设置'}`)
      console.log(`   状态: ${admin.status || '未设置'}`)
      console.log(`   创建时间: ${admin.created_at}`)
      console.log('')
    }

    console.log('========================================')
  } catch (error) {
    console.error('❌ 查询过程中发生错误:', error)
    process.exit(1)
  }
}

// 执行查询
listAllSuperAdmins()
