/**
 * 状态显示工具
 * 统一管理各种状态的文本和样式映射
 * 
 * @module utils/statusDisplay
 */

// ==================== 类型定义 ====================

/**
 * 状态显示信息接口
 */
export interface StatusDisplayInfo {
  /** 显示文本 */
  text: string
  /** 文字颜色类名 */
  color: string
  /** 背景颜色类名 */
  bg: string
}

// ==================== 辅助函数 ====================

/**
 * 检查对象是否拥有指定的自有属性（不包括原型链上的属性）
 * @param obj - 要检查的对象
 * @param key - 属性名
 * @returns 是否拥有该自有属性
 */
function hasOwnProperty(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

// ==================== 考勤状态 ====================

/**
 * 考勤状态显示配置
 * - normal: 正常
 * - late: 迟到
 * - early: 早退
 * - absent: 缺勤
 */
export const attendanceStatusMap: Record<string, StatusDisplayInfo> = {
  normal: { text: '正常', color: 'text-green-600', bg: 'bg-green-50' },
  late: { text: '迟到', color: 'text-orange-600', bg: 'bg-orange-50' },
  early: { text: '早退', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  absent: { text: '缺勤', color: 'text-red-600', bg: 'bg-red-50' }
}

/**
 * 获取考勤状态显示信息
 * @param status - 考勤状态
 * @returns 状态显示信息
 */
export function getAttendanceStatusDisplay(status: string): StatusDisplayInfo {
  // 使用 hasOwnProperty 检查，避免原型链上的属性被误判为有效状态
  if (hasOwnProperty(attendanceStatusMap, status)) {
    return attendanceStatusMap[status]
  }
  return attendanceStatusMap.normal
}

// ==================== 审批状态 ====================

/**
 * 审批状态显示配置
 * - pending: 待审批
 * - approved: 已批准
 * - rejected: 已拒绝
 */
export const approvalStatusMap: Record<string, StatusDisplayInfo> = {
  pending: { text: '待审批', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  approved: { text: '已批准', color: 'text-green-700', bg: 'bg-green-100' },
  rejected: { text: '已拒绝', color: 'text-red-700', bg: 'bg-red-100' }
}

/**
 * 获取审批状态显示信息
 * @param status - 审批状态
 * @returns 状态显示信息
 */
export function getApprovalStatusDisplay(status: string): StatusDisplayInfo {
  // 使用 hasOwnProperty 检查，避免原型链上的属性被误判为有效状态
  if (hasOwnProperty(approvalStatusMap, status)) {
    return approvalStatusMap[status]
  }
  return { text: status, color: 'text-gray-700', bg: 'bg-gray-100' }
}

// ==================== 通知状态 ====================

/**
 * 通知状态显示配置
 * - pending: 待发送
 * - sent: 已发送
 * - failed: 发送失败
 */
export const notificationStatusMap: Record<string, StatusDisplayInfo> = {
  pending: { text: '待发送', color: 'text-blue-700', bg: 'bg-blue-100' },
  sent: { text: '已发送', color: 'text-green-700', bg: 'bg-green-100' },
  failed: { text: '发送失败', color: 'text-red-700', bg: 'bg-red-100' }
}

/**
 * 获取通知状态显示信息
 * @param status - 通知状态
 * @returns 状态显示信息
 */
export function getNotificationStatusDisplay(status: string): StatusDisplayInfo {
  // 使用 hasOwnProperty 检查，避免原型链上的属性被误判为有效状态
  if (hasOwnProperty(notificationStatusMap, status)) {
    return notificationStatusMap[status]
  }
  return notificationStatusMap.pending
}

// ==================== 车辆状态 ====================

/**
 * 车辆审核状态显示配置
 * - pending_review: 待审核
 * - approved: 已通过
 * - rejected: 已拒绝
 * - need_supplement: 需补录
 */
export const vehicleReviewStatusMap: Record<string, StatusDisplayInfo> = {
  pending_review: { text: '待审核', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  approved: { text: '已通过', color: 'text-green-700', bg: 'bg-green-100' },
  rejected: { text: '已拒绝', color: 'text-red-700', bg: 'bg-red-100' },
  need_supplement: { text: '需补录', color: 'text-orange-700', bg: 'bg-orange-100' }
}

/**
 * 获取车辆审核状态显示信息
 * @param status - 车辆审核状态
 * @returns 状态显示信息
 */
export function getVehicleReviewStatusDisplay(status: string): StatusDisplayInfo {
  // 使用 hasOwnProperty 检查，避免原型链上的属性（如 valueOf、toString）被误判为有效状态
  if (hasOwnProperty(vehicleReviewStatusMap, status)) {
    return vehicleReviewStatusMap[status]
  }
  return { text: status, color: 'text-gray-700', bg: 'bg-gray-100' }
}

// ==================== 请假类型 ====================

/**
 * 请假类型显示配置
 */
export const leaveTypeMap: Record<string, string> = {
  personal: '事假',
  sick: '病假',
  annual: '年假',
  other: '其他'
}

/**
 * 获取请假类型显示文本
 * @param type - 请假类型
 * @returns 显示文本
 */
export function getLeaveTypeText(type: string): string {
  // 使用 hasOwnProperty 检查，避免原型链上的属性被误判为有效类型
  if (hasOwnProperty(leaveTypeMap, type)) {
    return leaveTypeMap[type]
  }
  return type
}

// ==================== 通用状态获取函数 ====================

/**
 * 通用状态显示信息获取函数
 * @param status - 状态值
 * @param statusMap - 状态映射表
 * @param defaultKey - 默认状态键（可选）
 * @returns 状态显示信息
 */
export function getStatusDisplay(
  status: string,
  statusMap: Record<string, StatusDisplayInfo>,
  defaultKey?: string
): StatusDisplayInfo {
  // 使用 hasOwnProperty 检查，避免原型链上的属性被误判为有效状态
  if (hasOwnProperty(statusMap, status)) {
    return statusMap[status]
  }
  if (defaultKey && hasOwnProperty(statusMap, defaultKey)) {
    return statusMap[defaultKey]
  }
  return {
    text: status,
    color: 'text-gray-600',
    bg: 'bg-gray-50'
  }
}
