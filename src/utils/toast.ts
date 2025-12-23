/**
 * Toast 工具函数
 * 提供统一的提示消息接口，支持防抖、消息合并、队列显示和优先级管理
 *
 * 功能特性：
 * - 防抖：相同消息在指定时间内不重复显示
 * - 消息合并：短时间内的相同类型消息合并显示（如"3条审批待处理"）
 * - 队列显示：新消息等待旧消息显示完毕后再显示（不中断）
 * - 优先级管理：队列按优先级排序，高优先级消息优先显示
 * - Loading 和 Toast 互斥：只有 error 消息可以中断 Loading
 *
 * @module utils/toast
 */

import Taro from '@tarojs/taro'
import type { ToastType } from '@/components/Toast'

// ============================================
// 类型定义
// ============================================

export interface ToastOptions {
  /** 消息内容 */
  message: string
  /** 消息类型 */
  type?: ToastType
  /** 显示时长（毫秒） */
  duration?: number
  /** 是否显示遮罩 */
  mask?: boolean
}

/** 队列中的消息项 */
interface QueuedToast extends ToastOptions {
  /** 优先级（数字越大优先级越高） */
  priority: number
  /** 创建时间戳 */
  timestamp: number
}

// ============================================
// 配置常量
// ============================================

/** 默认显示时长配置（毫秒） */
const DEFAULT_DURATION = {
  success: 1500,
  error: 2000,
  warning: 2000,
  info: 2000,
  loading: 0, // loading 不自动消失
} as const

/** 
 * Toast 优先级 - 数字越大优先级越高
 * 
 * 设计理念：
 * - 操作反馈（success/error）优先级最高，因为这是用户正在做的事
 * - 警告（warning）中等优先级，需要用户注意
 * - 信息（info）最低优先级，通常是背景通知
 */
const TOAST_PRIORITY: Record<ToastType, number> = {
  info: 1,      // 背景通知，优先级最低
  warning: 2,   // 需要注意，中等优先级
  success: 4,   // 操作成功反馈，高优先级
  error: 5,     // 操作失败反馈，最高优先级
}

/** 防抖时间（毫秒）- 相同消息在此时间内不重复显示 */
const DEBOUNCE_TIME = 1000

/** 合并缓冲时间（毫秒）- 在此时间内的相同类型消息会被合并 */
const MERGE_BUFFER_TIME = 100

/** 队列消息间隔时间（毫秒）- 多条消息依次显示的间隔 */
const QUEUE_INTERVAL = 300

// ============================================
// 状态管理
// ============================================

/** 当前是否正在显示 Loading */
let isLoadingVisible = false

/** 当前是否正在显示 Toast */
let isToastVisible = false

/** 当前显示的 Toast 类型 */
let currentToastType: ToastType | 'loading' | null = null

/** 当前显示的消息内容 */
let currentMessage = ''

/** 消息队列 - 等待显示的消息 */
let toastQueue: QueuedToast[] = []

/** 自动隐藏定时器 */
let autoHideTimer: ReturnType<typeof setTimeout> | null = null

/** 防抖记录 - 记录最近显示的消息及其时间戳 */
const debounceMap: Map<string, number> = new Map()

/** 消息合并缓冲区 - 用于合并短时间内的相同类型消息 */
let mergeBuffer: Map<string, string[]> = new Map()

/** 合并缓冲定时器 */
let mergeTimer: ReturnType<typeof setTimeout> | null = null

/** 队列处理定时器 */
let queueTimer: ReturnType<typeof setTimeout> | null = null

// ============================================
// 内部工具函数
// ============================================

/**
 * 清除自动隐藏定时器
 */
function clearAutoHideTimer(): void {
  if (autoHideTimer) {
    clearTimeout(autoHideTimer)
    autoHideTimer = null
  }
}

/**
 * 清除合并缓冲定时器
 */
function clearMergeTimer(): void {
  if (mergeTimer) {
    clearTimeout(mergeTimer)
    mergeTimer = null
  }
}

/**
 * 清除队列处理定时器
 */
function clearQueueTimer(): void {
  if (queueTimer) {
    clearTimeout(queueTimer)
    queueTimer = null
  }
}

/**
 * 生成防抖 key
 * @param message - 消息内容
 * @param type - 消息类型
 * @returns 防抖 key
 */
function getDebounceKey(message: string, type: ToastType): string {
  return `${type}:${message}`
}

/**
 * 检查消息是否应该被防抖过滤
 * @param message - 消息内容
 * @param type - 消息类型
 * @returns 是否应该过滤（true = 过滤，不显示）
 */
function shouldDebounce(message: string, type: ToastType): boolean {
  const key = getDebounceKey(message, type)
  const lastTime = debounceMap.get(key)
  const now = Date.now()

  if (lastTime && now - lastTime < DEBOUNCE_TIME) {
    // 在防抖时间内，过滤掉
    return true
  }

  // 更新时间戳
  debounceMap.set(key, now)

  // 清理过期的防抖记录（避免内存泄漏）
  if (debounceMap.size > 100) {
    const expireTime = now - DEBOUNCE_TIME * 2
    for (const [k, v] of debounceMap.entries()) {
      if (v < expireTime) {
        debounceMap.delete(k)
      }
    }
  }

  return false
}

/**
 * 处理合并缓冲区中的消息
 * 将缓冲区中的消息合并后加入队列
 */
function flushMergeBuffer(): void {
  clearMergeTimer()

  if (mergeBuffer.size === 0) {
    return
  }

  const now = Date.now()

  // 按类型处理缓冲区中的消息
  for (const [typeKey, messages] of mergeBuffer.entries()) {
    const type = typeKey as ToastType
    const uniqueMessages = [...new Set(messages)] // 去重

    let finalMessage: string
    if (uniqueMessages.length === 1) {
      // 单条消息直接显示
      finalMessage = uniqueMessages[0]
    } else {
      // 多条消息合并显示
      finalMessage = `${uniqueMessages.length}条消息: ${uniqueMessages.slice(0, 2).join('、')}${uniqueMessages.length > 2 ? '...' : ''}`
    }

    // 加入显示队列
    const priority = TOAST_PRIORITY[type]
    toastQueue.push({
      message: finalMessage,
      type,
      priority,
      timestamp: now,
    })
  }

  mergeBuffer.clear()

  // 触发队列处理
  scheduleQueueProcessing()
}

/**
 * 调度队列处理
 * 如果当前没有显示 Toast 且没有 Loading，立即处理
 * 否则等待当前 Toast 结束后处理
 */
function scheduleQueueProcessing(): void {
  if (toastQueue.length === 0) {
    return
  }

  // 如果正在显示 Loading，等待
  if (isLoadingVisible) {
    return
  }

  // 如果当前没有显示 Toast，立即处理
  if (!isToastVisible) {
    processNextInQueue()
    return
  }

  // 如果已经有队列定时器，不重复设置
  if (queueTimer) {
    return
  }
}

/**
 * 处理队列中的下一条消息
 */
function processNextInQueue(): void {
  // 如果队列为空或正在显示 Loading，不处理
  if (toastQueue.length === 0 || isLoadingVisible) {
    return
  }

  // 按优先级排序，优先级相同则按时间排序
  toastQueue.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority
    }
    return a.timestamp - b.timestamp
  })

  const nextToast = toastQueue.shift()

  if (nextToast) {
    displayToast(nextToast)
  }
}

/**
 * 实际显示 Toast 的内部函数
 * @param options - Toast 配置
 */
function displayToast(options: ToastOptions): void {
  const { message, type = 'info', duration, mask = false } = options

  // 计算显示时长
  const finalDuration = duration ?? DEFAULT_DURATION[type]

  // 更新当前状态
  isToastVisible = true
  currentToastType = type
  currentMessage = message

  // 调用 Taro API 显示 Toast
  Taro.showToast({
    title: message,
    icon: mapTypeToIcon(type),
    duration: finalDuration,
    mask,
  })

  // 设置自动隐藏定时器
  clearAutoHideTimer()
  if (finalDuration > 0) {
    autoHideTimer = setTimeout(() => {
      isToastVisible = false
      currentToastType = null
      currentMessage = ''

      // 延迟处理队列中的下一条消息，避免视觉冲突
      if (toastQueue.length > 0) {
        queueTimer = setTimeout(() => {
          queueTimer = null
          processNextInQueue()
        }, QUEUE_INTERVAL)
      }
    }, finalDuration)
  }
}

/**
 * 映射 Toast 类型到 Taro icon
 * @param type - Toast 类型
 * @returns Taro icon 类型
 */
function mapTypeToIcon(type: ToastType): 'success' | 'error' | 'none' {
  const iconMap: Record<ToastType, 'success' | 'error' | 'none'> = {
    success: 'success',
    error: 'error',
    warning: 'none',
    info: 'none',
  }
  return iconMap[type]
}

// ============================================
// 公共 API
// ============================================

/**
 * 显示 Toast 提示
 *
 * 处理逻辑：
 * 1. 防抖：相同消息在 1 秒内不重复显示
 * 2. 合并：短时间内（100ms）的相同类型消息会被合并显示
 * 3. 队列：新消息等待旧消息显示完毕后再显示（不中断）
 * 4. 优先级：队列按优先级排序，高优先级消息优先显示
 * 5. Loading 互斥：Loading 显示时消息排队，只有 error 消息可中断 Loading
 *
 * @param options - Toast 配置或消息字符串
 * @param immediate - 是否立即显示（跳过合并缓冲，但仍受防抖限制）
 * @example
 * // 简单用法
 * showToast('操作成功')
 *
 * // 完整配置
 * showToast({ message: '保存成功', type: 'success', duration: 2000 })
 *
 * // 立即显示（不合并，但仍防抖）
 * showToast({ message: '紧急通知', type: 'warning' }, true)
 */
export function showToast(options: ToastOptions | string, immediate = false): void {
  const config = typeof options === 'string' ? { message: options } : options
  const { message, type = 'info' } = config

  // 空消息不显示
  if (!message || !message.trim()) {
    return
  }

  // 防抖检查：相同消息在 1 秒内不重复显示
  if (shouldDebounce(message, type)) {
    return
  }

  // 操作反馈（error/success）总是立即显示，不参与合并
  // 因为这是用户正在做的事，需要立即反馈
  if (type === 'error' || type === 'success') {
    immediate = true
  }

  // 立即显示模式：跳过合并缓冲
  if (immediate) {
    showToastImmediate(config)
    return
  }

  // 加入合并缓冲区
  const typeKey = type
  if (!mergeBuffer.has(typeKey)) {
    mergeBuffer.set(typeKey, [])
  }
  mergeBuffer.get(typeKey)!.push(message)

  // 设置合并定时器（如果还没有）
  if (!mergeTimer) {
    mergeTimer = setTimeout(flushMergeBuffer, MERGE_BUFFER_TIME)
  }
}

/**
 * 立即显示 Toast（内部函数）
 * 跳过合并缓冲，直接显示或加入队列
 * 
 * 显示策略：
 * - 新消息等待旧消息显示完毕后再显示（不中断）
 * - 只有 error 消息可以中断 Loading（因为这是操作失败，需要立即告知用户）
 * - 所有消息按优先级排队，依次显示
 * 
 * @param config - Toast 配置
 */
function showToastImmediate(config: ToastOptions): void {
  const { message, type = 'info' } = config
  const priority = TOAST_PRIORITY[type]
  const now = Date.now()
  const queuedToast: QueuedToast = { ...config, priority, timestamp: now }

  // 情况1：正在显示 Loading
  if (isLoadingVisible) {
    // 只有 error 消息可以中断 Loading（操作失败需要立即告知用户）
    if (type === 'error') {
      hideLoading()
      displayToast(config)
    } else {
      // 其他消息加入队列，等待 Loading 结束
      toastQueue.push(queuedToast)
    }
    return
  }

  // 情况2：当前没有 Toast 显示，直接显示
  if (!isToastVisible) {
    displayToast(config)
    return
  }

  // 情况3：当前有 Toast 显示，新消息加入队列等待
  // 不中断当前消息，等待其显示完毕后再显示新消息
  if (message !== currentMessage) {
    toastQueue.push(queuedToast)
  }
  // 相同消息，已被防抖过滤，不会到这里
}

/**
 * 显示成功提示（不合并，加入队列等待显示）
 * @param message - 消息内容
 * @param duration - 显示时长（默认 1500ms）
 */
export function showSuccess(message: string, duration?: number): void {
  showToast({ message, type: 'success', duration: duration ?? DEFAULT_DURATION.success })
}

/**
 * 显示错误提示（不合并，加入队列等待显示，可中断 Loading）
 * @param message - 消息内容
 * @param duration - 显示时长（默认 2000ms）
 */
export function showError(message: string, duration?: number): void {
  showToast({ message, type: 'error', duration: duration ?? DEFAULT_DURATION.error })
}

/**
 * 显示警告提示
 * @param message - 消息内容
 * @param duration - 显示时长（默认 2000ms）
 */
export function showWarning(message: string, duration?: number): void {
  showToast({ message, type: 'warning', duration: duration ?? DEFAULT_DURATION.warning })
}

/**
 * 显示信息提示
 * @param message - 消息内容
 * @param duration - 显示时长（默认 2000ms）
 */
export function showInfo(message: string, duration?: number): void {
  showToast({ message, type: 'info', duration: duration ?? DEFAULT_DURATION.info })
}

/**
 * 隐藏 Toast 并清空队列
 */
export function hideToast(): void {
  clearAutoHideTimer()
  clearMergeTimer()
  clearQueueTimer()
  isToastVisible = false
  currentToastType = null
  currentMessage = ''
  toastQueue = []
  mergeBuffer.clear()
  Taro.hideToast()
}

// ============================================
// Loading 管理
// ============================================

/**
 * 显示 Loading 提示
 *
 * 特性：
 * - Loading 显示时会隐藏当前 Toast（但保留队列）
 * - Loading 优先级最高
 * - 支持遮罩层防止用户操作
 *
 * @param message - 加载提示文字（默认 "加载中..."）
 * @param mask - 是否显示遮罩（默认 true）
 */
export function showLoading(message = '加载中...', mask = true): void {
  // 先隐藏当前 Toast（但保留队列）
  if (isToastVisible) {
    clearAutoHideTimer()
    clearQueueTimer()
    Taro.hideToast()
    isToastVisible = false
  }

  // 更新状态
  isLoadingVisible = true
  currentToastType = 'loading'

  // 显示 Loading
  Taro.showLoading({
    title: message,
    mask,
  })
}

/**
 * 隐藏 Loading 提示
 *
 * 特性：
 * - 隐藏后会自动显示队列中的 Toast（如果有）
 */
export function hideLoading(): void {
  if (!isLoadingVisible) {
    return
  }

  // 更新状态
  isLoadingVisible = false
  currentToastType = null

  // 隐藏 Loading
  Taro.hideLoading()

  // 延迟处理队列，避免视觉冲突
  setTimeout(() => {
    processNextInQueue()
  }, QUEUE_INTERVAL)
}

// ============================================
// 状态查询
// ============================================

/**
 * 检查 Loading 是否正在显示
 * @returns 是否正在显示 Loading
 */
export function isLoading(): boolean {
  return isLoadingVisible
}

/**
 * 获取当前 Toast 类型
 * @returns 当前显示的 Toast 类型，无显示时返回 null
 */
export function getCurrentToastType(): ToastType | 'loading' | null {
  return currentToastType
}

/**
 * 获取队列中的消息数量
 * @returns 队列中的消息数量
 */
export function getQueueLength(): number {
  return toastQueue.length
}

/**
 * 清除防抖记录（主要用于测试）
 */
export function clearDebounceMap(): void {
  debounceMap.clear()
}

// ============================================
// 便捷函数 - 使用消息常量
// ============================================

/**
 * 显示通用成功消息
 * @param action - 操作类型
 */
export function showActionSuccess(
  action: 'save' | 'delete' | 'create' | 'update' | 'submit'
): void {
  const messages = {
    save: '保存成功',
    delete: '删除成功',
    create: '创建成功',
    update: '修改成功',
    submit: '提交成功',
  }
  showSuccess(messages[action])
}

/**
 * 显示通用失败消息
 * @param action - 操作类型
 */
export function showActionError(
  action: 'load' | 'save' | 'delete' | 'create' | 'update' | 'submit' | 'operation'
): void {
  const messages = {
    load: '加载失败',
    save: '保存失败',
    delete: '删除失败',
    create: '创建失败',
    update: '修改失败',
    submit: '提交失败',
    operation: '操作失败',
  }
  showError(messages[action])
}

/**
 * 显示必填项验证消息
 * @param field - 字段名称
 */
export function showRequiredError(field: string): void {
  showWarning(`请输入${field}`)
}

/**
 * 显示选择项验证消息
 * @param field - 字段名称
 */
export function showSelectError(field: string): void {
  showWarning(`请选择${field}`)
}
