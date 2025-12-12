/**
 * 全局Loading管理器
 *
 * @description 提供全局loading的显示和隐藏功能
 * @module utils/loading
 *
 * @example
 * ```typescript
 * import {showGlobalLoading, hideGlobalLoading} from '@/utils/loading'
 *
 * // 显示loading
 * showGlobalLoading('处理中...')
 *
 * // 隐藏loading
 * hideGlobalLoading()
 *
 * // 自动管理loading
 * await withLoading(async () => {
 *   await someAsyncOperation()
 * }, '处理中...')
 * ```
 */

import Taro from '@tarojs/taro'

/**
 * 显示全局loading
 * @param title 提示文字
 * @param mask 是否显示遮罩层
 */
export function showGlobalLoading(title: string = '加载中...', mask: boolean = true): void {
  Taro.showLoading({
    title,
    mask
  })
}

/**
 * 隐藏全局loading
 */
export function hideGlobalLoading(): void {
  Taro.hideLoading()
}

/**
 * 包装异步函数，自动显示和隐藏loading
 * @param fn 异步函数
 * @param title loading提示文字
 * @returns 异步函数的返回值
 */
export async function withLoading<T>(fn: () => Promise<T>, title: string = '处理中...'): Promise<T> {
  try {
    showGlobalLoading(title)
    const result = await fn()
    return result
  } finally {
    hideGlobalLoading()
  }
}

/**
 * Loading装饰器
 * 自动为异步方法添加loading效果
 * @param title loading提示文字
 */
export function withLoadingDecorator(title: string = '处理中...') {
  return (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      return withLoading(() => originalMethod.apply(this, args), title)
    }

    return descriptor
  }
}

/**
 * 延迟显示loading（避免闪烁）
 * 如果操作在指定时间内完成，则不显示loading
 * @param fn 异步函数
 * @param title loading提示文字
 * @param delay 延迟时间（毫秒），默认300ms
 */
export async function withDelayedLoading<T>(
  fn: () => Promise<T>,
  title: string = '处理中...',
  delay: number = 300
): Promise<T> {
  let loadingShown = false
  let loadingTimer: NodeJS.Timeout | null = null

  try {
    // 设置延迟显示loading的定时器
    loadingTimer = setTimeout(() => {
      showGlobalLoading(title)
      loadingShown = true
    }, delay)

    // 执行异步操作
    const result = await fn()

    // 如果操作完成，清除定时器
    if (loadingTimer) {
      clearTimeout(loadingTimer)
      loadingTimer = null
    }

    return result
  } finally {
    // 清理
    if (loadingTimer) {
      clearTimeout(loadingTimer)
    }
    if (loadingShown) {
      hideGlobalLoading()
    }
  }
}
