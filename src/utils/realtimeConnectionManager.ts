/**
 * Realtime 连接管理器
 * 提供 Supabase Realtime 连接状态管理、错误处理和用户提示功能
 *
 * 功能：
 * - 统一管理 Realtime 连接状态
 * - 提供用户友好的错误提示
 * - 记录连接错误日志
 * - 支持连接恢复通知
 *
 * @module utils/realtimeConnectionManager
 * @feature event-driven-data-refresh
 * @requirements 9.1
 */

import {createLogger} from './logger'

// ==================== 类型定义 ====================

/**
 * Realtime 连接状态
 */
export type RealtimeConnectionStatus =
  | 'connected' // 已连接
  | 'connecting' // 连接中
  | 'disconnected' // 已断开
  | 'error' // 连接错误
  | 'reconnecting' // 重连中

/**
 * 连接错误类型
 */
export type ConnectionErrorType =
  | 'network' // 网络错误
  | 'timeout' // 连接超时
  | 'auth' // 认证错误
  | 'server' // 服务器错误
  | 'unknown' // 未知错误

/**
 * 连接错误信息
 */
export interface ConnectionError {
  /** 错误类型 */
  type: ConnectionErrorType
  /** 错误消息 */
  message: string
  /** 原始错误 */
  originalError?: Error
  /** 错误时间 */
  timestamp: Date
  /** 重连次数 */
  reconnectAttempts: number
}

/**
 * 连接状态变更回调
 */
export type ConnectionStatusCallback = (status: RealtimeConnectionStatus) => void

/**
 * 连接错误回调
 */
export type ConnectionErrorCallback = (error: ConnectionError) => void

// ==================== 常量定义 ====================

/** 日志模块名 */
const MODULE_NAME = 'RealtimeConnectionManager'

/** 用户提示消息 */
const USER_MESSAGES = {
  /** 连接失败提示 */
  connectionFailed: '实时通知暂时不可用，您可以手动刷新获取最新数据',
  /** 重连中提示 */
  reconnecting: '正在重新连接...',
  /** 重连成功提示 */
  reconnected: '实时通知已恢复',
  /** 网络错误提示 */
  networkError: '网络连接异常，请检查网络设置',
  /** 服务器错误提示 */
  serverError: '服务器暂时不可用，请稍后重试',
  /** 认证错误提示 */
  authError: '登录状态已过期，请重新登录'
} as const

/** 提示显示间隔（毫秒），避免频繁提示 */
const TOAST_THROTTLE_MS = 10000

// ==================== 状态管理 ====================

/** 创建日志实例 */
const logger = createLogger(MODULE_NAME)

/** 当前连接状态 */
let currentStatus: RealtimeConnectionStatus = 'disconnected'

/** 最后一次错误 */
let lastError: ConnectionError | null = null

/** 最后一次显示提示的时间 */
let lastToastTime = 0

/** 状态变更回调列表 */
const statusCallbacks: Set<ConnectionStatusCallback> = new Set()

/** 错误回调列表 */
const errorCallbacks: Set<ConnectionErrorCallback> = new Set()

// ==================== 工具函数 ====================

/**
 * 判断是否应该显示 Toast 提示
 * 使用节流机制避免频繁提示
 *
 * @returns 是否应该显示提示
 */
function shouldShowToast(): boolean {
  const now = Date.now()
  if (now - lastToastTime >= TOAST_THROTTLE_MS) {
    lastToastTime = now
    return true
  }
  return false
}

/**
 * 解析错误类型
 * 根据错误信息判断错误类型
 *
 * @param error - 原始错误
 * @returns 错误类型
 */
function parseErrorType(error: Error | string): ConnectionErrorType {
  const errorMessage = typeof error === 'string' ? error : error.message
  const lowerMessage = errorMessage.toLowerCase()

  // 网络相关错误
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('connection refused') ||
    lowerMessage.includes('net::')
  ) {
    return 'network'
  }

  // 超时错误
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out') || lowerMessage.includes('timed_out')) {
    return 'timeout'
  }

  // 认证错误
  if (lowerMessage.includes('auth') || lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
    return 'auth'
  }

  // 服务器错误
  if (
    lowerMessage.includes('server') ||
    lowerMessage.includes('500') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('503')
  ) {
    return 'server'
  }

  return 'unknown'
}

/**
 * 获取用户友好的错误消息
 *
 * @param errorType - 错误类型
 * @returns 用户友好的错误消息
 */
function getUserFriendlyMessage(errorType: ConnectionErrorType): string {
  switch (errorType) {
    case 'network':
      return USER_MESSAGES.networkError
    case 'timeout':
      return USER_MESSAGES.connectionFailed
    case 'auth':
      return USER_MESSAGES.authError
    case 'server':
      return USER_MESSAGES.serverError
    default:
      return USER_MESSAGES.connectionFailed
  }
}

// ==================== 公共 API ====================

/**
 * 获取当前连接状态
 *
 * @returns 当前连接状态
 */
export function getConnectionStatus(): RealtimeConnectionStatus {
  return currentStatus
}

/**
 * 获取最后一次错误
 *
 * @returns 最后一次错误信息，如果没有错误则返回 null
 */
export function getLastError(): ConnectionError | null {
  return lastError
}

/**
 * 检查是否已连接
 *
 * @returns 是否已连接
 */
export function isConnected(): boolean {
  return currentStatus === 'connected'
}

/**
 * 更新连接状态
 * 通知所有订阅者状态变更
 *
 * @param status - 新的连接状态
 */
export function updateConnectionStatus(status: RealtimeConnectionStatus): void {
  const previousStatus = currentStatus
  currentStatus = status

  // 记录状态变更日志
  logger.info(`连接状态变更: ${previousStatus} -> ${status}`)

  // 如果从错误/断开状态恢复到已连接，静默恢复（不显示提示）
  if (
    status === 'connected' &&
    (previousStatus === 'error' || previousStatus === 'disconnected' || previousStatus === 'reconnecting')
  ) {
    // 静默恢复，不显示 Toast 提示，只记录日志
    logger.info('实时通知已恢复')
    // 清除最后一次错误
    lastError = null
  }

  // 如果正在重连，只记录日志，不显示 Toast 提示
  if (status === 'reconnecting') {
    logger.debug('正在重新连接 Realtime...')
  }

  // 通知所有订阅者
  statusCallbacks.forEach((callback) => {
    try {
      callback(status)
    } catch (error) {
      logger.error('状态回调执行失败', error)
    }
  })
}

/**
 * 处理连接错误
 * 记录错误日志并显示用户友好的提示
 *
 * @param error - 错误信息
 * @param reconnectAttempts - 当前重连次数
 */
export function handleConnectionError(error: Error | string, reconnectAttempts: number = 0): void {
  // 解析错误类型
  const errorType = parseErrorType(error)
  const errorMessage = typeof error === 'string' ? error : error.message

  // 创建错误信息对象
  const connectionError: ConnectionError = {
    type: errorType,
    message: errorMessage,
    originalError: typeof error === 'string' ? new Error(error) : error,
    timestamp: new Date(),
    reconnectAttempts
  }

  // 保存最后一次错误
  lastError = connectionError

  // 记录错误日志
  logger.error(`Realtime 连接错误 [${errorType}]`, {
    message: errorMessage,
    reconnectAttempts,
    timestamp: connectionError.timestamp.toISOString()
  })

  // 更新连接状态
  updateConnectionStatus('error')

  // 只记录日志，不显示 Toast 提示（避免打扰用户）
  // 用户可以通过手动刷新获取最新数据
  logger.warn(`Realtime 连接错误提示: ${getUserFriendlyMessage(errorType)}`)

  // 通知所有错误订阅者
  errorCallbacks.forEach((callback) => {
    try {
      callback(connectionError)
    } catch (callbackError) {
      logger.error('错误回调执行失败', callbackError)
    }
  })
}

/**
 * 订阅连接状态变更
 *
 * @param callback - 状态变更回调函数
 * @returns 取消订阅函数
 */
export function subscribeToStatus(callback: ConnectionStatusCallback): () => void {
  statusCallbacks.add(callback)

  // 立即通知当前状态
  callback(currentStatus)

  // 返回取消订阅函数
  return () => {
    statusCallbacks.delete(callback)
  }
}

/**
 * 订阅连接错误
 *
 * @param callback - 错误回调函数
 * @returns 取消订阅函数
 */
export function subscribeToErrors(callback: ConnectionErrorCallback): () => void {
  errorCallbacks.add(callback)

  // 返回取消订阅函数
  return () => {
    errorCallbacks.delete(callback)
  }
}

/**
 * 重置连接管理器状态
 * 用于测试或重新初始化
 */
export function resetConnectionManager(): void {
  currentStatus = 'disconnected'
  lastError = null
  lastToastTime = 0
  statusCallbacks.clear()
  errorCallbacks.clear()
  logger.info('连接管理器已重置')
}

/**
 * 导出连接管理器对象
 */
export const realtimeConnectionManager = {
  getConnectionStatus,
  getLastError,
  isConnected,
  updateConnectionStatus,
  handleConnectionError,
  subscribeToStatus,
  subscribeToErrors,
  resetConnectionManager
}

export default realtimeConnectionManager
