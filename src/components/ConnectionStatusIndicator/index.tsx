/**
 * 连接状态指示器组件
 * 显示 Supabase Realtime 连接状态
 *
 * 功能：
 * - 显示当前连接状态（已连接、连接中、断开、错误）
 * - 连接失败时显示提示信息
 * - 支持点击重试
 *
 * @module components/ConnectionStatusIndicator
 * @feature event-driven-data-refresh
 * @requirements 9.1
 */

import {Text, View} from '@tarojs/components'
import type React from 'react'
import {useEffect, useState} from 'react'
import {type RealtimeConnectionStatus, subscribeToStatus} from '@/utils/realtimeConnectionManager'

// ==================== 类型定义 ====================

/**
 * 连接状态指示器属性
 */
export interface ConnectionStatusIndicatorProps {
  /** 是否显示（默认：仅在非连接状态时显示） */
  alwaysShow?: boolean
  /** 重试回调函数 */
  onRetry?: () => void
  /** 自定义样式类名 */
  className?: string
  /** 自定义样式 */
  style?: React.CSSProperties
}

// ==================== 状态配置 ====================

/** 状态配置映射 */
const statusConfig: Record<
  RealtimeConnectionStatus,
  {
    icon: string
    text: string
    color: string
    bgColor: string
    showRetry: boolean
  }
> = {
  connected: {
    icon: 'i-mdi-wifi',
    text: '实时连接正常',
    color: '#10B981',
    bgColor: '#D1FAE5',
    showRetry: false
  },
  connecting: {
    icon: 'i-mdi-wifi-strength-1',
    text: '正在连接...',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    showRetry: false
  },
  reconnecting: {
    icon: 'i-mdi-wifi-strength-1',
    text: '正在重连...',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    showRetry: false
  },
  disconnected: {
    icon: 'i-mdi-wifi-off',
    text: '连接已断开',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    showRetry: true
  },
  error: {
    icon: 'i-mdi-wifi-alert',
    text: '连接失败',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    showRetry: true
  }
}

// ==================== 组件实现 ====================

/**
 * 连接状态指示器组件
 *
 * @param props - 组件属性
 * @returns 连接状态指示器组件
 *
 * @example
 * ```tsx
 * // 基础用法 - 仅在非连接状态时显示
 * <ConnectionStatusIndicator />
 *
 * // 始终显示
 * <ConnectionStatusIndicator alwaysShow />
 *
 * // 带重试回调
 * <ConnectionStatusIndicator onRetry={handleRetry} />
 * ```
 */
export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  alwaysShow = false,
  onRetry,
  className = '',
  style = {}
}) => {
  // ==================== 状态管理 ====================

  /** Realtime 连接状态 */
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>('connected')

  // ==================== 副作用 ====================

  /**
   * 订阅 Realtime 连接状态变更
   */
  useEffect(() => {
    const unsubscribe = subscribeToStatus((status) => {
      setConnectionStatus(status)
    })

    return unsubscribe
  }, [])

  // ==================== 渲染逻辑 ====================

  // 获取当前状态配置
  const config = statusConfig[connectionStatus]

  // 判断是否应该显示
  const shouldShow = alwaysShow || connectionStatus !== 'connected'

  if (!shouldShow) {
    return null
  }

  // 容器样式
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: config.bgColor,
    borderRadius: '8px',
    ...style
  }

  return (
    <View className={className} style={containerStyle}>
      {/* 状态图标 */}
      <View
        className={config.icon}
        style={{
          fontSize: '16px',
          color: config.color,
          marginRight: '8px'
        }}
      />

      {/* 状态文本 */}
      <Text
        style={{
          fontSize: '12px',
          color: config.color,
          flex: 1
        }}>
        {config.text}
      </Text>

      {/* 重试按钮 */}
      {config.showRetry && onRetry && (
        <View
          onClick={onRetry}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            backgroundColor: config.color,
            borderRadius: '4px',
            cursor: 'pointer',
            marginLeft: '8px'
          }}>
          <View
            className="i-mdi-refresh"
            style={{
              fontSize: '14px',
              color: 'white',
              marginRight: '4px'
            }}
          />
          <Text
            style={{
              fontSize: '12px',
              color: 'white'
            }}>
            重试
          </Text>
        </View>
      )}
    </View>
  )
}

export default ConnectionStatusIndicator
