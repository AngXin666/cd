/**
 * 数据库 API 统一导出
 *
 * 本文件提供模块化的 API 导出，方便按功能模块导入
 *
 * 使用示例：
 * ```typescript
 * // 导入特定模块
 * import * as UserAPI from '@/db/api/users'
 * import * as VehicleAPI from '@/db/api/vehicles'
 *
 * // 或者导入特定函数
 * import { getCurrentUserProfile, getAllUsers } from '@/db/api/users'
 * import { getAllVehicles, createVehicle } from '@/db/api/vehicles'
 *
 * // 或者从主入口导入（向后兼容）
 * import { getCurrentUserProfile, getAllVehicles } from '@/db/api'
 * ```
 */

export * from './attendance'
export * from './dashboard'
export * from './leave'
export * from './notifications'
export * from './peer-accounts'
export * from './piecework'
// 重新导出所有模块
export * from './users'
// 导出工具函数
export * from './utils'
export * from './vehicles'
export * from './warehouses'
