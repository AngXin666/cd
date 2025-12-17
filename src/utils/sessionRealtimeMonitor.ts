/**
 * 会话实时监听器
 * 使用 Supabase Realtime 监听 session_token 变化，实现即时踢出功能
 *
 * 功能：
 * - 订阅 users 表的 session_token 字段变化
 * - 当检测到 token 变化且与本地不匹配时，触发踢出回调
 * - 支持连接状态监控和错误处理
 * - 复用 realtimeConnectionManager 处理连接错误
 *
 * @module utils/sessionRealtimeMonitor
 * @feature realtime-session-kickout
 * @requirements 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3
 */

import { supabase } from '@/client/supabase'
import { createLogger } from './logger'
import {
  realtimeConnectionManager,
  type RealtimeConnectionStatus
} from './realtimeConnectionManager'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// ==================== 类型定义 ====================

/**
 * 会话失效回调函数类型
 */
export type SessionInvalidCallback = () => void

/**
 * 连接状态变更回调函数类型
 */
export type ConnectionStatusChangeCallback = (status: RealtimeConnectionStatus) => void

/**
 * 用户表记录类型（仅包含会话相关字段）
 */
interface UserSessionRecord {
  /** 用户ID */
  id: string
  /** 会话令牌 */
  session_token: string | null
  /** 会话创建时间 */
  session_created_at: string | null
}

// ==================== 常量定义 ====================

/** 日志模块名 */
const MODULE_NAME = 'SessionRealtimeMonitor'

/** Realtime 频道名称前缀 */
const CHANNEL_NAME_PREFIX = 'session-monitor'

// ==================== 状态管理 ====================

/** 创建日志实例 */
const logger = createLogger(MODULE_NAME)

/** 当前 Realtime 频道 */
let channel: RealtimeChannel | null = null

/** 当前监听的用户ID */
let currentUserId: string | null = null

/** 本地存储的会话令牌 */
let localSessionToken: string | null = null

/** 会话失效回调 */
let onSessionInvalidCallback: SessionInvalidCallback | null = null

/** 连接状态变更回调 */
let onConnectionStatusChangeCallback: ConnectionStatusChangeCallback | null = null

/** 是否正在监听 */
let isMonitoringActive = false

/** 当前连接状态 */
let connectionStatus: RealtimeConnectionStatus = 'disconnected'

// ==================== 内部函数 ====================

/**
 * 处理 session_token 变化事件
 * 比较数据库中的 token 与本地 token，不匹配时触发踢出
 *
 * @param payload - Realtime 变更事件载荷
 */
function handleSessionTokenChange(
  payload: RealtimePostgresChangesPayload<UserSessionRecord>
): void {
  // 只处理 UPDATE 事件
  if (payload.eventType !== 'UPDATE') {
    return
  }

  const newRecord = payload.new as UserSessionRecord
  const oldRecord = payload.old as Partial<UserSessionRecord>

  // 验证是否是当前用户的记录
  if (newRecord.id !== currentUserId) {
    logger.debug('收到其他用户的变更事件，忽略', { userId: newRecord.id })
    return
  }

  // 获取新的 session_token
  const newToken = newRecord.session_token
  const oldToken = oldRecord.session_token

  logger.info('检测到 session_token 变化', {
    userId: currentUserId,
    oldToken: oldToken ? `${oldToken.substring(0, 8)}...` : 'null',
    newToken: newToken ? `${newToken.substring(0, 8)}...` : 'null',
    localToken: localSessionToken ? `${localSessionToken.substring(0, 8)}...` : 'null'
  })

  // 比较 token
  // 情况1：新 token 为 null（用户被强制登出）
  if (newToken === null) {
    logger.warn('数据库 session_token 被清除，触发踢出')
    triggerKickout()
    return
  }

  // 情况2：新 token 与本地 token 不匹配（其他设备登录）
  if (newToken !== localSessionToken) {
    logger.warn('session_token 不匹配，触发踢出', {
      reason: '其他设备登录'
    })
    triggerKickout()
    return
  }

  // 情况3：token 匹配，无需操作
  logger.debug('session_token 匹配，会话有效')
}

/**
 * 触发踢出流程
 * 停止监听并调用踢出回调
 */
function triggerKickout(): void {
  logger.info('触发踢出流程')

  // 先停止监听，避免重复触发
  stop()

  // 调用踢出回调
  if (onSessionInvalidCallback) {
    try {
      onSessionInvalidCallback()
    } catch (error) {
      logger.error('踢出回调执行失败', error)
    }
  } else {
    logger.warn('未设置踢出回调函数')
  }
}

/**
 * 更新连接状态
 *
 * @param status - 新的连接状态
 */
function updateConnectionStatus(status: RealtimeConnectionStatus): void {
  const previousStatus = connectionStatus
  connectionStatus = status

  if (previousStatus !== status) {
    logger.info(`连接状态变更: ${previousStatus} -> ${status}`)

    // 同步到全局连接管理器
    realtimeConnectionManager.updateConnectionStatus(status)

    // 调用状态变更回调
    if (onConnectionStatusChangeCallback) {
      try {
        onConnectionStatusChangeCallback(status)
      } catch (error) {
        logger.error('连接状态回调执行失败', error)
      }
    }
  }
}

/**
 * 处理频道状态变化
 * 记录详细的连接状态日志，便于调试和监控
 *
 * @param status - 频道状态
 * @requirements 3.3
 */
function handleChannelStatus(status: string): void {
  // 记录详细的频道状态变化日志
  logger.info('Realtime 频道状态变化', {
    status,
    userId: currentUserId,
    previousStatus: connectionStatus,
    timestamp: new Date().toISOString()
  })

  switch (status) {
    case 'SUBSCRIBED':
      logger.info('✅ Realtime 连接成功，开始实时监听 session_token 变化')
      updateConnectionStatus('connected')
      break
    case 'CHANNEL_ERROR':
      logger.error('❌ Realtime 频道错误，可能需要降级到轮询模式')
      updateConnectionStatus('error')
      realtimeConnectionManager.handleConnectionError(
        new Error('Realtime 频道错误'),
        0
      )
      break
    case 'TIMED_OUT':
      logger.error('❌ Realtime 连接超时，可能需要降级到轮询模式')
      updateConnectionStatus('error')
      realtimeConnectionManager.handleConnectionError(
        new Error('Realtime 连接超时'),
        0
      )
      break
    case 'CLOSED':
      logger.info('🔌 Realtime 连接已关闭')
      updateConnectionStatus('disconnected')
      break
    default:
      // 其他状态视为连接中
      if (status !== 'SUBSCRIBED') {
        logger.debug('🔄 Realtime 正在连接...', { status })
        updateConnectionStatus('connecting')
      }
  }
}

// ==================== 公共 API ====================

/**
 * 启动实时会话监听
 * 建立 Realtime 订阅，监听当前用户的 session_token 变化
 *
 * 边界情况处理：
 * - 用户ID为空：记录错误并返回
 * - 会话令牌为空：记录错误并返回
 * - 重复启动：先停止现有监听再启动新的
 * - 未提供回调：记录错误并返回
 *
 * @param userId - 当前用户ID
 * @param sessionToken - 本地存储的会话令牌
 * @param onSessionInvalid - 会话失效回调函数
 * @param onConnectionStatusChange - 连接状态变更回调函数（可选）
 * @requirements 4.1, 4.4
 */
export function start(
  userId: string,
  sessionToken: string,
  onSessionInvalid: SessionInvalidCallback,
  onConnectionStatusChange?: ConnectionStatusChangeCallback
): void {
  // 边界情况1：如果已经在监听同一用户，检查是否需要重新启动
  if (isMonitoringActive && currentUserId === userId) {
    logger.info('监听器已在运行且用户相同，检查是否需要更新令牌')
    // 如果令牌相同，无需重新启动
    if (localSessionToken === sessionToken) {
      logger.debug('会话令牌相同，无需重新启动监听')
      return
    }
    // 令牌不同，更新本地令牌即可
    logger.info('会话令牌已更新，更新本地令牌')
    localSessionToken = sessionToken
    return
  }

  // 边界情况2：如果已经在监听其他用户，先停止
  if (isMonitoringActive) {
    logger.warn('监听器已在运行（不同用户），先停止现有监听', {
      currentUserId,
      newUserId: userId
    })
    stop()
  }

  // 边界情况3：验证用户ID
  if (!userId) {
    logger.error('启动监听失败：用户ID为空（用户可能未登录）')
    return
  }

  // 边界情况4：验证会话令牌
  if (!sessionToken) {
    logger.error('启动监听失败：会话令牌为空（可能是新登录或令牌丢失）')
    return
  }

  // 边界情况5：验证回调函数
  if (!onSessionInvalid) {
    logger.error('启动监听失败：未提供踢出回调函数')
    return
  }

  // 保存参数
  currentUserId = userId
  localSessionToken = sessionToken
  onSessionInvalidCallback = onSessionInvalid
  onConnectionStatusChangeCallback = onConnectionStatusChange || null

  logger.info('🚀 启动会话实时监听', {
    userId,
    tokenPrefix: sessionToken.substring(0, 8),
    timestamp: new Date().toISOString()
  })

  // 更新状态为连接中
  updateConnectionStatus('connecting')

  // 创建 Realtime 频道
  const channelName = `${CHANNEL_NAME_PREFIX}-${userId}`

  channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`
      },
      (payload) => {
        handleSessionTokenChange(payload as RealtimePostgresChangesPayload<UserSessionRecord>)
      }
    )
    .subscribe((status) => {
      handleChannelStatus(status)
    })

  isMonitoringActive = true
  logger.info('✅ 会话实时监听已启动，等待 WebSocket 连接...')
}

/**
 * 停止实时会话监听
 * 取消 Realtime 订阅，清理资源
 *
 * 边界情况处理：
 * - 监听器未运行：记录日志并返回
 * - 频道已为空：安全处理
 *
 * @requirements 4.4
 */
export function stop(): void {
  // 边界情况：监听器未运行
  if (!isMonitoringActive && !channel) {
    logger.debug('监听器未运行，无需停止')
    return
  }

  logger.info('🛑 停止会话实时监听', {
    userId: currentUserId,
    wasMonitoring: isMonitoringActive,
    hadChannel: !!channel,
    timestamp: new Date().toISOString()
  })

  // 取消订阅
  if (channel) {
    try {
      supabase.removeChannel(channel)
      logger.debug('Realtime 频道已移除')
    } catch (error) {
      logger.error('移除 Realtime 频道失败', error)
    }
    channel = null
  }

  // 清理状态
  currentUserId = null
  localSessionToken = null
  onSessionInvalidCallback = null
  onConnectionStatusChangeCallback = null
  isMonitoringActive = false

  // 更新连接状态
  updateConnectionStatus('disconnected')

  logger.info('✅ 会话实时监听已停止，资源已清理')
}

/**
 * 检查是否正在监听
 *
 * @returns 是否正在监听
 */
export function isMonitoring(): boolean {
  return isMonitoringActive
}

/**
 * 获取当前连接状态
 *
 * @returns 当前连接状态
 */
export function getConnectionStatus(): RealtimeConnectionStatus {
  return connectionStatus
}

/**
 * 更新本地会话令牌
 * 用于在会话刷新后更新本地 token
 *
 * @param newToken - 新的会话令牌
 */
export function updateLocalSessionToken(newToken: string): void {
  if (!isMonitoringActive) {
    logger.warn('监听器未运行，无法更新本地令牌')
    return
  }

  logger.info('更新本地会话令牌', {
    oldTokenPrefix: localSessionToken ? localSessionToken.substring(0, 8) : 'null',
    newTokenPrefix: newToken.substring(0, 8)
  })

  localSessionToken = newToken
}

// ==================== 导出模块对象 ====================

/**
 * 会话实时监听器对象
 * 提供统一的模块访问接口
 */
export const sessionRealtimeMonitor = {
  start,
  stop,
  isMonitoring,
  getConnectionStatus,
  updateLocalSessionToken
}

export default sessionRealtimeMonitor
