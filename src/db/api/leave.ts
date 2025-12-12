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
 */

import {supabase} from '@/client/supabase'
import {sendDriverSubmissionNotification} from '@/services/notificationService'

// 从aspi.legacy导入通知函数（避免循环依赖）
import {formatLeaveDate} from '@/utils/dateFormat'
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

    // 获取申请人信息并发送通知
    const {data: applicant} = await supabase.from('users').select('name').eq('id', input.user_id).maybeSingle()
    const applicantName = applicant?.name || '司机'
    const leaveTypeMap: Record<string, string> = {personal: '事假', sick: '病假', annual: '年假', other: '其他'}
    const leaveTypeLabel = leaveTypeMap[input.leave_type] || '请假'
    const dateRangeText = formatLeaveDate(input.start_date, input.end_date, data.days || 0)

    await sendDriverSubmissionNotification({
      driverId: input.user_id,
      driverName: applicantName,
      type: 'leave_application_submitted',
      title: '新的请假申请',
      content: `${applicantName}提交了${leaveTypeLabel}申请（${dateRangeText}），请及时审批`,
      relatedId: data.id,
      approvalStatus: 'pending'
    })

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

    // 获取申请人信息并发送通知
    const {data: applicant} = await supabase.from('users').select('name').eq('id', input.user_id).maybeSingle()
    const applicantName = applicant?.name || '司机'
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    await sendDriverSubmissionNotification({
      driverId: input.user_id,
      driverName: applicantName,
      type: 'resignation_application_submitted',
      title: '新的离职申请',
      content: `${applicantName}提交了离职申请（离职日期：${formatDate(input.resignation_date)}），请及时审批`,
      relatedId: data.id,
      approvalStatus: 'pending'
    })

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
 */
export async function getAllResignationApplications(): Promise<ResignationApplication[]> {
  const {data, error} = await supabase
    .from('resignation_applications')
    .select('*')
    .order('created_at', {ascending: false})

  if (error) {
    console.error('获取所有离职申请失败:', error)
    return []
  }
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
