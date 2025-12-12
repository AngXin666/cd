/**
 * UserFilter 组件单元测试
 * @feature user-management-refactor
 * **Validates: Requirements 7.1**
 */

import {fireEvent, render, screen} from '@testing-library/react'
import {describe, expect, it, vi} from 'vitest'
import UserFilter from './index'

describe('UserFilter', () => {
  it('应该正确渲染搜索框', () => {
    render(<UserFilter searchKeyword="" onSearchChange={vi.fn()} />)

    expect(screen.getByPlaceholderText('搜索用户（姓名/手机号/邮箱）')).toBeInTheDocument()
  })

  it('输入搜索关键词应该触发onSearchChange回调', () => {
    const onSearchChange = vi.fn()
    render(<UserFilter searchKeyword="" onSearchChange={onSearchChange} />)

    const input = screen.getByPlaceholderText('搜索用户（姓名/手机号/邮箱）')
    fireEvent.input(input, {target: {value: '张三'}})

    expect(onSearchChange).toHaveBeenCalledWith('张三')
  })

  it('应该显示添加用户按钮', () => {
    const onAddUser = vi.fn()
    render(<UserFilter searchKeyword="" onSearchChange={vi.fn()} onAddUser={onAddUser} />)

    expect(screen.getByText('添加用户')).toBeInTheDocument()
  })

  it('点击添加用户按钮应该触发onAddUser回调', () => {
    const onAddUser = vi.fn()
    render(<UserFilter searchKeyword="" onSearchChange={vi.fn()} onAddUser={onAddUser} />)

    fireEvent.click(screen.getByText('添加用户'))
    expect(onAddUser).toHaveBeenCalled()
  })

  it('应该显示刷新按钮', () => {
    const onRefresh = vi.fn()
    render(<UserFilter searchKeyword="" onSearchChange={vi.fn()} onRefresh={onRefresh} />)

    expect(screen.getByText('刷新')).toBeInTheDocument()
  })

  it('点击刷新按钮应该触发onRefresh回调', () => {
    const onRefresh = vi.fn()
    render(<UserFilter searchKeyword="" onSearchChange={vi.fn()} onRefresh={onRefresh} />)

    fireEvent.click(screen.getByText('刷新'))
    expect(onRefresh).toHaveBeenCalled()
  })

  it('showSearch为false时不应该显示搜索框', () => {
    render(<UserFilter searchKeyword="" onSearchChange={vi.fn()} showSearch={false} />)

    expect(screen.queryByPlaceholderText('搜索用户（姓名/手机号/邮箱）')).not.toBeInTheDocument()
  })
})
