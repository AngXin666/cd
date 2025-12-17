/**
 * 首页返回键和左滑手势拦截 Hook
 * 在首页阻止用户通过返回键或左滑手势退出应用
 * 
 * 功能：
 * - H5 环境：拦截浏览器返回按钮，防止退出应用
 * - H5 环境：拦截左滑手势（触摸屏），防止意外返回
 * - 小程序环境：暂不支持（小程序有自己的返回逻辑）
 * 
 * @module hooks/useBackButtonBlock
 */

import {useEffect, useRef} from 'react'
import Taro from '@tarojs/taro'

// 检测当前运行环境
const isH5 = process.env.TARO_ENV === 'h5'

// 左滑检测阈值（像素）：滑动距离超过此值才触发
const SWIPE_THRESHOLD = 50

// 左滑检测起始区域宽度（像素）：只有从屏幕左边缘开始的滑动才会被拦截
const EDGE_WIDTH = 30

/**
 * 首页返回键和左滑手势拦截 Hook
 * 
 * @param enabled - 是否启用拦截，默认为 true
 * @param showToast - 是否显示提示，默认为 true
 * @param toastMessage - 提示消息，默认为 "再按一次退出应用"
 * @param blockSwipeBack - 是否阻止左滑返回手势，默认为 true
 * 
 * @example
 * ```tsx
 * // 在首页组件中使用
 * const MyHomePage = () => {
 *   useBackButtonBlock()
 *   return <View>首页内容</View>
 * }
 * 
 * // 禁用左滑拦截
 * const MyPage = () => {
 *   useBackButtonBlock(true, true, '再按一次退出应用', false)
 *   return <View>页面内容</View>
 * }
 * ```
 */
export function useBackButtonBlock(
  enabled: boolean = true,
  showToast: boolean = true,
  toastMessage: string = '再按一次退出应用',
  blockSwipeBack: boolean = true
): void {
  // 记录上次按返回键的时间，用于双击退出逻辑
  const lastBackPressTime = useRef<number>(0)
  // 双击退出的时间间隔（毫秒）
  const DOUBLE_PRESS_INTERVAL = 2000

  // 触摸起始位置
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  // 是否是从边缘开始的触摸
  const isEdgeTouch = useRef<boolean>(false)

  useEffect(() => {
    // 只在 H5 环境且启用时生效
    if (!isH5 || !enabled) {
      return
    }

    /**
     * 处理 popstate 事件（浏览器返回按钮）
     * 通过 pushState 阻止返回，实现双击退出逻辑
     */
    const handlePopState = (_event: PopStateEvent) => {
      const currentTime = Date.now()
      const timeDiff = currentTime - lastBackPressTime.current

      if (timeDiff < DOUBLE_PRESS_INTERVAL) {
        // 双击退出：允许返回（实际上会退出应用或返回到登录页）
        // 不做任何处理，让浏览器正常返回
        return
      }

      // 第一次按返回键：阻止返回，显示提示
      lastBackPressTime.current = currentTime

      // 重新 push 当前状态，阻止返回
      window.history.pushState(null, '', window.location.href)

      // 显示提示
      if (showToast) {
        Taro.showToast({
          title: toastMessage,
          icon: 'none',
          duration: 2000
        })
      }
    }

    /**
     * 处理触摸开始事件
     * 记录触摸起始位置，判断是否从屏幕边缘开始
     */
    const handleTouchStart = (event: TouchEvent) => {
      if (!blockSwipeBack) return

      const touch = event.touches[0]
      touchStartX.current = touch.clientX
      touchStartY.current = touch.clientY
      
      // 判断是否从屏幕左边缘开始触摸
      isEdgeTouch.current = touch.clientX <= EDGE_WIDTH
    }

    /**
     * 处理触摸移动事件
     * 检测左滑手势，如果是从边缘开始的左滑则阻止
     */
    const handleTouchMove = (event: TouchEvent) => {
      if (!blockSwipeBack || !isEdgeTouch.current) return

      const touch = event.touches[0]
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = touch.clientY - touchStartY.current

      // 判断是否是水平滑动（水平位移大于垂直位移）
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY)

      // 如果是从左边缘开始的向右滑动（左滑返回手势）
      if (isHorizontalSwipe && deltaX > SWIPE_THRESHOLD) {
        // 阻止默认行为，防止浏览器的左滑返回
        event.preventDefault()
      }
    }

    /**
     * 处理触摸结束事件
     * 重置触摸状态
     */
    const handleTouchEnd = () => {
      isEdgeTouch.current = false
    }

    // 初始化：push 一个状态，用于拦截返回
    window.history.pushState(null, '', window.location.href)

    // 监听 popstate 事件
    window.addEventListener('popstate', handlePopState)

    // 监听触摸事件（用于拦截左滑手势）
    if (blockSwipeBack) {
      // 使用 passive: false 以便能够调用 preventDefault
      document.addEventListener('touchstart', handleTouchStart, {passive: true})
      document.addEventListener('touchmove', handleTouchMove, {passive: false})
      document.addEventListener('touchend', handleTouchEnd, {passive: true})
    }

    // 清理函数
    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (blockSwipeBack) {
        document.removeEventListener('touchstart', handleTouchStart)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [enabled, showToast, toastMessage, blockSwipeBack])
}

export default useBackButtonBlock
