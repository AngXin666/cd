/**
 * 用户迁移脚本
 * 将所有租户下的车队长和司机迁移到目标租户（手机号：13800000001）
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
  role: string
  boss_id: string | null
  main_account_id: string | null
}

async function migrateUsers() {
  console.log('========================================')
  console.log('🚀 开始用户迁移')
  console.log('========================================')

  try {
    // 1. 查询目标租户（手机号 13800000001）
    console.log('\n📋 步骤 1：查询目标租户...')
    const {data: targetBoss, error: targetError} = await supabase
      .from('profiles')
      .select('id, name, phone, role, boss_id, main_account_id')
      .eq('phone', '13800000001')
      .eq('role', 'super_admin')
      .is('main_account_id', null)
      .maybeSingle()

    if (targetError || !targetBoss) {
      console.error('❌ 未找到手机号为 13800000001 的租户（主账号）')
      console.error('错误信息:', targetError)
      process.exit(1)
    }

    console.log(`✅ 找到目标租户：${targetBoss.name} (ID: ${targetBoss.id})`)
    console.log(`   手机号：${targetBoss.phone}`)

    // 2. 统计需要迁移的用户
    console.log('\n📊 步骤 2：统计需要迁移的用户...')

    // 查询所有车队长（排除已经在目标租户下的）
    const {data: managers, error: managersError} = await supabase
      .from('profiles')
      .select('id, name, phone, role, boss_id')
      .eq('role', 'manager')
      .or(`boss_id.is.null,boss_id.neq.${targetBoss.id}`)

    if (managersError) {
      console.error('❌ 查询车队长失败:', managersError)
      process.exit(1)
    }

    console.log(`   需要迁移的车队长：${managers?.length || 0} 名`)
    if (managers && managers.length > 0) {
      console.log('   车队长列表：')
      managers.forEach((m, index) => {
        console.log(`     ${index + 1}. ${m.name || '未命名'} (${m.phone || '无手机号'})`)
      })
    }

    // 查询所有司机（排除已经在目标租户下的）
    const {data: drivers, error: driversError} = await supabase
      .from('profiles')
      .select('id, name, phone, role, boss_id')
      .eq('role', 'driver')
      .or(`boss_id.is.null,boss_id.neq.${targetBoss.id}`)

    if (driversError) {
      console.error('❌ 查询司机失败:', driversError)
      process.exit(1)
    }

    console.log(`   需要迁移的司机：${drivers?.length || 0} 名`)

    // 如果没有需要迁移的用户，直接返回
    const totalToMigrate = (managers?.length || 0) + (drivers?.length || 0)
    if (totalToMigrate === 0) {
      console.log('\n✅ 没有需要迁移的用户')
      console.log('========================================')
      return
    }

    console.log(`\n📦 总计需要迁移：${totalToMigrate} 名用户`)

    // 3. 执行迁移
    console.log('\n🚀 步骤 3：开始迁移用户...')

    let migratedCount = 0

    // 迁移车队长
    if (managers && managers.length > 0) {
      console.log(`\n   迁移车队长 (${managers.length} 名)...`)
      for (const manager of managers) {
        const {error: updateError} = await supabase
          .from('profiles')
          .update({
            boss_id: targetBoss.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', manager.id)

        if (updateError) {
          console.error(`   ❌ 迁移车队长 ${manager.name} 失败:`, updateError)
        } else {
          migratedCount++
          console.log(`   ✅ 已迁移：${manager.name || '未命名'} (${manager.phone || '无手机号'})`)
        }
      }
    }

    // 迁移司机
    if (drivers && drivers.length > 0) {
      console.log(`\n   迁移司机 (${drivers.length} 名)...`)
      for (const driver of drivers) {
        const {error: updateError} = await supabase
          .from('profiles')
          .update({
            boss_id: targetBoss.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', driver.id)

        if (updateError) {
          console.error(`   ❌ 迁移司机 ${driver.name} 失败:`, updateError)
        } else {
          migratedCount++
          // 只显示前10个司机的详细信息，避免输出过多
          if (migratedCount <= 10) {
            console.log(`   ✅ 已迁移：${driver.name || '未命名'} (${driver.phone || '无手机号'})`)
          }
        }
      }

      if (drivers.length > 10) {
        console.log(`   ... 还有 ${drivers.length - 10} 名司机已迁移`)
      }
    }

    // 4. 验证迁移结果
    console.log('\n📊 步骤 4：验证迁移结果...')

    const {data: finalManagers, error: finalManagersError} = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'manager')
      .eq('boss_id', targetBoss.id)

    const {data: finalDrivers, error: finalDriversError} = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'driver')
      .eq('boss_id', targetBoss.id)

    if (finalManagersError || finalDriversError) {
      console.error('❌ 验证迁移结果失败')
      process.exit(1)
    }

    console.log('\n========================================')
    console.log('✅ 迁移完成！')
    console.log('========================================')
    console.log(`目标租户：${targetBoss.name} (${targetBoss.phone})`)
    console.log(`成功迁移：${migratedCount} 名用户`)
    console.log(`当前车队长数量：${finalManagers?.length || 0} 名`)
    console.log(`当前司机数量：${finalDrivers?.length || 0} 名`)
    console.log('========================================')
  } catch (error) {
    console.error('\n❌ 迁移过程中发生错误:', error)
    process.exit(1)
  }
}

// 执行迁移
migrateUsers()
