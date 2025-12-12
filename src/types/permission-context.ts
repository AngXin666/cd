/**
 * 权限上下文类型定义
 * 用于存储用户登录后的权限信息和管辖范围
 */

/**
 * 权限模式
 */
export type PermissionMode = 'own_data_only' | 'managed_resources' | 'scheduled_resources' | 'all_access'

/**
 * 权限级别
 */
export type PermissionLevel = 'full_control' | 'view_only'

/**
 * 用户基本信息
 */
export interface UserBasicInfo {
  id: string
  name: string
  phone?: string
  email?: string
}

/**
 * 仓库基本信息
 */
export interface WarehouseBasicInfo {
  id: string
  name: string
  address?: string
}

/**
 * 司机权限上下文
 */
export interface DriverPermissionContext {
  mode: 'own_data_only'
  level: 'full_control' // 司机固定为完整权限（操作自己的数据）
  // 直属车队长
  directManager: UserBasicInfo | null
  // 调度账号列表
  schedulers: UserBasicInfo[]
  // 老板账号
  boss: UserBasicInfo | null
  // 所属仓库列表
  warehouses: WarehouseBasicInfo[]
}

/**
 * 车队长权限上下文
 */
export interface ManagerPermissionContext {
  mode: 'managed_resources'
  level: PermissionLevel
  // 管辖仓库列表
  managedWarehouses: WarehouseBasicInfo[]
  // 下属司机列表
  managedDrivers: UserBasicInfo[]
  // 调度账号列表
  schedulers: UserBasicInfo[]
  // 老板账号
  boss: UserBasicInfo | null
}

/**
 * 调度权限上下文
 */
export interface SchedulerPermissionContext {
  mode: 'scheduled_resources'
  level: PermissionLevel
  // 管辖仓库/线路
  managedWarehouses: WarehouseBasicInfo[]
  // 关联司机列表
  relatedDrivers: UserBasicInfo[]
  // 关联车辆列表（可选）
  relatedVehicles: Array<{
    id: string
    plate_number: string
  }>
  // 老板账号
  boss: UserBasicInfo | null
}

/**
 * 老板/平级管理员权限上下文
 */
export interface AdminPermissionContext {
  mode: 'all_access'
  level: PermissionLevel
  // 可选：全系统资源索引（用于提升访问效率）
  systemResources?: {
    totalWarehouses: number
    totalDrivers: number
    totalManagers: number
    totalVehicles: number
  }
}

/**
 * 统一权限上下文
 */
export type PermissionContext =
  | DriverPermissionContext
  | ManagerPermissionContext
  | SchedulerPermissionContext
  | AdminPermissionContext

/**
 * 权限上下文响应
 */
export interface PermissionContextResponse {
  success: boolean
  context: PermissionContext | null
  error?: string
}
