/**
 * 顶部安全区域组件
 * 在状态栏下方提供一个固定高度的安全区域
 * 确保内容不会与状态栏重叠
 */
import { View } from '@tarojs/components'
import type React from 'react'

interface SafeAreaTopProps {
  /** 背景颜色，默认透明 */
  backgroundColor?: string
  /** 自定义类名 */
  className?: string
}

const SafeAreaTop: React.FC<SafeAreaTopProps> = ({ 
  backgroundColor = 'transparent',
  className = ''
}) => {
  return (
    <View 
      className={`safe-area-top ${className}`}
      style={{ 
        height: '24px',
        backgroundColor,
        width: '100%',
        flexShrink: 0
      }}
    />
  )
}

export default SafeAreaTop
