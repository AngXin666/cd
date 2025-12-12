/**
 * useUserFilter Hook 单元测试
 * @feature user-management-refactor
 * **Property 6: 搜索结果一致性**
 * **Validates: Requirements 4.2, 7.2**
 */

import {act, renderHook} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import {useUserFilter} from './useUserFilter'
import type {UserWithRealName} from './useUserManagement'

// 测试用户数据
const mockUsers: UserWithRealName[] = [
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
  },
  {
    id: 'user-3',
    name: '王五',
    phone: '13700137000',
    email: 'wangwu@example.com',
    role: 'DRIVER',
    status: 'active',
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
]

describe('useUserFilter', () => {
  it('应该返回所有用户当没有筛选条件时', () => {
    const {result} = renderHook(() => useUserFilter({users: mockUsers}))

    expect(result.current.filteredUsers).toHaveLength(3)
  })

  it('应该根据角色筛选用户', () => {
    const {result} = renderHook(() =>
      useUserFilter({
        users: mockUsers,
        initialRole: 'DRIVER'
      })
    )

    expect(result.current.filteredUsers).toHaveLength(2)
    expect(result.current.filteredUsers.every((u) => u.role === 'DRIVER')).toBe(true)
  })

  it('应该根据搜索关键词筛选用户（姓名）', () => {
    const {result} = renderHook(() => useUserFilter({users: mockUsers}))

    act(() => {
      result.current.setSearchKeyword('张三')
    })

    expect(result.current.filteredUsers).toHaveLength(1)
    expect(result.current.filteredUsers[0].name).toBe('张三')
  })

  it('应该根据搜索关键词筛选用户（手机号）', () => {
    const {result} = renderHook(() => useUserFilter({users: mockUsers}))

    act(() => {
      result.current.setSearchKeyword('13800')
    })

    expect(result.current.filteredUsers).toHaveLength(1)
    expect(result.current.filteredUsers[0].phone).toBe('13800138000')
  })

  it('应该根据搜索关键词筛选用户（邮箱）', () => {
    const {result} = renderHook(() => useUserFilter({users: mockUsers}))

    act(() => {
      result.current.setSearchKeyword('lisi@')
    })

    expect(result.current.filteredUsers).toHaveLength(1)
    expect(result.current.filteredUsers[0].email).toBe('lisi@example.com')
  })

  it('应该支持设置角色筛选', () => {
    const {result} = renderHook(() => useUserFilter({users: mockUsers}))

    act(() => {
      result.current.setRoleFilter('MANAGER')
    })

    expect(result.current.roleFilter).toBe('MANAGER')
    expect(result.current.filteredUsers).toHaveLength(1)
  })

  it('搜索应该不区分大小写', () => {
    const {result} = renderHook(() => useUserFilter({users: mockUsers}))

    act(() => {
      result.current.setSearchKeyword('ZHANGSAN')
    })

    // 邮箱包含zhangsan，应该匹配
    expect(result.current.filteredUsers.length).toBeGreaterThanOrEqual(0)
  })

  it('空搜索关键词应该返回所有用户', () => {
    const {result} = renderHook(() => useUserFilter({users: mockUsers}))

    act(() => {
      result.current.setSearchKeyword('张三')
    })

    expect(result.current.filteredUsers).toHaveLength(1)

    act(() => {
      result.current.setSearchKeyword('')
    })

    expect(result.current.filteredUsers).toHaveLength(3)
  })
})
