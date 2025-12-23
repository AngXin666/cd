/**
 * 请假管理 API 单元测试
 *
 * 测试覆盖：
 * - getAllLeaveApplications() - 获取所有请假申请
 * - getLeaveApplicationsByUser() - 获取用户请假申请
 * - getLeaveApplicationsByWarehouse() - 获取仓库请假申请
 * - getLeaveApplicationById() - 根据 ID 获取请假申请
 * - createLeaveApplication() - 创建请假申请
 * - reviewLeaveApplication() - 审批请假申请（批准/拒绝）
 * - 边界条件测试
 * - 属性测试
 *
 * @module db/api/leave.test
 * @requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockLeaveRequest, createMockLeaveRequests, getDateString } from './__mocks__'

// ==================== Mock 设置 ====================

const mockSupabaseFrom = vi.fn()
const mockSupabaseAuth = { getUser: vi.fn() }

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

const mockLeaveRepository = {
  getAllLeaveApplications: vi.fn(),
  getLeaveApplicationsByUser: vi.fn(),
  getLeaveApplicationsByWarehouse: vi.fn(),
  getLeaveApplicationById: vi.fn(),
  getAllResignationApplications: vi.fn(),
  getResignationApplicationsByUser: vi.fn(),
  getResignationApplicationsByWarehouse: vi.fn(),
  invalidateLeaveCache: vi.fn(),
  invalidateResignationCache: vi.fn(),
  invalidateAllCache: vi.fn()
}

const mockPublish = vi.fn()
const mockSendDriverSubmissionNotification = vi.fn()

vi.mock('@/client/supabase', () => ({
  supabase: { from: mockSupabaseFrom, auth: mockSupabaseAuth }
}))

vi.mock('../repositories', () => ({ leaveRepository: mockLeaveRepository }))
vi.mock('@/utils/eventBus', () => ({ publish: mockPublish }))
vi.mock('@/services/notificationService', () => ({
  sendDriverSubmissionNotification: mockSendDriverSubmissionNotification
}))
vi.mock('@/utils/date', () => ({
  getLocalDateString: vi.fn((date) => {
    if (date instanceof Date) return date.toISOString().split('T')[0]
    return new Date().toISOString().split('T')[0]
  })
}))
vi.mock('@/utils/dateFormat', () => ({ formatLeaveDateForNotification: vi.fn(() => '明天') }))
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({ db: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }))
}))

// ==================== 测试套件 ====================

describe('LeaveAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(mockQueryBuilder)
    Object.keys(mockQueryBuilder).forEach(key => {
      if (typeof mockQueryBuilder[key] === 'function' && key !== 'maybeSingle' && key !== 'single') {
        mockQueryBuilder[key].mockReturnThis()
      }
    })
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    mockLeaveRepository.getAllLeaveApplications.mockResolvedValue([])
    mockLeaveRepository.getLeaveApplicationsByUser.mockResolvedValue([])
    mockLeaveRepository.getLeaveApplicationsByWarehouse.mockResolvedValue([])
    mockLeaveRepository.getLeaveApplicationById.mockResolvedValue(null)
    mockLeaveRepository.getAllResignationApplications.mockResolvedValue([])
    mockLeaveRepository.getResignationApplicationsByUser.mockResolvedValue([])
    mockLeaveRepository.getResignationApplicationsByWarehouse.mockResolvedValue([])
    mockSendDriverSubmissionNotification.mockResolvedValue(undefined)
  })

  afterEach(() => { vi.resetModules() })

  // ==================== 6.1 测试 getLeaveRequests() ====================

  describe('getAllLeaveApplications', () => {
    it('应该返回所有请假申请列表', async () => {
      const mockApplications = createMockLeaveRequests('user-001', 5)
      mockLeaveRepository.getAllLeaveApplications.mockResolvedValue(mockApplications)
      const { getAllLeaveApplications } = await import('./leave')
      const result = await getAllLeaveApplications()
      expect(result).toHaveLength(5)
      expect(mockLeaveRepository.getAllLeaveApplications).toHaveBeenCalled()
    })

    it('应该正确处理空结果', async () => {
      mockLeaveRepository.getAllLeaveApplications.mockResolvedValue([])
      const { getAllLeaveApplications } = await import('./leave')
      const result = await getAllLeaveApplications()
      expect(result).toEqual([])
    })
  })

  describe('getLeaveApplicationsByUser', () => {
    it('应该返回用户的请假申请列表', async () => {
      const userId = 'user-001'
      const mockApplications = createMockLeaveRequests(userId, 3)
      mockLeaveRepository.getLeaveApplicationsByUser.mockResolvedValue(mockApplications)
      const { getLeaveApplicationsByUser } = await import('./leave')
      const result = await getLeaveApplicationsByUser(userId)
      expect(result).toHaveLength(3)
      expect(mockLeaveRepository.getLeaveApplicationsByUser).toHaveBeenCalledWith(userId)
    })

    it('用户无请假申请时应该返回空数组', async () => {
      mockLeaveRepository.getLeaveApplicationsByUser.mockResolvedValue([])
      const { getLeaveApplicationsByUser } = await import('./leave')
      const result = await getLeaveApplicationsByUser('user-001')
      expect(result).toEqual([])
    })
  })

  describe('getLeaveApplicationsByWarehouse', () => {
    it('应该返回仓库的请假申请列表', async () => {
      const warehouseId = 'wh-001'
      const mockApplications = [
        createMockLeaveRequest('user-001', { warehouse_id: warehouseId }),
        createMockLeaveRequest('user-002', { warehouse_id: warehouseId })
      ]
      mockLeaveRepository.getLeaveApplicationsByWarehouse.mockResolvedValue(mockApplications)
      const { getLeaveApplicationsByWarehouse } = await import('./leave')
      const result = await getLeaveApplicationsByWarehouse(warehouseId)
      expect(result).toHaveLength(2)
      expect(mockLeaveRepository.getLeaveApplicationsByWarehouse).toHaveBeenCalledWith(warehouseId)
    })
  })

  describe('getLeaveApplicationById', () => {
    it('应该返回指定 ID 的请假申请', async () => {
      const applicationId = 'leave-001'
      const mockApplication = createMockLeaveRequest('user-001', { id: applicationId })
      mockLeaveRepository.getLeaveApplicationById.mockResolvedValue(mockApplication)
      const { getLeaveApplicationById } = await import('./leave')
      const result = await getLeaveApplicationById(applicationId)
      expect(result).not.toBeNull()
      expect(result?.id).toBe(applicationId)
    })

    it('请假申请不存在时应该返回 null', async () => {
      mockLeaveRepository.getLeaveApplicationById.mockResolvedValue(null)
      const { getLeaveApplicationById } = await import('./leave')
      const result = await getLeaveApplicationById('non-existent-id')
      expect(result).toBeNull()
    })
  })


  // ==================== 6.2 测试 createLeaveRequest() ====================

  describe('createLeaveApplication', () => {
    const setupCreateMocks = (userId: string, warehouseId: string, mockApplication: any) => {
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null })
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'leave_applications') {
          return {
            ...mockQueryBuilder,
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null })
              })
            })
          }
        }
        if (table === 'users') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { name: '测试司机', driver_type: 'pure' }, error: null })
              })
            })
          }
        }
        if (table === 'warehouse_assignments') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          }
        }
        return mockQueryBuilder
      })
    }

    it('应该创建请假申请', async () => {
      const userId = 'user-001'
      const warehouseId = 'wh-001'
      const mockApplication = createMockLeaveRequest(userId, { id: 'leave-001', warehouse_id: warehouseId, status: 'pending' })
      setupCreateMocks(userId, warehouseId, mockApplication)
      const { createLeaveApplication } = await import('./leave')
      const result = await createLeaveApplication({
        user_id: userId, warehouse_id: warehouseId, leave_type: 'personal',
        start_date: getDateString(1), end_date: getDateString(3), reason: '个人事务'
      })
      expect(result).not.toBeNull()
      expect(result?.status).toBe('pending')
    })

    it('未登录时应该返回 null', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })
      const { createLeaveApplication } = await import('./leave')
      const result = await createLeaveApplication({
        user_id: 'user-001', warehouse_id: 'wh-001', leave_type: 'personal',
        start_date: getDateString(1), end_date: getDateString(3), reason: '个人事务'
      })
      expect(result).toBeNull()
    })

    it('创建成功后应该清除缓存', async () => {
      const userId = 'user-001'
      const mockApplication = createMockLeaveRequest(userId, { id: 'leave-001', status: 'pending' })
      setupCreateMocks(userId, 'wh-001', mockApplication)
      const { createLeaveApplication } = await import('./leave')
      await createLeaveApplication({
        user_id: userId, warehouse_id: 'wh-001', leave_type: 'personal',
        start_date: getDateString(1), end_date: getDateString(3), reason: '个人事务'
      })
      expect(mockLeaveRepository.invalidateLeaveCache).toHaveBeenCalled()
    })

    it('创建成功后应该发布事件', async () => {
      const userId = 'user-001'
      const mockApplication = createMockLeaveRequest(userId, { id: 'leave-001', status: 'pending' })
      setupCreateMocks(userId, 'wh-001', mockApplication)
      const { createLeaveApplication } = await import('./leave')
      await createLeaveApplication({
        user_id: userId, warehouse_id: 'wh-001', leave_type: 'personal',
        start_date: getDateString(1), end_date: getDateString(3), reason: '个人事务'
      })
      expect(mockPublish).toHaveBeenCalledWith('leave:created', expect.objectContaining({ id: 'leave-001', userId }))
    })
  })

  // ==================== 6.3 测试 approveLeaveRequest() ====================

  describe('reviewLeaveApplication - 批准', () => {
    const setupReviewMocks = (applicationId: string, userId: string, newStatus: string) => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'leave_applications') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: userId, leave_type: 'personal', start_date: getDateString(1), end_date: getDateString(3), days: 3, reason: '个人事务' },
                  error: null
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: [{ id: applicationId, status: newStatus }], error: null })
              })
            })
          }
        }
        return mockQueryBuilder
      })
    }

    it('应该更新审批状态为已批准', async () => {
      setupReviewMocks('leave-001', 'user-001', 'approved')
      const { reviewLeaveApplication } = await import('./leave')
      const result = await reviewLeaveApplication('leave-001', {
        status: 'approved', reviewed_by: 'manager-001', reviewed_at: new Date().toISOString()
      })
      expect(result).toBe(true)
    })

    it('批准成功后应该清除缓存', async () => {
      setupReviewMocks('leave-001', 'user-001', 'approved')
      const { reviewLeaveApplication } = await import('./leave')
      await reviewLeaveApplication('leave-001', {
        status: 'approved', reviewed_by: 'manager-001', reviewed_at: new Date().toISOString()
      })
      expect(mockLeaveRepository.invalidateLeaveCache).toHaveBeenCalled()
    })

    it('批准成功后应该发布事件', async () => {
      setupReviewMocks('leave-001', 'user-001', 'approved')
      const { reviewLeaveApplication } = await import('./leave')
      await reviewLeaveApplication('leave-001', {
        status: 'approved', reviewed_by: 'manager-001', reviewed_at: new Date().toISOString()
      })
      expect(mockPublish).toHaveBeenCalledWith('leave:updated', expect.objectContaining({ id: 'leave-001', status: 'approved' }))
    })

    it('申请不存在时应该返回 false', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'leave_applications') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })
            })
          }
        }
        return mockQueryBuilder
      })
      const { reviewLeaveApplication } = await import('./leave')
      const result = await reviewLeaveApplication('non-existent-id', {
        status: 'approved', reviewed_by: 'manager-001', reviewed_at: new Date().toISOString()
      })
      expect(result).toBe(false)
    })
  })


  // ==================== 6.4 测试 rejectLeaveRequest() ====================

  describe('reviewLeaveApplication - 拒绝', () => {
    const setupRejectMocks = (applicationId: string, userId: string) => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'leave_applications') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: userId, leave_type: 'personal', start_date: getDateString(1), end_date: getDateString(3), days: 3, reason: '个人事务' },
                  error: null
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: [{ id: applicationId, status: 'rejected' }], error: null })
              })
            })
          }
        }
        return mockQueryBuilder
      })
    }

    it('应该更新审批状态为已拒绝', async () => {
      setupRejectMocks('leave-001', 'user-001')
      const { reviewLeaveApplication } = await import('./leave')
      const result = await reviewLeaveApplication('leave-001', {
        status: 'rejected', reviewed_by: 'manager-001', review_notes: '人手不足', reviewed_at: new Date().toISOString()
      })
      expect(result).toBe(true)
    })

    it('拒绝成功后应该清除缓存', async () => {
      setupRejectMocks('leave-001', 'user-001')
      const { reviewLeaveApplication } = await import('./leave')
      await reviewLeaveApplication('leave-001', {
        status: 'rejected', reviewed_by: 'manager-001', review_notes: '人手不足', reviewed_at: new Date().toISOString()
      })
      expect(mockLeaveRepository.invalidateLeaveCache).toHaveBeenCalled()
    })

    it('拒绝成功后应该发布事件', async () => {
      setupRejectMocks('leave-001', 'user-001')
      const { reviewLeaveApplication } = await import('./leave')
      await reviewLeaveApplication('leave-001', {
        status: 'rejected', reviewed_by: 'manager-001', review_notes: '人手不足', reviewed_at: new Date().toISOString()
      })
      expect(mockPublish).toHaveBeenCalledWith('leave:updated', expect.objectContaining({ id: 'leave-001', status: 'rejected' }))
    })

    it('更新失败时应该返回 false', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'leave_applications') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-001', leave_type: 'personal', start_date: getDateString(1), end_date: getDateString(3), days: 3, reason: '个人事务' },
                  error: null
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: [], error: { message: '更新失败' } })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { reviewLeaveApplication } = await import('./leave')
      const result = await reviewLeaveApplication('leave-001', {
        status: 'rejected', reviewed_by: 'manager-001', reviewed_at: new Date().toISOString()
      })
      expect(result).toBe(false)
    })
  })

  // ==================== 6.5 测试边界条件 ====================

  describe('边界条件', () => {
    it('请假天数超过上限时应该返回无效', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'warehouses') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { max_leave_days: 3 }, error: null })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { validateLeaveApplication } = await import('./leave')
      const result = await validateLeaveApplication('wh-001', 5)
      expect(result.valid).toBe(false)
      expect(result.maxDays).toBe(3)
    })

    it('请假天数在上限内时应该返回有效', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'warehouses') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { max_leave_days: 7 }, error: null })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { validateLeaveApplication } = await import('./leave')
      const result = await validateLeaveApplication('wh-001', 3)
      expect(result.valid).toBe(true)
    })

    it('无法获取仓库设置时应该返回无效', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'warehouses') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: '查询失败' } })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { validateLeaveApplication } = await import('./leave')
      const result = await validateLeaveApplication('wh-001', 3)
      expect(result.valid).toBe(false)
    })

    it('应该返回已批准和待审批的请假记录', async () => {
      const mockLeaves = [
        createMockLeaveRequest('user-001', { status: 'approved' }),
        createMockLeaveRequest('user-001', { status: 'pending' })
      ]
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'leave_applications') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: mockLeaves, error: null })
                })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { getApprovedAndPendingLeaves } = await import('./leave')
      const result = await getApprovedAndPendingLeaves('user-001')
      expect(result).toHaveLength(2)
    })

    it('应该计算最早可用的请假开始日期', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'leave_applications') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: [], error: null })
                })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { getEarliestAvailableLeaveDate } = await import('./leave')
      const result = await getEarliestAvailableLeaveDate('user-001')
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(result).toBe(tomorrow.toISOString().split('T')[0])
    })

    it('离职日期提前通知天数不足时应该返回无效', async () => {
      const today = new Date()
      const invalidDate = new Date(today)
      invalidDate.setDate(invalidDate.getDate() + 10)
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'warehouses') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { resignation_notice_days: 30 }, error: null })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { validateResignationDate } = await import('./leave')
      const result = await validateResignationDate('wh-001', invalidDate.toISOString().split('T')[0])
      expect(result.valid).toBe(false)
      expect(result.noticeDays).toBe(30)
    })

    it('离职日期提前通知天数充足时应该返回有效', async () => {
      const today = new Date()
      const validDate = new Date(today)
      validDate.setDate(validDate.getDate() + 35)
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'warehouses') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { resignation_notice_days: 30 }, error: null })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { validateResignationDate } = await import('./leave')
      const result = await validateResignationDate('wh-001', validDate.toISOString().split('T')[0])
      expect(result.valid).toBe(true)
    })

    it('数据库错误时 getApprovedAndPendingLeaves 应该返回空数组', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'leave_applications') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: null, error: { message: '数据库错误' } })
                })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { getApprovedAndPendingLeaves } = await import('./leave')
      const result = await getApprovedAndPendingLeaves('user-001')
      expect(result).toEqual([])
    })
  })


  // ==================== 6.6 属性测试 ====================

  describe('属性测试', () => {
    /**
     * **Feature: core-api-unit-tests, Property 7**
     * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
     */
    it('Property 7: 请假查询 API 应返回与 Repository 一致的数据', async () => {
      const applicationCount = Math.floor(Math.random() * 10) + 1
      const mockApplications = createMockLeaveRequests('user-001', applicationCount)
      mockLeaveRepository.getAllLeaveApplications.mockResolvedValue(mockApplications)
      const { getAllLeaveApplications } = await import('./leave')
      const result = await getAllLeaveApplications()
      expect(result).toEqual(mockApplications)
      expect(result.length).toBe(applicationCount)
    })

    it('Property 7: 用户请假查询应正确调用 Repository', async () => {
      const userId = 'user-001'
      const mockApplications = createMockLeaveRequests(userId, 3)
      mockLeaveRepository.getLeaveApplicationsByUser.mockResolvedValue(mockApplications)
      const { getLeaveApplicationsByUser } = await import('./leave')
      const result = await getLeaveApplicationsByUser(userId)
      expect(result).toEqual(mockApplications)
      expect(mockLeaveRepository.getLeaveApplicationsByUser).toHaveBeenCalledWith(userId)
    })

    it('Property 7: 仓库请假查询应正确调用 Repository', async () => {
      const warehouseId = 'wh-001'
      const mockApplications = [
        createMockLeaveRequest('user-001', { warehouse_id: warehouseId }),
        createMockLeaveRequest('user-002', { warehouse_id: warehouseId })
      ]
      mockLeaveRepository.getLeaveApplicationsByWarehouse.mockResolvedValue(mockApplications)
      const { getLeaveApplicationsByWarehouse } = await import('./leave')
      const result = await getLeaveApplicationsByWarehouse(warehouseId)
      expect(result).toEqual(mockApplications)
      expect(mockLeaveRepository.getLeaveApplicationsByWarehouse).toHaveBeenCalledWith(warehouseId)
    })

    it('Property 7: 创建请假申请应触发缓存失效', async () => {
      const userId = 'user-001'
      const mockApplication = createMockLeaveRequest(userId, { id: 'leave-001', status: 'pending' })
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null })
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'leave_applications') {
          return {
            ...mockQueryBuilder,
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockApplication, error: null })
              })
            })
          }
        }
        if (table === 'users') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { name: '测试司机', driver_type: 'pure' }, error: null })
              })
            })
          }
        }
        if (table === 'warehouse_assignments') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          }
        }
        return mockQueryBuilder
      })
      const { createLeaveApplication } = await import('./leave')
      await createLeaveApplication({
        user_id: userId, warehouse_id: 'wh-001', leave_type: 'personal',
        start_date: getDateString(1), end_date: getDateString(3), reason: '个人事务'
      })
      expect(mockLeaveRepository.invalidateLeaveCache).toHaveBeenCalled()
    })

    it('Property 7: 批准请假申请应触发缓存失效', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'leave_applications') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-001', leave_type: 'personal', start_date: getDateString(1), end_date: getDateString(3), days: 3, reason: '个人事务' },
                  error: null
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: [{ id: 'leave-001', status: 'approved' }], error: null })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { reviewLeaveApplication } = await import('./leave')
      await reviewLeaveApplication('leave-001', {
        status: 'approved', reviewed_by: 'manager-001', reviewed_at: new Date().toISOString()
      })
      expect(mockLeaveRepository.invalidateLeaveCache).toHaveBeenCalled()
    })

    it('Property 7: 拒绝请假申请应触发缓存失效', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'leave_applications') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-001', leave_type: 'personal', start_date: getDateString(1), end_date: getDateString(3), days: 3, reason: '个人事务' },
                  error: null
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: [{ id: 'leave-001', status: 'rejected' }], error: null })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { reviewLeaveApplication } = await import('./leave')
      await reviewLeaveApplication('leave-001', {
        status: 'rejected', reviewed_by: 'manager-001', review_notes: '人手不足', reviewed_at: new Date().toISOString()
      })
      expect(mockLeaveRepository.invalidateLeaveCache).toHaveBeenCalled()
    })

    it('Property 7: 根据 ID 查询请假申请应正确调用 Repository', async () => {
      const applicationId = 'leave-001'
      const mockApplication = createMockLeaveRequest('user-001', { id: applicationId })
      mockLeaveRepository.getLeaveApplicationById.mockResolvedValue(mockApplication)
      const { getLeaveApplicationById } = await import('./leave')
      const result = await getLeaveApplicationById(applicationId)
      expect(result).toEqual(mockApplication)
      expect(mockLeaveRepository.getLeaveApplicationById).toHaveBeenCalledWith(applicationId)
    })
  })

  // ==================== 离职申请 API 测试 ====================

  describe('离职申请 API', () => {
    it('应该返回所有离职申请列表', async () => {
      const mockApplications = [
        { id: 'resign-001', user_id: 'user-001', status: 'pending' },
        { id: 'resign-002', user_id: 'user-002', status: 'approved' }
      ]
      mockLeaveRepository.getAllResignationApplications.mockResolvedValue(mockApplications)
      const { getAllResignationApplications } = await import('./leave')
      const result = await getAllResignationApplications()
      expect(result).toHaveLength(2)
      expect(mockLeaveRepository.getAllResignationApplications).toHaveBeenCalled()
    })

    it('应该返回用户的离职申请列表', async () => {
      const userId = 'user-001'
      const mockApplications = [{ id: 'resign-001', user_id: userId, status: 'pending' }]
      mockLeaveRepository.getResignationApplicationsByUser.mockResolvedValue(mockApplications)
      const { getResignationApplicationsByUser } = await import('./leave')
      const result = await getResignationApplicationsByUser(userId)
      expect(result).toHaveLength(1)
      expect(mockLeaveRepository.getResignationApplicationsByUser).toHaveBeenCalledWith(userId)
    })

    it('应该返回仓库的离职申请列表', async () => {
      const warehouseId = 'wh-001'
      const mockApplications = [{ id: 'resign-001', user_id: 'user-001', warehouse_id: warehouseId, status: 'pending' }]
      mockLeaveRepository.getResignationApplicationsByWarehouse.mockResolvedValue(mockApplications)
      const { getResignationApplicationsByWarehouse } = await import('./leave')
      const result = await getResignationApplicationsByWarehouse(warehouseId)
      expect(result).toHaveLength(1)
      expect(mockLeaveRepository.getResignationApplicationsByWarehouse).toHaveBeenCalledWith(warehouseId)
    })
  })
})
