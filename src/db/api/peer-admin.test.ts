/**
 * PEER_ADMIN管理 API - 单元测试
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    rpc: vi.fn()
  }
}))

import {supabase} from '../supabase'

describe('peer-admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==================== 创建PEER_ADMIN测试 ====================

  describe('createPeerAdmin', () => {
    it('应该成功创建PEER_ADMIN', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'permission-id-1',
        error: null
      } as any)

      const {createPeerAdmin} = await import('./peer-admin')
      const result = await createPeerAdmin('user-1', 'full_control', 'boss-1', '测试备注')

      expect(result).toBe('permission-id-1')
      expect(supabase.rpc).toHaveBeenCalledWith('create_peer_admin', {
        p_user_id: 'user-1',
        p_permission_level: 'full_control',
        p_boss_id: 'boss-1',
        p_notes: '测试备注'
      })
    })

    it('应该在没有备注时传递null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'permission-id-1',
        error: null
      } as any)

      const {createPeerAdmin} = await import('./peer-admin')
      await createPeerAdmin('user-1', 'view_only', 'boss-1')

      expect(supabase.rpc).toHaveBeenCalledWith('create_peer_admin', {
        p_user_id: 'user-1',
        p_permission_level: 'view_only',
        p_boss_id: 'boss-1',
        p_notes: null
      })
    })

    it('应该在RPC调用失败时抛出错误', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '创建失败'}
      } as any)

      const {createPeerAdmin} = await import('./peer-admin')

      await expect(createPeerAdmin('user-1', 'full_control', 'boss-1')).rejects.toThrow('创建失败')
    })
  })

  // ==================== 更新PEER_ADMIN权限测试 ====================

  describe('updatePeerAdminPermission', () => {
    it('应该成功更新PEER_ADMIN权限', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {updatePeerAdminPermission} = await import('./peer-admin')
      const result = await updatePeerAdminPermission('user-1', 'view_only', 'boss-1', '更新备注')

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('update_peer_admin_permission', {
        p_user_id: 'user-1',
        p_permission_level: 'view_only',
        p_boss_id: 'boss-1',
        p_notes: '更新备注'
      })
    })

    it('应该在RPC调用失败时抛出错误', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '更新失败'}
      } as any)

      const {updatePeerAdminPermission} = await import('./peer-admin')

      await expect(updatePeerAdminPermission('user-1', 'full_control', 'boss-1')).rejects.toThrow('更新失败')
    })
  })

  // ==================== 删除PEER_ADMIN测试 ====================

  describe('removePeerAdmin', () => {
    it('应该成功删除PEER_ADMIN', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {removePeerAdmin} = await import('./peer-admin')
      const result = await removePeerAdmin('user-1', 'boss-1')

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('remove_peer_admin', {
        p_user_id: 'user-1',
        p_boss_id: 'boss-1'
      })
    })

    it('应该在RPC调用失败时抛出错误', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '删除失败'}
      } as any)

      const {removePeerAdmin} = await import('./peer-admin')

      await expect(removePeerAdmin('user-1', 'boss-1')).rejects.toThrow('删除失败')
    })
  })

  // ==================== 获取PEER_ADMIN列表测试 ====================

  describe('getAllPeerAdmins', () => {
    it('应该返回PEER_ADMIN列表', async () => {
      const mockAdmins = [
        {
          user_id: 'u-1',
          user_name: '张三',
          user_phone: '13800138001',
          user_email: 'a@test.com',
          permission_level: 'full_control',
          granted_by: 'boss-1',
          granted_by_name: '老板',
          granted_at: '2024-01-01',
          notes: null
        },
        {
          user_id: 'u-2',
          user_name: '李四',
          user_phone: '13800138002',
          user_email: 'b@test.com',
          permission_level: 'view_only',
          granted_by: 'boss-1',
          granted_by_name: '老板',
          granted_at: '2024-01-02',
          notes: '仅查看'
        }
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockAdmins,
        error: null
      } as any)

      const {getAllPeerAdmins} = await import('./peer-admin')
      const result = await getAllPeerAdmins('boss-1')

      expect(result).toEqual(mockAdmins)
      expect(supabase.rpc).toHaveBeenCalledWith('get_all_peer_admins', {p_boss_id: 'boss-1'})
    })

    it('应该在RPC调用失败时抛出错误', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '获取失败'}
      } as any)

      const {getAllPeerAdmins} = await import('./peer-admin')

      await expect(getAllPeerAdmins('boss-1')).rejects.toThrow('获取失败')
    })

    it('应该在数据不是数组时返回空数组', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null
      } as any)

      const {getAllPeerAdmins} = await import('./peer-admin')
      const result = await getAllPeerAdmins('boss-1')

      expect(result).toEqual([])
    })
  })

  // ==================== 获取PEER_ADMIN权限详情测试 ====================

  describe('getPeerAdminPermission', () => {
    it('应该返回PEER_ADMIN权限详情', async () => {
      const mockPermission = {
        user_id: 'u-1',
        permission_level: 'full_control',
        granted_by: 'boss-1',
        granted_by_name: '老板',
        granted_at: '2024-01-01',
        updated_at: '2024-01-01',
        notes: '完整控制权'
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [mockPermission],
        error: null
      } as any)

      const {getPeerAdminPermission} = await import('./peer-admin')
      const result = await getPeerAdminPermission('u-1')

      expect(result).toEqual(mockPermission)
      expect(supabase.rpc).toHaveBeenCalledWith('get_peer_admin_permission', {p_user_id: 'u-1'})
    })

    it('应该在RPC调用失败时返回null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('获取失败')
      } as any)

      const {getPeerAdminPermission} = await import('./peer-admin')
      const result = await getPeerAdminPermission('u-1')

      expect(result).toBeNull()
    })

    it('应该在数据为空时返回null', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null
      } as any)

      const {getPeerAdminPermission} = await import('./peer-admin')
      const result = await getPeerAdminPermission('u-1')

      expect(result).toBeNull()
    })

    it('应该在异常时返回null', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('网络错误'))

      const {getPeerAdminPermission} = await import('./peer-admin')
      const result = await getPeerAdminPermission('u-1')

      expect(result).toBeNull()
    })
  })

  // ==================== 检查PEER_ADMIN状态测试 ====================

  describe('isPeerAdmin', () => {
    it('应该在用户是PEER_ADMIN时返回true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {isPeerAdmin} = await import('./peer-admin')
      const result = await isPeerAdmin('u-1')

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('is_peer_admin', {p_user_id: 'u-1'})
    })

    it('应该在用户不是PEER_ADMIN时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: false,
        error: null
      } as any)

      const {isPeerAdmin} = await import('./peer-admin')
      const result = await isPeerAdmin('u-1')

      expect(result).toBe(false)
    })

    it('应该在RPC调用失败时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('检查失败')
      } as any)

      const {isPeerAdmin} = await import('./peer-admin')
      const result = await isPeerAdmin('u-1')

      expect(result).toBe(false)
    })
  })

  describe('peerAdminHasFullControl', () => {
    it('应该在PEER_ADMIN有完整控制权时返回true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {peerAdminHasFullControl} = await import('./peer-admin')
      const result = await peerAdminHasFullControl('u-1')

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('peer_admin_has_full_control', {p_user_id: 'u-1'})
    })

    it('应该在PEER_ADMIN没有完整控制权时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: false,
        error: null
      } as any)

      const {peerAdminHasFullControl} = await import('./peer-admin')
      const result = await peerAdminHasFullControl('u-1')

      expect(result).toBe(false)
    })

    it('应该在RPC调用失败时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('检查失败')
      } as any)

      const {peerAdminHasFullControl} = await import('./peer-admin')
      const result = await peerAdminHasFullControl('u-1')

      expect(result).toBe(false)
    })
  })

  describe('peerAdminIsViewOnly', () => {
    it('应该在PEER_ADMIN只有查看权时返回true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {peerAdminIsViewOnly} = await import('./peer-admin')
      const result = await peerAdminIsViewOnly('u-1')

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('peer_admin_is_view_only', {p_user_id: 'u-1'})
    })

    it('应该在PEER_ADMIN不是只有查看权时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: false,
        error: null
      } as any)

      const {peerAdminIsViewOnly} = await import('./peer-admin')
      const result = await peerAdminIsViewOnly('u-1')

      expect(result).toBe(false)
    })

    it('应该在RPC调用失败时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('检查失败')
      } as any)

      const {peerAdminIsViewOnly} = await import('./peer-admin')
      const result = await peerAdminIsViewOnly('u-1')

      expect(result).toBe(false)
    })
  })

  describe('isBossOrFullControlPeerAdmin', () => {
    it('应该在用户是BOSS或有完整控制权的PEER_ADMIN时返回true', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null
      } as any)

      const {isBossOrFullControlPeerAdmin} = await import('./peer-admin')
      const result = await isBossOrFullControlPeerAdmin('u-1')

      expect(result).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledWith('is_boss_or_full_control_peer_admin', {p_user_id: 'u-1'})
    })

    it('应该在用户不是BOSS且没有完整控制权时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: false,
        error: null
      } as any)

      const {isBossOrFullControlPeerAdmin} = await import('./peer-admin')
      const result = await isBossOrFullControlPeerAdmin('u-1')

      expect(result).toBe(false)
    })

    it('应该在RPC调用失败时返回false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('检查失败')
      } as any)

      const {isBossOrFullControlPeerAdmin} = await import('./peer-admin')
      const result = await isBossOrFullControlPeerAdmin('u-1')

      expect(result).toBe(false)
    })

    it('应该在异常时返回false', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('网络错误'))

      const {isBossOrFullControlPeerAdmin} = await import('./peer-admin')
      const result = await isBossOrFullControlPeerAdmin('u-1')

      expect(result).toBe(false)
    })
  })
})
