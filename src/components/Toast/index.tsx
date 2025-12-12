/**
 * Toast 提示组件
 * 提供友好的错误、成功、警告提示
 */

import {View} from '@tarojs/components'
import {useEffect, useState} from 'react'
import './index.scss'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  visible?: boolean
  onClose?: () => void
}

const Toast: React.FC<ToastProps> = ({message, type = 'info', duration = 3000, visible = false, onClose}) => {
  const [show, setShow] = useState(visible)

  useEffect(() => {
    setShow(visible)

    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        setShow(false)
        onClose?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [visible, duration, onClose])

  if (!show) return null

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }

  return (
    <View className={`toast-container toast-${type} ${show ? 'toast-show' : ''}`}>
      <View className="toast-icon">{iconMap[type]}</View>
      <View className="toast-message">{message}</View>
    </View>
  )
}

export default Toast
