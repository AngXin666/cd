/**
 * 提交失败恢复 Hook
 * 提供 Vue 组件中使用提交恢复功能的便捷方法
 * @module utils/submitRecovery/useSubmitRecovery
 */

import { ref, onMounted, onUnmounted, computed, type Ref, type ComputedRef } from 'vue'
import { getSubmitRecoveryManager, SubmitRecoveryManager } from './SubmitRecoveryManager'
import type {
  SubmitTask,
  SubmitType,
  SubmitProgressCallback,
  SubmitResult,
  NetworkState
} from './types'

/**
 * 提交恢复 Hook 返回值
 */
export interface UseSubmitRecoveryReturn {
  /** 是否在线 */
  isOnline: Ref<boolean>
  /** 网络类型 */
  networkType: Ref<string>
  /** 失败任务列表 */
  failedTasks: Ref<SubmitTask[]>
  /** 待处理任务列表 */
  pendingTasks: Ref<SubmitTask[]>
  /** 是否有失败任务 */
  hasFailedTasks: ComputedRef<boolean>
  /** 是否正在加载 */
  loading: Ref<boolean>
  /** 创建提交任务 */
  createTask: (
    type: SubmitType,
    formData: Record<string, unknown>,
    imagePaths: string[],
    options?: { vehicleId?: number; draftId?: string }
  ) => Promise<string>
  /** 执行提交任务 */
  executeTask: (
    taskId: string,
    submitFn: (formData: Record<string, unknown>, imageUrls: string[]) => Promise<unknown>,
    callbacks?: SubmitProgressCallback
  ) => Promise<SubmitResult>
  /** 重试失败任务 */
  retryTask: (
    taskId: string,
    submitFn: (formData: Record<string, unknown>, imageUrls: string[]) => Promise<unknown>,
    callbacks?: SubmitProgressCallback
  ) => Promise<SubmitResult>
  /** 删除任务 */
  deleteTask: (taskId: string) => Promise<boolean>
  /** 刷新任务列表 */
  refreshTasks: () => Promise<void>
  /** 清理过期任务 */
  cleanExpiredTasks: () => Promise<number>
  /** 获取任务详情 */
  getTask: (taskId: string) => Promise<SubmitTask | null>
  /** 获取已上传的图片 URL */
  getUploadedUrls: (taskId: string) => Promise<Record<string, string>>
}

/**
 * 提交失败恢复 Hook
 * 在 Vue 组件中使用提交恢复功能
 *
 * @param userId - 用户 ID
 * @returns 提交恢复相关的状态和方法
 *
 * @example
 * ```vue
 * <script setup>
 * import { useSubmitRecovery } from '@/utils/submitRecovery/useSubmitRecovery'
 *
 * const userId = 1
 * const {
 *   isOnline,
 *   failedTasks,
 *   hasFailedTasks,
 *   createTask,
 *   executeTask,
 *   retryTask
 * } = useSubmitRecovery(userId)
 *
 * // 创建并执行提交任务
 * async function handleSubmit() {
 *   const taskId = await createTask('return', formData, imagePaths)
 *   const result = await executeTask(taskId, submitToServer, {
 *     onImageProgress: (uploaded, total) => {
 *       console.log(`上传进度: ${uploaded}/${total}`)
 *     },
 *     onStatusChange: (status, message) => {
 *       console.log(`状态: ${status}, ${message}`)
 *     }
 *   })
 *
 *   if (!result.success && result.canRetry) {
 *     // 提示用户可以重试
 *   }
 * }
 * </script>
 * ```
 */
export function useSubmitRecovery(userId: number): UseSubmitRecoveryReturn {
  // 状态
  const isOnline = ref(true)
  const networkType = ref<string>('unknown')
  const failedTasks = ref<SubmitTask[]>([])
  const pendingTasks = ref<SubmitTask[]>([])
  const loading = ref(false)

  // 计算属性
  const hasFailedTasks = computed(() => failedTasks.value.length > 0)

  // 管理器实例
  let manager: SubmitRecoveryManager | null = null
  let unsubscribeNetwork: (() => void) | null = null

  /**
   * 初始化
   */
  async function init(): Promise<void> {
    manager = getSubmitRecoveryManager({ debug: false })
    await manager.initialize()

    // 监听网络状态
    unsubscribeNetwork = manager.onNetworkChange((state: NetworkState) => {
      const wasOffline = !isOnline.value
      isOnline.value = state.isOnline
      networkType.value = state.networkType

      // 网络恢复时刷新任务列表
      if (wasOffline && state.isOnline) {
        refreshTasks()
      }
    })

    // 加载任务列表
    await refreshTasks()
  }

  /**
   * 刷新任务列表
   */
  async function refreshTasks(): Promise<void> {
    if (!manager) return

    loading.value = true
    try {
      failedTasks.value = await manager.getFailedTasks(userId)
      pendingTasks.value = await manager.getPendingTasks(userId)
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建提交任务
   */
  async function createTask(
    type: SubmitType,
    formData: Record<string, unknown>,
    imagePaths: string[],
    options?: { vehicleId?: number; draftId?: string }
  ): Promise<string> {
    if (!manager) {
      throw new Error('管理器未初始化')
    }

    const taskId = await manager.createTask(type, userId, formData, imagePaths, options)
    await refreshTasks()
    return taskId
  }

  /**
   * 执行提交任务
   */
  async function executeTask(
    taskId: string,
    submitFn: (formData: Record<string, unknown>, imageUrls: string[]) => Promise<unknown>,
    callbacks?: SubmitProgressCallback
  ): Promise<SubmitResult> {
    if (!manager) {
      return {
        success: false,
        taskId,
        error: '管理器未初始化',
        canRetry: false,
        uploadedCount: 0,
        totalCount: 0
      }
    }

    const result = await manager.executeTask(taskId, submitFn, callbacks)
    await refreshTasks()
    return result
  }

  /**
   * 重试失败任务
   */
  async function retryTask(
    taskId: string,
    submitFn: (formData: Record<string, unknown>, imageUrls: string[]) => Promise<unknown>,
    callbacks?: SubmitProgressCallback
  ): Promise<SubmitResult> {
    if (!manager) {
      return {
        success: false,
        taskId,
        error: '管理器未初始化',
        canRetry: false,
        uploadedCount: 0,
        totalCount: 0
      }
    }

    const result = await manager.retryTask(taskId, submitFn, callbacks)
    await refreshTasks()
    return result
  }

  /**
   * 删除任务
   */
  async function deleteTask(taskId: string): Promise<boolean> {
    if (!manager) return false

    const success = await manager.deleteTask(taskId)
    if (success) {
      await refreshTasks()
    }
    return success
  }

  /**
   * 清理过期任务
   */
  async function cleanExpiredTasks(): Promise<number> {
    if (!manager) return 0

    const count = await manager.cleanExpiredTasks()
    if (count > 0) {
      await refreshTasks()
    }
    return count
  }

  /**
   * 获取任务详情
   */
  async function getTask(taskId: string): Promise<SubmitTask | null> {
    if (!manager) return null
    return manager.getTask(taskId)
  }

  /**
   * 获取已上传的图片 URL
   */
  async function getUploadedUrls(taskId: string): Promise<Record<string, string>> {
    if (!manager) return {}
    return manager.getUploadedUrls(taskId)
  }

  // 生命周期
  onMounted(() => {
    init()
  })

  onUnmounted(() => {
    if (unsubscribeNetwork) {
      unsubscribeNetwork()
    }
  })

  return {
    isOnline,
    networkType,
    failedTasks,
    pendingTasks,
    hasFailedTasks,
    loading,
    createTask,
    executeTask,
    retryTask,
    deleteTask,
    refreshTasks,
    cleanExpiredTasks,
    getTask,
    getUploadedUrls
  }
}

/**
 * 显示网络恢复提示
 * 当网络恢复且有失败任务时，提示用户重试
 *
 * @param failedCount - 失败任务数量
 * @param onRetry - 重试回调
 */
export function showNetworkRecoveryTip(
  failedCount: number,
  onRetry: () => void
): void {
  if (failedCount <= 0) return

  // 使用 uni-app 的 showModal
  uni.showModal({
    title: '网络已恢复',
    content: `您有 ${failedCount} 个提交任务失败，是否立即重试？`,
    confirmText: '立即重试',
    cancelText: '稍后再说',
    success: (res) => {
      if (res.confirm) {
        onRetry()
      }
    }
  })
}

/**
 * 显示提交失败提示
 * 当提交失败时，提示用户可以重试
 *
 * @param error - 错误信息
 * @param canRetry - 是否可以重试
 * @param onRetry - 重试回调
 * @param onCancel - 取消回调
 */
export function showSubmitFailedTip(
  error: string,
  canRetry: boolean,
  onRetry?: () => void,
  onCancel?: () => void
): void {
  if (canRetry && onRetry) {
    uni.showModal({
      title: '提交失败',
      content: `${error}\n\n数据已自动保存，是否立即重试？`,
      confirmText: '立即重试',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          onRetry()
        } else {
          onCancel?.()
        }
      }
    })
  } else {
    uni.showToast({
      title: error,
      icon: 'none',
      duration: 3000
    })
    onCancel?.()
  }
}
