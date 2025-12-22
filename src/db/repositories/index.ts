/**
 * Repository 模块导出文件
 * 统一导出所有 Repository 类和相关类型
 *
 * Repository 模式提供了数据访问层的抽象，具有以下优势：
 * - 统一的 CRUD 操作接口
 * - 内置的缓存管理
 * - 完整的日志记录
 * - 类型安全的泛型支持
 *
 * @module db/repositories
 *
 * @example
 * ```typescript
 * import { BaseRepository, RepositoryOptions, CACHE_KEYS } from '@/db/repositories'
 *
 * // 创建自定义 Repository
 * class MyRepository extends BaseRepository<MyEntity> {
 *   constructor() {
 *     super({
 *       tableName: 'my_table',
 *       cachePrefix: 'my_table',
 *       defaultTTL: 5 * 60 * 1000
 *     })
 *   }
 * }
 * ```
 */

// 导出基类和类型
export {
  BaseRepository,
  CACHE_KEYS,
  type RepositoryOptions,
  type BaseEntity,
  type QueryOptions,
  type CacheStats
} from './BaseRepository'

// 导出 DashboardRepository
export { DashboardRepository, dashboardRepository } from './DashboardRepository'

// 导出 StatsRepository
export { StatsRepository, statsRepository } from './StatsRepository'

// 导出 UsersRepository
export {
  UsersRepository,
  usersRepository,
  convertUserToProfile,
  convertUsersToProfiles,
  type UserWithRole
} from './UsersRepository'

// 导出 CategoriesRepository
export { CategoriesRepository, categoriesRepository } from './CategoriesRepository'

// 导出 VehiclesRepository
export { VehiclesRepository, vehiclesRepository } from './VehiclesRepository'

// 导出 LeaveRepository
export { LeaveRepository, leaveRepository } from './LeaveRepository'

// ==================== 新增 Repository 导出 ====================

// 导出 AttendanceRepository（考勤记录，TTL 2 分钟）
export {
  AttendanceRepository,
  attendanceRepository,
  type AttendanceStats
} from './AttendanceRepository'

// 导出 PieceWorkRepository（计件记录，TTL 2 分钟）
export { PieceWorkRepository, pieceWorkRepository } from './PieceWorkRepository'

// 导出 WarehousesRepository（仓库信息，TTL 10 分钟）
export { WarehousesRepository, warehousesRepository } from './WarehousesRepository'

// 导出 WarehouseAssignmentsRepository（仓库分配，TTL 5 分钟）
export { WarehouseAssignmentsRepository, warehouseAssignmentsRepository } from './WarehouseAssignmentsRepository'

// 导出 NotificationsRepository（通知，TTL 1 分钟）
export { NotificationsRepository, notificationsRepository } from './NotificationsRepository'

// 导出 DriverLicensesRepository（驾驶证，TTL 5 分钟）
export { DriverLicensesRepository, driverLicensesRepository } from './DriverLicensesRepository'

// 导出 CategoryPricesRepository（品类价格，TTL 5 分钟）
export {
  CategoryPricesRepository,
  categoryPricesRepository,
  type CategoryPriceUpdate
} from './CategoryPricesRepository'

// 导出 ResignationApplicationsRepository（离职申请，TTL 2 分钟）
export {
  ResignationApplicationsRepository,
  resignationApplicationsRepository,
  type ResignationApplicationUpdate
} from './ResignationApplicationsRepository'

// ==================== 缓存事件订阅器 ====================

// 导出缓存事件订阅器（事件驱动缓存失效）
export {
  initCacheEventSubscriber,
  cleanupCacheEventSubscriber,
  isCacheEventSubscriberInitialized,
  getEventCacheMapping
} from './CacheEventSubscriber'
