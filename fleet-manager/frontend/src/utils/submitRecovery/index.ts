/**
 * 提交失败恢复模块入口
 * 导出提交失败恢复相关的类、函数和类型
 * @module utils/submitRecovery
 */

export { SubmitRecoveryManager, getSubmitRecoveryManager } from './SubmitRecoveryManager'
export {
  useSubmitRecovery,
  showNetworkRecoveryTip,
  showSubmitFailedTip
} from './useSubmitRecovery'
export type { UseSubmitRecoveryReturn } from './useSubmitRecovery'
export type {
  ISubmitRecoveryManager,
  SubmitTask,
  SubmitType,
  SubmitStatus,
  ImageUploadState,
  SubmitRecoveryOptions,
  SubmitProgressCallback,
  SubmitResult,
  NetworkState
} from './types'
export { DEFAULT_RECOVERY_OPTIONS, TASKS_META_FILENAME } from './types'
