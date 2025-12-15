/**
 * 应用状态刷新 Hook
 * 监听应用从后台恢复到前台的事件，自动触发数据刷新
 *
 * 功能：
 * - 监听应用前台/后台切换事件
 * - 应用恢复到前台时自动刷新数据
 * - 支持配置刷新延迟和最小间隔
 * - 集成 Realtime 连接状态管理
 *
 * @module hooks/useAppStateRefresh
 * @feature event-driven-data-refresh
 * @requirements 8.3, 9.3
 */

import Taro from '@tarojs/taro'
import {useCallback, useEffect, useRef} from 'react'
import {createLogger} from '@/utils/logger'
import {isConnected, updateConnectionStatus} from '@/utils/realtimeConnectionManager'

// ==================== 类型定义 ====================

/**
 * 应用状态刷新配置
 */
export interface AppStateRefreshOptions {
  /** 刷新回调函数 */
  onRefresh: () => Promise<void> | void
  /** 是否启用（默认：true） */
  enabled?: boolean
  /** 恢复后刷新延迟（毫秒，默认：500） */
  refreshDelay?: number
  /** 最小刷新间隔（毫秒，默认：5000） */
  minRefreshInterval?: number
  /** Realtime 重连回调（可选） */
  onReconnect?: () => void
}

// ==================== 常量定义 ====================

/** 日志模块名 */
const MODULE_NAME = 'useAppStateRefresh'

/** 默认刷新延迟（毫秒） */
const DEFAULT_REFRESH_DELAY = 500

/** 默认最小刷新间隔（毫秒） */
const DEFAULT_MIN_REFRESH_INTERVAL = 5000

// ==================== Hook 实现 ====================

/** 创建日志实例 */
const logger = createLogger(MODULE_NAME)

/**
 * 应用状态刷新 Hook
 * 监听应用从后台恢复到前台的事件，自动触发数据刷新
 *
 * @param options - 配置选项
 *
 * @example
 * ```tsx
 * // 基础用法
 * useAppStateRefresh({
 *   onRefresh: loadData
 * })
 *
 * // 带 Realtime 重连
 * useAppStateRefresh({
 *   onRefresh: loadData,
 *   onReconnect: () => {
 *     // 重新订阅 Realtime
 *   }
 * })
 *
 * // 自定义配置
 * useAppStateRefresh({
 *   onRefresh: loadData,
 *   enabled: isLoggedIn,
 *   refreshDelay: 1000,
 *   minRefreshInterval: 10000
 * })
 * ```
 */
export function useAppStateRefresh(options: AppStateRefreshOptions): void {
  const {
    onRefresh,
    enabled = true,
    refreshDelay = DEFAULT_REFRESH_DELAY,
    minRefreshInterval = DEFAULT_MIN_REFRESH_INTERVAL,
    onReconnect
  } = options

  // ==================== Refs ====================

  /** 最后一次刷新时间 */
  const lastRefreshTimeRef = useRef<number>(0)

  /** 是否正在刷新 */
  const isRefreshingRef = useRef<boolean>(false)

  /** 应用是否在后台 */
  const isInBackgroundRef = useRef<boolean>(false)

  /** 进入后台的时间 */
  const backgroundTimeRef = useRef<number>(0)

  // ==================== 回调函数 ====================

  /**
   * 执行刷新操作
   * 包含节流逻辑，避免频繁刷新
   */
  const performRefresh = useCallback(async () => {
    // 检查是否正在刷新
    if (isRefreshingRef.current) {
      logger.debug('跳过刷新：正在刷新中')
      return
    }

    // 检查最小刷新间隔
    const now = Date.now()
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current
    if (timeSinceLastRefresh < minRefreshInterval) {
      logger.debug(`跳过刷新：距离上次刷新仅 ${timeSinceLastRefresh}ms，小于最小间隔 ${minRefreshInterval}ms`)
      return
    }

    // 开始刷新
    isRefreshingRef.current = true
    lastRefreshTimeRef.current = now

    logger.info('应用恢复到前台，开始刷新数据')

    try {
      await onRefresh()
      logger.info('数据刷新完成')
    } catch (error) {
      logger.error('数据刷新失败', error)
    } finally {
      isRefreshingRef.current = false
    }
  }, [onRefresh, minRefreshInterval])

  /**
   * 处理应用显示（从后台恢复到前台）
   */
  const handleAppShow = useCallback(() => {
    // 检查是否真的从后台恢复
    if (!isInBackgroundRef.current) {
      logger.debug('应用显示，但不是从后台恢复')
      return
    }

    // 计算在后台的时间
    const backgroundDuration = Date.now() - backgroundTimeRef.current
    logger.info(`应用从后台恢复，后台时长: ${backgroundDuration}ms`)

    // 重置后台状态
    isInBackgroundRef.current = false
    backgroundTimeRef.current = 0

    // 检查 Realtime 连接状态
    if (!isConnected()) {
      logger.info('Realtime 连接已断开，尝试重连')
      // 更新连接状态为重连中
      updateConnectionStatus('reconnecting')
      // 触发重连回调
      onReconnect?.()
    }

    // 延迟执行刷新，给 Realtime 重连一些时间
    setTimeout(() => {
      performRefresh()
    }, refreshDelay)
  }, [performRefresh, refreshDelay, onReconnect])

  /**
   * 处理应用隐藏（进入后台）
   */
  const handleAppHide = useCallback(() => {
    logger.info('应用进入后台')
    isInBackgroundRef.current = true
    backgroundTimeRef.current = Date.now()

    // 更新连接状态为断开（后台时暂停订阅）
    // 注意：这里不直接断开连接，只是标记状态
    // 实际的连接管理由 Supabase 客户端处理
  }, [])

  // ==================== 副作用 ====================

  /**
   * 注册应用生命周期事件监听
   */
  useEffect(() => {
    if (!enabled) {
      return
    }

    logger.debug('注册应用生命周期事件监听')

    // 监听应用显示事件（从后台恢复）
    Taro.onAppShow(handleAppShow)

    // 监听应用隐藏事件（进入后台）
    Taro.onAppHide(handleAppHide)

    // 清理函数
    return () => {
      logger.debug('移除应用生命周期事件监听')
      Taro.offAppShow(handleAppShow)
      Taro.offAppHide(handleAppHide)
    }
  }, [enabled, handleAppShow, handleAppHide])

  // ==================== H5 特殊处理 ====================

  /**
   * H5 环境下使用 visibilitychange 事件
   * 因为 Taro 的 onAppShow/onAppHide 在 H5 环境下可能不可靠
   */
  useEffect(() => {
    // 检查是否为 H5 环境
    if (process.env.TARO_ENV !== 'h5' || !enabled) {
      return
    }

    // 检查 document 是否可用
    if (typeof document === 'undefined') {
      return
    }

    logger.debug('注册 H5 visibilitychange 事件监听')

    /**
     * 处理页面可见性变化
     */
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面变为可见（从后台恢复）
        handleAppShow()
      } else if (document.visibilityState === 'hidden') {
        // 页面变为隐藏（进入后台）
        handleAppHide()
      }
    }

    // 添加事件监听
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 清理函数
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, handleAppShow, handleAppHide])
}

export default useAppStateRefresh
