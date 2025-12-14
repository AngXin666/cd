/**
 * ErrorHandler 属性测试
 * 使用 fast-check 进行基于属性的测试
 *
 * **验证需求: 4.1, 4.2, 4.3, 4.4**
 */

import * as fc from 'fast-check'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {ErrorType, errorHandler} from './errorHandler'

// Mock toast 模块
vi.mock('./toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showInfo: vi.fn(),
  showWarning: vi.fn()
}))

// Mock Taro
vi.mock('@tarojs/taro', () => ({
  default: {
    reLaunch: vi.fn()
  }
}))

describe('ErrorHandler 属性测试', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('属性 2: 错误处理一致性', () => {
    it('属性: 所有错误类型都应被正确分类', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // API 错误
            fc.record({
              code: fc.integer({min: 400, max: 599}),
              message: fc.string()
            }),
            // 网络错误
            fc.record({
              errMsg: fc.string(),
              statusCode: fc.integer({min: 500, max: 599})
            }),
            // 认证错误
            fc.record({
              code: fc.constantFrom(401, 'PGRST301'),
              message: fc.string()
            }),
            // 标准 Error
            fc
              .string()
              .map((msg) => new Error(msg)),
            // 字符串错误
            fc.string()
          ),
          (error) => {
            const parsed = (errorHandler as any).parseError(error)

            // 验证返回的错误对象结构
            expect(parsed).toHaveProperty('type')
            expect(parsed).toHaveProperty('message')
            expect(parsed).toHaveProperty('originalError')

            // 验证类型是有效的 ErrorType
            expect(Object.values(ErrorType)).toContain(parsed.type)

            return true
          }
        ),
        {numRuns: 100}
      )
    })

    it('属性: 认证错误应始终被识别为 AUTH 类型', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant({code: 401, message: 'Unauthorized'}),
            fc.constant({code: 'PGRST301', message: 'JWT expired'}),
            fc.string().map((msg) => ({code: 401, message: msg}))
          ),
          (error) => {
            const parsed = (errorHandler as any).parseError(error)
            expect(parsed.type).toBe(ErrorType.AUTH)
            return true
          }
        ),
        {numRuns: 50}
      )
    })

    it('属性: 网络错误应被识别为 NETWORK 类型', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({min: 500, max: 599}).map((code) => ({
              code,
              message: 'Server error'
            })),
            fc.constant({errMsg: 'Network timeout', statusCode: 0})
          ),
          (error) => {
            const parsed = (errorHandler as any).parseError(error)
            expect(parsed.type).toBe(ErrorType.NETWORK)
            return true
          }
        ),
        {numRuns: 50}
      )
    })

    it('属性: 验证错误应被识别为 VALIDATION 类型', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(400, 422).map((code) => ({
            code,
            message: 'Validation failed'
          })),
          (error) => {
            const parsed = (errorHandler as any).parseError(error)
            expect(parsed.type).toBe(ErrorType.VALIDATION)
            return true
          }
        ),
        {numRuns: 50}
      )
    })

    it('属性: API 错误应被识别为 API 类型', () => {
      fc.assert(
        fc.property(
          fc.integer({min: 400, max: 499}).map((code) => ({
            code,
            message: 'API error'
          })),
          (error) => {
            // 排除特殊的认证和验证错误码
            if (error.code === 401 || error.code === 400 || error.code === 422) {
              return true
            }

            const parsed = (errorHandler as any).parseError(error)
            expect(parsed.type).toBe(ErrorType.API)
            return true
          }
        ),
        {numRuns: 50}
      )
    })

    it('属性: 错误消息应始终是字符串', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({code: fc.integer(), message: fc.string({minLength: 1})}),
            fc.string({minLength: 1}).map((msg) => new Error(msg)),
            fc.string({minLength: 1})
          ),
          (error) => {
            const parsed = (errorHandler as any).parseError(error)
            expect(typeof parsed.message).toBe('string')
            expect(parsed.message.length).toBeGreaterThan(0)
            return true
          }
        ),
        {numRuns: 100}
      )
    })

    it('属性: 原始错误应被保留', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({code: fc.integer(), message: fc.string()}),
            fc.string().map((msg) => new Error(msg)),
            fc.string()
          ),
          (error) => {
            const parsed = (errorHandler as any).parseError(error)
            expect(parsed.originalError).toBeDefined()
            return true
          }
        ),
        {numRuns: 100}
      )
    })

    it('属性: 用户消息应是友好的中文', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({code: fc.integer({min: 400, max: 599}), message: fc.string()}),
            fc.string().map((msg) => new Error(msg))
          ),
          (error) => {
            const parsed = (errorHandler as any).parseError(error)
            const userMessage = (errorHandler as any).getUserMessage(parsed)

            // 验证是字符串
            expect(typeof userMessage).toBe('string')
            // 验证不为空
            expect(userMessage.length).toBeGreaterThan(0)
            // 验证包含中文字符
            expect(/[\u4e00-\u9fa5]/.test(userMessage)).toBe(true)

            return true
          }
        ),
        {numRuns: 100}
      )
    })
  })

  describe('批量错误处理', () => {
    it('属性: 批量处理应处理所有错误', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              error: fc.oneof(
                fc.string().map((msg) => new Error(msg)),
                fc.string()
              ),
              context: fc.option(
                fc.record({
                  component: fc.string(),
                  action: fc.string()
                }),
                {nil: undefined}
              )
            }),
            {minLength: 1, maxLength: 10}
          ),
          (errors) => {
            // 不应抛出错误
            expect(() => {
              errorHandler.handleBatch(errors)
            }).not.toThrow()

            return true
          }
        ),
        {numRuns: 50}
      )
    })
  })

  describe('边界情况', () => {
    it('应处理 null 错误', () => {
      const parsed = (errorHandler as any).parseError(null)
      expect(parsed.type).toBe(ErrorType.UNKNOWN)
      expect(parsed.message).toBe('未知错误')
    })

    it('应处理 undefined 错误', () => {
      const parsed = (errorHandler as any).parseError(undefined)
      expect(parsed.type).toBe(ErrorType.UNKNOWN)
      expect(parsed.message).toBe('未知错误')
    })

    it('应处理空字符串错误', () => {
      const parsed = (errorHandler as any).parseError('')
      expect(parsed.type).toBe(ErrorType.UNKNOWN)
      expect(parsed.message).toBe('')
    })

    it('应处理复杂嵌套错误对象', () => {
      const complexError = {
        code: 500,
        message: 'Server error',
        details: {
          nested: {
            deep: {
              value: 'error details'
            }
          }
        }
      }

      const parsed = (errorHandler as any).parseError(complexError)
      expect(parsed.type).toBe(ErrorType.NETWORK)
      expect(parsed.message).toBe('Server error')
    })

    it('应处理包含特殊字符的错误消息', () => {
      const specialMessages = [
        'Error: 错误信息',
        'Error with emoji 😀',
        'Error\nwith\nnewlines',
        'Error\twith\ttabs',
        'Error with "quotes"',
        "Error with 'single quotes'"
      ]

      for (const message of specialMessages) {
        const parsed = (errorHandler as any).parseError(new Error(message))
        expect(parsed.message).toBe(message)
      }
    })
  })

  describe('错误类型判断', () => {
    it('应正确识别 JWT 相关的认证错误', () => {
      const jwtErrors = [{message: 'JWT expired'}, {message: 'Invalid JWT token'}, {message: 'JWT verification failed'}]

      for (const error of jwtErrors) {
        const type = (errorHandler as any).getErrorType(error)
        expect(type).toBe(ErrorType.AUTH)
      }
    })

    it('应正确识别超时错误', () => {
      const timeoutErrors = [
        {message: 'Request timeout'},
        {message: 'Connection timeout'},
        {message: 'timeout exceeded'}
      ]

      for (const error of timeoutErrors) {
        const type = (errorHandler as any).getErrorType(error)
        expect(type).toBe(ErrorType.NETWORK)
      }
    })

    it('应正确识别验证错误', () => {
      const validationErrors = [
        {code: 400, message: 'Bad request'},
        {code: 422, message: 'Unprocessable entity'},
        {message: 'validation failed'}
      ]

      for (const error of validationErrors) {
        const type = (errorHandler as any).getErrorType(error)
        expect(type).toBe(ErrorType.VALIDATION)
      }
    })
  })
})
