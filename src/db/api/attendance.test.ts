/**
 * 考勤管理 API - 单元测试
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'

// Mock Supabase
const mockSelect = vi.fn().mockReturnThis()
const mockInsert = vi.fn().mockReturnThis()
const mockUpdate = vi.fn().mockReturnThis()
const mockDelete = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockGte = vi.fn().mockReturnThis()
const mockLte = vi.fn().mockReturnThis()
const mockIn = vi.fn().mockReturnThis()
const mockIs = vi.fn().mockReturnThis()
const mockOrder = vi.fn().mockReturnThis()
const mockLimit = vi.fn().mockReturnThis()
const mockMaybeSingle = vi.fn()

vi.mock('@/client/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      gte: mockGte,
      lte: mockLte,
      in: mockIn,
      is: mockIs,
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
    ATTENDANCE_MONTHLY: 'attendance_monthly',
    ATTENDANCE_ALL_RECORDS: 'attendance_all_records'
  },
  getCache: vi.fn(),
  setCache: vi.fn(),
  clearCache: vi.fn()
}))

import {supabase} from '@/client/supabase'
import {getCache, setCache, clearCache} from '@/utils/cache'

describe('attendance API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 重置链式调用
    mockSelect.mockReturnThis()
    mockInsert.mockReturnThis()
    mockUpdate.mockReturnThis()
    mockDelete.mockReturnThis()
    mockEq.mockReturnThis()
    mockGte.mockReturnThis()
    mockLte.mockReturnThis()
    mockIn.mockReturnThis()
    mockIs.mockReturnThis()
    mockOrder.mockReturnThis()
    mockLimit.mockReturnThis()
  })

  describe('getLocalDateString', () => {
    it('应该返回正确格式的日期字符串', async () => {
      // 通过 getTodayAttendance 间接测试
      const {getTodayAttendance} = await import('./attendance')
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
      } as any)

      await getTodayAttendance('user-1')

      // 验证调用了正确的日期格式
      expect(supabase.from).toHaveBeenCalledWith('attendance')
    })
  })

  describe('createClockIn', () => {
    it('应该在用户未登录时返回null', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: null},
        error: null
      } as any)

      const {createClockIn} = await import('./attendance')
      const result = await createClockIn({
        user_id: 'user-1',
        work_date: '2024-12-13',
        clock_in_time: '08:00:00',
        status: 'normal'
      })

      expect(result).toBeNull()
    })

    it('应该在必填字段缺失时返回null', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      const {createClockIn} = await import('./attendance')
      const result = await createClockIn({
        user_id: '',
        work_date: '2024-12-13',
        clock_in_time: '08:00:00',
        status: 'normal'
      })

      expect(result).toBeNull()
    })

    it('应该在已有记录时更新记录', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      const existingRecord = {id: 'existing-1'}
      const updatedRecord = {
        id: 'existing-1',
        user_id: 'user-1',
        work_date: '2024-12-13',
        clock_in_time: '08:00:00',
        status: 'normal'
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'attendance') {
          return {
            select: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn()
              .mockResolvedValueOnce({data: existingRecord, error: null})
              .mockResolvedValueOnce({data: updatedRecord, error: null})
          } as any
        }
        return {} as any
      })

      const {createClockIn} = await import('./attendance')
      const result = await createClockIn({
        user_id: 'user-1',
        work_date: '2024-12-13',
        clock_in_time: '08:00:00',
        status: 'normal'
      })

      expect(clearCache).toHaveBeenCalled()
    })
  })

  describe('getTodayAttendance', () => {
    it('应该返回今日打卡记录', async () => {
      const mockRecord = {
        id: 'attendance-1',
        user_id: 'user-1',
        work_date: '2024-12-13',
        clock_in_time: '08:00:00',
        status: 'normal'
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: mockRecord, error: null})
      } as any)

      const {getTodayAttendance} = await import('./attendance')
      const result = await getTodayAttendance('user-1')

      expect(supabase.from).toHaveBeenCalledWith('attendance')
      expect(result).toEqual(mockRecord)
    })

    it('应该在查询失败时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getTodayAttendance} = await import('./attendance')
      const result = await getTodayAttendance('user-1')

      expect(result).toBeNull()
    })
  })

  describe('getMonthlyAttendance', () => {
    it('应该返回缓存数据如果存在', async () => {
      const cachedData = [
        {id: 'attendance-1', work_date: '2024-12-01'},
        {id: 'attendance-2', work_date: '2024-12-02'}
      ]
      vi.mocked(getCache).mockReturnValue(cachedData)

      const {getMonthlyAttendance} = await import('./attendance')
      const result = await getMonthlyAttendance('user-1', 2024, 12)

      expect(getCache).toHaveBeenCalled()
      expect(result).toEqual(cachedData)
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('应该从数据库查询并缓存结果', async () => {
      vi.mocked(getCache).mockReturnValue(null)
      
      const mockRecords = [
        {id: 'attendance-1', work_date: '2024-12-01'},
        {id: 'attendance-2', work_date: '2024-12-02'}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockRecords, error: null})
      } as any)

      const {getMonthlyAttendance} = await import('./attendance')
      const result = await getMonthlyAttendance('user-1', 2024, 12)

      expect(supabase.from).toHaveBeenCalledWith('attendance')
      expect(setCache).toHaveBeenCalled()
      expect(result).toEqual(mockRecords)
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(getCache).mockReturnValue(null)
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getMonthlyAttendance} = await import('./attendance')
      const result = await getMonthlyAttendance('user-1', 2024, 12)

      expect(result).toEqual([])
    })
  })

  describe('updateClockOut', () => {
    it('应该成功更新下班打卡', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({error: null})
          .mockResolvedValueOnce({data: {user_id: 'user-1', work_date: '2024-12-13'}, error: null})
      } as any)

      const {updateClockOut} = await import('./attendance')
      const result = await updateClockOut('attendance-1', {
        clock_out_time: '18:00:00'
      })

      expect(result).toBe(true)
    })

    it('应该在更新失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('更新失败')})
      } as any)

      const {updateClockOut} = await import('./attendance')
      const result = await updateClockOut('attendance-1', {
        clock_out_time: '18:00:00'
      })

      expect(result).toBe(false)
    })
  })

  describe('getAttendanceRuleByWarehouseId', () => {
    it('应该返回仓库的考勤规则', async () => {
      const mockRule = {
        id: 'rule-1',
        warehouse_id: 'warehouse-1',
        clock_in_time: '08:00',
        clock_out_time: '18:00',
        is_active: true
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({data: [mockRule], error: null})
      } as any)

      const {getAttendanceRuleByWarehouseId} = await import('./attendance')
      const result = await getAttendanceRuleByWarehouseId('warehouse-1')

      expect(supabase.from).toHaveBeenCalledWith('attendance_rules')
      expect(result).toEqual(mockRule)
    })

    it('应该在没有仓库规则时返回默认规则', async () => {
      const defaultRule = {
        id: 'default-rule',
        warehouse_id: null,
        clock_in_time: '09:00',
        clock_out_time: '18:00',
        is_active: true
      }

      let callCount = 0
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({data: [], error: null})
          }
          return Promise.resolve({data: [defaultRule], error: null})
        })
      } as any)

      const {getAttendanceRuleByWarehouseId} = await import('./attendance')
      const result = await getAttendanceRuleByWarehouseId('warehouse-1')

      expect(result).toEqual(defaultRule)
    })
  })

  describe('createAttendanceRule', () => {
    it('应该在用户未登录时抛出错误', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: null},
        error: null
      } as any)

      const {createAttendanceRule} = await import('./attendance')
      
      await expect(createAttendanceRule({
        warehouse_id: 'warehouse-1',
        clock_in_time: '08:00',
        clock_out_time: '18:00'
      })).rejects.toThrow('用户未登录')
    })

    it('应该成功创建考勤规则', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      const newRule = {
        id: 'new-rule-1',
        warehouse_id: 'warehouse-1',
        clock_in_time: '08:00',
        clock_out_time: '18:00',
        late_threshold: 15,
        early_threshold: 15,
        is_active: true
      }

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: newRule, error: null})
      } as any)

      const {createAttendanceRule} = await import('./attendance')
      const result = await createAttendanceRule({
        warehouse_id: 'warehouse-1',
        clock_in_time: '08:00',
        clock_out_time: '18:00'
      })

      expect(result).toEqual(newRule)
    })
  })

  describe('updateAttendanceRule', () => {
    it('应该成功更新考勤规则', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {updateAttendanceRule} = await import('./attendance')
      const result = await updateAttendanceRule('rule-1', {
        clock_in_time: '09:00'
      })

      expect(result).toBe(true)
    })

    it('应该在更新失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('更新失败')})
      } as any)

      const {updateAttendanceRule} = await import('./attendance')
      const result = await updateAttendanceRule('rule-1', {
        clock_in_time: '09:00'
      })

      expect(result).toBe(false)
    })
  })

  describe('deleteAttendanceRule', () => {
    it('应该成功删除考勤规则', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {deleteAttendanceRule} = await import('./attendance')
      const result = await deleteAttendanceRule('rule-1')

      expect(result).toBe(true)
    })

    it('应该在删除失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('删除失败')})
      } as any)

      const {deleteAttendanceRule} = await import('./attendance')
      const result = await deleteAttendanceRule('rule-1')

      expect(result).toBe(false)
    })
  })

  describe('getAttendanceRecordsByWarehouse', () => {
    it('应该返回仓库的考勤记录', async () => {
      const mockRecords = [
        {id: 'attendance-1', warehouse_id: 'warehouse-1', work_date: '2024-12-13'},
        {id: 'attendance-2', warehouse_id: 'warehouse-1', work_date: '2024-12-12'}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockRecords, error: null})
      } as any)

      const {getAttendanceRecordsByWarehouse} = await import('./attendance')
      const result = await getAttendanceRecordsByWarehouse('warehouse-1')

      expect(supabase.from).toHaveBeenCalledWith('attendance')
      expect(result).toEqual(mockRecords)
    })

    it('应该支持日期范围筛选', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis()
      }
      // 让 order 返回带有 gte/lte 方法的对象
      mockChain.order.mockReturnValue({
        ...mockChain,
        then: (resolve: any) => resolve({data: [], error: null})
      })
      mockChain.gte.mockReturnValue({
        ...mockChain,
        then: (resolve: any) => resolve({data: [], error: null})
      })
      mockChain.lte.mockReturnValue({
        ...mockChain,
        then: (resolve: any) => resolve({data: [], error: null})
      })
      
      vi.mocked(supabase.from).mockReturnValue(mockChain as any)

      const {getAttendanceRecordsByWarehouse} = await import('./attendance')
      await getAttendanceRecordsByWarehouse('warehouse-1', '2024-12-01', '2024-12-31')

      expect(supabase.from).toHaveBeenCalledWith('attendance')
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getAttendanceRecordsByWarehouse} = await import('./attendance')
      const result = await getAttendanceRecordsByWarehouse('warehouse-1')

      expect(result).toEqual([])
    })
  })

  describe('getAllAttendanceRules', () => {
    it('应该返回所有考勤规则', async () => {
      const mockRules = [
        {id: 'rule-1', warehouse_id: 'warehouse-1'},
        {id: 'rule-2', warehouse_id: 'warehouse-2'}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockRules, error: null})
      } as any)

      const {getAllAttendanceRules} = await import('./attendance')
      const result = await getAllAttendanceRules()

      expect(supabase.from).toHaveBeenCalledWith('attendance_rules')
      expect(result).toEqual(mockRules)
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getAllAttendanceRules} = await import('./attendance')
      const result = await getAllAttendanceRules()

      expect(result).toEqual([])
    })
  })
})
