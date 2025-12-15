/**
 * 刷新按钮组件
 * 提供手动刷新功能，作为 Realtime 连接失败时的备用刷新方式
 *
 * 功能：
 * - 显示刷新按钮，点击触发数据刷新
 * - 支持加载状态显示
 * - 可配置按钮样式和位置
 * - 集成 Realtime 连接状态，连接失败时自动显示
 *
 * @module components/RefreshButton
 * @feature event-driven-data-refresh
 * @requirements 9.2, 9.4
 */

import {Text, View} from '@tarojs/components'
import type React from 'react'
import {useCallback, useEffect, useState} from 'react'
import {type RealtimeConnectionStatus, subscribeToStatus} from '@/utils/realtimeConnectionManager'

// ==================== 类型定义 ====================

/**
 * 刷新按钮属性
 */
export interface RefreshButtonProps {
  /** 刷新回调函数 */
  onRefresh: () => Promise<void> | void
  /** 是否显示按钮（默认根据连接状态自动判断） */
  visible?: boolean
  /** 是否始终显示（忽略连接状态） */
  alwaysShow?: boolean
  /** 按钮文本（默认：刷新） */
  text?: string
  /** 加载中文本（默认：刷新中...） */
  loadingText?: string
  /** 按钮位置（默认：bottom-right） */
  position?: 'bottom-right' | 'bottom-center' | 'top-right' | 'inline'
  /** 自定义样式类名 */
  className?: string
  /** 自定义样式 */
  style?: React.CSSProperties
}

// ==================== 样式定义 ====================

/** 位置样式映射 */
const positionStyles: Record<string, React.CSSProperties> = {
  'bottom-right': {
    position: 'fixed',
    bottom: '100px',
    right: '20px',
    zIndex: 1000
  },
  'bottom-center': {
    position: 'fixed',
    bottom: '100px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000
  },
  'top-right': {
    position: 'fixed',
    top: '100px',
    right: '20px',
    zIndex: 1000
  },
  inline: {
    position: 'relative'
  }
}

/** 按钮基础样式 */
const buttonBaseStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 16px',
  backgroundColor: '#3B82F6',
  borderRadius: '24px',
  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
}

/** 按钮禁用样式 */
const buttonDisabledStyle: React.CSSProperties = {
  backgroundColor: '#9CA3AF',
  boxShadow: '0 2px 6px rgba(156, 163, 175, 0.3)',
  cursor: 'not-allowed'
}

// ==================== 组件实现 ====================

/**
 * 刷新按钮组件
 *
 * @param props - 组件属性
 * @returns 刷新按钮组件
 *
 * @example
 * ```tsx
 * // 基础用法 - 根据连接状态自动显示
 * <RefreshButton onRefresh={loadData} />
 *
 * // 始终显示
 * <RefreshButton onRefresh={loadData} alwaysShow />
 *
 * // 自定义位置和文本
 * <RefreshButton
 *   onRefresh={loadData}
 *   position="bottom-center"
 *   text="点击刷新"
 * />
 * ```
 */
export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  visible,
  alwaysShow = false,
  text = '刷新',
  loadingText = '刷新中...',
  position = 'bottom-right',
  className = '',
  style = {}
}) => {
  // ==================== 状态管理 ====================

  /** 加载状态 */
  const [isLoading, setIsLoading] = useState(false)

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

  // ==================== 事件处理 ====================

  /**
   * 处理刷新点击
   */
  const handleRefresh = useCallback(async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      await onRefresh()
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, onRefresh])

  // ==================== 渲染逻辑 ====================

  /**
   * 判断是否应该显示按钮
   * - 如果 visible 属性被显式设置，使用该值
   * - 如果 alwaysShow 为 true，始终显示
   * - 否则，当连接状态为 error 或 disconnected 时显示
   */
  const shouldShow = (): boolean => {
    if (visible !== undefined) {
      return visible
    }
    if (alwaysShow) {
      return true
    }
    // 连接失败或断开时显示刷新按钮
    return connectionStatus === 'error' || connectionStatus === 'disconnected'
  }

  // 不显示时返回 null
  if (!shouldShow()) {
    return null
  }

  // 合并样式
  const containerStyle: React.CSSProperties = {
    ...positionStyles[position],
    ...style
  }

  const buttonStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    ...(isLoading ? buttonDisabledStyle : {})
  }

  return (
    <View className={className} style={containerStyle}>
      <View style={buttonStyle} onClick={handleRefresh}>
        {/* 刷新图标 */}
        <View
          className={isLoading ? 'i-mdi-loading animate-spin' : 'i-mdi-refresh'}
          style={{
            fontSize: '18px',
            color: 'white',
            marginRight: '6px'
          }}
        />
        {/* 按钮文本 */}
        <Text style={{color: 'white', fontSize: '14px', fontWeight: '500'}}>{isLoading ? loadingText : text}</Text>
      </View>
    </View>
  )
}

export default RefreshButton
