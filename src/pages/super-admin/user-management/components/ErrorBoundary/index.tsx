/**
 * 错误边界组件
 *
 * @description 捕获子组件的 JavaScript 错误，显示降级 UI，防止整个应用崩溃
 * @module components/ErrorBoundary
 * @feature user-management-refactor
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<div>出错了</div>}>
 *   <UserList users={users} />
 * </ErrorBoundary>
 * ```
 */

import {Text, View} from '@tarojs/components'
import {Component, type ErrorInfo, type ReactNode} from 'react'

/**
 * ErrorBoundary组件的Props接口
 */
export interface ErrorBoundaryProps {
  /** 子组件 */
  children: ReactNode
  /** 自定义降级UI */
  fallback?: ReactNode
  /** 错误发生时的回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

/**
 * ErrorBoundary组件的State接口
 */
interface ErrorBoundaryState {
  /** 是否发生错误 */
  hasError: boolean
  /** 错误信息 */
  error: Error | null
}

/**
 * 错误边界组件
 * 用于捕获子组件树中的 JavaScript 错误，记录错误并显示降级 UI
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {hasError: false, error: null}
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {hasError: true, error}
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({hasError: false, error: null})
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <View className="p-6 bg-red-50 rounded-lg m-4">
          <View className="flex items-center mb-3">
            <Text className="text-red-500 text-lg font-bold">⚠️ 页面出错了</Text>
          </View>
          <Text className="text-sm text-gray-600 mb-4 block">
            {this.state.error?.message || '发生了未知错误，请稍后重试'}
          </Text>
          <View
            className="px-4 py-2 bg-blue-500 rounded text-center cursor-pointer inline-block"
            onClick={this.handleRetry}>
            <Text className="text-white text-sm">重试</Text>
          </View>
        </View>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
