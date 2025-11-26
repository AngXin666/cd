/**
 * 详细检查数据库中的所有用户
 * 包括租户、车队长、司机以及孤立用户
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
  status: string | null
  created_at: string
}

async function checkAllUsersDetailed() {
  console.log('========================================')
  console.log('📋 详细检查数据库中的所有用户')
  console.log('========================================\n')

  try {
    // 1. 查询所有用户
    console.log('步骤 1：查询所有用户...\n')
    const {data: allUsers, error: allUsersError} = await supabase
      .from('profiles')
      .select('*')
      .order('role', {ascending: true})
      .order('created_at', {ascending: true})

    if (allUsersError) {
      console.error('❌ 查询用户失败:', allUsersError)
      process.exit(1)
    }

    if (!allUsers || allUsers.length === 0) {
      console.log('❌ 数据库中没有任何用户')
      console.log('提示：请先注册用户账号')
      console.log('========================================')
      return
    }

    console.log('✅ 数据库中共有 ' + allUsers.length + ' 个用户\n')

    // 2. 按角色分组统计
    const roleStats: Record<string, number> = {}
    allUsers.forEach((user) => {
      roleStats[user.role] = (roleStats[user.role] || 0) + 1
    })

    console.log('📊 角色统计：')
    console.log('─'.repeat(60))
    Object.entries(roleStats).forEach(([role, count]) => {
      let roleName = role
      switch (role) {
        case 'super_admin':
          roleName = '老板账号'
          break
        case 'manager':
          roleName = '车队长'
          break
        case 'driver':
          roleName = '司机'
          break
        case 'lease_admin':
          roleName = '租赁管理员'
          break
      }
      console.log('   ' + roleName + '（' + role + '）：' + count + ' 名')
    })
    console.log('')

    // 3. 查询所有租户（主账号）
    console.log('========================================')
    console.log('步骤 2：查询所有租户（主账号）...\n')
    
    const tenants = allUsers.filter(
      (user) => user.role === 'super_admin' && user.main_account_id === null
    )

    if (tenants.length === 0) {
      console.log('❌ 没有找到任何租户（主账号）')
      console.log('提示：租户的特征是 role = super_admin 且 main_account_id = NULL\n')
    } else {
      console.log('✅ 找到 ' + tenants.length + ' 个租户（主账号）\n')

      // 遍历每个租户
      for (let i = 0; i < tenants.length; i++) {
        const tenant = tenants[i]
        console.log('租户 ' + (i + 1) + '：' + (tenant.name || '未命名'))
        console.log('─'.repeat(60))
        console.log('🆔 ID：' + tenant.id)
        console.log('📱 手机号：' + (tenant.phone || '未设置'))
        console.log('📧 邮箱：' + (tenant.email || '未设置'))
        console.log('🏢 公司：' + (tenant.company_name || '未设置'))
        console.log('📊 状态：' + (tenant.status || '未设置'))
        console.log('📅 创建时间：' + tenant.created_at)
        console.log('')

        // 查询平级账号
        const peerAccounts = allUsers.filter(
          (user) => user.role === 'super_admin' && user.main_account_id === tenant.id
        )

        if (peerAccounts.length > 0) {
          console.log('👥 平级账号（' + peerAccounts.length + ' 个）：')
          peerAccounts.forEach((peer, index) => {
            console.log('   ' + (index + 1) + '. ' + (peer.name || '未命名'))
            console.log('      ID：' + peer.id)
            console.log('      手机号：' + (peer.phone || '未设置'))
            console.log('      邮箱：' + (peer.email || '未设置'))
          })
          console.log('')
        }

        // 查询车队长
        const managers = allUsers.filter(
          (user) => user.role === 'manager' && user.boss_id === tenant.id
        )

        console.log('👔 车队长（' + managers.length + ' 名）：')
        if (managers.length > 0) {
          managers.forEach((manager, index) => {
            console.log('   ' + (index + 1) + '. ' + (manager.name || '未命名'))
            console.log('      ID：' + manager.id)
            console.log('      手机号：' + (manager.phone || '未设置'))
            console.log('      邮箱：' + (manager.email || '未设置'))
          })
        } else {
          console.log('   （无）')
        }
        console.log('')

        // 查询司机
        const drivers = allUsers.filter(
          (user) => user.role === 'driver' && user.boss_id === tenant.id
        )

        console.log('🚗 司机（' + drivers.length + ' 名）：')
        if (drivers.length > 0) {
          const displayDrivers = drivers.slice(0, 10)
          displayDrivers.forEach((driver, index) => {
            console.log('   ' + (index + 1) + '. ' + (driver.name || '未命名'))
            console.log('      ID：' + driver.id)
            console.log('      手机号：' + (driver.phone || '未设置'))
            console.log('      邮箱：' + (driver.email || '未设置'))
          })

          if (drivers.length > 10) {
            console.log('   ... 还有 ' + (drivers.length - 10) + ' 名司机（省略显示）')
          }
        } else {
          console.log('   （无）')
        }
        console.log('')
        console.log('小计：车队长 ' + managers.length + ' 名，司机 ' + drivers.length + ' 名')
        console.log('========================================\n')
      }
    }

    // 4. 查询平级账号（所有）
    console.log('步骤 3：查询所有平级账号...\n')
    const peerAccounts = allUsers.filter(
      (user) => user.role === 'super_admin' && user.main_account_id !== null
    )

    if (peerAccounts.length > 0) {
      console.log('✅ 找到 ' + peerAccounts.length + ' 个平级账号\n')
      peerAccounts.forEach((peer, index) => {
        console.log((index + 1) + '. ' + (peer.name || '未命名'))
        console.log('   ID：' + peer.id)
        console.log('   手机号：' + (peer.phone || '未设置'))
        console.log('   主账号ID：' + peer.main_account_id)
        
        // 查找主账号信息
        const mainAccount = allUsers.find((u) => u.id === peer.main_account_id)
        if (mainAccount) {
          console.log('   主账号：' + (mainAccount.name || '未命名') + ' (' + (mainAccount.phone || '无手机号') + ')')
        }
        console.log('')
      })
    } else {
      console.log('❌ 没有找到任何平级账号\n')
    }

    // 5. 查询没有归属的车队长
    console.log('========================================')
    console.log('步骤 4：查询没有归属的车队长...\n')
    
    const orphanManagers = allUsers.filter(
      (user) => user.role === 'manager' && user.boss_id === null
    )

    if (orphanManagers.length > 0) {
      console.log('⚠️  发现 ' + orphanManagers.length + ' 名没有归属租户的车队长：\n')
      orphanManagers.forEach((manager, index) => {
        console.log((index + 1) + '. ' + (manager.name || '未命名'))
        console.log('   ID：' + manager.id)
        console.log('   手机号：' + (manager.phone || '未设置'))
        console.log('   邮箱：' + (manager.email || '未设置'))
        console.log('   boss_id：NULL（需要分配到某个租户）')
        console.log('')
      })
      console.log('💡 提示：使用迁移脚本将这些车队长分配到指定租户')
      console.log('npx tsx scripts/migrate-users-flexible.ts [目标租户手机号]\n')
    } else {
      console.log('✅ 所有车队长都已正确归属到租户\n')
    }

    // 6. 查询没有归属的司机
    console.log('========================================')
    console.log('步骤 5：查询没有归属的司机...\n')
    
    const orphanDrivers = allUsers.filter(
      (user) => user.role === 'driver' && user.boss_id === null
    )

    if (orphanDrivers.length > 0) {
      console.log('⚠️  发现 ' + orphanDrivers.length + ' 名没有归属租户的司机：\n')
      
      const displayOrphanDrivers = orphanDrivers.slice(0, 10)
      displayOrphanDrivers.forEach((driver, index) => {
        console.log((index + 1) + '. ' + (driver.name || '未命名'))
        console.log('   ID：' + driver.id)
        console.log('   手机号：' + (driver.phone || '未设置'))
        console.log('   邮箱：' + (driver.email || '未设置'))
        console.log('   boss_id：NULL（需要分配到某个租户）')
        console.log('')
      })

      if (orphanDrivers.length > 10) {
        console.log('... 还有 ' + (orphanDrivers.length - 10) + ' 名司机（省略显示）\n')
      }

      console.log('💡 提示：使用迁移脚本将这些司机分配到指定租户')
      console.log('npx tsx scripts/migrate-users-flexible.ts [目标租户手机号]\n')
    } else {
      console.log('✅ 所有司机都已正确归属到租户\n')
    }

    // 7. 总结
    console.log('========================================')
    console.log('📊 检查总结')
    console.log('========================================')
    console.log('用户总数：' + allUsers.length + ' 名')
    console.log('租户（主账号）：' + tenants.length + ' 个')
    console.log('平级账号：' + peerAccounts.length + ' 个')
    console.log('车队长总数：' + (roleStats['manager'] || 0) + ' 名')
    console.log('  - 已归属：' + ((roleStats['manager'] || 0) - orphanManagers.length) + ' 名')
    console.log('  - 未归属：' + orphanManagers.length + ' 名')
    console.log('司机总数：' + (roleStats['driver'] || 0) + ' 名')
    console.log('  - 已归属：' + ((roleStats['driver'] || 0) - orphanDrivers.length) + ' 名')
    console.log('  - 未归属：' + orphanDrivers.length + ' 名')
    console.log('========================================')

    // 8. 建议
    if (orphanManagers.length > 0 || orphanDrivers.length > 0) {
      console.log('\n💡 建议操作：')
      console.log('1. 确认目标租户（使用 list-tenants.ts 查看所有租户）')
      console.log('2. 执行迁移脚本将未归属用户分配到目标租户：')
      console.log('   npx tsx scripts/migrate-users-flexible.ts [目标租户手机号]')
      console.log('========================================')
    }

    console.log('\n✅ 检查完成！')
    console.log('========================================')

  } catch (error) {
    console.error('\n❌ 检查过程中发生错误:', error)
    process.exit(1)
  }
}

// 执行检查
checkAllUsersDetailed()
