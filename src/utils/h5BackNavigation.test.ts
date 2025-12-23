/**
 * H5 返回导航管理器单元测试
 *
 * 测试 H5BackNavigationManager 类的初始化、清理和 popstate 事件处理
 *
 * **Validates: Requirements 3.2**
 *
 * @module utils/h5BackNavigation.test
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// ==================== Mock 设置 ====================

/**
 * 模拟 window 对象和 History API
 */
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()
const mockPushState = vi.fn()

/**
 * 模拟的 popstate 事件处理函数
 * 用于在测试中手动触发 popstate 事件
 */
let popstateHandler: ((event: PopStateEvent) => void) | null = null

/**
 * 当前模拟的路径
 */
let currentPathname = '/pages/index/index'

/**
 * 设置 window mock
 */
function setupWindowMock(): void {
  // 保存原始的 popstate 处理函数
  mockAddEventListener.mockImplementation((event: string, handler: EventListener) => {
    if (event === 'popstate') {
      popstateHandler = handler as (event: PopStateEvent) => void
    }
  })

  mockRemoveEventListener.mockImplementation((event: string, handler: EventListener) => {
    if (event === 'popstate' && popstateHandler === handler) {
      popstateHandler = null
    }
  })

  // Mock window 对象
  Object.defineProperty(global, 'window', {
    value: {
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      history: {
        pushState: mockPushState
      },
      location: {
        get pathname() {
          return currentPathname
        },
        href: 'http://localhost:8080' + currentPathname
      }
    },
    writable: true,
    configurable: true
  })
}

/**
 * 清理 window mock
 */
function cleanupWindowMock(): void {
  // @ts-ignore - 清理 window mock
  delete global.window
  popstateHandler = null
  currentPathname = '/pages/index/index'
}

/**
 * 模拟触发 popstate 事件
 */
function triggerPopstate(): void {
  if (popstateHandler) {
    const event = new Event('popstate') as PopStateEvent
    popstateHandler(event)
  }
}

/**
 * 设置当前路径
 */
function setCurrentPath(path: string): void {
  currentPathname = path
  if (global.window) {
    Object.defineProperty(global.window.location, 'href', {
      value: 'http://localhost:8080' + path,
      writable: true,
      configurable: true
    })
  }
}

// ==================== 测试用例 ====================

describe('H5BackNavigationManager', () => {
  beforeEach(() => {
    // 重置所有 mock
    vi.resetModules()
    vi.clearAllMocks()
    mockAddEventListener.mockClear()
    mockRemoveEventListener.mockClear()
    mockPushState.mockClear()
    
    // 设置 H5 环境
    vi.stubEnv('TARO_ENV', 'h5')
    
    // 设置 window mock
    setupWindowMock()
  })

  afterEach(() => {
    // 清理 window mock
    cleanupWindowMock()
    vi.unstubAllEnvs()
  })

  describe('初始化测试', () => {
    it('在 H5 环境下应正确初始化', async () => {
      // 动态导入模块以获取新实例
      const { h5BackNavigationManager } = await import('./h5BackNavigation')

      // 初始化
      h5BackNavigationManager.initialize()

      // 验证添加了 popstate 事件监听器
      expect(mockAddEventListener).toHaveBeenCalledWith('popstate', expect.any(Function))

      // 验证 push 了初始状态
      expect(mockPushState).toHaveBeenCalledWith(
        { h5BackNav: true },
        '',
        expect.any(String)
      )

      // 验证已初始化状态
      expect(h5BackNavigationManager.isInitialized()).toBe(true)

      // 清理
      h5BackNavigationManager.destroy()
    })

    it('重复初始化应被忽略', async () => {
      const { h5BackNavigationManager } = await import('./h5BackNavigation')

      // 第一次初始化
      h5BackNavigationManager.initialize()
      const firstCallCount = mockAddEventListener.mock.calls.length

      // 第二次初始化
      h5BackNavigationManager.initialize()

      // 验证没有重复添加监听器
      expect(mockAddEventListener.mock.calls.length).toBe(firstCallCount)

      // 清理
      h5BackNavigationManager.destroy()
    })

    it('非 H5 环境下应跳过初始化', async () => {
      // 设置非 H5 环境
      vi.stubEnv('TARO_ENV', 'weapp')

      const { h5BackNavigationManager } = await import('./h5BackNavigation')

      // 初始化
      h5BackNavigationManager.initialize()

      // 验证没有添加事件监听器
      expect(mockAddEventListener).not.toHaveBeenCalled()

      // 验证未初始化状态
      expect(h5BackNavigationManager.isInitialized()).toBe(false)
    })

    it('非浏览器环境下应跳过初始化', async () => {
      // 清理 window mock 模拟非浏览器环境
      cleanupWindowMock()

      const { h5BackNavigationManager } = await import('./h5BackNavigation')

      // 初始化不应抛出错误
      expect(() => h5BackNavigationManager.initialize()).not.toThrow()

      // 验证未初始化状态
      expect(h5BackNavigationManager.isInitialized()).toBe(false)
    })
  })

  describe('清理测试', () => {
    it('destroy 应正确清理资源', async () => {
      const { h5BackNavigationManager } = await import('./h5BackNavigation')

      // 初始化
      h5BackNavigationManager.initialize()
      expect(h5BackNavigationManager.isInitialized()).toBe(true)

      // 清理
      h5BackNavigationManager.destroy()

      // 验证移除了事件监听器
      expect(mockRemoveEventListener).toHaveBeenCalledWith('popstate', expect.any(Function))

      // 验证已重置初始化状态
      expect(h5BackNavigationManager.isInitialized()).toBe(false)
    })

    it('未初始化时调用 destroy 不应抛出错误', async () => {
      const { h5BackNavigationManager } = await import('./h5BackNavigation')

      // 直接调用 destroy 不应抛出错误
      expect(() => h5BackNavigationManager.destroy()).not.toThrow()
    })

    it('非 H5 环境下调用 destroy 不应抛出错误', async () => {
      // 设置非 H5 环境
      vi.stubEnv('TARO_ENV', 'weapp')

      const { h5BackNavigationManager } = await import('./h5BackNavigation')

      // 调用 destroy 不应抛出错误
      expect(() => h5BackNavigationManager.destroy()).not.toThrow()
    })
  })

  describe('popstate 事件处理测试', () => {
    it('工作台页面应阻止返回（重新 push 状态）', async () => {
      const { h5BackNavigationManager } = await import('./h5BackNavigation')

      // 初始化
      h5BackNavigationManager.initialize()
      mockPushState.mockClear() // 清除初始化时的 pushState 调用

      // 设置当前路径为工作台页面
      setCurrentPath('/pages/driver/index')

      // 触发 popstate 事件
      triggerPopstate()

      // 等待异步处理完成
      await new Promise(resolve => setTimeout(resolve, 10))

      // 验证重新 push 了状态（阻止返回）
      expect(mockPushState).toHaveBeenCalledWith(
        { h5BackNav: true },
        '',
        expect.any(String)
      )

      // 清理
      h5BackNavigationManager.destroy()
    })

    it('普通页面不应阻止返回（不 push 状态）', async () => {
      const { h5BackNavigationManager } = await import('./h5BackNavigation')

      // 初始化
      h5BackNavigationManager.initialize()
      mockPushState.mockClear() // 清除初始化时的 pushState 调用

      // 设置当前路径为普通页面
      setCurrentPath('/pages/driver/attendance/index')

      // 触发 popstate 事件
      triggerPopstate()

      // 等待异步处理完成
      await new Promise(resolve => setTimeout(resolve, 10))

      // 验证没有 push 状态（允许返回）
      expect(mockPushState).not.toHaveBeenCalled()

      // 清理
      h5BackNavigationManager.destroy()
    })

    it('所有工作台页面都应阻止返回', async () => {
      const { h5BackNavigationManager } = await import('./h5BackNavigation')

      // 工作台页面列表
      const dashboardPaths = [
        '/pages/index/index',
        '/pages/driver/index',
        '/pages/manager/index',
        '/pages/super-admin/index',
        '/pages/profile/index'
      ]

      for (const path of dashboardPaths) {
        // 重新初始化
        h5BackNavigationManager.destroy()
        vi.resetModules()
        const { h5BackNavigationManager: manager } = await import('./h5BackNavigation')
        manager.initialize()
        mockPushState.mockClear()

        // 设置当前路径
        setCurrentPath(path)

        // 触发 popstate 事件
        triggerPopstate()

        // 等待异步处理完成
        await new Promise(resolve => setTimeout(resolve, 10))

        // 验证重新 push 了状态
        expect(mockPushState).toHaveBeenCalled()

        // 清理
        manager.destroy()
      }
    })
  })

  describe('isInitialized 测试', () => {
    it('初始化前应返回 false', async () => {
      const { h5BackNavigationManager } = await import('./h5BackNavigation')

      expect(h5BackNavigationManager.isInitialized()).toBe(false)
    })

    it('初始化后应返回 true', async () => {
      const { h5BackNavigationManager } = await import('./h5BackNavigation')

      h5BackNavigationManager.initialize()
      expect(h5BackNavigationManager.isInitialized()).toBe(true)

      // 清理
      h5BackNavigationManager.destroy()
    })

    it('清理后应返回 false', async () => {
      const { h5BackNavigationManager } = await import('./h5BackNavigation')

      h5BackNavigationManager.initialize()
      h5BackNavigationManager.destroy()
      expect(h5BackNavigationManager.isInitialized()).toBe(false)
    })
  })
})
