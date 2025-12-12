/**
 * useWarehouseAssign Hook 单元测试
 */

import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderHook, act, waitFor} from '@testing-library/react'
import {useWarehouseAssign} from './useWarehouseAssign'

// Mock dependencies
vi.mock('@tarojs/taro', () => ({
  default: {
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    showToast: vi.fn(),
    showModal: vi.fn().mockResolvedValue({confirm: true})
  },
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  showToast: vi.fn(),
  showModal: vi.fn().mockResolvedValue({confirm: true})
}))

vi.mock('@/db/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({error: null})
      })
    })
  }
}))

vi.mock('@/db/api/users', () => ({
  getCurrentUserWithRealName: vi.fn().mockResolvedValue({
    id: 'current-user-id',
    name: '当前用户',
    role: 'BOSS'
  })
}))

vi.mock('@/db/api/warehouses', () => ({
  getAllWarehouses: vi.fn().mockResolvedValue([
    {id: 'wh-1', name: '仓库A', is_active: true},
    {id: 'wh-2', name: '仓库B', is_active: true},
    {id: 'wh-3', name: '仓库C', is_active: false}
  ]),
  getWarehouseAssignmentsByDriver: vi.fn().mockResolvedValue([
    {warehouse_id: 'wh-1'}
  ]),
  getWarehouseAssignmentsByManager: vi.fn().mockResolvedValue([
    {warehouse_id: 'wh-2'}
  ]),
  deleteWarehouseAssignmentsByDriver: vi.fn().mockResolvedValue(true),
  insertWarehouseAssignment: vi.fn().mockResolvedValue(true),
  insertManagerWarehouseAssignment: vi.fn().mockResolvedValue(true),
  getWarehouseManagers: vi.fn().mockResolvedValue([
    {id: 'manager-1', name: '管理员1'}
  ])
}))

vi.mock('@/db/notificationApi', () => ({
  createNotifications: vi.fn().mockResolvedValue(true)
}))

describe('useWarehouseAssign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('初始化', () => {
    it('应该返回正确的初始状态', () => {
      const {result} = renderHook(() => useWarehouseAssign())

      expect(result.current.warehouses).toEqual([])
      expect(result.current.selectedIds).toEqual([])
      expect(result.current.loading).toBe(false)
    })

    it('应该包含所有必需的方法', () => {
      const {result} = renderHook(() => useWarehouseAssign())

      expect(typeof result.current.loadWarehouses).toBe('function')
      expect(typeof result.current.loadUserWarehouses).toBe('function')
      expect(typeof result.current.setSelectedIds).toBe('function')
      expect(typeof result.current.saveAssignment).toBe('function')
    })
  })

  describe('loadWarehouses', () => {
    it('应该加载活跃的仓库列表', async () => {
      const {result} = renderHook(() => useWarehouseAssign())

      await waitFor(() => {
        // 只加载 is_active: true 的仓库
        expect(result.current.warehouses.length).toBe(2)
        expect(result.current.warehouses.every(w => w.is_active)).toBe(true)
      })
    })

    it('应该过滤掉非活跃仓库', async () => {
      const {result} = renderHook(() => useWarehouseAssign())

      await waitFor(() => {
        const inactiveWarehouse = result.current.warehouses.find(w => w.id === 'wh-3')
        expect(inactiveWarehouse).toBeUndefined()
      })
    })
  })

  describe('setSelectedIds', () => {
    it('应该正确设置选中的仓库ID', () => {
      const {result} = renderHook(() => useWarehouseAssign())

      act(() => {
        result.current.setSelectedIds(['wh-1', 'wh-2'])
      })

      expect(result.current.selectedIds).toEqual(['wh-1', 'wh-2'])
    })

    it('应该支持清空选中', () => {
      const {result} = renderHook(() => useWarehouseAssign())

      act(() => {
        result.current.setSelectedIds(['wh-1'])
      })

      act(() => {
        result.current.setSelectedIds([])
      })

      expect(result.current.selectedIds).toEqual([])
    })
  })

  describe('Hook接口完整性', () => {
    it('应该返回所有必需的状态和方法', () => {
      const {result} = renderHook(() => useWarehouseAssign())

      // 验证状态
      expect('warehouses' in result.current).toBe(true)
      expect('selectedIds' in result.current).toBe(true)
      expect('loading' in result.current).toBe(true)

      // 验证方法
      expect('loadWarehouses' in result.current).toBe(true)
      expect('loadUserWarehouses' in result.current).toBe(true)
      expect('setSelectedIds' in result.current).toBe(true)
      expect('saveAssignment' in result.current).toBe(true)
    })

    it('warehouses应该是数组类型', () => {
      const {result} = renderHook(() => useWarehouseAssign())
      expect(Array.isArray(result.current.warehouses)).toBe(true)
    })

    it('selectedIds应该是数组类型', () => {
      const {result} = renderHook(() => useWarehouseAssign())
      expect(Array.isArray(result.current.selectedIds)).toBe(true)
    })

    it('loading应该是布尔类型', () => {
      const {result} = renderHook(() => useWarehouseAssign())
      expect(typeof result.current.loading).toBe('boolean')
    })
  })
})
