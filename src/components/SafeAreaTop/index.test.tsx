/**
 * SafeAreaTop 组件测试
 * 验证组件的渲染、默认属性和自定义属性功能
 */
import {render} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import SafeAreaTop from './index'

describe('SafeAreaTop 组件', () => {
  /**
   * 测试组件基本渲染
   */
  it('应该正确渲染组件', () => {
    const {container} = render(<SafeAreaTop />)
    const element = container.querySelector('.safe-area-top')

    expect(element).toBeTruthy()
  })

  /**
   * 测试默认属性 - 透明背景
   */
  it('应该使用默认的透明背景色', () => {
    const {container} = render(<SafeAreaTop />)
    const element = container.querySelector('.safe-area-top') as HTMLElement

    expect(element).toBeTruthy()
    expect(element.style.backgroundColor).toBe('transparent')
  })

  /**
   * 测试自定义背景色功能
   */
  it('应该正确应用自定义背景色', () => {
    const customColor = '#F8FAFC'
    const {container} = render(<SafeAreaTop backgroundColor={customColor} />)
    const element = container.querySelector('.safe-area-top') as HTMLElement

    expect(element).toBeTruthy()
    expect(element.style.backgroundColor).toBe(customColor)
  })

  /**
   * 测试固定高度 24px
   */
  it('应该有固定的 24px 高度', () => {
    const {container} = render(<SafeAreaTop />)
    const element = container.querySelector('.safe-area-top') as HTMLElement

    expect(element).toBeTruthy()
    expect(element.style.height).toBe('24px')
  })

  /**
   * 测试宽度为 100%
   */
  it('应该有 100% 的宽度', () => {
    const {container} = render(<SafeAreaTop />)
    const element = container.querySelector('.safe-area-top') as HTMLElement

    expect(element).toBeTruthy()
    expect(element.style.width).toBe('100%')
  })

  /**
   * 测试 flexShrink 属性
   */
  it('应该设置 flexShrink 为 0 防止被压缩', () => {
    const {container} = render(<SafeAreaTop />)
    const element = container.querySelector('.safe-area-top') as HTMLElement

    expect(element).toBeTruthy()
    expect(element.style.flexShrink).toBe('0')
  })

  /**
   * 测试自定义类名功能
   */
  it('应该正确应用自定义类名', () => {
    const customClassName = 'custom-safe-area'
    const {container} = render(<SafeAreaTop className={customClassName} />)
    const element = container.querySelector('.safe-area-top')

    expect(element).toBeTruthy()
    expect(element?.classList.contains(customClassName)).toBe(true)
  })

  /**
   * 测试同时使用自定义背景色和类名
   */
  it('应该同时支持自定义背景色和类名', () => {
    const customColor = '#FFFFFF'
    const customClassName = 'custom-class'
    const {container} = render(<SafeAreaTop backgroundColor={customColor} className={customClassName} />)
    const element = container.querySelector('.safe-area-top') as HTMLElement

    expect(element).toBeTruthy()
    expect(element.style.backgroundColor).toBe(customColor)
    expect(element.classList.contains(customClassName)).toBe(true)
  })
})
