/**
 * 角色辅助工具 - 单元测试
 */
import {describe, it, expect} from 'vitest'
import {
  isSuperAdmin,
  isBoss,
  isTenantAdmin,
  isManager,
  canManageUser,
  getRoleDisplayName,
  getCreatableRoles
} from './roleHelper'

describe('roleHelper utils', () => {
  describe('isSuperAdmin', () => {
    it('应该返回true当角色是BOSS', () => {
      expect(isSuperAdmin('BOSS')).toBe(true)
    })

    it('应该返回false当角色是MANAGER', () => {
      expect(isSuperAdmin('MANAGER')).toBe(false)
    })

    it('应该返回false当角色是DRIVER', () => {
      expect(isSuperAdmin('DRIVER')).toBe(false)
    })

    it('应该返回false当角色是undefined', () => {
      expect(isSuperAdmin(undefined)).toBe(false)
    })

    it('应该返回false当角色是null', () => {
      expect(isSuperAdmin(null)).toBe(false)
    })
  })

  describe('isBoss', () => {
    it('应该返回true当角色是BOSS', () => {
      expect(isBoss('BOSS')).toBe(true)
    })

    it('应该返回false当角色是其他', () => {
      expect(isBoss('MANAGER')).toBe(false)
      expect(isBoss('DRIVER')).toBe(false)
    })
  })

  describe('isTenantAdmin', () => {
    it('应该返回true当角色是BOSS', () => {
      expect(isTenantAdmin('BOSS')).toBe(true)
    })

    it('应该返回false当角色是其他', () => {
      expect(isTenantAdmin('MANAGER')).toBe(false)
    })
  })

  describe('isManager', () => {
    it('应该返回true当角色是BOSS', () => {
      expect(isManager('BOSS')).toBe(true)
    })

    it('应该返回true当角色是MANAGER', () => {
      expect(isManager('MANAGER')).toBe(true)
    })

    it('应该返回false当角色是DRIVER', () => {
      expect(isManager('DRIVER')).toBe(false)
    })

    it('应该返回false当角色是undefined', () => {
      expect(isManager(undefined)).toBe(false)
    })

    it('应该返回false当角色是null', () => {
      expect(isManager(null)).toBe(false)
    })
  })

  describe('canManageUser', () => {
    it('BOSS应该可以管理所有角色', () => {
      expect(canManageUser('BOSS', 'BOSS')).toBe(true)
      expect(canManageUser('BOSS', 'MANAGER')).toBe(true)
      expect(canManageUser('BOSS', 'DRIVER')).toBe(true)
      expect(canManageUser('BOSS', 'PEER_ADMIN')).toBe(true)
    })

    it('PEER_ADMIN应该可以管理所有角色', () => {
      expect(canManageUser('PEER_ADMIN', 'BOSS')).toBe(true)
      expect(canManageUser('PEER_ADMIN', 'MANAGER')).toBe(true)
      expect(canManageUser('PEER_ADMIN', 'DRIVER')).toBe(true)
    })

    it('MANAGER只能管理DRIVER', () => {
      expect(canManageUser('MANAGER', 'DRIVER')).toBe(true)
      expect(canManageUser('MANAGER', 'MANAGER')).toBe(false)
      expect(canManageUser('MANAGER', 'BOSS')).toBe(false)
    })

    it('DRIVER不能管理任何人', () => {
      expect(canManageUser('DRIVER', 'DRIVER')).toBe(false)
      expect(canManageUser('DRIVER', 'MANAGER')).toBe(false)
    })

    it('undefined角色不能管理任何人', () => {
      expect(canManageUser(undefined, 'DRIVER')).toBe(false)
    })

    it('null角色不能管理任何人', () => {
      expect(canManageUser(null, 'DRIVER')).toBe(false)
    })
  })

  describe('getRoleDisplayName', () => {
    it('应该返回正确的角色显示名称', () => {
      expect(getRoleDisplayName('BOSS')).toBe('老板')
      expect(getRoleDisplayName('PEER_ADMIN')).toBe('调度')
      expect(getRoleDisplayName('MANAGER')).toBe('车队长')
      expect(getRoleDisplayName('DRIVER')).toBe('司机')
    })
  })

  describe('getCreatableRoles', () => {
    it('BOSS可以创建PEER_ADMIN、MANAGER和DRIVER', () => {
      const roles = getCreatableRoles('BOSS')
      expect(roles).toContain('PEER_ADMIN')
      expect(roles).toContain('MANAGER')
      expect(roles).toContain('DRIVER')
      expect(roles).not.toContain('BOSS')
    })

    it('MANAGER只能创建DRIVER', () => {
      const roles = getCreatableRoles('MANAGER')
      expect(roles).toEqual(['DRIVER'])
    })

    it('DRIVER不能创建任何角色', () => {
      const roles = getCreatableRoles('DRIVER')
      expect(roles).toEqual([])
    })

    it('undefined角色不能创建任何角色', () => {
      const roles = getCreatableRoles(undefined)
      expect(roles).toEqual([])
    })

    it('null角色不能创建任何角色', () => {
      const roles = getCreatableRoles(null)
      expect(roles).toEqual([])
    })
  })
})
