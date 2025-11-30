/**
 * 权限管理系统类型定义
 */

/**
 * 角色表
 */
export interface Role {
  id: string
  name: string
  description: string | null
  parent_role_id: string | null
  created_at: string
}

/**
 * 权限表
 */
export interface Permission {
  id: string
  name: string
  description: string | null
  module: string
  created_at: string
}

/**
 * 角色权限映射表
 */
export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  created_at: string
}

/**
 * 权限代码枚举
 */
export enum PermissionCode {
  // 司机管理
  DRIVER_VIEW = 'driver:view',
  DRIVER_MANAGE = 'driver:manage',
  DRIVER_VERIFY = 'driver:verify',

  // 车辆管理
  VEHICLE_VIEW = 'vehicle:view',
  VEHICLE_MANAGE = 'vehicle:manage',

  // 计件管理
  PIECEWORK_VIEW = 'piecework:view',
  PIECEWORK_MANAGE = 'piecework:manage',
  PIECEWORK_APPROVE = 'piecework:approve',

  // 通知管理
  NOTIFICATION_SEND = 'notification:send',
  NOTIFICATION_VIEW = 'notification:view',

  // 报表管理
  REPORT_VIEW = 'report:view',
  REPORT_EXPORT = 'report:export',

  // 系统管理
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_ROLE = 'system:role',
  SYSTEM_PERMISSION = 'system:permission'
}

/**
 * 权限模块枚举
 */
export enum PermissionModule {
  DRIVER = 'driver',
  VEHICLE = 'vehicle',
  PIECEWORK = 'piecework',
  NOTIFICATION = 'notification',
  REPORT = 'report',
  SYSTEM = 'system'
}

/**
 * 用户权限集合
 */
export interface UserPermissions {
  userId: string
  permissions: Set<string>
  roles: string[]
  loadedAt: Date
}
