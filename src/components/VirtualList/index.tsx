import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { View, ScrollView } from '@tarojs/components'
import './index.scss'

export interface VirtualListProps<T = any> {
  /** 列表数据 */
  data: T[]
  /** 每项的高度（固定高度模式） */
  itemHeight?: number
  /** 渲染每一项的函数 */
  renderItem: (item: T, index: number) => React.ReactNode
  /** 容器高度 */
  height: number
  /** 缓冲区大小（渲染可见区域外的项数） */
  overscan?: number
  /** 列表为空时的占位内容 */
  emptyText?: string
  /** 自定义类名 */
  className?: string
  /** 滚动事件回调 */
  onScroll?: (scrollTop: number) => void
  /** 获取每项的唯一key */
  getItemKey?: (item: T, index: number) => string | number
}

/**
 * 虚拟滚动列表组件
 * 
 * 只渲染可见区域的列表项，大幅提升长列表性能
 * 
 * @example
 * ```tsx
 * <VirtualList
 *   data={users}
 *   itemHeight={80}
 *   height={600}
 *   renderItem={(user) => <UserCard user={user} />}
 * />
 * ```
 */
export function VirtualList<T = any>(props: VirtualListProps<T>) {
  const {
    data,
    itemHeight = 80,
    renderItem,
    height,
    overscan = 3,
    emptyText = '暂无数据',
    className = '',
    onScroll,
    getItemKey = (_, index) => index
  } = props

  const [scrollTop, setScrollTop] = useState(0)
  const scrollViewRef = useRef<any>(null)

  // 计算可见区域
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      data.length - 1,
      Math.ceil((scrollTop + height) / itemHeight) + overscan
    )
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, height, overscan, data.length])

  // 计算总高度
  const totalHeight = useMemo(() => {
    return data.length * itemHeight
  }, [data.length, itemHeight])

  // 计算偏移量
  const offsetY = useMemo(() => {
    return visibleRange.startIndex * itemHeight
  }, [visibleRange.startIndex, itemHeight])

  // 获取可见项
  const visibleItems = useMemo(() => {
    return data.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
  }, [data, visibleRange.startIndex, visibleRange.endIndex])

  // 处理滚动事件
  const handleScroll = useCallback((e: any) => {
    const newScrollTop = e.detail.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
  }, [onScroll])

  // 空列表
  if (data.length === 0) {
    return (
      <View className={`virtual-list virtual-list--empty ${className}`} style={{ height: `${height}px` }}>
        <View className="virtual-list__empty">{emptyText}</View>
      </View>
    )
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      className={`virtual-list ${className}`}
      style={{ height: `${height}px` }}
      scrollY
      onScroll={handleScroll}
      scrollTop={scrollTop}
    >
      <View className="virtual-list__phantom" style={{ height: `${totalHeight}px` }}>
        <View className="virtual-list__content" style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.startIndex + index
            const key = getItemKey(item, actualIndex)
            return (
              <View
                key={key}
                className="virtual-list__item"
                style={{ height: `${itemHeight}px` }}
              >
                {renderItem(item, actualIndex)}
              </View>
            )
          })}
        </View>
      </View>
    </ScrollView>
  )
}

export default VirtualList
