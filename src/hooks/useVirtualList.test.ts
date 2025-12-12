import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useVirtualList } from './useVirtualList'

describe('useVirtualList', () => {
  const defaultOptions = {
    itemHeight: 80,
    containerHeight: 600,
    overscan: 3
  }

  it('应该正确初始化', () => {
    const { result } = renderHook(() => useVirtualList(100, defaultOptions))

    expect(result.current.scrollTop).toBe(0)
    expect(result.current.startIndex).toBe(0)
    expect(result.current.totalHeight).toBe(8000) // 100 * 80
    expect(result.current.offsetY).toBe(0)
  })

  it('应该正确计算可见区域', () => {
    const { result } = renderHook(() => useVirtualList(100, defaultOptions))

    // 初始状态：显示前7.5项 + 缓冲区3项 = 11项
    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(11) // ceil(600/80) + 3 = 11
  })

  it('应该正确处理滚动', () => {
    const { result } = renderHook(() => useVirtualList(100, defaultOptions))

    act(() => {
      result.current.setScrollTop(400)
    })

    // 滚动到400px：起始索引 = floor(400/80) - 3 = 2
    expect(result.current.scrollTop).toBe(400)
    expect(result.current.startIndex).toBe(2)
    expect(result.current.offsetY).toBe(160) // 2 * 80
  })

  it('应该正确计算总高度', () => {
    const { result } = renderHook(() => useVirtualList(50, defaultOptions))

    expect(result.current.totalHeight).toBe(4000) // 50 * 80
  })

  it('应该正确计算偏移量', () => {
    const { result } = renderHook(() => useVirtualList(100, defaultOptions))

    act(() => {
      result.current.setScrollTop(800)
    })

    // 起始索引 = floor(800/80) - 3 = 7
    // 偏移量 = 7 * 80 = 560
    expect(result.current.startIndex).toBe(7)
    expect(result.current.offsetY).toBe(560)
  })

  it('应该正确处理缓冲区', () => {
    const { result } = renderHook(() =>
      useVirtualList(100, { ...defaultOptions, overscan: 5 })
    )

    // 初始状态：显示前7.5项 + 缓冲区5项 = 13项
    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(13) // ceil(600/80) + 5 = 13
  })

  it('应该正确处理边界情况 - 起始位置', () => {
    const { result } = renderHook(() => useVirtualList(100, defaultOptions))

    act(() => {
      result.current.setScrollTop(-100) // 负数滚动
    })

    // 起始索引不应该小于0
    expect(result.current.startIndex).toBe(0)
  })

  it('应该正确处理边界情况 - 结束位置', () => {
    const { result } = renderHook(() => useVirtualList(10, defaultOptions))

    act(() => {
      result.current.setScrollTop(1000) // 超出范围
    })

    // 结束索引不应该超过数据长度
    expect(result.current.endIndex).toBeLessThanOrEqual(9)
  })

  it('应该支持滚动到指定索引', () => {
    const { result } = renderHook(() => useVirtualList(100, defaultOptions))

    act(() => {
      result.current.scrollToIndex(20)
    })

    // 滚动到索引20：scrollTop = 20 * 80 = 1600
    expect(result.current.scrollTop).toBe(1600)
  })

  it('应该正确处理滚动到最后一项', () => {
    const { result } = renderHook(() => useVirtualList(100, defaultOptions))

    act(() => {
      result.current.scrollToIndex(99)
    })

    // 滚动到最后一项，但不超过最大滚动距离
    // 最大滚动距离 = totalHeight - containerHeight = 8000 - 600 = 7400
    expect(result.current.scrollTop).toBe(7400)
  })

  it('应该正确处理空列表', () => {
    const { result } = renderHook(() => useVirtualList(0, defaultOptions))

    expect(result.current.totalHeight).toBe(0)
    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(-1) // 空列表
  })

  it('应该正确处理单项列表', () => {
    const { result } = renderHook(() => useVirtualList(1, defaultOptions))

    expect(result.current.totalHeight).toBe(80)
    expect(result.current.startIndex).toBe(0)
    expect(result.current.endIndex).toBe(0)
  })

  it('应该正确处理不同的项高度', () => {
    const { result } = renderHook(() =>
      useVirtualList(100, { ...defaultOptions, itemHeight: 100 })
    )

    expect(result.current.totalHeight).toBe(10000) // 100 * 100
    expect(result.current.endIndex).toBe(9) // ceil(600/100) + 3 = 9
  })

  it('应该正确处理不同的容器高度', () => {
    const { result } = renderHook(() =>
      useVirtualList(100, { ...defaultOptions, containerHeight: 800 })
    )

    // 容器高度800：显示前10项 + 缓冲区3项 = 13项
    expect(result.current.endIndex).toBe(13) // ceil(800/80) + 3 = 13
  })

  it('应该在数据变化时重新计算', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useVirtualList(count, defaultOptions),
      { initialProps: { count: 100 } }
    )

    expect(result.current.totalHeight).toBe(8000)

    rerender({ count: 50 })

    expect(result.current.totalHeight).toBe(4000)
  })
})
