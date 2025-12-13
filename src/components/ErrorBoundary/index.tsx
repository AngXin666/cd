/**
 * 错误边界组件
 *
 * @description 捕获子组件的 JavaScript 错误，显示降级 UI，防止整个应用崩溃
 * @module components/ErrorBoundary
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<div>出错了</div>}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */

import {Text, View} from '@tarojs/components'
import {Component, type ErrorInfo, type ReactNode} from 'react'
import {enhancedErrorHandler} from '@/utils/errorHandler'
import {createLogger} from '@/utils/logger'

const logger = createLogger('ErrorBoundary')

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
  /** 是否启用错误上报（默认true） */
  enableErrorReporting?: boolean
  /** 最大重试次数（默认3） */
  maxRetries?: number
  /** 组件名称（用于错误上下文） */
  componentName?: string
}

/**
 * ErrorBoundary组件的State接口
 */
interface ErrorBoundaryState {
  /** 是否发生错误 */
  hasError: boolean
  /** 错误信息 */
  error: Error | null
  /** 错误详情 */
  errorInfo: ErrorInfo | null
  /** 重试次数 */
  retryCount: number
}

/**
 * 错误边界组件
 * 用于捕获子组件树中的 JavaScript 错误，记录错误并显示降级 UI
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {hasError: true, error}
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const {enableErrorReporting = true, componentName = 'Unknown', onError} = this.props

    // 记录错误信息
    logger.error('组件错误', {
      error,
      errorInfo,
      componentName,
      retryCount: this.state.retryCount
    })

    // 更新状态
    this.setState({errorInfo})

    // 错误上报
    if (enableErrorReporting) {
      enhancedErrorHandler.handleWithContext(error, {
        showToast: false,
        context: {
          component: componentName,
          action: 'render',
          metadata: {
            componentStack: errorInfo.componentStack,
            retryCount: this.state.retryCount
          }
        }
      })
    }

    // 调用用户提供的错误回调
    onError?.(error, errorInfo)
  }

  handleRetry = (): void => {
    const {maxRetries = 3} = this.props
    const newRetryCount = this.state.retryCount + 1

    if (newRetryCount > maxRetries) {
      logger.warn('超过最大重试次数', {
        maxRetries,
        retryCount: newRetryCount
      })
      return
    }

    logger.info('重试渲染组件', {retryCount: newRetryCount})

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: newRetryCount
    })
  }

  handleReset = (): void => {
    logger.info('重置错误边界')
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    })
  }

  render(): ReactNode {
    const {maxRetries = 3} = this.props

    if (this.state.hasError) {
      // 使用自定义降级UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      const canRetry = this.state.retryCount < maxRetries
      const errorMessage = this.state.error?.message || '发生了未知错误，请稍后重试'

      return (
        <View className="p-6 bg-red-50 rounded-lg m-4">
          <View className="flex items-center mb-3">
            <Text className="text-red-500 text-lg font-bold">⚠️ 页面出错了</Text>
          </View>

          <Text className="text-sm text-gray-600 mb-2 block">{errorMessage}</Text>

          {this.state.retryCount > 0 && (
            <Text className="text-xs text-gray-500 mb-4 block">已重试 {this.state.retryCount} 次</Text>
          )}

          <View className="flex gap-2">
            {canRetry && (
              <View
                className="px-4 py-2 bg-blue-500 rounded text-center cursor-pointer inline-block"
                onClick={this.handleRetry}>
                <Text className="text-white text-sm">重试</Text>
              </View>
            )}

            <View
              className="px-4 py-2 bg-gray-500 rounded text-center cursor-pointer inline-block"
              onClick={this.handleReset}>
              <Text className="text-white text-sm">重置</Text>
            </View>
          </View>

          {!canRetry && (
            <Text className="text-xs text-red-500 mt-4 block">已达到最大重试次数，请刷新页面或联系技术支持</Text>
          )}
        </View>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
