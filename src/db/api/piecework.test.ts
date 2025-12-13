/**
 * 计件管理 API - 单元测试
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'

// Mock Supabase
const mockSelect = vi.fn().mockReturnThis()
const mockInsert = vi.fn().mockReturnThis()
const mockUpdate = vi.fn().mockReturnThis()
const mockDelete = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockIn = vi.fn().mockReturnThis()
const mockGte = vi.fn().mockReturnThis()
const mockLte = vi.fn().mockReturnThis()
const mockOrder = vi.fn().mockReturnThis()
const mockMaybeSingle = vi.fn()
const mockUpsert = vi.fn().mockReturnThis()

vi.mock('@/client/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      upsert: mockUpsert,
      eq: mockEq,
      in: mockIn,
      gte: mockGte,
      lte: mockLte,
      order: mockOrder,
      maybeSingle: mockMaybeSingle
    })),
    auth: {
      getUser: vi.fn()
    }
  }
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    db: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }))
}))

import {supabase} from '@/client/supabase'

describe('piecework API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnThis()
    mockInsert.mockReturnThis()
    mockUpdate.mockReturnThis()
    mockDelete.mockReturnThis()
    mockUpsert.mockReturnThis()
    mockEq.mockReturnThis()
    mockIn.mockReturnThis()
    mockGte.mockReturnThis()
    mockLte.mockReturnThis()
    mockOrder.mockReturnThis()
  })

  // ==================== 计件记录 API 测试 ====================

  describe('getPieceWorkRecordsByUser', () => {
    it('应该返回用户的计件记录', async () => {
      const mockRecords = [
        {id: 'r-1', user_id: 'user-1', quantity: 100, work_date: '2024-12-01'},
        {id: 'r-2', user_id: 'user-1', quantity: 150, work_date: '2024-12-02'}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockRecords, error: null})
      } as any)

      const {getPieceWorkRecordsByUser} = await import('./piecework')
      const result = await getPieceWorkRecordsByUser('user-1')

      expect(supabase.from).toHaveBeenCalledWith('piece_work_records')
      expect(result).toEqual(mockRecords)
    })

    it('应该支持日期范围筛选', async () => {
      const mockRecords = [{id: 'r-1', user_id: 'user-1', quantity: 100}]

      const mockGteFn = vi.fn()
      const mockLteFn = vi.fn()

      // 创建一个完整的链式调用对象
      const createChain = () => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          gte: mockGteFn,
          lte: mockLteFn,
          order: vi.fn(() => chain),
          then: (resolve: any) => resolve({data: mockRecords, error: null})
        }
        mockGteFn.mockReturnValue(chain)
        mockLteFn.mockReturnValue(chain)
        return chain
      }

      vi.mocked(supabase.from).mockReturnValue(createChain() as any)

      const {getPieceWorkRecordsByUser} = await import('./piecework')
      await getPieceWorkRecordsByUser('user-1', '2024-12-01', '2024-12-31')

      expect(mockGteFn).toHaveBeenCalledWith('work_date', '2024-12-01')
      expect(mockLteFn).toHaveBeenCalledWith('work_date', '2024-12-31')
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getPieceWorkRecordsByUser} = await import('./piecework')
      const result = await getPieceWorkRecordsByUser('user-1')

      expect(result).toEqual([])
    })
  })

  describe('getPieceWorkRecordsByWarehouse', () => {
    it('应该返回仓库的计件记录', async () => {
      const mockRecords = [
        {id: 'r-1', warehouse_id: 'wh-1', quantity: 100},
        {id: 'r-2', warehouse_id: 'wh-1', quantity: 200}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockRecords, error: null})
      } as any)

      const {getPieceWorkRecordsByWarehouse} = await import('./piecework')
      const result = await getPieceWorkRecordsByWarehouse('wh-1')

      expect(result).toEqual(mockRecords)
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getPieceWorkRecordsByWarehouse} = await import('./piecework')
      const result = await getPieceWorkRecordsByWarehouse('wh-1')

      expect(result).toEqual([])
    })
  })

  describe('getPieceWorkRecordsByUserAndWarehouse', () => {
    it('应该返回用户在指定仓库的计件记录', async () => {
      const mockRecords = [{id: 'r-1', user_id: 'user-1', warehouse_id: 'wh-1', quantity: 100}]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockRecords, error: null})
      } as any)

      const {getPieceWorkRecordsByUserAndWarehouse} = await import('./piecework')
      const result = await getPieceWorkRecordsByUserAndWarehouse('user-1', 'wh-1')

      expect(result).toEqual(mockRecords)
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getPieceWorkRecordsByUserAndWarehouse} = await import('./piecework')
      const result = await getPieceWorkRecordsByUserAndWarehouse('user-1', 'wh-1')

      expect(result).toEqual([])
    })
  })

  describe('getAllPieceWorkRecords', () => {
    it('应该返回所有计件记录', async () => {
      const mockRecords = [
        {id: 'r-1', quantity: 100},
        {id: 'r-2', quantity: 200}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockRecords, error: null})
      } as any)

      const {getAllPieceWorkRecords} = await import('./piecework')
      const result = await getAllPieceWorkRecords()

      expect(result).toEqual(mockRecords)
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getAllPieceWorkRecords} = await import('./piecework')
      const result = await getAllPieceWorkRecords()

      expect(result).toEqual([])
    })
  })

  describe('createPieceWorkRecord', () => {
    it('应该在用户未登录时返回false', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: null},
        error: null
      } as any)

      const {createPieceWorkRecord} = await import('./piecework')
      const result = await createPieceWorkRecord({user_id: 'user-1', quantity: 100} as any)

      expect(result).toBe(false)
    })

    it('应该在参数无效时返回false', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      const {createPieceWorkRecord} = await import('./piecework')
      
      // 缺少 user_id
      const result1 = await createPieceWorkRecord({quantity: 100} as any)
      expect(result1).toBe(false)

      // quantity <= 0
      const result2 = await createPieceWorkRecord({user_id: 'user-1', quantity: 0} as any)
      expect(result2).toBe(false)
    })

    it('应该成功创建计件记录', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {createPieceWorkRecord} = await import('./piecework')
      const result = await createPieceWorkRecord({
        user_id: 'user-1',
        quantity: 100,
        warehouse_id: 'wh-1'
      } as any)

      expect(result).toBe(true)
    })

    it('应该在创建失败时返回false', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({error: new Error('创建失败')})
      } as any)

      const {createPieceWorkRecord} = await import('./piecework')
      const result = await createPieceWorkRecord({
        user_id: 'user-1',
        quantity: 100
      } as any)

      expect(result).toBe(false)
    })
  })

  describe('updatePieceWorkRecord', () => {
    it('应该成功更新计件记录', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {updatePieceWorkRecord} = await import('./piecework')
      const result = await updatePieceWorkRecord('r-1', {quantity: 200})

      expect(result).toBe(true)
    })

    it('应该在更新失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('更新失败')})
      } as any)

      const {updatePieceWorkRecord} = await import('./piecework')
      const result = await updatePieceWorkRecord('r-1', {quantity: 200})

      expect(result).toBe(false)
    })
  })

  describe('deletePieceWorkRecord', () => {
    it('应该成功删除计件记录', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {deletePieceWorkRecord} = await import('./piecework')
      const result = await deletePieceWorkRecord('r-1')

      expect(result).toBe(true)
    })

    it('应该在删除失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('删除失败')})
      } as any)

      const {deletePieceWorkRecord} = await import('./piecework')
      const result = await deletePieceWorkRecord('r-1')

      expect(result).toBe(false)
    })
  })

  // ==================== 计件品类管理 API 测试 ====================

  describe('getActiveCategories', () => {
    it('应该返回所有启用的品类', async () => {
      const mockCategories = [
        {id: 'cat-1', name: '品类A', description: '描述A', created_at: '2024-01-01', updated_at: '2024-01-01'},
        {id: 'cat-2', name: '品类B', description: '描述B', created_at: '2024-01-01', updated_at: '2024-01-01'}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockCategories, error: null})
      } as any)

      const {getActiveCategories} = await import('./piecework')
      const result = await getActiveCategories()

      expect(result.length).toBe(2)
      expect(result[0].name).toBe('品类A')
      expect(result[0].is_active).toBe(true)
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getActiveCategories} = await import('./piecework')
      const result = await getActiveCategories()

      expect(result).toEqual([])
    })
  })

  describe('getAllCategories', () => {
    it('应该返回所有品类', async () => {
      const mockCategories = [
        {id: 'cat-1', name: '品类A', description: '描述A', created_at: '2024-01-01', updated_at: '2024-01-01'}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockCategories, error: null})
      } as any)

      const {getAllCategories} = await import('./piecework')
      const result = await getAllCategories()

      expect(result.length).toBe(1)
      expect(result[0].category_name).toBe('品类A')
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getAllCategories} = await import('./piecework')
      const result = await getAllCategories()

      expect(result).toEqual([])
    })
  })

  describe('createCategory', () => {
    it('应该成功创建品类', async () => {
      const newCategory = {id: 'cat-new', name: '新品类', description: '描述', created_at: '2024-01-01', updated_at: '2024-01-01'}

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: newCategory, error: null})
      } as any)

      const {createCategory} = await import('./piecework')
      const result = await createCategory({name: '新品类', description: '描述'})

      expect(result).not.toBeNull()
      expect(result?.name).toBe('新品类')
    })

    it('应该在创建失败时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: new Error('创建失败')})
      } as any)

      const {createCategory} = await import('./piecework')
      const result = await createCategory({name: '新品类'})

      expect(result).toBeNull()
    })
  })

  describe('updateCategory', () => {
    it('应该成功更新品类', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {updateCategory} = await import('./piecework')
      const result = await updateCategory('cat-1', {name: '更新后的品类'})

      expect(result).toBe(true)
    })

    it('应该在更新失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('更新失败')})
      } as any)

      const {updateCategory} = await import('./piecework')
      const result = await updateCategory('cat-1', {name: '更新后的品类'})

      expect(result).toBe(false)
    })
  })

  describe('deleteCategory', () => {
    it('应该成功删除品类及关联价格', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        return {
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({error: null})
        } as any
      })

      const {deleteCategory} = await import('./piecework')
      const result = await deleteCategory('cat-1')

      expect(result).toBe(true)
    })

    it('应该在删除关联价格失败时返回false', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'category_prices') {
          return {
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({error: new Error('删除失败')})
          } as any
        }
        return {
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({error: null})
        } as any
      })

      const {deleteCategory} = await import('./piecework')
      const result = await deleteCategory('cat-1')

      expect(result).toBe(false)
    })
  })

  describe('deleteUnusedCategories', () => {
    it('应该成功删除未使用的品类', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'category_prices') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({data: [{category_id: 'cat-1'}], error: null})
          } as any
        }
        if (table === 'piece_work_categories') {
          return {
            select: vi.fn().mockResolvedValue({data: [{id: 'cat-1'}, {id: 'cat-2'}], error: null}),
            delete: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({error: null})
          } as any
        }
        return {} as any
      })

      const {deleteUnusedCategories} = await import('./piecework')
      const result = await deleteUnusedCategories()

      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(1)
    })

    it('应该在没有未使用品类时返回0', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'category_prices') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({data: [{category_id: 'cat-1'}], error: null})
          } as any
        }
        if (table === 'piece_work_categories') {
          return {
            select: vi.fn().mockResolvedValue({data: [{id: 'cat-1'}], error: null})
          } as any
        }
        return {} as any
      })

      const {deleteUnusedCategories} = await import('./piecework')
      const result = await deleteUnusedCategories()

      expect(result.success).toBe(true)
      expect(result.deletedCount).toBe(0)
    })
  })

  // ==================== 品类价格配置 API 测试 ====================

  describe('getCategoryPricesByWarehouse', () => {
    it('应该返回仓库的品类价格配置', async () => {
      const mockPrices = [
        {id: 'p-1', warehouse_id: 'wh-1', category_id: 'cat-1', price: 10, piece_work_categories: {name: '品类A'}},
        {id: 'p-2', warehouse_id: 'wh-1', category_id: 'cat-2', price: 20, piece_work_categories: {name: '品类B'}}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockPrices, error: null})
      } as any)

      const {getCategoryPricesByWarehouse} = await import('./piecework')
      const result = await getCategoryPricesByWarehouse('wh-1')

      expect(result.length).toBe(2)
      expect(result[0].category_name).toBe('品类A')
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getCategoryPricesByWarehouse} = await import('./piecework')
      const result = await getCategoryPricesByWarehouse('wh-1')

      expect(result).toEqual([])
    })
  })

  describe('getCategoryPrice', () => {
    it('应该返回指定品类价格配置', async () => {
      const mockPrice = {id: 'p-1', warehouse_id: 'wh-1', category_id: 'cat-1', price: 10}

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: mockPrice, error: null})
      } as any)

      const {getCategoryPrice} = await import('./piecework')
      const result = await getCategoryPrice('wh-1', 'cat-1')

      expect(result).toEqual(mockPrice)
    })

    it('应该在价格不存在时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
      } as any)

      const {getCategoryPrice} = await import('./piecework')
      const result = await getCategoryPrice('wh-1', 'cat-1')

      expect(result).toBeNull()
    })
  })

  describe('upsertCategoryPrice', () => {
    it('应该在用户未登录时返回false', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: null},
        error: null
      } as any)

      const {upsertCategoryPrice} = await import('./piecework')
      const result = await upsertCategoryPrice({
        warehouse_id: 'wh-1',
        category_id: 'cat-1',
        price: 10
      } as any)

      expect(result).toBe(false)
    })

    it('应该成功保存品类价格配置', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {upsertCategoryPrice} = await import('./piecework')
      const result = await upsertCategoryPrice({
        warehouse_id: 'wh-1',
        category_id: 'cat-1',
        price: 10,
        driver_type: 'driver_only',
        effective_date: '2024-01-01'
      })

      expect(result).toBe(true)
    })
  })

  describe('batchUpsertCategoryPrices', () => {
    it('应该在用户未登录时返回false', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: null},
        error: null
      } as any)

      const {batchUpsertCategoryPrices} = await import('./piecework')
      const result = await batchUpsertCategoryPrices([
        {warehouse_id: 'wh-1', category_id: 'cat-1', price: 10} as any
      ])

      expect(result).toBe(false)
    })

    it('应该成功批量保存品类价格配置', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {batchUpsertCategoryPrices} = await import('./piecework')
      const result = await batchUpsertCategoryPrices([
        {warehouse_id: 'wh-1', category_id: 'cat-1', price: 10, driver_type: 'driver_only', effective_date: '2024-01-01'},
        {warehouse_id: 'wh-1', category_id: 'cat-2', price: 20, driver_type: 'driver_only', effective_date: '2024-01-01'}
      ])

      expect(result).toBe(true)
    })

    it('应该在批量保存失败时返回false', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn().mockResolvedValue({error: new Error('保存失败')})
      } as any)

      const {batchUpsertCategoryPrices} = await import('./piecework')
      const result = await batchUpsertCategoryPrices([
        {warehouse_id: 'wh-1', category_id: 'cat-1', price: 10} as any
      ])

      expect(result).toBe(false)
    })
  })

  describe('deleteCategoryPrice', () => {
    it('应该成功删除品类价格配置', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {deleteCategoryPrice} = await import('./piecework')
      const result = await deleteCategoryPrice('p-1')

      expect(result).toBe(true)
    })

    it('应该在删除失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('删除失败')})
      } as any)

      const {deleteCategoryPrice} = await import('./piecework')
      const result = await deleteCategoryPrice('p-1')

      expect(result).toBe(false)
    })
  })

  describe('getCategoryPriceForDriver', () => {
    it('应该返回司机的品类价格', async () => {
      const mockPrices = [
        {price: 10, driver_type: 'driver_only'},
        {price: 15, driver_type: 'with_helper'}
      ]

      // 创建链式调用，eq 返回自身以支持多次调用
      const createChain = (resolveData: any) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          then: (resolve: any) => resolve(resolveData)
        }
        return chain
      }

      vi.mocked(supabase.from).mockReturnValue(createChain({data: mockPrices, error: null}) as any)

      const {getCategoryPriceForDriver} = await import('./piecework')
      const result = await getCategoryPriceForDriver('wh-1', 'cat-1')

      expect(result).not.toBeNull()
      expect(result?.unitPrice).toBe(10)
    })

    it('应该在没有价格配置时返回null', async () => {
      const createChain = (resolveData: any) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          then: (resolve: any) => resolve(resolveData)
        }
        return chain
      }

      vi.mocked(supabase.from).mockReturnValue(createChain({data: [], error: null}) as any)

      const {getCategoryPriceForDriver} = await import('./piecework')
      const result = await getCategoryPriceForDriver('wh-1', 'cat-1')

      expect(result).toBeNull()
    })

    it('应该在查询失败时返回null', async () => {
      const createChain = (resolveData: any) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          then: (resolve: any) => resolve(resolveData)
        }
        return chain
      }

      vi.mocked(supabase.from).mockReturnValue(createChain({data: null, error: new Error('查询失败')}) as any)

      const {getCategoryPriceForDriver} = await import('./piecework')
      const result = await getCategoryPriceForDriver('wh-1', 'cat-1')

      expect(result).toBeNull()
    })
  })

  // ==================== 计件统计 API 测试 ====================

  describe('calculatePieceWorkStats', () => {
    it('应该正确计算计件统计', async () => {
      const mockRecords = [
        {id: 'r-1', category_id: 'cat-1', quantity: 100, total_amount: 1000},
        {id: 'r-2', category_id: 'cat-1', quantity: 50, total_amount: 500},
        {id: 'r-3', category_id: 'cat-2', quantity: 80, total_amount: 800}
      ]

      const mockCategoryPrices = [{category_id: 'cat-1'}, {category_id: 'cat-2'}]
      const mockCategories = [
        {id: 'cat-1', name: '品类A'},
        {id: 'cat-2', name: '品类B'}
      ]

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'piece_work_records') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({data: mockRecords, error: null})
          } as any
        }
        if (table === 'category_prices') {
          return {
            select: vi.fn().mockResolvedValue({data: mockCategoryPrices, error: null})
          } as any
        }
        if (table === 'piece_work_categories') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({data: mockCategories, error: null})
          } as any
        }
        return {} as any
      })

      const {calculatePieceWorkStats} = await import('./piecework')
      const result = await calculatePieceWorkStats('user-1', 'wh-1')

      expect(result.total_orders).toBe(3)
      expect(result.total_quantity).toBe(230)
      expect(result.total_amount).toBe(2300)
      expect(result.by_category.length).toBe(2)
    })

    it('应该在没有品类价格时返回空统计', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'piece_work_records') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({data: [], error: null})
          } as any
        }
        if (table === 'category_prices') {
          return {
            select: vi.fn().mockResolvedValue({data: [], error: null})
          } as any
        }
        return {} as any
      })

      const {calculatePieceWorkStats} = await import('./piecework')
      const result = await calculatePieceWorkStats('user-1', 'wh-1')

      expect(result.total_orders).toBe(0)
      expect(result.total_quantity).toBe(0)
      expect(result.total_amount).toBe(0)
      expect(result.by_category).toEqual([])
    })
  })
})
