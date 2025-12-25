/**
 * 图片预加载器 Vue Hook
 * 提供在 Vue 组件中使用图片预加载功能的便捷方法
 * @module utils/imagePreloader/useImagePreloader
 */

import { ref, onMounted, onUnmounted, computed, type ComputedRef } from 'vue'
import { getImagePreloader, ImagePreloader } from './ImagePreloader'
import type {
  PreloadOptions,
  PreloaderStats,
  PreloadTask,
  PreloadEventType,
  PreloadEventListener,
  PreloaderConfig
} from './types'
import { PreloadPriority, PreloadTaskStatus } from './types'

/**
 * 预加载器 Hook 返回值接口
 */
export interface UseImagePreloaderReturn {
  /** 预加载单张图片 */
  preload: (url: string, options?: PreloadOptions) => string
  /** 批量预加载图片 */
  preloadBatch: (urls: string[], options?: PreloadOptions) => string[]
  /** 预加载可视区域图片（高优先级） */
  preloadVisible: (urls: string[]) => string[]
  /** 预加载后台图片（低优先级） */
  preloadBackground: (urls: string[]) => string[]
  /** 取消预加载任务 */
  cancel: (taskId: string) => boolean
  /** 取消分组任务 */
  cancelGroup: (groupId: string) => number
  /** 取消所有任务 */
  cancelAll: () => number
  /** 获取任务状态 */
  getTask: (taskId: string) => PreloadTask | null
  /** 暂停预加载 */
  pause: () => void
  /** 恢复预加载 */
  resume: () => void
  /** 是否已暂停 */
  isPaused: () => boolean
  /** 清理已完成的任务 */
  clearCompleted: () => void
  /** 统计信息（响应式） */
  stats: ComputedRef<PreloaderStats>
  /** 是否有正在加载的任务 */
  isLoading: ComputedRef<boolean>
  /** 等待中的任务数 */
  pendingCount: ComputedRef<number>
}

/**
 * 图片预加载器 Vue Hook
 * 提供响应式的预加载状态和便捷的预加载方法
 *
 * @param config - 预加载器配置（可选）
 * @returns 预加载器方法和状态
 *
 * @example
 * ```vue
 * <script setup>
 * import { useImagePreloader } from '@/utils/imagePreloader'
 *
 * const {
 *   preload,
 *   preloadVisible,
 *   preloadBackground,
 *   stats,
 *   isLoading
 * } = useImagePreloader()
 *
 * // 预加载当前可视区域的图片
 * const visibleUrls = ['url1', 'url2', 'url3']
 * preloadVisible(visibleUrls)
 *
 * // 后台预加载其他图片
 * const otherUrls = ['url4', 'url5']
 * preloadBackground(otherUrls)
 * </script>
 * ```
 */
export function useImagePreloader(
  config?: Partial<PreloaderConfig>
): UseImagePreloaderReturn {
  // 获取预加载器实例
  const preloader = getImagePreloader(config)

  // 响应式统计数据
  const statsRef = ref<PreloaderStats>(preloader.getStats())

  // 更新统计数据的函数
  const updateStats = () => {
    statsRef.value = preloader.getStats()
  }

  // 事件监听器
  const eventListener: PreloadEventListener = () => {
    updateStats()
  }

  // 组件挂载时添加事件监听
  onMounted(() => {
    // 监听所有相关事件
    const events: PreloadEventType[] = [
      'taskStart',
      'taskComplete',
      'taskFailed',
      'taskCancelled',
      'queueEmpty'
    ]

    for (const event of events) {
      preloader.on(event, eventListener)
    }

    // 初始更新统计
    updateStats()
  })

  // 组件卸载时移除事件监听
  onUnmounted(() => {
    const events: PreloadEventType[] = [
      'taskStart',
      'taskComplete',
      'taskFailed',
      'taskCancelled',
      'queueEmpty'
    ]

    for (const event of events) {
      preloader.off(event, eventListener)
    }
  })

  // 计算属性：统计信息
  const stats = computed(() => statsRef.value)

  // 计算属性：是否有正在加载的任务
  const isLoading = computed(() => statsRef.value.loadingCount > 0)

  // 计算属性：等待中的任务数
  const pendingCount = computed(() => statsRef.value.pendingCount)

  /**
   * 预加载单张图片
   * @param url - 图片 URL
   * @param options - 预加载选项
   * @returns 任务 ID
   */
  const preload = (url: string, options?: PreloadOptions): string => {
    return preloader.preload(url, options)
  }

  /**
   * 批量预加载图片
   * @param urls - 图片 URL 数组
   * @param options - 预加载选项
   * @returns 任务 ID 数组
   */
  const preloadBatch = (urls: string[], options?: PreloadOptions): string[] => {
    return preloader.preloadBatch(urls, options)
  }

  /**
   * 预加载可视区域图片（高优先级）
   * 用于预加载当前屏幕可见的图片
   * @param urls - 图片 URL 数组
   * @returns 任务 ID 数组
   */
  const preloadVisible = (urls: string[]): string[] => {
    return preloader.preloadBatch(urls, {
      priority: PreloadPriority.URGENT,
      groupId: 'visible'
    })
  }

  /**
   * 预加载后台图片（低优先级）
   * 用于预加载即将显示但当前不可见的图片
   * @param urls - 图片 URL 数组
   * @returns 任务 ID 数组
   */
  const preloadBackground = (urls: string[]): string[] => {
    return preloader.preloadBatch(urls, {
      priority: PreloadPriority.LOW,
      groupId: 'background'
    })
  }

  /**
   * 取消预加载任务
   * @param taskId - 任务 ID
   * @returns 是否成功取消
   */
  const cancel = (taskId: string): boolean => {
    return preloader.cancel(taskId)
  }

  /**
   * 取消分组任务
   * @param groupId - 分组 ID
   * @returns 取消的任务数量
   */
  const cancelGroup = (groupId: string): number => {
    return preloader.cancelGroup(groupId)
  }

  /**
   * 取消所有任务
   * @returns 取消的任务数量
   */
  const cancelAll = (): number => {
    return preloader.cancelAll()
  }

  /**
   * 获取任务状态
   * @param taskId - 任务 ID
   * @returns 任务信息
   */
  const getTask = (taskId: string): PreloadTask | null => {
    return preloader.getTask(taskId)
  }

  /**
   * 暂停预加载
   */
  const pause = (): void => {
    preloader.pause()
    updateStats()
  }

  /**
   * 恢复预加载
   */
  const resume = (): void => {
    preloader.resume()
    updateStats()
  }

  /**
   * 是否已暂停
   * @returns 是否已暂停
   */
  const isPaused = (): boolean => {
    return preloader.isPaused()
  }

  /**
   * 清理已完成的任务
   */
  const clearCompleted = (): void => {
    preloader.clearCompleted()
    updateStats()
  }

  return {
    preload,
    preloadBatch,
    preloadVisible,
    preloadBackground,
    cancel,
    cancelGroup,
    cancelAll,
    getTask,
    pause,
    resume,
    isPaused,
    clearCompleted,
    stats,
    isLoading,
    pendingCount
  }
}

/**
 * 页面级预加载 Hook
 * 专门用于页面组件，提供页面进入/离开时的自动预加载管理
 *
 * @param getUrls - 获取需要预加载的 URL 列表的函数
 * @param options - 预加载选项
 * @returns 预加载控制方法
 *
 * @example
 * ```vue
 * <script setup>
 * import { usePagePreloader } from '@/utils/imagePreloader'
 *
 * // 页面进入时自动预加载车辆图片
 * const { isReady, progress } = usePagePreloader(
 *   () => vehiclePhotos.value.map(p => p.url),
 *   { priority: PreloadPriority.HIGH }
 * )
 * </script>
 * ```
 */
export function usePagePreloader(
  getUrls: () => string[],
  options?: PreloadOptions
) {
  const preloader = getImagePreloader()
  const taskIds = ref<string[]>([])
  const isReady = ref(false)
  const progress = ref(0)
  const completedCount = ref(0)
  const totalCount = ref(0)

  /**
   * 更新进度
   */
  const updateProgress = () => {
    if (totalCount.value === 0) {
      progress.value = 100
      isReady.value = true
      return
    }

    let completed = 0
    for (const taskId of taskIds.value) {
      const task = preloader.getTask(taskId)
      if (task && (
        task.status === PreloadTaskStatus.COMPLETED ||
        task.status === PreloadTaskStatus.FAILED ||
        task.status === PreloadTaskStatus.CANCELLED
      )) {
        completed++
      }
    }

    completedCount.value = completed
    progress.value = Math.round((completed / totalCount.value) * 100)
    isReady.value = completed >= totalCount.value
  }

  /**
   * 事件监听器
   */
  const eventListener: PreloadEventListener = (event) => {
    if (event.task && taskIds.value.includes(event.task.id)) {
      updateProgress()
    }
  }

  /**
   * 开始预加载
   */
  const startPreload = () => {
    const urls = getUrls()
    if (urls.length === 0) {
      isReady.value = true
      progress.value = 100
      return
    }

    totalCount.value = urls.length
    taskIds.value = preloader.preloadBatch(urls, {
      ...options,
      priority: options?.priority ?? PreloadPriority.HIGH
    })

    updateProgress()
  }

  /**
   * 取消预加载
   */
  const cancelPreload = () => {
    for (const taskId of taskIds.value) {
      preloader.cancel(taskId)
    }
    taskIds.value = []
  }

  // 组件挂载时开始预加载
  onMounted(() => {
    preloader.on('taskComplete', eventListener)
    preloader.on('taskFailed', eventListener)
    preloader.on('taskCancelled', eventListener)

    startPreload()
  })

  // 组件卸载时取消预加载
  onUnmounted(() => {
    preloader.off('taskComplete', eventListener)
    preloader.off('taskFailed', eventListener)
    preloader.off('taskCancelled', eventListener)

    cancelPreload()
  })

  return {
    /** 是否所有图片都已加载完成 */
    isReady: computed(() => isReady.value),
    /** 加载进度（0-100） */
    progress: computed(() => progress.value),
    /** 已完成的数量 */
    completedCount: computed(() => completedCount.value),
    /** 总数量 */
    totalCount: computed(() => totalCount.value),
    /** 重新开始预加载 */
    restart: startPreload,
    /** 取消预加载 */
    cancel: cancelPreload
  }
}
