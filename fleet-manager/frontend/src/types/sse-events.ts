/**
 * SSE 事件类型定义模块
 * 定义统一实时更新系统的所有 SSE 事件数据类型
 * 
 * 本模块定义了以下事件类型的数据结构：
 * - VehicleUpdateEvent: 车辆更新事件
 * - LeaveUpdateEvent: 请假更新事件
 * - PieceWorkUpdateEvent: 计件更新事件
 * - AssignmentUpdateEvent: 仓库分配更新事件
 * - PermissionUpdateEvent: 权限更新事件
 * - UserUpdateEvent: 用户状态更新事件
 * 
 * Requirements: 1.3 - 扩展 SSE 事件类型定义
 */

// ==================== 事件动作类型 ====================

/**
 * 事件动作类型
 * - create: 创建新记录
 * - update: 更新现有记录
 * - delete: 删除记录
 */
export type EventAction = 'create' | 'update' | 'delete'

// ==================== 车辆更新事件 ====================

/**
 * 车辆数据接口
 * 包含车辆的完整信息
 * Requirements: 2.2 - 车辆事件负载包含完整数据
 */
export interface VehicleData {
  /** 车辆ID */
  id: number
  /** 车牌号 */
  license_plate: string
  /** 品牌 */
  brand: string | null
  /** 型号 */
  model: string | null
  /** 颜色 */
  color: string | null
  /** 车辆状态：active-在用, returned-已退回, reviewing-审核中, inactive-停用 */
  status: string
  /** 车辆所有者ID */
  user_id: number
  /** 所属仓库ID */
  warehouse_id: number | null
  /** 车辆归属类型：company-公司车, personal-私家车, rental-租赁车 */
  ownership_type: string | null
  /** 创建时间（ISO格式） */
  created_at: string
  /** 更新时间（ISO格式） */
  updated_at: string
}

/**
 * 车辆更新事件
 * 当车辆信息发生变化（如审批通过/拒绝）时推送
 * Requirements: 2.1, 2.2, 2.4 - 车辆审批实时数据同步
 */
export interface VehicleUpdateEvent {
  /** 事件动作类型 */
  action: EventAction
  /** 完整的车辆数据 */
  vehicle: VehicleData
}

// ==================== 请假更新事件 ====================

/**
 * 请假数据接口
 * 包含请假申请的完整信息
 * Requirements: 3.2 - 请假事件负载包含完整数据
 */
export interface LeaveData {
  /** 请假申请ID */
  id: number
  /** 申请人ID */
  user_id: number
  /** 请假类型：leave-请假, resignation-离职 */
  leave_type: string
  /** 开始日期（ISO格式） */
  start_date: string
  /** 结束日期（ISO格式） */
  end_date: string
  /** 请假状态：pending-待审批, approved-已通过, rejected-已拒绝 */
  status: string
  /** 请假原因 */
  reason: string | null
  /** 审批人ID */
  approver_id: number | null
  /** 审批意见 */
  approve_remark: string | null
  /** 创建时间（ISO格式） */
  created_at: string
  /** 更新时间（ISO格式） */
  updated_at: string
}

/**
 * 请假更新事件
 * 当请假申请状态发生变化（如审批通过/拒绝）时推送
 * Requirements: 3.1, 3.2, 3.4 - 请假审批实时数据同步
 */
export interface LeaveUpdateEvent {
  /** 事件动作类型 */
  action: 'create' | 'update'
  /** 完整的请假申请数据 */
  leave: LeaveData
}

// ==================== 计件更新事件 ====================

/**
 * 计件记录数据接口
 * 包含计件记录的完整信息
 * Requirements: 4.3 - 计件事件负载包含完整数据
 */
export interface PieceWorkRecordData {
  /** 计件记录ID */
  id: number
  /** 司机ID */
  user_id: number
  /** 司机姓名 */
  user_name: string
  /** 仓库ID */
  warehouse_id: number | null
  /** 仓库名称 */
  warehouse_name: string | null
  /** 计件分类ID */
  category_id: number
  /** 计件分类名称 */
  category_name: string
  /** 数量 */
  quantity: number
  /** 金额 */
  amount: number
  /** 工作日期（ISO格式） */
  work_date: string
  /** 备注 */
  remark: string | null
  /** 记录状态：submitted-已提交, approved-已通过, rejected-已拒绝 */
  status: string
  /** 创建时间（ISO格式） */
  created_at: string
}

/**
 * 计件更新事件
 * 当计件记录发生变化（如司机提交、车队长审批）时推送
 * Requirements: 4.1, 4.2, 4.3 - 计件记录实时数据同步
 */
export interface PieceWorkUpdateEvent {
  /** 事件动作类型 */
  action: 'create' | 'update'
  /** 完整的计件记录数据 */
  record: PieceWorkRecordData
}

// ==================== 仓库分配更新事件 ====================

/**
 * 仓库数据接口（简化版）
 * 用于仓库分配事件中的仓库列表
 * Requirements: 5.3 - 仓库分配事件负载包含完整仓库列表
 */
export interface WarehouseData {
  /** 仓库ID */
  id: number
  /** 仓库名称 */
  name: string
  /** 仓库地址 */
  address: string | null
}

/**
 * 仓库分配更新事件
 * 当用户的仓库分配发生变化时推送
 * Requirements: 5.1, 5.2, 5.3 - 仓库分配实时数据同步
 */
export interface AssignmentUpdateEvent {
  /** 被分配用户的ID */
  user_id: number
  /** 分配类型：driver-司机分配, manager-车队长分配 */
  assignment_type: 'driver' | 'manager'
  /** 完整的仓库列表 */
  warehouses: WarehouseData[]
}

// ==================== 权限更新事件 ====================

/**
 * 权限更新事件
 * 当用户的权限配置发生变化时推送
 * Requirements: 6.1, 6.2 - 权限变更实时数据同步
 */
export interface PermissionUpdateEvent {
  /** 被修改权限的用户ID */
  user_id: number
  /** 完整的权限键列表 */
  permissions: string[]
}

// ==================== 用户状态更新事件 ====================

/**
 * 用户状态数据接口
 * 包含用户的基本状态信息
 * Requirements: 7.2 - 用户事件负载包含完整状态数据
 */
export interface UserStatusData {
  /** 用户ID */
  id: number
  /** 用户角色：driver-司机, manager-车队长, dispatcher-调度, boss-老板, super_admin-超级管理员 */
  role: string
  /** 用户是否启用 */
  is_active: boolean
  /** 更新时间（ISO格式） */
  updated_at: string
}

/**
 * 用户状态更新事件
 * 当用户的角色或状态发生变化时推送
 * Requirements: 7.1, 7.2 - 用户状态实时通知
 */
export interface UserUpdateEvent {
  /** 事件动作类型：update-更新, disable-禁用 */
  action: 'update' | 'disable'
  /** 用户状态数据 */
  user: UserStatusData
}

// ==================== 事件类型联合 ====================

/**
 * 所有 SSE 业务事件类型的联合类型
 * 用于类型守卫和事件处理
 */
export type SSEBusinessEvent =
  | VehicleUpdateEvent
  | LeaveUpdateEvent
  | PieceWorkUpdateEvent
  | AssignmentUpdateEvent
  | PermissionUpdateEvent
  | UserUpdateEvent
