/**
 * 测试删除租户功能
 * 
 * 此脚本用于测试删除租户时的级联删除功能
 * 
 * 使用方法：
 * npx tsx scripts/test-delete-tenant.ts [租户ID]
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

async function testDeleteTenant(tenantId?: string) {
  console.log('========================================')
  console.log('🧪 测试删除租户功能')
  console.log('========================================\n')

  try {
    // 1. 如果没有指定租户ID，列出所有租户
    if (!tenantId) {
      console.log('📋 查询所有租户（主账号）...\n')
      const {data: tenants, error} = await supabase
        .from('profiles')
        .select('id, name, phone, company_name, role, main_account_id')
        .eq('role', 'super_admin')
        .is('main_account_id', null)
        .order('created_at', {ascending: true})

      if (error) {
        console.error('❌ 查询失败:', error)
        process.exit(1)
      }

      if (!tenants || tenants.length === 0) {
        console.log('❌ 数据库中没有任何租户')
        console.log('\n提示：')
        console.log('1. 请先创建租户账号')
        console.log('2. 然后使用以下命令测试删除功能：')
        console.log('   npx tsx scripts/test-delete-tenant.ts [租户ID]')
        console.log('')
        return
      }

      console.log('✅ 找到 ' + tenants.length + ' 个租户：\n')
      for (let i = 0; i < tenants.length; i++) {
        const tenant = tenants[i]
        console.log((i + 1) + '. ' + (tenant.name || '未命名'))
        console.log('   手机号：' + (tenant.phone || '未设置'))
        console.log('   公司：' + (tenant.company_name || '未设置'))
        console.log('   ID：' + tenant.id)
        console.log('')
      }

      console.log('使用方法：')
      console.log('npx tsx scripts/test-delete-tenant.ts [租户ID]')
      console.log('')
      return
    }

    // 2. 查询指定租户的详细信息
    console.log('📋 查询租户信息...\n')
    const {data: tenant, error: tenantError} = await supabase
      .from('profiles')
      .select('*')
      .eq('id', tenantId)
      .maybeSingle()

    if (tenantError || !tenant) {
      console.error('❌ 租户不存在或查询失败')
      console.error('错误信息:', tenantError)
      process.exit(1)
    }

    console.log('租户信息：')
    console.log('  姓名：' + (tenant.name || '未命名'))
    console.log('  手机号：' + (tenant.phone || '未设置'))
    console.log('  公司：' + (tenant.company_name || '未设置'))
    console.log('  角色：' + tenant.role)
    console.log('  主账号ID：' + (tenant.main_account_id || 'NULL（主账号）'))
    console.log('')

    // 验证是否为主账号
    if (tenant.role !== 'super_admin') {
      console.error('❌ 只能删除老板账号（super_admin）')
      process.exit(1)
    }

    if (tenant.main_account_id !== null) {
      console.error('❌ 只能删除主账号，不能删除平级账号')
      console.error('提示：请删除主账号，平级账号会自动级联删除')
      process.exit(1)
    }

    // 3. 统计将要删除的数据
    console.log('📊 统计将要删除的数据...\n')

    const [
      {data: peerAccounts},
      {data: managers},
      {data: drivers},
      {data: vehicles},
      {data: warehouses},
      {data: attendance},
      {data: leaves},
      {data: pieceWorks},
      {data: notifications}
    ] = await Promise.all([
      // 平级账号
      supabase
        .from('profiles')
        .select('id, name, phone')
        .eq('role', 'super_admin')
        .eq('main_account_id', tenantId),
      // 车队长
      supabase.from('profiles').select('id, name, phone').eq('role', 'manager').eq('boss_id', tenantId),
      // 司机
      supabase.from('profiles').select('id, name, phone').eq('role', 'driver').eq('boss_id', tenantId),
      // 车辆
      supabase.from('vehicles').select('id, plate_number').eq('tenant_id', tenantId),
      // 仓库
      supabase.from('warehouses').select('id, name').eq('tenant_id', tenantId),
      // 考勤记录
      supabase.from('attendance').select('id').eq('tenant_id', tenantId),
      // 请假记录
      supabase.from('leave_applications').select('id').eq('tenant_id', tenantId),
      // 计件记录
      supabase.from('piece_work_records').select('id').eq('tenant_id', tenantId),
      // 通知
      supabase.from('notifications').select('id').eq('tenant_id', tenantId)
    ])

    console.log('将要删除的数据统计：')
    console.log('  平级账号：' + (peerAccounts?.length || 0) + ' 个')
    if (peerAccounts && peerAccounts.length > 0) {
      peerAccounts.forEach((acc, index) => {
        console.log('    ' + (index + 1) + '. ' + (acc.name || '未命名') + ' (' + (acc.phone || '无手机号') + ')')
      })
    }

    console.log('  车队长：' + (managers?.length || 0) + ' 名')
    if (managers && managers.length > 0) {
      managers.forEach((m, index) => {
        console.log('    ' + (index + 1) + '. ' + (m.name || '未命名') + ' (' + (m.phone || '无手机号') + ')')
      })
    }

    console.log('  司机：' + (drivers?.length || 0) + ' 名')
    if (drivers && drivers.length > 0 && drivers.length <= 10) {
      drivers.forEach((d, index) => {
        console.log('    ' + (index + 1) + '. ' + (d.name || '未命名') + ' (' + (d.phone || '无手机号') + ')')
      })
    } else if (drivers && drivers.length > 10) {
      console.log('    （司机数量较多，仅显示前10名）')
      for (let i = 0; i < 10; i++) {
        const d = drivers[i]
        console.log('    ' + (i + 1) + '. ' + (d.name || '未命名') + ' (' + (d.phone || '无手机号') + ')')
      }
      console.log('    ... 还有 ' + (drivers.length - 10) + ' 名司机')
    }

    console.log('  车辆：' + (vehicles?.length || 0) + ' 辆')
    console.log('  仓库：' + (warehouses?.length || 0) + ' 个')
    console.log('  考勤记录：' + (attendance?.length || 0) + ' 条')
    console.log('  请假记录：' + (leaves?.length || 0) + ' 条')
    console.log('  计件记录：' + (pieceWorks?.length || 0) + ' 条')
    console.log('  通知：' + (notifications?.length || 0) + ' 条')
    console.log('')

    const totalRecords =
      (peerAccounts?.length || 0) +
      (managers?.length || 0) +
      (drivers?.length || 0) +
      (vehicles?.length || 0) +
      (warehouses?.length || 0) +
      (attendance?.length || 0) +
      (leaves?.length || 0) +
      (pieceWorks?.length || 0) +
      (notifications?.length || 0)

    console.log('📦 总计将删除：' + (totalRecords + 1) + ' 条记录（包括租户本身）')
    console.log('')

    // 4. 确认删除
    console.log('⚠️  警告：此操作不可恢复！')
    console.log('')
    console.log('如果要执行删除，请在代码中取消注释删除部分')
    console.log('')

    // 取消注释以下代码以执行实际删除
    /*
    console.log('🗑️  开始删除...\n')
    
    const {error: deleteError} = await supabase
      .from('profiles')
      .delete()
      .eq('id', tenantId)
    
    if (deleteError) {
      console.error('❌ 删除失败:', deleteError)
      process.exit(1)
    }
    
    console.log('✅ 删除成功！')
    console.log('')
    console.log('已删除租户及其所有关联数据')
    */

    console.log('========================================')
    console.log('✅ 测试完成')
    console.log('========================================')
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error)
    process.exit(1)
  }
}

// 获取命令行参数
const tenantId = process.argv[2]

// 执行测试
testDeleteTenant(tenantId)
