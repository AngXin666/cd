/**
 * miaoda-auth-taro Mock
 * 用于测试环境中模拟认证Hook
 */
import {vi} from 'vitest'

export const useAuth = vi.fn().mockReturnValue({
  user: {id: 'test-user-id', email: 'test@example.com'},
  isAuthenticated: true,
  loading: false
})
