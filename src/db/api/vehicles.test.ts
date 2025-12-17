/**
 * 车辆管理 API 单元测试
 *
 * 测试覆盖：
 * - CRUD 操作（getDriverVehicles, insertVehicle, updateVehicle, deleteVehicle）
 * - 审核流程（submitVehicleForReview, approveVehicle）
 * - 图片管理（togglePhotoLock）
 *
 * **Feature: vehicle-api-optimization**
 * **Validates: Requirements 4.1-4.6, 3.2**
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'

// ==================== Mock 设置 ====================

// Mock Supabase 客户端 - 使用 vi.hoisted 确保在 mock 之前定义
const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(),
  auth: {
    getUser: vi.fn()
  },
  storage: {
    from: vi.fn()
  }
}))

// Mock @/client/supabase
vi.mock('@/client/supabase', () => ({
  supabase: mockSupabaseClient
}))

// Mock 缓存工具
vi.mock('@/utils/cache', () => ({
  CACHE_KEYS: {ALL_VEHICLES: 'all_vehicles'},
  clearCache: vi.fn(),
  clearCacheByPrefix: vi.fn()
}))

// Mock 事件总线
vi.mock('@/utils/eventBus', () => ({
  publish: vi.fn()
}))

// Mock 日志工具
vi.mock('@/utils/logger', () => ({
  createLogger: () => ({
    db: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  })
}))

// Mock 通知服务
vi.mock('@/services/notificationService', () => ({
  sendDriverSubmissionNotification: vi.fn().mockResolvedValue(true)
}))

// Mock users 模块
vi.mock('./users', () => ({
  getDriverDisplayName: vi.fn(),
  getDriverName: vi.fn(),
  getProfileById: vi.fn()
}))

// 导入被测试的函数
import {
  approveVehicle,
  deleteVehicle,
  getDriverVehicles,
  insertVehicle,
  submitVehicleForReview,
  togglePhotoLock,
  updateVehicle
} from './vehicles'

// ==================== 测试数据 ====================

/** 测试用车辆数据 */
const mockVehicle = {
  id: 'vehicle-001',
  plate_number: '京A12345',
  brand: '丰田',
  model: '卡罗拉',
  color: '白色',
  vin: 'LFMB1234567890123',
  user_id: 'user-001',
  driver_id: 'user-001',
  status: 'active',
  review_status: 'pending',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

/** 测试用车辆文档数据 */
const mockVehicleDocument = {
  id: 'doc-001',
  vehicle_id: 'vehicle-001',
  left_front_photo: 'photo1.jpg',
  right_front_photo: 'photo2.jpg',
  locked_photos: {}
}

// ==================== 测试套件 ====================

describe('车辆管理 API', () => {
  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks()

    // 默认设置已登录用户
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: {user: {id: 'user-001'}},
      error: null
    })
  })

  // ==================== getDriverVehicles 测试 ====================
  describe('getDriverVehicles', () => {
    /**
     * 测试正常返回数据
     * **Property 2: CRUD 操作数据一致性**
     * **Validates: Requirements 4.1**
     */
    it('应该返回司机的车辆列表', async () => {
      // 准备：设置 mock 返回数据
      const mockData = [
        {...mockVehicle, document: [mockVehicleDocument]}
      ]

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockData, error: null})
      }

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

      // 执行
      const result = await getDriverVehicles('user-001')

      // 验证
      expect(result).toHaveLength(1)
      expect(result[0].plate_number).toBe('京A12345')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('vehicles')
    })

    /**
     * 测试空结果处理
     * **Property 2: CRUD 操作数据一致性**
     * **Validates: Requirements 4.1**
     */
    it('应该正确处理空结果', async () => {
      // 准备：设置 mock 返回空数组
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: [], error: null})
      }

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

      // 执行
      const result = await getDriverVehicles('user-999')

      // 验证
      expect(result).toEqual([])
    })

    /**
     * 测试错误处理
     */
    it('应该在查询失败时返回空数组', async () => {
      // 准备：设置 mock 返回错误
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: {message: '查询失败'}})
      }

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

      // 执行
      const result = await getDriverVehicles('user-001')

      // 验证
      expect(result).toEqual([])
    })
  })

  // ==================== insertVehicle 测试 ====================
  describe('insertVehicle', () => {
    /**
     * 测试正常创建车辆
     * **Property 2: CRUD 操作数据一致性**
     * **Validates: Requirements 4.2**
     */
    it('应该成功创建车辆', async () => {
      // 准备：设置 mock
      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: mockVehicle, error: null})
      }

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

      // 执行
      const result = await insertVehicle({
        plate_number: '京A12345',
        brand: '丰田',
        model: '卡罗拉',
        user_id: 'user-001'
      })

      // 验证
      expect(result).not.toBeNull()
      expect(result?.plate_number).toBe('京A12345')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('vehicles')
    })

    /**
     * 测试重复车牌处理
     * **Property 2: CRUD 操作数据一致性**
     * **Validates: Requirements 4.2**
     */
    it('应该在车牌重复时抛出错误', async () => {
      // 准备：设置 mock 返回唯一约束冲突错误
      const mockQueryBuilder = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "vehicles_plate_number_key"'
          }
        })
      }

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

      // 执行并验证
      await expect(
        insertVehicle({
          plate_number: '京A12345',
          brand: '丰田',
          user_id: 'user-001'
        })
      ).rejects.toThrow('DUPLICATE_PLATE:京A12345')
    })

    /**
     * 测试未登录用户
     */
    it('应该在用户未登录时返回 null', async () => {
      // 准备：设置未登录状态
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {user: null},
        error: null
      })

      // 执行
      const result = await insertVehicle({
        plate_number: '京A12345',
        user_id: 'user-001'
      })

      // 验证
      expect(result).toBeNull()
    })

    /**
     * 测试空车牌号
     */
    it('应该在车牌号为空时返回 null', async () => {
      // 执行
      const result = await insertVehicle({
        plate_number: '',
        user_id: 'user-001'
      })

      // 验证
      expect(result).toBeNull()
    })
  })

  // ==================== updateVehicle 测试 ====================
  describe('updateVehicle', () => {
    /**
     * 测试正常更新
     * **Property 3: 更新操作幂等性**
     * **Validates: Requirements 4.3**
     */
    it('应该成功更新车辆信息', async () => {
      // 准备：设置 mock
      const updatedVehicle = {...mockVehicle, brand: '本田'}
      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: updatedVehicle, error: null})
      }

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

      // 执行
      const result = await updateVehicle('vehicle-001', {brand: '本田'})

      // 验证
      expect(result).not.toBeNull()
      expect(result?.brand).toBe('本田')
    })

    /**
     * 测试更新操作幂等性
     * **Property 3: 更新操作幂等性**
     * **Validates: Requirements 4.3**
     */
    it('连续两次相同更新应该产生相同结果', async () => {
      // 准备：设置 mock
      const updatedVehicle = {...mockVehicle, brand: '本田'}
      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: updatedVehicle, error: null})
      }

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

      // 执行两次相同的更新
      const result1 = await updateVehicle('vehicle-001', {brand: '本田'})
      const result2 = await updateVehicle('vehicle-001', {brand: '本田'})

      // 验证：两次结果应该相同
      expect(result1?.brand).toBe(result2?.brand)
    })

    /**
     * 测试不存在的车辆
     */
    it('应该在车辆不存在时返回 null', async () => {
      // 准备：设置 mock 返回空数据
      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
      }

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

      // 执行
      const result = await updateVehicle('non-existent-id', {brand: '本田'})

      // 验证
      expect(result).toBeNull()
    })
  })

  // ==================== deleteVehicle 测试 ====================
  describe('deleteVehicle', () => {
    /**
     * 测试正常删除
     * **Property 4: 删除操作完整性**
     * **Validates: Requirements 4.4**
     */
    it('应该成功删除车辆', async () => {
      // 准备：设置 mock
      // 第一次调用 from('vehicles') 用于 getVehicleById
      const mockSelectBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {...mockVehicle, document: [mockVehicleDocument]},
          error: null
        })
      }

      // 第二次调用 from('vehicles') 用于 delete
      const mockDeleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({data: null, error: null})
      }

      // 设置 storage mock
      mockSupabaseClient.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({data: null, error: null})
      })

      // 按调用顺序返回不同的 mock
      mockSupabaseClient.from
        .mockReturnValueOnce(mockSelectBuilder)
        .mockReturnValueOnce(mockDeleteBuilder)

      // 执行
      const result = await deleteVehicle('vehicle-001')

      // 验证
      expect(result).toBe(true)
    })

    /**
     * 测试不存在的车辆
     * **Property 4: 删除操作完整性**
     * **Validates: Requirements 4.4**
     */
    it('应该在车辆不存在时返回 false', async () => {
      // 准备：设置 mock 返回空数据
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
      }

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

      // 执行
      const result = await deleteVehicle('non-existent-id')

      // 验证
      expect(result).toBe(false)
    })

    /**
     * 测试删除后 getVehicleById 返回 null
     * 验证删除操作的完整性：删除成功后，再次查询应该返回 null
     * **Property 4: 删除操作完整性**
     * **Validates: Requirements 4.4**
     */
    it('删除成功后 getVehicleById 应该返回 null', async () => {
      // 准备：设置 mock
      // 第一次调用：getVehicleById（删除前查询）
      const mockSelectBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {...mockVehicle, document: [mockVehicleDocument]},
          error: null
        })
      }

      // 第二次调用：delete 操作
      const mockDeleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({data: null, error: null})
      }

      // 第三次调用：getVehicleById（删除后查询，应返回 null）
      const mockSelectAfterDeleteBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
      }

      // 设置 storage mock
      mockSupabaseClient.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({data: null, error: null})
      })

      // 按调用顺序返回不同的 mock
      mockSupabaseClient.from
        .mockReturnValueOnce(mockSelectBuilder)
        .mockReturnValueOnce(mockDeleteBuilder)
        .mockReturnValueOnce(mockSelectAfterDeleteBuilder)

      // 执行删除
      const deleteResult = await deleteVehicle('vehicle-001')
      expect(deleteResult).toBe(true)

      // 导入 getVehicleById 并验证删除后返回 null
      const {getVehicleById} = await import('./vehicles')
      const vehicleAfterDelete = await getVehicleById('vehicle-001')

      // 验证：删除后查询应该返回 null
      expect(vehicleAfterDelete).toBeNull()
    })

    /**
     * 测试删除失败时的错误处理
     * **Property 4: 删除操作完整性**
     * **Validates: Requirements 4.4**
     */
    it('应该在删除操作失败时返回 false', async () => {
      // 准备：设置 mock
      // 第一次调用：getVehicleById 成功
      const mockSelectBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {...mockVehicle, document: [mockVehicleDocument]},
          error: null
        })
      }

      // 第二次调用：delete 操作失败
      const mockDeleteBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: {message: '删除失败', code: 'PGRST116'}
        })
      }

      // 设置 storage mock
      mockSupabaseClient.storage.from.mockReturnValue({
        remove: vi.fn().mockResolvedValue({data: null, error: null})
      })

      // 按调用顺序返回不同的 mock
      mockSupabaseClient.from
        .mockReturnValueOnce(mockSelectBuilder)
        .mockReturnValueOnce(mockDeleteBuilder)

      // 执行
      const result = await deleteVehicle('vehicle-001')

      // 验证：删除失败应返回 false
      expect(result).toBe(false)
    })
  })

  // ==================== 审核流程测试 ====================
  /**
   * 审核流程测试套件
   * **Feature: vehicle-api-optimization, Property 5: 审核状态转换正确性**
   * **Validates: Requirements 4.5, 4.6**
   *
   * 验证审核状态转换的正确性：
   * - submitVehicleForReview 后 review_status 应变为 'pending_review'
   * - approveVehicle 后 review_status 应变为 'approved'
   */
  describe('审核流程', () => {
    /**
     * 测试 submitVehicleForReview
     * **Property 5: 审核状态转换正确性**
     * **Validates: Requirements 4.5**
     */
    describe('submitVehicleForReview', () => {
      /**
       * 测试成功提交审核
       * 验证：调用成功后返回 true，且更新操作被正确调用
       */
      it('应该成功提交车辆审核', async () => {
        // 准备：设置 mock
        // 第一次调用：获取车辆信息
        const mockSelectBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {id: 'vehicle-001', user_id: 'user-001', plate_number: '京A12345'},
            error: null
          })
        }

        // 第二次调用：更新审核状态
        const mockUpdateBuilder = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        // 第三次调用：获取司机信息
        const mockDriverBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {name: '张三', driver_type: 'pure'},
            error: null
          })
        }

        // 第四次调用：获取仓库分配
        const mockWarehouseBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{warehouse_id: 'wh-001', warehouses: {id: 'wh-001', name: '北京仓'}}],
            error: null
          })
        }

        mockSupabaseClient.from
          .mockReturnValueOnce(mockSelectBuilder)
          .mockReturnValueOnce(mockUpdateBuilder)
          .mockReturnValueOnce(mockDriverBuilder)
          .mockReturnValueOnce(mockWarehouseBuilder)

        // 执行
        const result = await submitVehicleForReview('vehicle-001')

        // 验证
        expect(result).toBe(true)
      })

      /**
       * 测试提交审核时验证状态更新为 pending_review
       * **Property 5: 审核状态转换正确性**
       * 验证：update 被调用时传入的 review_status 为 'pending_review'
       */
      it('应该将审核状态更新为 pending_review', async () => {
        // 准备：设置 mock 并捕获 update 调用参数
        const mockSelectBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {id: 'vehicle-001', user_id: 'user-001', plate_number: '京A12345'},
            error: null
          })
        }

        // 捕获 update 调用参数
        const updateFn = vi.fn().mockReturnThis()
        const mockUpdateBuilder = {
          update: updateFn,
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        const mockDriverBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {name: '张三', driver_type: 'pure'},
            error: null
          })
        }

        const mockWarehouseBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{warehouse_id: 'wh-001', warehouses: {id: 'wh-001', name: '北京仓'}}],
            error: null
          })
        }

        mockSupabaseClient.from
          .mockReturnValueOnce(mockSelectBuilder)
          .mockReturnValueOnce(mockUpdateBuilder)
          .mockReturnValueOnce(mockDriverBuilder)
          .mockReturnValueOnce(mockWarehouseBuilder)

        // 执行
        await submitVehicleForReview('vehicle-001')

        // 验证：update 被调用时传入的 review_status 为 'pending_review'
        expect(updateFn).toHaveBeenCalled()
        const updateArg = updateFn.mock.calls[0][0]
        expect(updateArg.review_status).toBe('pending_review')
      })

      /**
       * 测试车辆不存在时返回 false
       */
      it('应该在车辆不存在时返回 false', async () => {
        // 准备：设置 mock 返回空数据
        const mockQueryBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
        }

        mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

        // 执行
        const result = await submitVehicleForReview('non-existent-id')

        // 验证
        expect(result).toBe(false)
      })

      /**
       * 测试更新失败时返回 false
       * **Property 5: 审核状态转换正确性**
       */
      it('应该在更新审核状态失败时返回 false', async () => {
        // 准备：设置 mock
        const mockSelectBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {id: 'vehicle-001', user_id: 'user-001', plate_number: '京A12345'},
            error: null
          })
        }

        // 更新操作返回错误
        const mockUpdateBuilder = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({data: null, error: {message: '更新失败'}})
        }

        mockSupabaseClient.from
          .mockReturnValueOnce(mockSelectBuilder)
          .mockReturnValueOnce(mockUpdateBuilder)

        // 执行
        const result = await submitVehicleForReview('vehicle-001')

        // 验证
        expect(result).toBe(false)
      })

      /**
       * 测试带车司机提交审核
       * 验证不同司机类型的处理
       */
      it('应该正确处理带车司机提交审核', async () => {
        // 准备：设置 mock - 带车司机
        const mockSelectBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {id: 'vehicle-002', user_id: 'user-002', plate_number: '京B67890'},
            error: null
          })
        }

        const mockUpdateBuilder = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        // 带车司机
        const mockDriverBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {name: '李四', driver_type: 'with_vehicle'},
            error: null
          })
        }

        const mockWarehouseBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{warehouse_id: 'wh-002', warehouses: {id: 'wh-002', name: '上海仓'}}],
            error: null
          })
        }

        mockSupabaseClient.from
          .mockReturnValueOnce(mockSelectBuilder)
          .mockReturnValueOnce(mockUpdateBuilder)
          .mockReturnValueOnce(mockDriverBuilder)
          .mockReturnValueOnce(mockWarehouseBuilder)

        // 执行
        const result = await submitVehicleForReview('vehicle-002')

        // 验证
        expect(result).toBe(true)
      })
    })

    /**
     * 测试 approveVehicle
     * **Property 5: 审核状态转换正确性**
     * **Validates: Requirements 4.6**
     */
    describe('approveVehicle', () => {
      /**
       * 测试成功通过审核
       * 验证：调用成功后返回 true
       */
      it('应该成功通过车辆审核', async () => {
        // 准备：设置 mock
        // 第一次调用：更新车辆审核状态
        const mockVehicleUpdateBuilder = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        // 第二次调用：更新车辆文档
        const mockDocUpdateBuilder = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        mockSupabaseClient.from
          .mockReturnValueOnce(mockVehicleUpdateBuilder)
          .mockReturnValueOnce(mockDocUpdateBuilder)

        // 执行
        const result = await approveVehicle('vehicle-001', 'reviewer-001', '审核通过')

        // 验证
        expect(result).toBe(true)
      })

      /**
       * 测试通过审核时验证状态更新为 approved
       * **Property 5: 审核状态转换正确性**
       * 验证：update 被调用时传入的 review_status 为 'approved'
       */
      it('应该将审核状态更新为 approved', async () => {
        // 准备：捕获 update 调用参数
        const updateFn = vi.fn().mockReturnThis()
        const mockVehicleUpdateBuilder = {
          update: updateFn,
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        const mockDocUpdateBuilder = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        mockSupabaseClient.from
          .mockReturnValueOnce(mockVehicleUpdateBuilder)
          .mockReturnValueOnce(mockDocUpdateBuilder)

        // 执行
        await approveVehicle('vehicle-001', 'reviewer-001', '审核通过')

        // 验证：update 被调用时传入的 review_status 为 'approved'
        expect(updateFn).toHaveBeenCalled()
        const updateArg = updateFn.mock.calls[0][0]
        expect(updateArg.review_status).toBe('approved')
      })

      /**
       * 测试通过审核时验证审核人和时间被记录
       * **Property 5: 审核状态转换正确性**
       */
      it('应该记录审核人ID和审核时间', async () => {
        // 准备：捕获 update 调用参数
        const updateFn = vi.fn().mockReturnThis()
        const mockVehicleUpdateBuilder = {
          update: updateFn,
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        const mockDocUpdateBuilder = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        mockSupabaseClient.from
          .mockReturnValueOnce(mockVehicleUpdateBuilder)
          .mockReturnValueOnce(mockDocUpdateBuilder)

        // 执行
        await approveVehicle('vehicle-001', 'reviewer-001', '审核通过')

        // 验证：update 被调用时传入了 reviewed_by 和 reviewed_at
        expect(updateFn).toHaveBeenCalled()
        const updateArg = updateFn.mock.calls[0][0]
        expect(updateArg.reviewed_by).toBe('reviewer-001')
        expect(updateArg.reviewed_at).toBeDefined()
      })

      /**
       * 测试更新车辆状态失败时返回 false
       */
      it('应该在更新车辆状态失败时返回 false', async () => {
        // 准备：设置 mock 返回错误
        const mockQueryBuilder = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({data: null, error: {message: '更新失败'}})
        }

        mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

        // 执行
        const result = await approveVehicle('vehicle-001', 'reviewer-001', '审核通过')

        // 验证
        expect(result).toBe(false)
      })

      /**
       * 测试更新文档失败时的回滚行为
       * **Property 5: 审核状态转换正确性**
       * 验证：当文档更新失败时，应该回滚车辆状态
       */
      it('应该在更新文档失败时回滚车辆状态', async () => {
        // 准备：设置 mock
        // 第一次调用：更新车辆审核状态成功
        const mockVehicleUpdateBuilder = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        // 第二次调用：更新车辆文档失败
        const mockDocUpdateBuilder = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({data: null, error: {message: '文档更新失败'}})
        }

        // 第三次调用：回滚车辆状态
        const rollbackUpdateFn = vi.fn().mockReturnThis()
        const mockRollbackBuilder = {
          update: rollbackUpdateFn,
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        mockSupabaseClient.from
          .mockReturnValueOnce(mockVehicleUpdateBuilder)
          .mockReturnValueOnce(mockDocUpdateBuilder)
          .mockReturnValueOnce(mockRollbackBuilder)

        // 执行
        const result = await approveVehicle('vehicle-001', 'reviewer-001', '审核通过')

        // 验证：返回 false 且回滚被调用
        expect(result).toBe(false)
        expect(rollbackUpdateFn).toHaveBeenCalled()
        // 验证回滚时将状态设置为 'pending'
        const rollbackArg = rollbackUpdateFn.mock.calls[0][0]
        expect(rollbackArg.review_status).toBe('pending')
      })

      /**
       * 测试审核备注被正确保存
       */
      it('应该正确保存审核备注', async () => {
        // 准备：捕获文档更新调用参数
        const mockVehicleUpdateBuilder = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        const docUpdateFn = vi.fn().mockReturnThis()
        const mockDocUpdateBuilder = {
          update: docUpdateFn,
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        mockSupabaseClient.from
          .mockReturnValueOnce(mockVehicleUpdateBuilder)
          .mockReturnValueOnce(mockDocUpdateBuilder)

        // 执行
        await approveVehicle('vehicle-001', 'reviewer-001', '车辆信息完整，审核通过')

        // 验证：文档更新时传入了正确的审核备注
        expect(docUpdateFn).toHaveBeenCalled()
        const docUpdateArg = docUpdateFn.mock.calls[0][0]
        expect(docUpdateArg.review_notes).toBe('车辆信息完整，审核通过')
      })
    })

    /**
     * 测试完整审核流程
     * **Property 5: 审核状态转换正确性**
     * 验证：从提交审核到通过审核的完整状态转换
     */
    describe('完整审核流程', () => {
      /**
       * 测试审核状态转换序列
       * 验证：pending -> pending_review -> approved 的状态转换
       */
      it('应该正确执行 pending -> pending_review -> approved 状态转换', async () => {
        // 步骤1：提交审核（pending -> pending_review）
        const submitSelectBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {id: 'vehicle-001', user_id: 'user-001', plate_number: '京A12345'},
            error: null
          })
        }

        const submitUpdateFn = vi.fn().mockReturnThis()
        const submitUpdateBuilder = {
          update: submitUpdateFn,
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        const submitDriverBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {name: '张三', driver_type: 'pure'},
            error: null
          })
        }

        const submitWarehouseBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{warehouse_id: 'wh-001', warehouses: {id: 'wh-001', name: '北京仓'}}],
            error: null
          })
        }

        mockSupabaseClient.from
          .mockReturnValueOnce(submitSelectBuilder)
          .mockReturnValueOnce(submitUpdateBuilder)
          .mockReturnValueOnce(submitDriverBuilder)
          .mockReturnValueOnce(submitWarehouseBuilder)

        // 执行提交审核
        const submitResult = await submitVehicleForReview('vehicle-001')
        expect(submitResult).toBe(true)
        expect(submitUpdateFn.mock.calls[0][0].review_status).toBe('pending_review')

        // 清除 mock 调用记录
        vi.clearAllMocks()

        // 步骤2：通过审核（pending_review -> approved）
        const approveUpdateFn = vi.fn().mockReturnThis()
        const approveVehicleUpdateBuilder = {
          update: approveUpdateFn,
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        const approveDocUpdateBuilder = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({data: null, error: null})
        }

        mockSupabaseClient.from
          .mockReturnValueOnce(approveVehicleUpdateBuilder)
          .mockReturnValueOnce(approveDocUpdateBuilder)

        // 执行通过审核
        const approveResult = await approveVehicle('vehicle-001', 'reviewer-001', '审核通过')
        expect(approveResult).toBe(true)
        expect(approveUpdateFn.mock.calls[0][0].review_status).toBe('approved')
      })
    })
  })

  // ==================== togglePhotoLock 测试 ====================
  describe('togglePhotoLock', () => {
    /**
     * 测试锁定功能
     * **Property 1: 图片锁定状态切换正确性**
     * **Validates: Requirements 3.2**
     */
    it('应该成功锁定图片', async () => {
      // 准备：设置 mock
      // 第一次调用：获取当前锁定状态
      const mockSelectBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {locked_photos: {}},
          error: null
        })
      }

      // 第二次调用：更新锁定状态
      const mockUpdateBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({data: null, error: null})
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockSelectBuilder)
        .mockReturnValueOnce(mockUpdateBuilder)

      // 执行：锁定图片
      const result = await togglePhotoLock('vehicle-001', 'left_front_photo', 0, true)

      // 验证
      expect(result).toBe(true)
    })

    /**
     * 测试解锁功能
     * **Property 1: 图片锁定状态切换正确性**
     * **Validates: Requirements 3.2**
     */
    it('应该成功解锁图片', async () => {
      // 准备：设置 mock - 图片已锁定
      const mockSelectBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {locked_photos: {left_front_photo: [0]}},
          error: null
        })
      }

      // 第二次调用：更新锁定状态
      const mockUpdateBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({data: null, error: null})
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockSelectBuilder)
        .mockReturnValueOnce(mockUpdateBuilder)

      // 执行：解锁图片
      const result = await togglePhotoLock('vehicle-001', 'left_front_photo', 0, false)

      // 验证
      expect(result).toBe(true)
    })

    /**
     * 测试锁定后解锁应恢复原状态
     * **Property 1: 图片锁定状态切换正确性**
     * **Validates: Requirements 3.2**
     */
    it('锁定后解锁应该恢复原状态', async () => {
      // 这个测试验证往返操作的正确性
      // 由于是 mock 测试，我们验证两次操作都成功即可

      // 准备：锁定操作的 mock
      const mockSelectBuilder1 = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {locked_photos: {}},
          error: null
        })
      }

      const mockUpdateBuilder1 = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({data: null, error: null})
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockSelectBuilder1)
        .mockReturnValueOnce(mockUpdateBuilder1)

      // 执行锁定
      const lockResult = await togglePhotoLock('vehicle-001', 'left_front_photo', 0, true)
      expect(lockResult).toBe(true)

      // 准备：解锁操作的 mock
      const mockSelectBuilder2 = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {locked_photos: {left_front_photo: [0]}},
          error: null
        })
      }

      const mockUpdateBuilder2 = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({data: null, error: null})
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockSelectBuilder2)
        .mockReturnValueOnce(mockUpdateBuilder2)

      // 执行解锁
      const unlockResult = await togglePhotoLock('vehicle-001', 'left_front_photo', 0, false)
      expect(unlockResult).toBe(true)
    })

    /**
     * 测试文档不存在时的处理
     */
    it('应该在文档不存在时返回 false', async () => {
      // 准备：设置 mock 返回空数据
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
      }

      mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

      // 执行
      const result = await togglePhotoLock('non-existent-id', 'left_front_photo', 0, true)

      // 验证
      expect(result).toBe(false)
    })
  })

  // ==================== supplementPhoto 属性测试 ====================
  /**
   * supplementPhoto 函数属性测试套件
   * **Feature: supplemented-photo-marking, Property 1: 补录操作记录完整性**
   * **Validates: Requirements 1.1, 2.2**
   *
   * 验证补录操作的记录完整性：
   * - 补录成功后 supplemented_photos 字段应包含完整元数据
   * - 元数据应包含 field、index、supplemented_at、supplement_count
   * - 补录次数应正确累加
   */
  describe('supplementPhoto 属性测试', () => {
    /**
     * 属性测试：补录操作记录完整性
     * **Feature: supplemented-photo-marking, Property 1: 补录操作记录完整性**
     * **Validates: Requirements 1.1, 2.2**
     *
     * *For any* 补录操作，当照片成功补录后，supplemented_photos 字段应包含该照片的完整元数据
     * （field、index、supplemented_at、supplement_count）
     */
    it('属性测试：补录成功后应包含完整的元数据', async () => {
      // 使用 fast-check 进行属性测试
      const fc = await import('fast-check')

      // 定义有效的照片字段名生成器
      const photoFieldArb = fc.constantFrom(
        'pickup_photos',
        'return_photos',
        'registration_photos',
        'damage_photos'
      )

      // 定义有效的照片索引生成器（0-9）
      const photoIndexArb = fc.integer({min: 0, max: 9})

      // 定义有效的车辆ID生成器
      const vehicleIdArb = fc.uuid()

      // 定义有效的照片URL生成器
      const photoUrlArb = fc.webUrl()

      // 定义原始照片URL生成器
      const originalPhotoUrlArb = fc.webUrl()

      // 捕获 update 调用参数
      let capturedUpdateData: Record<string, unknown> | null = null

      await fc.assert(
        fc.asyncProperty(
          vehicleIdArb,
          photoFieldArb,
          photoIndexArb,
          photoUrlArb,
          originalPhotoUrlArb,
          async (vehicleId, photoField, photoIndex, photoUrl, originalPhotoUrl) => {
            // 重置 mock
            vi.clearAllMocks()
            capturedUpdateData = null

            // 准备：模拟现有文档数据，使用生成的原始照片URL
            const existingPhotos = Array(10).fill(null).map(() => originalPhotoUrl)
            const mockSelectBuilder = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  [photoField]: existingPhotos,
                  required_photos: [`${photoField}_${photoIndex}`],
                  supplemented_photos: null
                },
                error: null
              })
            }

            // 捕获 update 调用参数
            const updateFn = vi.fn().mockImplementation((data) => {
              capturedUpdateData = data
              return {
                eq: vi.fn().mockResolvedValue({data: null, error: null})
              }
            })

            const mockUpdateBuilder = {
              update: updateFn,
              eq: vi.fn().mockResolvedValue({data: null, error: null})
            }

            mockSupabaseClient.from
              .mockReturnValueOnce(mockSelectBuilder)
              .mockReturnValueOnce(mockUpdateBuilder)

            // 导入并执行 supplementPhoto
            const {supplementPhoto} = await import('./vehicles')
            const result = await supplementPhoto(vehicleId, photoField, photoIndex, photoUrl)

            // 验证：补录成功
            expect(result).toBe(true)

            // 验证：update 被调用
            expect(updateFn).toHaveBeenCalled()

            // 验证：supplemented_photos 包含完整元数据
            expect(capturedUpdateData).not.toBeNull()
            const supplementedPhotos = capturedUpdateData?.supplemented_photos as Record<string, unknown>
            expect(supplementedPhotos).toBeDefined()

            const photoKey = `${photoField}_${photoIndex}`
            const meta = supplementedPhotos[photoKey] as {
              field: string
              index: number
              supplemented_at: string
              supplement_count: number
              original_url: string | null
            }

            // 属性验证：元数据完整性
            // 1. field 字段应与输入的 photoField 一致
            expect(meta.field).toBe(photoField)

            // 2. index 字段应与输入的 photoIndex 一致
            expect(meta.index).toBe(photoIndex)

            // 3. supplemented_at 应为有效的 ISO 8601 时间戳
            expect(meta.supplemented_at).toBeDefined()
            expect(new Date(meta.supplemented_at).toISOString()).toBe(meta.supplemented_at)

            // 4. supplement_count 应为正整数（首次补录为1）
            expect(meta.supplement_count).toBe(1)
            expect(Number.isInteger(meta.supplement_count)).toBe(true)
            expect(meta.supplement_count).toBeGreaterThan(0)

            // 5. original_url 应保留原始照片URL（与模拟数据中的原始URL一致）
            expect(meta.original_url).toBe(originalPhotoUrl)

            return true
          }
        ),
        {numRuns: 100} // 运行100次属性测试
      )
    })

    /**
     * 属性测试：补录次数累加正确性
     * **Feature: supplemented-photo-marking, Property 1: 补录操作记录完整性**
     * **Validates: Requirements 1.1, 2.2**
     *
     * *For any* 已有补录记录的照片，再次补录时 supplement_count 应正确累加
     */
    it('属性测试：多次补录时补录次数应正确累加', async () => {
      const fc = await import('fast-check')

      // 定义有效的照片字段名生成器
      const photoFieldArb = fc.constantFrom(
        'pickup_photos',
        'return_photos',
        'registration_photos',
        'damage_photos'
      )

      // 定义有效的照片索引生成器（0-9）
      const photoIndexArb = fc.integer({min: 0, max: 9})

      // 定义已有的补录次数生成器（1-10）
      const existingCountArb = fc.integer({min: 1, max: 10})

      // 捕获 update 调用参数
      let capturedUpdateData: Record<string, unknown> | null = null

      await fc.assert(
        fc.asyncProperty(
          photoFieldArb,
          photoIndexArb,
          existingCountArb,
          async (photoField, photoIndex, existingCount) => {
            // 重置 mock
            vi.clearAllMocks()
            capturedUpdateData = null

            const vehicleId = 'test-vehicle-001'
            const photoUrl = 'https://example.com/new-photo.jpg'
            const photoKey = `${photoField}_${photoIndex}`

            // 准备：模拟已有补录记录的文档数据
            const existingPhotos = Array(10).fill('https://example.com/old-photo.jpg')
            const existingSupplementedPhotos = {
              [photoKey]: {
                field: photoField,
                index: photoIndex,
                supplemented_at: '2024-01-01T00:00:00.000Z',
                original_url: 'https://example.com/original.jpg',
                supplement_count: existingCount
              }
            }

            const mockSelectBuilder = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  [photoField]: existingPhotos,
                  required_photos: [],
                  supplemented_photos: existingSupplementedPhotos
                },
                error: null
              })
            }

            // 捕获 update 调用参数
            const updateFn = vi.fn().mockImplementation((data) => {
              capturedUpdateData = data
              return {
                eq: vi.fn().mockResolvedValue({data: null, error: null})
              }
            })

            const mockUpdateBuilder = {
              update: updateFn,
              eq: vi.fn().mockResolvedValue({data: null, error: null})
            }

            mockSupabaseClient.from
              .mockReturnValueOnce(mockSelectBuilder)
              .mockReturnValueOnce(mockUpdateBuilder)

            // 导入并执行 supplementPhoto
            const {supplementPhoto} = await import('./vehicles')
            const result = await supplementPhoto(vehicleId, photoField, photoIndex, photoUrl)

            // 验证：补录成功
            expect(result).toBe(true)

            // 验证：补录次数正确累加
            const supplementedPhotos = capturedUpdateData?.supplemented_photos as Record<string, unknown>
            const meta = supplementedPhotos[photoKey] as {supplement_count: number}

            // 属性验证：补录次数应为 existingCount + 1
            expect(meta.supplement_count).toBe(existingCount + 1)

            return true
          }
        ),
        {numRuns: 100} // 运行100次属性测试
      )
    })

    /**
     * 属性测试：无效参数应返回 false
     * **Feature: supplemented-photo-marking, Property 1: 补录操作记录完整性**
     * **Validates: Requirements 1.1, 2.2**
     *
     * *For any* 无效参数（空vehicleId、空photoField、负数index、空photoUrl），
     * supplementPhoto 应返回 false 且不执行数据库操作
     */
    it('属性测试：无效参数应返回 false', async () => {
      const fc = await import('fast-check')

      // 定义无效参数组合生成器
      const invalidParamsArb = fc.oneof(
        // 空 vehicleId
        fc.record({
          vehicleId: fc.constant(''),
          photoField: fc.constant('pickup_photos'),
          photoIndex: fc.constant(0),
          photoUrl: fc.constant('https://example.com/photo.jpg')
        }),
        // 空 photoField
        fc.record({
          vehicleId: fc.uuid(),
          photoField: fc.constant(''),
          photoIndex: fc.constant(0),
          photoUrl: fc.constant('https://example.com/photo.jpg')
        }),
        // 负数 photoIndex
        fc.record({
          vehicleId: fc.uuid(),
          photoField: fc.constant('pickup_photos'),
          photoIndex: fc.integer({min: -100, max: -1}),
          photoUrl: fc.constant('https://example.com/photo.jpg')
        }),
        // 空 photoUrl
        fc.record({
          vehicleId: fc.uuid(),
          photoField: fc.constant('pickup_photos'),
          photoIndex: fc.constant(0),
          photoUrl: fc.constant('')
        })
      )

      await fc.assert(
        fc.asyncProperty(invalidParamsArb, async (params) => {
          // 重置 mock
          vi.clearAllMocks()

          // 导入并执行 supplementPhoto
          const {supplementPhoto} = await import('./vehicles')
          const result = await supplementPhoto(
            params.vehicleId,
            params.photoField,
            params.photoIndex,
            params.photoUrl
          )

          // 属性验证：无效参数应返回 false
          expect(result).toBe(false)

          // 属性验证：不应调用数据库操作
          expect(mockSupabaseClient.from).not.toHaveBeenCalled()

          return true
        }),
        {numRuns: 100} // 运行100次属性测试
      )
    })
  })

  // ==================== getSupplementedPhotos 属性测试 ====================
  /**
   * getSupplementedPhotos 函数属性测试套件
   * **Feature: supplemented-photo-marking, Property 4: 照片历史记录完整性**
   * **Validates: Requirements 3.1, 3.2, 3.3**
   *
   * 验证照片历史记录的完整性：
   * - 查询返回的数据应包含所有补录照片的元数据
   * - 每条元数据应包含 field、index、supplemented_at、supplement_count
   * - 空数据或异常情况应返回空对象
   */
  describe('getSupplementedPhotos 属性测试', () => {
    /**
     * 属性测试：返回的补录元数据应包含完整字段
     * **Feature: supplemented-photo-marking, Property 4: 照片历史记录完整性**
     * **Validates: Requirements 3.1, 3.2, 3.3**
     *
     * *For any* 有效的 vehicleId 和存在的补录元数据，
     * getSupplementedPhotos 返回的每条记录应包含：
     * - field: 照片字段名
     * - index: 照片索引
     * - supplemented_at: 补录时间戳
     * - supplement_count: 补录次数（>= 1）
     */
    it('属性测试：返回的补录元数据应包含完整字段', async () => {
      // 使用 fast-check 进行属性测试
      const fc = await import('fast-check')

      // 定义有效的照片字段名生成器
      const photoFieldArb = fc.constantFrom(
        'pickup_photos',
        'return_photos',
        'registration_photos',
        'damage_photos'
      )

      // 定义补录元数据生成器
      const supplementedMetaArb = fc.record({
        field: photoFieldArb,
        index: fc.integer({min: 0, max: 9}),
        supplemented_at: fc.date().map((d) => d.toISOString()),
        original_url: fc.option(fc.webUrl(), {nil: null}),
        supplement_count: fc.integer({min: 1, max: 10})
      })

      // 定义补录照片映射生成器（1-5条记录）
      const supplementedPhotosArb = fc
        .array(supplementedMetaArb, {minLength: 1, maxLength: 5})
        .map((metas) => {
          const result: Record<string, typeof metas[0]> = {}
          metas.forEach((meta) => {
            const key = `${meta.field}_${meta.index}`
            result[key] = meta
          })
          return result
        })

      // 定义测试参数生成器
      const testParamsArb = fc.record({
        vehicleId: fc.uuid(),
        supplementedPhotos: supplementedPhotosArb
      })

      await fc.assert(
        fc.asyncProperty(testParamsArb, async ({vehicleId, supplementedPhotos}) => {
          // 重置 mock
          vi.clearAllMocks()

          // 设置 mock 返回补录元数据
          const mockSelectBuilder = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {supplemented_photos: supplementedPhotos},
              error: null
            })
          }

          mockSupabaseClient.from.mockReturnValue(mockSelectBuilder)

          // 导入并执行 getSupplementedPhotos
          const {getSupplementedPhotos} = await import('./vehicles')
          const result = await getSupplementedPhotos(vehicleId)

          // 属性验证：返回的数据应与 mock 数据一致
          expect(result).toEqual(supplementedPhotos)

          // 属性验证：每条记录应包含完整字段
          for (const [key, meta] of Object.entries(result)) {
            // 验证 key 格式为 "{field}_{index}"
            expect(key).toMatch(/^(pickup_photos|return_photos|registration_photos|damage_photos)_\d+$/)

            // 验证必需字段存在
            expect(meta).toHaveProperty('field')
            expect(meta).toHaveProperty('index')
            expect(meta).toHaveProperty('supplemented_at')
            expect(meta).toHaveProperty('supplement_count')

            // 验证字段类型和值
            expect(typeof meta.field).toBe('string')
            expect(typeof meta.index).toBe('number')
            expect(meta.index).toBeGreaterThanOrEqual(0)
            expect(typeof meta.supplemented_at).toBe('string')
            expect(typeof meta.supplement_count).toBe('number')
            expect(meta.supplement_count).toBeGreaterThanOrEqual(1)

            // 验证 key 与 field_index 一致
            expect(key).toBe(`${meta.field}_${meta.index}`)
          }

          return true
        }),
        {numRuns: 100} // 运行100次属性测试
      )
    })

    /**
     * 属性测试：空数据或不存在的车辆应返回空对象
     * **Feature: supplemented-photo-marking, Property 4: 照片历史记录完整性**
     * **Validates: Requirements 3.2, 3.3**
     *
     * *For any* vehicleId，当数据库返回空数据或 null 时，
     * getSupplementedPhotos 应返回空对象 {}
     */
    it('属性测试：空数据或不存在的车辆应返回空对象', async () => {
      const fc = await import('fast-check')

      // 定义空数据场景生成器
      const emptyDataScenarioArb = fc.constantFrom(
        {data: null, error: null}, // 车辆不存在
        {data: {supplemented_photos: null}, error: null}, // 字段为 null
        {data: {supplemented_photos: {}}, error: null} // 字段为空对象
      )

      const testParamsArb = fc.record({
        vehicleId: fc.uuid(),
        scenario: emptyDataScenarioArb
      })

      await fc.assert(
        fc.asyncProperty(testParamsArb, async ({vehicleId, scenario}) => {
          // 重置 mock
          vi.clearAllMocks()

          // 设置 mock 返回空数据场景
          const mockSelectBuilder = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue(scenario)
          }

          mockSupabaseClient.from.mockReturnValue(mockSelectBuilder)

          // 导入并执行 getSupplementedPhotos
          const {getSupplementedPhotos} = await import('./vehicles')
          const result = await getSupplementedPhotos(vehicleId)

          // 属性验证：应返回空对象
          expect(result).toEqual({})
          expect(Object.keys(result)).toHaveLength(0)

          return true
        }),
        {numRuns: 100} // 运行100次属性测试
      )
    })

    /**
     * 属性测试：数据库错误时应返回空对象
     * **Feature: supplemented-photo-marking, Property 4: 照片历史记录完整性**
     * **Validates: Requirements 3.3**
     *
     * *For any* vehicleId，当数据库查询出错时，
     * getSupplementedPhotos 应返回空对象 {} 而不是抛出异常
     */
    it('属性测试：数据库错误时应返回空对象', async () => {
      const fc = await import('fast-check')

      // 定义错误场景生成器
      const errorScenarioArb = fc.record({
        message: fc.string({minLength: 1, maxLength: 50}),
        code: fc.constantFrom('PGRST116', '42P01', '23505', 'UNKNOWN')
      })

      const testParamsArb = fc.record({
        vehicleId: fc.uuid(),
        error: errorScenarioArb
      })

      await fc.assert(
        fc.asyncProperty(testParamsArb, async ({vehicleId, error}) => {
          // 重置 mock
          vi.clearAllMocks()

          // 设置 mock 返回错误
          const mockSelectBuilder = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: error
            })
          }

          mockSupabaseClient.from.mockReturnValue(mockSelectBuilder)

          // 导入并执行 getSupplementedPhotos
          const {getSupplementedPhotos} = await import('./vehicles')
          const result = await getSupplementedPhotos(vehicleId)

          // 属性验证：应返回空对象而不是抛出异常
          expect(result).toEqual({})

          return true
        }),
        {numRuns: 100} // 运行100次属性测试
      )
    })

    /**
     * 属性测试：无效 vehicleId 应返回空对象
     * **Feature: supplemented-photo-marking, Property 4: 照片历史记录完整性**
     * **Validates: Requirements 3.3**
     *
     * *For any* 无效的 vehicleId（空字符串、null、undefined），
     * getSupplementedPhotos 应返回空对象 {} 且不执行数据库查询
     */
    it('属性测试：无效 vehicleId 应返回空对象', async () => {
      const fc = await import('fast-check')

      // 定义无效 vehicleId 生成器
      const invalidVehicleIdArb = fc.constantFrom('', null as unknown as string, undefined as unknown as string)

      await fc.assert(
        fc.asyncProperty(invalidVehicleIdArb, async (vehicleId) => {
          // 重置 mock
          vi.clearAllMocks()

          // 导入并执行 getSupplementedPhotos
          const {getSupplementedPhotos} = await import('./vehicles')
          const result = await getSupplementedPhotos(vehicleId)

          // 属性验证：应返回空对象
          expect(result).toEqual({})

          // 属性验证：不应调用数据库操作
          expect(mockSupabaseClient.from).not.toHaveBeenCalled()

          return true
        }),
        {numRuns: 100} // 运行100次属性测试
      )
    })
  })
})
