/**
 * API 类型单元测试
 * 验证 API 相关类型的正确性
 */

import {describe, it, expect} from 'vitest'
import type {ApiResponse, ApiError, PaginationParams, PaginationResponse} from './api'

describe('API 类型', () => {
  describe('ApiResponse', () => {
    it('应正确表示成功响应', () => {
      const response: ApiResponse<{id: string}> = {
        data: {id: '123'},
        error: null,
        success: true,
        message: '操作成功'
      }
      expect(response.success).toBe(true)
      expect(response.data?.id).toBe('123')
      expect(response.error).toBeNull()
    })

    it('应正确表示错误响应', () => {
      const response: ApiResponse<{id: string}> = {
        data: null,
        error: {
          code: 400,
          message: '请求错误'
        },
        success: false
      }
      expect(response.success).toBe(false)
      expect(response.data).toBeNull()
      expect(response.error?.code).toBe(400)
    })
  })

  describe('ApiError', () => {
    it('应包含必需字段', () => {
      const error: ApiError = {
        code: 500,
        message: '服务器错误'
      }
      expect(error.code).toBe(500)
      expect(error.message).toBe('服务器错误')
    })

    it('应支持可选字段', () => {
      const error: ApiError = {
        code: 'VALIDATION_ERROR',
        message: '验证失败',
        details: {field: 'email', reason: 'invalid'},
        statusCode: 422
      }
      expect(error.details?.field).toBe('email')
      expect(error.statusCode).toBe(422)
    })
  })

  describe('PaginationParams', () => {
    it('应包含基本分页参数', () => {
      const params: PaginationParams = {
        page: 1,
        pageSize: 20
      }
      expect(params.page).toBe(1)
      expect(params.pageSize).toBe(20)
    })

    it('应支持排序参数', () => {
      const params: PaginationParams = {
        page: 1,
        pageSize: 20,
        sortBy: 'created_at',
        sortOrder: 'desc'
      }
      expect(params.sortBy).toBe('created_at')
      expect(params.sortOrder).toBe('desc')
    })
  })

  describe('PaginationResponse', () => {
    it('应包含完整的分页信息', () => {
      const response: PaginationResponse<{id: string}> = {
        items: [{id: '1'}, {id: '2'}],
        total: 100,
        page: 1,
        pageSize: 20,
        totalPages: 5,
        hasNext: true,
        hasPrev: false
      }
      expect(response.items).toHaveLength(2)
      expect(response.totalPages).toBe(5)
      expect(response.hasNext).toBe(true)
      expect(response.hasPrev).toBe(false)
    })
  })
})
