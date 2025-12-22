/**
 * Realtime 缓存失效属性测试
 * 验证 RealtimeCacheInvalidator 的 Realtime 事件触发缓存失效机制
 *
 * Property 6: Realtime 事件触发缓存失效
 * - 验证 notifications INSERT 事件触发缓存失效
 * - 验证 notifications UPDATE 事件触发缓存失效
 * - 验证 vehicles UPDATE 事件触发缓存失效
 * - 验证 cleanup 正确清理订阅
 *
 * @module db/realtime/__tests__/RealtimeCacheInvalidator.test
 * @validates Requirements 1.4, 4.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ==================== Mock 设置 ====================

// 使用 vi.hoisted 确保 mock 函数在 vi.mock 提升后仍可访问
const {
  mockNotificationsClearAllCache,
  mockVehiclesClearAllCache,
  mockEventBusPublish,
  mockRemoveChannel,
  mockSubscribe,
  mockChannelOn
} = vi.hoisted(() => ({
  mockNotificationsClearAllCache: vi.fn(),
  mockVehiclesClearAllCache: vi.fn(),
  mockEventBusPublish: vi.fn(),
  mockRemoveChannel: vi.fn().mockResolvedValue(undefined),
  mockSubscribe: vi.fn().mockReturnValue(undefined),
  mockChannelOn: vi.fn()
}))

// 存储 Realtime 事件处理器，用于测试时手动触发
let realtimeHandlers: Record<string, (payload: unknown) => void> = {}

// Mock Supabase 客户端
vi.mock('@/client/supabase', () => {
  /**
   * 创建支持链式调用的 channel mock
   */
  const createChannelMock = () => {
    const channelMock = {
      on: vi.fn().mockImplementation((_event, config, handler) => {
        // 存储事件处理器，用于测试时手动触发
        const key = `${config.table}_${config.event}`
        realtimeHandlers[key] = handler
        mockChannelOn(_event, config, handler)
        return channelMock
      }),
      subscribe: vi.fn().mockImplementation((callback) => {
        mockSubscribe(callback)
        // 模拟订阅成功
        if (callback) {
          callback('SUBSCRIBED')
        }
        return channelMock
      })
    }
    return channelMock
  }

  return {
    supabase: {
      channel: vi.fn().mockImplementation(() => createChannelMock()),
      removeChannel: mockRemoveChannel
    }
  }
})

// Mock Repository 模块
vi.mock('@/db/repositories', () => ({
  notificationsRepository: {
    clearAllCache: mockNotificationsClearAllCache,
    clearCacheByUser: vi.fn()
  },
  vehiclesRepository: {
    clearAllCache: mockVehiclesClearAllCache
  }
}))

// Mock eventBus
vi.mock('@/utils/eventBus', () => ({
  eventBus: {
    publish: mockEventBusPublish
  }
}))

// Mock 日志工具
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn().mockReturnValue({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

// ==================== 测试用例 ====================

describe('Property 6: Realtime 事件触发缓存失效', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    realtimeHandlers = {}
  })

  afterEach(async () => {
    // 清理测试后的状态
    vi.resetModules()
  })

  describe('6.1 RealtimeCacheInvalidator 初始化', () => {
    it('initialize 应该创建 Realtime 频道并订阅事件', async () => {
      // 动态导入以获取新实例
      const { RealtimeCacheInvalidator } = await import('../RealtimeCacheInvalidator')
      const invalidator = new RealtimeCacheInvalidator()

      await invalidator.initialize('user-123')

      // 验证已初始化
      expect(invalidator.isInitialized()).toBe(true)
      expect(invalidator.getCurrentUserId()).toBe('user-123')

      // 验证订阅了正确的事件
      expect(mockChannelOn).toHaveBeenCalledTimes(3)

      // 清理
      await invalidator.cleanup()
    })

    it('重复初始化相同用户应该跳过', async () => {
      const { RealtimeCacheInvalidator } = await import('../RealtimeCacheInvalidator')
      const invalidator = new RealtimeCacheInvalidator()

      await invalidator.initialize('user-123')
      const firstCallCount = mockChannelOn.mock.calls.length

      // 再次初始化相同用户
      await invalidator.initialize('user-123')

      // 不应该有新的订阅
      expect(mockChannelOn.mock.calls.length).toBe(firstCallCount)

      // 清理
      await invalidator.cleanup()
    })

    it('切换用户应该清理旧订阅并创建新订阅', async () => {
      const { RealtimeCacheInvalidator } = await import('../RealtimeCacheInvalidator')
      const invalidator = new RealtimeCacheInvalidator()

      await invalidator.initialize('user-123')
      expect(invalidator.getCurrentUserId()).toBe('user-123')

      // 切换到新用户
      await invalidator.initialize('user-456')

      // 应该调用了 removeChannel
      expect(mockRemoveChannel).toHaveBeenCalled()
      expect(invalidator.getCurrentUserId()).toBe('user-456')

      // 清理
      await invalidator.cleanup()
    })
  })

  describe('6.2 Notifications INSERT 事件触发缓存失效', () => {
    it('收到 notifications INSERT 事件应该清除通知缓存', async () => {
      const { RealtimeCacheInvalidator } = await import('../RealtimeCacheInvalidator')
      const invalidator = new RealtimeCacheInvalidator()

      await invalidator.initialize('user-123')

      // 模拟 notifications INSERT 事件
      const insertHandler = realtimeHandlers['notifications_INSERT']
      expect(insertHandler).toBeDefined()

      if (insertHandler) {
        insertHandler({
          new: {
            id: 'notification-001',
            recipient_id: 'user-123',
            type: 'system'
          },
          old: {}
        })
      }

      // 验证缓存被清除
      expect(mockNotificationsClearAllCache).toHaveBeenCalled()

      // 验证 eventBus 事件被发布
      expect(mockEventBusPublish).toHaveBeenCalledWith('notification:created', {
        notificationId: 'notification-001',
        recipientId: 'user-123'
      })

      // 清理
      await invalidator.cleanup()
    })
  })

  describe('6.3 Notifications UPDATE 事件触发缓存失效', () => {
    it('收到 notifications UPDATE 事件应该清除通知缓存', async () => {
      const { RealtimeCacheInvalidator } = await import('../RealtimeCacheInvalidator')
      const invalidator = new RealtimeCacheInvalidator()

      await invalidator.initialize('user-123')

      // 模拟 notifications UPDATE 事件（标记已读）
      const updateHandler = realtimeHandlers['notifications_UPDATE']
      expect(updateHandler).toBeDefined()

      if (updateHandler) {
        updateHandler({
          new: {
            id: 'notification-001',
            recipient_id: 'user-123',
            is_read: true
          },
          old: {
            id: 'notification-001',
            recipient_id: 'user-123',
            is_read: false
          }
        })
      }

      // 验证缓存被清除
      expect(mockNotificationsClearAllCache).toHaveBeenCalled()

      // 验证 notification:read 事件被发布
      expect(mockEventBusPublish).toHaveBeenCalledWith('notification:read', {
        notificationId: 'notification-001'
      })

      // 清理
      await invalidator.cleanup()
    })
  })

  describe('6.4 Vehicles UPDATE 事件触发缓存失效', () => {
    it('收到 vehicles UPDATE 事件应该清除车辆缓存', async () => {
      const { RealtimeCacheInvalidator } = await import('../RealtimeCacheInvalidator')
      const invalidator = new RealtimeCacheInvalidator()

      await invalidator.initialize('user-123')

      // 模拟 vehicles UPDATE 事件
      const updateHandler = realtimeHandlers['vehicles_UPDATE']
      expect(updateHandler).toBeDefined()

      if (updateHandler) {
        updateHandler({
          new: {
            id: 'vehicle-001',
            status: 'active',
            review_status: 'approved'
          },
          old: {
            id: 'vehicle-001',
            status: 'active',
            review_status: 'pending'
          }
        })
      }

      // 验证缓存被清除
      expect(mockVehiclesClearAllCache).toHaveBeenCalled()

      // 验证 vehicle:approved 事件被发布
      expect(mockEventBusPublish).toHaveBeenCalledWith('vehicle:approved', {
        vehicleId: 'vehicle-001'
      })

      // 清理
      await invalidator.cleanup()
    })

    it('车辆状态变更为 returned 应该发布 vehicle:returned 事件', async () => {
      const { RealtimeCacheInvalidator } = await import('../RealtimeCacheInvalidator')
      const invalidator = new RealtimeCacheInvalidator()

      await invalidator.initialize('user-123')

      const updateHandler = realtimeHandlers['vehicles_UPDATE']
      if (updateHandler) {
        updateHandler({
          new: {
            id: 'vehicle-002',
            status: 'returned',
            review_status: 'approved'
          },
          old: {
            id: 'vehicle-002',
            status: 'active',
            review_status: 'approved'
          }
        })
      }

      // 验证 vehicle:returned 事件被发布
      expect(mockEventBusPublish).toHaveBeenCalledWith('vehicle:returned', {
        vehicleId: 'vehicle-002'
      })

      // 清理
      await invalidator.cleanup()
    })

    it('车辆审核状态变更为 supplement_required 应该发布对应事件', async () => {
      const { RealtimeCacheInvalidator } = await import('../RealtimeCacheInvalidator')
      const invalidator = new RealtimeCacheInvalidator()

      await invalidator.initialize('user-123')

      const updateHandler = realtimeHandlers['vehicles_UPDATE']
      if (updateHandler) {
        updateHandler({
          new: {
            id: 'vehicle-003',
            status: 'active',
            review_status: 'supplement_required'
          },
          old: {
            id: 'vehicle-003',
            status: 'active',
            review_status: 'pending'
          }
        })
      }

      // 验证 vehicle:supplement_required 事件被发布
      expect(mockEventBusPublish).toHaveBeenCalledWith('vehicle:supplement_required', {
        vehicleId: 'vehicle-003'
      })

      // 清理
      await invalidator.cleanup()
    })
  })

  describe('6.5 Cleanup 清理订阅', () => {
    it('cleanup 应该移除 Realtime 频道并重置状态', async () => {
      const { RealtimeCacheInvalidator } = await import('../RealtimeCacheInvalidator')
      const invalidator = new RealtimeCacheInvalidator()

      await invalidator.initialize('user-123')
      expect(invalidator.isInitialized()).toBe(true)

      await invalidator.cleanup()

      // 验证状态已重置
      expect(invalidator.isInitialized()).toBe(false)
      expect(invalidator.getCurrentUserId()).toBeNull()

      // 验证 removeChannel 被调用
      expect(mockRemoveChannel).toHaveBeenCalled()
    })

    it('未初始化时调用 cleanup 应该安全跳过', async () => {
      const { RealtimeCacheInvalidator } = await import('../RealtimeCacheInvalidator')
      const invalidator = new RealtimeCacheInvalidator()

      // 未初始化直接调用 cleanup
      await invalidator.cleanup()

      // 不应该调用 removeChannel
      expect(mockRemoveChannel).not.toHaveBeenCalled()
    })
  })
})
