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
export { UsersRepository, usersRepository } from './UsersRepository'

// 导出 CategoriesRepository
export { CategoriesRepository, categoriesRepository } from './CategoriesRepository'

// 导出 VehiclesRepository
export { VehiclesRepository, vehiclesRepository } from './VehiclesRepository'

// 导出 LeaveRepository
export { LeaveRepository, leaveRepository } from './LeaveRepository'
