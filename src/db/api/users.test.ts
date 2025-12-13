/**
 * 用户管理 API - 单元测试
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'

// Mock Supabase - 使用内联函数避免变量提升问题
vi.mock('@/client/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn()
    })),
    auth: {
      getUser: vi.fn(),
      updateUser: vi.fn()
    },
    rpc: vi.fn(),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({error: null}),
        getPublicUrl: vi.fn().mockReturnValue({data: {publicUrl: 'https://example.com/avatar.jpg'}})
      }))
    }
  }
}))

// Mock helpers
vi.mock('../helpers', () => ({
  convertUserToProfile: vi.fn((user) => ({
    ...user,
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role || 'DRIVER'
  })),
  convertUsersToProfiles: vi.fn((users) =>
    users.map((u: any) => ({
      ...u,
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      role: u.role || 'DRIVER'
    }))
  ),
  getUsersByRole: vi.fn(),
  getUsersWithRole: vi.fn(),
  getUserWithRole: vi.fn()
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    db: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }))
}))

import {supabase} from '@/client/supabase'
import {getUserWithRole, getUsersWithRole, getUsersByRole} from '../helpers'

describe('users API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentUserProfile', () => {
    it('应该在用户未登录时返回null', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: null},
        error: null
      } as any)

      const {getCurrentUserProfile} = await import('./users')
      const result = await getCurrentUserProfile()

      expect(result).toBeNull()
    })

    it('应该在认证错误时返回null', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: null},
        error: new Error('认证失败')
      } as any)

      const {getCurrentUserProfile} = await import('./users')
      const result = await getCurrentUserProfile()

      expect(result).toBeNull()
    })

    it('应该返回当前用户档案', async () => {
      const mockUser = {id: 'user-1', email: 'test@example.com'}
      const mockUserWithRole = {
        id: 'user-1',
        name: '测试用户',
        phone: '13800138000',
        email: 'test@example.com',
        role: 'DRIVER'
      }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: mockUser},
        error: null
      } as any)

      vi.mocked(getUserWithRole).mockResolvedValue(mockUserWithRole as any)

      const {getCurrentUserProfile} = await import('./users')
      const result = await getCurrentUserProfile()

      expect(result).not.toBeNull()
      expect(result?.id).toBe('user-1')
    })
  })

  describe('getCurrentUserRole', () => {
    it('应该在用户未登录时返回null', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: null},
        error: null
      } as any)

      const {getCurrentUserRole} = await import('./users')
      const result = await getCurrentUserRole()

      expect(result).toBeNull()
    })

    it('应该返回用户角色', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: {role: 'MANAGER'}, error: null})
      } as any)

      const {getCurrentUserRole} = await import('./users')
      const result = await getCurrentUserRole()

      expect(result).toBe('MANAGER')
    })
  })

  describe('getUserRoles', () => {
    it('应该返回用户角色数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: {role: 'DRIVER'}, error: null})
      } as any)

      const {getUserRoles} = await import('./users')
      const result = await getUserRoles('user-1')

      expect(result).toEqual(['DRIVER'])
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getUserRoles} = await import('./users')
      const result = await getUserRoles('user-1')

      expect(result).toEqual([])
    })
  })

  describe('getAllProfiles', () => {
    it('应该返回所有用户档案', async () => {
      const mockUsers = [
        {id: 'user-1', name: '用户1', role: 'DRIVER'},
        {id: 'user-2', name: '用户2', role: 'MANAGER'}
      ]

      vi.mocked(getUsersWithRole).mockResolvedValue(mockUsers as any)

      const {getAllProfiles} = await import('./users')
      const result = await getAllProfiles()

      expect(result.length).toBe(2)
    })

    it('应该在没有用户时返回空数组', async () => {
      vi.mocked(getUsersWithRole).mockResolvedValue([])

      const {getAllProfiles} = await import('./users')
      const result = await getAllProfiles()

      expect(result).toEqual([])
    })
  })

  describe('getProfileById', () => {
    it('应该返回指定用户档案', async () => {
      const mockUser = {
        id: 'user-1',
        name: '测试用户',
        phone: '13800138000',
        role: 'DRIVER'
      }

      vi.mocked(getUserWithRole).mockResolvedValue(mockUser as any)

      const {getProfileById} = await import('./users')
      const result = await getProfileById('user-1')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('user-1')
    })

    it('应该在用户不存在时返回null', async () => {
      vi.mocked(getUserWithRole).mockResolvedValue(null)

      const {getProfileById} = await import('./users')
      const result = await getProfileById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getDriverProfiles', () => {
    it('应该返回司机档案列表', async () => {
      const mockDrivers = [
        {id: 'driver-1', name: '司机1', role: 'DRIVER'},
        {id: 'driver-2', name: '司机2', role: 'DRIVER'}
      ]

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'admin-1'}},
        error: null
      } as any)

      vi.mocked(getUserWithRole).mockResolvedValue({id: 'admin-1', role: 'BOSS'} as any)
      vi.mocked(getUsersByRole).mockResolvedValue(mockDrivers as any)

      const {getDriverProfiles} = await import('./users')
      const result = await getDriverProfiles()

      expect(result.length).toBe(2)
    })
  })

  describe('getManagerPermission', () => {
    it('应该为BOSS返回完整权限', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: {role: 'BOSS'}, error: null})
      } as any)

      const {getManagerPermission} = await import('./users')
      const result = await getManagerPermission('boss-1')

      expect(result).not.toBeNull()
      expect(result?.permission_type).toBe('full')
      expect(result?.can_edit_user_info).toBe(true)
      expect(result?.can_manage_attendance_rules).toBe(true)
    })

    it('应该为MANAGER返回默认权限', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: {role: 'MANAGER'}, error: null})
      } as any)

      const {getManagerPermission} = await import('./users')
      const result = await getManagerPermission('manager-1')

      expect(result).not.toBeNull()
      expect(result?.permission_type).toBe('default')
      expect(result?.can_manage_attendance_rules).toBe(false)
    })

    it('应该在查询失败时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getManagerPermission} = await import('./users')
      const result = await getManagerPermission('user-1')

      expect(result).toBeNull()
    })
  })

  describe('updateProfile', () => {
    it('应该在用户未登录时返回false', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: null},
        error: null
      } as any)

      const {updateProfile} = await import('./users')
      const result = await updateProfile('user-1', {name: '新名字'})

      expect(result).toBe(false)
    })

    it('应该成功更新用户档案', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: {user: {id: 'user-1'}},
        error: null
      } as any)

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {updateProfile} = await import('./users')
      const result = await updateProfile('user-1', {name: '新名字'})

      expect(result).toBe(true)
    })
  })

  describe('updateUserRole', () => {
    it('应该成功更新用户角色', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {updateUserRole} = await import('./users')
      const result = await updateUserRole('user-1', 'MANAGER')

      expect(result).toBe(true)
    })

    it('应该在更新失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('更新失败')})
      } as any)

      const {updateUserRole} = await import('./users')
      const result = await updateUserRole('user-1', 'MANAGER')

      expect(result).toBe(false)
    })
  })

  describe('changePassword', () => {
    it('应该成功修改密码', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: {user: {}},
        error: null
      } as any)

      const {changePassword} = await import('./users')
      const result = await changePassword('newPassword123')

      expect(result.success).toBe(true)
    })

    it('应该在密码相同时返回错误', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: null,
        error: {message: 'New password should be different from the old password'}
      } as any)

      const {changePassword} = await import('./users')
      const result = await changePassword('samePassword')

      expect(result.success).toBe(false)
      expect(result.error).toBe('新密码不能与原密码相同')
    })

    it('应该在密码太短时返回错误', async () => {
      vi.mocked(supabase.auth.updateUser).mockResolvedValue({
        data: null,
        error: {message: 'Password should be at least 8 characters'}
      } as any)

      const {changePassword} = await import('./users')
      const result = await changePassword('short')

      expect(result.success).toBe(false)
      expect(result.error).toBe('密码长度至少8位')
    })
  })

  describe('resetUserPassword', () => {
    it('应该成功重置密码', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {success: true},
        error: null
      } as any)

      const {resetUserPassword} = await import('./users')
      const result = await resetUserPassword('user-1')

      expect(result.success).toBe(true)
    })

    it('应该在RPC调用失败时返回错误', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: {message: 'RPC调用失败'}
      } as any)

      const {resetUserPassword} = await import('./users')
      const result = await resetUserPassword('user-1')

      expect(result.success).toBe(false)
    })
  })

  describe('getManagerWarehouseIds', () => {
    it('应该返回管理员的仓库ID列表', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{warehouse_id: 'wh-1'}, {warehouse_id: 'wh-2'}],
          error: null
        })
      } as any)

      const {getManagerWarehouseIds} = await import('./users')
      const result = await getManagerWarehouseIds('manager-1')

      expect(result).toEqual(['wh-1', 'wh-2'])
    })

    it('应该在查询失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {getManagerWarehouseIds} = await import('./users')
      const result = await getManagerWarehouseIds('manager-1')

      expect(result).toEqual([])
    })
  })

  describe('getAllDriverIds', () => {
    it('应该返回所有司机ID', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{id: 'driver-1'}, {id: 'driver-2'}],
          error: null
        })
      } as any)

      const {getAllDriverIds} = await import('./users')
      const result = await getAllDriverIds()

      expect(result).toEqual(['driver-1', 'driver-2'])
    })
  })

  describe('updateManagerPermissionsEnabled', () => {
    it('应该成功更新权限启用状态', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: null})
      } as any)

      const {updateManagerPermissionsEnabled} = await import('./users')
      const result = await updateManagerPermissionsEnabled('manager-1', true)

      expect(result).toBe(true)
    })

    it('应该在更新失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({error: new Error('更新失败')})
      } as any)

      const {updateManagerPermissionsEnabled} = await import('./users')
      const result = await updateManagerPermissionsEnabled('manager-1', true)

      expect(result).toBe(false)
    })
  })

  describe('getManagerPermissionsEnabled', () => {
    it('应该返回权限启用状态', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {manager_permissions_enabled: true},
          error: null
        })
      } as any)

      const {getManagerPermissionsEnabled} = await import('./users')
      const result = await getManagerPermissionsEnabled('manager-1')

      expect(result).toBe(true)
    })

    it('应该在用户不存在时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
      } as any)

      const {getManagerPermissionsEnabled} = await import('./users')
      const result = await getManagerPermissionsEnabled('non-existent')

      expect(result).toBeNull()
    })
  })
})
