import {act, renderHook} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {Notification} from './useNotifications'
import {useNotifications} from './useNotifications'

// Mock storage
const mockStorageGet = vi.fn()
const mockStorageSet = vi.fn()
const mockStorageRemove = vi.fn()

vi.mock('@/utils/storage', () => ({
  TypeSafeStorage: {
    get: (...args: unknown[]) => mockStorageGet(...args),
    set: (...args: unknown[]) => mockStorageSet(...args),
    remove: (...args: unknown[]) => mockStorageRemove(...args)
  }
}))

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageGet.mockReturnValue(null)
  })

  describe('初始化', () => {
    it('应该初始化为空状态', () => {
      const {result} = renderHook(() => useNotifications())

      expect(result.current.notifications).toEqual([])
      expect(result.current.unreadCount).toBe(0)
    })

    it('应该从本地存储加载通知', () => {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'system',
          title: '系统通知',
          content: '测试内容',
          timestamp: Date.now(),
          read: false
        },
        {
          id: '2',
          type: 'approval',
          title: '审批通知',
          content: '审批通过',
          timestamp: Date.now(),
          read: true
        }
      ]
      mockStorageGet.mockReturnValue(mockNotifications)

      const {result} = renderHook(() => useNotifications())

      expect(result.current.notifications).toEqual(mockNotifications)
      expect(result.current.unreadCount).toBe(1)
    })

    it('应该处理无效的存储数据', () => {
      mockStorageGet.mockReturnValue('invalid data')

      const {result} = renderHook(() => useNotifications())

      expect(result.current.notifications).toEqual([])
      expect(result.current.unreadCount).toBe(0)
    })
  })

  describe('添加通知', () => {
    it('应该添加新通知', () => {
      const {result} = renderHook(() => useNotifications())

      act(() => {
        result.current.addNotification({
          type: 'system',
          title: '新通知',
          content: '通知内容'
        })
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0]).toMatchObject({
        type: 'system',
        title: '新通知',
        content: '通知内容',
        read: false
      })
      expect(result.current.notifications[0].id).toBeDefined()
      expect(result.current.notifications[0].timestamp).toBeDefined()
      expect(result.current.unreadCount).toBe(1)
    })

    it('应该添加带额外数据的通知', () => {
      const {result} = renderHook(() => useNotifications())

      act(() => {
        result.current.addNotification({
          type: 'leave_application',
          title: '请假申请',
          content: '张三申请请假',
          data: {leaveId: '123', userId: '456'}
        })
      })

      expect(result.current.notifications[0].data).toEqual({
        leaveId: '123',
        userId: '456'
      })
    })

    it('应该将新通知添加到列表开头', () => {
      const {result} = renderHook(() => useNotifications())

      act(() => {
        result.current.addNotification({
          type: 'system',
          title: '第一条',
          content: '内容1'
        })
      })

      act(() => {
        result.current.addNotification({
          type: 'system',
          title: '第二条',
          content: '内容2'
        })
      })

      expect(result.current.notifications[0].title).toBe('第二条')
      expect(result.current.notifications[1].title).toBe('第一条')
    })

    it('应该限制通知数量为50条', () => {
      const {result} = renderHook(() => useNotifications())

      // 添加51条通知
      act(() => {
        for (let i = 0; i < 51; i++) {
          result.current.addNotification({
            type: 'system',
            title: `通知${i}`,
            content: `内容${i}`
          })
        }
      })

      expect(result.current.notifications).toHaveLength(50)
    })

    it('应该保存通知到本地存储', () => {
      const {result} = renderHook(() => useNotifications())

      act(() => {
        result.current.addNotification({
          type: 'system',
          title: '测试',
          content: '内容'
        })
      })

      expect(mockStorageSet).toHaveBeenCalledWith(
        'app_notifications',
        expect.arrayContaining([
          expect.objectContaining({
            type: 'system',
            title: '测试',
            content: '内容'
          })
        ])
      )
    })
  })

  describe('标记已读', () => {
    it('应该标记单个通知为已读', () => {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'system',
          title: '通知1',
          content: '内容1',
          timestamp: Date.now(),
          read: false
        },
        {
          id: '2',
          type: 'system',
          title: '通知2',
          content: '内容2',
          timestamp: Date.now(),
          read: false
        }
      ]
      mockStorageGet.mockReturnValue(mockNotifications)

      const {result} = renderHook(() => useNotifications())

      act(() => {
        result.current.markAsRead('1')
      })

      expect(result.current.notifications[0].read).toBe(true)
      expect(result.current.notifications[1].read).toBe(false)
      expect(result.current.unreadCount).toBe(1)
    })

    it('应该标记所有通知为已读', () => {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'system',
          title: '通知1',
          content: '内容1',
          timestamp: Date.now(),
          read: false
        },
        {
          id: '2',
          type: 'system',
          title: '通知2',
          content: '内容2',
          timestamp: Date.now(),
          read: false
        }
      ]
      mockStorageGet.mockReturnValue(mockNotifications)

      const {result} = renderHook(() => useNotifications())

      act(() => {
        result.current.markAllAsRead()
      })

      expect(result.current.notifications.every((n) => n.read)).toBe(true)
      expect(result.current.unreadCount).toBe(0)
    })

    it('应该处理标记不存在的通知', () => {
      const {result} = renderHook(() => useNotifications())

      act(() => {
        result.current.markAsRead('non-existent')
      })

      expect(result.current.unreadCount).toBe(0)
    })

    it('应该处理标记已读的通知', () => {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'system',
          title: '通知1',
          content: '内容1',
          timestamp: Date.now(),
          read: true
        }
      ]
      mockStorageGet.mockReturnValue(mockNotifications)

      const {result} = renderHook(() => useNotifications())

      act(() => {
        result.current.markAsRead('1')
      })

      expect(result.current.unreadCount).toBe(0)
    })
  })

  describe('删除通知', () => {
    it('应该删除单个通知', () => {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'system',
          title: '通知1',
          content: '内容1',
          timestamp: Date.now(),
          read: false
        },
        {
          id: '2',
          type: 'system',
          title: '通知2',
          content: '内容2',
          timestamp: Date.now(),
          read: false
        }
      ]
      mockStorageGet.mockReturnValue(mockNotifications)

      const {result} = renderHook(() => useNotifications())

      act(() => {
        result.current.deleteNotification('1')
      })

      expect(result.current.notifications).toHaveLength(1)
      expect(result.current.notifications[0].id).toBe('2')
      expect(result.current.unreadCount).toBe(1)
    })

    it('应该在删除未读通知时更新未读数', () => {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'system',
          title: '通知1',
          content: '内容1',
          timestamp: Date.now(),
          read: false
        }
      ]
      mockStorageGet.mockReturnValue(mockNotifications)

      const {result} = renderHook(() => useNotifications())

      expect(result.current.unreadCount).toBe(1)

      act(() => {
        result.current.deleteNotification('1')
      })

      expect(result.current.unreadCount).toBe(0)
    })

    it('应该清除所有通知', () => {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'system',
          title: '通知1',
          content: '内容1',
          timestamp: Date.now(),
          read: false
        },
        {
          id: '2',
          type: 'system',
          title: '通知2',
          content: '内容2',
          timestamp: Date.now(),
          read: false
        }
      ]
      mockStorageGet.mockReturnValue(mockNotifications)

      const {result} = renderHook(() => useNotifications())

      act(() => {
        result.current.clearAll()
      })

      expect(result.current.notifications).toEqual([])
      expect(result.current.unreadCount).toBe(0)
      expect(mockStorageRemove).toHaveBeenCalledWith('app_notifications')
    })
  })

  describe('查询通知', () => {
    it('应该获取未读通知', () => {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'system',
          title: '通知1',
          content: '内容1',
          timestamp: Date.now(),
          read: false
        },
        {
          id: '2',
          type: 'system',
          title: '通知2',
          content: '内容2',
          timestamp: Date.now(),
          read: true
        },
        {
          id: '3',
          type: 'system',
          title: '通知3',
          content: '内容3',
          timestamp: Date.now(),
          read: false
        }
      ]
      mockStorageGet.mockReturnValue(mockNotifications)

      const {result} = renderHook(() => useNotifications())

      const unread = result.current.getUnreadNotifications()

      expect(unread).toHaveLength(2)
      expect(unread.every((n) => !n.read)).toBe(true)
    })

    it('应该获取最近的通知', () => {
      const mockNotifications: Notification[] = Array.from({length: 10}, (_, i) => ({
        id: `${i}`,
        type: 'system' as const,
        title: `通知${i}`,
        content: `内容${i}`,
        timestamp: Date.now() - i * 1000,
        read: false
      }))
      mockStorageGet.mockReturnValue(mockNotifications)

      const {result} = renderHook(() => useNotifications())

      const recent = result.current.getRecentNotifications(5)

      expect(recent).toHaveLength(5)
      expect(recent[0].id).toBe('0')
      expect(recent[4].id).toBe('4')
    })

    it('应该使用默认数量获取最近通知', () => {
      const mockNotifications: Notification[] = Array.from({length: 10}, (_, i) => ({
        id: `${i}`,
        type: 'system' as const,
        title: `通知${i}`,
        content: `内容${i}`,
        timestamp: Date.now(),
        read: false
      }))
      mockStorageGet.mockReturnValue(mockNotifications)

      const {result} = renderHook(() => useNotifications())

      const recent = result.current.getRecentNotifications()

      expect(recent).toHaveLength(5)
    })
  })

  describe('通知类型', () => {
    it('应该支持所有通知类型', () => {
      const {result} = renderHook(() => useNotifications())

      const types: Array<Notification['type']> = [
        'leave_application',
        'resignation_application',
        'attendance',
        'approval',
        'system'
      ]

      types.forEach((type) => {
        act(() => {
          result.current.addNotification({
            type,
            title: `${type}通知`,
            content: '内容'
          })
        })
      })

      expect(result.current.notifications).toHaveLength(5)
      types.forEach((type, index) => {
        expect(result.current.notifications[4 - index].type).toBe(type)
      })
    })
  })
})
