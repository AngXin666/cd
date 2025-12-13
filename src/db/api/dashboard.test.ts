/**
 * 仪表盘统计 API - 单元测试
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'

// Mock Supabase
vi.mock('@/client/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn()
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

describe('dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getApprovedLeaveForToday', () => {
    it('应该返回用户今日已批准的请假申请', async () => {
      const mockLeave = {
        id: 'leave-1',
        user_id: 'user-1',
        status: 'approved',
        start_date: '2024-12-01',
        end_date: '2024-12-15'
      }

      const createChain = (resolveData: any) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          lte: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          order: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          maybeSingle: vi.fn().mockResolvedValue(resolveData)
        }
        return chain
      }

      vi.mocked(supabase.from).mockReturnValue(createChain({data: mockLeave, error: null}) as any)

      const {getApprovedLeaveForToday} = await import('./dashboard')
      const result = await getApprovedLeaveForToday('user-1')

      expect(result).toEqual(mockLeave)
    })

    it('应该在查询失败时返回null', async () => {
      const createChain = (resolveData: any) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          lte: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          order: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          maybeSingle: vi.fn().mockResolvedValue(resolveData)
        }
        return chain
      }

      vi.mocked(supabase.from).mockReturnValue(createChain({data: null, error: new Error('查询失败')}) as any)

      const {getApprovedLeaveForToday} = await import('./dashboard')
      const result = await getApprovedLeaveForToday('user-1')

      expect(result).toBeNull()
    })
  })

  describe('getWarehouseDataVolume', () => {
    it('应该返回仓库的数据量统计', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'warehouses') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({data: {id: 'wh-1', name: '仓库A'}, error: null})
          } as any
        }
        if (table === 'piece_work_records' || table === 'attendance') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            then: (resolve: any) => resolve({count: 5, error: null})
          } as any
        }
        return {} as any
      })

      const {getWarehouseDataVolume} = await import('./dashboard')
      const result = await getWarehouseDataVolume('wh-1')

      expect(result).not.toBeNull()
      expect(result?.warehouseId).toBe('wh-1')
      expect(result?.warehouseName).toBe('仓库A')
    })

    it('应该在仓库不存在时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: new Error('仓库不存在')})
      } as any)

      const {getWarehouseDataVolume} = await import('./dashboard')
      const result = await getWarehouseDataVolume('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getWarehousesDataVolume', () => {
    it('应该批量获取多个仓库的数据量统计', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'warehouses') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({data: {id: 'wh-1', name: '仓库A'}, error: null})
          } as any
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          then: (resolve: any) => resolve({count: 5, error: null})
        } as any
      })

      const {getWarehousesDataVolume} = await import('./dashboard')
      const result = await getWarehousesDataVolume(['wh-1', 'wh-2'])

      expect(Array.isArray(result)).toBe(true)
    })

    it('应该在出错时返回空数组', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('数据库错误')
      })

      const {getWarehousesDataVolume} = await import('./dashboard')
      const result = await getWarehousesDataVolume(['wh-1'])

      expect(result).toEqual([])
    })
  })

  describe('getMonthlyLeaveCount', () => {
    it('应该返回用户当月已批准的请假天数', async () => {
      const mockLeaveData = [
        {start_date: '2024-12-01', end_date: '2024-12-03'}, // 3天
        {start_date: '2024-12-10', end_date: '2024-12-11'}  // 2天
      ]

      const createChain = (resolveData: any) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          lte: vi.fn(() => chain),
          then: (resolve: any) => resolve(resolveData)
        }
        return chain
      }

      vi.mocked(supabase.from).mockReturnValue(createChain({data: mockLeaveData, error: null}) as any)

      const {getMonthlyLeaveCount} = await import('./dashboard')
      const result = await getMonthlyLeaveCount('user-1', 2024, 12)

      expect(result).toBe(5) // 3 + 2 = 5天
    })

    it('应该在没有请假记录时返回0', async () => {
      const createChain = (resolveData: any) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          lte: vi.fn(() => chain),
          then: (resolve: any) => resolve(resolveData)
        }
        return chain
      }

      vi.mocked(supabase.from).mockReturnValue(createChain({data: [], error: null}) as any)

      const {getMonthlyLeaveCount} = await import('./dashboard')
      const result = await getMonthlyLeaveCount('user-1', 2024, 12)

      expect(result).toBe(0)
    })

    it('应该在查询失败时返回0', async () => {
      const createChain = (resolveData: any) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          lte: vi.fn(() => chain),
          then: (resolve: any) => resolve(resolveData)
        }
        return chain
      }

      vi.mocked(supabase.from).mockReturnValue(createChain({data: null, error: new Error('查询失败')}) as any)

      const {getMonthlyLeaveCount} = await import('./dashboard')
      const result = await getMonthlyLeaveCount('user-1', 2024, 12)

      expect(result).toBe(0)
    })
  })

  describe('getMonthlyPendingLeaveCount', () => {
    it('应该返回用户当月待审批的请假天数', async () => {
      const mockLeaveData = [
        {start_date: '2024-12-05', end_date: '2024-12-06'} // 2天
      ]

      const createChain = (resolveData: any) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          lte: vi.fn(() => chain),
          then: (resolve: any) => resolve(resolveData)
        }
        return chain
      }

      vi.mocked(supabase.from).mockReturnValue(createChain({data: mockLeaveData, error: null}) as any)

      const {getMonthlyPendingLeaveCount} = await import('./dashboard')
      const result = await getMonthlyPendingLeaveCount('user-1', 2024, 12)

      expect(result).toBe(2)
    })

    it('应该在查询失败时返回0', async () => {
      const createChain = (resolveData: any) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          lte: vi.fn(() => chain),
          then: (resolve: any) => resolve(resolveData)
        }
        return chain
      }

      vi.mocked(supabase.from).mockReturnValue(createChain({data: null, error: new Error('查询失败')}) as any)

      const {getMonthlyPendingLeaveCount} = await import('./dashboard')
      const result = await getMonthlyPendingLeaveCount('user-1', 2024, 12)

      expect(result).toBe(0)
    })
  })

  describe('getDriverAttendanceStats', () => {
    it('应该返回司机的考勤统计', async () => {
      const mockAttendanceData = [
        {user_id: 'user-1', work_date: '2024-12-01', status: 'normal'},
        {user_id: 'user-1', work_date: '2024-12-02', status: 'late'},
        {user_id: 'user-1', work_date: '2024-12-03', status: 'normal'}
      ]

      const mockLeaveData = [
        {start_date: '2024-12-05', end_date: '2024-12-06'}
      ]

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'attendance') {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            gte: vi.fn(() => chain),
            lte: vi.fn(() => chain),
            then: (resolve: any) => resolve({data: mockAttendanceData, error: null})
          }
          return chain as any
        }
        if (table === 'leave_applications') {
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            or: vi.fn(() => chain),
            then: (resolve: any) => resolve({data: mockLeaveData, error: null})
          }
          return chain as any
        }
        return {} as any
      })

      const {getDriverAttendanceStats} = await import('./dashboard')
      const result = await getDriverAttendanceStats('user-1', '2024-12-01', '2024-12-10')

      expect(result.attendanceDays).toBe(3)
      expect(result.lateDays).toBe(1)
      expect(result.leaveDays).toBe(2)
    })

    it('应该在考勤查询失败时返回默认值', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          lte: vi.fn(() => chain),
          or: vi.fn(() => chain),
          then: (resolve: any) => resolve({data: null, error: new Error('查询失败')})
        }
        return chain as any
      })

      const {getDriverAttendanceStats} = await import('./dashboard')
      const result = await getDriverAttendanceStats('user-1', '2024-12-01', '2024-12-10')

      expect(result.attendanceDays).toBe(0)
      expect(result.lateDays).toBe(0)
      expect(result.leaveDays).toBe(0)
    })
  })

  describe('getBatchDriverAttendanceStats', () => {
    it('应该批量获取多个司机的考勤统计', async () => {
      const mockAttendanceData = [
        {user_id: 'user-1', work_date: '2024-12-01', status: 'normal'},
        {user_id: 'user-2', work_date: '2024-12-01', status: 'late'}
      ]

      const mockLeaveData = [
        {user_id: 'user-1', start_date: '2024-12-05', end_date: '2024-12-06'}
      ]

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'attendance') {
          const chain: any = {
            select: vi.fn(() => chain),
            in: vi.fn(() => chain),
            gte: vi.fn(() => chain),
            lte: vi.fn(() => chain),
            then: (resolve: any) => resolve({data: mockAttendanceData, error: null})
          }
          return chain as any
        }
        if (table === 'leave_applications') {
          const chain: any = {
            select: vi.fn(() => chain),
            in: vi.fn(() => chain),
            eq: vi.fn(() => chain),
            or: vi.fn(() => chain),
            then: (resolve: any) => resolve({data: mockLeaveData, error: null})
          }
          return chain as any
        }
        return {} as any
      })

      const {getBatchDriverAttendanceStats} = await import('./dashboard')
      const result = await getBatchDriverAttendanceStats(['user-1', 'user-2'], '2024-12-01', '2024-12-10')

      expect(result.size).toBe(2)
      expect(result.get('user-1')?.attendanceDays).toBe(1)
      expect(result.get('user-2')?.lateDays).toBe(1)
    })

    it('应该在空数组时返回空Map', async () => {
      const {getBatchDriverAttendanceStats} = await import('./dashboard')
      const result = await getBatchDriverAttendanceStats([], '2024-12-01', '2024-12-10')

      expect(result.size).toBe(0)
    })

    it('应该在查询失败时返回初始化的Map', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        const chain: any = {
          select: vi.fn(() => chain),
          in: vi.fn(() => chain),
          gte: vi.fn(() => chain),
          lte: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          or: vi.fn(() => chain),
          then: (resolve: any) => resolve({data: null, error: new Error('查询失败')})
        }
        return chain as any
      })

      const {getBatchDriverAttendanceStats} = await import('./dashboard')
      const result = await getBatchDriverAttendanceStats(['user-1'], '2024-12-01', '2024-12-10')

      expect(result.size).toBe(1)
      expect(result.get('user-1')?.attendanceDays).toBe(0)
    })
  })
})
