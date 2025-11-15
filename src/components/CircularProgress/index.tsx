import {Text, View} from '@tarojs/components'
import type React from 'react'

interface CircularProgressProps {
  percentage: number // 百分比 0-100
  size?: number // 圆环大小（像素）
  strokeWidth?: number // 圆环宽度（像素）
  color?: string // 圆环颜色
  backgroundColor?: string // 背景圆环颜色
  label?: string // 标签文字
  showPercentage?: boolean // 是否显示百分比
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 80,
  strokeWidth = 8,
  color = '#3b82f6',
  backgroundColor = '#e5e7eb',
  label = '',
  showPercentage = true
}) => {
  // 确保百分比在 0-100 之间
  const validPercentage = Math.min(Math.max(percentage, 0), 100)

  // 计算圆环参数
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (validPercentage / 100) * circumference

  // 根据达标率设置颜色
  const getColor = () => {
    if (validPercentage >= 100) return '#10b981' // 绿色 - 达标
    if (validPercentage >= 70) return '#f59e0b' // 黄色 - 警告
    return '#ef4444' // 红色 - 未达标
  }

  const progressColor = color === '#3b82f6' ? getColor() : color

  return (
    <View className="flex flex-col items-center">
      {/* SVG 环形图 */}
      <View className="relative" style={{width: `${size}px`, height: `${size}px`}}>
        <svg width={size} height={size} style={{transform: 'rotate(-90deg)'}}>
          {/* 背景圆环 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
          />
          {/* 进度圆环 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={progressColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.5s ease'
            }}
          />
        </svg>
        {/* 中心文字 */}
        {showPercentage && (
          <View
            className="absolute inset-0 flex items-center justify-center"
            style={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}>
            <Text className="text-lg font-bold" style={{color: progressColor}}>
              {validPercentage.toFixed(0)}%
            </Text>
          </View>
        )}
      </View>
      {/* 标签 */}
      {label && (
        <Text className="text-xs text-gray-600 mt-1 text-center" style={{maxWidth: `${size}px`}}>
          {label}
        </Text>
      )}
    </View>
  )
}

export default CircularProgress
