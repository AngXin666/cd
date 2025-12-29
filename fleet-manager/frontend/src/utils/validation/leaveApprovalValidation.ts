/**
 * 请假审批状态验证模块
 * 提供请假审批状态变更的验证逻辑
 * @module utils/validation/leaveApprovalValidation
 * 
 * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
 * **Validates: Requirements 3.4, 3.5**
 */

import { LeaveStatus, LeaveType } from '@/api/types'

// ==================== 类型定义 ====================

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 是否验证通过 */
  valid: boolean
  /** 错误信息（验证失败时） */
  error?: string
}

/**
 * 请假申请状态接口（用于验证）
 */
export interface LeaveApplicationState {
  /** 申请ID */
  id: number
  /** 当前状态 */
  status: LeaveStatus
  /** 请假类型 */
  leaveType: LeaveType
  /** 申请人ID */
  userId: number
}

/**
 * 审批操作接口
 */
export interface ApprovalAction {
  /** 目标状态 */
  targetStatus: LeaveStatus
  /** 审批备注（拒绝时可选） */
  remark?: string
}

/**
 * 审批结果接口
 */
export interface ApprovalResult {
  /** 是否成功 */
  success: boolean
  /** 新状态 */
  newStatus: LeaveStatus
  /** 错误信息（失败时） */
  error?: string
}

// ==================== 常量定义 ====================

/**
 * 有效的审批目标状态
 * 只能审批为"已批准"或"已拒绝"
 */
export const VALID_APPROVAL_TARGETS: LeaveStatus[] = [
  LeaveStatus.APPROVED,
  LeaveStatus.REJECTED
]

/**
 * 可审批的初始状态
 * 只有"待审批"状态的申请可以被审批
 */
export const APPROVABLE_STATUS: LeaveStatus = LeaveStatus.PENDING

// ==================== 验证函数 ====================

/**
 * 验证请假申请是否可以被审批
 * 只有待审批状态的申请可以被审批
 * 
 * @param currentStatus - 当前状态
 * @returns 验证结果
 * 
 * **Validates: Requirements 3.3**
 */
export function validateCanApprove(currentStatus: LeaveStatus): ValidationResult {
  if (currentStatus !== APPROVABLE_STATUS) {
    return {
      valid: false,
      error: `只有待审批状态的申请可以被审批，当前状态为: ${getStatusName(currentStatus)}`
    }
  }
  
  return { valid: true }
}

/**
 * 验证审批目标状态是否有效
 * 只能审批为"已批准"或"已拒绝"
 * 
 * @param targetStatus - 目标状态
 * @returns 验证结果
 * 
 * **Validates: Requirements 3.4, 3.5**
 */
export function validateApprovalTarget(targetStatus: LeaveStatus): ValidationResult {
  if (!VALID_APPROVAL_TARGETS.includes(targetStatus)) {
    return {
      valid: false,
      error: `无效的审批目标状态: ${targetStatus}，只能审批为"已批准"或"已拒绝"`
    }
  }
  
  return { valid: true }
}

/**
 * 验证拒绝操作的备注
 * 拒绝时备注是可选的，但如果提供则不能为空白字符串
 * 
 * @param targetStatus - 目标状态
 * @param remark - 审批备注
 * @returns 验证结果
 * 
 * **Validates: Requirements 3.5**
 */
export function validateRejectRemark(targetStatus: LeaveStatus, remark?: string): ValidationResult {
  // 只有拒绝操作需要检查备注
  if (targetStatus !== LeaveStatus.REJECTED) {
    return { valid: true }
  }
  
  // 备注是可选的，但如果提供则不能只是空白字符
  if (remark !== undefined && remark.trim() === '' && remark !== '') {
    return {
      valid: false,
      error: '拒绝备注不能只包含空白字符'
    }
  }
  
  return { valid: true }
}

/**
 * 执行审批状态变更
 * 验证并执行状态变更，返回新状态
 * 
 * @param application - 请假申请状态
 * @param action - 审批操作
 * @returns 审批结果
 * 
 * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
 * **Validates: Requirements 3.4, 3.5**
 */
export function executeApproval(
  application: LeaveApplicationState,
  action: ApprovalAction
): ApprovalResult {
  // 1. 验证当前状态是否可审批
  const canApproveResult = validateCanApprove(application.status)
  if (!canApproveResult.valid) {
    return {
      success: false,
      newStatus: application.status,
      error: canApproveResult.error
    }
  }
  
  // 2. 验证目标状态是否有效
  const targetResult = validateApprovalTarget(action.targetStatus)
  if (!targetResult.valid) {
    return {
      success: false,
      newStatus: application.status,
      error: targetResult.error
    }
  }
  
  // 3. 验证拒绝备注
  const remarkResult = validateRejectRemark(action.targetStatus, action.remark)
  if (!remarkResult.valid) {
    return {
      success: false,
      newStatus: application.status,
      error: remarkResult.error
    }
  }
  
  // 4. 执行状态变更
  return {
    success: true,
    newStatus: action.targetStatus
  }
}

/**
 * 验证审批后状态是否正确
 * 核心属性：审批后状态必须等于目标状态
 * 
 * @param originalStatus - 原始状态
 * @param targetStatus - 目标状态
 * @param resultStatus - 结果状态
 * @returns 验证结果
 * 
 * **Feature: boss-missing-pages, Property 3: 请假审批状态变更**
 * **Validates: Requirements 3.4, 3.5**
 */
export function validateApprovalResult(
  originalStatus: LeaveStatus,
  targetStatus: LeaveStatus,
  resultStatus: LeaveStatus
): ValidationResult {
  // 如果原始状态不是待审批，结果状态应该保持不变
  if (originalStatus !== APPROVABLE_STATUS) {
    if (resultStatus !== originalStatus) {
      return {
        valid: false,
        error: `非待审批状态的申请不应该被修改，原始状态: ${originalStatus}，结果状态: ${resultStatus}`
      }
    }
    return { valid: true }
  }
  
  // 如果目标状态无效，结果状态应该保持不变
  if (!VALID_APPROVAL_TARGETS.includes(targetStatus)) {
    if (resultStatus !== originalStatus) {
      return {
        valid: false,
        error: `无效目标状态的审批不应该修改申请状态`
      }
    }
    return { valid: true }
  }
  
  // 有效审批后，结果状态应该等于目标状态
  if (resultStatus !== targetStatus) {
    return {
      valid: false,
      error: `审批后状态不正确，期望: ${targetStatus}，实际: ${resultStatus}`
    }
  }
  
  return { valid: true }
}

/**
 * 检查状态是否为终态（已批准或已拒绝）
 * 终态的申请不能再次审批
 * 
 * @param status - 状态
 * @returns 是否为终态
 */
export function isFinalStatus(status: LeaveStatus): boolean {
  return status === LeaveStatus.APPROVED || status === LeaveStatus.REJECTED
}

/**
 * 检查状态是否为待审批
 * 
 * @param status - 状态
 * @returns 是否为待审批
 */
export function isPendingStatus(status: LeaveStatus): boolean {
  return status === LeaveStatus.PENDING
}

/**
 * 获取状态显示名称
 * 
 * @param status - 状态
 * @returns 状态名称
 */
export function getStatusName(status: LeaveStatus): string {
  const statusMap: Record<LeaveStatus, string> = {
    [LeaveStatus.PENDING]: '待审批',
    [LeaveStatus.APPROVED]: '已批准',
    [LeaveStatus.REJECTED]: '已拒绝'
  }
  return statusMap[status] || '未知状态'
}

/**
 * 获取所有有效的请假状态
 * 
 * @returns 所有有效状态数组
 */
export function getAllLeaveStatuses(): LeaveStatus[] {
  return [LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.REJECTED]
}

/**
 * 验证状态是否为有效的请假状态
 * 
 * @param status - 状态值
 * @returns 是否为有效状态
 */
export function isValidLeaveStatus(status: string): status is LeaveStatus {
  return getAllLeaveStatuses().includes(status as LeaveStatus)
}
