/**
 * 数据库 API 轻量级索引文件
 *
 * ⚠️ 重要：为了减少内存占用，本文件仅导出类型定义
 * 所有函数实现请直接从模块导入
 *
 * @example
 * // ✅ 推荐方式（按需加载，内存占用小）
 * import { getCurrentUserProfile } from '@/db/api/users'
 * import { getAttendanceRecords } from '@/db/api/attendance'
 *
 * // ❌ 不推荐（会加载所有模块，内存占用大）
 * import { getCurrentUserProfile } from '@/db/api/users'
 */

// ============= 仅导出类型定义（不会增加运行时内存） =============

// Dashboard 模块类型
export type {DashboardStats} from './api/dashboard'
// Peer Admin 模块类型
export type {
  PeerAdminListItem,
  PeerAdminPermission
} from './api/peer-admin'
// Permission Strategy 模块类型
export type {
  OperationResult,
  PermissionLevel,
  UserPermissionDetail,
  UserPermissionInfo
} from './api/permission-strategy'
// Stats 模块类型
export type {
  CurrentUserInfo,
  SystemStats,
  UserDetails,
  UserPersonalStats,
  UserRole as StatsUserRole,
  WarehouseStats
} from './api/stats'
// Users 模块类型
export type {
  DatabaseColumn,
  DatabaseConstraint,
  DatabaseTable
} from './api/users'
// Notifications 模块类型
export type {
  Notification,
  NotificationCategory,
  NotificationProcessStatus,
  NotificationType
} from './notificationApi'
// Attendance 模块类型（从 types.ts 导出）
// Leave 模块类型（从 types.ts 导出）
// Piecework 模块类型（从 types.ts 导出）
// Vehicles 模块类型（从 types.ts 导出）
// Warehouses 模块类型（从 types.ts 导出）
// 从 types 模块导出基础类型
export type {
  AttendanceRecord,
  LeaveRequest,
  PieceworkRecord,
  UserRole,
  UserRoleAssignment,
  Vehicle,
  Warehouse
} from './types'

// ============= 模块路径导出（用于动态导入） =============

/**
 * API 模块路径映射
 * 可用于动态导入或文档生成
 */
export const API_MODULES = {
  attendance: './api/attendance',
  dashboard: './api/dashboard',
  leave: './api/leave',
  notifications: './api/notifications',
  peerAccounts: './api/peer-accounts',
  peerAdmin: './api/peer-admin',
  permissionContext: './api/permission-context',
  permissionStrategy: './api/permission-strategy',
  piecework: './api/piecework',
  stats: './api/stats',
  users: './api/users',
  utils: './api/utils',
  vehicles: './api/vehicles',
  warehouses: './api/warehouses'
} as const

/**
 * 动态导入 API 模块
 * @example
 * const usersAPI = await importAPIModule('users')
 * const profile = await usersAPI.getCurrentUserProfile()
 */
export async function importAPIModule(moduleName: keyof typeof API_MODULES) {
  switch (moduleName) {
    case 'attendance':
      return import('./api/attendance')
    case 'dashboard':
      return import('./api/dashboard')
    case 'leave':
      return import('./api/leave')
    case 'notifications':
      return import('./api/notifications')
    case 'peerAccounts':
      return import('./api/peer-accounts')
    case 'peerAdmin':
      return import('./api/peer-admin')
    case 'permissionContext':
      return import('./api/permission-context')
    case 'permissionStrategy':
      return import('./api/permission-strategy')
    case 'piecework':
      return import('./api/piecework')
    case 'stats':
      return import('./api/stats')
    case 'users':
      return import('./api/users')
    case 'utils':
      return import('./api/utils')
    case 'vehicles':
      return import('./api/vehicles')
    case 'warehouses':
      return import('./api/warehouses')
    default:
      throw new Error(`Unknown API module: ${moduleName}`)
  }
}
