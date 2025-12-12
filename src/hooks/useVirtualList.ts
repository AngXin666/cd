import { useState, useMemo, useCallback } from 'react'

export interface UseVirtualListOptions {
  /** 每项的高度 */
  itemHeight: number
  /** 容器高度 */
  containerHeight: number
  /** 缓冲区大小 */
  overscan?: number
}

export interface UseVirtualListResult {
  /** 当前滚动位置 */
  scrollTop: number
  /** 设置滚动位置 */
  setScrollTop: (scrollTop: number) => void
  /** 可见区域的起始索引 */
  startIndex: number
  /** 可见区域的结束索引 */
  endIndex: number
  /** 总高度 */
  totalHeight: number
  /** 偏移量 */
  offsetY: number
  /** 滚动到指定索引 */
  scrollToIndex: (index: number) => void
}

/**
 * 虚拟滚动Hook
 * 
 * 提供虚拟滚动所需的状态和计算逻辑
 * 
 * @example
 * ```tsx
 * const virtualList = useVirtualList({
 *   itemHeight: 80,
 *   containerHeight: 600,
 *   overscan: 3
 * })
 * ```
 */
export function useVirtualList(
  itemCount: number,
  options: UseVirtualListOptions
): UseVirtualListResult {
  const { itemHeight, containerHeight, overscan = 3 } = options
  const [scrollTop, setScrollTop] = useState(0)

  // 计算可见区域
  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const end = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    return { startIndex: start, endIndex: end }
  }, [scrollTop, itemHeight, containerHeight, overscan, itemCount])

  // 计算总高度
  const totalHeight = useMemo(() => {
    return itemCount * itemHeight
  }, [itemCount, itemHeight])

  // 计算偏移量
  const offsetY = useMemo(() => {
    return startIndex * itemHeight
  }, [startIndex, itemHeight])

  // 滚动到指定索引
  const scrollToIndex = useCallback((index: number) => {
    const targetScrollTop = Math.max(0, Math.min(index * itemHeight, totalHeight - containerHeight))
    setScrollTop(targetScrollTop)
  }, [itemHeight, totalHeight, containerHeight])

  return {
    scrollTop,
    setScrollTop,
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    scrollToIndex
  }
}
