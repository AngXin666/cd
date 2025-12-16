// 完全替换文件内容
/**
 * 请假/离职管理 API
 *
 * 功能包括：
 * - 请假申请（草稿/提交）
 * - 离职申请（草稿/提交）
 * - 申请审批
 * - 申请查询
 * - 申请验证
 *
 * v1.3.18 更新：使用 buildSubmissionMessage 组装通知消息
 * 消息格式：{仓库名} {司机类型} {姓名} 提交了{申请类型}申请
 */

import {supabase} from '@/client/supabase'
import {sendDriverSubmissionNotification} from '@/services/notificationService'
import {type DriverType, type WarehouseInfo} from '@/utils/notificationMessageBuilder'
import {formatLeaveDateForNotification} from '@/utils/dateFormat'
import {publish} from '@/utils/eventBus'
import type {
  ApplicationReviewInput,
  LeaveApplication,
  LeaveApplicationInput,
  ResignationApplication,
  ResignationApplicationInput
} from '../types'

/**
 * 获取本地日期字符串
 */
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ==================== 请假申请相关 API ====================

/**
 * 创建请假申请
 */
export async function createLeaveApplication(input: LeaveApplicationInput): Promise<LeaveApplication | null> {
  try {
    const {
      data: {user}
    } = await supabase.auth.getUser()
    if (!user) {
      console.error('创建请假申请失败: 用户未登录')
      return null
    }

    const {data, error} = await supabase
      .from('leave_applications')
      .insert({
        user_id: input.user_id,
        warehouse_id: input.warehouse_id,
        leave_type: input.leave_type,
        start_date: input.start_date,
        end_date: input.end_date,
        reason: input.reason,
        status: 'pending'
      })
      .select()
      .maybeSingle()

    if (error || !data) {
      console.error('创建请假申请失败:', error)
      return null
    }

    // 获取申请人信息（包括姓名、司机类型）
    const {data: applicant} = await supabase
      .from('users')
      .select('name, driver_type')
      .eq('id', input.user_id)
      .maybeSingle()
    // 获取司机类型：with_vehicle 表示带车司机，否则为纯司机
    const driverType: DriverType = applicant?.driver_type === 'with_vehicle' ? 'with_vehicle' : 'pure'
    // 清理姓名中可能存在的司机类型前缀，避免消息中出现"纯司机司机"这样的重复
    let applicantName = applicant?.name || ''
    // 移除可能的司机类型前缀（纯司机、带车司机、司机）
    applicantName = applicantName.replace(/^(纯司机|带车司机|司机)\s*/, '') || '司机'

    // 获取司机的仓库列表
    const {data: warehouseAssignments} = await supabase
      .from('warehouse_assignments')
      .select('warehouse_id, warehouses(id, name)')
      .eq('user_id', input.user_id)
    const warehouses: WarehouseInfo[] = (warehouseAssignments || [])
      .map((wa: any) => wa.warehouses)
      .filter((w: any) => w && w.name)
      .map((w: any) => ({id: w.id, name: w.name}))

    // 获取仓库显示名称
    const warehouseLabel = warehouses.length === 0 ? '未分配仓库' : warehouses.length === 1 ? warehouses[0].name : '多仓库'
    // 获取司机类型显示名称
    const driverTypeLabel = driverType === 'with_vehicle' ? '带车司机' : '纯司机'

    // 获取请假详情用于补充信息
    const leaveTypeMap: Record<string, string> = {personal: '事假', sick: '病假', annual: '年假', other: '其他'}
    const leaveTypeLabel = leaveTypeMap[input.leave_type] || '请假'
    // 使用新的日期格式化函数：明天/后天/明后2天/12.16-12.18（3天）
    const dateRangeText = formatLeaveDateForNotification(input.start_date, input.end_date, data.days || 1)

    // 消息格式：{仓库名} {司机类型}{姓名} 提交{日期范围}{请假类型}的申请\n事由：{原因}
    // 示例1：北京仓 纯司机张三 提交明天事假的申请\n事由：家中有事
    // 示例2：北京仓 纯司机张三 提交12.16-12.18（3天）事假的申请\n事由：家中有事
    await sendDriverSubmissionNotification({
      driverId: input.user_id,
      driverName: applicantName,
      type: 'leave_application_submitted',
      title: '新的请假申请',
      content: `${warehouseLabel} ${driverTypeLabel}${applicantName} 提交${dateRangeText}${leaveTypeLabel}的申请\n事由：${input.reason || '无'}`,
      relatedId: data.id,
      approvalStatus: 'pending'
    })

    // 发布事件通知其他组件刷新数据
    publish('leave:created', {id: data.id, userId: input.user_id})
    publish('notification:created')

    return data
  } catch (error) {
    console.error('创建请假申请异常:', error)
    return null
  }
}

/**
 * 保存请假申请草稿
 */
export async function saveDraftLeaveApplication(input: LeaveApplicationInput): Promise<LeaveApplication | null> {
  return createLeaveApplication(input)
}

/**
 * 更新请假申请草稿
 */
export async function updateDraftLeaveApplication(
  draftId: string,
  input: Partial<LeaveApplicationInput>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {}
  if (input.leave_type !== undefined) updateData.leave_type = input.leave_type
  if (input.start_date !== undefined) updateData.start_date = input.start_date
  if (input.end_date !== undefined) updateData.end_date = input.end_date
  if (input.reason !== undefined) updateData.reason = input.reason

  const {error} = await supabase.from('leave_applications').update(updateData).eq('id', draftId)
  if (error) {
    console.error('更新请假申请草稿失败:', error)
    return false
  }
  return true
}

/**
 * 提交请假申请草稿
 */
export async function submitDraftLeaveApplication(_draftId: string): Promise<boolean> {
  return true
}

/**
 * 删除请假申请草稿
 */
export async function deleteDraftLeaveApplication(draftId: string): Promise<boolean> {
  const {error} = await supabase.from('leave_applications').delete().eq('id', draftId)
  if (error) {
    console.error('删除请假申请草稿失败:', error)
    return false
  }
  return true
}

/**
 * 获取用户的请假申请草稿列表
 */
export async function getDraftLeaveApplications(_userId: string): Promise<LeaveApplication[]> {
  return []
}

/**
 * 获取用户的所有请假申请
 */
export async function getLeaveApplicationsByUser(userId: string): Promise<LeaveApplication[]> {
  const {data, error} = await supabase
    .from('leave_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取请假申请失败:', error)
    return []
  }
  return Array.isArray(data) ? data : []
}

/**
 * 获取仓库的所有请假申请
 */
export async function getLeaveApplicationsByWarehouse(warehouseId: string): Promise<LeaveApplication[]> {
  const {data, error} = await supabase
    .from('leave_applications')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取仓库请假申请失败:', error)
    return []
  }
  return Array.isArray(data) ? data : []
}

/**
 * 获取所有请假申请（老板）
 */
export async function getAllLeaveApplications(): Promise<LeaveApplication[]> {
  const {data, error} = await supabase.from('leave_applications').select('*').order('created_at', {ascending: false})
  if (error) {
    console.error('获取所有请假申请失败:', error)
    return []
  }
  return Array.isArray(data) ? data : []
}

/**
 * 审批请假申请
 */
export async function reviewLeaveApplication(applicationId: string, review: ApplicationReviewInput): Promise<boolean> {
  try {
    const {data: application, error: fetchError} = await supabase
      .from('leave_applications')
      .select('user_id, leave_type, start_date, end_date, days, reason')
      .eq('id', applicationId)
      .maybeSingle()

    if (fetchError || !application || !application.user_id) {
      console.error('获取请假申请信息失败:', fetchError)
      return false
    }

    const {data: updateData, error: updateError} = await supabase
      .from('leave_applications')
      .update({
        status: review.status,
        reviewed_by: review.reviewed_by,
        review_notes: review.review_notes || null,
        reviewed_at: review.reviewed_at
      })
      .eq('id', applicationId)
      .select()

    if (updateError || !updateData || updateData.length === 0) {
      console.error('审批请假申请失败:', updateError)
      return false
    }

    // 发布事件通知其他组件刷新数据
    publish('leave:updated', {id: applicationId, status: review.status, userId: application.user_id})
    publish('notification:created')

    return true
  } catch (error) {
    console.error('审批请假申请异常:', error)
    return false
  }
}

// ==================== 离职申请相关 API ====================

/**
 * 创建离职申请
 */
export async function createResignationApplication(
  input: ResignationApplicationInput
): Promise<ResignationApplication | null> {
  try {
    const {
      data: {user}
    } = await supabase.auth.getUser()
    if (!user) {
      console.error('创建离职申请失败: 用户未登录')
      return null
    }

    const {data, error} = await supabase
      .from('resignation_applications')
      .insert({
        user_id: input.user_id,
        warehouse_id: input.warehouse_id,
        resignation_date: input.resignation_date,
        reason: input.reason,
        status: 'pending'
      })
      .select()
      .maybeSingle()

    if (error || !data) {
      console.error('创建离职申请失败:', error)
      return null
    }

    // 获取申请人信息（包括姓名、司机类型）
    const {data: applicant} = await supabase
      .from('users')
      .select('name, driver_type')
      .eq('id', input.user_id)
      .maybeSingle()
    // 获取司机类型：with_vehicle 表示带车司机，否则为纯司机
    const driverType: DriverType = applicant?.driver_type === 'with_vehicle' ? 'with_vehicle' : 'pure'
    // 清理姓名中可能存在的司机类型前缀，避免消息中出现"纯司机司机"这样的重复
    let applicantName = applicant?.name || ''
    // 移除可能的司机类型前缀（纯司机、带车司机、司机）
    applicantName = applicantName.replace(/^(纯司机|带车司机|司机)\s*/, '') || '司机'

    // 获取司机的仓库列表
    const {data: warehouseAssignments} = await supabase
      .from('warehouse_assignments')
      .select('warehouse_id, warehouses(id, name)')
      .eq('user_id', input.user_id)
    const warehouses: WarehouseInfo[] = (warehouseAssignments || [])
      .map((wa: any) => wa.warehouses)
      .filter((w: any) => w && w.name)
      .map((w: any) => ({id: w.id, name: w.name}))

    // 获取仓库显示名称
    const warehouseLabel = warehouses.length === 0 ? '未分配仓库' : warehouses.length === 1 ? warehouses[0].name : '多仓库'
    // 获取司机类型显示名称
    const driverTypeLabel = driverType === 'with_vehicle' ? '带车司机' : '纯司机'

    // 格式化离职日期
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    // 消息格式：{仓库名} {司机类型}{姓名} 提交日期：{日期} 离职申请\n事由：{原因}
    // 示例：北京仓 纯司机张三 提交日期：2024-12-20 离职申请\n事由：个人原因
    await sendDriverSubmissionNotification({
      driverId: input.user_id,
      driverName: applicantName,
      type: 'resignation_application_submitted',
      title: '新的离职申请',
      content: `${warehouseLabel} ${driverTypeLabel}${applicantName} 提交日期：${formatDate(input.resignation_date)} 离职申请\n事由：${input.reason || '无'}`,
      relatedId: data.id,
      approvalStatus: 'pending'
    })

    // 发布事件通知其他组件刷新数据
    publish('resignation:created', {id: data.id, userId: input.user_id})
    publish('notification:created')

    return data
  } catch (error) {
    console.error('创建离职申请异常:', error)
    return null
  }
}

/**
 * 保存离职申请草稿
 */
export async function saveDraftResignationApplication(
  input: ResignationApplicationInput
): Promise<ResignationApplication | null> {
  return createResignationApplication(input)
}

/**
 * 更新离职申请草稿
 */
export async function updateDraftResignationApplication(
  draftId: string,
  input: Partial<ResignationApplicationInput>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {}
  if (input.resignation_date !== undefined) updateData.resignation_date = input.resignation_date
  if (input.reason !== undefined) updateData.reason = input.reason

  const {error} = await supabase.from('resignation_applications').update(updateData).eq('id', draftId)
  if (error) {
    console.error('更新离职申请草稿失败:', error)
    return false
  }
  return true
}

/**
 * 提交离职申请草稿
 */
export async function submitDraftResignationApplication(_draftId: string): Promise<boolean> {
  return true
}

/**
 * 删除离职申请草稿
 */
export async function deleteDraftResignationApplication(draftId: string): Promise<boolean> {
  const {error} = await supabase.from('resignation_applications').delete().eq('id', draftId)
  if (error) {
    console.error('删除离职申请草稿失败:', error)
    return false
  }
  return true
}

/**
 * 获取用户的离职申请草稿列表
 */
export async function getDraftResignationApplications(_userId: string): Promise<ResignationApplication[]> {
  return []
}

/**
 * 获取用户的所有离职申请
 */
export async function getResignationApplicationsByUser(userId: string): Promise<ResignationApplication[]> {
  const {data, error} = await supabase
    .from('resignation_applications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取离职申请失败:', error)
    return []
  }
  return Array.isArray(data) ? data : []
}

/**
 * 获取仓库的所有离职申请
 */
export async function getResignationApplicationsByWarehouse(warehouseId: string): Promise<ResignationApplication[]> {
  const {data, error} = await supabase
    .from('resignation_applications')
    .select('*')
    .eq('warehouse_id', warehouseId)
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取仓库离职申请失败:', error)
    return []
  }
  return Array.isArray(data) ? data : []
}

/**
 * 获取所有离职申请（老板）
 * @returns 离职申请列表
 */
export async function getAllResignationApplications(): Promise<ResignationApplication[]> {
  console.log('[LeaveAPI] 开始获取所有离职申请...')
  
  const {data, error} = await supabase
    .from('resignation_applications')
    .select('*')
    .order('created_at', {ascending: false})

  if (error) {
    console.error('[LeaveAPI] 获取所有离职申请失败:', error)
    return []
  }
  
  console.log('[LeaveAPI] 获取离职申请成功，数量:', data?.length || 0)
  return Array.isArray(data) ? data : []
}

/**
 * 审批离职申请
 */
export async function reviewResignationApplication(
  applicationId: string,
  review: ApplicationReviewInput
): Promise<boolean> {
  try {
    const {data: application, error: fetchError} = await supabase
      .from('resignation_applications')
      .select('user_id, resignation_date, reason, status')
      .eq('id', applicationId)
      .maybeSingle()

    if (fetchError || !application || !application.user_id) {
      console.error('获取离职申请信息失败:', fetchError)
      return false
    }

    const {error: updateError} = await supabase
      .from('resignation_applications')
      .update({
        status: review.status,
        reviewed_by: review.reviewed_by,
        review_notes: review.review_notes || null,
        reviewed_at: review.reviewed_at
      })
      .eq('id', applicationId)
      .select()

    if (updateError) {
      console.error('审批离职申请失败:', updateError)
      return false
    }

    // 发布事件通知其他组件刷新数据
    publish('resignation:updated', {id: applicationId, status: review.status, userId: application.user_id})
    publish('notification:created')

    return true
  } catch (error) {
    console.error('审批离职申请异常:', error)
    return false
  }
}

// ==================== 验证和统计 ====================

/**
 * 验证请假申请
 */
export async function validateLeaveApplication(
  warehouseId: string,
  days: number
): Promise<{
  valid: boolean
  maxDays: number
  message?: string
}> {
  const {data: settings, error} = await supabase
    .from('warehouses')
    .select('max_leave_days')
    .eq('id', warehouseId)
    .maybeSingle()

  if (error || !settings) {
    return {valid: false, maxDays: 7, message: '无法获取仓库设置'}
  }

  const {max_leave_days} = settings
  if (days > max_leave_days) {
    return {
      valid: false,
      maxDays: max_leave_days,
      message: `请假天数(${days}天)超过仓库上限(${max_leave_days}天)`
    }
  }
  return {valid: true, maxDays: max_leave_days}
}

/**
 * 验证离职日期
 */
export async function validateResignationDate(
  warehouseId: string,
  date: string
): Promise<{
  valid: boolean
  minDate: string
  noticeDays: number
  message?: string
}> {
  const {data: settings, error} = await supabase
    .from('warehouses')
    .select('resignation_notice_days')
    .eq('id', warehouseId)
    .maybeSingle()

  if (error || !settings) {
    return {valid: false, minDate: '', noticeDays: 30, message: '无法获取仓库设置'}
  }

  const {resignation_notice_days} = settings
  const today = new Date()
  const minDate = new Date(today)
  minDate.setDate(minDate.getDate() + resignation_notice_days)
  const minDateStr = getLocalDateString(minDate)
  const selectedDate = new Date(date)

  if (selectedDate < minDate) {
    return {
      valid: false,
      minDate: minDateStr,
      noticeDays: resignation_notice_days,
      message: `离职日期必须在${minDateStr}之后（需提前${resignation_notice_days}天）`
    }
  }
  return {valid: true, minDate: minDateStr, noticeDays: resignation_notice_days}
}

// 注意：getMonthlyLeaveCount 和 getMonthlyPendingLeaveCount 已迁移到 dashboard.ts

/**
 * 获取用户已批准或待审批的请假记录（用于计算可用请假日期）
 * @param userId - 用户ID
 * @returns 已批准和待审批的请假记录列表
 */
export async function getApprovedAndPendingLeaves(userId: string): Promise<LeaveApplication[]> {
  const {data, error} = await supabase
    .from('leave_applications')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['approved', 'pending'])
    .order('start_date', {ascending: true})

  if (error) {
    console.error('获取已批准/待审批请假记录失败:', error)
    return []
  }
  return Array.isArray(data) ? data : []
}

/**
 * 计算最早可用的请假开始日期
 * 跳过已批准或待审批的请假日期范围
 * @param userId - 用户ID
 * @param baseDate - 基准日期（默认为明天）
 * @returns 最早可用的请假开始日期
 */
export async function getEarliestAvailableLeaveDate(userId: string, baseDate?: string): Promise<string> {
  // 获取已批准和待审批的请假记录
  const leaves = await getApprovedAndPendingLeaves(userId)
  
  // 基准日期默认为明天
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  let currentDate = baseDate ? new Date(baseDate) : tomorrow
  
  // 如果没有已批准/待审批的请假，直接返回基准日期
  if (leaves.length === 0) {
    return getLocalDateString(currentDate)
  }
  
  // 检查当前日期是否与已有请假冲突，如果冲突则延后
  let maxIterations = 365 // 最多检查一年，防止无限循环
  while (maxIterations > 0) {
    let hasConflict = false
    
    for (const leave of leaves) {
      const startDate = new Date(leave.start_date)
      const endDate = new Date(leave.end_date)
      
      // 检查当前日期是否在请假范围内
      if (currentDate >= startDate && currentDate <= endDate) {
        // 有冲突，将日期延后到请假结束日期的下一天
        currentDate = new Date(endDate)
        currentDate.setDate(currentDate.getDate() + 1)
        hasConflict = true
        break
      }
    }
    
    // 如果没有冲突，返回当前日期
    if (!hasConflict) {
      return getLocalDateString(currentDate)
    }
    
    maxIterations--
  }
  
  // 如果超过最大迭代次数，返回基准日期
  return getLocalDateString(baseDate ? new Date(baseDate) : tomorrow)
}

/**
 * 计算最早可用的离职日期
 * 考虑提前通知天数和已批准的请假
 * @param userId - 用户ID
 * @param noticeDays - 提前通知天数
 * @returns 最早可用的离职日期
 */
export async function getEarliestAvailableResignationDate(userId: string, noticeDays: number): Promise<string> {
  // 计算基于提前通知天数的最早日期
  const today = new Date()
  const minDate = new Date(today)
  minDate.setDate(minDate.getDate() + noticeDays)
  
  // 获取已批准和待审批的请假记录
  const leaves = await getApprovedAndPendingLeaves(userId)
  
  // 如果没有已批准/待审批的请假，直接返回最早日期
  if (leaves.length === 0) {
    return getLocalDateString(minDate)
  }
  
  // 检查最早日期是否与已有请假冲突，如果冲突则延后
  let currentDate = minDate
  let maxIterations = 365 // 最多检查一年，防止无限循环
  
  while (maxIterations > 0) {
    let hasConflict = false
    
    for (const leave of leaves) {
      const startDate = new Date(leave.start_date)
      const endDate = new Date(leave.end_date)
      
      // 检查当前日期是否在请假范围内
      if (currentDate >= startDate && currentDate <= endDate) {
        // 有冲突，将日期延后到请假结束日期的下一天
        currentDate = new Date(endDate)
        currentDate.setDate(currentDate.getDate() + 1)
        hasConflict = true
        break
      }
    }
    
    // 如果没有冲突，返回当前日期
    if (!hasConflict) {
      return getLocalDateString(currentDate)
    }
    
    maxIterations--
  }
  
  // 如果超过最大迭代次数，返回基于通知天数的最早日期
  return getLocalDateString(minDate)
}
