/**
 * 清理功能 Composable Hook
 * 提供在 Vue 组件中使用清理功能的便捷方法
 * @module utils/cleanup/useCleanup
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getCleanupManager, CleanupManager } from './CleanupManager'
import type { CleanupResult, CleanupStats, CleanupOptions } from './types'

/**
 * useCleanup Hook 返回值类型
 */
export interface UseCleanupReturn {
  /** 是否正在清理 */
  isCleaningUp: ReturnType<typeof ref<boolean>>
  /** 最近的清理结果 */
  lastResults: ReturnType<typeof ref<CleanupResult[]>>
  /** 清理统计信息 */
  stats: ReturnType<typeof ref<CleanupStats | null>>
  /** 手动执行完整清理 */
  performFullCleanup: () => Promise<CleanupResult[]>
  /** 手动执行临时文件清理 */
  cleanTempFiles: () => Promise<CleanupResult>
  /** 手动执行缓存清理 */
  cleanExpiredCache: () => Promise<CleanupResult>
  /** 手动执行草稿清理 */
  cleanExpiredDrafts: () => Promise<CleanupResult>
  /** 获取清理统计信息 */
  getStats: () => CleanupStats
}

/**
 * 清理功能 Composable Hook
 * 自动在应用启动和进入前台时执行清理
 * 
 * @param options - 清理配置选项
 * @returns 清理功能相关的响应式状态和方法
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useCleanup } from '@/utils/cleanup/useCleanup'
 * 
 * const { isCleaningUp, stats, performFullCleanup } = useCleanup()
 * 
 * // 手动触发清理
 * const handleCleanup = async () => {
 *   const results = await performFullCleanup()
 *   console.log('清理完成', results)
 * }
 * </script>
 * ```
 */
export function useCleanup(options?: CleanupOptions): UseCleanupReturn {
  // 响应式状态
  const isCleaningUp = ref(false)
  const lastResults = ref<CleanupResult[]>([])
  const stats = ref<CleanupStats | null>(null)

  // 获取清理管理器实例
  const cleanupManager = getCleanupManager(options)

  /**
   * 执行完整清理
   * @returns 清理结果数组
   */
  const performFullCleanup = async (): Promise<CleanupResult[]> => {
    if (isCleaningUp.value) {
      console.log('[useCleanup] 清理正在进行中，跳过')
      return []
    }

    isCleaningUp.value = true
    try {
      const results = await cleanupManager.performFullCleanup()
      lastResults.value = results
      stats.value = cleanupManager.getCleanupStats()
      return results
    } finally {
      isCleaningUp.value = false
    }
  }

  /**
   * 清理临时文件
   * @returns 清理结果
   */
  const cleanTempFiles = async (): Promise<CleanupResult> => {
    isCleaningUp.value = true
    try {
      const result = await cleanupManager.cleanTempFiles()
      stats.value = cleanupManager.getCleanupStats()
      return result
    } finally {
      isCleaningUp.value = false
    }
  }

  /**
   * 清理过期缓存
   * @returns 清理结果
   */
  const cleanExpiredCache = async (): Promise<CleanupResult> => {
    isCleaningUp.value = true
    try {
      const result = await cleanupManager.cleanExpiredCache()
      stats.value = cleanupManager.getCleanupStats()
      return result
    } finally {
      isCleaningUp.value = false
    }
  }

  /**
   * 清理过期草稿
   * @returns 清理结果
   */
  const cleanExpiredDrafts = async (): Promise<CleanupResult> => {
    isCleaningUp.value = true
    try {
      const result = await cleanupManager.cleanExpiredDrafts()
      stats.value = cleanupManager.getCleanupStats()
      return result
    } finally {
      isCleaningUp.value = false
    }
  }

  /**
   * 获取清理统计信息
   * @returns 清理统计
   */
  const getStats = (): CleanupStats => {
    return cleanupManager.getCleanupStats()
  }

  return {
    isCleaningUp,
    lastResults,
    stats,
    performFullCleanup,
    cleanTempFiles,
    cleanExpiredCache,
    cleanExpiredDrafts,
    getStats
  }
}

/**
 * 初始化应用级别的清理功能
 * 在 App.vue 中调用，自动处理启动清理和前台清理
 * 
 * @param options - 清理配置选项
 * @returns 清理管理器实例
 * 
 * @example
 * ```vue
 * // App.vue
 * <script setup>
 * import { initAppCleanup } from '@/utils/cleanup/useCleanup'
 * 
 * // 初始化清理功能
 * initAppCleanup({ debug: true })
 * </script>
 * ```
 */
export async function initAppCleanup(options?: CleanupOptions): Promise<CleanupManager> {
  const cleanupManager = getCleanupManager(options)
  
  // 初始化清理管理器
  await cleanupManager.initialize()
  
  return cleanupManager
}

/**
 * 执行应用启动清理
 * 清理超过 24 小时的临时图片
 * 
 * @returns 清理结果数组
 */
export async function performLaunchCleanup(): Promise<CleanupResult[]> {
  const cleanupManager = getCleanupManager()
  
  try {
    console.log('[Cleanup] 执行应用启动清理...')
    const results = await cleanupManager.performLaunchCleanup()
    
    // 输出清理结果摘要
    const totalCleaned = results.reduce((sum, r) => sum + r.cleanedCount, 0)
    const totalFreed = results.reduce((sum, r) => sum + r.freedSpace, 0)
    
    if (totalCleaned > 0) {
      console.log(`[Cleanup] 启动清理完成: 清理 ${totalCleaned} 个文件, 释放 ${formatBytes(totalFreed)}`)
    } else {
      console.log('[Cleanup] 启动清理完成: 无需清理')
    }
    
    return results
  } catch (error) {
    console.error('[Cleanup] 启动清理失败:', error)
    return []
  }
}

/**
 * 执行应用前台清理
 * 清理过期的缓存和草稿
 * 
 * @returns 清理结果数组
 */
export async function performForegroundCleanup(): Promise<CleanupResult[]> {
  const cleanupManager = getCleanupManager()
  
  try {
    // 检查是否需要清理
    if (!cleanupManager.shouldCleanup()) {
      console.log('[Cleanup] 距离上次清理时间不足，跳过前台清理')
      return []
    }
    
    console.log('[Cleanup] 执行应用前台清理...')
    const results = await cleanupManager.performForegroundCleanup()
    
    // 输出清理结果摘要
    const totalCleaned = results.reduce((sum, r) => sum + r.cleanedCount, 0)
    const totalFreed = results.reduce((sum, r) => sum + r.freedSpace, 0)
    
    if (totalCleaned > 0) {
      console.log(`[Cleanup] 前台清理完成: 清理 ${totalCleaned} 个文件, 释放 ${formatBytes(totalFreed)}`)
    } else {
      console.log('[Cleanup] 前台清理完成: 无需清理')
    }
    
    return results
  } catch (error) {
    console.error('[Cleanup] 前台清理失败:', error)
    return []
  }
}

/**
 * 格式化字节数为可读字符串
 * @param bytes - 字节数
 * @returns 格式化后的字符串
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
