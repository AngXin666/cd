/**
 * 查询所有账号
 * 包括所有角色：super_admin、manager、driver、lease_admin
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

// 角色中文名称映射
const roleNameMap: Record<string, string> = {
  super_admin: '老板账号',
  manager: '车队长',
  driver: '司机',
  lease_admin: '租赁管理员'
}

async function listAllAccounts() {
  console.log('========================================')
  console.log('📋 查询所有账号')
  console.log('========================================\n')

  try {
    // 查询所有用户
    const {data: users, error} = await supabase
      .from('profiles')
      .select('*')
      .order('role', {ascending: true})
      .order('created_at', {ascending: true})

    if (error) {
      console.error('❌ 查询失败:', error)
      process.exit(1)
    }

    if (!users || users.length === 0) {
      console.log('❌ 数据库中没有任何账号')
      console.log('\n提示：')
      console.log('1. 请先注册账号（通过小程序或管理后台）')
      console.log('2. 第一个注册的账号会自动成为老板账号（super_admin）')
      console.log('3. 老板账号可以添加车队长和司机')
      console.log('')
      return
    }

    console.log('✅ 找到 ' + users.length + ' 个账号\n')

    // 按角色分组
    const roleGroups = new Map<string, any[]>()
    users.forEach((user) => {
      if (!roleGroups.has(user.role)) {
        roleGroups.set(user.role, [])
      }
      roleGroups.get(user.role)!.push(user)
    })

    // 显示统计信息
    console.log('📊 角色统计：')
    for (const [role, userList] of roleGroups.entries()) {
      const roleName = roleNameMap[role] || role
      console.log('  ' + roleName + '：' + userList.length + ' 名')
    }
    console.log('')

    // 按角色显示详细信息
    let globalIndex = 1
    for (const [role, userList] of roleGroups.entries()) {
      const roleName = roleNameMap[role] || role
      console.log('========================================')
      console.log('【' + roleName + '】共 ' + userList.length + ' 名')
      console.log('========================================\n')

      for (let i = 0; i < userList.length; i++) {
        const user = userList[i]
        console.log(globalIndex + '. ' + (user.name || '未命名'))
        console.log('   角色：' + roleName)
        console.log('   手机号：' + (user.phone || '未设置'))
        console.log('   邮箱：' + (user.email || '未设置'))
        console.log('   登录账号：' + (user.login_account || '未设置'))
        console.log('   用户ID：' + user.id)
        
        // 老板账号特有信息
        if (role === 'super_admin') {
          console.log('   公司名称：' + (user.company_name || '未设置'))
          console.log('   账号类型：' + (user.main_account_id === null ? '主账号' : '平级账号'))
          if (user.main_account_id) {
            console.log('   主账号ID：' + user.main_account_id)
          }
          console.log('   租赁开始日期：' + (user.lease_start_date || '未设置'))
          console.log('   租赁结束日期：' + (user.lease_end_date || '未设置'))
          console.log('   月租费用：' + (user.monthly_fee ? user.monthly_fee + ' 元' : '未设置'))
        }
        
        // 车队长和司机的租户信息
        if (role === 'manager' || role === 'driver') {
          console.log('   所属租户ID：' + (user.boss_id || '未设置'))
          
          if (user.boss_id) {
            const {data: boss} = await supabase
              .from('profiles')
              .select('name, phone, company_name')
              .eq('id', user.boss_id)
              .maybeSingle()
            
            if (boss) {
              console.log('   所属租户：' + (boss.name || '未命名') + ' (' + (boss.phone || '无手机号') + ')')
              if (boss.company_name) {
                console.log('   所属公司：' + boss.company_name)
              }
            }
          }
        }
        
        // 司机特有信息
        if (role === 'driver') {
          console.log('   司机类型：' + (user.driver_type || '未设置'))
          console.log('   车牌号：' + (user.vehicle_plate || '未设置'))
          console.log('   入职日期：' + (user.join_date || '未设置'))
        }
        
        // 通用信息
        console.log('   账号状态：' + (user.status || '未设置'))
        console.log('   创建时间：' + user.created_at)
        
        if (user.notes) {
          console.log('   备注：' + user.notes)
        }
        
        console.log('')
        globalIndex++
      }
    }

    // 按租户分组统计
    console.log('========================================')
    console.log('📊 按租户分组统计')
    console.log('========================================\n')
    
    const bossIdMap = new Map<string, {
      superAdmins: number
      managers: number
      drivers: number
      bossInfo: any
    }>()
    
    for (const user of users) {
      if (user.role === 'super_admin' && user.main_account_id === null) {
        // 这是主账号，统计其下的用户
        const bossId = user.id
        if (!bossIdMap.has(bossId)) {
          bossIdMap.set(bossId, {
            superAdmins: 0,
            managers: 0,
            drivers: 0,
            bossInfo: user
          })
        }
        
        // 统计平级账号
        const peerAccounts = users.filter(
          (u) => u.role === 'super_admin' && u.main_account_id === bossId
        )
        bossIdMap.get(bossId)!.superAdmins = peerAccounts.length
        
        // 统计车队长
        const managers = users.filter((u) => u.role === 'manager' && u.boss_id === bossId)
        bossIdMap.get(bossId)!.managers = managers.length
        
        // 统计司机
        const drivers = users.filter((u) => u.role === 'driver' && u.boss_id === bossId)
        bossIdMap.get(bossId)!.drivers = drivers.length
      }
    }
    
    // 统计未分配租户的用户
    const unassignedManagers = users.filter((u) => u.role === 'manager' && !u.boss_id)
    const unassignedDrivers = users.filter((u) => u.role === 'driver' && !u.boss_id)
    
    if (bossIdMap.size === 0 && unassignedManagers.length === 0 && unassignedDrivers.length === 0) {
      console.log('暂无租户数据\n')
    } else {
      let index = 1
      for (const [bossId, stats] of bossIdMap.entries()) {
        const bossName = stats.bossInfo?.name || '未命名'
        const bossPhone = stats.bossInfo?.phone || '无手机号'
        const companyName = stats.bossInfo?.company_name || ''
        
        console.log(index + '. 租户：' + bossName + ' (' + bossPhone + ')')
        if (companyName) {
          console.log('   公司：' + companyName)
        }
        console.log('   主账号：1 个')
        console.log('   平级账号：' + stats.superAdmins + ' 个')
        console.log('   车队长：' + stats.managers + ' 名')
        console.log('   司机：' + stats.drivers + ' 名')
        console.log('   小计：' + (1 + stats.superAdmins + stats.managers + stats.drivers) + ' 个账号')
        console.log('')
        index++
      }
      
      if (unassignedManagers.length > 0 || unassignedDrivers.length > 0) {
        console.log(index + '. 未分配租户')
        console.log('   车队长：' + unassignedManagers.length + ' 名')
        console.log('   司机：' + unassignedDrivers.length + ' 名')
        console.log('   小计：' + (unassignedManagers.length + unassignedDrivers.length) + ' 个账号')
        console.log('')
      }
    }

    console.log('========================================')
    console.log('✅ 查询完成')
    console.log('========================================')
    
  } catch (error) {
    console.error('❌ 查询过程中发生错误:', error)
    process.exit(1)
  }
}

// 执行查询
listAllAccounts()
