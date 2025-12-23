/**
 * 通知管理 API 单元测试
 *
 * 测试覆盖：
 * - getNotifications() - 获取用户通知列表
 * - createNotification() - 创建通知
 * - markNotificationAsRead() - 标记通知为已读
 * - markAllNotificationsAsRead() - 标记所有通知为已读
 * - getUnreadNotificationCount() - 获取未读通知数量
 * - deleteNotification() - 删除通知
 *
 * @module db/api/notifications.test
 * @requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockNotification, createMockNotifications } from './__mocks__'

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
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn()
}

const mockNotificationsRepository = {
  getByUser: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  createNotification: vi.fn(),
  clearAllCache: vi.fn(),
  clearCacheByUser: vi.fn()
}

const mockPublish = vi.fn()


vi.mock('@/client/supabase', () => ({
  supabase: { from: mockSupabaseFrom, auth: mockSupabaseAuth }
}))

vi.mock('../repositories', () => ({
  notificationsRepository: mockNotificationsRepository
}))

vi.mock('@/utils/eventBus', () => ({ publish: mockPublish }))

vi.mock('@/utils/logger', () => ({
  logger: { db: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}))

// ==================== 测试套件 ====================

describe('NotificationsAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseFrom.mockReturnValue(mockQueryBuilder)
    Object.keys(mockQueryBuilder).forEach(key => {
      if (typeof mockQueryBuilder[key] === 'function' && key !== 'maybeSingle' && key !== 'single') {
        mockQueryBuilder[key].mockReturnThis()
      }
    })
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    mockNotificationsRepository.getByUser.mockResolvedValue([])
    mockNotificationsRepository.getUnreadCount.mockResolvedValue(0)
    mockNotificationsRepository.markAsRead.mockResolvedValue(true)
    mockNotificationsRepository.markAllAsRead.mockResolvedValue(true)
    mockNotificationsRepository.deleteNotification.mockResolvedValue(true)
  })

  afterEach(() => { vi.resetModules() })

  // ==================== 7.1 测试 getNotifications() ====================

  describe('getNotifications', () => {
    it('应该返回用户通知列表', async () => {
      const userId = 'user-001'
      const mockList = createMockNotifications(userId, 5)
      mockNotificationsRepository.getByUser.mockResolvedValue(mockList)
      const { getNotifications } = await import('./notifications')
      const result = await getNotifications(userId)
      expect(result).toHaveLength(5)
      expect(mockNotificationsRepository.getByUser).toHaveBeenCalledWith(userId, 50)
    })

    it('应该支持自定义返回数量限制', async () => {
      const userId = 'user-001'
      mockNotificationsRepository.getByUser.mockResolvedValue(createMockNotifications(userId, 10))
      const { getNotifications } = await import('./notifications')
      const result = await getNotifications(userId, 10)
      expect(result).toHaveLength(10)
      expect(mockNotificationsRepository.getByUser).toHaveBeenCalledWith(userId, 10)
    })

    it('用户无通知时应该返回空数组', async () => {
      mockNotificationsRepository.getByUser.mockResolvedValue([])
      const { getNotifications } = await import('./notifications')
      const result = await getNotifications('user-001')
      expect(result).toEqual([])
    })

    it('应该正确调用 Repository', async () => {
      mockNotificationsRepository.getByUser.mockResolvedValue([])
      const { getNotifications } = await import('./notifications')
      await getNotifications('user-001', 20)
      expect(mockNotificationsRepository.getByUser).toHaveBeenCalledWith('user-001', 20)
    })
  })


  // ==================== 7.2 测试 createNotification() ====================

  describe('createNotification', () => {
    it('应该创建通知并返回通知 ID', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'sender-001' } }, error: null })
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            ...mockQueryBuilder,
            insert: vi.fn().mockReturnValue({ error: null }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'notif-001' }, error: null })
                      })
                    })
                  })
                })
              })
            })
          }
        }
        if (table === 'users' || table === 'user_roles') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { name: '测试用户', role: 'MANAGER' }, error: null })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { createNotification } = await import('./notifications')
      const result = await createNotification({
        user_id: 'user-001', type: 'system_notice', title: '测试通知', message: '这是一条测试通知'
      })
      expect(result).toBe('notif-001')
    })

    it('数据库插入错误时应该返回 null', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'sender-001' } }, error: null })
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'notifications') {
          return { ...mockQueryBuilder, insert: vi.fn().mockReturnValue({ error: { message: '数据库错误' } }) }
        }
        if (table === 'users' || table === 'user_roles') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { name: '测试用户', role: 'MANAGER' }, error: null })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { createNotification } = await import('./notifications')
      const result = await createNotification({
        user_id: 'user-001', type: 'system_notice', title: '测试通知', message: '这是一条测试通知'
      })
      expect(result).toBeNull()
    })

    it('未登录时应该使用系统作为发送者', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            ...mockQueryBuilder,
            insert: vi.fn().mockReturnValue({ error: null }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'notif-001' }, error: null })
                      })
                    })
                  })
                })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { createNotification } = await import('./notifications')
      const result = await createNotification({
        user_id: 'user-001', type: 'system_notice', title: '测试通知', message: '这是一条测试通知'
      })
      expect(result).toBe('notif-001')
    })

    it('应该支持 related_id 参数', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'sender-001' } }, error: null })
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            ...mockQueryBuilder,
            insert: vi.fn().mockReturnValue({ error: null }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'notif-001' }, error: null })
                      })
                    })
                  })
                })
              })
            })
          }
        }
        if (table === 'users' || table === 'user_roles') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { name: '测试用户', role: 'MANAGER' }, error: null })
              })
            })
          }
        }
        return mockQueryBuilder
      })
      const { createNotification } = await import('./notifications')
      const result = await createNotification({
        user_id: 'user-001', type: 'leave_approval', title: '请假审批', message: '您的请假申请已批准', related_id: 'leave-001'
      })
      expect(result).toBe('notif-001')
    })
  })


  // ==================== 7.3 测试 markAsRead() ====================

  describe('markNotificationAsRead', () => {
    it('应该标记通知为已读', async () => {
      mockNotificationsRepository.markAsRead.mockResolvedValue(true)
      const { markNotificationAsRead } = await import('./notifications')
      const result = await markNotificationAsRead('notif-001')
      expect(result).toBe(true)
      expect(mockNotificationsRepository.markAsRead).toHaveBeenCalledWith('notif-001')
    })

    it('标记成功后应该发布事件', async () => {
      mockNotificationsRepository.markAsRead.mockResolvedValue(true)
      const { markNotificationAsRead } = await import('./notifications')
      await markNotificationAsRead('notif-001')
      expect(mockPublish).toHaveBeenCalledWith('notification:read', { id: 'notif-001' })
    })

    it('标记失败时不应该发布事件', async () => {
      mockNotificationsRepository.markAsRead.mockResolvedValue(false)
      const { markNotificationAsRead } = await import('./notifications')
      const result = await markNotificationAsRead('notif-001')
      expect(result).toBe(false)
      expect(mockPublish).not.toHaveBeenCalled()
    })

    it('通知不存在时应该返回 false', async () => {
      mockNotificationsRepository.markAsRead.mockResolvedValue(false)
      const { markNotificationAsRead } = await import('./notifications')
      const result = await markNotificationAsRead('non-existent-id')
      expect(result).toBe(false)
    })
  })

  // ==================== 7.4 测试 markAllAsRead() ====================

  describe('markAllNotificationsAsRead', () => {
    it('应该标记所有通知为已读', async () => {
      mockNotificationsRepository.markAllAsRead.mockResolvedValue(true)
      const { markAllNotificationsAsRead } = await import('./notifications')
      const result = await markAllNotificationsAsRead('user-001')
      expect(result).toBe(true)
      expect(mockNotificationsRepository.markAllAsRead).toHaveBeenCalledWith('user-001')
    })

    it('标记失败时应该返回 false', async () => {
      mockNotificationsRepository.markAllAsRead.mockResolvedValue(false)
      const { markAllNotificationsAsRead } = await import('./notifications')
      const result = await markAllNotificationsAsRead('user-001')
      expect(result).toBe(false)
    })

    it('用户无通知时应该返回 true', async () => {
      mockNotificationsRepository.markAllAsRead.mockResolvedValue(true)
      const { markAllNotificationsAsRead } = await import('./notifications')
      const result = await markAllNotificationsAsRead('user-no-notifications')
      expect(result).toBe(true)
    })
  })

  // ==================== 7.5 测试 getUnreadCount() ====================

  describe('getUnreadNotificationCount', () => {
    it('应该返回未读通知数量', async () => {
      mockNotificationsRepository.getUnreadCount.mockResolvedValue(5)
      const { getUnreadNotificationCount } = await import('./notifications')
      const result = await getUnreadNotificationCount('user-001')
      expect(result).toBe(5)
      expect(mockNotificationsRepository.getUnreadCount).toHaveBeenCalledWith('user-001')
    })

    it('无未读通知时应该返回 0', async () => {
      mockNotificationsRepository.getUnreadCount.mockResolvedValue(0)
      const { getUnreadNotificationCount } = await import('./notifications')
      const result = await getUnreadNotificationCount('user-001')
      expect(result).toBe(0)
    })

    it('应该正确调用 Repository', async () => {
      mockNotificationsRepository.getUnreadCount.mockResolvedValue(3)
      const { getUnreadNotificationCount } = await import('./notifications')
      await getUnreadNotificationCount('user-001')
      expect(mockNotificationsRepository.getUnreadCount).toHaveBeenCalledWith('user-001')
    })
  })


  // ==================== 7.6 测试 deleteNotification() ====================

  describe('deleteNotification', () => {
    it('应该删除通知', async () => {
      mockNotificationsRepository.deleteNotification.mockResolvedValue(true)
      const { deleteNotification } = await import('./notifications')
      const result = await deleteNotification('notif-001')
      expect(result).toBe(true)
      expect(mockNotificationsRepository.deleteNotification).toHaveBeenCalledWith('notif-001')
    })

    it('删除成功后应该发布事件', async () => {
      mockNotificationsRepository.deleteNotification.mockResolvedValue(true)
      const { deleteNotification } = await import('./notifications')
      await deleteNotification('notif-001')
      expect(mockPublish).toHaveBeenCalledWith('notification:deleted', { id: 'notif-001' })
    })

    it('删除失败时不应该发布事件', async () => {
      mockNotificationsRepository.deleteNotification.mockResolvedValue(false)
      const { deleteNotification } = await import('./notifications')
      const result = await deleteNotification('notif-001')
      expect(result).toBe(false)
      expect(mockPublish).not.toHaveBeenCalled()
    })

    it('通知不存在时应该返回 false', async () => {
      mockNotificationsRepository.deleteNotification.mockResolvedValue(false)
      const { deleteNotification } = await import('./notifications')
      const result = await deleteNotification('non-existent-id')
      expect(result).toBe(false)
    })
  })

  // ==================== 边界条件测试 ====================

  describe('边界条件', () => {
    it('createNotificationForAllManagers 应该为所有管理员创建通知', async () => {
      const mockManagers = [{ id: 'manager-001' }, { id: 'manager-002' }]
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'sender-001' } }, error: null })
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockImplementation((fields: string) => {
              if (fields === 'id') {
                return { in: vi.fn().mockResolvedValue({ data: mockManagers, error: null }) }
              }
              return {
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { name: '测试用户', role: 'MANAGER' }, error: null })
                })
              }
            })
          }
        }
        if (table === 'notifications') {
          return { ...mockQueryBuilder, insert: vi.fn().mockReturnValue({ error: null }) }
        }
        return mockQueryBuilder
      })
      const { createNotificationForAllManagers } = await import('./notifications')
      const result = await createNotificationForAllManagers({
        type: 'system_notice', title: '系统通知', message: '这是一条系统通知'
      })
      expect(result).toBe(2)
    })

    it('createNotificationForAllManagers 无管理员时应该返回 0', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'sender-001' } }, error: null })
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockImplementation((fields: string) => {
              if (fields === 'id') {
                return { in: vi.fn().mockResolvedValue({ data: [], error: null }) }
              }
              return {
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { name: '测试用户' }, error: null })
                })
              }
            })
          }
        }
        return mockQueryBuilder
      })
      const { createNotificationForAllManagers } = await import('./notifications')
      const result = await createNotificationForAllManagers({
        type: 'system_notice', title: '系统通知', message: '这是一条系统通知'
      })
      expect(result).toBe(0)
    })


    it('sendNotificationToDrivers 应该发送通知给多个司机', async () => {
      const driverIds = ['driver-001', 'driver-002', 'driver-003']
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'sender-001' } }, error: null })
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { name: '测试管理员' }, error: null })
              })
            })
          }
        }
        if (table === 'notifications') {
          return { ...mockQueryBuilder, insert: vi.fn().mockReturnValue({ error: null }) }
        }
        return mockQueryBuilder
      })
      const { sendNotificationToDrivers } = await import('./notifications')
      const result = await sendNotificationToDrivers(driverIds, '测试标题', '测试内容')
      expect(result).toBe(true)
    })

    it('sendNotificationToDrivers 数据库错误时应该返回 false', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'sender-001' } }, error: null })
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            ...mockQueryBuilder,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { name: '测试管理员' }, error: null })
              })
            })
          }
        }
        if (table === 'notifications') {
          return { ...mockQueryBuilder, insert: vi.fn().mockReturnValue({ error: { message: '数据库错误' } }) }
        }
        return mockQueryBuilder
      })
      const { sendNotificationToDrivers } = await import('./notifications')
      const result = await sendNotificationToDrivers(['driver-001'], '测试标题', '测试内容')
      expect(result).toBe(false)
    })

    it('updateNotificationApprovalStatus 应该更新通知审批状态', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'notifications') {
          return {
            ...mockQueryBuilder,
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          }
        }
        return mockQueryBuilder
      })
      const { updateNotificationApprovalStatus } = await import('./notifications')
      const result = await updateNotificationApprovalStatus('notif-001', 'approved', '已批准', '您的请假申请已批准')
      expect(result).toBe(true)
      expect(mockNotificationsRepository.clearAllCache).toHaveBeenCalled()
    })

    it('updateNotificationApprovalStatus 参数为空时应该返回 false', async () => {
      const { updateNotificationApprovalStatus } = await import('./notifications')
      const result = await updateNotificationApprovalStatus('', 'approved', '已批准', '内容')
      expect(result).toBe(false)
    })
  })


  // ==================== 属性测试 ====================

  describe('属性测试', () => {
    /**
     * **Feature: core-api-unit-tests, Property 8**
     * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
     */
    it('Property 8: 通知查询 API 应返回与 Repository 一致的数据', async () => {
      const notificationCount = Math.floor(Math.random() * 10) + 1
      const mockList = createMockNotifications('user-001', notificationCount)
      mockNotificationsRepository.getByUser.mockResolvedValue(mockList)
      const { getNotifications } = await import('./notifications')
      const result = await getNotifications('user-001')
      expect(result).toEqual(mockList)
      expect(result.length).toBe(notificationCount)
    })

    it('Property 8: 未读通知数量应与 Repository 返回一致', async () => {
      const unreadCount = Math.floor(Math.random() * 20)
      mockNotificationsRepository.getUnreadCount.mockResolvedValue(unreadCount)
      const { getUnreadNotificationCount } = await import('./notifications')
      const result = await getUnreadNotificationCount('user-001')
      expect(result).toBe(unreadCount)
    })

    it('Property 8: 标记已读应正确调用 Repository', async () => {
      mockNotificationsRepository.markAsRead.mockResolvedValue(true)
      const { markNotificationAsRead } = await import('./notifications')
      const result = await markNotificationAsRead('notif-001')
      expect(result).toBe(true)
      expect(mockNotificationsRepository.markAsRead).toHaveBeenCalledWith('notif-001')
    })

    it('Property 8: 标记所有已读应正确调用 Repository', async () => {
      mockNotificationsRepository.markAllAsRead.mockResolvedValue(true)
      const { markAllNotificationsAsRead } = await import('./notifications')
      const result = await markAllNotificationsAsRead('user-001')
      expect(result).toBe(true)
      expect(mockNotificationsRepository.markAllAsRead).toHaveBeenCalledWith('user-001')
    })

    it('Property 8: 删除通知应正确调用 Repository', async () => {
      mockNotificationsRepository.deleteNotification.mockResolvedValue(true)
      const { deleteNotification } = await import('./notifications')
      const result = await deleteNotification('notif-001')
      expect(result).toBe(true)
      expect(mockNotificationsRepository.deleteNotification).toHaveBeenCalledWith('notif-001')
    })

    it('Property 8: 标记已读成功后应发布事件', async () => {
      mockNotificationsRepository.markAsRead.mockResolvedValue(true)
      const { markNotificationAsRead } = await import('./notifications')
      await markNotificationAsRead('notif-001')
      expect(mockPublish).toHaveBeenCalledWith('notification:read', { id: 'notif-001' })
    })

    it('Property 8: 删除通知成功后应发布事件', async () => {
      mockNotificationsRepository.deleteNotification.mockResolvedValue(true)
      const { deleteNotification } = await import('./notifications')
      await deleteNotification('notif-001')
      expect(mockPublish).toHaveBeenCalledWith('notification:deleted', { id: 'notif-001' })
    })
  })
})
