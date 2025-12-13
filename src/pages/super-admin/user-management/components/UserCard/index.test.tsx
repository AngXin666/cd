/**
 * UserCard 组件单元测试
 * @feature user-management-refactor
 * **Validates: Requirements 7.1, 7.4**
 */

import {fireEvent, render, screen} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'
import type {Profile} from '@/db/types'
import UserCard from './index'

// 测试用户数据
const mockUser: Profile & {real_name?: string} = {
  id: 'user-1',
  name: '张三',
  real_name: '张三丰',
  phone: '13800138000',
  email: 'zhangsan@example.com',
  role: 'DRIVER',
  status: 'active',
  driver_type: 'pure',
  avatar_url: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01'
}

const mockManager: Profile = {
  id: 'manager-1',
  name: '李四',
  phone: '13900139000',
  email: 'lisi@example.com',
  role: 'MANAGER',
  status: 'active',
  avatar_url: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01'
}

describe('UserCard', () => {
  it('应该正确渲染用户基本信息', () => {
    render(<UserCard user={mockUser} />)

    // 验证真实姓名显示
    expect(screen.getByText('张三丰')).toBeInTheDocument()
    // 验证角色和手机号显示
    expect(screen.getByText(/司机/)).toBeInTheDocument()
    expect(screen.getByText(/13800138000/)).toBeInTheDocument()
  })

  it('应该显示用户头像首字母', () => {
    render(<UserCard user={mockUser} />)
    expect(screen.getByText('张')).toBeInTheDocument()
  })

  it('应该正确显示角色标签', () => {
    const {rerender} = render(<UserCard user={mockUser} />)
    expect(screen.getByText(/司机/)).toBeInTheDocument()

    rerender(<UserCard user={mockManager} />)
    expect(screen.getByText(/车队长/)).toBeInTheDocument()
  })

  it('点击详情按钮应该触发onExpand回调', () => {
    const onExpand = vi.fn()
    render(<UserCard user={mockUser} onExpand={onExpand} />)

    const detailButton = screen.getByText('详情')
    fireEvent.click(detailButton)

    expect(onExpand).toHaveBeenCalledWith(mockUser)
  })

  it('showDetail为true时应该显示详细信息', () => {
    render(<UserCard user={mockUser} showDetail={true} />)

    expect(screen.getByText('手机号:')).toBeInTheDocument()
    expect(screen.getByText('邮箱:')).toBeInTheDocument()
    expect(screen.getByText('状态:')).toBeInTheDocument()
    expect(screen.getByText('司机类型:')).toBeInTheDocument()
  })

  it('showDetail为false时不应该显示详细信息', () => {
    render(<UserCard user={mockUser} showDetail={false} />)

    expect(screen.queryByText('手机号:')).not.toBeInTheDocument()
  })

  it('点击仓库按钮应该触发onAssignWarehouse回调', () => {
    const onAssignWarehouse = vi.fn()
    render(<UserCard user={mockUser} onAssignWarehouse={onAssignWarehouse} />)

    const warehouseButton = screen.getByText('仓库')
    fireEvent.click(warehouseButton)

    expect(onAssignWarehouse).toHaveBeenCalledWith(mockUser)
  })

  it('司机角色应该显示切换类型按钮', () => {
    const onToggleType = vi.fn()
    render(<UserCard user={mockUser} onToggleType={onToggleType} />)

    expect(screen.getByText('切换类型')).toBeInTheDocument()
  })

  it('非司机角色不应该显示切换类型按钮', () => {
    const onToggleType = vi.fn()
    render(<UserCard user={mockManager} onToggleType={onToggleType} />)

    expect(screen.queryByText('切换类型')).not.toBeInTheDocument()
  })

  it('showActions为false时不应该显示操作按钮', () => {
    render(<UserCard user={mockUser} showActions={false} onExpand={vi.fn()} />)

    expect(screen.queryByText('详情')).not.toBeInTheDocument()
  })
})
