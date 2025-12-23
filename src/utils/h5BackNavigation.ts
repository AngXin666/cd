/**
 * H5 返回导航管理器
 * 
 * 使用 History API 管理 H5 环境下的页面返回行为：
 * - 工作台页面：阻止返回，重新 push 状态
 * - 普通页面：浏览器默认处理
 * 
 * @module utils/h5BackNavigation
 * @see Requirements 2.1, 2.3, 3.2, 4.2
 */

import { isDashboardPage } from './navigation'

/**
 * H5 返回导航管理器类
 * 
 * 负责在 H5 环境下处理返回导航行为：
 * - 监听 popstate 事件
 * - 工作台页面阻止返回
 * - 普通页面正常返回
 * 
 * @class H5BackNavigationManager
 * @see Requirements 2.1, 2.3, 3.2, 4.2
 */
class H5BackNavigationManager {
  /**
   * 是否已初始化
   * @private
   */
  private initialized = false

  /**
   * 是否正在处理 popstate 事件
   * 用于防止重复处理
   * @private
   */
  private isHandlingPopState = false

  /**
   * 初始化 H5 返回导航管理器
   * 
   * 在 H5 环境下：
   * 1. 监听 popstate 事件
   * 2. 初始化时 push 一个状态用于拦截返回
   * 
   * 注意：此方法只在 H5 环境下生效，其他环境会静默忽略
   * 
   * @returns {void}
   * 
   * @example
   * // 在 App.tsx 中初始化
   * h5BackNavigationManager.initialize()
   * 
   * @see Requirements 3.2
   */
  initialize(): void {
    // 检查是否是 H5 环境
    if (typeof window === 'undefined') {
      console.log('[H5BackNavigation] 非浏览器环境，跳过初始化')
      return
    }

    // 检查 Taro 环境变量，只在 H5 环境下初始化
    // @ts-ignore - process.env.TARO_ENV 是 Taro 注入的环境变量
    if (process.env.TARO_ENV !== 'h5') {
      console.log('[H5BackNavigation] 非 H5 环境，跳过初始化')
      return
    }

    // 防止重复初始化
    if (this.initialized) {
      console.log('[H5BackNavigation] 已初始化，跳过')
      return
    }

    this.initialized = true

    // 监听 popstate 事件
    window.addEventListener('popstate', this.handlePopState)

    // 初始化时 push 一个状态，用于拦截第一次返回
    window.history.pushState({ h5BackNav: true }, '', window.location.href)

    console.log('[H5BackNavigation] 初始化完成')
  }

  /**
   * 处理 popstate 事件
   * 
   * 当用户触发返回操作时：
   * - 工作台页面：重新 push 状态阻止返回
   * - 普通页面：浏览器默认处理（不做任何操作）
   * 
   * @private
   * @returns {void}
   * 
   * @see Requirements 2.1, 2.3, 4.2
   */
  private handlePopState = (): void => {
    // 防止重复处理
    if (this.isHandlingPopState) {
      return
    }

    this.isHandlingPopState = true

    try {
      // 获取当前路径
      const currentPath = window.location.pathname

      console.log('[H5BackNavigation] popstate 事件触发，当前路径:', currentPath)

      // 判断是否是工作台页面
      if (isDashboardPage(currentPath)) {
        // 工作台页面：阻止返回，重新 push 状态
        console.log('[H5BackNavigation] 工作台页面，阻止返回')
        window.history.pushState({ h5BackNav: true }, '', window.location.href)
        // 不做任何其他处理，静默阻止返回
      }
      // 普通页面：浏览器会自动处理返回，不需要额外操作
    } finally {
      // 使用 setTimeout 确保在下一个事件循环中重置标志
      // 这样可以正确处理连续的 popstate 事件
      setTimeout(() => {
        this.isHandlingPopState = false
      }, 0)
    }
  }

  /**
   * 清理资源
   * 
   * 移除 popstate 事件监听器，释放资源
   * 
   * @returns {void}
   * 
   * @example
   * // 在组件卸载时清理
   * h5BackNavigationManager.destroy()
   */
  destroy(): void {
    // 检查是否是 H5 环境
    if (typeof window === 'undefined') {
      return
    }

    // 检查 Taro 环境变量
    // @ts-ignore - process.env.TARO_ENV 是 Taro 注入的环境变量
    if (process.env.TARO_ENV !== 'h5') {
      return
    }

    // 移除事件监听器
    window.removeEventListener('popstate', this.handlePopState)
    this.initialized = false
    this.isHandlingPopState = false

    console.log('[H5BackNavigation] 已清理')
  }

  /**
   * 检查是否已初始化
   * 
   * @returns {boolean} 是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized
  }
}

/**
 * H5 返回导航管理器单例实例
 * 
 * 在应用启动时调用 initialize() 方法初始化
 * 
 * @example
 * // 在 App.tsx 中初始化
 * import { h5BackNavigationManager } from '@/utils/h5BackNavigation'
 * 
 * // 在 initializePlatform 函数中
 * platformExecute.onH5(() => {
 *   h5BackNavigationManager.initialize()
 * })
 * 
 * @see Requirements 3.2
 */
export const h5BackNavigationManager = new H5BackNavigationManager()
