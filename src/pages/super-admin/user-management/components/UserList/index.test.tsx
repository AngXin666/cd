/**
 * UserList 组件单元测试
 * @feature user-management-refactor
 * **Validates: Requirements 7.1**
 */

import {fireEvent, render, screen} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'
import type {Profile} from '@/db/types'
import UserList from './index'

// 测试用户数据
const mockUsers: (Profile & {real_name?: string})[] = [
  {
    id: 'user-1',
    name: '张三',
    real_name: '张三丰',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    role: 'DRIVER',
    status: 'active',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: 'user-2',
    name: '李四',
    phone: '13900139000',
    email: 'lisi@example.com',
    role: 'MANAGER',
    status: 'active',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
]

describe('UserList', () => {
  it('应该正确渲染用户列表', () => {
    render(<UserList users={mockUsers} />)

    expect(screen.getByText('张三丰')).toBeInTheDocument()
    expect(screen.getByText('李四')).toBeInTheDocument()
  })

  it('loading为true时应该显示加载状态', () => {
    render(<UserList users={[]} loading={true} />)

    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('用户列表为空时应该显示空状态', () => {
    render(<UserList users={[]} loading={false} />)

    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('点击仓库按钮应该触发onWarehouseAssign回调', () => {
    const onWarehouseAssign = vi.fn()
    render(<UserList users={mockUsers} onWarehouseAssign={onWarehouseAssign} />)

    const warehouseButtons = screen.getAllByText('仓库')
    fireEvent.click(warehouseButtons[0])

    expect(onWarehouseAssign).toHaveBeenCalledWith(mockUsers[0])
  })

  it('点击详情按钮应该展开用户详情', () => {
    render(<UserList users={mockUsers} />)

    // 初始状态不显示详细信息
    expect(screen.queryByText('手机号:')).not.toBeInTheDocument()

    // 点击详情按钮
    const detailButtons = screen.getAllByText('详情')
    fireEvent.click(detailButtons[0])

    // 应该显示详细信息
    expect(screen.getByText('手机号:')).toBeInTheDocument()
  })

  it('再次点击详情按钮应该收起用户详情', () => {
    render(<UserList users={mockUsers} />)

    const detailButtons = screen.getAllByText('详情')

    // 第一次点击展开
    fireEvent.click(detailButtons[0])
    expect(screen.getByText('手机号:')).toBeInTheDocument()

    // 第二次点击收起
    const collapseButton = screen.getByText('收起')
    fireEvent.click(collapseButton)
    expect(screen.queryByText('手机号:')).not.toBeInTheDocument()
  })
})
