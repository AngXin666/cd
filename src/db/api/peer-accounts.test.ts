/**
 * 平级账号管理 API - 单元测试
 */
import {describe, it, expect, vi, beforeEach} from 'vitest'

// Mock helpers
vi.mock('../helpers', () => ({
  convertUsersToProfiles: vi.fn((users) => users.map((u: any) => ({id: u.id, name: u.name, role: u.role}))),
  convertUserToProfile: vi.fn((user) => ({id: user.id, name: user.name, role: user.role}))
}))

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn()
    })),
    auth: {
      signUp: vi.fn()
    },
    rpc: vi.fn()
  }
}))

import {supabase} from '../supabase'

describe('peer-accounts API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==================== 获取平级账号列表测试 ====================

  describe('getPeerAccounts', () => {
    it('应该返回平级账号列表', async () => {
      const mockCurrentAccount = {
        id: 'account-1',
        main_account_id: null,
        name: '主账号'
      }

      const mockUsers = [
        {id: 'account-1', name: '主账号', main_account_id: null},
        {id: 'account-2', name: '平级账号1', main_account_id: 'account-1'}
      ]

      const mockRoles = [
        {id: 'account-1', role: 'BOSS'},
        {id: 'account-2', role: 'BOSS'}
      ]

      // 第一次调用：获取当前账号
      const firstFromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: mockCurrentAccount, error: null})
      })

      // 第二次调用：获取平级账号列表
      const secondFromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({data: mockUsers, error: null})
      })

      // 第三次调用：获取角色信息
      const thirdFromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({data: mockRoles, error: null})
      })

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        if (callCount === 1) return firstFromMock() as any
        if (callCount === 2) return secondFromMock() as any
        return thirdFromMock() as any
      })

      const {getPeerAccounts} = await import('./peer-accounts')
      const result = await getPeerAccounts('account-1')

      expect(result).toHaveLength(2)
    })

    it('应该在获取当前账号失败时返回空数组', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: new Error('获取失败')})
      } as any)

      const {getPeerAccounts} = await import('./peer-accounts')
      const result = await getPeerAccounts('account-1')

      expect(result).toEqual([])
    })

    it('应该在异常时返回空数组', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('网络错误')
      })

      const {getPeerAccounts} = await import('./peer-accounts')
      const result = await getPeerAccounts('account-1')

      expect(result).toEqual([])
    })
  })

  // ==================== 检查主账号状态测试 ====================

  describe('isPrimaryAccount', () => {
    it('应该在账号是主账号时返回true', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: {main_account_id: null}, error: null})
      } as any)

      const {isPrimaryAccount} = await import('./peer-accounts')
      const result = await isPrimaryAccount('account-1')

      expect(result).toBe(true)
    })

    it('应该在账号不是主账号时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: {main_account_id: 'main-1'}, error: null})
      } as any)

      const {isPrimaryAccount} = await import('./peer-accounts')
      const result = await isPrimaryAccount('account-2')

      expect(result).toBe(false)
    })

    it('应该在查询失败时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: new Error('查询失败')})
      } as any)

      const {isPrimaryAccount} = await import('./peer-accounts')
      const result = await isPrimaryAccount('account-1')

      expect(result).toBe(false)
    })

    it('应该在数据为空时返回false', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
      } as any)

      const {isPrimaryAccount} = await import('./peer-accounts')
      const result = await isPrimaryAccount('account-1')

      expect(result).toBe(false)
    })

    it('应该在异常时返回false', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('网络错误')
      })

      const {isPrimaryAccount} = await import('./peer-accounts')
      const result = await isPrimaryAccount('account-1')

      expect(result).toBe(false)
    })
  })

  // ==================== 创建平级账号测试 ====================

  describe('createPeerAccount', () => {
    it('应该在主账号不存在时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: new Error('主账号不存在')})
      } as any)

      const {createPeerAccount} = await import('./peer-accounts')
      const result = await createPeerAccount(
        'main-1',
        {name: '新账号', phone: '13800138000'},
        'test@example.com',
        'password123'
      )

      expect(result).toBeNull()
    })

    it('应该在指定账号不是主账号时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {id: 'account-1', main_account_id: 'other-main'},
          error: null
        })
      } as any)

      const {createPeerAccount} = await import('./peer-accounts')
      const result = await createPeerAccount(
        'account-1',
        {name: '新账号', phone: '13800138000'},
        'test@example.com',
        'password123'
      )

      expect(result).toBeNull()
    })

    it('应该在邮箱已存在时返回EMAIL_EXISTS', async () => {
      // Mock 获取主账号成功
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {id: 'main-1', main_account_id: null, company_name: '测试公司'},
          error: null
        })
      } as any)

      // Mock signUp 返回邮箱已存在错误
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {user: null, session: null},
        error: {message: 'User already registered'} as any
      })

      const {createPeerAccount} = await import('./peer-accounts')
      const result = await createPeerAccount(
        'main-1',
        {name: '新账号', phone: '13800138000'},
        'existing@example.com',
        'password123'
      )

      expect(result).toBe('EMAIL_EXISTS')
    })

    it('应该在认证创建失败时返回null', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {id: 'main-1', main_account_id: null},
          error: null
        })
      } as any)

      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {user: null, session: null},
        error: {message: '创建失败'} as any
      })

      const {createPeerAccount} = await import('./peer-accounts')
      const result = await createPeerAccount(
        'main-1',
        {name: '新账号', phone: '13800138000'},
        'test@example.com',
        'password123'
      )

      expect(result).toBeNull()
    })

    it('应该在异常时返回null', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('网络错误')
      })

      const {createPeerAccount} = await import('./peer-accounts')
      const result = await createPeerAccount(
        'main-1',
        {name: '新账号', phone: '13800138000'},
        'test@example.com',
        'password123'
      )

      expect(result).toBeNull()
    })
  })
})
