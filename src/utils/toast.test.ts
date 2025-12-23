/**
 * Toast 工具函数测试
 * 测试防抖、消息合并、队列显示、优先级管理和 Loading/Toast 互斥功能
 *
 * @module utils/toast.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Taro
vi.mock('@tarojs/taro', () => ({
  default: {
    showToast: vi.fn(),
    hideToast: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
  },
}))

// 导入被测试的模块
import {
  showToast,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  hideToast,
  showLoading,
  hideLoading,
  isLoading,
  getCurrentToastType,
  getQueueLength,
  showActionSuccess,
  showActionError,
  showRequiredError,
  showSelectError,
  clearDebounceMap,
} from './toast'
import Taro from '@tarojs/taro'

describe('Toast 工具函数', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 重置内部状态
    hideToast()
    hideLoading()
    clearDebounceMap()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('基本功能', () => {
    it('应该显示基本 Toast 消息', () => {
      vi.useFakeTimers()

      showToast('测试消息')

      // 等待合并缓冲时间
      vi.advanceTimersByTime(150)

      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '测试消息',
          icon: 'none',
        })
      )

      vi.useRealTimers()
    })

    it('应该支持对象参数', () => {
      vi.useFakeTimers()

      showToast({ message: '成功消息', type: 'success' })

      // 等待合并缓冲时间
      vi.advanceTimersByTime(150)

      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '成功消息',
          icon: 'success',
        })
      )

      vi.useRealTimers()
    })

    it('应该过滤空消息', () => {
      showToast('')
      showToast('   ')

      expect(Taro.showToast).not.toHaveBeenCalled()
    })
  })

  describe('防抖功能', () => {
    it('相同消息在 1 秒内不重复显示', () => {
      vi.useFakeTimers()

      // 第一次显示
      showToast('重复消息')
      vi.advanceTimersByTime(150)
      expect(Taro.showToast).toHaveBeenCalledTimes(1)

      // 立即再次调用相同消息，应该被防抖过滤
      showToast('重复消息')
      vi.advanceTimersByTime(150)
      expect(Taro.showToast).toHaveBeenCalledTimes(1) // 仍然是 1 次

      vi.useRealTimers()
    })

    it('不同消息不受防抖影响', () => {
      vi.useFakeTimers()

      showToast('消息1')
      vi.advanceTimersByTime(150)
      expect(Taro.showToast).toHaveBeenCalledTimes(1)

      // 清理当前 Toast 状态，模拟 Toast 已结束
      hideToast()
      clearDebounceMap()

      // 显示不同消息
      showToast('消息2')
      vi.advanceTimersByTime(150)
      expect(Taro.showToast).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })
  })

  describe('消息合并功能', () => {
    it('短时间内的相同类型消息应该合并', () => {
      vi.useFakeTimers()

      // 短时间内发送多条相同类型消息
      showToast({ message: '审批1', type: 'info' })
      showToast({ message: '审批2', type: 'info' })
      showToast({ message: '审批3', type: 'info' })

      // 合并缓冲时间内不应该显示
      expect(Taro.showToast).not.toHaveBeenCalled()

      // 等待合并缓冲时间后显示合并消息
      vi.advanceTimersByTime(150)

      expect(Taro.showToast).toHaveBeenCalledTimes(1)
      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('3条消息'),
        })
      )

      vi.useRealTimers()
    })

    it('单条消息不合并，直接显示', () => {
      vi.useFakeTimers()

      showToast({ message: '单条消息', type: 'info' })
      vi.advanceTimersByTime(150)

      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '单条消息',
        })
      )

      vi.useRealTimers()
    })

    it('错误消息不参与合并，立即显示', () => {
      showError('发生错误')

      // 错误消息立即显示，不等待合并
      expect(Taro.showToast).toHaveBeenCalledTimes(1)
      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '发生错误',
          icon: 'error',
        })
      )
    })
  })

  describe('队列显示功能', () => {
    it('低优先级消息应该加入队列', () => {
      vi.useFakeTimers()

      // 先显示 warning 消息（优先级 2）
      showToast({ message: '警告消息', type: 'warning' }, true)
      expect(Taro.showToast).toHaveBeenCalledTimes(1)

      // info 消息优先级更低（优先级 1），应该加入队列
      showToast({ message: 'info消息', type: 'info' }, true)
      expect(getQueueLength()).toBe(1)

      vi.useRealTimers()
    })
  })

  describe('优先级管理', () => {
    it('新消息应该等待当前消息显示完毕后再显示（不中断）', () => {
      vi.useFakeTimers()

      // 先显示普通消息
      showToast({ message: '普通消息', type: 'info' }, true)
      expect(Taro.showToast).toHaveBeenCalledTimes(1)

      // 新消息应该加入队列，不中断当前消息
      showError('紧急错误')
      expect(Taro.showToast).toHaveBeenCalledTimes(1) // 仍然是 1 次
      expect(getQueueLength()).toBe(1) // 新消息在队列中

      vi.useRealTimers()
    })

    it('成功消息应该等待当前消息显示完毕', () => {
      vi.useFakeTimers()

      // 先显示 info 消息
      showToast({ message: 'info消息', type: 'info' }, true)
      expect(Taro.showToast).toHaveBeenCalledTimes(1)

      // success 消息应该加入队列，等待当前消息结束
      showSuccess('保存成功')
      expect(Taro.showToast).toHaveBeenCalledTimes(1) // 仍然是 1 次
      expect(getQueueLength()).toBe(1) // 新消息在队列中

      vi.useRealTimers()
    })

    it('只有 error 消息可以中断 Loading', () => {
      // 显示 Loading
      showLoading('加载中...')
      expect(isLoading()).toBe(true)

      // error 消息应该中断 Loading
      showError('发生错误')
      expect(Taro.hideLoading).toHaveBeenCalled()
      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '发生错误',
          icon: 'error',
        })
      )
    })

    it('success 消息不应该中断 Loading，而是加入队列', () => {
      vi.useFakeTimers()

      // 显示 Loading
      showLoading('加载中...')
      expect(isLoading()).toBe(true)

      // success 消息应该加入队列，不中断 Loading
      showSuccess('操作成功')
      expect(Taro.hideLoading).not.toHaveBeenCalled()
      expect(getQueueLength()).toBe(1) // 消息在队列中

      vi.useRealTimers()
    })
  })

  describe('showSuccess / showError / showWarning / showInfo', () => {
    it('showSuccess 应该使用 success 图标（立即显示）', () => {
      // 操作反馈立即显示，不需要等待
      showSuccess('操作成功')

      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '操作成功',
          icon: 'success',
          duration: 1500,
        })
      )
    })

    it('showError 应该使用 error 图标（立即显示）', () => {
      // 错误消息立即显示，不需要等待
      showError('操作失败')

      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '操作失败',
          icon: 'error',
          duration: 2000,
        })
      )
    })

    it('showWarning 应该使用 none 图标', () => {
      vi.useFakeTimers()

      showWarning('警告信息')
      vi.advanceTimersByTime(150)

      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '警告信息',
          icon: 'none',
          duration: 2000,
        })
      )

      vi.useRealTimers()
    })

    it('showInfo 应该使用 none 图标', () => {
      vi.useFakeTimers()

      showInfo('提示信息')
      vi.advanceTimersByTime(150)

      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '提示信息',
          icon: 'none',
          duration: 2000,
        })
      )

      vi.useRealTimers()
    })
  })

  describe('Loading 和 Toast 互斥', () => {
    it('showLoading 应该显示加载提示', () => {
      showLoading('加载中...')

      expect(Taro.showLoading).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '加载中...',
          mask: true,
        })
      )
      expect(isLoading()).toBe(true)
    })

    it('hideLoading 应该隐藏加载提示', () => {
      showLoading('加载中...')
      hideLoading()

      expect(Taro.hideLoading).toHaveBeenCalled()
      expect(isLoading()).toBe(false)
    })

    it('Loading 显示时普通 Toast 应该排队', () => {
      vi.useFakeTimers()

      showLoading('加载中...')
      showToast({ message: '普通消息', type: 'info' }, true)

      // 普通消息应该加入队列
      expect(getQueueLength()).toBe(1)
      expect(Taro.showLoading).toHaveBeenCalled()
      expect(isLoading()).toBe(true)

      vi.useRealTimers()
    })

    it('错误消息应该中断 Loading', () => {
      showLoading('加载中...')
      showError('发生错误')

      // 错误消息应该立即显示，Loading 应该被隐藏
      expect(Taro.hideLoading).toHaveBeenCalled()
      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '发生错误',
          icon: 'error',
        })
      )
    })
  })

  describe('便捷函数', () => {
    it('showActionSuccess 应该显示正确的成功消息', () => {
      vi.useFakeTimers()

      showActionSuccess('save')
      vi.advanceTimersByTime(150)
      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '保存成功' })
      )

      // 清理状态
      hideToast()
      clearDebounceMap()
      vi.clearAllMocks()

      showActionSuccess('delete')
      vi.advanceTimersByTime(150)
      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '删除成功' })
      )

      vi.useRealTimers()
    })

    it('showActionError 应该显示正确的失败消息', () => {
      // 错误消息立即显示，不需要等待
      showActionError('load')
      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '加载失败' })
      )

      // 清理状态
      hideToast()
      clearDebounceMap()
      vi.clearAllMocks()

      showActionError('save')
      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '保存失败' })
      )
    })

    it('showRequiredError 应该显示必填项验证消息', () => {
      vi.useFakeTimers()

      showRequiredError('手机号')
      vi.advanceTimersByTime(150)
      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '请输入手机号' })
      )

      vi.useRealTimers()
    })

    it('showSelectError 应该显示选择项验证消息', () => {
      vi.useFakeTimers()

      showSelectError('仓库')
      vi.advanceTimersByTime(150)
      expect(Taro.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: '请选择仓库' })
      )

      vi.useRealTimers()
    })
  })

  describe('状态查询', () => {
    it('isLoading 应该返回正确的状态', () => {
      expect(isLoading()).toBe(false)

      showLoading('加载中')
      expect(isLoading()).toBe(true)

      hideLoading()
      expect(isLoading()).toBe(false)
    })

    it('getCurrentToastType 应该返回正确的类型', () => {
      expect(getCurrentToastType()).toBe(null)

      // success 立即显示
      showSuccess('成功')
      expect(getCurrentToastType()).toBe('success')

      hideToast()
      expect(getCurrentToastType()).toBe(null)
    })

    it('getQueueLength 应该返回正确的队列长度', () => {
      vi.useFakeTimers()

      expect(getQueueLength()).toBe(0)

      // 显示第一条消息
      showToast({ message: '消息1', type: 'info' }, true)

      // 第二条消息加入队列
      showToast({ message: '消息2', type: 'info' }, true)
      expect(getQueueLength()).toBe(1)

      // 第三条消息加入队列
      showToast({ message: '消息3', type: 'info' }, true)
      expect(getQueueLength()).toBe(2)

      vi.useRealTimers()
    })
  })
})
