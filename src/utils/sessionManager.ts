/**
 * 会话管理器
 * 实现单点登录功能：同一账号只能在一个设备登录
 * 
 * 功能：
 * - 登录时生成新的 session token 并更新到数据库
 * - 使用 Realtime 实时监听 session token 变化（优先）
 * - 定期检查 session token 是否有效（降级方案）
 * - 如果被其他设备踢掉则强制退出
 * - 支持 WebSocket 失败时自动降级到轮询模式
 * 
 * @module utils/sessionManager
 * @feature realtime-session-kickout
 * @requirements 1.4, 2.1, 2.4, 3.4, 4.2, 4.3
 */

import Taro from '@tarojs/taro'
import { supabase } from '@/client/supabase'
import { createLogger } from './logger'
import { smartLogout } from './auth'
import { sessionRealtimeMonitor } from './sessionRealtimeMonitor'
import type { RealtimeConnectionStatus } from './realtimeConnectionManager'

const logger = createLogger('SessionManager')

// 检测当前运行环境
const isH5 = process.env.TARO_ENV === 'h5'

// 会话检查间隔（毫秒）：30秒
const SESSION_CHECK_INTERVAL = 30 * 1000

// 存储键名
const SESSION_TOKEN_KEY = 'current_session_token'

// 会话检查定时器
let sessionCheckTimer: NodeJS.Timeout | null = null

// 是否正在检查会话
let isCheckingSession = false

// 是否使用实时监听模式
let isRealtimeMode = false

// 是否已降级到轮询模式
let isFallbackToPolling = false

// 当前用户ID（用于实时监听）
let currentMonitorUserId: string | null = null

// 降级检测定时器（用于检测 WebSocket 连接状态）
let fallbackCheckTimer: NodeJS.Timeout | null = null

// 降级检测间隔（毫秒）：5秒
const FALLBACK_CHECK_INTERVAL = 5000

// WebSocket 连接超时时间（毫秒）：10秒
const WEBSOCKET_CONNECT_TIMEOUT = 10000

/**
 * 生成唯一的会话令牌
 * 使用时间戳 + 随机字符串组合
 * @returns 会话令牌字符串
 */
function generateSessionToken(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 15)
  const randomPart2 = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${randomPart}-${randomPart2}`
}

/**
 * 获取存储的会话令牌
 * @returns 会话令牌，如果不存在则返回 null
 */
function getStoredSessionToken(): string | null {
  try {
    if (isH5) {
      return localStorage.getItem(SESSION_TOKEN_KEY)
    } else {
      return Taro.getStorageSync(SESSION_TOKEN_KEY) || null
    }
  } catch (error) {
    logger.error('获取存储的会话令牌失败', error)
    return null
  }
}

/**
 * 存储会话令牌
 * @param token - 会话令牌
 */
function storeSessionToken(token: string): void {
  try {
    if (isH5) {
      localStorage.setItem(SESSION_TOKEN_KEY, token)
    } else {
      Taro.setStorageSync(SESSION_TOKEN_KEY, token)
    }
  } catch (error) {
    logger.error('存储会话令牌失败', error)
  }
}

/**
 * 清除存储的会话令牌
 */
function clearStoredSessionToken(): void {
  try {
    if (isH5) {
      localStorage.removeItem(SESSION_TOKEN_KEY)
    } else {
      Taro.removeStorageSync(SESSION_TOKEN_KEY)
    }
  } catch (error) {
    logger.error('清除存储的会话令牌失败', error)
  }
}

/**
 * 创建新的会话
 * 登录成功后调用此函数，生成新的 session token 并更新到数据库
 * 这会使该用户在其他设备上的会话失效
 * 
 * @param userId - 用户ID
 * @returns 是否创建成功
 */
export async function createSession(userId: string): Promise<boolean> {
  try {
    // 1. 生成新的会话令牌
    const sessionToken = generateSessionToken()
    
    // 2. 更新到数据库
    const { data, error } = await supabase.rpc('update_user_session_token', {
      p_user_id: userId,
      p_session_token: sessionToken
    })
    
    if (error) {
      logger.error('更新会话令牌到数据库失败', error)
      return false
    }
    
    if (!data) {
      logger.warn('更新会话令牌失败：用户不存在')
      return false
    }
    
    // 3. 存储到本地
    storeSessionToken(sessionToken)
    
    logger.info('会话创建成功', { userId })
    return true
  } catch (error) {
    logger.error('创建会话异常', error)
    return false
  }
}

/**
 * 验证当前会话是否有效
 * 检查本地存储的 session token 是否与数据库中的一致
 * 
 * @param userId - 用户ID
 * @returns 会话是否有效
 */
export async function verifySession(userId: string): Promise<boolean> {
  try {
    // 1. 获取本地存储的会话令牌
    const localToken = getStoredSessionToken()
    
    if (!localToken) {
      logger.warn('本地没有存储会话令牌')
      return false
    }
    
    // 2. 调用数据库函数验证
    const { data, error } = await supabase.rpc('verify_user_session_token', {
      p_user_id: userId,
      p_session_token: localToken
    })
    
    if (error) {
      logger.error('验证会话令牌失败', error)
      // 网络错误时不强制退出，返回 true 保持当前状态
      return true
    }
    
    return data === true
  } catch (error) {
    logger.error('验证会话异常', error)
    // 异常时不强制退出，返回 true 保持当前状态
    return true
  }
}

/**
 * 清除会话
 * 退出登录时调用此函数，清除数据库和本地的 session token
 * 
 * @param userId - 用户ID
 */
export async function clearSession(userId: string): Promise<void> {
  try {
    // 1. 清除数据库中的会话令牌
    await supabase.rpc('clear_user_session_token', {
      p_user_id: userId
    })
    
    // 2. 清除本地存储
    clearStoredSessionToken()
    
    logger.info('会话已清除', { userId })
  } catch (error) {
    logger.error('清除会话异常', error)
    // 即使清除失败，也要清除本地存储
    clearStoredSessionToken()
  }
}

/**
 * 处理会话失效
 * 当检测到会话被其他设备踢掉时调用
 */
async function handleSessionInvalid(): Promise<void> {
  logger.warn('会话已失效，可能在其他设备登录')
  
  // 停止会话检查
  stopSessionCheck()
  
  // 清除本地会话令牌
  clearStoredSessionToken()
  
  // 显示提示
  Taro.showModal({
    title: '登录已失效',
    content: '您的账号已在其他设备登录，请重新登录',
    showCancel: false,
    confirmText: '确定',
    success: () => {
      // 强制退出登录
      smartLogout()
    }
  })
}

/**
 * 执行会话检查
 * 定期调用此函数检查会话是否有效
 */
async function performSessionCheck(): Promise<void> {
  // 防止重复检查
  if (isCheckingSession) {
    return
  }
  
  isCheckingSession = true
  
  try {
    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      // 用户未登录，停止检查
      stopSessionCheck()
      return
    }
    
    // 验证会话
    const isValid = await verifySession(user.id)
    
    if (!isValid) {
      // 会话失效，处理退出
      await handleSessionInvalid()
    }
  } catch (error) {
    logger.error('会话检查异常', error)
  } finally {
    isCheckingSession = false
  }
}

/**
 * 启动会话检查
 * 登录成功后调用此函数，开始定期检查会话有效性
 */
export function startSessionCheck(): void {
  // 先停止已有的检查
  stopSessionCheck()
  
  // 立即执行一次检查
  performSessionCheck()
  
  // 设置定时检查
  sessionCheckTimer = setInterval(performSessionCheck, SESSION_CHECK_INTERVAL)
  
  logger.info('会话检查已启动', { interval: SESSION_CHECK_INTERVAL })
}

/**
 * 停止会话检查
 * 退出登录时调用此函数，停止定期检查
 */
export function stopSessionCheck(): void {
  if (sessionCheckTimer) {
    clearInterval(sessionCheckTimer)
    sessionCheckTimer = null
    logger.info('会话检查已停止')
  }
}

/**
 * 检查是否有存储的会话令牌
 * 用于判断是否需要创建新会话
 * @returns 是否有存储的会话令牌
 */
export function hasStoredSession(): boolean {
  return getStoredSessionToken() !== null
}

// ==================== 实时监听相关功能 ====================

/**
 * 处理实时监听连接状态变化
 * 当 WebSocket 连接失败时，自动降级到轮询模式
 * 当连接恢复时，停止轮询，恢复实时监听
 *
 * 状态转换日志：
 * - connected: 记录连接成功，如果从轮询恢复则记录恢复事件
 * - error/disconnected: 记录降级事件
 * - connecting/reconnecting: 记录重连尝试
 *
 * @param status - 连接状态
 * @requirements 1.4, 3.3, 3.4, 4.2
 */
function handleRealtimeConnectionStatusChange(status: RealtimeConnectionStatus): void {
  // 记录详细的状态变化日志
  logger.info('📡 实时监听连接状态变化', {
    status,
    previousMode: isRealtimeMode ? 'realtime' : (isFallbackToPolling ? 'polling' : 'none'),
    isFallbackToPolling,
    userId: currentMonitorUserId,
    timestamp: new Date().toISOString()
  })

  switch (status) {
    case 'connected':
      // 连接成功，如果之前降级到轮询，现在恢复实时监听
      if (isFallbackToPolling) {
        logger.info('🔄 WebSocket 连接恢复，从轮询模式切换回实时监听模式', {
          userId: currentMonitorUserId
        })
        stopSessionCheck()
        isFallbackToPolling = false
      } else {
        logger.info('✅ WebSocket 连接成功，实时监听模式已激活')
      }
      isRealtimeMode = true
      break

    case 'error':
    case 'disconnected':
      // 连接失败或断开，降级到轮询模式
      if (!isFallbackToPolling && currentMonitorUserId) {
        logger.warn('⚠️ WebSocket 连接失败，降级到轮询模式', {
          status,
          userId: currentMonitorUserId,
          pollingInterval: `${SESSION_CHECK_INTERVAL / 1000}秒`
        })
        isFallbackToPolling = true
        isRealtimeMode = false
        startSessionCheck()
      } else if (!currentMonitorUserId) {
        logger.debug('WebSocket 断开但无用户ID，不启动轮询')
      }
      break

    case 'connecting':
    case 'reconnecting':
      // 正在连接或重连，记录日志
      logger.debug('🔄 WebSocket 正在连接/重连...', { status })
      break
  }
}

/**
 * 启动实时会话监听
 * 优先使用 WebSocket 实时监听，失败时自动降级到轮询
 *
 * 边界情况处理：
 * - 用户ID为空：记录错误并返回
 * - 本地没有会话令牌：降级到轮询模式
 * - 重复启动：检查是否需要重新启动
 * - WebSocket 连接超时：自动降级到轮询
 *
 * @param userId - 用户ID
 * @requirements 2.1, 2.4, 4.1, 4.4
 */
export function startRealtimeMonitor(userId: string): void {
  // 边界情况1：用户ID为空
  if (!userId) {
    logger.error('启动实时监听失败：用户ID为空（用户可能未登录）')
    return
  }

  // 边界情况2：重复启动同一用户的监听
  if (currentMonitorUserId === userId && isRealtimeMonitorActive()) {
    logger.info('实时监听已在运行，无需重复启动', { userId })
    return
  }

  // 获取本地会话令牌
  const localToken = getStoredSessionToken()

  // 边界情况3：本地没有会话令牌
  if (!localToken) {
    logger.warn('⚠️ 启动实时监听失败：本地没有会话令牌，降级到轮询模式', { userId })
    currentMonitorUserId = userId
    isFallbackToPolling = true
    startSessionCheck()
    return
  }

  // 保存当前用户ID
  currentMonitorUserId = userId

  logger.info('🚀 启动实时会话监听', {
    userId,
    tokenPrefix: localToken.substring(0, 8),
    timeout: `${WEBSOCKET_CONNECT_TIMEOUT / 1000}秒`,
    timestamp: new Date().toISOString()
  })

  // 启动实时监听
  sessionRealtimeMonitor.start(
    userId,
    localToken,
    handleSessionInvalid,
    handleRealtimeConnectionStatusChange
  )

  // 设置连接超时检测
  // 如果在超时时间内没有连接成功，则降级到轮询
  setTimeout(() => {
    const status = sessionRealtimeMonitor.getConnectionStatus()
    if (status !== 'connected' && !isFallbackToPolling) {
      logger.warn('⏱️ WebSocket 连接超时，降级到轮询模式', {
        timeout: `${WEBSOCKET_CONNECT_TIMEOUT / 1000}秒`,
        currentStatus: status,
        userId: currentMonitorUserId
      })
      isFallbackToPolling = true
      isRealtimeMode = false
      startSessionCheck()
    }
  }, WEBSOCKET_CONNECT_TIMEOUT)
}

/**
 * 停止实时会话监听
 * 清理所有监听资源，包括 WebSocket 和轮询
 *
 * 边界情况处理：
 * - 监听器未运行：安全处理，记录日志
 * - 定时器已清理：安全处理
 *
 * @requirements 2.4, 4.4
 */
export function stopRealtimeMonitor(): void {
  logger.info('🛑 停止实时会话监听', {
    userId: currentMonitorUserId,
    mode: getMonitorMode(),
    isRealtimeMode,
    isFallbackToPolling,
    timestamp: new Date().toISOString()
  })

  // 停止实时监听
  sessionRealtimeMonitor.stop()

  // 停止轮询（如果有）
  stopSessionCheck()

  // 停止降级检测定时器
  if (fallbackCheckTimer) {
    clearInterval(fallbackCheckTimer)
    fallbackCheckTimer = null
    logger.debug('降级检测定时器已清理')
  }

  // 重置状态
  isRealtimeMode = false
  isFallbackToPolling = false
  currentMonitorUserId = null

  logger.info('✅ 实时会话监听已停止，所有资源已清理')
}

/**
 * 检查实时监听是否激活
 *
 * @returns 是否正在实时监听
 */
export function isRealtimeMonitorActive(): boolean {
  return sessionRealtimeMonitor.isMonitoring() || isFallbackToPolling
}

/**
 * 获取当前监听模式
 *
 * @returns 'realtime' | 'polling' | 'none'
 */
export function getMonitorMode(): 'realtime' | 'polling' | 'none' {
  if (sessionRealtimeMonitor.isMonitoring() && !isFallbackToPolling) {
    return 'realtime'
  }
  if (isFallbackToPolling || sessionCheckTimer) {
    return 'polling'
  }
  return 'none'
}

/**
 * 获取实时监听连接状态
 *
 * @returns 连接状态
 */
export function getRealtimeConnectionStatus(): RealtimeConnectionStatus {
  return sessionRealtimeMonitor.getConnectionStatus()
}
