/**
 * Toast 工具函数
 * 提供统一的提示消息接口
 */

import Taro from '@tarojs/taro'
import type {ToastType} from '@/components/Toast'

export interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
}

/**
 * 显示 Toast 提示
 */
export function showToast(options: ToastOptions | string): void {
  const config = typeof options === 'string' ? {message: options} : options
  const {message, type = 'info', duration = 3000} = config

  // 映射类型到 Taro icon
  const iconMap: Record<ToastType, 'success' | 'error' | 'none'> = {
    success: 'success',
    error: 'error',
    warning: 'none',
    info: 'none'
  }

  Taro.showToast({
    title: message,
    icon: iconMap[type],
    duration
  })
}

/**
 * 显示成功提示
 */
export function showSuccess(message: string, duration?: number): void {
  showToast({message, type: 'success', duration})
}

/**
 * 显示错误提示
 */
export function showError(message: string, duration?: number): void {
  showToast({message, type: 'error', duration})
}

/**
 * 显示警告提示
 */
export function showWarning(message: string, duration?: number): void {
  showToast({message, type: 'warning', duration})
}

/**
 * 显示信息提示
 */
export function showInfo(message: string, duration?: number): void {
  showToast({message, type: 'info', duration})
}

/**
 * 隐藏 Toast
 */
export function hideToast(): void {
  Taro.hideToast()
}
