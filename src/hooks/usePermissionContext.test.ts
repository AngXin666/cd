import {renderHook, waitFor} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {usePermissionContext} from './usePermissionContext'
import type {PermissionContext} from '@/types/permission-context'

// Mock auth
const mockUser = {id: 'user-123', email: 'test@example.com'}
vi.mock('miaoda-auth-taro', () => ({
  useAuth: () => ({user: mockUser})
}))

// Mock permission context API
const mockGetPermissionContext = vi.fn()
vi.mock('@/db/api/permission-context', () => ({
  getPermissionContext: (...args: unknown[]) => mockGetPermissionContext(...args)
}))

// Mock storage
const mockStorageGet = vi.fn()
const mockStorageSet = vi.fn()
const mockStorageRemove = vi.fn()

vi.mock('@/utils/storage', () => ({
  TypeSafeStorage: {
    get: (...args: unknown[]) => mockStorageGet(...args),
    set: (...args: unknown[]) => mockStorageSet(...args),
    remove: (...args: unknown[]) => mockStorageRemove(...args)
  }
}))

describe('usePermissionContext', () => {
  const mockDriverContext: PermissionContext = {
    mode: 'own_data_only',
    level: 'full_control',
    userId: 'user-123',
    warehouseIds: [],
    vehicleIds: ['vehicle-1']
  }

  const mockManagerContext: PermissionContext = {
    mode: 'managed_resources',
    level: 'full_control',
    userId: 'user-123',
    warehouseIds: ['warehouse-1'],
    vehicleIds: []
  }

  const mockSchedulerContext: PermissionContext = {
    mode: 'scheduled_resources',
    level: 'view_only',
    userId: 'user-123',
    warehouseIds: ['warehouse-1'],
    vehicleIds: []
  }

  const mockAdminContext: PermissionContext = {
    mode: 'all_access',
    level: 'full_control',
    userId: 'user-123',
    warehouseIds: [],
    vehicleIds: []
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockStorageGet.mockReturnValue(null)
    mockGetPermissionContext.mockResolvedValue({
      success: true,
      context: mockDriverContext
    })
  })

  describe('初始化', () => {
    it('应该初始化为空状态', () => {
      const {result} = renderHook(() => usePermissionContext(false))

      expect(result.current.context).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('应该自动加载权限上下文', async () => {
      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetPermissionContext).toHaveBeenCalledWith('user-123')
      expect(result.current.context).toEqual(mockDriverContext)
      expect(result.current.error).toBeNull()
    })

    it('应该在autoLoad为false时不自动加载', () => {
      renderHook(() => usePermissionContext(false))

      expect(mockGetPermissionContext).not.toHaveBeenCalled()
    })
  })

  describe('缓存功能', () => {
    it('应该从缓存加载权限上下文', async () => {
      mockStorageGet.mockImplementation((key: string) => {
        if (key === 'permission_context') return mockDriverContext
        if (key === 'permission_context_timestamp') return Date.now()
        return null
      })

      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.context).toEqual(mockDriverContext)
      expect(mockGetPermissionContext).not.toHaveBeenCalled()
    })

    it('应该在缓存过期时重新加载', async () => {
      mockStorageGet.mockImplementation((key: string) => {
        if (key === 'permission_context') return mockDriverContext
        if (key === 'permission_context_timestamp') return Date.now() - 31 * 60 * 1000 // 31分钟前
        return null
      })

      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetPermissionContext).toHaveBeenCalled()
    })

    it('应该保存权限上下文到缓存', async () => {
      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockStorageSet).toHaveBeenCalledWith('permission_context', mockDriverContext)
      expect(mockStorageSet).toHaveBeenCalledWith(
        'permission_context_timestamp',
        expect.any(Number)
      )
    })
  })

  describe('刷新功能', () => {
    it('应该刷新权限上下文', async () => {
      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockGetPermissionContext.mockClear()
      mockGetPermissionContext.mockResolvedValue({
        success: true,
        context: mockManagerContext
      })

      await result.current.refresh()

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetPermissionContext).toHaveBeenCalled()
      expect(result.current.context).toEqual(mockManagerContext)
    })

    it('应该处理刷新错误', async () => {
      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockGetPermissionContext.mockResolvedValue({
        success: false,
        error: '刷新失败'
      })

      await result.current.refresh()

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('刷新失败')
    })
  })

  describe('清除功能', () => {
    it('应该清除权限上下文', async () => {
      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await waitFor(() => {
        result.current.clear()
      })

      await waitFor(() => {
        expect(result.current.context).toBeNull()
      })

      expect(result.current.error).toBeNull()
      expect(mockStorageRemove).toHaveBeenCalledWith('permission_context')
      expect(mockStorageRemove).toHaveBeenCalledWith('permission_context_timestamp')
    })
  })

  describe('类型守卫', () => {
    it('应该正确识别司机角色', async () => {
      mockGetPermissionContext.mockResolvedValue({
        success: true,
        context: mockDriverContext
      })

      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isDriver()).toBe(true)
      expect(result.current.isManager()).toBe(false)
      expect(result.current.isScheduler()).toBe(false)
      expect(result.current.isAdmin()).toBe(false)
    })

    it('应该正确识别车队长角色', async () => {
      mockGetPermissionContext.mockResolvedValue({
        success: true,
        context: mockManagerContext
      })

      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isDriver()).toBe(false)
      expect(result.current.isManager()).toBe(true)
      expect(result.current.isScheduler()).toBe(false)
      expect(result.current.isAdmin()).toBe(false)
    })

    it('应该正确识别调度角色', async () => {
      mockGetPermissionContext.mockResolvedValue({
        success: true,
        context: mockSchedulerContext
      })

      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isDriver()).toBe(false)
      expect(result.current.isManager()).toBe(false)
      expect(result.current.isScheduler()).toBe(true)
      expect(result.current.isAdmin()).toBe(false)
    })

    it('应该正确识别管理员角色', async () => {
      mockGetPermissionContext.mockResolvedValue({
        success: true,
        context: mockAdminContext
      })

      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isDriver()).toBe(false)
      expect(result.current.isManager()).toBe(false)
      expect(result.current.isScheduler()).toBe(false)
      expect(result.current.isAdmin()).toBe(true)
    })
  })

  describe('权限检查', () => {
    it('应该正确检查完整控制权', async () => {
      mockGetPermissionContext.mockResolvedValue({
        success: true,
        context: {...mockDriverContext, level: 'full_control'}
      })

      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.hasFullControl()).toBe(true)
      expect(result.current.hasViewOnly()).toBe(false)
    })

    it('应该正确检查只读权限', async () => {
      mockGetPermissionContext.mockResolvedValue({
        success: true,
        context: {...mockSchedulerContext, level: 'view_only'}
      })

      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.hasFullControl()).toBe(false)
      expect(result.current.hasViewOnly()).toBe(true)
    })
  })

  describe('错误处理', () => {
    it('应该处理API错误', async () => {
      mockGetPermissionContext.mockResolvedValue({
        success: false,
        error: '获取权限失败'
      })

      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('获取权限失败')
      expect(result.current.context).toBeNull()
    })

    it('应该处理异常', async () => {
      mockGetPermissionContext.mockRejectedValue(new Error('网络错误'))

      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('网络错误')
      expect(result.current.context).toBeNull()
    })

    it('应该处理无用户情况', async () => {
      // Temporarily override the mock
      vi.doMock('miaoda-auth-taro', () => ({
        useAuth: () => ({user: null})
      }))

      const {result} = renderHook(() => usePermissionContext(false))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.context).toBeNull()
    })
  })

  describe('边界情况', () => {
    it('应该在context为null时返回false', () => {
      const {result} = renderHook(() => usePermissionContext(false))

      expect(result.current.isDriver()).toBe(false)
      expect(result.current.isManager()).toBe(false)
      expect(result.current.isScheduler()).toBe(false)
      expect(result.current.isAdmin()).toBe(false)
      expect(result.current.hasFullControl()).toBe(false)
      expect(result.current.hasViewOnly()).toBe(false)
    })

    it('应该处理空响应', async () => {
      mockGetPermissionContext.mockResolvedValue({
        success: true,
        context: null
      })

      const {result} = renderHook(() => usePermissionContext(true))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.context).toBeNull()
    })
  })
})
