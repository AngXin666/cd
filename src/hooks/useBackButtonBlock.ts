/**
 * 返回键拦截 Hook（简化版）
 * 用于在特定页面阻止用户通过返回键退出应用
 *
 * 使用场景：
 * - 登录页：阻止用户在登录页按返回键退出应用
 * - 其他需要阻止返回的特殊页面
 *
 * 注意：工作台页面（司机/管理员/老板首页、个人中心等）的返回拦截
 * 已由全局管理器 h5BackNavigationManager 统一处理，不再需要在各页面单独调用此 Hook。
 *
 * 功能：
 * - H5 环境：拦截浏览器返回按钮，阻止返回（静默处理，无提示）
 * - Android 环境：由原生代码处理（MainActivity.onBackPressed）
 * - 小程序环境：由页面配置处理（navigationStyle: 'custom'）
 *
 * 优化说明：
 * - 移除了双击退出逻辑（用户使用系统手势退出）
 * - 移除了 Toast 提示（静默阻止返回）
 * - 移除了左滑手势拦截（由全局管理器或原生代码处理）
 * - 保留 H5 环境的基本阻止返回功能作为备选方案
 *
 * @module hooks/useBackButtonBlock
 * @see Requirements 2.1, 2.3 - 阻止返回，静默处理
 * @see h5BackNavigationManager - 工作台页面的全局返回管理器
 */

import {useEffect} from 'react'

// 检测当前运行环境
const isH5 = process.env.TARO_ENV === 'h5'

/**
 * 返回键拦截 Hook（简化版）
 * 用于在特定页面阻止用户通过返回键退出应用
 *
 * @param enabled - 是否启用拦截，默认为 true
 *
 * @example
 * ```tsx
 * // 在登录页使用
 * const LoginPage = () => {
 *   useBackButtonBlock()
 *   return <View>登录页</View>
 * }
 *
 * // 禁用拦截
 * const MyPage = () => {
 *   useBackButtonBlock(false)
 *   return <View>普通页面</View>
 * }
 * ```
 */
export function useBackButtonBlock(enabled: boolean = true): void {
  useEffect(() => {
    // 只在 H5 环境且启用时生效
    // Android 和小程序由各自的原生/配置方式处理
    if (!isH5 || !enabled) {
      return
    }

    /**
     * 处理 popstate 事件（浏览器返回按钮）
     * 通过重新 pushState 阻止返回，静默处理不显示任何提示
     *
     * @param _event - popstate 事件对象（未使用）
     */
    const handlePopState = (_event: PopStateEvent): void => {
      // 重新 push 当前状态，阻止返回
      // 静默处理：不显示 Toast，不累计点击次数
      window.history.pushState(null, '', window.location.href)
    }

    // 初始化：push 一个状态，用于拦截返回
    window.history.pushState(null, '', window.location.href)

    // 监听 popstate 事件
    window.addEventListener('popstate', handlePopState)

    // 清理函数：移除事件监听
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [enabled])
}

export default useBackButtonBlock
