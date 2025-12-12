/**
 * UserTabs 组件单元测试
 * @feature user-management-refactor
 * **Property 7: 标签页切换一致性**
 * **Validates: Requirements 4.3, 7.1**
 */

import {fireEvent, render, screen} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'
import UserTabs from './index'

describe('UserTabs', () => {
  it('应该正确渲染两个标签页', () => {
    render(<UserTabs activeTab="DRIVER" onTabChange={vi.fn()} />)

    expect(screen.getByText(/司机管理/)).toBeInTheDocument()
    expect(screen.getByText(/管理员管理/)).toBeInTheDocument()
  })

  it('activeTab为DRIVER时司机管理标签应该高亮', () => {
    render(<UserTabs activeTab="DRIVER" onTabChange={vi.fn()} />)

    const driverTab = screen.getByText(/司机管理/)
    expect(driverTab).toHaveClass('text-blue-500')
  })

  it('activeTab为MANAGER时管理员管理标签应该高亮', () => {
    render(<UserTabs activeTab="MANAGER" onTabChange={vi.fn()} />)

    const managerTab = screen.getByText(/管理员管理/)
    expect(managerTab).toHaveClass('text-blue-500')
  })

  it('点击司机管理标签应该触发onTabChange回调', () => {
    const onTabChange = vi.fn()
    render(<UserTabs activeTab="MANAGER" onTabChange={onTabChange} />)

    const driverTab = screen.getByText(/司机管理/)
    fireEvent.click(driverTab.parentElement!)

    expect(onTabChange).toHaveBeenCalledWith('DRIVER')
  })

  it('点击管理员管理标签应该触发onTabChange回调', () => {
    const onTabChange = vi.fn()
    render(<UserTabs activeTab="DRIVER" onTabChange={onTabChange} />)

    const managerTab = screen.getByText(/管理员管理/)
    fireEvent.click(managerTab.parentElement!)

    expect(onTabChange).toHaveBeenCalledWith('MANAGER')
  })

  it('标签页应该显示图标', () => {
    render(<UserTabs activeTab="DRIVER" onTabChange={vi.fn()} />)

    expect(screen.getByText(/👷/)).toBeInTheDocument()
    expect(screen.getByText(/👔/)).toBeInTheDocument()
  })
})
