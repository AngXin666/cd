/**
 * 统一错误处理工具
 * 提供友好的错误提示和错误追踪
 */

import Taro from '@tarojs/taro'
import {createLogger} from './logger'
import {showError} from './toast'

const logger = createLogger('ErrorHandler')

/**
 * 错误类型
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN'
}

/**
 * 错误信息接口
 */
export interface AppError {
  type: ErrorType
  message: string
  originalError?: unknown
  code?: string | number
  details?: Record<string, unknown>
}

/**
 * 错误消息映射
 */
const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.NETWORK]: '网络连接失败，请检查网络设置',
  [ErrorType.API]: '服务器响应异常，请稍后重试',
  [ErrorType.AUTH]: '登录已过期，请重新登录',
  [ErrorType.VALIDATION]: '输入信息有误，请检查后重试',
  [ErrorType.UNKNOWN]: '操作失败，请稍后重试'
}

/**
 * 错误处理器类
 */
class ErrorHandler {
  /**
   * 处理错误并显示友好提示
   */
  handle(error: unknown, customMessage?: string): void {
    const appError = this.parseError(error)

    // 记录错误日志
    logger.error('应用错误', {
      type: appError.type,
      message: appError.message,
      code: appError.code,
      details: appError.details,
      originalError: appError.originalError
    })

    // 显示用户友好的错误提示
    const userMessage = customMessage || this.getUserMessage(appError)
    this.showToast(userMessage)
  }

  /**
   * 解析错误对象
   */
  private parseError(error: unknown): AppError {
    // Supabase 错误
    if (typeof error === 'object' && error !== null && 'message' in error && 'code' in error) {
      return {
        type: this.getErrorType(error),
        message: error.message,
        code: error.code,
        originalError: error
      }
    }

    // 网络错误
    if (error?.errMsg || error?.statusCode) {
      return {
        type: ErrorType.NETWORK,
        message: error.errMsg || '网络请求失败',
        code: error.statusCode,
        originalError: error
      }
    }

    // 标准 Error 对象
    if (error instanceof Error) {
      return {
        type: ErrorType.UNKNOWN,
        message: error.message,
        originalError: error
      }
    }

    // 字符串错误
    if (typeof error === 'string') {
      return {
        type: ErrorType.UNKNOWN,
        message: error,
        originalError: error
      }
    }

    // 未知错误
    return {
      type: ErrorType.UNKNOWN,
      message: '未知错误',
      originalError: error
    }
  }

  /**
   * 根据错误判断错误类型
   */
  private getErrorType(error: unknown): ErrorType {
    const code =
      (typeof error === 'object' && error !== null && ('code' in error ? error.code : 'statusCode' in error ? error.statusCode : undefined)) ||
      undefined

    // 认证错误
    if (code === 401 || code === 'PGRST301' || error.message?.includes('JWT')) {
      return ErrorType.AUTH
    }

    // 网络错误
    if (code >= 500 || error.message?.includes('network') || error.message?.includes('timeout')) {
      return ErrorType.NETWORK
    }

    // 验证错误
    if (code === 400 || code === 422 || error.message?.includes('validation')) {
      return ErrorType.VALIDATION
    }

    // API 错误
    if (code >= 400 && code < 500) {
      return ErrorType.API
    }

    return ErrorType.UNKNOWN
  }

  /**
   * 获取用户友好的错误消息
   */
  private getUserMessage(error: AppError): string {
    // 特殊错误消息处理
    if (error.type === ErrorType.AUTH) {
      return ERROR_MESSAGES[ErrorType.AUTH]
    }

    // 使用默认消息
    return ERROR_MESSAGES[error.type] || ERROR_MESSAGES[ErrorType.UNKNOWN]
  }

  /**
   * 显示错误提示
   */
  private showToast(message: string): void {
    showError(message, 3000)
  }

  /**
   * 处理 API 错误
   */
  handleApiError(error: unknown, operation?: string): void {
    const message = operation ? `${operation}失败` : undefined
    this.handle(error, message)
  }

  /**
   * 处理网络错误
   */
  handleNetworkError(error: unknown): void {
    this.handle(error, '网络连接失败，请检查网络设置')
  }

  /**
   * 处理认证错误
   */
  handleAuthError(error: unknown): void {
    this.handle(error, '登录已过期，请重新登录')

    // 跳转到登录页
    setTimeout(() => {
      Taro.reLaunch({url: '/pages/login/index'})
    }, 1500)
  }

  /**
   * 处理验证错误
   */
  handleValidationError(error: unknown, fieldName?: string): void {
    const message = fieldName ? `${fieldName}格式不正确，请检查后重试` : '输入信息有误，请检查后重试'
    this.handle(error, message)
  }
}

// 导出单例
export const errorHandler = new ErrorHandler()

/**
 * 包装异步函数，自动处理错误
 */
export function withErrorHandler<T extends (...args: unknown[]) => Promise<unknown>>(fn: T, customMessage?: string): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      errorHandler.handle(error, customMessage)
      throw error
    }
  }) as T
}

/**
 * 装饰器：自动处理方法错误
 */
export function handleErrors(customMessage?: string) {
  return (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args)
      } catch (error) {
        errorHandler.handle(error, customMessage)
        throw error
      }
    }

    return descriptor
  }
}
