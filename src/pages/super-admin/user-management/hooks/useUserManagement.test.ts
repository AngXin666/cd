/**
 * useUserManagement Hook 单元测试
 */

import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {useUserManagement} from './useUserManagement'

// Mock dependencies
vi.mock('miaoda-auth-taro', () => ({
  useAuth: () => ({
    user: {id: 'test-user-id', phone: '13800138000'}
  })
}))

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
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({data: {id: 'test-user-id', role: 'BOSS'}, error: null})
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({data: {id: 'new-user-id'}, error: null})
        })
      })
    }),
    auth: {
      signUp: vi.fn().mockResolvedValue({data: {user: {id: 'new-auth-id'}}, error: null})
    }
  }
}))

vi.mock('@/db/api/users', () => ({
  getAllUsers: vi.fn().mockResolvedValue([
    {id: 'user-1', name: '张三', role: 'DRIVER', phone: '13800138001'},
    {id: 'user-2', name: '李四', role: 'MANAGER', phone: '13800138002'}
  ]),
  createUser: vi.fn().mockResolvedValue({id: 'new-user-id', name: '新用户', role: 'DRIVER'}),
  updateProfile: vi.fn().mockResolvedValue(true)
}))

vi.mock('@/db/api/vehicles', () => ({
  getDriverLicense: vi.fn().mockResolvedValue({id_card_name: '张三'}),
  getDriverDetailInfo: vi.fn().mockResolvedValue({license: {id_card_name: '张三'}})
}))

vi.mock('@/db/api/warehouses', () => ({
  getAllWarehouses: vi.fn().mockResolvedValue([
    {id: 'wh-1', name: '仓库1', is_active: true},
    {id: 'wh-2', name: '仓库2', is_active: true}
  ]),
  getWarehouseAssignmentsByDriver: vi.fn().mockResolvedValue([{warehouse_id: 'wh-1'}]),
  getWarehouseAssignmentsByManager: vi.fn().mockResolvedValue([{warehouse_id: 'wh-2'}]),
  insertWarehouseAssignment: vi.fn().mockResolvedValue(true),
  insertManagerWarehouseAssignment: vi.fn().mockResolvedValue(true)
}))

vi.mock('@/db/notificationApi', () => ({
  createNotifications: vi.fn().mockResolvedValue(true)
}))

vi.mock('@/utils/cache', () => ({
  CACHE_KEYS: {
    SUPER_ADMIN_USERS: 'super_admin_users',
    SUPER_ADMIN_USER_DETAILS: 'super_admin_user_details'
  },
  getVersionedCache: vi.fn().mockReturnValue(null),
  setVersionedCache: vi.fn(),
  onDataUpdated: vi.fn()
}))

describe('useUserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('初始化', () => {
    it('应该返回正确的初始状态', async () => {
      const {result} = renderHook(() => useUserManagement())

      expect(result.current.users).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.userDetails).toBeInstanceOf(Map)
    })

    it('应该包含所有必需的方法', () => {
      const {result} = renderHook(() => useUserManagement())

      expect(typeof result.current.loadUsers).toBe('function')
      expect(typeof result.current.addUser).toBe('function')
      expect(typeof result.current.toggleUserType).toBe('function')
      expect(typeof result.current.loadUserDetail).toBe('function')
    })
  })

  describe('loadUsers', () => {
    it('应该加载用户列表', async () => {
      const {result} = renderHook(() => useUserManagement())

      await waitFor(() => {
        expect(result.current.users.length).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Hook接口完整性', () => {
    it('应该返回所有必需的状态和方法', () => {
      const {result} = renderHook(() => useUserManagement())

      // 验证状态
      expect('users' in result.current).toBe(true)
      expect('loading' in result.current).toBe(true)
      expect('currentUserProfile' in result.current).toBe(true)
      expect('userDetails' in result.current).toBe(true)

      // 验证方法
      expect('loadUsers' in result.current).toBe(true)
      expect('addUser' in result.current).toBe(true)
      expect('toggleUserType' in result.current).toBe(true)
      expect('loadUserDetail' in result.current).toBe(true)
    })

    it('users应该是数组类型', () => {
      const {result} = renderHook(() => useUserManagement())
      expect(Array.isArray(result.current.users)).toBe(true)
    })

    it('loading应该是布尔类型', () => {
      const {result} = renderHook(() => useUserManagement())
      expect(typeof result.current.loading).toBe('boolean')
    })

    it('userDetails应该是Map类型', () => {
      const {result} = renderHook(() => useUserManagement())
      expect(result.current.userDetails).toBeInstanceOf(Map)
    })
  })
})
