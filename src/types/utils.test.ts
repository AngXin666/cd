/**
 * 通用工具类型单元测试
 * 验证类型推断和约束是否正确
 */

import {describe, it, expect} from 'vitest'
import type {
  StorageValue,
  AsyncResult,
  PaginatedData,
  VoidCallback,
  ErrorCallback,
  DataCallback
} from './utils'

describe('通用工具类型', () => {
  describe('StorageValue', () => {
    it('应接受字符串类型', () => {
      const value: StorageValue = 'test'
      expect(typeof value).toBe('string')
    })

    it('应接受数字类型', () => {
      const value: StorageValue = 123
      expect(typeof value).toBe('number')
    })

    it('应接受布尔类型', () => {
      const value: StorageValue = true
      expect(typeof value).toBe('boolean')
    })

    it('应接受对象类型', () => {
      const value: StorageValue = {key: 'value'}
      expect(typeof value).toBe('object')
    })

    it('应接受 null', () => {
      const value: StorageValue = null
      expect(value).toBeNull()
    })
  })

  describe('AsyncResult', () => {
    it('应正确表示成功结果', () => {
      const result: AsyncResult<string> = {
        data: 'success',
        success: true
      }
      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.error).toBeUndefined()
    })

    it('应正确表示失败结果', () => {
      const error = new Error('test error')
      const result: AsyncResult<string> = {
        error,
        success: false
      }
      expect(result.success).toBe(false)
      expect(result.error).toBe(error)
      expect(result.data).toBeUndefined()
    })

    it('应支持自定义错误类型', () => {
      interface CustomError {
        code: number
        message: string
      }
      const result: AsyncResult<string, CustomError> = {
        error: {code: 404, message: 'Not found'},
        success: false
      }
      expect(result.error?.code).toBe(404)
    })
  })

  describe('PaginatedData', () => {
    it('应正确表示分页数据', () => {
      const data: PaginatedData<string> = {
        items: ['item1', 'item2', 'item3'],
        total: 100,
        page: 1,
        pageSize: 10,
        hasMore: true
      }
      expect(data.items).toHaveLength(3)
      expect(data.total).toBe(100)
      expect(data.hasMore).toBe(true)
    })

    it('应支持泛型类型', () => {
      interface User {
        id: string
        name: string
      }
      const data: PaginatedData<User> = {
        items: [{id: '1', name: 'Test'}],
        total: 1,
        page: 1,
        pageSize: 10,
        hasMore: false
      }
      expect(data.items[0].name).toBe('Test')
    })
  })

  describe('回调函数类型', () => {
    it('VoidCallback 应不接受参数不返回值', () => {
      const callback: VoidCallback = () => {
        // 无操作
      }
      expect(callback()).toBeUndefined()
    })

    it('ErrorCallback 应接受 Error 参数', () => {
      const callback: ErrorCallback = (error: Error) => {
        expect(error).toBeInstanceOf(Error)
      }
      callback(new Error('test'))
    })

    it('DataCallback 应接受泛型数据参数', () => {
      const callback: DataCallback<string> = (data: string) => {
        expect(typeof data).toBe('string')
      }
      callback('test')
    })
  })
})
