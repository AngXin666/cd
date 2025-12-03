/**
 * 数据库 API 统一入口
 * 
 * 本文件作为向后兼容层，重新导出所有模块化API
 * 新代码请直接从 @/db/api/* 导入
 * 
 * @deprecated 请逐步迁移到模块化导入方式
 * @example
 * // 旧方式（仍然支持）
 * import { getCurrentUserProfile } from '@/db/api'
 * 
 * // 新方式（推荐）
 * import * as UsersAPI from '@/db/api/users'
 * import { getCurrentUserProfile } from '@/db/api/users'
 */

// 重新导出所有模块（不存在冲突的直接使用 export *）
export * from './api/attendance'
export * from './api/dashboard'
export * from './api/leave'
export * from './api/peer-accounts'
export * from './api/permission-context'
export * from './api/piecework'
export * from './api/utils'
export * from './api/vehicles'
export * from './api/warehouses'

// ============= 以下是存在命名冲突的模块，需要显式导出 =============

// 从 permission-strategy 模块显式导出（与 peer-admin 模块冲突）
export {
  type PermissionLevel,
  createPeerAdmin,
  updatePeerAdminPermission,
  removePeerAdmin,
  getAllPeerAdmins,
  getPeerAdminPermission,
  // 导出其他 permission-strategy 特有的函数
  createManager,
  updateManagerPermission,
  removeManager,
  getAllManagers as getAllManagedManagers,
  getManagerPermission as getManagedManagerPermission,
  type UserPermissionInfo,
  type UserPermissionDetail,
  type OperationResult
} from './api/permission-strategy'

// 从 peer-admin 模块导出其特有的函数（避免与 permission-strategy 冲突）
export {
  isPeerAdmin,
  peerAdminHasFullControl,
  peerAdminIsViewOnly,
  isBossOrFullControlPeerAdmin,
  type PeerAdminPermission,
  type PeerAdminListItem
} from './api/peer-admin'

// 从 permission 模块导出（避免与 users 模块冲突）
export {
  checkTablePermission,
  canAccessRecord,
  checkRecordsAccessBatch,
  getUserPermissionSummary,
  getAvailableStrategies,
  getPermissionChangeHistory,
  logPermissionChange,
  canViewTable,
  canCreateRecord,
  canUpdateRecord,
  canDeleteRecord,
  getCurrentUserPermissions,
  type UserPermissionSummary,
  type PermissionStrategy
} from './api/permission'

// 从 users 模块导出（实际上是从 ../api 重新导出）
export * from './api/users'

// 从 stats 模块导出（排除 UserRole 以避免与 types 模块冲突）
export {
  getSystemStats,
  getUserPersonalStats,
  getWarehouseStats,
  getAllWarehousesStats,
  getUserAllRoles,
  userHasRole,
  getCurrentUserInfo,
  addRoleToUser,
  removeRoleFromUser,
  getUsersByRole,
  type SystemStats,
  type UserPersonalStats,
  type WarehouseStats,
  type UserRole as StatsUserRole,  // 重命名以避免冲突
  type UserDetails,
  type CurrentUserInfo
} from './api/stats'

// 从 notifications API 模块导出（实际上是从 ../api 重新导出）
export * from './api/notifications'

// 从 notificationApi 模块导出通知相关函数（优先使用这个模块的实现）
export {
  createNotification,
  createNotifications,
  deleteNotification,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  getUserNotifications,
  type Notification,
  type NotificationType,
  type NotificationCategory,
  type NotificationProcessStatus
} from './notificationApi'

// 从 types 模块导出类型（排除 Notification 以避免与 notificationApi 冲突）
export {
  type UserRole,
  type UserRoleAssignment,
  type Vehicle,
  type Warehouse,
  type AttendanceRecord,
  type LeaveRequest,
  type PieceworkRecord
} from './types'
