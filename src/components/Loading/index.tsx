/**
 * 统一Loading组件
 *
 * @description 提供一致的加载状态展示，支持全局和局部loading
 * @module components/Loading
 *
 * @example
 * ```tsx
 * // 局部loading
 * <Loading loading={isLoading} tip="加载中...">
 *   <YourContent />
 * </Loading>
 *
 * // 全屏loading
 * <Loading loading={isLoading} fullscreen tip="处理中..." />
 * ```
 */

import {Text, View} from '@tarojs/components'
import type {ReactNode} from 'react'

export interface LoadingProps {
  /** 是否显示loading */
  loading?: boolean
  /** 提示文字 */
  tip?: string
  /** 是否全屏显示 */
  fullscreen?: boolean
  /** 子组件 */
  children?: ReactNode
  /** 自定义样式类名 */
  className?: string
  /** loading图标大小 */
  size?: 'small' | 'default' | 'large'
}

/**
 * Loading组件
 */
const Loading: React.FC<LoadingProps> = ({
  loading = false,
  tip = '加载中...',
  fullscreen = false,
  children,
  className = '',
  size = 'default'
}) => {
  // 根据size确定spinner大小
  const spinnerSize = {
    small: 'w-4 h-4',
    default: 'w-6 h-6',
    large: 'w-8 h-8'
  }[size]

  // Loading内容
  const loadingContent = (
    <View className="flex flex-col items-center justify-center">
      {/* Spinner */}
      <View className={`${spinnerSize} relative`}>
        <View
          className="absolute inset-0 rounded-full border-2 border-blue-200"
          style={{borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite'}}
        />
      </View>

      {/* 提示文字 */}
      {tip && <Text className="mt-3 text-sm text-gray-600">{tip}</Text>}
    </View>
  )

  // 全屏loading
  if (fullscreen && loading) {
    return (
      <View
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30"
        style={{backdropFilter: 'blur(2px)'}}>
        <View className="bg-white rounded-lg p-6 shadow-xl">{loadingContent}</View>
      </View>
    )
  }

  // 局部loading
  if (!fullscreen && loading) {
    return (
      <View className={`relative ${className}`}>
        {/* 遮罩层 */}
        <View className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-80 rounded">
          {loadingContent}
        </View>

        {/* 内容（半透明） */}
        <View className="opacity-50 pointer-events-none">{children}</View>
      </View>
    )
  }

  // 不显示loading时，直接渲染children
  return <>{children}</>
}

export default Loading

// 添加spin动画的样式（需要在全局CSS中添加）
// @keyframes spin {
//   from { transform: rotate(0deg); }
//   to { transform: rotate(360deg); }
// }
