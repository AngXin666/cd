/**
 * 打卡检查工具函数模块
 * 提供计件操作前的打卡状态和请假状态检查功能
 * @module utils/attendance-check
 * 
 * Requirements: 1.7, 1.8
 */

import { getTodayAttendance, getLeaveApplications, LeaveStatus } from '@/api'
import { getLocalDateString } from './date'

/**
 * 打卡检查结果接口
 */
export interface AttendanceCheckResult {
  /** 是否可以进行计件操作 */
  canStart: boolean
  /** 不能进行计件的原因描述 */
  reason: string
  /** 详细检查结果 */
  checkResult: {
    /** 是否需要打卡 */
    needClockIn: boolean
    /** 是否在请假中 */
    onLeave: boolean
    /** 打卡时间（如果已打卡） */
    clockInTime?: string
  }
}

/**
 * 检查用户是否在请假中
 * 
 * @param userId - 用户 ID
 * @returns 是否在请假中
 */
async function checkOnLeave(userId: number): Promise<boolean> {
  try {
    // 获取用户的请假申请列表，只查询已批准的
    const applications = await getLeaveApplications({
      user_id: userId,
      status: LeaveStatus.APPROVED,
    })
    
    if (!applications || applications.length === 0) {
      return false
    }
    
    // 获取今天的日期
    const today = getLocalDateString()
    
    // 检查是否有覆盖今天的请假
    for (const app of applications) {
      const startDate = app.start_date
      const endDate = app.end_date
      
      // 检查今天是否在请假日期范围内
      if (startDate <= today && today <= endDate) {
        return true
      }
    }
    
    return false
  } catch (error) {
    console.error('检查请假状态失败:', error)
    // 出错时默认不阻止操作
    return false
  }
}

/**
 * 检查是否可以进行计件操作
 * 
 * 检查逻辑：
 * 1. 检查用户是否在请假中（已批准的请假覆盖今天）
 * 2. 检查用户今日是否已打卡
 * 
 * @param userId - 用户 ID
 * @returns 检查结果，包含是否可以进行计件、原因和详细检查结果
 * 
 * @example
 * const result = await canStartPieceWork(123)
 * if (!result.canStart) {
 *   if (result.checkResult.onLeave) {
 *     // 显示休假提示
 *   } else if (result.checkResult.needClockIn) {
 *     // 显示打卡提醒
 *   }
 * }
 */
export async function canStartPieceWork(userId: number): Promise<AttendanceCheckResult> {
  // 默认结果
  const result: AttendanceCheckResult = {
    canStart: false,
    reason: '',
    checkResult: {
      needClockIn: false,
      onLeave: false,
    },
  }
  
  try {
    // 1. 检查是否在请假中
    const onLeave = await checkOnLeave(userId)
    if (onLeave) {
      result.canStart = false
      result.reason = '您今日处于休假状态，无法进行计件操作'
      result.checkResult.onLeave = true
      return result
    }
    
    // 2. 检查今日打卡状态
    const todayAttendance = await getTodayAttendance()
    
    // 如果没有打卡记录或未打卡
    if (!todayAttendance || !todayAttendance.clock_in_time) {
      result.canStart = false
      result.reason = '您今日尚未打卡，请先完成打卡'
      result.checkResult.needClockIn = true
      return result
    }
    
    // 已打卡，可以进行计件
    result.canStart = true
    result.reason = ''
    result.checkResult.needClockIn = false
    result.checkResult.onLeave = false
    
    // 记录打卡信息
    if (todayAttendance.clock_in_time) {
      result.checkResult.clockInTime = todayAttendance.clock_in_time
    }
    
    return result
  } catch (error) {
    console.error('检查打卡状态失败:', error)
    // 出错时返回需要打卡的状态，让用户重试
    result.canStart = false
    result.reason = '检查打卡状态失败，请稍后重试'
    result.checkResult.needClockIn = true
    return result
  }
}

/**
 * 显示打卡提醒弹窗
 * 
 * @param onConfirm - 用户确认跳转打卡页面的回调
 * @param onCancel - 用户取消的回调
 * 
 * @example
 * showClockInReminder(
 *   () => uni.navigateTo({ url: '/pages/driver/clock/index' }),
 *   () => console.log('用户取消')
 * )
 */
export function showClockInReminder(
  onConfirm?: () => void,
  onCancel?: () => void
): void {
  uni.showModal({
    title: '打卡提醒',
    content: '您今日尚未打卡，是否前往打卡？',
    confirmText: '去打卡',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        onConfirm?.()
      } else {
        onCancel?.()
      }
    },
  })
}

/**
 * 显示休假提示弹窗
 * 
 * @param onConfirm - 用户确认的回调
 * 
 * @example
 * showOnLeaveAlert(() => console.log('用户已知晓'))
 */
export function showOnLeaveAlert(onConfirm?: () => void): void {
  uni.showModal({
    title: '休假提示',
    content: '您今日处于休假状态，无法进行计件操作',
    showCancel: false,
    confirmText: '我知道了',
    success: () => {
      onConfirm?.()
    },
  })
}

/**
 * 执行计件前检查并显示相应提示
 * 
 * 这是一个便捷函数，整合了检查和提示逻辑
 * 
 * @param userId - 用户 ID
 * @param onSuccess - 检查通过的回调，参数为检查结果
 * @param onGoClockIn - 用户选择去打卡的回调
 * 
 * @example
 * checkAndPrompt(
 *   userId,
 *   (result) => {
 *     // 检查通过，可以进行计件
 *     console.log('打卡仓库:', result.checkResult.warehouseName)
 *   },
 *   () => {
 *     // 跳转到打卡页面
 *     uni.navigateTo({ url: '/pages/driver/clock/index' })
 *   }
 * )
 */
export async function checkAndPrompt(
  userId: number,
  onSuccess: (result: AttendanceCheckResult) => void,
  onGoClockIn?: () => void
): Promise<void> {
  const result = await canStartPieceWork(userId)
  
  if (result.canStart) {
    // 检查通过
    onSuccess(result)
  } else if (result.checkResult.onLeave) {
    // 在请假中
    showOnLeaveAlert()
  } else if (result.checkResult.needClockIn) {
    // 需要打卡
    showClockInReminder(onGoClockIn)
  }
}
