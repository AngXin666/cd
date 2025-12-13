/**
 * 日志包装器
 * 为不同模块提供专用日志器和装饰器支持
 */

import {createLogger, type Logger} from './logger'

/**
 * 模块日志器接口
 */
export interface ModuleLogger {
  debug: (message: string, data?: unknown) => void
  info: (message: string, data?: unknown) => void
  warn: (message: string, data?: unknown) => void
  error: (message: string, error?: unknown, data?: unknown) => void
  performance: (operation: string, duration: number, data?: unknown) => void
}

/**
 * 为不同模块创建专用日志器
 * @param moduleName 模块名称
 * @returns 模块日志器实例
 */
export function createModuleLogger(moduleName: string): ModuleLogger {
  const logger: Logger = createLogger(moduleName)

  return {
    debug: (message: string, data?: unknown) => {
      logger.debug(message, data)
    },
    info: (message: string, data?: unknown) => {
      logger.info(message, data)
    },
    warn: (message: string, data?: unknown) => {
      logger.warn(message, data)
    },
    error: (message: string, error?: unknown, data?: unknown) => {
      logger.error(message, {error, ...(data && typeof data === 'object' ? data : {})})
    },
    performance: (operation: string, duration: number, data?: unknown) => {
      logger.performance(operation, duration, 'ms')
      if (data) {
        logger.debug(`${operation} 详情`, data)
      }
    }
  }
}

/**
 * 日志装饰器选项
 */
export interface LogMethodOptions {
  level?: 'debug' | 'info'
  includeArgs?: boolean
}

/**
 * 日志方法装饰器
 * 自动记录方法调用和错误
 * @param options 装饰器选项
 */
export function LogMethod(options: LogMethodOptions = {}) {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value
    const {level = 'debug', includeArgs = false} = options

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const logger = createModuleLogger(target.constructor.name)
      const logData = includeArgs ? {args} : undefined

      logger[level](`${propertyKey} 调用`, logData)

      try {
        const result = originalMethod.apply(this, args)

        if (result instanceof Promise) {
          return result.catch((error: unknown) => {
            logger.error(`${propertyKey} 失败`, error)
            throw error
          })
        }

        return result
      } catch (error) {
        logger.error(`${propertyKey} 失败`, error)
        throw error
      }
    }

    return descriptor
  }
}
