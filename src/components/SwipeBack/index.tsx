import {View} from '@tarojs/components'
import Taro from '@tarojs/taro'
import {type ReactNode, useState} from 'react'

interface SwipeBackProps {
  children: ReactNode
  onBack?: () => void
  disabled?: boolean
}

/**
 * 滑动返回组件
 * 支持从屏幕左侧滑动返回上一页
 */
const SwipeBack: React.FC<SwipeBackProps> = ({children, onBack, disabled = false}) => {
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [offsetX, setOffsetX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)

  const handleTouchStart = (e: any) => {
    if (disabled) return

    const touch = e.touches[0]
    // 只在屏幕左侧 50px 内开始滑动时才触发
    if (touch.pageX < 50) {
      setStartX(touch.pageX)
      setStartY(touch.pageY)
      setIsSwiping(true)
    }
  }

  const handleTouchMove = (e: any) => {
    if (!isSwiping || disabled) return

    const touch = e.touches[0]
    const deltaX = touch.pageX - startX
    const deltaY = touch.pageY - startY

    // 如果是横向滑动（横向移动距离大于纵向移动距离）
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
      setOffsetX(Math.min(deltaX, 300)) // 最大偏移 300px
    }
  }

  const handleTouchEnd = () => {
    if (!isSwiping || disabled) {
      setIsSwiping(false)
      setOffsetX(0)
      return
    }

    // 如果滑动距离超过 100px，触发返回
    if (offsetX > 100) {
      if (onBack) {
        onBack()
      } else {
        const pages = Taro.getCurrentPages()
        if (pages.length > 1) {
          Taro.navigateBack()
        } else {
          Taro.switchTab({url: '/pages/index/index'})
        }
      }
    }

    setIsSwiping(false)
    setOffsetX(0)
  }

  return (
    <View
      className="relative min-h-screen"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        transform: `translateX(${offsetX}px)`,
        transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
      }}>
      {/* 滑动提示指示器 */}
      {isSwiping && offsetX > 10 && (
        <View
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
          style={{
            opacity: Math.min(offsetX / 100, 1)
          }}>
          <View className="w-12 h-12 flex items-center justify-center rounded-full bg-primary/20 backdrop-blur-sm ml-4">
            <View className="i-mdi-chevron-left text-3xl text-primary" />
          </View>
        </View>
      )}

      {/* 背景遮罩 */}
      {isSwiping && offsetX > 10 && (
        <View
          className="fixed inset-0 bg-black pointer-events-none z-40"
          style={{
            opacity: Math.min(offsetX / 300, 0.3)
          }}
        />
      )}

      {children}
    </View>
  )
}

export default SwipeBack
