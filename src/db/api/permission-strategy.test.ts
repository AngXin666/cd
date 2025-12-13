/**
 * 策略模板权限管理 API - 单元测试
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'

// Mock Supabase
vi.mock('@/client/supabase', () => ({
  supabase: {
    rpc: vi.fn()
  }
}))

import {supabase} from '@/client/supabase'

describe('permission-strategy API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==================== PEER_ADMIN 管理测试 ====================

  describe('createPeerAdmin', () => {
    it('应该成功创建PEER_ADMIN', async () => {
      const mockResult = {
        success: true,
        message: '创建成功',
        user_id: 'user-1',
        permission_level: 'full_control'
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResult,
        error: null
      } as any)

      const {createPeerAdmin} = await import('./permission-strategy')
      const result = await createPeerAdmin('user-1', 'full_control', 'boss-1', '测试备注')

      expect(result).toEqual(mockResult)
      expect(supabase.rpc).toHaveBeenCalledWith('create_peer_admin', {
        p_user_id: 'user-1',
        p_permission_level: 'full_control',
        p_boss_id: 'boss-1',
        p_notes: '测试备注'
      })
    })

    it('应该在RPC调用失败时返回失败结果', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '创建失败'}
      } as any)

      const {createPeerAdmin} = await import('./permission-strategy')
      const result = await createPeerAdmin('user-1', 'full_control', 'boss-1')

      expect(result.success).toBe(false)
      expect(result.message).toBe('创建失败')
    })

    it('应该在异常时返回失败结果', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('网络错误'))

      const {createPeerAdmin} = await import('./permission-strategy')
      const result = await createPeerAdmin('user-1', 'full_control', 'boss-1')

      expect(result.success).toBe(false)
      expect(result.message).toBe('创建异常')
    })
  })

  describe('updatePeerAdminPermission', () => {
    it('应该成功更新PEER_ADMIN权限', async () => {
      const mockResult = {
        success: true,
        message: '更新成功'
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResult,
        error: null
      } as any)

      const {updatePeerAdminPermission} = await import('./permission-strategy')
      const result = await updatePeerAdminPermission('user-1', 'view_only', 'boss-1', '更新备注')

      expect(result).toEqual(mockResult)
      expect(supabase.rpc).toHaveBeenCalledWith('update_peer_admin_permission', {
        p_user_id: 'user-1',
        p_permission_level: 'view_only',
        p_boss_id: 'boss-1',
        p_notes: '更新备注'
      })
    })

    it('应该在RPC调用失败时返回失败结果', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '更新失败'}
      } as any)

      const {updatePeerAdminPermission} = await import('./permission-strategy')
      const result = await updatePeerAdminPermission('user-1', 'view_only', 'boss-1')

      expect(result.success).toBe(false)
    })
  })

  describe('removePeerAdmin', () => {
    it('应该成功删除PEER_ADMIN', async () => {
      const mockResult = {success: true, message: '删除成功'}

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResult,
        error: null
      } as any)

      const {removePeerAdmin} = await import('./permission-strategy')
      const result = await removePeerAdmin('user-1', 'boss-1')

      expect(result).toEqual(mockResult)
      expect(supabase.rpc).toHaveBeenCalledWith('remove_peer_admin', {
        p_user_id: 'user-1',
        p_boss_id: 'boss-1'
      })
    })

    it('应该在RPC调用失败时返回失败结果', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '删除失败'}
      } as any)

      const {removePeerAdmin} = await import('./permission-strategy')
      const result = await removePeerAdmin('user-1', 'boss-1')

      expect(result.success).toBe(false)
    })
  })

  describe('getAllPeerAdmins', () => {
    it('应该返回PEER_ADMIN列表', async () => {
      const mockAdmins = [
        {user_id: 'u-1', user_name: '张三', permission_level: 'full_control'},
        {user_id: 'u-2', user_name: '李四', permission_level: 'view_only'}
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockAdmins,
        error: null
      } as any)

      const {getAllPeerAdmins} = await import('./permission-strategy')
      const result = await getAllPeerAdmins('boss-1')

      expect(result).toEqual(mockAdmins)
      expect(supabase.rpc).toHaveBeenCalledWith('get_all_peer_admins', {p_boss_id: 'boss-1'})
    })

    it('应该在RPC调用失败时返回空数组', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('获取失败')
      } as any)

      const {getAllPeerAdmins} = await import('./permission-strategy')
      const result = await getAllPeerAdmins('boss-1')

      expect(result).toEqual([])
    })
  })

  describe('getPeerAdminPermission', () => {
    it('应该返回PEER_ADMIN权限信息', async () => {
      const mockPermission = {
        user_id: 'u-1',
        user_name: '张三',
        permission_level: 'full_control',
        granted_by_id: 'boss-1',
        granted_by_name: '老板'
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [mockPermission],
        error: null
      } as any)

      const {getPeerAdminPermission} = await import('./permission-strategy')
      const result = await getPeerAdminPermission('u-1')

      expect(result).toEqual(mockPermission)
      expect(supabase.rpc).toHaveBeenCalledWith('get_peer_admin_permission', {p_user_id: 'u-1'})
    })

    it('应该在数据为空时返回null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null
      } as any)

      const {getPeerAdminPermission} = await import('./permission-strategy')
      const result = await getPeerAdminPermission('u-1')

      expect(result).toBeNull()
    })
  })

  // ==================== MANAGER 管理测试 ====================

  describe('createManager', () => {
    it('应该成功创建MANAGER', async () => {
      const mockResult = {success: true, message: '创建成功'}

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResult,
        error: null
      } as any)

      const {createManager} = await import('./permission-strategy')
      const result = await createManager('user-1', 'full_control', 'boss-1', '测试备注')

      expect(result).toEqual(mockResult)
      expect(supabase.rpc).toHaveBeenCalledWith('create_manager', {
        p_user_id: 'user-1',
        p_permission_level: 'full_control',
        p_boss_id: 'boss-1',
        p_notes: '测试备注'
      })
    })

    it('应该在RPC调用失败时返回失败结果', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '创建失败'}
      } as any)

      const {createManager} = await import('./permission-strategy')
      const result = await createManager('user-1', 'full_control', 'boss-1')

      expect(result.success).toBe(false)
    })
  })

  describe('updateManagerPermission', () => {
    it('应该成功更新MANAGER权限', async () => {
      const mockResult = {success: true, message: '更新成功'}

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResult,
        error: null
      } as any)

      const {updateManagerPermission} = await import('./permission-strategy')
      const result = await updateManagerPermission('user-1', 'view_only', 'boss-1')

      expect(result).toEqual(mockResult)
    })
  })

  describe('removeManager', () => {
    it('应该成功删除MANAGER', async () => {
      const mockResult = {success: true, message: '删除成功'}

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResult,
        error: null
      } as any)

      const {removeManager} = await import('./permission-strategy')
      const result = await removeManager('user-1', 'boss-1')

      expect(result).toEqual(mockResult)
    })
  })

  describe('getAllManagers', () => {
    it('应该返回MANAGER列表', async () => {
      const mockManagers = [
        {user_id: 'u-1', user_name: '张三', permission_level: 'full_control'}
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockManagers,
        error: null
      } as any)

      const {getAllManagers} = await import('./permission-strategy')
      const result = await getAllManagers('boss-1')

      expect(result).toEqual(mockManagers)
    })

    it('应该在RPC调用失败时返回空数组', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('获取失败')
      } as any)

      const {getAllManagers} = await import('./permission-strategy')
      const result = await getAllManagers('boss-1')

      expect(result).toEqual([])
    })
  })

  describe('getManagerPermission', () => {
    it('应该返回MANAGER权限信息', async () => {
      const mockPermission = {
        user_id: 'u-1',
        user_name: '张三',
        permission_level: 'full_control'
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [mockPermission],
        error: null
      } as any)

      const {getManagerPermission} = await import('./permission-strategy')
      const result = await getManagerPermission('u-1')

      expect(result).toEqual(mockPermission)
    })

    it('应该在数据为空时返回null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null
      } as any)

      const {getManagerPermission} = await import('./permission-strategy')
      const result = await getManagerPermission('u-1')

      expect(result).toBeNull()
    })
  })

  // ==================== 权限检查测试 ====================

  describe('isBoss', () => {
    it('应该在用户是BOSS时返回true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {isBoss} = await import('./permission-strategy')
      const result = await isBoss('user-1')

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('is_boss', {p_user_id: 'user-1'})
    })

    it('应该在用户不是BOSS时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: false,
        error: null
      } as any)

      const {isBoss} = await import('./permission-strategy')
      const result = await isBoss('user-1')

      expect(result).toBe(false)
    })

    it('应该在RPC调用失败时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('检查失败')
      } as any)

      const {isBoss} = await import('./permission-strategy')
      const result = await isBoss('user-1')

      expect(result).toBe(false)
    })
  })

  describe('isPeerAdminWithFullControl', () => {
    it('应该在PEER_ADMIN有完整控制权时返回true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {isPeerAdminWithFullControl} = await import('./permission-strategy')
      const result = await isPeerAdminWithFullControl('user-1')

      expect(result).toBe(true)
    })

    it('应该在RPC调用失败时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('检查失败')
      } as any)

      const {isPeerAdminWithFullControl} = await import('./permission-strategy')
      const result = await isPeerAdminWithFullControl('user-1')

      expect(result).toBe(false)
    })
  })

  describe('isPeerAdminViewOnly', () => {
    it('应该在PEER_ADMIN只有查看权时返回true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {isPeerAdminViewOnly} = await import('./permission-strategy')
      const result = await isPeerAdminViewOnly('user-1')

      expect(result).toBe(true)
    })
  })

  describe('isManagerWithFullControl', () => {
    it('应该在MANAGER有完整控制权时返回true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {isManagerWithFullControl} = await import('./permission-strategy')
      const result = await isManagerWithFullControl('user-1')

      expect(result).toBe(true)
    })
  })

  describe('isManagerViewOnly', () => {
    it('应该在MANAGER只有查看权时返回true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {isManagerViewOnly} = await import('./permission-strategy')
      const result = await isManagerViewOnly('user-1')

      expect(result).toBe(true)
    })
  })

  // ==================== SCHEDULER 管理测试 ====================

  describe('createScheduler', () => {
    it('应该成功创建SCHEDULER（完整控制权）', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null
      } as any)

      const {createScheduler} = await import('./permission-strategy')
      const result = await createScheduler('user-1', 'full_control', 'boss-1', '测试备注')

      expect(result.success).toBe(true)
      expect(result.permission_level).toBe('full_control')
      expect(supabase.rpc).toHaveBeenCalledWith('assign_permission_strategy', {
        p_user_id: 'user-1',
        p_strategy_name: 'scheduler_full_control',
        p_granted_by: 'boss-1',
        p_notes: '测试备注'
      })
    })

    it('应该成功创建SCHEDULER（仅查看权）', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null
      } as any)

      const {createScheduler} = await import('./permission-strategy')
      const result = await createScheduler('user-1', 'view_only', 'boss-1')

      expect(result.success).toBe(true)
      expect(result.permission_level).toBe('view_only')
      expect(supabase.rpc).toHaveBeenCalledWith('assign_permission_strategy', {
        p_user_id: 'user-1',
        p_strategy_name: 'scheduler_view_only',
        p_granted_by: 'boss-1',
        p_notes: null
      })
    })

    it('应该在RPC调用失败时返回失败结果', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '创建失败'}
      } as any)

      const {createScheduler} = await import('./permission-strategy')
      const result = await createScheduler('user-1', 'full_control', 'boss-1')

      expect(result.success).toBe(false)
    })
  })

  describe('getSchedulerPermission', () => {
    it('应该返回SCHEDULER权限信息（完整控制权）', async () => {
      const mockData = {
        user_id: 'u-1',
        user_name: '张三',
        user_phone: '13800138000',
        strategy_name: 'scheduler_full_control',
        granted_at: '2024-01-01',
        granted_by_id: 'boss-1',
        granted_by_name: '老板',
        notes: null
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [mockData],
        error: null
      } as any)

      const {getSchedulerPermission} = await import('./permission-strategy')
      const result = await getSchedulerPermission('u-1')

      expect(result).not.toBeNull()
      expect(result?.permission_level).toBe('full_control')
    })

    it('应该返回SCHEDULER权限信息（仅查看权）', async () => {
      const mockData = {
        user_id: 'u-1',
        user_name: '张三',
        user_phone: '13800138000',
        strategy_name: 'scheduler_view_only',
        granted_at: '2024-01-01',
        granted_by_id: 'boss-1',
        granted_by_name: '老板',
        notes: null
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [mockData],
        error: null
      } as any)

      const {getSchedulerPermission} = await import('./permission-strategy')
      const result = await getSchedulerPermission('u-1')

      expect(result).not.toBeNull()
      expect(result?.permission_level).toBe('view_only')
    })

    it('应该在策略名称不是SCHEDULER相关时返回null', async () => {
      const mockData = {
        user_id: 'u-1',
        strategy_name: 'manager_full_control'
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [mockData],
        error: null
      } as any)

      const {getSchedulerPermission} = await import('./permission-strategy')
      const result = await getSchedulerPermission('u-1')

      expect(result).toBeNull()
    })

    it('应该在数据为空时返回null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null
      } as any)

      const {getSchedulerPermission} = await import('./permission-strategy')
      const result = await getSchedulerPermission('u-1')

      expect(result).toBeNull()
    })
  })

  describe('updateSchedulerPermission', () => {
    it('应该成功更新SCHEDULER权限', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null
      } as any)

      const {updateSchedulerPermission} = await import('./permission-strategy')
      const result = await updateSchedulerPermission('user-1', 'view_only', 'boss-1')

      expect(result.success).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('update_permission_strategy', {
        p_user_id: 'user-1',
        p_strategy_name: 'scheduler_view_only',
        p_granted_by: 'boss-1',
        p_notes: null
      })
    })

    it('应该在RPC调用失败时返回失败结果', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '更新失败'}
      } as any)

      const {updateSchedulerPermission} = await import('./permission-strategy')
      const result = await updateSchedulerPermission('user-1', 'full_control', 'boss-1')

      expect(result.success).toBe(false)
    })
  })

  describe('removeScheduler', () => {
    it('应该成功移除SCHEDULER权限', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null
      } as any)

      const {removeScheduler} = await import('./permission-strategy')
      const result = await removeScheduler('user-1', 'boss-1')

      expect(result.success).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('remove_permission_strategy', {
        p_user_id: 'user-1',
        p_removed_by: 'boss-1'
      })
    })

    it('应该在RPC调用失败时返回失败结果', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '移除失败'}
      } as any)

      const {removeScheduler} = await import('./permission-strategy')
      const result = await removeScheduler('user-1', 'boss-1')

      expect(result.success).toBe(false)
    })
  })

  describe('isSchedulerFullControl', () => {
    it('应该在SCHEDULER有完整控制权时返回true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {isSchedulerFullControl} = await import('./permission-strategy')
      const result = await isSchedulerFullControl('user-1')

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('scheduler_has_full_control', {uid: 'user-1'})
    })

    it('应该在RPC调用失败时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('检查失败')
      } as any)

      const {isSchedulerFullControl} = await import('./permission-strategy')
      const result = await isSchedulerFullControl('user-1')

      expect(result).toBe(false)
    })
  })

  describe('isSchedulerViewOnly', () => {
    it('应该在SCHEDULER只有查看权时返回true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {isSchedulerViewOnly} = await import('./permission-strategy')
      const result = await isSchedulerViewOnly('user-1')

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('scheduler_is_view_only', {uid: 'user-1'})
    })

    it('应该在RPC调用失败时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('检查失败')
      } as any)

      const {isSchedulerViewOnly} = await import('./permission-strategy')
      const result = await isSchedulerViewOnly('user-1')

      expect(result).toBe(false)
    })
  })
})
