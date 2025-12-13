/**
 * 通知系统 API - 单元测试
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'

// Mock Supabase
vi.mock('@/client/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn()
    })),
    auth: {
      getUser: vi.fn()
    },
    rpc: vi.fn()
  }
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}))

import {supabase} from '@/client/supabase'

describe('notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==================== 通知查询测试 ====================

  describe('getNotifications', () => {
    it('应该返回用户的通知列表', async () => {
      const mockNotifications = [
        {id: 'n-1', recipient_id: 'user-1', title: '通知1', is_read: false},
        {id: 'n-2', recipient_id: 'user-1', title: '通知2', is_read: true}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({data: mockNotifications, error: null})
      } as any)

      const {getNotifications} = await import('./notifications')
      const result = await getNotifications('user-1')

      expect(result).toEqual(mockNotifications)
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getNotifications} = await import('./notifications')
      const result = await getNotifications('user-1')

      expect(result).toEqual([])
    })
  })

  describe('getUnreadNotificationCount', () => {
    it('应该返回未读通知数量', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({count: 5, error: null})
      } as any)

      const {getUnreadNotificationCount} = await import('./notifications')
      const result = await getUnreadNotificationCount('user-1')

      expect(result).toBe(5)
    })

    it('应该在查询失败时返回0', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({count: null, error: new Error('查询失败')})
      } as any)

      const {getUnreadNotificationCount} = await import('./notifications')
      const result = await getUnreadNotificationCount('user-1')

      expect(result).toBe(0)
    })
  })

  // ==================== 通知操作测试 ====================

  describe('markNotificationAsRead', () => {
    it('应该成功标记通知为已读', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {markNotificationAsRead} = await import('./notifications')
      const result = await markNotificationAsRead('n-1')

      expect(result).toBe(true)
    })

    it('应该在更新失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('更新失败')})
      } as any)

      const {markNotificationAsRead} = await import('./notifications')
      const result = await markNotificationAsRead('n-1')

      expect(result).toBe(false)
    })
  })

  describe('markAllNotificationsAsRead', () => {
    it('应该成功标记所有通知为已读', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({error: null})
      } as any)

      const {markAllNotificationsAsRead} = await import('./notifications')
      const result = await markAllNotificationsAsRead('user-1')

      expect(result).toBe(true)
    })

    it('应该在更新失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({error: new Error('更新失败')})
      } as any)

      const {markAllNotificationsAsRead} = await import('./notifications')
      const result = await markAllNotificationsAsRead('user-1')

      expect(result).toBe(false)
    })
  })

  describe('deleteNotification', () => {
    it('应该成功删除通知', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {deleteNotification} = await import('./notifications')
      const result = await deleteNotification('n-1')

      expect(result).toBe(true)
    })

    it('应该在删除失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('删除失败')})
      } as any)

      const {deleteNotification} = await import('./notifications')
      const result = await deleteNotification('n-1')

      expect(result).toBe(false)
    })
  })

  // ==================== 通知模板测试 ====================

  describe('getNotificationTemplates', () => {
    it('应该返回通知模板列表', async () => {
      const mockTemplates = [
        {id: 't-1', title: '模板1', content: '内容1'},
        {id: 't-2', title: '模板2', content: '内容2'}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({data: mockTemplates, error: null})
      } as any)

      const {getNotificationTemplates} = await import('./notifications')
      const result = await getNotificationTemplates()

      expect(result).toEqual(mockTemplates)
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({data: null, error: new Error('查询失败')})
      } as any)

      const {getNotificationTemplates} = await import('./notifications')
      const result = await getNotificationTemplates()

      expect(result).toEqual([])
    })
  })

  describe('createNotificationTemplate', () => {
    it('应该成功创建通知模板', async () => {
      const mockTemplate = {id: 't-new', title: '新模板', content: '新内容'}

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: mockTemplate, error: null})
      } as any)

      const {createNotificationTemplate} = await import('./notifications')
      const result = await createNotificationTemplate({title: '新模板', content: '新内容'} as any)

      expect(result).toEqual(mockTemplate)
    })

    it('应该在创建失败时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: new Error('创建失败')})
      } as any)

      const {createNotificationTemplate} = await import('./notifications')
      const result = await createNotificationTemplate({title: '新模板', content: '新内容'} as any)

      expect(result).toBeNull()
    })
  })

  describe('updateNotificationTemplate', () => {
    it('应该成功更新通知模板', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {updateNotificationTemplate} = await import('./notifications')
      const result = await updateNotificationTemplate('t-1', {title: '更新标题'})

      expect(result).toBe(true)
    })

    it('应该在更新失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('更新失败')})
      } as any)

      const {updateNotificationTemplate} = await import('./notifications')
      const result = await updateNotificationTemplate('t-1', {title: '更新标题'})

      expect(result).toBe(false)
    })
  })

  describe('deleteNotificationTemplate', () => {
    it('应该成功删除通知模板', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {deleteNotificationTemplate} = await import('./notifications')
      const result = await deleteNotificationTemplate('t-1')

      expect(result).toBe(true)
    })

    it('应该在删除失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('删除失败')})
      } as any)

      const {deleteNotificationTemplate} = await import('./notifications')
      const result = await deleteNotificationTemplate('t-1')

      expect(result).toBe(false)
    })
  })

  // ==================== 定时通知测试 ====================

  describe('getScheduledNotifications', () => {
    it('应该返回定时通知列表', async () => {
      const mockScheduled = [
        {id: 's-1', title: '定时通知1', status: 'pending'},
        {id: 's-2', title: '定时通知2', status: 'sent'}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockScheduled, error: null})
      } as any)

      const {getScheduledNotifications} = await import('./notifications')
      const result = await getScheduledNotifications()

      expect(result).toEqual(mockScheduled)
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getScheduledNotifications} = await import('./notifications')
      const result = await getScheduledNotifications()

      expect(result).toEqual([])
    })
  })

  describe('createScheduledNotification', () => {
    it('应该成功创建定时通知', async () => {
      const mockScheduled = {id: 's-new', title: '新定时通知', status: 'pending'}

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: mockScheduled, error: null})
      } as any)

      const {createScheduledNotification} = await import('./notifications')
      const result = await createScheduledNotification({title: '新定时通知', send_time: '2024-12-25T10:00:00Z'} as any)

      expect(result).toEqual(mockScheduled)
    })

    it('应该在创建失败时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: new Error('创建失败')})
      } as any)

      const {createScheduledNotification} = await import('./notifications')
      const result = await createScheduledNotification({title: '新定时通知', send_time: '2024-12-25T10:00:00Z'} as any)

      expect(result).toBeNull()
    })
  })

  describe('updateScheduledNotificationStatus', () => {
    it('应该成功更新定时通知状态', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {updateScheduledNotificationStatus} = await import('./notifications')
      const result = await updateScheduledNotificationStatus('s-1', 'sent')

      expect(result).toBe(true)
    })

    it('应该在更新失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('更新失败')})
      } as any)

      const {updateScheduledNotificationStatus} = await import('./notifications')
      const result = await updateScheduledNotificationStatus('s-1', 'sent')

      expect(result).toBe(false)
    })
  })

  // ==================== 自动提醒规则测试 ====================

  describe('getAutoReminderRules', () => {
    it('应该返回自动提醒规则列表', async () => {
      const mockRules = [
        {id: 'r-1', name: '规则1', is_enabled: true},
        {id: 'r-2', name: '规则2', is_enabled: false}
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockRules, error: null})
      } as any)

      const {getAutoReminderRules} = await import('./notifications')
      const result = await getAutoReminderRules()

      expect(result).toEqual(mockRules)
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getAutoReminderRules} = await import('./notifications')
      const result = await getAutoReminderRules()

      expect(result).toEqual([])
    })
  })

  describe('createAutoReminderRule', () => {
    it('应该成功创建自动提醒规则', async () => {
      const mockRule = {id: 'r-new', name: '新规则', is_enabled: true}

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: mockRule, error: null})
      } as any)

      const {createAutoReminderRule} = await import('./notifications')
      const result = await createAutoReminderRule({name: '新规则', is_enabled: true} as any)

      expect(result).toEqual(mockRule)
    })

    it('应该在创建失败时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: new Error('创建失败')})
      } as any)

      const {createAutoReminderRule} = await import('./notifications')
      const result = await createAutoReminderRule({name: '新规则', is_enabled: true} as any)

      expect(result).toBeNull()
    })
  })

  describe('updateAutoReminderRule', () => {
    it('应该成功更新自动提醒规则', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {updateAutoReminderRule} = await import('./notifications')
      const result = await updateAutoReminderRule('r-1', {is_enabled: false})

      expect(result).toBe(true)
    })

    it('应该在更新失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('更新失败')})
      } as any)

      const {updateAutoReminderRule} = await import('./notifications')
      const result = await updateAutoReminderRule('r-1', {is_enabled: false})

      expect(result).toBe(false)
    })
  })

  describe('deleteAutoReminderRule', () => {
    it('应该成功删除自动提醒规则', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {deleteAutoReminderRule} = await import('./notifications')
      const result = await deleteAutoReminderRule('r-1')

      expect(result).toBe(true)
    })

    it('应该在删除失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('删除失败')})
      } as any)

      const {deleteAutoReminderRule} = await import('./notifications')
      const result = await deleteAutoReminderRule('r-1')

      expect(result).toBe(false)
    })
  })
})
