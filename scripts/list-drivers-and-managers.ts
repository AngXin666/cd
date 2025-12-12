/**
 * 查询所有司机和车队长
 * 列出详细的账号信息
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

async function listDriversAndManagers() {
  console.log('========================================')
  console.log('📋 查询所有司机和车队长')
  console.log('========================================\n')

  try {
    // 1. 查询所有车队长
    console.log('🔍 查询车队长...\n')
    const {data: managers, error: managersError} = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'manager')
      .order('created_at', {ascending: true})

    if (managersError) {
      console.error('❌ 查询车队长失败:', managersError)
      process.exit(1)
    }

    if (!managers || managers.length === 0) {
      console.log('❌ 数据库中没有车队长\n')
    } else {
      console.log('✅ 找到 ' + managers.length + ' 名车队长：\n')
      
      for (let i = 0; i < managers.length; i++) {
        const manager = managers[i]
        console.log('【车队长 ' + (i + 1) + '】')
        console.log('  姓名：' + (manager.name || '未设置'))
        console.log('  手机号：' + (manager.phone || '未设置'))
        console.log('  邮箱：' + (manager.email || '未设置'))
        console.log('  登录账号：' + (manager.login_account || '未设置'))
        console.log('  用户ID：' + manager.id)
        console.log('  所属租户ID：' + (manager.boss_id || '未设置'))
        console.log('  账号状态：' + (manager.status || '未设置'))
        console.log('  创建时间：' + manager.created_at)
        
        // 查询所属租户信息
        if (manager.boss_id) {
          const {data: boss} = await supabase
            .from('profiles')
            .select('name, phone, company_name')
            .eq('id', manager.boss_id)
            .maybeSingle()
          
          if (boss) {
            console.log('  所属租户：' + (boss.name || '未命名') + ' (' + (boss.phone || '无手机号') + ')')
            if (boss.company_name) {
              console.log('  所属公司：' + boss.company_name)
            }
          }
        }
        console.log('')
      }
    }

    // 2. 查询所有司机
    console.log('========================================')
    console.log('🔍 查询司机...\n')
    const {data: drivers, error: driversError} = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'driver')
      .order('created_at', {ascending: true})

    if (driversError) {
      console.error('❌ 查询司机失败:', driversError)
      process.exit(1)
    }

    if (!drivers || drivers.length === 0) {
      console.log('❌ 数据库中没有司机\n')
    } else {
      console.log('✅ 找到 ' + drivers.length + ' 名司机：\n')
      
      for (let i = 0; i < drivers.length; i++) {
        const driver = drivers[i]
        console.log('【司机 ' + (i + 1) + '】')
        console.log('  姓名：' + (driver.name || '未设置'))
        console.log('  手机号：' + (driver.phone || '未设置'))
        console.log('  邮箱：' + (driver.email || '未设置'))
        console.log('  登录账号：' + (driver.login_account || '未设置'))
        console.log('  用户ID：' + driver.id)
        console.log('  所属租户ID：' + (driver.boss_id || '未设置'))
        console.log('  司机类型：' + (driver.driver_type || '未设置'))
        console.log('  车牌号：' + (driver.vehicle_plate || '未设置'))
        console.log('  账号状态：' + (driver.status || '未设置'))
        console.log('  入职日期：' + (driver.join_date || '未设置'))
        console.log('  创建时间：' + driver.created_at)
        
        // 查询所属租户信息
        if (driver.boss_id) {
          const {data: boss} = await supabase
            .from('profiles')
            .select('name, phone, company_name')
            .eq('id', driver.boss_id)
            .maybeSingle()
          
          if (boss) {
            console.log('  所属租户：' + (boss.name || '未命名') + ' (' + (boss.phone || '无手机号') + ')')
            if (boss.company_name) {
              console.log('  所属公司：' + boss.company_name)
            }
          }
        }
        console.log('')
      }
    }

    // 3. 统计信息
    console.log('========================================')
    console.log('📊 统计信息')
    console.log('========================================')
    console.log('车队长总数：' + (managers?.length || 0) + ' 名')
    console.log('司机总数：' + (drivers?.length || 0) + ' 名')
    console.log('合计：' + ((managers?.length || 0) + (drivers?.length || 0)) + ' 名')
    
    // 按租户分组统计
    console.log('\n按租户分组统计：')
    
    const allUsers = [...(managers || []), ...(drivers || [])]
    const bossIdMap = new Map<string, {managers: number; drivers: number; bossInfo: any}>()
    
    for (const user of allUsers) {
      const bossId = user.boss_id || 'null'
      if (!bossIdMap.has(bossId)) {
        bossIdMap.set(bossId, {managers: 0, drivers: 0, bossInfo: null})
      }
      
      const stats = bossIdMap.get(bossId)!
      if (user.role === 'manager') {
        stats.managers++
      } else if (user.role === 'driver') {
        stats.drivers++
      }
      
      // 获取租户信息
      if (bossId !== 'null' && !stats.bossInfo) {
        const {data: boss} = await supabase
          .from('profiles')
          .select('name, phone, company_name')
          .eq('id', bossId)
          .maybeSingle()
        stats.bossInfo = boss
      }
    }
    
    let index = 1
    for (const [bossId, stats] of bossIdMap.entries()) {
      if (bossId === 'null') {
        console.log('\n' + index + '. 未分配租户')
      } else {
        const bossName = stats.bossInfo?.name || '未命名'
        const bossPhone = stats.bossInfo?.phone || '无手机号'
        const companyName = stats.bossInfo?.company_name || ''
        console.log('\n' + index + '. ' + bossName + ' (' + bossPhone + ')')
        if (companyName) {
          console.log('   公司：' + companyName)
        }
      }
      console.log('   车队长：' + stats.managers + ' 名')
      console.log('   司机：' + stats.drivers + ' 名')
      console.log('   小计：' + (stats.managers + stats.drivers) + ' 名')
      index++
    }
    
    console.log('\n========================================')
    
  } catch (error) {
    console.error('❌ 查询过程中发生错误:', error)
    process.exit(1)
  }
}

// 执行查询
listDriversAndManagers()
