/**
 * 计件管理 API 单元测试
 *
 * 测试覆盖：
 * - getPieceWorkRecordsByUser() - 获取用户计件记录
 * - getPieceWorkRecordsByWarehouse() - 获取仓库计件记录
 * - createPieceWorkRecord() - 创建计件记录
 * - updatePieceWorkRecord() - 更新计件记录
 * - deletePieceWorkRecord() - 删除计件记录
 * - getAllCategories() - 获取所有品类
 * - getCategoryPricesByWarehouse() - 获取仓库品类价格
 * - 属性测试
 *
 * @module db/api/piecework.test
 * @requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createMockPiecework,
  createMockPieceworkRecords,
  createMockDriver,
  createMockWarehouse,
  createMockCategory,
  createMockCategories,
  createMockCategoryPrice,
  getDateString
} from './__mocks__'

// ==================== Mock 设置 ====================

// Mock Supabase 客户端
const mockSupabaseFrom = vi.fn()
const mockSupabaseAuth = {
  getUser: vi.fn()
}

// Mock 查询构建器
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn()
}

// Mock PieceWorkRepository
const mockPieceWorkRepository = {
  getByUser: vi.fn(),
  getByWarehouse: vi.fn(),
  getByUserAndWarehouse: vi.fn(),
  getAllRecords: vi.fn(),
  getUserStats: vi.fn(),
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
  invalidateCache: vi.fn(),
  clearAllCache: vi.fn()
}

// Mock CategoriesRepository
const mockCategoriesRepository = {
  getActiveCategories: vi.fn(),
  getAllCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  invalidateCache: vi.fn()
}

// Mock CategoryPricesRepository
const mockCategoryPricesRepository = {
  getByWarehouse: vi.fn(),
  getPrice: vi.fn(),
  upsertPrice: vi.fn(),
  batchUpsertPrices: vi.fn(),
  deletePrice: vi.fn(),
  invalidateCache: vi.fn()
}

// Mock eventBus
const mockPublish = vi.fn()

// 设置模块 Mock
vi.mock('@/client/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom,
    auth: mockSupabaseAuth
  }
}))

vi.mock('../repositories', () => ({
  pieceWorkRepository: mockPieceWorkRepository,
  categoriesRepository: mockCategoriesRepository,
  categoryPricesRepository: mockCategoryPricesRepository
}))

vi.mock('@/utils/eventBus', () => ({
  publish: mockPublish
}))

vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    db: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }))
}))

// ==================== 测试套件 ====================

describe('PieceworkAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 重置查询构建器
    mockSupabaseFrom.mockReturnValue(mockQueryBuilder)
    mockQueryBuilder.select.mockReturnThis()
    mockQueryBuilder.insert.mockReturnThis()
    mockQueryBuilder.update.mockReturnThis()
    mockQueryBuilder.delete.mockReturnThis()
    mockQueryBuilder.eq.mockReturnThis()
    mockQueryBuilder.in.mockReturnThis()
    mockQueryBuilder.gte.mockReturnThis()
    mockQueryBuilder.lte.mockReturnThis()
    mockQueryBuilder.is.mockReturnThis()
    mockQueryBuilder.order.mockReturnThis()
    mockQueryBuilder.limit.mockReturnThis()

    // 默认设置用户未登录
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    // 重置 Repository Mock 默认值
    mockPieceWorkRepository.getByUser.mockResolvedValue([])
    mockPieceWorkRepository.getByWarehouse.mockResolvedValue([])
    mockPieceWorkRepository.getByUserAndWarehouse.mockResolvedValue([])
    mockPieceWorkRepository.getAllRecords.mockResolvedValue([])
    mockPieceWorkRepository.createRecord.mockResolvedValue(null)
    mockPieceWorkRepository.updateRecord.mockResolvedValue(null)
    mockPieceWorkRepository.deleteRecord.mockResolvedValue(false)

    mockCategoriesRepository.getActiveCategories.mockResolvedValue([])
    mockCategoriesRepository.getAllCategories.mockResolvedValue([])
    mockCategoriesRepository.createCategory.mockResolvedValue(null)
    mockCategoriesRepository.updateCategory.mockResolvedValue(false)
    mockCategoriesRepository.deleteCategory.mockResolvedValue(false)

    mockCategoryPricesRepository.getByWarehouse.mockResolvedValue([])
    mockCategoryPricesRepository.getPrice.mockResolvedValue(null)
    mockCategoryPricesRepository.upsertPrice.mockResolvedValue(false)
    mockCategoryPricesRepository.batchUpsertPrices.mockResolvedValue([])
    mockCategoryPricesRepository.deletePrice.mockResolvedValue(false)
  })

  afterEach(() => {
    vi.resetModules()
  })

  // ==================== 5.1 测试 getPieceWorkRecords() ====================

  describe('getPieceWorkRecordsByUser', () => {
    /**
     * 测试：应该返回用户的计件记录
     * @requirements 4.1
     */
    it('应该返回用户的计件记录', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const mockRecords = createMockPieceworkRecords(userId, 5)
      mockPieceWorkRepository.getByUser.mockResolvedValue(mockRecords)

      // 执行
      const { getPieceWorkRecordsByUser } = await import('./piecework')
      const result = await getPieceWorkRecordsByUser(userId)

      // 验证
      expect(result).toHaveLength(5)
      expect(mockPieceWorkRepository.getByUser).toHaveBeenCalledWith(userId, undefined, undefined)
    })

    /**
     * 测试：应该支持日期范围过滤
     * @requirements 4.1
     */
    it('应该支持日期范围过滤', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const startDate = '2024-12-01'
      const endDate = '2024-12-31'
      const mockRecords = createMockPieceworkRecords(userId, 3)
      mockPieceWorkRepository.getByUser.mockResolvedValue(mockRecords)

      // 执行
      const { getPieceWorkRecordsByUser } = await import('./piecework')
      const result = await getPieceWorkRecordsByUser(userId, startDate, endDate)

      // 验证
      expect(result).toHaveLength(3)
      expect(mockPieceWorkRepository.getByUser).toHaveBeenCalledWith(userId, startDate, endDate)
    })

    /**
     * 测试：应该正确处理空结果
     * @requirements 4.1
     */
    it('应该正确处理空结果', async () => {
      // 准备
      const userId = 'user-001'
      mockPieceWorkRepository.getByUser.mockResolvedValue([])

      // 执行
      const { getPieceWorkRecordsByUser } = await import('./piecework')
      const result = await getPieceWorkRecordsByUser(userId)

      // 验证
      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    /**
     * 测试：应该调用 PieceWorkRepository
     * @requirements 4.1
     */
    it('应该调用 PieceWorkRepository', async () => {
      // 准备
      const userId = 'user-001'
      mockPieceWorkRepository.getByUser.mockResolvedValue([])

      // 执行
      const { getPieceWorkRecordsByUser } = await import('./piecework')
      await getPieceWorkRecordsByUser(userId)

      // 验证
      expect(mockPieceWorkRepository.getByUser).toHaveBeenCalledTimes(1)
    })
  })

  describe('getPieceWorkRecordsByWarehouse', () => {
    /**
     * 测试：应该返回仓库的计件记录
     * @requirements 4.1
     */
    it('应该返回仓库的计件记录', async () => {
      // 准备测试数据
      const warehouseId = 'wh-001'
      const mockRecords = [
        createMockPiecework('user-001', { warehouse_id: warehouseId }),
        createMockPiecework('user-002', { warehouse_id: warehouseId })
      ]
      mockPieceWorkRepository.getByWarehouse.mockResolvedValue(mockRecords)

      // 执行
      const { getPieceWorkRecordsByWarehouse } = await import('./piecework')
      const result = await getPieceWorkRecordsByWarehouse(warehouseId)

      // 验证
      expect(result).toHaveLength(2)
      expect(mockPieceWorkRepository.getByWarehouse).toHaveBeenCalledWith(warehouseId, undefined, undefined)
    })

    /**
     * 测试：应该支持日期范围过滤
     * @requirements 4.1
     */
    it('应该支持日期范围过滤', async () => {
      // 准备测试数据
      const warehouseId = 'wh-001'
      const startDate = '2024-12-01'
      const endDate = '2024-12-31'
      mockPieceWorkRepository.getByWarehouse.mockResolvedValue([])

      // 执行
      const { getPieceWorkRecordsByWarehouse } = await import('./piecework')
      await getPieceWorkRecordsByWarehouse(warehouseId, startDate, endDate)

      // 验证
      expect(mockPieceWorkRepository.getByWarehouse).toHaveBeenCalledWith(warehouseId, startDate, endDate)
    })
  })

  describe('getPieceWorkRecordsByUserAndWarehouse', () => {
    /**
     * 测试：应该返回用户在指定仓库的计件记录
     * @requirements 4.1
     */
    it('应该返回用户在指定仓库的计件记录', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const warehouseId = 'wh-001'
      const mockRecords = createMockPieceworkRecords(userId, 3)
      mockPieceWorkRepository.getByUserAndWarehouse.mockResolvedValue(mockRecords)

      // 执行
      const { getPieceWorkRecordsByUserAndWarehouse } = await import('./piecework')
      const result = await getPieceWorkRecordsByUserAndWarehouse(userId, warehouseId)

      // 验证
      expect(result).toHaveLength(3)
      expect(mockPieceWorkRepository.getByUserAndWarehouse).toHaveBeenCalledWith(
        userId,
        warehouseId,
        undefined,
        undefined
      )
    })
  })

  describe('getAllPieceWorkRecords', () => {
    /**
     * 测试：应该返回所有计件记录
     * @requirements 4.1
     */
    it('应该返回所有计件记录', async () => {
      // 准备测试数据
      const mockRecords = [
        createMockPiecework('user-001'),
        createMockPiecework('user-002'),
        createMockPiecework('user-003')
      ]
      mockPieceWorkRepository.getAllRecords.mockResolvedValue(mockRecords)

      // 执行
      const { getAllPieceWorkRecords } = await import('./piecework')
      const result = await getAllPieceWorkRecords()

      // 验证
      expect(result).toHaveLength(3)
      expect(mockPieceWorkRepository.getAllRecords).toHaveBeenCalled()
    })
  })


  // ==================== 5.2 测试 createPieceWorkRecord() ====================

  describe('createPieceWorkRecord', () => {
    /**
     * 测试：应该创建计件记录
     * @requirements 4.2
     */
    it('应该创建计件记录', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const mockRecord = createMockPiecework(userId, {
        id: 'record-001',
        quantity: 100,
        total_amount: 150
      })

      // 设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      })

      mockPieceWorkRepository.createRecord.mockResolvedValue(mockRecord)

      // 执行
      const { createPieceWorkRecord } = await import('./piecework')
      const result = await createPieceWorkRecord({
        user_id: userId,
        quantity: 100,
        unit_price: 1.5,
        total_amount: 150,
        work_date: getDateString()
      })

      // 验证
      expect(result).toBe(true)
      expect(mockPieceWorkRepository.createRecord).toHaveBeenCalled()
    })

    /**
     * 测试：创建成功后应该发布事件
     * @requirements 4.2
     */
    it('创建成功后应该发布事件', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const mockRecord = createMockPiecework(userId, { id: 'record-001' })

      // 设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      })

      mockPieceWorkRepository.createRecord.mockResolvedValue(mockRecord)

      // 执行
      const { createPieceWorkRecord } = await import('./piecework')
      await createPieceWorkRecord({
        user_id: userId,
        quantity: 100,
        unit_price: 1.5,
        total_amount: 150,
        work_date: getDateString()
      })

      // 验证：事件被发布
      expect(mockPublish).toHaveBeenCalledWith('piece_work:created', expect.objectContaining({
        userId: userId
      }))
    })

    /**
     * 测试：未登录时应该返回 false
     * @requirements 4.2
     */
    it('未登录时应该返回 false', async () => {
      // 准备：设置用户未登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      // 执行
      const { createPieceWorkRecord } = await import('./piecework')
      const result = await createPieceWorkRecord({
        user_id: 'user-001',
        quantity: 100,
        unit_price: 1.5,
        total_amount: 150,
        work_date: getDateString()
      })

      // 验证
      expect(result).toBe(false)
    })

    /**
     * 测试：缺少必填字段时应该返回 false
     * @requirements 4.2
     */
    it('缺少必填字段时应该返回 false', async () => {
      // 准备：设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-001' } },
        error: null
      })

      // 执行：缺少 user_id
      const { createPieceWorkRecord } = await import('./piecework')
      const result = await createPieceWorkRecord({
        user_id: '',
        quantity: 100,
        unit_price: 1.5,
        total_amount: 150,
        work_date: getDateString()
      })

      // 验证
      expect(result).toBe(false)
    })

    /**
     * 测试：数量为 0 或负数时应该返回 false
     * @requirements 4.2
     */
    it('数量为 0 或负数时应该返回 false', async () => {
      // 准备：设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-001' } },
        error: null
      })

      // 执行：数量为 0
      const { createPieceWorkRecord } = await import('./piecework')
      const result = await createPieceWorkRecord({
        user_id: 'user-001',
        quantity: 0,
        unit_price: 1.5,
        total_amount: 0,
        work_date: getDateString()
      })

      // 验证
      expect(result).toBe(false)
    })

    /**
     * 测试：Repository 创建失败时应该返回 false
     * @requirements 4.2
     */
    it('Repository 创建失败时应该返回 false', async () => {
      // 准备：设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-001' } },
        error: null
      })

      // Repository 返回 null（创建失败）
      mockPieceWorkRepository.createRecord.mockResolvedValue(null)

      // 执行
      const { createPieceWorkRecord } = await import('./piecework')
      const result = await createPieceWorkRecord({
        user_id: 'user-001',
        quantity: 100,
        unit_price: 1.5,
        total_amount: 150,
        work_date: getDateString()
      })

      // 验证
      expect(result).toBe(false)
    })
  })

  // ==================== 5.3 测试 updatePieceWorkRecord() ====================

  describe('updatePieceWorkRecord', () => {
    /**
     * 测试：应该更新计件记录
     * @requirements 4.3
     */
    it('应该更新计件记录', async () => {
      // 准备测试数据
      const recordId = 'record-001'
      const userId = 'user-001'
      const updatedRecord = createMockPiecework(userId, {
        id: recordId,
        quantity: 150,
        total_amount: 225
      })

      mockPieceWorkRepository.updateRecord.mockResolvedValue(updatedRecord)

      // 执行
      const { updatePieceWorkRecord } = await import('./piecework')
      const result = await updatePieceWorkRecord(recordId, {
        quantity: 150,
        total_amount: 225
      })

      // 验证
      expect(result).toBe(true)
      expect(mockPieceWorkRepository.updateRecord).toHaveBeenCalledWith(
        recordId,
        expect.objectContaining({
          quantity: 150,
          total_amount: 225
        })
      )
    })

    /**
     * 测试：更新成功后应该发布事件
     * @requirements 4.3
     */
    it('更新成功后应该发布事件', async () => {
      // 准备测试数据
      const recordId = 'record-001'
      const userId = 'user-001'
      const updatedRecord = createMockPiecework(userId, { id: recordId })

      mockPieceWorkRepository.updateRecord.mockResolvedValue(updatedRecord)

      // 执行
      const { updatePieceWorkRecord } = await import('./piecework')
      await updatePieceWorkRecord(recordId, { quantity: 150 })

      // 验证：事件被发布
      expect(mockPublish).toHaveBeenCalledWith('piece_work:updated', expect.objectContaining({
        id: recordId
      }))
    })

    /**
     * 测试：更新失败时应该返回 false
     * @requirements 4.3
     */
    it('更新失败时应该返回 false', async () => {
      // 准备
      mockPieceWorkRepository.updateRecord.mockResolvedValue(null)

      // 执行
      const { updatePieceWorkRecord } = await import('./piecework')
      const result = await updatePieceWorkRecord('record-001', { quantity: 150 })

      // 验证
      expect(result).toBe(false)
    })
  })

  // ==================== 5.4 测试 deletePieceWorkRecord() ====================

  describe('deletePieceWorkRecord', () => {
    /**
     * 测试：应该删除计件记录
     * @requirements 4.4
     */
    it('应该删除计件记录', async () => {
      // 准备
      const recordId = 'record-001'
      mockPieceWorkRepository.deleteRecord.mockResolvedValue(true)

      // 执行
      const { deletePieceWorkRecord } = await import('./piecework')
      const result = await deletePieceWorkRecord(recordId)

      // 验证
      expect(result).toBe(true)
      expect(mockPieceWorkRepository.deleteRecord).toHaveBeenCalledWith(recordId)
    })

    /**
     * 测试：删除失败时应该返回 false
     * @requirements 4.4
     */
    it('删除失败时应该返回 false', async () => {
      // 准备
      mockPieceWorkRepository.deleteRecord.mockResolvedValue(false)

      // 执行
      const { deletePieceWorkRecord } = await import('./piecework')
      const result = await deletePieceWorkRecord('record-001')

      // 验证
      expect(result).toBe(false)
    })
  })


  // ==================== 5.5 测试 getCategories() ====================

  describe('getAllCategories', () => {
    /**
     * 测试：应该返回所有品类
     * @requirements 4.5
     */
    it('应该返回所有品类', async () => {
      // 准备测试数据
      const mockCategories = createMockCategories(5)
      mockCategoriesRepository.getAllCategories.mockResolvedValue(mockCategories)

      // 执行
      const { getAllCategories } = await import('./piecework')
      const result = await getAllCategories()

      // 验证
      expect(result).toHaveLength(5)
      expect(mockCategoriesRepository.getAllCategories).toHaveBeenCalled()
    })

    /**
     * 测试：应该正确处理空结果
     * @requirements 4.5
     */
    it('应该正确处理空结果', async () => {
      // 准备
      mockCategoriesRepository.getAllCategories.mockResolvedValue([])

      // 执行
      const { getAllCategories } = await import('./piecework')
      const result = await getAllCategories()

      // 验证
      expect(result).toEqual([])
    })

    /**
     * 测试：应该调用 CategoriesRepository
     * @requirements 4.5
     */
    it('应该调用 CategoriesRepository', async () => {
      // 准备
      mockCategoriesRepository.getAllCategories.mockResolvedValue([])

      // 执行
      const { getAllCategories } = await import('./piecework')
      await getAllCategories()

      // 验证
      expect(mockCategoriesRepository.getAllCategories).toHaveBeenCalledTimes(1)
    })
  })

  describe('getActiveCategories', () => {
    /**
     * 测试：应该返回所有启用的品类
     * @requirements 4.5
     */
    it('应该返回所有启用的品类', async () => {
      // 准备测试数据
      const mockCategories = createMockCategories(3).map(c => ({ ...c, is_active: true }))
      mockCategoriesRepository.getActiveCategories.mockResolvedValue(mockCategories)

      // 执行
      const { getActiveCategories } = await import('./piecework')
      const result = await getActiveCategories()

      // 验证
      expect(result).toHaveLength(3)
      expect(mockCategoriesRepository.getActiveCategories).toHaveBeenCalled()
    })
  })

  // ==================== 5.6 测试 getCategoryPrices() ====================

  describe('getCategoryPricesByWarehouse', () => {
    /**
     * 测试：应该返回仓库的品类价格配置
     * @requirements 4.6
     */
    it('应该返回仓库的品类价格配置', async () => {
      // 准备测试数据
      const warehouseId = 'wh-001'
      const mockPrices = [
        {
          id: 'price-001',
          category_id: 'cat-001',
          warehouse_id: warehouseId,
          price: 1.5,
          driver_only_price: 1.5,
          driver_with_vehicle_price: 2.0
        },
        {
          id: 'price-002',
          category_id: 'cat-002',
          warehouse_id: warehouseId,
          price: 2.0,
          driver_only_price: 2.0,
          driver_with_vehicle_price: 2.5
        }
      ]
      const mockCategories = [
        createMockCategory({ id: 'cat-001', name: '搬运' }),
        createMockCategory({ id: 'cat-002', name: '装卸' })
      ]

      mockCategoryPricesRepository.getByWarehouse.mockResolvedValue(mockPrices)
      mockCategoriesRepository.getAllCategories.mockResolvedValue(mockCategories)

      // 执行
      const { getCategoryPricesByWarehouse } = await import('./piecework')
      const result = await getCategoryPricesByWarehouse(warehouseId)

      // 验证
      expect(result).toHaveLength(2)
      expect(mockCategoryPricesRepository.getByWarehouse).toHaveBeenCalledWith(warehouseId)
    })

    /**
     * 测试：应该正确映射品类名称
     * @requirements 4.6
     */
    it('应该正确映射品类名称', async () => {
      // 准备测试数据
      const warehouseId = 'wh-001'
      const mockPrices = [
        {
          id: 'price-001',
          category_id: 'cat-001',
          warehouse_id: warehouseId,
          price: 1.5,
          category_name: ''
        }
      ]
      const mockCategories = [
        createMockCategory({ id: 'cat-001', name: '搬运' })
      ]

      mockCategoryPricesRepository.getByWarehouse.mockResolvedValue(mockPrices)
      mockCategoriesRepository.getAllCategories.mockResolvedValue(mockCategories)

      // 执行
      const { getCategoryPricesByWarehouse } = await import('./piecework')
      const result = await getCategoryPricesByWarehouse(warehouseId)

      // 验证：品类名称被正确映射
      expect(result[0].category_name).toBe('搬运')
    })

    /**
     * 测试：应该正确处理空结果
     * @requirements 4.6
     */
    it('应该正确处理空结果', async () => {
      // 准备
      mockCategoryPricesRepository.getByWarehouse.mockResolvedValue([])
      mockCategoriesRepository.getAllCategories.mockResolvedValue([])

      // 执行
      const { getCategoryPricesByWarehouse } = await import('./piecework')
      const result = await getCategoryPricesByWarehouse('wh-001')

      // 验证
      expect(result).toEqual([])
    })
  })

  describe('getCategoryPrice', () => {
    /**
     * 测试：应该返回指定品类的价格配置
     * @requirements 4.6
     */
    it('应该返回指定品类的价格配置', async () => {
      // 准备测试数据
      const warehouseId = 'wh-001'
      const categoryId = 'cat-001'
      const mockPrice = {
        id: 'price-001',
        category_id: categoryId,
        warehouse_id: warehouseId,
        price: 1.5,
        driver_only_price: 1.5,
        driver_with_vehicle_price: 2.0
      }

      mockCategoryPricesRepository.getPrice.mockResolvedValue(mockPrice)

      // 执行
      const { getCategoryPrice } = await import('./piecework')
      const result = await getCategoryPrice(warehouseId, categoryId)

      // 验证
      expect(result).not.toBeNull()
      expect(mockCategoryPricesRepository.getPrice).toHaveBeenCalledWith(warehouseId, categoryId)
    })

    /**
     * 测试：品类价格不存在时应该返回 null
     * @requirements 4.6
     */
    it('品类价格不存在时应该返回 null', async () => {
      // 准备
      mockCategoryPricesRepository.getPrice.mockResolvedValue(null)

      // 执行
      const { getCategoryPrice } = await import('./piecework')
      const result = await getCategoryPrice('wh-001', 'cat-001')

      // 验证
      expect(result).toBeNull()
    })
  })

  describe('getCategoryPriceForDriver', () => {
    /**
     * 测试：应该根据司机类型返回正确的价格
     * @requirements 4.6
     */
    it('纯司机应该返回 driver_only_price', async () => {
      // 准备测试数据
      const mockPrice = {
        id: 'price-001',
        category_id: 'cat-001',
        warehouse_id: 'wh-001',
        driver_only_price: 1.5,
        driver_with_vehicle_price: 2.0
      }

      mockCategoryPricesRepository.getPrice.mockResolvedValue(mockPrice)

      // 执行
      const { getCategoryPriceForDriver } = await import('./piecework')
      const result = await getCategoryPriceForDriver('wh-001', 'cat-001', 'pure')

      // 验证
      expect(result).not.toBeNull()
      expect(result?.unitPrice).toBe(1.5)
      expect(result?.driverOnlyPrice).toBe(1.5)
      expect(result?.driverWithVehiclePrice).toBe(2.0)
    })

    /**
     * 测试：带车司机应该返回 driver_with_vehicle_price
     * @requirements 4.6
     */
    it('带车司机应该返回 driver_with_vehicle_price', async () => {
      // 准备测试数据
      const mockPrice = {
        id: 'price-001',
        category_id: 'cat-001',
        warehouse_id: 'wh-001',
        driver_only_price: 1.5,
        driver_with_vehicle_price: 2.0
      }

      mockCategoryPricesRepository.getPrice.mockResolvedValue(mockPrice)

      // 执行
      const { getCategoryPriceForDriver } = await import('./piecework')
      const result = await getCategoryPriceForDriver('wh-001', 'cat-001', 'with_vehicle')

      // 验证
      expect(result).not.toBeNull()
      expect(result?.unitPrice).toBe(2.0)
    })

    /**
     * 测试：价格不存在时应该返回 null
     * @requirements 4.6
     */
    it('价格不存在时应该返回 null', async () => {
      // 准备
      mockCategoryPricesRepository.getPrice.mockResolvedValue(null)

      // 执行
      const { getCategoryPriceForDriver } = await import('./piecework')
      const result = await getCategoryPriceForDriver('wh-001', 'cat-001', 'pure')

      // 验证
      expect(result).toBeNull()
    })
  })


  // ==================== 5.7 属性测试 ====================

  describe('属性测试', () => {
    /**
     * **Feature: core-api-unit-tests, Property 6**
     * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
     *
     * Property 6: 计件 CRUD 操作正确性
     * For any 计件 CRUD 操作，系统 SHALL 正确执行数据库操作并在修改操作后清除缓存
     */
    it('Property 6: 计件查询 API 应返回与 Repository 一致的数据', async () => {
      // 生成随机数量的计件记录（1-10 条）
      const userId = 'user-001'
      const recordCount = Math.floor(Math.random() * 10) + 1
      const mockRecords = createMockPieceworkRecords(userId, recordCount)

      // 设置 Repository 返回值
      mockPieceWorkRepository.getByUser.mockResolvedValue(mockRecords)

      // 执行
      const { getPieceWorkRecordsByUser } = await import('./piecework')
      const result = await getPieceWorkRecordsByUser(userId)

      // 验证：返回数据与 Repository 一致
      expect(result).toEqual(mockRecords)
      expect(result.length).toBe(recordCount)
    })

    /**
     * **Feature: core-api-unit-tests, Property 6**
     * **Validates: Requirements 4.2**
     *
     * Property 6: 创建计件记录应触发事件发布
     */
    it('Property 6: 创建计件记录应触发事件发布', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const mockRecord = createMockPiecework(userId, { id: 'record-001' })

      // 设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: userId } },
        error: null
      })

      mockPieceWorkRepository.createRecord.mockResolvedValue(mockRecord)

      // 执行
      const { createPieceWorkRecord } = await import('./piecework')
      await createPieceWorkRecord({
        user_id: userId,
        quantity: 100,
        unit_price: 1.5,
        total_amount: 150,
        work_date: getDateString()
      })

      // 验证：事件被发布
      expect(mockPublish).toHaveBeenCalledWith('piece_work:created', expect.any(Object))
    })

    /**
     * **Feature: core-api-unit-tests, Property 6**
     * **Validates: Requirements 4.3**
     *
     * Property 6: 更新计件记录应触发事件发布
     */
    it('Property 6: 更新计件记录应触发事件发布', async () => {
      // 准备测试数据
      const recordId = 'record-001'
      const userId = 'user-001'
      const updatedRecord = createMockPiecework(userId, { id: recordId })

      mockPieceWorkRepository.updateRecord.mockResolvedValue(updatedRecord)

      // 执行
      const { updatePieceWorkRecord } = await import('./piecework')
      await updatePieceWorkRecord(recordId, { quantity: 150 })

      // 验证：事件被发布
      expect(mockPublish).toHaveBeenCalledWith('piece_work:updated', expect.any(Object))
    })

    /**
     * **Feature: core-api-unit-tests, Property 6**
     * **Validates: Requirements 4.5**
     *
     * Property 6: 品类查询应正确调用 Repository
     */
    it('Property 6: 品类查询应正确调用 Repository', async () => {
      // 准备
      const mockCategories = createMockCategories(5)
      mockCategoriesRepository.getAllCategories.mockResolvedValue(mockCategories)

      // 执行
      const { getAllCategories } = await import('./piecework')
      const result = await getAllCategories()

      // 验证
      expect(result).toEqual(mockCategories)
      expect(mockCategoriesRepository.getAllCategories).toHaveBeenCalled()
    })

    /**
     * **Feature: core-api-unit-tests, Property 6**
     * **Validates: Requirements 4.6**
     *
     * Property 6: 品类价格查询应正确调用 Repository
     */
    it('Property 6: 品类价格查询应正确调用 Repository', async () => {
      // 准备
      const warehouseId = 'wh-001'
      const mockPrices = [
        {
          id: 'price-001',
          category_id: 'cat-001',
          warehouse_id: warehouseId,
          price: 1.5
        }
      ]
      mockCategoryPricesRepository.getByWarehouse.mockResolvedValue(mockPrices)
      mockCategoriesRepository.getAllCategories.mockResolvedValue([])

      // 执行
      const { getCategoryPricesByWarehouse } = await import('./piecework')
      await getCategoryPricesByWarehouse(warehouseId)

      // 验证
      expect(mockCategoryPricesRepository.getByWarehouse).toHaveBeenCalledWith(warehouseId)
    })

    /**
     * **Feature: core-api-unit-tests, Property 6**
     * **Validates: Requirements 4.1**
     *
     * Property 6: 仓库计件记录查询应正确调用 Repository
     */
    it('Property 6: 仓库计件记录查询应正确调用 Repository', async () => {
      // 准备
      const warehouseId = 'wh-001'
      const mockRecords = [
        createMockPiecework('user-001', { warehouse_id: warehouseId }),
        createMockPiecework('user-002', { warehouse_id: warehouseId })
      ]
      mockPieceWorkRepository.getByWarehouse.mockResolvedValue(mockRecords)

      // 执行
      const { getPieceWorkRecordsByWarehouse } = await import('./piecework')
      const result = await getPieceWorkRecordsByWarehouse(warehouseId)

      // 验证
      expect(result).toEqual(mockRecords)
      expect(mockPieceWorkRepository.getByWarehouse).toHaveBeenCalledWith(warehouseId, undefined, undefined)
    })

    /**
     * **Feature: core-api-unit-tests, Property 6**
     * **Validates: Requirements 4.4**
     *
     * Property 6: 删除计件记录应正确调用 Repository
     */
    it('Property 6: 删除计件记录应正确调用 Repository', async () => {
      // 准备
      const recordId = 'record-001'
      mockPieceWorkRepository.deleteRecord.mockResolvedValue(true)

      // 执行
      const { deletePieceWorkRecord } = await import('./piecework')
      const result = await deletePieceWorkRecord(recordId)

      // 验证
      expect(result).toBe(true)
      expect(mockPieceWorkRepository.deleteRecord).toHaveBeenCalledWith(recordId)
    })

    /**
     * **Feature: core-api-unit-tests, Property 6**
     * **Validates: Requirements 4.1**
     *
     * Property 6: 用户仓库计件记录查询应正确调用 Repository
     */
    it('Property 6: 用户仓库计件记录查询应正确调用 Repository', async () => {
      // 准备
      const userId = 'user-001'
      const warehouseId = 'wh-001'
      const startDate = '2024-12-01'
      const endDate = '2024-12-31'
      const mockRecords = createMockPieceworkRecords(userId, 3)
      mockPieceWorkRepository.getByUserAndWarehouse.mockResolvedValue(mockRecords)

      // 执行
      const { getPieceWorkRecordsByUserAndWarehouse } = await import('./piecework')
      const result = await getPieceWorkRecordsByUserAndWarehouse(userId, warehouseId, startDate, endDate)

      // 验证
      expect(result).toEqual(mockRecords)
      expect(mockPieceWorkRepository.getByUserAndWarehouse).toHaveBeenCalledWith(
        userId,
        warehouseId,
        startDate,
        endDate
      )
    })
  })

  // ==================== 品类管理 API 测试 ====================

  describe('品类管理 API', () => {
    /**
     * 测试：createCategory 应该创建品类
     */
    it('应该创建品类', async () => {
      // 准备测试数据
      const mockCategory = createMockCategory({ id: 'cat-001', name: '新品类' })
      mockCategoriesRepository.createCategory.mockResolvedValue(mockCategory)

      // 执行
      const { createCategory } = await import('./piecework')
      const result = await createCategory({
        name: '新品类',
        description: '品类描述'
      })

      // 验证
      expect(result).not.toBeNull()
      expect(result?.name).toBe('新品类')
      expect(mockCategoriesRepository.createCategory).toHaveBeenCalled()
    })

    /**
     * 测试：updateCategory 应该更新品类
     */
    it('应该更新品类', async () => {
      // 准备
      mockCategoriesRepository.updateCategory.mockResolvedValue(true)

      // 执行
      const { updateCategory } = await import('./piecework')
      const result = await updateCategory('cat-001', { name: '更新后的名称' })

      // 验证
      expect(result).toBe(true)
      expect(mockCategoriesRepository.updateCategory).toHaveBeenCalledWith(
        'cat-001',
        expect.objectContaining({ name: '更新后的名称' })
      )
    })

    /**
     * 测试：deleteCategory 应该删除品类
     */
    it('应该删除品类', async () => {
      // 准备
      mockCategoriesRepository.deleteCategory.mockResolvedValue(true)

      // 执行
      const { deleteCategory } = await import('./piecework')
      const result = await deleteCategory('cat-001')

      // 验证
      expect(result).toBe(true)
      expect(mockCategoriesRepository.deleteCategory).toHaveBeenCalledWith('cat-001')
    })
  })

  // ==================== 品类价格管理 API 测试 ====================

  describe('品类价格管理 API', () => {
    /**
     * 测试：upsertCategoryPrice 应该创建或更新品类价格
     */
    it('应该创建或更新品类价格', async () => {
      // 准备：设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-001' } },
        error: null
      })

      mockCategoryPricesRepository.upsertPrice.mockResolvedValue(true)

      // 执行
      const { upsertCategoryPrice } = await import('./piecework')
      const result = await upsertCategoryPrice({
        warehouse_id: 'wh-001',
        category_id: 'cat-001',
        price: 1.5
      })

      // 验证
      expect(result).toBe(true)
      expect(mockCategoryPricesRepository.upsertPrice).toHaveBeenCalled()
    })

    /**
     * 测试：未登录时 upsertCategoryPrice 应该返回 false
     */
    it('未登录时 upsertCategoryPrice 应该返回 false', async () => {
      // 准备：设置用户未登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      // 执行
      const { upsertCategoryPrice } = await import('./piecework')
      const result = await upsertCategoryPrice({
        warehouse_id: 'wh-001',
        category_id: 'cat-001',
        price: 1.5
      })

      // 验证
      expect(result).toBe(false)
    })

    /**
     * 测试：batchUpsertCategoryPrices 应该批量创建或更新品类价格
     */
    it('应该批量创建或更新品类价格', async () => {
      // 准备：设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-001' } },
        error: null
      })

      mockCategoryPricesRepository.batchUpsertPrices.mockResolvedValue([
        { id: 'price-001' },
        { id: 'price-002' }
      ])

      // 执行
      const { batchUpsertCategoryPrices } = await import('./piecework')
      const result = await batchUpsertCategoryPrices([
        { warehouse_id: 'wh-001', category_id: 'cat-001', price: 1.5 },
        { warehouse_id: 'wh-001', category_id: 'cat-002', price: 2.0 }
      ])

      // 验证
      expect(result).toBe(true)
      expect(mockCategoryPricesRepository.batchUpsertPrices).toHaveBeenCalled()
    })

    /**
     * 测试：空数组时 batchUpsertCategoryPrices 应该返回 true
     */
    it('空数组时 batchUpsertCategoryPrices 应该返回 true', async () => {
      // 准备：设置用户已登录
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: 'user-001' } },
        error: null
      })

      // 执行
      const { batchUpsertCategoryPrices } = await import('./piecework')
      const result = await batchUpsertCategoryPrices([])

      // 验证
      expect(result).toBe(true)
    })

    /**
     * 测试：deleteCategoryPrice 应该删除品类价格
     */
    it('应该删除品类价格', async () => {
      // 准备
      mockCategoryPricesRepository.deletePrice.mockResolvedValue(true)

      // 执行
      const { deleteCategoryPrice } = await import('./piecework')
      const result = await deleteCategoryPrice('price-001')

      // 验证
      expect(result).toBe(true)
      expect(mockCategoryPricesRepository.deletePrice).toHaveBeenCalledWith('price-001')
    })
  })

  // ==================== 计件统计 API 测试 ====================

  describe('calculatePieceWorkStats', () => {
    /**
     * 测试：应该计算计件统计数据
     */
    it('应该计算计件统计数据', async () => {
      // 准备测试数据
      const userId = 'user-001'
      const warehouseId = 'wh-001'
      const mockRecords = [
        createMockPiecework(userId, {
          category_id: 'cat-001',
          quantity: 100,
          total_amount: 150
        }),
        createMockPiecework(userId, {
          category_id: 'cat-001',
          quantity: 50,
          total_amount: 75
        }),
        createMockPiecework(userId, {
          category_id: 'cat-002',
          quantity: 80,
          total_amount: 120
        })
      ]
      const mockCategories = [
        createMockCategory({ id: 'cat-001', name: '搬运' }),
        createMockCategory({ id: 'cat-002', name: '装卸' })
      ]

      mockPieceWorkRepository.getByUserAndWarehouse.mockResolvedValue(mockRecords)
      mockCategoriesRepository.getAllCategories.mockResolvedValue(mockCategories)

      // 执行
      const { calculatePieceWorkStats } = await import('./piecework')
      const result = await calculatePieceWorkStats(userId, warehouseId)

      // 验证
      expect(result.total_orders).toBe(3)
      expect(result.total_quantity).toBe(230)
      expect(result.total_amount).toBe(345)
      expect(result.by_category).toHaveLength(2)
    })

    /**
     * 测试：空记录时应该返回零值统计
     */
    it('空记录时应该返回零值统计', async () => {
      // 准备
      mockPieceWorkRepository.getByUserAndWarehouse.mockResolvedValue([])
      mockCategoriesRepository.getAllCategories.mockResolvedValue([])

      // 执行
      const { calculatePieceWorkStats } = await import('./piecework')
      const result = await calculatePieceWorkStats('user-001', 'wh-001')

      // 验证
      expect(result.total_orders).toBe(0)
      expect(result.total_quantity).toBe(0)
      expect(result.total_amount).toBe(0)
      expect(result.by_category).toHaveLength(0)
    })
  })
})
