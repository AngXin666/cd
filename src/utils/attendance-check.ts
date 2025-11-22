/**
 * 考勤打卡检测工具
 * 用于检测司机的打卡状态和请假状态
 */

import {getApprovedLeaveForToday, getTodayAttendance} from '@/db/api'

/**
 * 检测结果类型
 */
export interface AttendanceCheckResult {
  // 是否需要打卡
  needClockIn: boolean
  // 是否已打卡
  hasClockedIn: boolean
  // 是否在请假中
  onLeave: boolean
  // 请假记录ID（如果在请假中）
  leaveId?: string
  // 请假类型
  leaveType?: string
  // 提示消息
  message: string
}

/**
 * 检测司机当日的打卡状态
 * @param userId 用户ID
 * @returns 检测结果
 */
export async function checkTodayAttendance(userId: string): Promise<AttendanceCheckResult> {
  try {
    // 1. 检查是否有已批准的请假
    const leaveRecord = await getApprovedLeaveForToday(userId)

    if (leaveRecord) {
      // 有请假，豁免打卡
      return {
        needClockIn: false,
        hasClockedIn: false,
        onLeave: true,
        leaveId: leaveRecord.id,
        leaveType: leaveRecord.leave_type,
        message: '今天您休息，无需打卡'
      }
    }

    // 2. 检查是否已打卡
    const attendance = await getTodayAttendance(userId)

    if (attendance) {
      // 已打卡
      return {
        needClockIn: false,
        hasClockedIn: true,
        onLeave: false,
        message: '今天已打卡'
      }
    }

    // 3. 未打卡且未请假
    return {
      needClockIn: true,
      hasClockedIn: false,
      onLeave: false,
      message: '今天尚未打卡'
    }
  } catch (error) {
    console.error('[checkTodayAttendance] 检测失败:', error)
    // 发生错误时，默认不阻止操作
    return {
      needClockIn: false,
      hasClockedIn: false,
      onLeave: false,
      message: '检测失败，请稍后重试'
    }
  }
}

/**
 * 检测是否可以进行计件操作
 * @param userId 用户ID
 * @returns 是否可以计件
 */
export async function canStartPieceWork(userId: string): Promise<{
  canStart: boolean
  reason?: string
  checkResult: AttendanceCheckResult
}> {
  const checkResult = await checkTodayAttendance(userId)

  // 如果在请假中，不能计件
  if (checkResult.onLeave) {
    return {
      canStart: false,
      reason: '您今天在休假中，无法进行计件操作',
      checkResult
    }
  }

  // 如果未打卡，不能计件
  if (checkResult.needClockIn) {
    return {
      canStart: false,
      reason: '您今天尚未打卡，请先完成打卡',
      checkResult
    }
  }

  // 可以计件
  return {
    canStart: true,
    checkResult
  }
}

/**
 * 检测是否可以打卡
 * @param userId 用户ID
 * @returns 是否可以打卡
 */
export async function canClockIn(userId: string): Promise<{
  canClockIn: boolean
  reason?: string
  checkResult: AttendanceCheckResult
}> {
  const checkResult = await checkTodayAttendance(userId)

  // 如果在请假中，不能打卡
  if (checkResult.onLeave) {
    return {
      canClockIn: false,
      reason: '您今天在休假中，无需打卡',
      checkResult
    }
  }

  // 如果已打卡，不能重复打卡
  if (checkResult.hasClockedIn) {
    return {
      canClockIn: false,
      reason: '您今天已经打卡了',
      checkResult
    }
  }

  // 可以打卡
  return {
    canClockIn: true,
    checkResult
  }
}
