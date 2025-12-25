/**
 * 临时文件清理模块
 * 导出清理管理器和相关类型
 * @module utils/cleanup
 */

export { CleanupManager, getCleanupManager } from './CleanupManager'
export {
  useCleanup,
  initAppCleanup,
  performLaunchCleanup,
  performForegroundCleanup
} from './useCleanup'
export type {
  CleanupTaskType,
  CleanupResult,
  CleanupStats,
  CleanupOptions,
  ICleanupManager
} from './types'
export { DEFAULT_CLEANUP_OPTIONS, CLEANUP_PATHS } from './types'
