/**
 * 检查系统中所有租户及其下属用户
 * 显示每个租户下的车队长和司机账号
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

interface Profile {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  role: string
  boss_id: string | null
  main_account_id: string | null
  company_name: string | null
  created_at: string
}

async function checkTenantUsers() {
  console.log('========================================')
  console.log('📋 检查系统中的所有租户及其用户')
  console.log('========================================\n')

  try {
    // 1. 查询所有主账号（租户）
    console.log('步骤 1：查询所有租户（主账号）...\n')
    const {data: tenants, error: tenantsError} = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'super_admin')
      .is('main_account_id', null)
      .order('created_at', {ascending: true})

    if (tenantsError) {
      console.error('❌ 查询租户失败:', tenantsError)
      process.exit(1)
    }

    if (!tenants || tenants.length === 0) {
      console.log('❌ 系统中没有任何租户')
      console.log('提示：请先创建租户账号（role = super_admin, main_account_id = NULL）')
      console.log('========================================')
      return
    }

    console.log('✅ 找到 ' + tenants.length + ' 个租户\n')
    console.log('========================================\n')

    // 2. 遍历每个租户，查询其下属用户
    let totalManagers = 0
    let totalDrivers = 0

    for (let i = 0; i < tenants.length; i++) {
      const tenant = tenants[i]
      console.log('租户 ' + (i + 1) + '：' + (tenant.name || '未命名'))
      console.log('─'.repeat(60))
      console.log('📱 手机号：' + (tenant.phone || '未设置'))
      console.log('📧 邮箱：' + (tenant.email || '未设置'))
      console.log('🏢 公司：' + (tenant.company_name || '未设置'))
      console.log('🆔 租户ID：' + tenant.id)
      console.log('📅 创建时间：' + tenant.created_at)
      console.log('')

      // 查询该租户下的平级账号
      const {data: peerAccounts} = await supabase
        .from('profiles')
        .select('id, name, phone, email, role, created_at')
        .eq('role', 'super_admin')
        .eq('main_account_id', tenant.id)
        .order('created_at', {ascending: true})

      if (peerAccounts && peerAccounts.length > 0) {
        console.log('👥 平级账号（' + peerAccounts.length + ' 个）：')
        peerAccounts.forEach((peer, index) => {
          console.log('   ' + (index + 1) + '. ' + (peer.name || '未命名'))
          console.log('      手机号：' + (peer.phone || '未设置'))
          console.log('      邮箱：' + (peer.email || '未设置'))
          console.log('      创建时间：' + peer.created_at)
        })
        console.log('')
      }

      // 查询该租户下的车队长
      const {data: managers} = await supabase
        .from('profiles')
        .select('id, name, phone, email, role, created_at')
        .eq('role', 'manager')
        .eq('boss_id', tenant.id)
        .order('created_at', {ascending: true})

      console.log('👔 车队长（' + (managers?.length || 0) + ' 名）：')
      if (managers && managers.length > 0) {
        managers.forEach((manager, index) => {
          console.log('   ' + (index + 1) + '. ' + (manager.name || '未命名'))
          console.log('      手机号：' + (manager.phone || '未设置'))
          console.log('      邮箱：' + (manager.email || '未设置'))
          console.log('      创建时间：' + manager.created_at)
        })
        totalManagers += managers.length
      } else {
        console.log('   （无）')
      }
      console.log('')

      // 查询该租户下的司机
      const {data: drivers} = await supabase
        .from('profiles')
        .select('id, name, phone, email, role, created_at')
        .eq('role', 'driver')
        .eq('boss_id', tenant.id)
        .order('created_at', {ascending: true})

      console.log('🚗 司机（' + (drivers?.length || 0) + ' 名）：')
      if (drivers && drivers.length > 0) {
        // 如果司机数量较多，只显示前10个
        const displayDrivers = drivers.slice(0, 10)
        displayDrivers.forEach((driver, index) => {
          console.log('   ' + (index + 1) + '. ' + (driver.name || '未命名'))
          console.log('      手机号：' + (driver.phone || '未设置'))
          console.log('      邮箱：' + (driver.email || '未设置'))
          console.log('      创建时间：' + driver.created_at)
        })
        
        if (drivers.length > 10) {
          console.log('   ... 还有 ' + (drivers.length - 10) + ' 名司机（省略显示）')
        }
        
        totalDrivers += drivers.length
      } else {
        console.log('   （无）')
      }
      console.log('')

      // 查询该租户下没有 boss_id 的用户（可能是数据异常）
      const {data: orphanUsers} = await supabase
        .from('profiles')
        .select('id, name, phone, role')
        .in('role', ['manager', 'driver'])
        .is('boss_id', null)

      if (orphanUsers && orphanUsers.length > 0) {
        console.log('⚠️  警告：发现 ' + orphanUsers.length + ' 个没有 boss_id 的用户（数据异常）：')
        orphanUsers.forEach((user, index) => {
          console.log('   ' + (index + 1) + '. ' + (user.name || '未命名') + ' (' + user.role + ')')
          console.log('      手机号：' + (user.phone || '未设置'))
        })
        console.log('')
      }

      console.log('========================================\n')
    }

    // 3. 显示总体统计
    console.log('📊 总体统计')
    console.log('─'.repeat(60))
    console.log('租户总数：' + tenants.length + ' 个')
    console.log('车队长总数：' + totalManagers + ' 名')
    console.log('司机总数：' + totalDrivers + ' 名')
    console.log('用户总数：' + (tenants.length + totalManagers + totalDrivers) + ' 名')
    console.log('========================================')

    // 4. 检查是否有没有归属的用户
    console.log('\n步骤 2：检查没有归属的用户...\n')
    
    const {data: orphanManagers} = await supabase
      .from('profiles')
      .select('id, name, phone, email, role, boss_id')
      .eq('role', 'manager')
      .is('boss_id', null)

    const {data: orphanDrivers} = await supabase
      .from('profiles')
      .select('id, name, phone, email, role, boss_id')
      .eq('role', 'driver')
      .is('boss_id', null)

    const orphanCount = (orphanManagers?.length || 0) + (orphanDrivers?.length || 0)

    if (orphanCount > 0) {
      console.log('⚠️  发现 ' + orphanCount + ' 个没有归属租户的用户：\n')
      
      if (orphanManagers && orphanManagers.length > 0) {
        console.log('车队长（' + orphanManagers.length + ' 名）：')
        orphanManagers.forEach((manager, index) => {
          console.log('   ' + (index + 1) + '. ' + (manager.name || '未命名'))
          console.log('      手机号：' + (manager.phone || '未设置'))
          console.log('      邮箱：' + (manager.email || '未设置'))
          console.log('      boss_id：NULL（需要分配）')
        })
        console.log('')
      }

      if (orphanDrivers && orphanDrivers.length > 0) {
        console.log('司机（' + orphanDrivers.length + ' 名）：')
        orphanDrivers.forEach((driver, index) => {
          console.log('   ' + (index + 1) + '. ' + (driver.name || '未命名'))
          console.log('      手机号：' + (driver.phone || '未设置'))
          console.log('      邮箱：' + (driver.email || '未设置'))
          console.log('      boss_id：NULL（需要分配）')
        })
        console.log('')
      }

      console.log('💡 提示：这些用户需要分配到某个租户下')
      console.log('可以使用迁移脚本将这些用户分配到指定租户：')
      console.log('npx tsx scripts/migrate-users-flexible.ts [目标租户手机号]')
    } else {
      console.log('✅ 所有用户都已正确归属到租户')
    }

    console.log('\n========================================')
    console.log('✅ 检查完成！')
    console.log('========================================')

  } catch (error) {
    console.error('\n❌ 检查过程中发生错误:', error)
    process.exit(1)
  }
}

// 执行检查
checkTenantUsers()
