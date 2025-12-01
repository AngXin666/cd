/**
 * RLS 策略和权限测试工具
 * 用于在前端测试 RLS 策略和权限映射
 */

import {supabase} from '@/db/supabase'

interface TestResult {
  name: string
  success: boolean
  message: string
  details?: any
}

/**
 * 测试所有 RLS 策略和权限
 */
export async function testAllRLSPolicies(): Promise<TestResult[]> {
  const results: TestResult[] = []

  console.log('')
  console.log('╔═══════════════════════════════════════════════════════════════╗')
  console.log('║              开始测试 RLS 策略和权限映射表                    ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝')
  console.log('')

  // 测试 1: 检查当前用户
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('测试 1: 检查当前用户')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const currentUserResult = await testCurrentUser()
  results.push(currentUserResult)
  console.log('')

  // 测试 2: 测试 users 表访问
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('测试 2: 测试 users 表访问')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const usersResult = await testUsersTableAccess()
  results.push(usersResult)
  console.log('')

  // 测试 3: 测试 user_roles 表访问
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('测试 3: 测试 user_roles 表访问')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const userRolesResult = await testUserRolesTableAccess()
  results.push(userRolesResult)
  console.log('')

  // 测试 4: 测试 warehouses 表访问
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('测试 4: 测试 warehouses 表访问')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const warehousesResult = await testWarehousesTableAccess()
  results.push(warehousesResult)
  console.log('')

  // 测试 5: 测试 notifications 表访问
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('测试 5: 测试 notifications 表访问')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  const notificationsResult = await testNotificationsTableAccess()
  results.push(notificationsResult)
  console.log('')

  // 输出总结
  console.log('╔═══════════════════════════════════════════════════════════════╗')
  console.log('║                        测试总结                                ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝')
  console.log('')

  const successCount = results.filter((r) => r.success).length
  const failCount = results.filter((r) => !r.success).length

  console.log('📊 测试结果统计:')
  console.log(`  - 总测试数: ${results.length}`)
  console.log(`  - 成功: ${successCount}`)
  console.log(`  - 失败: ${failCount}`)
  console.log('')

  if (failCount > 0) {
    console.log('❌ 失败的测试:')
    results
      .filter((r) => !r.success)
      .forEach((r, index) => {
        console.log(`  [${index + 1}] ${r.name}`)
        console.log(`      原因: ${r.message}`)
      })
    console.log('')
  }

  console.log('✅ 测试完成！')
  console.log('')

  return results
}

/**
 * 测试当前用户
 */
async function testCurrentUser(): Promise<TestResult> {
  try {
    console.log('  📊 获取当前用户信息...')

    const {
      data: {user},
      error
    } = await supabase.auth.getUser()

    if (error) {
      console.error('  ❌ 获取用户失败:', error.message)
      return {
        name: '检查当前用户',
        success: false,
        message: `获取用户失败: ${error.message}`
      }
    }

    if (!user) {
      console.warn('  ⚠️ 用户未登录')
      return {
        name: '检查当前用户',
        success: false,
        message: '用户未登录'
      }
    }

    console.log('  ✅ 当前用户:')
    console.log('    - 用户ID:', user.id)
    console.log('    - 邮箱:', user.email || '(无)')
    console.log('    - 手机:', user.phone || '(无)')

    // 查询用户角色
    const {data: roleData, error: roleError} = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (roleError) {
      console.error('  ❌ 查询角色失败:', roleError.message)
      return {
        name: '检查当前用户',
        success: false,
        message: `查询角色失败: ${roleError.message}`,
        details: {userId: user.id}
      }
    }

    if (!roleData) {
      console.warn('  ⚠️ 用户没有角色')
      return {
        name: '检查当前用户',
        success: false,
        message: '用户没有角色',
        details: {userId: user.id}
      }
    }

    console.log('    - 角色:', roleData.role)

    return {
      name: '检查当前用户',
      success: true,
      message: '当前用户信息正常',
      details: {
        userId: user.id,
        role: roleData.role
      }
    }
  } catch (error) {
    console.error('  ❌ 测试异常:', error)
    return {
      name: '检查当前用户',
      success: false,
      message: `测试异常: ${error}`
    }
  }
}

/**
 * 测试 users 表访问
 */
async function testUsersTableAccess(): Promise<TestResult> {
  try {
    console.log('  📊 测试查询 users 表...')

    const {data, error, count} = await supabase.from('users').select('id, name', {count: 'exact'}).limit(10)

    if (error) {
      console.error('  ❌ 查询失败:', error.message)
      return {
        name: 'users 表访问',
        success: false,
        message: `查询失败: ${error.message}`
      }
    }

    console.log('  ✅ 查询成功:')
    console.log('    - 总记录数:', count)
    console.log('    - 返回记录数:', data?.length || 0)

    if (data && data.length > 0) {
      console.log('    - 前3条记录:')
      data.slice(0, 3).forEach((user, index) => {
        console.log(`      [${index + 1}] ${user.name || '(未设置)'} (${user.id})`)
      })
    }

    return {
      name: 'users 表访问',
      success: true,
      message: '查询成功',
      details: {count, returned: data?.length || 0}
    }
  } catch (error) {
    console.error('  ❌ 测试异常:', error)
    return {
      name: 'users 表访问',
      success: false,
      message: `测试异常: ${error}`
    }
  }
}

/**
 * 测试 user_roles 表访问
 */
async function testUserRolesTableAccess(): Promise<TestResult> {
  try {
    console.log('  📊 测试查询 user_roles 表...')

    const {data, error, count} = await supabase.from('user_roles').select('user_id, role', {count: 'exact'}).limit(10)

    if (error) {
      console.error('  ❌ 查询失败:', error.message)
      return {
        name: 'user_roles 表访问',
        success: false,
        message: `查询失败: ${error.message}`
      }
    }

    console.log('  ✅ 查询成功:')
    console.log('    - 总记录数:', count)
    console.log('    - 返回记录数:', data?.length || 0)

    if (data && data.length > 0) {
      // 统计角色分布
      const roleStats = data.reduce(
        (acc, item) => {
          acc[item.role] = (acc[item.role] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      console.log('    - 角色分布:')
      Object.entries(roleStats).forEach(([role, count]) => {
        console.log(`      ${role}: ${count}`)
      })
    }

    return {
      name: 'user_roles 表访问',
      success: true,
      message: '查询成功',
      details: {count, returned: data?.length || 0}
    }
  } catch (error) {
    console.error('  ❌ 测试异常:', error)
    return {
      name: 'user_roles 表访问',
      success: false,
      message: `测试异常: ${error}`
    }
  }
}

/**
 * 测试 warehouses 表访问
 */
async function testWarehousesTableAccess(): Promise<TestResult> {
  try {
    console.log('  📊 测试查询 warehouses 表...')

    const {data, error, count} = await supabase.from('warehouses').select('id, name', {count: 'exact'}).limit(10)

    if (error) {
      console.error('  ❌ 查询失败:', error.message)
      return {
        name: 'warehouses 表访问',
        success: false,
        message: `查询失败: ${error.message}`
      }
    }

    console.log('  ✅ 查询成功:')
    console.log('    - 总记录数:', count)
    console.log('    - 返回记录数:', data?.length || 0)

    if (data && data.length > 0) {
      console.log('    - 前3条记录:')
      data.slice(0, 3).forEach((warehouse, index) => {
        console.log(`      [${index + 1}] ${warehouse.name} (${warehouse.id})`)
      })
    }

    return {
      name: 'warehouses 表访问',
      success: true,
      message: '查询成功',
      details: {count, returned: data?.length || 0}
    }
  } catch (error) {
    console.error('  ❌ 测试异常:', error)
    return {
      name: 'warehouses 表访问',
      success: false,
      message: `测试异常: ${error}`
    }
  }
}

/**
 * 测试 notifications 表访问
 */
async function testNotificationsTableAccess(): Promise<TestResult> {
  try {
    console.log('  📊 测试查询 notifications 表...')

    // 获取当前用户
    const {
      data: {user}
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn('  ⚠️ 用户未登录，跳过测试')
      return {
        name: 'notifications 表访问',
        success: false,
        message: '用户未登录'
      }
    }

    // 测试查询通知
    const {data, error, count} = await supabase
      .from('notifications')
      .select('id, title, type, is_read', {count: 'exact'})
      .eq('recipient_id', user.id)
      .limit(10)

    if (error) {
      console.error('  ❌ 查询失败:', error.message)
      return {
        name: 'notifications 表访问',
        success: false,
        message: `查询失败: ${error.message}`
      }
    }

    console.log('  ✅ 查询成功:')
    console.log('    - 总记录数:', count)
    console.log('    - 返回记录数:', data?.length || 0)

    if (data && data.length > 0) {
      console.log('    - 前3条记录:')
      data.slice(0, 3).forEach((notif, index) => {
        console.log(`      [${index + 1}] ${notif.title} (${notif.type}) - ${notif.is_read ? '已读' : '未读'}`)
      })
    }

    // 测试创建通知（仅管理员）
    console.log('  📊 测试创建通知（仅管理员）...')

    const {data: roleData} = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()

    const isAdmin = roleData?.role && ['BOSS', 'MANAGER', 'PEER_ADMIN'].includes(roleData.role)

    if (isAdmin) {
      const {error: insertError} = await supabase.from('notifications').insert({
        recipient_id: user.id,
        sender_id: user.id,
        type: 'system',
        title: 'RLS 测试通知',
        content: '这是一条测试通知，用于验证 RLS 策略',
        is_read: false
      })

      if (insertError) {
        console.error('  ❌ 创建通知失败:', insertError.message)
        return {
          name: 'notifications 表访问',
          success: false,
          message: `创建通知失败: ${insertError.message}`,
          details: {count, returned: data?.length || 0}
        }
      }

      console.log('  ✅ 创建通知成功')

      // 清理测试数据
      await supabase.from('notifications').delete().eq('title', 'RLS 测试通知').eq('recipient_id', user.id)

      console.log('  ✅ 测试数据已清理')
    } else {
      console.log('  ℹ️ 当前用户不是管理员，跳过创建测试')
    }

    return {
      name: 'notifications 表访问',
      success: true,
      message: '查询和创建测试通过',
      details: {count, returned: data?.length || 0, isAdmin}
    }
  } catch (error) {
    console.error('  ❌ 测试异常:', error)
    return {
      name: 'notifications 表访问',
      success: false,
      message: `测试异常: ${error}`
    }
  }
}

/**
 * 测试通知更新权限
 */
export async function testNotificationUpdatePermission(): Promise<TestResult> {
  try {
    console.log('')
    console.log('╔═══════════════════════════════════════════════════════════════╗')
    console.log('║                  测试通知更新权限                              ║')
    console.log('╚═══════════════════════════════════════════════════════════════╝')
    console.log('')

    // 获取当前用户
    const {
      data: {user}
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn('⚠️ 用户未登录')
      return {
        name: '测试通知更新权限',
        success: false,
        message: '用户未登录'
      }
    }

    console.log('📋 当前用户:')
    console.log('  - 用户ID:', user.id)

    // 查询用户角色
    const {data: roleData} = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()

    console.log('  - 角色:', roleData?.role || '(无)')
    console.log('')

    const isAdmin = roleData?.role && ['BOSS', 'MANAGER', 'PEER_ADMIN'].includes(roleData.role)

    if (!isAdmin) {
      console.log('ℹ️ 当前用户不是管理员，跳过管理员权限测试')
      return {
        name: '测试通知更新权限',
        success: true,
        message: '非管理员用户，跳过测试'
      }
    }

    // 创建测试通知
    console.log('📊 步骤 1: 创建测试通知...')

    const {data: insertData, error: insertError} = await supabase
      .from('notifications')
      .insert({
        recipient_id: user.id,
        sender_id: user.id,
        type: 'system',
        title: 'RLS 更新权限测试',
        content: '这是一条测试通知',
        is_read: false,
        approval_status: 'pending'
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('  ❌ 创建通知失败:', insertError.message)
      return {
        name: '测试通知更新权限',
        success: false,
        message: `创建通知失败: ${insertError.message}`
      }
    }

    const testNotificationId = insertData.id
    console.log('  ✅ 创建成功，通知ID:', testNotificationId)
    console.log('')

    // 测试更新通知
    console.log('📊 步骤 2: 测试更新通知...')

    const {error: updateError} = await supabase
      .from('notifications')
      .update({
        approval_status: 'approved',
        content: '通知已更新',
        updated_at: new Date().toISOString()
      })
      .eq('id', testNotificationId)

    if (updateError) {
      console.error('  ❌ 更新通知失败:', updateError.message)
      console.error('  ❌ 这可能是 RLS 策略问题！')
      console.error('  ❌ 请检查 notifications 表的 UPDATE 策略是否有 WITH CHECK 子句')

      // 清理测试数据
      await supabase.from('notifications').delete().eq('id', testNotificationId)

      return {
        name: '测试通知更新权限',
        success: false,
        message: `更新通知失败: ${updateError.message}`,
        details: {notificationId: testNotificationId}
      }
    }

    console.log('  ✅ 更新成功')
    console.log('')

    // 验证更新
    console.log('📊 步骤 3: 验证更新结果...')

    const {data: verifyData, error: verifyError} = await supabase
      .from('notifications')
      .select('approval_status, content')
      .eq('id', testNotificationId)
      .single()

    if (verifyError) {
      console.error('  ❌ 验证失败:', verifyError.message)

      // 清理测试数据
      await supabase.from('notifications').delete().eq('id', testNotificationId)

      return {
        name: '测试通知更新权限',
        success: false,
        message: `验证失败: ${verifyError.message}`
      }
    }

    console.log('  ✅ 验证成功:')
    console.log('    - 审批状态:', verifyData.approval_status)
    console.log('    - 内容:', verifyData.content)
    console.log('')

    // 清理测试数据
    console.log('📊 步骤 4: 清理测试数据...')

    const {error: deleteError} = await supabase.from('notifications').delete().eq('id', testNotificationId)

    if (deleteError) {
      console.error('  ⚠️ 清理失败:', deleteError.message)
    } else {
      console.log('  ✅ 清理成功')
    }

    console.log('')
    console.log('✅ 通知更新权限测试通过！')
    console.log('')

    return {
      name: '测试通知更新权限',
      success: true,
      message: '通知更新权限测试通过',
      details: {
        created: true,
        updated: true,
        verified: true,
        deleted: !deleteError
      }
    }
  } catch (error) {
    console.error('  ❌ 测试异常:', error)
    return {
      name: '测试通知更新权限',
      success: false,
      message: `测试异常: ${error}`
    }
  }
}

/**
 * 在浏览器控制台运行测试
 * 使用方法：
 * 1. 打开浏览器控制台（F12）
 * 2. 输入: testAllRLSPolicies()
 * 3. 查看测试结果
 */
if (typeof window !== 'undefined') {
  ;(window as any).testAllRLSPolicies = testAllRLSPolicies
  ;(window as any).testNotificationUpdatePermission = testNotificationUpdatePermission
}
