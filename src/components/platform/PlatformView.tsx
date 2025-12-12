/**
 * 平台适配视图组件
 * 根据不同平台提供适配的UI布局
 */

import React from 'react'
import { View } from '@tarojs/components'
import { platform, platformUI } from '@/utils/platform'

interface PlatformViewProps {
  children: React.ReactNode
  className?: string
  enableSafeArea?: boolean
  enableStatusBar?: boolean
}

/**
 * 平台适配的根视图组件
 */
export const PlatformView: React.FC<PlatformViewProps> = ({
  children,
  className = '',
  enableSafeArea = true,
  enableStatusBar = true
}) => {
  // 获取平台特定的样式
  const getPlatformStyles = () => {
    const styles: React.CSSProperties = {}

    if (enableStatusBar) {
      const statusBarHeight = platformUI.getStatusBarHeight()
      if (statusBarHeight > 0) {
        styles.paddingTop = `${statusBarHeight}px`
      }
    }

    if (enableSafeArea) {
      const safeAreaBottom = platformUI.getSafeAreaBottom()
      if (safeAreaBottom > 0) {
        styles.paddingBottom = `${safeAreaBottom}px`
      }
    }

    return styles
  }

  // 获取平台特定的类名
  const getPlatformClassName = () => {
    const baseClass = 'platform-view'
    const platformClass = platform.isWeapp() 
      ? 'platform-weapp' 
      : platform.isAndroid() 
        ? 'platform-android' 
        : 'platform-h5'
    
    return `${baseClass} ${platformClass} ${className}`.trim()
  }

  return (
    <View 
      className={getPlatformClassName()}
      style={getPlatformStyles()}
    >
      {children}
    </View>
  )
}

/**
 * 导航栏适配组件
 */
interface PlatformNavBarProps {
  title: string
  leftText?: string
  rightText?: string
  onLeftClick?: () => void
  onRightClick?: () => void
  backgroundColor?: string
  textColor?: string
}

export const PlatformNavBar: React.FC<PlatformNavBarProps> = ({
  title,
  leftText,
  rightText,
  onLeftClick,
  onRightClick,
  backgroundColor = '#1E3A8A',
  textColor = '#ffffff'
}) => {
  const navBarHeight = platformUI.getNavigationBarHeight()
  const statusBarHeight = platformUI.getStatusBarHeight()

  const navBarStyles: React.CSSProperties = {
    height: `${navBarHeight}px`,
    backgroundColor,
    color: textColor,
    paddingTop: `${statusBarHeight}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000
  }

  // 微信小程序使用原生导航栏
  if (platform.isWeapp()) {
    return null // 微信小程序使用系统导航栏
  }

  return (
    <View className="platform-navbar" style={navBarStyles}>
      <View 
        className="navbar-left" 
        onClick={onLeftClick}
        style={{ minWidth: '60px', textAlign: 'left' }}
      >
        {leftText}
      </View>
      <View 
        className="navbar-title" 
        style={{ 
          flex: 1, 
          textAlign: 'center', 
          fontSize: '18px', 
          fontWeight: 'bold' 
        }}
      >
        {title}
      </View>
      <View 
        className="navbar-right" 
        onClick={onRightClick}
        style={{ minWidth: '60px', textAlign: 'right' }}
      >
        {rightText}
      </View>
    </View>
  )
}

/**
 * 底部安全区域组件
 */
interface PlatformSafeAreaProps {
  backgroundColor?: string
}

export const PlatformSafeArea: React.FC<PlatformSafeAreaProps> = ({
  backgroundColor = '#ffffff'
}) => {
  const safeAreaHeight = platformUI.getSafeAreaBottom()

  if (safeAreaHeight === 0) {
    return null
  }

  return (
    <View 
      className="platform-safe-area"
      style={{
        height: `${safeAreaHeight}px`,
        backgroundColor
      }}
    />
  )
}

/**
 * 平台特定的按钮组件
 */
interface PlatformButtonProps {
  children: React.ReactNode
  type?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  className?: string
}

export const PlatformButton: React.FC<PlatformButtonProps> = ({
  children,
  type = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  className = ''
}) => {
  // 获取平台特定的按钮样式
  const getButtonStyles = () => {
    const baseStyles: React.CSSProperties = {
      border: 'none',
      borderRadius: platform.isWeapp() ? '4px' : '8px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '500'
    }

    // 尺寸样式
    const sizeStyles = {
      small: { padding: '8px 16px', fontSize: '14px' },
      medium: { padding: '12px 24px', fontSize: '16px' },
      large: { padding: '16px 32px', fontSize: '18px' }
    }

    // 类型样式
    const typeStyles = {
      primary: { 
        backgroundColor: '#1E3A8A', 
        color: '#ffffff' 
      },
      secondary: { 
        backgroundColor: '#f3f4f6', 
        color: '#374151',
        border: '1px solid #d1d5db'
      },
      danger: { 
        backgroundColor: '#dc2626', 
        color: '#ffffff' 
      }
    }

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...typeStyles[type]
    }
  }

  const buttonClassName = `platform-button platform-button-${type} platform-button-${size} ${className}`.trim()

  return (
    <View
      className={buttonClassName}
      style={getButtonStyles()}
      onClick={disabled || loading ? undefined : onClick}
    >
      {loading && (
        <View className="button-loading" style={{ marginRight: '8px' }}>
          ⏳
        </View>
      )}
      {children}
    </View>
  )
}

export default {
  PlatformView,
  PlatformNavBar,
  PlatformSafeArea,
  PlatformButton
}