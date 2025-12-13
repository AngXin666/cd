/**
 * 日志包装器单元测试
 * Feature: 日志系统标准化
 * Property 3: 日志记录完整性
 * Validates: 需求 3.1, 3.2, 3.3, 3.5
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import {createModuleLogger, LogMethod} from './loggerWrapper'
import * as loggerModule from './logger'

// Mock logger module
vi.mock('./logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    performance: vi.fn()
  }))
}))

describe('loggerWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createModuleLogger', () => {
    it('应创建模块日志器实例', () => {
      // Feature: 日志系统标准化
      // Property 3: 日志记录完整性
      // Validates: 需求 3.1
      const logger = createModuleLogger('TestModule')

      expect(logger).toBeDefined()
      expect(logger.debug).toBeInstanceOf(Function)
      expect(logger.info).toBeInstanceOf(Function)
      expect(logger.warn).toBeInstanceOf(Function)
      expect(logger.error).toBeInstanceOf(Function)
      expect(logger.performance).toBeInstanceOf(Function)
    })

    it('应正确调用底层 logger.debug', () => {
      // Feature: 日志系统标准化
      // Property 3: 日志记录完整性
      // Validates: 需求 3.2
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        performance: vi.fn()
      }
      vi.mocked(loggerModule.createLogger).mockReturnValue(mockLogger as unknown as loggerModule.Logger)

      const logger = createModuleLogger('TestModule')
      logger.debug('测试消息', {key: 'value'})

      expect(mockLogger.debug).toHaveBeenCalledWith('测试消息', {key: 'value'})
    })

    it('应正确调用底层 logger.info', () => {
      // Feature: 日志系统标准化
      // Property 3: 日志记录完整性
      // Validates: 需求 3.2
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        performance: vi.fn()
      }
      vi.mocked(loggerModule.createLogger).mockReturnValue(mockLogger as unknown as loggerModule.Logger)

      const logger = createModuleLogger('TestModule')
      logger.info('信息消息')

      expect(mockLogger.info).toHaveBeenCalledWith('信息消息', undefined)
    })

    it('应正确调用底层 logger.warn', () => {
      // Feature: 日志系统标准化
      // Property 3: 日志记录完整性
      // Validates: 需求 3.2
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        performance: vi.fn()
      }
      vi.mocked(loggerModule.createLogger).mockReturnValue(mockLogger as unknown as loggerModule.Logger)

      const logger = createModuleLogger('TestModule')
      logger.warn('警告消息', {warning: true})

      expect(mockLogger.warn).toHaveBeenCalledWith('警告消息', {warning: true})
    })

    it('应正确调用底层 logger.error 并合并数据', () => {
      // Feature: 日志系统标准化
      // Property 3: 日志记录完整性
      // Validates: 需求 3.2, 3.3
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        performance: vi.fn()
      }
      vi.mocked(loggerModule.createLogger).mockReturnValue(mockLogger as unknown as loggerModule.Logger)

      const logger = createModuleLogger('TestModule')
      const error = new Error('测试错误')
      logger.error('错误消息', error, {context: 'test'})

      expect(mockLogger.error).toHaveBeenCalledWith('错误消息', {
        error,
        context: 'test'
      })
    })

    it('应正确调用底层 logger.performance', () => {
      // Feature: 日志系统标准化
      // Property 3: 日志记录完整性
      // Validates: 需求 3.3
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        performance: vi.fn()
      }
      vi.mocked(loggerModule.createLogger).mockReturnValue(mockLogger as unknown as loggerModule.Logger)

      const logger = createModuleLogger('TestModule')
      logger.performance('操作名称', 150)

      expect(mockLogger.performance).toHaveBeenCalledWith('操作名称', 150, 'ms')
    })

    it('应在 performance 调用时记录额外数据', () => {
      // Feature: 日志系统标准化
      // Property 3: 日志记录完整性
      // Validates: 需求 3.3
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        performance: vi.fn()
      }
      vi.mocked(loggerModule.createLogger).mockReturnValue(mockLogger as unknown as loggerModule.Logger)

      const logger = createModuleLogger('TestModule')
      logger.performance('操作名称', 150, {detail: 'extra'})

      expect(mockLogger.performance).toHaveBeenCalledWith('操作名称', 150, 'ms')
      expect(mockLogger.debug).toHaveBeenCalledWith('操作名称 详情', {detail: 'extra'})
    })
  })

  describe('LogMethod 装饰器', () => {
    it('应记录方法调用（debug级别）', () => {
      // Feature: 日志系统标准化
      // Property 3: 日志记录完整性
      // Validates: 需求 3.5
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        performance: vi.fn()
      }
      vi.mocked(loggerModule.createLogger).mockReturnValue(mockLogger as unknown as loggerModule.Logger)

      class TestClass {
        @LogMethod()
        testMethod() {
          return 'success'
        }
      }

      const instance = new TestClass()
      const result = instance.testMethod()

      expect(result).toBe('success')
      expect(mockLogger.debug).toHaveBeenCalledWith('testMethod 调用', undefined)
    })

    it('应记录方法调用（info级别）', () => {
      // Feature: 日志系统标准化
      // Property 3: 日志记录完整性
      // Validates: 需求 3.5
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        performance: vi.fn()
      }
      vi.mocked(loggerModule.createLogger).mockReturnValue(mockLogger as unknown as loggerModule.Logger)

      class TestClass {
        @LogMethod({level: 'info'})
        testMethod() {
          return 'success'
        }
      }

      const instance = new TestClass()
      instance.testMethod()

      expect(mockLogger.info).toHaveBeenCalledWith('testMethod 调用', undefined)
    })

    it('应记录方法参数（当 includeArgs 为 true）', () => {
      // Feature: 日志系统标准化
      // Property 3: 日志记录完整性
      // Validates: 需求 3.3, 3.5
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        performance: vi.fn()
      }
      vi.mocked(loggerModule.createLogger).mockReturnValue(mockLogger as unknown as loggerModule.Logger)

      class TestClass {
        @LogMethod({includeArgs: true})
        testMethod(arg1: string, arg2: number) {
          return `${arg1}-${arg2}`
        }
      }

      const instance = new TestClass()
      instance.testMethod('test', 123)

      expect(mockLogger.debug).toHaveBeenCalledWith('testMethod 调用', {
        args: ['test', 123]
      })
    })

    it('应捕获并记录同步方法错误', () => {
      // Feature: 日志系统标准化
      // Property 3: 日志记录完整性
      // Validates: 需求 3.2, 3.5
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        performance: vi.fn()
      }
      vi.mocked(loggerModule.createLogger).mockReturnValue(mockLogger as unknown as loggerModule.Logger)

      class TestClass {
        @LogMethod()
        testMethod() {
          throw new Error('测试错误')
        }
      }

      const instance = new TestClass()

      expect(() => instance.testMethod()).toThrow('测试错误')
      expect(mockLogger.error).toHaveBeenCalledWith('testMethod 失败', {
        error: expect.any(Error)
      })
    })

    it('应捕获并记录异步方法错误', async () => {
      // Feature: 日志系统标准化
      // Property 3: 日志记录完整性
      // Validates: 需求 3.2, 3.5
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        performance: vi.fn()
      }
      vi.mocked(loggerModule.createLogger).mockReturnValue(mockLogger as unknown as loggerModule.Logger)

      class TestClass {
        @LogMethod()
        async testMethod() {
          throw new Error('异步错误')
        }
      }

      const instance = new TestClass()

      await expect(instance.testMethod()).rejects.toThrow('异步错误')
      expect(mockLogger.error).toHaveBeenCalledWith('testMethod 失败', {
        error: expect.any(Error)
      })
    })

    it('应正确处理异步方法的成功返回', async () => {
      // Feature: 日志系统标准化
      // Property 3: 日志记录完整性
      // Validates: 需求 3.5
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        performance: vi.fn()
      }
      vi.mocked(loggerModule.createLogger).mockReturnValue(mockLogger as unknown as loggerModule.Logger)

      class TestClass {
        @LogMethod()
        async testMethod() {
          return 'async success'
        }
      }

      const instance = new TestClass()
      const result = await instance.testMethod()

      expect(result).toBe('async success')
      expect(mockLogger.debug).toHaveBeenCalledWith('testMethod 调用', undefined)
    })

    it('应使用类名作为模块名', () => {
      // Feature: 日志系统标准化
      // Property 3: 日志记录完整性
      // Validates: 需求 3.1, 3.5
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        performance: vi.fn()
      }
      vi.mocked(loggerModule.createLogger).mockReturnValue(mockLogger as unknown as loggerModule.Logger)

      class MyCustomClass {
        @LogMethod()
        myMethod() {
          return 'test'
        }
      }

      const instance = new MyCustomClass()
      instance.myMethod()

      expect(loggerModule.createLogger).toHaveBeenCalledWith('MyCustomClass')
    })
  })
})
