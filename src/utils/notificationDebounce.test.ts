/**
 * 通知防抖工具函数测试
 * 测试防抖逻辑、通知合并、取消等功能
 *
 * @module utils/notificationDebounce.test
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  cancelAllPendingNotifications,
  cancelPendingNotification,
  flushAllNotificationsImmediately,
  flushNotificationImmediately,
  getPendingNotificationCount,
  hasPendingNotification,
  NOTIFICATION_DEBOUNCE_MS,
  type NotificationConfig,
  NotificationPresets,
  sendDebouncedNotification
} from './notificationDebounce'

// Mock toast 函数
vi.mock('./toast', () => ({
  showInfo: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn()
}))

import {showInfo, showSuccess, showWarning} from './toast'

describe('notificationDebounce', () => {
  beforeEach(() => {
    // 使用假定时器
    vi.useFakeTimers()
    // 清理所有待处理通知
    cancelAllPendingNotifications()
    // 清理 mock 调用记录
    vi.clearAllMocks()
  })

  afterEach(() => {
    // 恢复真实定时器
    vi.useRealTimers()
  })

  describe('sendDebouncedNotification', () => {
    it('应该在防抖时间后显示单条通知', () => {
      const config: NotificationConfig = {
        type: 'leave_application',
        message: '收到新的请假申请',
        toastType: 'info'
      }

      sendDebouncedNotification(config)

      // 通知应该处于待处理状态
      expect(hasPendingNotification('leave_application')).toBe(true)
      expect(getPendingNotificationCount('leave_application')).toBe(1)

      // Toast 不应该立即显示
      expect(showInfo).not.toHaveBeenCalled()

      // 快进到防抖时间后
      vi.advanceTimersByTime(NOTIFICATION_DEBOUNCE_MS)

      // Toast 应该显示
      expect(showInfo).toHaveBeenCalledWith('收到新的请假申请')
      expect(hasPendingNotification('leave_application')).toBe(false)
    })

    it('应该合并防抖时间内的多条相同类型通知', () => {
      const config: NotificationConfig = {
        type: 'leave_application',
        message: '收到新的请假申请',
        batchMessage: '收到 {count} 条新的请假申请',
        toastType: 'info'
      }

      // 发送 3 条通知
      sendDebouncedNotification(config)
      sendDebouncedNotification(config)
      sendDebouncedNotification(config)

      // 应该累计 3 条
      expect(getPendingNotificationCount('leave_application')).toBe(3)

      // 快进到防抖时间后
      vi.advanceTimersByTime(NOTIFICATION_DEBOUNCE_MS)

      // 应该显示批量消息
      expect(showInfo).toHaveBeenCalledTimes(1)
      expect(showInfo).toHaveBeenCalledWith('收到 3 条新的请假申请')
    })

    it('应该支持不同类型的通知独立防抖', () => {
      const leaveConfig: NotificationConfig = {
        type: 'leave_application',
        message: '收到新的请假申请',
        toastType: 'info'
      }

      const vehicleConfig: NotificationConfig = {
        type: 'vehicle_review',
        message: '收到新的车辆审核请求',
        toastType: 'info'
      }

      sendDebouncedNotification(leaveConfig)
      sendDebouncedNotification(vehicleConfig)

      // 两种类型都应该有待处理通知
      expect(hasPendingNotification('leave_application')).toBe(true)
      expect(hasPendingNotification('vehicle_review')).toBe(true)

      // 快进到防抖时间后
      vi.advanceTimersByTime(NOTIFICATION_DEBOUNCE_MS)

      // 两条通知都应该显示
      expect(showInfo).toHaveBeenCalledTimes(2)
      expect(showInfo).toHaveBeenCalledWith('收到新的请假申请')
      expect(showInfo).toHaveBeenCalledWith('收到新的车辆审核请求')
    })

    it('应该支持自定义防抖时间', () => {
      const config: NotificationConfig = {
        type: 'general',
        message: '测试消息',
        toastType: 'info'
      }

      const customDebounceMs = 1000
      sendDebouncedNotification(config, customDebounceMs)

      // 1 秒前不应该显示
      vi.advanceTimersByTime(customDebounceMs - 100)
      expect(showInfo).not.toHaveBeenCalled()

      // 1 秒后应该显示
      vi.advanceTimersByTime(100)
      expect(showInfo).toHaveBeenCalledWith('测试消息')
    })

    it('应该支持不同的 Toast 类型', () => {
      sendDebouncedNotification({
        type: 'leave_application',
        message: '成功消息',
        toastType: 'success'
      })

      vi.advanceTimersByTime(NOTIFICATION_DEBOUNCE_MS)
      expect(showSuccess).toHaveBeenCalledWith('成功消息')

      sendDebouncedNotification({
        type: 'vehicle_review',
        message: '警告消息',
        toastType: 'warning'
      })

      vi.advanceTimersByTime(NOTIFICATION_DEBOUNCE_MS)
      expect(showWarning).toHaveBeenCalledWith('警告消息')
    })
  })

  describe('flushNotificationImmediately', () => {
    it('应该立即显示指定类型的待处理通知', () => {
      const config: NotificationConfig = {
        type: 'leave_application',
        message: '收到新的请假申请',
        toastType: 'info'
      }

      sendDebouncedNotification(config)

      // 立即刷新
      flushNotificationImmediately('leave_application')

      // 应该立即显示
      expect(showInfo).toHaveBeenCalledWith('收到新的请假申请')
      expect(hasPendingNotification('leave_application')).toBe(false)
    })

    it('应该正确处理不存在的通知类型', () => {
      // 不应该抛出错误
      expect(() => {
        flushNotificationImmediately('general')
      }).not.toThrow()
    })
  })

  describe('flushAllNotificationsImmediately', () => {
    it('应该立即显示所有待处理通知', () => {
      sendDebouncedNotification({
        type: 'leave_application',
        message: '请假通知',
        toastType: 'info'
      })

      sendDebouncedNotification({
        type: 'vehicle_review',
        message: '车辆通知',
        toastType: 'info'
      })

      flushAllNotificationsImmediately()

      expect(showInfo).toHaveBeenCalledTimes(2)
      expect(hasPendingNotification('leave_application')).toBe(false)
      expect(hasPendingNotification('vehicle_review')).toBe(false)
    })
  })

  describe('cancelPendingNotification', () => {
    it('应该取消指定类型的待处理通知', () => {
      sendDebouncedNotification({
        type: 'leave_application',
        message: '请假通知',
        toastType: 'info'
      })

      cancelPendingNotification('leave_application')

      // 通知应该被取消
      expect(hasPendingNotification('leave_application')).toBe(false)

      // 快进后也不应该显示
      vi.advanceTimersByTime(NOTIFICATION_DEBOUNCE_MS)
      expect(showInfo).not.toHaveBeenCalled()
    })
  })

  describe('cancelAllPendingNotifications', () => {
    it('应该取消所有待处理通知', () => {
      sendDebouncedNotification({
        type: 'leave_application',
        message: '请假通知',
        toastType: 'info'
      })

      sendDebouncedNotification({
        type: 'vehicle_review',
        message: '车辆通知',
        toastType: 'info'
      })

      cancelAllPendingNotifications()

      expect(hasPendingNotification('leave_application')).toBe(false)
      expect(hasPendingNotification('vehicle_review')).toBe(false)

      // 快进后也不应该显示
      vi.advanceTimersByTime(NOTIFICATION_DEBOUNCE_MS)
      expect(showInfo).not.toHaveBeenCalled()
    })
  })

  describe('NotificationPresets', () => {
    it('应该提供正确的请假申请通知配置', () => {
      const config = NotificationPresets.newLeaveApplication()

      expect(config.type).toBe('leave_application')
      expect(config.message).toBe('收到新的请假申请')
      expect(config.batchMessage).toBe('收到 {count} 条新的请假申请')
      expect(config.toastType).toBe('info')
    })

    it('应该提供正确的车辆审核结果通知配置', () => {
      const approvedConfig = NotificationPresets.vehicleReviewResult('approved')
      expect(approvedConfig.message).toBe('您的车辆审核已通过')
      expect(approvedConfig.toastType).toBe('success')

      const supplementConfig = NotificationPresets.vehicleReviewResult('supplement_required')
      expect(supplementConfig.message).toBe('您的车辆需要补录信息')
      expect(supplementConfig.toastType).toBe('warning')
    })

    it('应该提供正确的通用数据更新通知配置', () => {
      const config = NotificationPresets.dataUpdated('自定义消息')

      expect(config.type).toBe('general')
      expect(config.message).toBe('自定义消息')
      expect(config.toastType).toBe('info')
    })
  })

  describe('NOTIFICATION_DEBOUNCE_MS', () => {
    it('应该导出默认防抖时间为 3000ms', () => {
      expect(NOTIFICATION_DEBOUNCE_MS).toBe(3000)
    })
  })
})
