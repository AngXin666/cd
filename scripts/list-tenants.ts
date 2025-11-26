/**
 * 列出所有租户
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

async function listTenants() {
  console.log('========================================')
  console.log('📋 查询所有租户（主账号）')
  console.log('========================================\n')

  try {
    // 查询所有主账号（super_admin 且 main_account_id 为 null）
    const {data: tenants, error} = await supabase
      .from('profiles')
      .select('id, name, phone, email, company_name, role, boss_id, main_account_id, created_at')
      .eq('role', 'super_admin')
      .is('main_account_id', null)
      .order('created_at', {ascending: true})

    if (error) {
      console.error('❌ 查询租户失败:', error)
      process.exit(1)
    }

    if (!tenants || tenants.length === 0) {
      console.log('❌ 没有找到任何租户')
      return
    }

    console.log(`✅ 找到 ${tenants.length} 个租户：\n`)

    for (let i = 0; i < tenants.length; i++) {
      const tenant = tenants[i]
      console.log(`${i + 1}. ${tenant.name || '未命名'}`)
      console.log(`   ID: ${tenant.id}`)
      console.log(`   手机号: ${tenant.phone || '未设置'}`)
      console.log(`   邮箱: ${tenant.email || '未设置'}`)
      console.log(`   公司: ${tenant.company_name || '未设置'}`)
      console.log(`   创建时间: ${tenant.created_at}`)

      // 统计该租户下的用户数量
      const {data: managers} = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'manager')
        .eq('boss_id', tenant.id)

      const {data: drivers} = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'driver')
        .eq('boss_id', tenant.id)

      const {data: peerAccounts} = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'super_admin')
        .eq('main_account_id', tenant.id)

      console.log(`   车队长: ${managers?.length || 0} 名`)
      console.log(`   司机: ${drivers?.length || 0} 名`)
      console.log(`   平级账号: ${peerAccounts?.length || 0} 个`)
      console.log('')
    }

    console.log('========================================')
  } catch (error) {
    console.error('❌ 查询过程中发生错误:', error)
    process.exit(1)
  }
}

// 执行查询
listTenants()
