/**
 * 日志工具
 * 提供统一的日志记录功能，包含时间戳、用户标识、模块信息等
 */

// 日志级别
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

// 日志颜色配置（备用）
// const _LOG_COLORS = {
//   [LogLevel.DEBUG]: '#6B7280', // 灰色
//   [LogLevel.INFO]: '#3B82F6', // 蓝色
//   [LogLevel.WARN]: '#F59E0B', // 橙色
//   [LogLevel.ERROR]: '#EF4444' // 红色
// }

// 日志图标
const LOG_ICONS = {
  [LogLevel.DEBUG]: '🔍',
  [LogLevel.INFO]: 'ℹ️',
  [LogLevel.WARN]: '⚠️',
  [LogLevel.ERROR]: '❌'
}

// 日志配置
interface LoggerConfig {
  enabled: boolean // 是否启用日志
  minLevel: LogLevel // 最小日志级别
  showTimestamp: boolean // 是否显示时间戳
  showUserId: boolean // 是否显示用户ID
  showModule: boolean // 是否显示模块名
}

// 默认配置
const defaultConfig: LoggerConfig = {
  enabled: true,
  minLevel: LogLevel.DEBUG,
  showTimestamp: true,
  showUserId: true,
  showModule: true
}

// 当前配置
let currentConfig: LoggerConfig = {...defaultConfig}

// 当前用户ID（需要在登录后设置）
let currentUserId: string | null = null

/**
 * 设置日志配置
 */
export function setLoggerConfig(config: Partial<LoggerConfig>) {
  currentConfig = {...currentConfig, ...config}
}

/**
 * 设置当前用户ID
 */
export function setCurrentUserId(userId: string | null) {
  currentUserId = userId
}

/**
 * 获取格式化的时间戳
 */
function getTimestamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const ms = String(now.getMilliseconds()).padStart(3, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`
}

/**
 * 判断是否应该记录该级别的日志
 */
function shouldLog(level: LogLevel): boolean {
  if (!currentConfig.enabled) return false

  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
  const currentLevelIndex = levels.indexOf(currentConfig.minLevel)
  const logLevelIndex = levels.indexOf(level)

  return logLevelIndex >= currentLevelIndex
}

/**
 * 格式化日志消息
 */
function formatMessage(level: LogLevel, module: string, message: string, _data?: any): string {
  const parts: string[] = []

  // 添加图标
  parts.push(LOG_ICONS[level])

  // 添加时间戳
  if (currentConfig.showTimestamp) {
    parts.push(`[${getTimestamp()}]`)
  }

  // 添加日志级别
  parts.push(`[${level}]`)

  // 添加模块名
  if (currentConfig.showModule && module) {
    parts.push(`[${module}]`)
  }

  // 添加用户ID
  if (currentConfig.showUserId && currentUserId) {
    parts.push(`[User:${currentUserId.substring(0, 8)}]`)
  }

  // 添加消息
  parts.push(message)

  return parts.join(' ')
}

/**
 * 记录日志的核心函数
 */
function log(level: LogLevel, module: string, message: string, data?: any) {
  if (!shouldLog(level)) return

  const formattedMessage = formatMessage(level, module, message, data)

  // 根据日志级别选择console方法
  switch (level) {
    case LogLevel.DEBUG:
      break
    case LogLevel.INFO:
      break
    case LogLevel.WARN:
      break
    case LogLevel.ERROR:
      console.error(formattedMessage, data || '')
      break
  }

  // 如果有数据对象，单独打印（仅错误时）
  if (level === LogLevel.ERROR && data !== undefined && data !== null) {
  }
}

/**
 * Logger类 - 提供模块化的日志记录
 */
export class Logger {
  private module: string

  constructor(module: string) {
    this.module = module
  }

  /**
   * DEBUG级别日志 - 用于调试信息
   */
  debug(message: string, data?: any) {
    log(LogLevel.DEBUG, this.module, message, data)
  }

  /**
   * INFO级别日志 - 用于一般信息
   */
  info(message: string, data?: any) {
    log(LogLevel.INFO, this.module, message, data)
  }

  /**
   * WARN级别日志 - 用于警告信息
   */
  warn(message: string, data?: any) {
    log(LogLevel.WARN, this.module, message, data)
  }

  /**
   * ERROR级别日志 - 用于错误信息
   */
  error(message: string, error?: any) {
    // 如果是Error对象，提取堆栈信息
    if (error instanceof Error) {
      const errorInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
      log(LogLevel.ERROR, this.module, message, errorInfo)
    } else {
      log(LogLevel.ERROR, this.module, message, error)
    }
  }

  /**
   * 记录API调用
   */
  api(method: string, endpoint: string, params?: any, response?: any) {
    this.info(`API调用: ${method} ${endpoint}`, {params, response})
  }

  /**
   * 记录数据库操作
   */
  db(operation: string, table: string, data?: any) {
    this.debug(`数据库操作: ${operation} ${table}`, data)
  }

  /**
   * 记录用户操作
   */
  userAction(action: string, details?: any) {
    this.info(`用户操作: ${action}`, details)
  }

  /**
   * 记录页面访问
   */
  pageView(pageName: string, params?: any) {
    this.info(`页面访问: ${pageName}`, params)
  }

  /**
   * 记录性能指标
   */
  performance(metric: string, value: number, unit: string = 'ms') {
    this.debug(`性能指标: ${metric} = ${value}${unit}`)
  }
}

/**
 * 创建Logger实例
 */
export function createLogger(module: string): Logger {
  return new Logger(module)
}

/**
 * 全局错误处理
 */
export function setupGlobalErrorHandler() {
  // 捕获未处理的Promise rejection
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const logger = createLogger('GlobalErrorHandler')
      logger.error('未处理的Promise rejection', {
        reason: event.reason,
        promise: event.promise
      })
    })
  }
}

/**
 * 性能监控装饰器
 */
export function measurePerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value

  descriptor.value = async function (...args: any[]) {
    const logger = createLogger(target.constructor.name)
    const startTime = Date.now()

    try {
      const result = await originalMethod.apply(this, args)
      const duration = Date.now() - startTime
      logger.performance(`${propertyKey}`, duration)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error(`${propertyKey} 执行失败 (耗时: ${duration}ms)`, error)
      throw error
    }
  }

  return descriptor
}

/**
 * 导出默认logger实例
 */
export const logger = createLogger('App')
