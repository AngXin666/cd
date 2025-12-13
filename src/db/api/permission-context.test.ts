/**
 * 权限上下文 API - 单元测试
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'

// Mock Supabase
vi.mock('@/client/supabase', () => ({
  supabase: {
    rpc: vi.fn()
  }
}))

import {supabase} from '@/client/supabase'

describe('permission-context API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==================== 获取用户权限上下文测试 ====================

  describe('getPermissionContext', () => {
    it('应该成功返回权限上下文', async () => {
      const mockContext = {
        user_id: 'user-1',
        role: 'MANAGER',
        warehouses: ['wh-1', 'wh-2'],
        permissions: {
          can_manage_drivers: true,
          can_approve_leaves: true
        }
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          success: true,
          context: mockContext,
          error: null
        },
        error: null
      } as any)

      const {getPermissionContext} = await import('./permission-context')
      const result = await getPermissionContext('user-1')

      expect(result.success).toBe(true)
      expect(result.context).toEqual(mockContext)
      expect(result.error).toBeFalsy()
      expect(supabase.rpc).toHaveBeenCalledWith('get_permission_context', {p_user_id: 'user-1'})
    })

    it('应该在RPC调用失败时返回错误', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: 'RPC调用失败'}
      } as any)

      const {getPermissionContext} = await import('./permission-context')
      const result = await getPermissionContext('user-1')

      expect(result.success).toBe(false)
      expect(result.context).toBeNull()
      expect(result.error).toBe('RPC调用失败')
    })

    it('应该在数据为空时返回错误', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null
      } as any)

      const {getPermissionContext} = await import('./permission-context')
      const result = await getPermissionContext('user-1')

      expect(result.success).toBe(false)
      expect(result.context).toBeNull()
      expect(result.error).toBe('权限上下文数据为空')
    })

    it('应该在异常时返回错误', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('网络错误'))

      const {getPermissionContext} = await import('./permission-context')
      const result = await getPermissionContext('user-1')

      expect(result.success).toBe(false)
      expect(result.context).toBeNull()
      expect(result.error).toBe('网络错误')
    })
  })

  // ==================== 获取司机权限上下文测试 ====================

  describe('getDriverPermissionContext', () => {
    it('应该成功返回司机权限上下文', async () => {
      const mockContext = {
        user_id: 'driver-1',
        role: 'DRIVER',
        warehouse_id: 'wh-1',
        permissions: {
          can_view_own_data: true
        }
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          success: true,
          context: mockContext,
          error: null
        },
        error: null
      } as any)

      const {getDriverPermissionContext} = await import('./permission-context')
      const result = await getDriverPermissionContext('driver-1')

      expect(result.success).toBe(true)
      expect(result.context).toEqual(mockContext)
      expect(supabase.rpc).toHaveBeenCalledWith('get_driver_permission_context', {p_driver_id: 'driver-1'})
    })

    it('应该在RPC调用失败时返回错误', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '获取司机权限上下文失败'}
      } as any)

      const {getDriverPermissionContext} = await import('./permission-context')
      const result = await getDriverPermissionContext('driver-1')

      expect(result.success).toBe(false)
      expect(result.context).toBeNull()
      expect(result.error).toBe('获取司机权限上下文失败')
    })

    it('应该在异常时返回错误', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('网络异常'))

      const {getDriverPermissionContext} = await import('./permission-context')
      const result = await getDriverPermissionContext('driver-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('网络异常')
    })
  })

  // ==================== 获取车队长权限上下文测试 ====================

  describe('getManagerPermissionContext', () => {
    it('应该成功返回车队长权限上下文', async () => {
      const mockContext = {
        user_id: 'manager-1',
        role: 'MANAGER',
        warehouses: ['wh-1'],
        permissions: {
          can_manage_drivers: true,
          can_approve_leaves: true
        }
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          success: true,
          context: mockContext,
          error: null
        },
        error: null
      } as any)

      const {getManagerPermissionContext} = await import('./permission-context')
      const result = await getManagerPermissionContext('manager-1')

      expect(result.success).toBe(true)
      expect(result.context).toEqual(mockContext)
      expect(supabase.rpc).toHaveBeenCalledWith('get_manager_permission_context', {p_manager_id: 'manager-1'})
    })

    it('应该在RPC调用失败时返回错误', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '获取车队长权限上下文失败'}
      } as any)

      const {getManagerPermissionContext} = await import('./permission-context')
      const result = await getManagerPermissionContext('manager-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('获取车队长权限上下文失败')
    })

    it('应该在异常时返回错误', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('网络异常'))

      const {getManagerPermissionContext} = await import('./permission-context')
      const result = await getManagerPermissionContext('manager-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('网络异常')
    })
  })

  // ==================== 获取调度权限上下文测试 ====================

  describe('getSchedulerPermissionContext', () => {
    it('应该成功返回调度权限上下文', async () => {
      const mockContext = {
        user_id: 'scheduler-1',
        role: 'SCHEDULER',
        warehouses: ['wh-1', 'wh-2'],
        permissions: {
          can_schedule_tasks: true
        }
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          success: true,
          context: mockContext,
          error: null
        },
        error: null
      } as any)

      const {getSchedulerPermissionContext} = await import('./permission-context')
      const result = await getSchedulerPermissionContext('scheduler-1')

      expect(result.success).toBe(true)
      expect(result.context).toEqual(mockContext)
      expect(supabase.rpc).toHaveBeenCalledWith('get_scheduler_permission_context', {p_scheduler_id: 'scheduler-1'})
    })

    it('应该在RPC调用失败时返回错误', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '获取调度权限上下文失败'}
      } as any)

      const {getSchedulerPermissionContext} = await import('./permission-context')
      const result = await getSchedulerPermissionContext('scheduler-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('获取调度权限上下文失败')
    })

    it('应该在异常时返回错误', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('网络异常'))

      const {getSchedulerPermissionContext} = await import('./permission-context')
      const result = await getSchedulerPermissionContext('scheduler-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('网络异常')
    })
  })

  // ==================== 获取老板/平级管理员权限上下文测试 ====================

  describe('getAdminPermissionContext', () => {
    it('应该成功返回老板/平级管理员权限上下文', async () => {
      const mockContext = {
        user_id: 'admin-1',
        role: 'BOSS',
        warehouses: ['wh-1', 'wh-2', 'wh-3'],
        permissions: {
          can_manage_all: true,
          can_manage_users: true,
          can_manage_warehouses: true
        }
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          success: true,
          context: mockContext,
          error: null
        },
        error: null
      } as any)

      const {getAdminPermissionContext} = await import('./permission-context')
      const result = await getAdminPermissionContext('admin-1')

      expect(result.success).toBe(true)
      expect(result.context).toEqual(mockContext)
      expect(supabase.rpc).toHaveBeenCalledWith('get_admin_permission_context', {p_admin_id: 'admin-1'})
    })

    it('应该在RPC调用失败时返回错误', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: '获取老板/平级管理员权限上下文失败'}
      } as any)

      const {getAdminPermissionContext} = await import('./permission-context')
      const result = await getAdminPermissionContext('admin-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('获取老板/平级管理员权限上下文失败')
    })

    it('应该在异常时返回错误', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('网络异常'))

      const {getAdminPermissionContext} = await import('./permission-context')
      const result = await getAdminPermissionContext('admin-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('网络异常')
    })
  })
})
