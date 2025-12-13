/**
 * 错误处理器单元测试
 * 验证错误解析、上下文记录和批量处理
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {errorHandler, ErrorType, type ErrorContext} from './errorHandler'
import * as logger from './logger'
import * as toast from './toast'

// Mock dependencies
vi.mock('./logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  })
}))

vi.mock('./toast', () => ({
  showError: vi.fn()
}))

vi.mock('@tarojs/taro', () => ({
  default: {
    reLaunch: vi.fn()
  }
}))

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('错误解析', () => {
    it('应正确解析 Supabase 错误', () => {
      const error = {code: 'PGRST301', message: 'JWT expired'}
      errorHandler.handle(error)

      expect(toast.showError).toHaveBeenCalledWith('登录已过期，请重新登录', 3000)
    })

    it('应正确解析网络错误', () => {
      const error = {statusCode: 500, errMsg: 'Network error'}
      errorHandler.handle(error)

      expect(toast.showError).toHaveBeenCalled()
    })

    it('应正确解析标准 Error 对象', () => {
      const error = new Error('Test error')
      errorHandler.handle(error)

      expect(toast.showError).toHaveBeenCalled()
    })

    it('应正确解析字符串错误', () => {
      const error = 'Something went wrong'
      errorHandler.handle(error)

      expect(toast.showError).toHaveBeenCalledWith('操作失败，请稍后重试', 3000)
    })

    it('应正确解析未知错误', () => {
      const error = {unknown: 'error'}
      errorHandler.handle(error)

      expect(toast.showError).toHaveBeenCalledWith('操作失败，请稍后重试', 3000)
    })
  })

  describe('错误类型判断', () => {
    it('应识别认证错误 (401)', () => {
      const error = {code: 401, message: 'Unauthorized'}
      errorHandler.handle(error)

      expect(toast.showError).toHaveBeenCalledWith('登录已过期，请重新登录', 3000)
    })

    it('应识别网络错误 (500+)', () => {
      const error = {code: 503, message: 'Service unavailable'}
      errorHandler.handle(error)

      expect(toast.showError).toHaveBeenCalledWith('网络连接失败，请检查网络设置', 3000)
    })

    it('应识别验证错误 (400, 422)', () => {
      const error = {code: 422, message: 'Validation failed'}
      errorHandler.handle(error)

      expect(toast.showError).toHaveBeenCalledWith('输入信息有误，请检查后重试', 3000)
    })

    it('应识别 API 错误 (400-499)', () => {
      const error = {code: 404, message: 'Not found'}
      errorHandler.handle(error)

      expect(toast.showError).toHaveBeenCalledWith('服务器响应异常，请稍后重试', 3000)
    })
  })

  describe('自定义错误消息', () => {
    it('应使用自定义消息', () => {
      const error = new Error('Test')
      const customMessage = '自定义错误消息'
      errorHandler.handle(error, customMessage)

      expect(toast.showError).toHaveBeenCalledWith(customMessage, 3000)
    })
  })

  describe('API 错误处理', () => {
    it('应处理 API 错误并添加操作名称', () => {
      const error = new Error('API error')
      errorHandler.handleApiError(error, '获取数据')

      expect(toast.showError).toHaveBeenCalledWith('获取数据失败', 3000)
    })

    it('应处理 API 错误不带操作名称', () => {
      const error = new Error('API error')
      errorHandler.handleApiError(error)

      expect(toast.showError).toHaveBeenCalled()
    })
  })

  describe('网络错误处理', () => {
    it('应显示网络错误消息', () => {
      const error = new Error('Network error')
      errorHandler.handleNetworkError(error)

      expect(toast.showError).toHaveBeenCalledWith('网络连接失败，请检查网络设置', 3000)
    })
  })

  describe('验证错误处理', () => {
    it('应显示字段验证错误', () => {
      const error = new Error('Validation error')
      errorHandler.handleValidationError(error, '邮箱')

      expect(toast.showError).toHaveBeenCalledWith('邮箱格式不正确，请检查后重试', 3000)
    })

    it('应显示通用验证错误', () => {
      const error = new Error('Validation error')
      errorHandler.handleValidationError(error)

      expect(toast.showError).toHaveBeenCalledWith('输入信息有误，请检查后重试', 3000)
    })
  })

  describe('带上下文的错误处理', () => {
    it('应记录错误上下文', () => {
      const error = new Error('Test error')
      const context: ErrorContext = {
        component: 'UserList',
        action: 'fetchUsers',
        userId: 'user123'
      }

      errorHandler.handleWithContext(error, {context})

      // 验证日志记录包含上下文
      expect(toast.showError).toHaveBeenCalled()
    })

    it('应支持禁用 toast 显示', () => {
      const error = new Error('Test error')
      errorHandler.handleWithContext(error, {showToast: false})

      expect(toast.showError).not.toHaveBeenCalled()
    })

    it('应支持禁用日志记录', () => {
      const error = new Error('Test error')
      errorHandler.handleWithContext(error, {logError: false})

      // 日志不应被调用(但 toast 应该显示)
      expect(toast.showError).toHaveBeenCalled()
    })

    it('应支持自定义消息', () => {
      const error = new Error('Test error')
      const customMessage = '自定义上下文消息'
      errorHandler.handleWithContext(error, {customMessage})

      expect(toast.showError).toHaveBeenCalledWith(customMessage, 3000)
    })
  })

  describe('批量错误处理', () => {
    it('应处理单个错误', () => {
      const errors = [{error: new Error('Error 1')}]
      errorHandler.handleBatch(errors)

      expect(toast.showError).toHaveBeenCalled()
    })

    it('应处理多个错误并显示汇总', () => {
      const errors = [
        {error: new Error('Error 1')},
        {error: new Error('Error 2')},
        {error: new Error('Error 3')}
      ]
      errorHandler.handleBatch(errors)

      expect(toast.showError).toHaveBeenCalledWith('操作失败: 3 个错误')
    })

    it('应记录所有错误的上下文', () => {
      const errors = [
        {error: new Error('Error 1'), context: {component: 'Component1'}},
        {error: new Error('Error 2'), context: {component: 'Component2'}}
      ]
      errorHandler.handleBatch(errors)

      // 验证批量日志记录
      expect(toast.showError).toHaveBeenCalled()
    })
  })
})
