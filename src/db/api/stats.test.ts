/**
 * 统计数据 API - 单元测试
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    rpc: vi.fn()
  }
}))

import {supabase} from '../supabase'

describe('stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==================== 系统统计测试 ====================

  describe('getSystemStats', () => {
    it('应该返回系统统计数据', async () => {
      const mockStats = {
        total_users: 100,
        total_drivers: 80,
        total_managers: 10,
        total_warehouses: 5,
        total_vehicles: 50,
        total_active_vehicles: 45,
        total_attendance_today: 70,
        total_pending_leaves: 3,
        total_pending_resignations: 1,
        total_unread_notifications: 15
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [mockStats],
        error: null
      } as any)

      const {getSystemStats} = await import('./stats')
      const result = await getSystemStats('admin-1')

      expect(result).toEqual(mockStats)
      expect(supabase.rpc).toHaveBeenCalledWith('get_system_stats', {p_user_id: 'admin-1'})
    })

    it('应该在RPC调用失败时返回null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC调用失败')
      } as any)

      const {getSystemStats} = await import('./stats')
      const result = await getSystemStats('admin-1')

      expect(result).toBeNull()
    })

    it('应该在数据为空时返回null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null
      } as any)

      const {getSystemStats} = await import('./stats')
      const result = await getSystemStats('admin-1')

      expect(result).toBeNull()
    })

    it('应该在异常时返回null', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('网络错误'))

      const {getSystemStats} = await import('./stats')
      const result = await getSystemStats('admin-1')

      expect(result).toBeNull()
    })
  })

  // ==================== 用户个人统计测试 ====================

  describe('getUserPersonalStats', () => {
    it('应该返回用户个人统计数据', async () => {
      const mockStats = {
        my_attendance_count: 20,
        my_leave_count: 2,
        my_pending_leave_count: 1,
        my_approved_leave_count: 1,
        my_rejected_leave_count: 0,
        my_vehicles_count: 1,
        my_unread_notifications: 5,
        my_total_notifications: 30
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [mockStats],
        error: null
      } as any)

      const {getUserPersonalStats} = await import('./stats')
      const result = await getUserPersonalStats('user-1')

      expect(result).toEqual(mockStats)
      expect(supabase.rpc).toHaveBeenCalledWith('get_user_personal_stats', {p_user_id: 'user-1'})
    })

    it('应该在RPC调用失败时返回null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC调用失败')
      } as any)

      const {getUserPersonalStats} = await import('./stats')
      const result = await getUserPersonalStats('user-1')

      expect(result).toBeNull()
    })

    it('应该在数据为空时返回null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null
      } as any)

      const {getUserPersonalStats} = await import('./stats')
      const result = await getUserPersonalStats('user-1')

      expect(result).toBeNull()
    })
  })

  // ==================== 仓库统计测试 ====================

  describe('getWarehouseStats', () => {
    it('应该返回仓库统计数据', async () => {
      const mockStats = {
        warehouse_id: 'wh-1',
        warehouse_name: '仓库A',
        total_drivers: 15,
        total_vehicles: 10,
        active_vehicles: 8,
        attendance_today: 12,
        pending_leaves: 2
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [mockStats],
        error: null
      } as any)

      const {getWarehouseStats} = await import('./stats')
      const result = await getWarehouseStats('wh-1', 'user-1')

      expect(result).toEqual(mockStats)
      expect(supabase.rpc).toHaveBeenCalledWith('get_warehouse_stats', {
        p_warehouse_id: 'wh-1',
        p_user_id: 'user-1'
      })
    })

    it('应该在RPC调用失败时返回null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC调用失败')
      } as any)

      const {getWarehouseStats} = await import('./stats')
      const result = await getWarehouseStats('wh-1', 'user-1')

      expect(result).toBeNull()
    })

    it('应该在数据为空时返回null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null
      } as any)

      const {getWarehouseStats} = await import('./stats')
      const result = await getWarehouseStats('wh-1', 'user-1')

      expect(result).toBeNull()
    })
  })

  describe('getAllWarehousesStats', () => {
    it('应该返回所有仓库统计数据', async () => {
      const mockStats = [
        {warehouse_id: 'wh-1', warehouse_name: '仓库A', total_drivers: 15},
        {warehouse_id: 'wh-2', warehouse_name: '仓库B', total_drivers: 20}
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockStats,
        error: null
      } as any)

      const {getAllWarehousesStats} = await import('./stats')
      const result = await getAllWarehousesStats('admin-1')

      expect(result).toEqual(mockStats)
      expect(supabase.rpc).toHaveBeenCalledWith('get_all_warehouses_stats', {p_user_id: 'admin-1'})
    })

    it('应该在RPC调用失败时返回空数组', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC调用失败')
      } as any)

      const {getAllWarehousesStats} = await import('./stats')
      const result = await getAllWarehousesStats('admin-1')

      expect(result).toEqual([])
    })

    it('应该在异常时返回空数组', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('网络错误'))

      const {getAllWarehousesStats} = await import('./stats')
      const result = await getAllWarehousesStats('admin-1')

      expect(result).toEqual([])
    })
  })

  // ==================== 角色管理测试 ====================

  describe('getUserAllRoles', () => {
    it('应该返回用户所有角色', async () => {
      const mockRoles = [
        {role: 'DRIVER', created_at: '2024-01-01'},
        {role: 'MANAGER', created_at: '2024-06-01'}
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockRoles,
        error: null
      } as any)

      const {getUserAllRoles} = await import('./stats')
      const result = await getUserAllRoles('user-1')

      expect(result).toEqual(mockRoles)
      expect(supabase.rpc).toHaveBeenCalledWith('get_user_all_roles', {p_user_id: 'user-1'})
    })

    it('应该在RPC调用失败时返回空数组', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC调用失败')
      } as any)

      const {getUserAllRoles} = await import('./stats')
      const result = await getUserAllRoles('user-1')

      expect(result).toEqual([])
    })
  })

  describe('userHasRole', () => {
    it('应该在用户有指定角色时返回true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {userHasRole} = await import('./stats')
      const result = await userHasRole('user-1', 'DRIVER')

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('user_has_role', {
        p_user_id: 'user-1',
        p_role: 'DRIVER'
      })
    })

    it('应该在用户没有指定角色时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: false,
        error: null
      } as any)

      const {userHasRole} = await import('./stats')
      const result = await userHasRole('user-1', 'ADMIN')

      expect(result).toBe(false)
    })

    it('应该在RPC调用失败时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC调用失败')
      } as any)

      const {userHasRole} = await import('./stats')
      const result = await userHasRole('user-1', 'DRIVER')

      expect(result).toBe(false)
    })
  })

  // ==================== 当前用户信息测试 ====================

  describe('getCurrentUserInfo', () => {
    it('应该返回当前用户完整信息', async () => {
      const mockUserInfo = {
        user_id: 'user-1',
        name: '张三',
        phone: '13800138000',
        email: 'zhangsan@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
        roles: ['DRIVER', 'MANAGER'],
        is_admin: false,
        is_manager: true,
        is_driver: true,
        warehouses: [{id: 'wh-1', name: '仓库A', assigned_at: '2024-01-01'}],
        permissions: {
          can_manage_all: false,
          can_manage_warehouse: true,
          can_manage_drivers: true,
          can_view_all_data: false,
          can_approve_applications: true
        }
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [mockUserInfo],
        error: null
      } as any)

      const {getCurrentUserInfo} = await import('./stats')
      const result = await getCurrentUserInfo()

      expect(result).toEqual(mockUserInfo)
      expect(supabase.rpc).toHaveBeenCalledWith('get_current_user_info')
    })

    it('应该在RPC调用失败时返回null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC调用失败')
      } as any)

      const {getCurrentUserInfo} = await import('./stats')
      const result = await getCurrentUserInfo()

      expect(result).toBeNull()
    })

    it('应该在数据为空时返回null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null
      } as any)

      const {getCurrentUserInfo} = await import('./stats')
      const result = await getCurrentUserInfo()

      expect(result).toBeNull()
    })
  })

  // ==================== 角色操作测试 ====================

  describe('addRoleToUser', () => {
    it('应该成功添加角色', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {addRoleToUser} = await import('./stats')
      const result = await addRoleToUser('user-1', 'MANAGER', 'admin-1')

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('add_role_to_user', {
        p_user_id: 'user-1',
        p_role: 'MANAGER',
        p_admin_id: 'admin-1'
      })
    })

    it('应该在RPC调用失败时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC调用失败')
      } as any)

      const {addRoleToUser} = await import('./stats')
      const result = await addRoleToUser('user-1', 'MANAGER', 'admin-1')

      expect(result).toBe(false)
    })

    it('应该在异常时返回false', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('网络错误'))

      const {addRoleToUser} = await import('./stats')
      const result = await addRoleToUser('user-1', 'MANAGER', 'admin-1')

      expect(result).toBe(false)
    })
  })

  describe('removeRoleFromUser', () => {
    it('应该成功移除角色', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {removeRoleFromUser} = await import('./stats')
      const result = await removeRoleFromUser('user-1', 'MANAGER', 'admin-1')

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('remove_role_from_user', {
        p_user_id: 'user-1',
        p_role: 'MANAGER',
        p_admin_id: 'admin-1'
      })
    })

    it('应该在RPC调用失败时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC调用失败')
      } as any)

      const {removeRoleFromUser} = await import('./stats')
      const result = await removeRoleFromUser('user-1', 'MANAGER', 'admin-1')

      expect(result).toBe(false)
    })
  })

  describe('getUsersByRole', () => {
    it('应该返回指定角色的用户列表', async () => {
      const mockUsers = [
        {user_id: 'u-1', user_name: '张三', user_phone: '13800138001', user_email: 'a@test.com', created_at: '2024-01-01'},
        {user_id: 'u-2', user_name: '李四', user_phone: '13800138002', user_email: 'b@test.com', created_at: '2024-01-02'}
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockUsers,
        error: null
      } as any)

      const {getUsersByRole} = await import('./stats')
      const result = await getUsersByRole('DRIVER', 'admin-1')

      expect(result).toEqual(mockUsers)
      expect(supabase.rpc).toHaveBeenCalledWith('get_users_by_role', {
        p_role: 'DRIVER',
        p_admin_id: 'admin-1'
      })
    })

    it('应该在RPC调用失败时返回空数组', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC调用失败')
      } as any)

      const {getUsersByRole} = await import('./stats')
      const result = await getUsersByRole('DRIVER', 'admin-1')

      expect(result).toEqual([])
    })

    it('应该在异常时返回空数组', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('网络错误'))

      const {getUsersByRole} = await import('./stats')
      const result = await getUsersByRole('DRIVER', 'admin-1')

      expect(result).toEqual([])
    })
  })
})
