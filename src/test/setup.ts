/**
 * Vitest 测试环境配置
 */
import '@testing-library/jest-dom/vitest'
import {vi} from 'vitest'

// Mock Taro API
vi.mock('@tarojs/taro', () => ({
  showToast: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  showModal: vi.fn().mockResolvedValue({confirm: true}),
  navigateTo: vi.fn(),
  usePullDownRefresh: vi.fn()
}))

// Mock miaoda-auth-taro
vi.mock('miaoda-auth-taro', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: {id: 'test-user-id'},
    isAuthenticated: true
  })
}))

// Mock Supabase
vi.mock('@/db/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({data: null, error: null})
    }),
    auth: {
      signUp: vi.fn().mockResolvedValue({data: {user: {id: 'new-user-id'}}, error: null})
    }
  }
}))
