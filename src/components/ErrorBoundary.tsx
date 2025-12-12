/**
 * 全局错误边界组件
 * 捕获 React 组件树中的错误，防止整个应用崩溃
 */

import React, { Component, ReactNode } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { createLogger } from '@/utils/logger'

const logger = createLogger('ErrorBoundary')

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // 记录错误日志
    logger.error('React 错误边界捕获到错误', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })

    this.setState({
      error,
      errorInfo
    })

    // 在开发环境显示详细错误信息
    if (process.env.NODE_ENV === 'development') {
      console.error('错误详情:', error)
      console.error('组件堆栈:', errorInfo.componentStack)
    }
  }


  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined
    })
  }

  handleGoHome = (): void => {
    Taro.reLaunch({ url: '/pages/login/index' })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误页面
      return (
        <View className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50">
          <View className="text-6xl mb-4">😕</View>
          <Text className="text-xl font-bold mb-2 text-gray-800">
            抱歉，页面出现了问题
          </Text>
          <Text className="text-sm text-gray-600 mb-6 text-center">
            我们已经记录了这个错误，会尽快修复
          </Text>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <View className="w-full mb-6 p-4 bg-red-50 rounded-lg">
              <Text className="text-xs text-red-800 font-mono break-all">
                {this.state.error.message}
              </Text>
            </View>
          )}

          <View className="flex flex-row gap-4">
            <Button
              className="px-6 py-2 bg-blue-500 text-white rounded-lg"
              onClick={this.handleReset}
            >
              重试
            </Button>
            <Button
              className="px-6 py-2 bg-gray-500 text-white rounded-lg"
              onClick={this.handleGoHome}
            >
              返回首页
            </Button>
          </View>
        </View>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
