/**
 * 审批类通知约束测试脚本
 * 测试目标：验证审批类通知的唯一标识约束是否有效
 * 
 * 运行方式：在浏览器控制台中运行
 */

// 测试说明：
// 1. 登录到系统（任意管理员账号）
// 2. 打开浏览器控制台
// 3. 复制并执行以下代码

// @ts-nocheck
/* eslint-disable */

// 导入所需模块（假设已在全局作用域）
// import { supabase } from '@/client/supabase'
// import { sendDriverSubmissionNotification } from '@/services/notificationService'
// import { updateApprovalNotificationStatus } from '@/db/notificationApi'

/**
 * 测试场景1：创建审批通知后查询
 */
async function testCreateApprovalNotification() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 测试场景1：创建审批通知')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const testRelatedId = 'test-leave-app-001'
  const testDriverId = 'test-driver-001'

  try {
    // 1. 创建审批通知
    console.log('1️⃣ 创建请假申请的审批通知...')
    const result = await sendDriverSubmissionNotification({
      driverId: testDriverId,
      driverName: '测试司机',
      type: 'leave_application_submitted',
      title: '新的请假申请',
      content: '测试司机提交了事假申请（2024-01-01 至 2024-01-03），请及时审批',
      relatedId: testRelatedId,
      approvalStatus: 'pending'
    })

    console.log('✅ 通知创建结果:', result ? '成功' : '失败')

    // 2. 查询创建的通知
    console.log('\n2️⃣ 查询刚创建的通知...')
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('related_id', testRelatedId)
      .eq('type', 'leave_application_submitted')

    if (error) {
      console.error('❌ 查询失败:', error)
      return false
    }

    console.log(`📊 查询结果: 共 ${notifications?.length || 0} 条通知`)
    notifications?.forEach((n, index) => {
      console.log(`\n  [${index + 1}] 通知详情:`)
      console.log(`      ID: ${n.id}`)
      console.log(`      接收者: ${n.recipient_id}`)
      console.log(`      关联ID: ${n.related_id}`)
      console.log(`      审批状态: ${n.approval_status}`)
      console.log(`      是否已读: ${n.is_read}`)
      console.log(`      标题: ${n.title}`)
    })

    // 3. 验证唯一性
    console.log('\n3️⃣ 验证唯一性约束...')
    const recipientIds = new Set(notifications?.map(n => n.recipient_id))
    console.log(`   接收者数量: ${recipientIds.size}`)
    console.log(`   通知总数: ${notifications?.length || 0}`)

    if (recipientIds.size === notifications?.length) {
      console.log('   ✅ 每个接收者只有1条通知（符合预期）')
    } else {
      console.log('   ❌ 存在重复通知（不符合预期）')
    }

    return {
      success: true,
      relatedId: testRelatedId,
      notificationCount: notifications?.length || 0
    }
  } catch (error) {
    console.error('❌ 测试失败:', error)
    return { success: false }
  }
}

/**
 * 测试场景2：更新审批状态
 */
async function testUpdateApprovalStatus(testRelatedId: string) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 测试场景2：更新审批状态')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // 1. 查询更新前的通知状态
    console.log('1️⃣ 查询更新前的通知状态...')
    const { data: beforeNotifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('related_id', testRelatedId)

    console.log(`📊 更新前: 共 ${beforeNotifications?.length || 0} 条通知`)
    console.log(`   所有通知的审批状态: ${beforeNotifications?.[0]?.approval_status}`)

    // 2. 更新审批状态为已批准
    console.log('\n2️⃣ 更新审批状态为已批准...')
    const updateResult = await updateApprovalNotificationStatus(
      testRelatedId,
      'approved',
      '请假审批通知',
      '老板批准了司机的事假申请（2024-01-01 至 2024-01-03）'
    )

    console.log('✅ 更新结果:', updateResult ? '成功' : '失败')

    // 3. 查询更新后的通知状态
    console.log('\n3️⃣ 查询更新后的通知状态...')
    const { data: afterNotifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('related_id', testRelatedId)

    console.log(`📊 更新后: 共 ${afterNotifications?.length || 0} 条通知`)
    
    afterNotifications?.forEach((n, index) => {
      console.log(`\n  [${index + 1}] 通知详情:`)
      console.log(`      ID: ${n.id}`)
      console.log(`      接收者: ${n.recipient_id}`)
      console.log(`      审批状态: ${n.approval_status}`)
      console.log(`      是否已读: ${n.is_read}`)
      console.log(`      标题: ${n.title}`)
      console.log(`      内容: ${n.content}`)
    })

    // 4. 验证更新结果
    console.log('\n4️⃣ 验证更新结果...')
    const allApproved = afterNotifications?.every(n => n.approval_status === 'approved')
    const allUnread = afterNotifications?.every(n => n.is_read === false)
    const notificationCountMatch = beforeNotifications?.length === afterNotifications?.length

    console.log(`   所有通知状态已更新为approved: ${allApproved ? '✅ 是' : '❌ 否'}`)
    console.log(`   所有通知已重置为未读: ${allUnread ? '✅ 是' : '❌ 否'}`)
    console.log(`   通知数量未变化: ${notificationCountMatch ? '✅ 是' : '❌ 否'}`)

    if (allApproved && allUnread && notificationCountMatch) {
      console.log('\n✅ 状态更新测试通过：直接更新原通知，未创建新通知')
      return true
    } else {
      console.log('\n❌ 状态更新测试失败')
      return false
    }
  } catch (error) {
    console.error('❌ 测试失败:', error)
    return false
  }
}

/**
 * 测试场景3：重复创建验证
 */
async function testDuplicateCreation(testRelatedId: string) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📋 测试场景3：重复创建验证')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // 1. 查询当前通知数量
    const { data: beforeNotifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('related_id', testRelatedId)

    console.log(`1️⃣ 重复创建前: 共 ${beforeNotifications?.length || 0} 条通知`)

    // 2. 尝试再次创建相同的审批通知
    console.log('\n2️⃣ 尝试重复创建相同的审批通知...')
    const result = await sendDriverSubmissionNotification({
      driverId: 'test-driver-001',
      driverName: '测试司机',
      type: 'leave_application_submitted',
      title: '新的请假申请',
      content: '测试司机提交了事假申请（2024-01-01 至 2024-01-03），请及时审批',
      relatedId: testRelatedId,
      approvalStatus: 'pending'
    })

    console.log('重复创建结果:', result ? '成功' : '失败')

    // 3. 查询创建后的通知数量
    const { data: afterNotifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('related_id', testRelatedId)

    console.log(`\n3️⃣ 重复创建后: 共 ${afterNotifications?.length || 0} 条通知`)

    // 4. 验证是否产生重复
    const isDuplicated = (afterNotifications?.length || 0) > (beforeNotifications?.length || 0)
    
    if (isDuplicated) {
      console.log('❌ 检测到重复通知！每次调用都会创建新通知')
      console.log(`   创建前: ${beforeNotifications?.length} 条`)
      console.log(`   创建后: ${afterNotifications?.length} 条`)
      console.log(`   新增: ${(afterNotifications?.length || 0) - (beforeNotifications?.length || 0)} 条`)
    } else {
      console.log('✅ 未产生重复通知')
    }

    return !isDuplicated
  } catch (error) {
    console.error('❌ 测试失败:', error)
    return false
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData(testRelatedId: string) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧹 清理测试数据')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('related_id', testRelatedId)

    if (error) {
      console.error('❌ 清理失败:', error)
      return false
    }

    console.log('✅ 测试数据已清理')
    return true
  } catch (error) {
    console.error('❌ 清理失败:', error)
    return false
  }
}

/**
 * 运行所有测试
 */
export async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗')
  console.log('║           审批类通知唯一标识约束测试                            ║')
  console.log('╚═══════════════════════════════════════════════════════════════╝')

  try {
    // 测试1: 创建审批通知
    const createResult = await testCreateApprovalNotification()
    if (!createResult.success) {
      console.log('\n❌ 测试终止：创建通知失败')
      return
    }

    const testRelatedId = createResult.relatedId!

    // 测试2: 更新审批状态
    await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒
    const updateResult = await testUpdateApprovalStatus(testRelatedId)

    // 测试3: 重复创建验证
    await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒
    const noDuplicateResult = await testDuplicateCreation(testRelatedId)

    // 清理测试数据
    await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒
    await cleanupTestData(testRelatedId)

    // 输出总结
    console.log('\n╔═══════════════════════════════════════════════════════════════╗')
    console.log('║                        测试总结                                ║')
    console.log('╚═══════════════════════════════════════════════════════════════╝')
    console.log(`\n  场景1 - 创建审批通知: ${createResult.success ? '✅ 通过' : '❌ 失败'}`)
    console.log(`  场景2 - 更新审批状态: ${updateResult ? '✅ 通过' : '❌ 失败'}`)
    console.log(`  场景3 - 防止重复创建: ${noDuplicateResult ? '✅ 通过' : '❌ 失败'}`)

    const allPassed = createResult.success && updateResult && noDuplicateResult
    console.log(`\n  总体结果: ${allPassed ? '✅ 全部通过' : '❌ 存在失败'}`)

    if (allPassed) {
      console.log('\n  ✅ 审批类通知唯一标识约束有效！')
      console.log('     - 每个接收者只有1条审批通知')
      console.log('     - 审批后直接更新原通知状态')
      console.log('     - 不会创建重复通知')
    } else {
      console.log('\n  ❌ 审批类通知唯一标识约束存在问题！')
      console.log('     请检查实现逻辑')
    }

    console.log('\n')
  } catch (error) {
    console.error('\n❌ 测试执行异常:', error)
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllTests()
}
