#!/usr/bin/env node
/**
 * 完整功能测试脚本
 * 测试所有功能是否支持新的数据库 schema
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wxvrwkpkioalqdsfswwu.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dnJ3a3BraW9hbHFkc2Zzd3d1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc1MDM1NCwiZXhwIjoyMDgwMzI2MzU0fQ.XoPzVOJtqwl2ftmE6Xh_TYwq_3p9T2ml8pfbWaU7i24'

const supabase = createClient(supabaseUrl, serviceRoleKey)

let testResults = []
let passCount = 0
let failCount = 0

function logTest(category, name, passed, error = null) {
  const result = { category, name, passed, error }
  testResults.push(result)
  
  const icon = passed ? '✅' : '❌'
  console.log(`${icon} [${category}] ${name}`)
  if (error) {
    console.log(`   错误: ${error}`)
  }
  
  if (passed) passCount++
  else failCount++
}

async function testDatabaseSchema() {
  console.log('\n═══════════════════════════════════════')
  console.log('📊 第1阶段：数据库结构测试')
  console.log('═══════════════════════════════════════\n')

  // 测试核心表
  const coreTables = ['users', 'warehouses', 'warehouse_assignments', 'vehicles', 'attendance', 'leave_applications', 'piece_work_records', 'notifications']
  
  for (const table of coreTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1)
      logTest('数据库结构', `${table} 表`, !error, error?.message)
    } catch (err) {
      logTest('数据库结构', `${table} 表`, false, err.message)
    }
  }

  // 测试枚举类型
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .in('role', ['BOSS', 'PEER_ADMIN', 'MANAGER', 'DRIVER'])
      .limit(1)
    logTest('数据库结构', '用户角色枚举', !error, error?.message)
  } catch (err) {
    logTest('数据库结构', '用户角色枚举', false, err.message)
  }
}

async function testUserAuthentication() {
  console.log('\n═══════════════════════════════════════')
  console.log('👤 第2阶段：用户认证测试')
  console.log('═══════════════════════════════════════\n')

  const testAccounts = [
    { email: '13800000001@phone.local', password: 'admin123', role: 'BOSS', name: '老板' },
    { email: '13800000002@phone.local', password: 'admin123', role: 'PEER_ADMIN', name: '调度' },
    { email: '13800000003@phone.local', password: 'admin123', role: 'MANAGER', name: '车队长' },
    { email: '13800000004@phone.local', password: 'admin123', role: 'DRIVER', name: '司机' }
  ]

  for (const account of testAccounts) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password
      })
      
      if (error) {
        logTest('用户认证', `${account.name}登录`, false, error.message)
        continue
      }

      // 验证用户角色
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, name')
        .eq('id', data.user.id)
        .single()

      if (userError) {
        logTest('用户认证', `${account.name}角色验证`, false, userError.message)
      } else {
        logTest('用户认证', `${account.name}登录`, userData.role === account.role, 
          userData.role !== account.role ? `期望 ${account.role}, 实际 ${userData.role}` : null)
      }

      // 登出
      await supabase.auth.signOut()
    } catch (err) {
      logTest('用户认证', `${account.name}登录`, false, err.message)
    }
  }
}

async function testWarehouseManagement() {
  console.log('\n═══════════════════════════════════════')
  console.log('🏭 第3阶段：仓库管理测试')
  console.log('═══════════════════════════════════════\n')

  // 以老板身份登录
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: '13800000001@phone.local',
    password: 'admin123'
  })

  if (!authData.user) {
    logTest('仓库管理', '准备测试环境', false, '老板登录失败')
    return
  }

  // 测试获取仓库列表
  try {
    const { data, error } = await supabase.from('warehouses').select('*')
    logTest('仓库管理', '获取仓库列表', !error, error?.message)
  } catch (err) {
    logTest('仓库管理', '获取仓库列表', false, err.message)
  }

  // 测试创建仓库
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .insert({ name: `测试仓库_${Date.now()}`, is_active: true })
      .select()
      .single()
    
    if (!error && data) {
      logTest('仓库管理', '创建仓库', true)
      
      // 测试更新仓库
      const { error: updateError } = await supabase
        .from('warehouses')
        .update({ daily_target: 1000 })
        .eq('id', data.id)
      
      logTest('仓库管理', '更新仓库', !updateError, updateError?.message)

      // 清理测试数据
      await supabase.from('warehouses').delete().eq('id', data.id)
    } else {
      logTest('仓库管理', '创建仓库', false, error?.message)
    }
  } catch (err) {
    logTest('仓库管理', '创建仓库', false, err.message)
  }

  await supabase.auth.signOut()
}

async function testUserManagement() {
  console.log('\n═══════════════════════════════════════')
  console.log('👥 第4阶段：用户管理测试')
  console.log('═══════════════════════════════════════\n')

  // 以老板身份登录
  await supabase.auth.signInWithPassword({
    email: '13800000001@phone.local',
    password: 'admin123'
  })

  // 测试获取用户列表
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, role')
      .limit(10)
    
    logTest('用户管理', '获取用户列表', !error && data.length > 0, error?.message)
  } catch (err) {
    logTest('用户管理', '获取用户列表', false, err.message)
  }

  // 测试按角色筛选
  const roles = ['BOSS', 'PEER_ADMIN', 'MANAGER', 'DRIVER']
  for (const role of roles) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('role', role)
      
      logTest('用户管理', `筛选${role}角色`, !error, error?.message)
    } catch (err) {
      logTest('用户管理', `筛选${role}角色`, false, err.message)
    }
  }

  await supabase.auth.signOut()
}

async function testWarehouseAssignments() {
  console.log('\n═══════════════════════════════════════')
  console.log('📍 第5阶段：仓库分配测试')
  console.log('═══════════════════════════════════════\n')

  await supabase.auth.signInWithPassword({
    email: '13800000001@phone.local',
    password: 'admin123'
  })

  // 测试 warehouse_assignments 表
  try {
    const { data, error } = await supabase
      .from('warehouse_assignments')
      .select('*')
      .limit(5)
    
    logTest('仓库分配', '查询仓库分配记录', !error, error?.message)
  } catch (err) {
    logTest('仓库分配', '查询仓库分配记录', false, err.message)
  }

  // 测试关联查询（user + warehouse）
  try {
    const { data, error } = await supabase
      .from('warehouse_assignments')
      .select(`
        *,
        users:user_id(id, name, role),
        warehouses:warehouse_id(id, name)
      `)
      .limit(5)
    
    logTest('仓库分配', '关联查询用户和仓库', !error, error?.message)
  } catch (err) {
    logTest('仓库分配', '关联查询用户和仓库', false, err.message)
  }

  await supabase.auth.signOut()
}

async function testAttendance() {
  console.log('\n═══════════════════════════════════════')
  console.log('📅 第6阶段：考勤管理测试')
  console.log('═══════════════════════════════════════\n')

  await supabase.auth.signInWithPassword({
    email: '13800000001@phone.local',
    password: 'admin123'
  })

  // 测试查询考勤记录
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .limit(10)
    
    logTest('考勤管理', '查询考勤记录', !error, error?.message)
  } catch (err) {
    logTest('考勤管理', '查询考勤记录', false, err.message)
  }

  // 测试创建考勤记录
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data: users } = await supabase.from('users').select('id').eq('role', 'DRIVER').limit(1).single()
    
    if (users) {
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          user_id: users.id,
          work_date: today,
          check_in_time: new Date().toISOString()
        })
        .select()
      
      if (!error && data) {
        logTest('考勤管理', '创建考勤记录', true)
        // 清理
        await supabase.from('attendance').delete().eq('id', data[0].id)
      } else {
        logTest('考勤管理', '创建考勤记录', false, error?.message)
      }
    } else {
      logTest('考勤管理', '创建考勤记录', false, '无可用司机')
    }
  } catch (err) {
    logTest('考勤管理', '创建考勤记录', false, err.message)
  }

  await supabase.auth.signOut()
}

async function testLeaveApplications() {
  console.log('\n═══════════════════════════════════════')
  console.log('🏖️ 第7阶段：请假申请测试')
  console.log('═══════════════════════════════════════\n')

  await supabase.auth.signInWithPassword({
    email: '13800000001@phone.local',
    password: 'admin123'
  })

  // 测试查询请假申请
  try {
    const { data, error } = await supabase
      .from('leave_applications')
      .select('*')
      .limit(10)
    
    logTest('请假申请', '查询请假记录', !error, error?.message)
  } catch (err) {
    logTest('请假申请', '查询请假记录', false, err.message)
  }

  // 测试按状态筛选
  try {
    const { data, error } = await supabase
      .from('leave_applications')
      .select('*')
      .eq('status', 'pending')
    
    logTest('请假申请', '筛选待审批申请', !error, error?.message)
  } catch (err) {
    logTest('请假申请', '筛选待审批申请', false, err.message)
  }

  await supabase.auth.signOut()
}

async function testPieceWork() {
  console.log('\n═══════════════════════════════════════')
  console.log('📦 第8阶段：计件记录测试')
  console.log('═══════════════════════════════════════\n')

  await supabase.auth.signInWithPassword({
    email: '13800000001@phone.local',
    password: 'admin123'
  })

  // 测试查询计件记录
  try {
    const { data, error } = await supabase
      .from('piece_work_records')
      .select('*')
      .limit(10)
    
    logTest('计件记录', '查询计件记录', !error, error?.message)
  } catch (err) {
    logTest('计件记录', '查询计件记录', false, err.message)
  }

  // 测试按日期范围查询
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('piece_work_records')
      .select('*')
      .gte('work_date', today)
    
    logTest('计件记录', '按日期筛选', !error, error?.message)
  } catch (err) {
    logTest('计件记录', '按日期筛选', false, err.message)
  }

  await supabase.auth.signOut()
}

async function testVehicles() {
  console.log('\n═══════════════════════════════════════')
  console.log('🚗 第9阶段：车辆管理测试')
  console.log('═══════════════════════════════════════\n')

  await supabase.auth.signInWithPassword({
    email: '13800000001@phone.local',
    password: 'admin123'
  })

  // 测试查询车辆
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .limit(10)
    
    logTest('车辆管理', '查询车辆列表', !error, error?.message)
  } catch (err) {
    logTest('车辆管理', '查询车辆列表', false, err.message)
  }

  // 测试关联查询司机
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        driver:driver_id(id, name, phone)
      `)
      .limit(5)
    
    logTest('车辆管理', '关联查询司机信息', !error, error?.message)
  } catch (err) {
    logTest('车辆管理', '关联查询司机信息', false, err.message)
  }

  await supabase.auth.signOut()
}

async function testNotifications() {
  console.log('\n═══════════════════════════════════════')
  console.log('🔔 第10阶段：通知系统测试')
  console.log('═══════════════════════════════════════\n')

  await supabase.auth.signInWithPassword({
    email: '13800000001@phone.local',
    password: 'admin123'
  })

  // 测试查询通知
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .limit(10)
    
    logTest('通知系统', '查询通知列表', !error, error?.message)
  } catch (err) {
    logTest('通知系统', '查询通知列表', false, err.message)
  }

  // 测试按已读状态筛选
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_read', false)
    
    logTest('通知系统', '筛选未读通知', !error, error?.message)
  } catch (err) {
    logTest('通知系统', '筛选未读通知', false, err.message)
  }

  await supabase.auth.signOut()
}

async function testHelperFunctions() {
  console.log('\n═══════════════════════════════════════')
  console.log('⚙️ 第11阶段：辅助函数测试')
  console.log('═══════════════════════════════════════\n')

  await supabase.auth.signInWithPassword({
    email: '13800000001@phone.local',
    password: 'admin123'
  })

  const { data: authData } = await supabase.auth.getUser()
  const userId = authData.user?.id

  if (!userId) {
    logTest('辅助函数', '获取用户ID', false, '无法获取用户ID')
    return
  }

  // 测试角色检查函数
  const roleFunctions = ['is_boss', 'is_manager', 'is_driver', 'is_peer_admin']
  for (const func of roleFunctions) {
    try {
      const { data, error } = await supabase.rpc(func, { uid: userId })
      logTest('辅助函数', `${func}()`, error === null, error?.message)
    } catch (err) {
      logTest('辅助函数', `${func}()`, false, err.message)
    }
  }

  await supabase.auth.signOut()
}

async function printSummary() {
  console.log('\n═══════════════════════════════════════')
  console.log('📊 测试总结')
  console.log('═══════════════════════════════════════\n')

  const total = passCount + failCount
  const passRate = ((passCount / total) * 100).toFixed(1)

  console.log(`总计: ${total} 项测试`)
  console.log(`✅ 通过: ${passCount} 项`)
  console.log(`❌ 失败: ${failCount} 项`)
  console.log(`📈 通过率: ${passRate}%\n`)

  if (failCount > 0) {
    console.log('失败的测试：')
    testResults
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  ❌ [${r.category}] ${r.name}`)
        console.log(`     ${r.error}`)
      })
  }

  console.log('\n测试完成！\n')
}

async function main() {
  console.log('🚀 开始完整功能测试...\n')
  
  try {
    await testDatabaseSchema()
    await testUserAuthentication()
    await testWarehouseManagement()
    await testUserManagement()
    await testWarehouseAssignments()
    await testAttendance()
    await testLeaveApplications()
    await testPieceWork()
    await testVehicles()
    await testNotifications()
    await testHelperFunctions()
    
    await printSummary()
  } catch (error) {
    console.error('❌ 测试过程出错:', error)
  }
}

main()
