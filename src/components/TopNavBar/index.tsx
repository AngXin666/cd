/**
 * 顶部导航栏组件
 * 提供状态栏安全区域隔离，确保页面内容不会与设备状态栏重叠
 */
import { View } from '@tarojs/components'
import type React from 'react'
import './index.scss'

interface TopNavBarProps {
  /** 背景颜色，默认 '#F8FAFC' (浅灰色，与页面背景相同) */
  backgroundColor?: string
  /** 自定义类名 */
  className?: string
}

const TopNavBar: React.FC<TopNavBarProps> = ({
  backgroundColor = '#F8FAFC',
  className = ''
}) => {
  return (
    <View
      className={`top-nav-bar ${className}`}
      style={{
        backgroundColor,
        width: '100%',
        height: '44px',
        flexShrink: 0
      }}
    />
  )
}

export default TopNavBar
