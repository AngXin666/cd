/**
 * 通知消息组装工具
 * 提供统一的通知消息格式化函数，确保消息格式一致且包含完整信息
 *
 * 消息格式规范：
 * - 司机提交申请：{仓库名} {司机类型} {姓名} 提交了{申请类型}申请
 * - 审批结果：{审批人角色} {审批人姓名} {通过/拒绝} {原始消息}
 * - 仓库分配：您被 {操作者角色} {操作者姓名} {分配到/取消分配} {仓库名} 仓库
 * - 类型变更：您被 {操作者角色} {操作者姓名} 变更为{新司机类型}
 *
 * @module utils/notificationMessageBuilder
 */

// ==================== 类型定义 ====================

/**
 * 司机类型
 * - pure: 纯司机（无车）
 * - with_vehicle: 带车司机（有车）
 */
export type DriverType = 'pure' | 'with_vehicle'

/**
 * 用户角色类型
 */
export type UserRole = 'BOSS' | 'MANAGER' | 'PEER_ADMIN' | 'DRIVER'

/**
 * 申请类型
 * - leave: 请假申请
 * - resignation: 离职申请
 * - vehicle: 车辆申请
 * - none: 不带申请类型后缀（用于自定义消息格式）
 */
export type ApplicationType = 'leave' | 'resignation' | 'vehicle' | 'none'

/**
 * 仓库信息接口
 */
export interface WarehouseInfo {
  /** 仓库 ID */
  id?: string
  /** 仓库名称 */
  name: string
}

/**
 * 司机信息接口，用于组装通知消息
 */
export interface DriverInfo {
  /** 司机 ID */
  id?: string
  /** 司机姓名 */
  name: string
  /** 司机类型 */
  driverType: DriverType
  /** 分配的仓库列表 */
  warehouses: WarehouseInfo[]
}

/**
 * 操作者信息接口
 */
export interface OperatorInfo {
  /** 操作者 ID */
  id?: string
  /** 操作者姓名 */
  name: string
  /** 操作者角色 */
  role: UserRole
}

// ==================== 标签获取函数 ====================

/**
 * 获取司机类型显示名称
 * @param hasVehicle - 是否有车（true: 带车司机, false: 纯司机）
 * @returns 司机类型显示名称
 *
 * @example
 * getDriverTypeLabel(true)  // '带车司机'
 * getDriverTypeLabel(false) // '纯司机'
 */
export function getDriverTypeLabel(hasVehicle: boolean): string {
  return hasVehicle ? '带车司机' : '纯司机'
}

/**
 * 根据 DriverType 枚举获取司机类型显示名称
 * @param driverType - 司机类型枚举值
 * @returns 司机类型显示名称
 *
 * @example
 * getDriverTypeLabelByType('with_vehicle') // '带车司机'
 * getDriverTypeLabelByType('pure')         // '纯司机'
 */
export function getDriverTypeLabelByType(driverType: DriverType): string {
  return driverType === 'with_vehicle' ? '带车司机' : '纯司机'
}

/**
 * 获取仓库显示名称
 * 单仓库显示仓库名称，多仓库显示"多仓库"，无仓库显示"未分配仓库"
 *
 * @param warehouses - 仓库列表
 * @returns 仓库显示名称
 *
 * @example
 * getWarehouseLabel([])                           // '未分配仓库'
 * getWarehouseLabel([{name: '北京仓'}])           // '北京仓'
 * getWarehouseLabel([{name: '北京仓'}, {name: '上海仓'}]) // '多仓库'
 */
export function getWarehouseLabel(warehouses: WarehouseInfo[]): string {
  // 无仓库
  if (!warehouses || warehouses.length === 0) {
    return '未分配仓库'
  }
  // 单仓库
  if (warehouses.length === 1) {
    return warehouses[0].name
  }
  // 多仓库
  return '多仓库'
}

/**
 * 获取角色显示名称
 * @param role - 用户角色
 * @returns 角色显示名称
 *
 * @example
 * getRoleLabel('BOSS')       // '老板'
 * getRoleLabel('MANAGER')    // '车队长'
 * getRoleLabel('PEER_ADMIN') // '调度'
 * getRoleLabel('DRIVER')     // '司机'
 */
export function getRoleLabel(role: string): string {
  const roleLabels: Record<string, string> = {
    BOSS: '老板',
    MANAGER: '车队长',
    PEER_ADMIN: '调度',
    DRIVER: '司机'
  }
  return roleLabels[role] || '管理员'
}

/**
 * 获取操作者显示名称（角色+姓名）
 * 规则：老板不显示姓名，车队长和调度显示姓名
 *
 * @param role - 用户角色
 * @param name - 用户姓名
 * @returns 操作者显示名称
 *
 * @example
 * getOperatorLabel('BOSS', '王五')       // '老板'
 * getOperatorLabel('MANAGER', '王五')    // '车队长王五'
 * getOperatorLabel('PEER_ADMIN', '李四') // '调度李四'
 */
export function getOperatorLabel(role: string, name: string): string {
  const roleLabel = getRoleLabel(role)
  // 老板不显示姓名
  if (role === 'BOSS') {
    return roleLabel
  }
  // 车队长和调度显示姓名（角色和姓名之间不要空格）
  return `${roleLabel}${name}`
}

/**
 * 获取申请类型显示名称
 * @param type - 申请类型
 * @returns 申请类型显示名称
 *
 * @example
 * getApplicationTypeLabel('leave')       // '请假'
 * getApplicationTypeLabel('resignation') // '离职'
 * getApplicationTypeLabel('vehicle')     // '车辆'
 */
export function getApplicationTypeLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    leave: '请假',
    resignation: '离职',
    vehicle: '车辆'
  }
  return typeLabels[type] || '申请'
}

// ==================== 消息组装函数 ====================

/**
 * 组装司机提交申请的通知消息
 * 格式：{仓库名} {司机类型} {姓名} 提交了{申请类型}申请
 * 当 applicationType 为 'none' 时，格式为：{仓库名} {司机类型} {姓名} 提交了
 *
 * @param driverName - 司机姓名
 * @param driverType - 司机类型（'pure' 或 'with_vehicle'）
 * @param warehouses - 仓库列表
 * @param applicationType - 申请类型（'leave', 'resignation', 'vehicle', 'none'）
 * @returns 格式化的消息内容
 *
 * @example
 * // 单仓库纯司机请假
 * buildSubmissionMessage('张三', 'pure', [{name: '北京仓'}], 'leave')
 * // 返回: '北京仓 纯司机 张三 提交了请假申请'
 *
 * // 多仓库带车司机离职
 * buildSubmissionMessage('李四', 'with_vehicle', [{name: '北京仓'}, {name: '上海仓'}], 'resignation')
 * // 返回: '多仓库 带车司机 李四 提交了离职申请'
 *
 * // 不带申请类型后缀（用于自定义消息格式）
 * buildSubmissionMessage('张三', 'pure', [{name: '北京仓'}], 'none')
 * // 返回: '北京仓 纯司机 张三 提交了'
 */
export function buildSubmissionMessage(
  driverName: string,
  driverType: DriverType,
  warehouses: WarehouseInfo[],
  applicationType: ApplicationType
): string {
  // 获取各部分的显示名称
  const warehouseLabel = getWarehouseLabel(warehouses)
  const driverTypeLabel = getDriverTypeLabelByType(driverType)

  // 如果是 'none' 类型，不添加申请类型后缀
  if (applicationType === 'none') {
    // 组装消息：{仓库名} {司机类型} {姓名} 提交了
    return `${warehouseLabel} ${driverTypeLabel} ${driverName} 提交了`
  }

  // 获取申请类型显示名称
  const applicationLabel = getApplicationTypeLabel(applicationType)

  // 组装消息：{仓库名} {司机类型} {姓名} 提交了{申请类型}申请
  return `${warehouseLabel} ${driverTypeLabel} ${driverName} 提交了${applicationLabel}申请`
}

/**
 * 组装审批结果的通知消息
 * 格式：{操作者}{通过/拒绝}了 {原始消息}
 * 规则：老板不显示姓名，车队长和调度显示姓名
 * 注意："通过了"或"拒绝了"后面必须添加一个空格
 *
 * @param originalMessage - 原始提交消息（如：北京仓 纯司机张三的请假申请）
 * @param approverName - 审批人姓名
 * @param approverRole - 审批人角色（'BOSS', 'MANAGER', 'PEER_ADMIN'）
 * @param isApproved - 是否通过（true: 通过, false: 拒绝）
 * @returns 格式化的消息内容
 *
 * @example
 * // 老板通过（不显示姓名）
 * buildApprovalMessage('北京仓 纯司机张三的请假申请', '王五', 'BOSS', true)
 * // 返回: '老板通过了 北京仓 纯司机张三的请假申请'
 *
 * // 车队长拒绝（显示姓名）
 * buildApprovalMessage('北京仓 纯司机张三的请假申请', '赵六', 'MANAGER', false)
 * // 返回: '车队长赵六拒绝了 北京仓 纯司机张三的请假申请'
 */
export function buildApprovalMessage(
  originalMessage: string,
  approverName: string,
  approverRole: UserRole,
  isApproved: boolean
): string {
  // 获取操作者显示名称（老板不显示姓名，车队长和调度显示姓名）
  const operatorLabel = getOperatorLabel(approverRole, approverName)
  // 获取审批结果文本
  const resultLabel = isApproved ? '通过' : '拒绝'

  // 组装消息：{操作者}{通过/拒绝}了 {原始消息}
  // 注意："通过了"或"拒绝了"后面必须添加一个空格
  return `${operatorLabel}${resultLabel}了 ${originalMessage}`
}

/**
 * 组装仓库分配变更的通知消息
 * 格式：您被{操作者}{分配到/取消分配}{仓库名}
 * 规则：老板不显示姓名，车队长和调度显示姓名
 *
 * @param operatorName - 操作者姓名
 * @param operatorRole - 操作者角色（'BOSS', 'MANAGER', 'PEER_ADMIN'）
 * @param warehouseName - 仓库名称
 * @param isAssign - 是否为分配操作（true: 分配, false: 取消分配）
 * @returns 格式化的消息内容
 *
 * @example
 * // 老板分配仓库（不显示姓名）
 * buildWarehouseAssignmentMessage('王五', 'BOSS', '北京仓', true)
 * // 返回: '您被老板分配到北京仓'
 *
 * // 车队长取消分配（显示姓名）
 * buildWarehouseAssignmentMessage('王五', 'MANAGER', '北京仓', false)
 * // 返回: '您被车队长王五取消分配北京仓'
 */
export function buildWarehouseAssignmentMessage(
  operatorName: string,
  operatorRole: UserRole,
  warehouseName: string,
  isAssign: boolean
): string {
  // 获取操作者显示名称（老板不显示姓名，车队长和调度显示姓名）
  const operatorLabel = getOperatorLabel(operatorRole, operatorName)
  // 获取操作类型文本
  const actionLabel = isAssign ? '分配到' : '取消分配'

  // 组装消息：您被{操作者}{分配到/取消分配}{仓库名}
  return `您被${operatorLabel}${actionLabel}${warehouseName}`
}

/**
 * 组装司机类型变更的通知消息
 * 格式：您被{操作者}变更为{新司机类型}
 * 规则：老板不显示姓名，车队长和调度显示姓名
 *
 * @param operatorName - 操作者姓名
 * @param operatorRole - 操作者角色（'BOSS', 'MANAGER', 'PEER_ADMIN'）
 * @param newDriverType - 新的司机类型（'pure' 或 'with_vehicle'）
 * @returns 格式化的消息内容
 *
 * @example
 * // 老板变更为带车司机（不显示姓名）
 * buildDriverTypeChangeMessage('王五', 'BOSS', 'with_vehicle')
 * // 返回: '您被老板变更为带车司机'
 *
 * // 车队长变更为纯司机（显示姓名）
 * buildDriverTypeChangeMessage('王五', 'MANAGER', 'pure')
 * // 返回: '您被车队长王五变更为纯司机'
 */
export function buildDriverTypeChangeMessage(
  operatorName: string,
  operatorRole: UserRole,
  newDriverType: DriverType
): string {
  // 获取操作者显示名称（老板不显示姓名，车队长和调度显示姓名）
  const operatorLabel = getOperatorLabel(operatorRole, operatorName)
  // 获取司机类型显示名称
  const driverTypeLabel = getDriverTypeLabelByType(newDriverType)

  // 组装消息：您被{操作者}变更为{新司机类型}
  return `您被${operatorLabel}变更为${driverTypeLabel}`
}

// ==================== 便捷函数 ====================

/**
 * 使用 DriverInfo 对象组装提交申请消息
 * 这是 buildSubmissionMessage 的便捷版本
 *
 * @param driverInfo - 司机信息对象
 * @param applicationType - 申请类型
 * @returns 格式化的消息内容
 *
 * @example
 * const driverInfo = {
 *   name: '张三',
 *   driverType: 'pure' as DriverType,
 *   warehouses: [{name: '北京仓'}]
 * }
 * buildSubmissionMessageFromInfo(driverInfo, 'leave')
 * // 返回: '北京仓 纯司机 张三 提交了请假申请'
 */
export function buildSubmissionMessageFromInfo(
  driverInfo: DriverInfo,
  applicationType: ApplicationType
): string {
  return buildSubmissionMessage(
    driverInfo.name,
    driverInfo.driverType,
    driverInfo.warehouses,
    applicationType
  )
}

/**
 * 使用 OperatorInfo 对象组装审批结果消息
 * 这是 buildApprovalMessage 的便捷版本
 *
 * @param originalMessage - 原始提交消息
 * @param operatorInfo - 操作者信息对象
 * @param isApproved - 是否通过
 * @returns 格式化的消息内容
 */
export function buildApprovalMessageFromInfo(
  originalMessage: string,
  operatorInfo: OperatorInfo,
  isApproved: boolean
): string {
  return buildApprovalMessage(originalMessage, operatorInfo.name, operatorInfo.role, isApproved)
}

/**
 * 使用 OperatorInfo 对象组装仓库分配消息
 * 这是 buildWarehouseAssignmentMessage 的便捷版本
 *
 * @param operatorInfo - 操作者信息对象
 * @param warehouseName - 仓库名称
 * @param isAssign - 是否为分配操作
 * @returns 格式化的消息内容
 */
export function buildWarehouseAssignmentMessageFromInfo(
  operatorInfo: OperatorInfo,
  warehouseName: string,
  isAssign: boolean
): string {
  return buildWarehouseAssignmentMessage(operatorInfo.name, operatorInfo.role, warehouseName, isAssign)
}

/**
 * 使用 OperatorInfo 对象组装司机类型变更消息
 * 这是 buildDriverTypeChangeMessage 的便捷版本
 *
 * @param operatorInfo - 操作者信息对象
 * @param newDriverType - 新的司机类型
 * @returns 格式化的消息内容
 */
export function buildDriverTypeChangeMessageFromInfo(
  operatorInfo: OperatorInfo,
  newDriverType: DriverType
): string {
  return buildDriverTypeChangeMessage(operatorInfo.name, operatorInfo.role, newDriverType)
}
