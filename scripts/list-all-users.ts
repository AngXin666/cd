/**
 * 列出所有用户
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

async function listAllUsers() {
  console.log('========================================')
  console.log('📋 查询所有用户')
  console.log('========================================\n')

  try {
    // 查询所有用户
    const {data: users, error} = await supabase
      .from('profiles')
      .select('id, name, phone, email, role, boss_id, main_account_id, created_at')
      .order('role', {ascending: true})
      .order('created_at', {ascending: true})

    if (error) {
      console.error('❌ 查询失败:', error)
      process.exit(1)
    }

    if (!users || users.length === 0) {
      console.log('❌ 数据库中没有任何用户')
      return
    }

    console.log(`✅ 找到 ${users.length} 个用户：\n`)

    // 按角色分组统计
    const roleStats: Record<string, number> = {}
    users.forEach((user) => {
      roleStats[user.role] = (roleStats[user.role] || 0) + 1
    })

    console.log('📊 角色统计：')
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`   ${role}: ${count} 名`)
    })
    console.log('')

    // 显示所有用户详情
    console.log('📋 用户详情：\n')
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      console.log(`${i + 1}. ${user.name || '未命名'} (${user.role})`)
      console.log(`   ID: ${user.id}`)
      console.log(`   手机号: ${user.phone || '未设置'}`)
      console.log(`   邮箱: ${user.email || '未设置'}`)
      console.log(`   boss_id: ${user.boss_id || 'NULL'}`)
      console.log(`   main_account_id: ${user.main_account_id || 'NULL'}`)
      console.log(`   创建时间: ${user.created_at}`)
      console.log('')
    }

    console.log('========================================')
  } catch (error) {
    console.error('❌ 查询过程中发生错误:', error)
    process.exit(1)
  }
}

// 执行查询
listAllUsers()
