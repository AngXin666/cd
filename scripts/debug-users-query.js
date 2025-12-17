/**
 * 调试脚本：检查用户查询
 * 用于诊断老板端无法读取调度账号的问题
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('=== 调试用户查询 ===\n')

// 使用 service role key 绕过 RLS
const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey)

async function debugUsersQuery() {
  try {
    // 1. 查询所有用户
    console.log('1. 查询所有用户...')
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, name, phone, role, main_account_id')
      .order('role')

    if (allUsersError) {
      console.error('查询所有用户失败:', allUsersError)
      return
    }

    console.log(`   找到 ${allUsers.length} 个用户\n`)

    // 2. 按角色分组显示
    console.log('2. 按角色分组:')
    const roleGroups = {}
    for (const user of allUsers) {
      const role = user.role || 'NULL'
      if (!roleGroups[role]) {
        roleGroups[role] = []
      }
      roleGroups[role].push(user)
    }

    for (const [role, users] of Object.entries(roleGroups)) {
      console.log(`\n   ${role} (${users.length} 个):`)
      for (const user of users) {
        console.log(`   - ${user.name} (${user.phone}) [ID: ${user.id.substring(0, 8)}...] main_account_id: ${user.main_account_id || 'NULL'}`)
      }
    }

    // 3. 特别检查 PEER_ADMIN 角色
    console.log('\n3. 检查 PEER_ADMIN 角色用户:')
    const peerAdmins = allUsers.filter(u => u.role === 'PEER_ADMIN')
    if (peerAdmins.length === 0) {
      console.log('   ⚠️ 没有找到 PEER_ADMIN 角色的用户！')
    } else {
      console.log(`   找到 ${peerAdmins.length} 个 PEER_ADMIN 用户:`)
      for (const user of peerAdmins) {
        console.log(`   - ${user.name} (${user.phone})`)
      }
    }

    // 4. 检查 BOSS 角色
    console.log('\n4. 检查 BOSS 角色用户:')
    const bosses = allUsers.filter(u => u.role === 'BOSS')
    if (bosses.length === 0) {
      console.log('   ⚠️ 没有找到 BOSS 角色的用户！')
    } else {
      console.log(`   找到 ${bosses.length} 个 BOSS 用户:`)
      for (const user of bosses) {
        console.log(`   - ${user.name} (${user.phone})`)
      }
    }

    // 5. 检查 RLS 策略
    console.log('\n5. 检查 users 表的 RLS 策略...')
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'users' })
      .maybeSingle()

    if (policiesError) {
      // 如果 RPC 不存在，尝试直接查询
      console.log('   无法通过 RPC 查询策略，尝试直接查询...')
      
      // 使用普通 anon key 测试查询
      const anonSupabase = createClient(supabaseUrl, supabaseKey)
      const { data: anonUsers, error: anonError } = await anonSupabase
        .from('users')
        .select('id, name, role')
      
      if (anonError) {
        console.log(`   ⚠️ 使用 anon key 查询失败: ${anonError.message}`)
        console.log('   这可能是 RLS 策略阻止了查询')
      } else {
        console.log(`   使用 anon key 可以查询到 ${anonUsers?.length || 0} 个用户`)
      }
    }

    console.log('\n=== 调试完成 ===')

  } catch (error) {
    console.error('调试过程出错:', error)
  }
}

debugUsersQuery()
