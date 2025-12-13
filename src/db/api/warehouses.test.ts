/**
 * 仓库管理 API - 单元测试
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'

// Mock Supabase
const mockSelect = vi.fn().mockReturnThis()
const mockInsert = vi.fn().mockReturnThis()
const mockUpdate = vi.fn().mockReturnThis()
const mockDelete = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockIn = vi.fn().mockReturnThis()
const mockOrder = vi.fn().mockReturnThis()
const mockLimit = vi.fn().mockReturnThis()
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
      order: mockOrder,
      limit: mockLimit,
      maybeSingle: mockMaybeSingle
    })),
    auth: {
      getUser: vi.fn()
    }
  }
}))

// Mock cache
vi.mock('@/utils/cache', () => ({
  CACHE_KEYS: {
    WAREHOUSE_ASSIGNMENTS: 'warehouse_assignments',
    ALL_WAREHOUSES: 'all_warehouses'
  },
  getCache: vi.fn(),
  setCache: vi.fn(),
  clearCache: vi.fn(),
  clearManagerWarehousesCache: vi.fn()
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

// Mock helpers
vi.mock('../helpers', () => ({
  convertUserToProfile: vi.fn((user) => ({
    ...user,
    id: user.id,
    name: user.name,
    role: user.role || 'DRIVER'
  }))
}))

// Mock attendance module
vi.mock('./attendance', () => ({
  getAllAttendanceRules: vi.fn().mockResolvedValue([])
}))

import {supabase} from '@/client/supabase'
import {getCache, setCache} from '@/utils/cache'

describe('warehouses API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect.mockReturnThis()
    mockInsert.mockReturnThis()
    mockUpdate.mockReturnThis()
    mockDelete.mockReturnThis()
    mockUpsert.mockReturnThis()
    mockEq.mockReturnThis()
    mockIn.mockReturnThis()
    mockOrder.mockReturnThis()
    mockLimit.mockReturnThis()
  })

  describe('getActiveWarehouses', () => {
    it('应该返回所有启用的仓库', async () => {
      const mockWarehouses = [
        {id: 'wh-1', name: '仓库1', is_active: true},
        {id: 'wh-2', name: '仓库2', is_active: true}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockWarehouses, error: null})
      } as any)

      const {getActiveWarehouses} = await import('./warehouses')
      const result = await getActiveWarehouses()

      expect(supabase.from).toHaveBeenCalledWith('warehouses')
      expect(result).toEqual(mockWarehouses)
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getActiveWarehouses} = await import('./warehouses')
      const result = await getActiveWarehouses()

      expect(result).toEqual([])
    })
  })

  describe('getAllWarehouses', () => {
    it('应该返回所有仓库', async () => {
      const mockWarehouses = [
        {id: 'wh-1', name: '仓库1', is_active: true},
        {id: 'wh-2', name: '仓库2', is_active: false}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockWarehouses, error: null})
      } as any)

      const {getAllWarehouses} = await import('./warehouses')
      const result = await getAllWarehouses()

      expect(result).toEqual(mockWarehouses)
    })
  })

  describe('getWarehouseById', () => {
    it('应该返回指定仓库', async () => {
      const mockWarehouse = {id: 'wh-1', name: '仓库1', address: '地址1'}

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: mockWarehouse, error: null})
      } as any)

      const {getWarehouseById} = await import('./warehouses')
      const result = await getWarehouseById('wh-1')

      expect(result).toEqual(mockWarehouse)
    })

    it('应该在仓库不存在时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
      } as any)

      const {getWarehouseById} = await import('./warehouses')
      const result = await getWarehouseById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('createWarehouse', () => {
    it('应该在用户未登录时抛出错误', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: null},
        error: null
      } as any)

      const {createWarehouse} = await import('./warehouses')

      await expect(
        createWarehouse({name: '新仓库', address: '地址'})
      ).rejects.toThrow('用户未登录')
    })

    it('应该在名称为空时抛出错误', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      const {createWarehouse} = await import('./warehouses')

      await expect(
        createWarehouse({name: '', address: '地址'})
      ).rejects.toThrow('仓库名称不能为空')
    })

    it('应该在地址为空时抛出错误', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      const {createWarehouse} = await import('./warehouses')

      await expect(
        createWarehouse({name: '仓库', address: ''})
      ).rejects.toThrow('仓库地址不能为空')
    })

    it('应该成功创建仓库', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      const newWarehouse = {id: 'wh-new', name: '新仓库', address: '新地址'}

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: newWarehouse, error: null})
      } as any)

      const {createWarehouse} = await import('./warehouses')
      const result = await createWarehouse({name: '新仓库', address: '新地址'})

      expect(result).toEqual(newWarehouse)
    })

    it('应该在名称重复时抛出错误', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: {code: '23505', message: 'warehouses_name_key'}
        })
      } as any)

      const {createWarehouse} = await import('./warehouses')

      await expect(
        createWarehouse({name: '重复仓库', address: '地址'})
      ).rejects.toThrow('仓库名称已存在')
    })
  })

  describe('updateWarehouse', () => {
    it('应该成功更新仓库', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {updateWarehouse} = await import('./warehouses')
      const result = await updateWarehouse('wh-1', {name: '更新后的名称'})

      expect(result).toBe(true)
    })

    it('应该在更新失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('更新失败')})
      } as any)

      const {updateWarehouse} = await import('./warehouses')
      const result = await updateWarehouse('wh-1', {name: '更新后的名称'})

      expect(result).toBe(false)
    })
  })

  describe('deleteWarehouse', () => {
    it('应该成功删除仓库', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {deleteWarehouse} = await import('./warehouses')
      const result = await deleteWarehouse('wh-1')

      expect(result).toBe(true)
    })

    it('应该在删除最后一个仓库时抛出错误', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: {message: '每个老板号必须保留至少一个仓库'}
        })
      } as any)

      const {deleteWarehouse} = await import('./warehouses')

      await expect(deleteWarehouse('wh-1')).rejects.toThrow('每个老板号必须保留至少一个仓库')
    })
  })

  describe('getDriverWarehouses', () => {
    it('应该返回司机的仓库列表', async () => {
      const mockData = [
        {warehouse_id: 'wh-1', warehouses: {id: 'wh-1', name: '仓库1'}},
        {warehouse_id: 'wh-2', warehouses: {id: 'wh-2', name: '仓库2'}}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({data: mockData, error: null})
      } as any)

      const {getDriverWarehouses} = await import('./warehouses')
      const result = await getDriverWarehouses('driver-1')

      expect(result.length).toBe(2)
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getDriverWarehouses} = await import('./warehouses')
      const result = await getDriverWarehouses('driver-1')

      expect(result).toEqual([])
    })
  })

  describe('getDriverWarehouseIds', () => {
    it('应该返回司机的仓库ID列表', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{warehouse_id: 'wh-1'}, {warehouse_id: 'wh-2'}],
          error: null
        })
      } as any)

      const {getDriverWarehouseIds} = await import('./warehouses')
      const result = await getDriverWarehouseIds('driver-1-valid-id')

      expect(result).toEqual(['wh-1', 'wh-2'])
    })

    it('应该在无效ID时返回空数组', async () => {
      const {getDriverWarehouseIds} = await import('./warehouses')
      const result = await getDriverWarehouseIds('anon')

      expect(result).toEqual([])
    })
  })

  describe('assignWarehouseToDriver', () => {
    it('应该成功分配仓库给司机', async () => {
      let callCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        callCount++
        if (table === 'users' && callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({data: {name: '司机'}, error: null})
          } as any
        }
        if (table === 'warehouses') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({data: {is_active: true, name: '仓库'}, error: null})
          } as any
        }
        if (table === 'warehouse_assignments') {
          return {
            insert: vi.fn().mockResolvedValue({error: null})
          } as any
        }
        return {} as any
      })

      const {assignWarehouseToDriver} = await import('./warehouses')
      const result = await assignWarehouseToDriver({
        user_id: 'driver-1',
        warehouse_id: 'wh-1'
      })

      expect(result.success).toBe(true)
    })

    it('应该在仓库被禁用时返回错误', async () => {
      let callCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        callCount++
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({data: {name: '司机'}, error: null})
          } as any
        }
        if (table === 'warehouses') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({data: {is_active: false, name: '禁用仓库'}, error: null})
          } as any
        }
        return {} as any
      })

      const {assignWarehouseToDriver} = await import('./warehouses')
      const result = await assignWarehouseToDriver({
        user_id: 'driver-1',
        warehouse_id: 'wh-disabled'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('已被禁用')
    })
  })

  describe('removeWarehouseFromDriver', () => {
    it('应该成功取消仓库分配', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
      } as any)

      // 模拟链式调用最终返回
      const mockChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({error: null})
        })
      }
      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const {removeWarehouseFromDriver} = await import('./warehouses')
      const result = await removeWarehouseFromDriver('driver-1', 'wh-1')

      expect(result).toBe(true)
    })
  })

  describe('getManagerWarehouses', () => {
    it('应该返回缓存数据如果存在', async () => {
      const cachedData = [{id: 'wh-1', name: '仓库1'}]
      vi.mocked(getCache).mockReturnValue(cachedData)

      const {getManagerWarehouses} = await import('./warehouses')
      const result = await getManagerWarehouses('manager-1-valid-id')

      expect(getCache).toHaveBeenCalled()
      expect(result).toEqual(cachedData)
    })

    it('应该在无效ID时返回空数组', async () => {
      const {getManagerWarehouses} = await import('./warehouses')
      const result = await getManagerWarehouses('anon')

      expect(result).toEqual([])
    })
  })

  describe('setDriverWarehouses', () => {
    it('应该成功批量设置司机仓库', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'warehouses') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{id: 'wh-1', is_active: true}, {id: 'wh-2', is_active: true}],
              error: null
            })
          } as any
        }
        if (table === 'warehouse_assignments') {
          return {
            delete: vi.fn().mockReturnThis(),
            insert: vi.fn().mockResolvedValue({error: null}),
            eq: vi.fn().mockResolvedValue({error: null})
          } as any
        }
        return {} as any
      })

      const {setDriverWarehouses} = await import('./warehouses')
      const result = await setDriverWarehouses('driver-1', ['wh-1', 'wh-2'])

      expect(result.success).toBe(true)
    })

    it('应该在有禁用仓库时返回错误', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'warehouses') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({
              data: [{id: 'wh-1', name: '仓库1', is_active: false}],
              error: null
            })
          } as any
        }
        return {} as any
      })

      const {setDriverWarehouses} = await import('./warehouses')
      const result = await setDriverWarehouses('driver-1', ['wh-1'])

      expect(result.success).toBe(false)
      expect(result.error).toContain('已被禁用')
    })
  })

  describe('getWarehouseSettings', () => {
    it('应该返回仓库设置', async () => {
      const mockSettings = {max_leave_days: 30, resignation_notice_days: 7}

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: mockSettings, error: null})
      } as any)

      const {getWarehouseSettings} = await import('./warehouses')
      const result = await getWarehouseSettings('wh-1')

      expect(result).toEqual(mockSettings)
    })
  })

  describe('updateWarehouseSettings', () => {
    it('应该成功更新仓库设置', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {updateWarehouseSettings} = await import('./warehouses')
      const result = await updateWarehouseSettings('wh-1', {max_leave_days: 15})

      expect(result).toBe(true)
    })
  })

  describe('getWarehouseDriverCount', () => {
    it('应该返回仓库司机数量', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({count: 5, error: null})
      } as any)

      const {getWarehouseDriverCount} = await import('./warehouses')
      const result = await getWarehouseDriverCount('wh-1')

      expect(result).toBe(5)
    })

    it('应该在查询失败时返回0', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({count: null, error: new Error('查询失败')})
      } as any)

      const {getWarehouseDriverCount} = await import('./warehouses')
      const result = await getWarehouseDriverCount('wh-1')

      expect(result).toBe(0)
    })
  })

  describe('getWarehouseCategories', () => {
    it('应该返回仓库品类ID列表', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{category_id: 'cat-1'}, {category_id: 'cat-2'}, {category_id: 'cat-1'}],
          error: null
        })
      } as any)

      const {getWarehouseCategories} = await import('./warehouses')
      const result = await getWarehouseCategories('wh-1')

      // 应该去重
      expect(result).toEqual(['cat-1', 'cat-2'])
    })
  })

  describe('getDriverIdsByWarehouse', () => {
    it('应该返回仓库的司机ID列表', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{user_id: 'driver-1'}, {user_id: 'driver-2'}],
          error: null
        })
      } as any)

      const {getDriverIdsByWarehouse} = await import('./warehouses')
      const result = await getDriverIdsByWarehouse('wh-1')

      expect(result).toEqual(['driver-1', 'driver-2'])
    })
  })
})
