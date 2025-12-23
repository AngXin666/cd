/**
 * Supabase Mock 工厂
 * 提供标准化的 Supabase 客户端 Mock 配置
 *
 * 功能包括：
 * - 创建支持链式调用的 Mock Supabase 客户端
 * - 提供常用查询方法的 Mock
 * - 支持认证状态模拟
 * - 支持存储操作模拟
 *
 * @module db/api/__mocks__/supabase
 * @requirements 7.2
 */

import {vi} from 'vitest'

// ==================== 类型定义 ====================

/**
 * Mock 查询构建器接口
 * 支持 Supabase 的链式调用模式
 */
export interface MockQueryBuilder {
  /** SELECT 查询 */
  select: ReturnType<typeof vi.fn>
  /** INSERT 操作 */
  insert: ReturnType<typeof vi.fn>
  /** UPDATE 操作 */
  update: ReturnType<typeof vi.fn>
  /** DELETE 操作 */
  delete: ReturnType<typeof vi.fn>
  /** 等于条件 */
  eq: ReturnType<typeof vi.fn>
  /** 不等于条件 */
  neq: ReturnType<typeof vi.fn>
  /** IN 条件 */
  in: ReturnType<typeof vi.fn>
  /** 大于等于条件 */
  gte: ReturnType<typeof vi.fn>
  /** 小于等于条件 */
  lte: ReturnType<typeof vi.fn>
  /** 大于条件 */
  gt: ReturnType<typeof vi.fn>
  /** 小于条件 */
  lt: ReturnType<typeof vi.fn>
  /** LIKE 条件 */
  like: ReturnType<typeof vi.fn>
  /** ILIKE 条件（不区分大小写） */
  ilike: ReturnType<typeof vi.fn>
  /** IS NULL 条件 */
  is: ReturnType<typeof vi.fn>
  /** OR 条件 */
  or: ReturnType<typeof vi.fn>
  /** 排序 */
  order: ReturnType<typeof vi.fn>
  /** 限制数量 */
  limit: ReturnType<typeof vi.fn>
  /** 偏移量 */
  offset: ReturnType<typeof vi.fn>
  /** 范围查询 */
  range: ReturnType<typeof vi.fn>
  /** 获取单条记录（可能为空） */
  maybeSingle: ReturnType<typeof vi.fn>
  /** 获取单条记录（必须存在） */
  single: ReturnType<typeof vi.fn>
}

/**
 * Mock 认证接口
 */
export interface MockAuth {
  /** 获取当前用户 */
  getUser: ReturnType<typeof vi.fn>
  /** 获取会话 */
  getSession: ReturnType<typeof vi.fn>
  /** 登录 */
  signInWithPassword: ReturnType<typeof vi.fn>
  /** 登出 */
  signOut: ReturnType<typeof vi.fn>
  /** 监听认证状态变化 */
  onAuthStateChange: ReturnType<typeof vi.fn>
}

/**
 * Mock 存储接口
 */
export interface MockStorage {
  /** 获取存储桶 */
  from: ReturnType<typeof vi.fn>
}

/**
 * Mock 存储桶接口
 */
export interface MockStorageBucket {
  /** 上传文件 */
  upload: ReturnType<typeof vi.fn>
  /** 下载文件 */
  download: ReturnType<typeof vi.fn>
  /** 删除文件 */
  remove: ReturnType<typeof vi.fn>
  /** 获取公共 URL */
  getPublicUrl: ReturnType<typeof vi.fn>
  /** 列出文件 */
  list: ReturnType<typeof vi.fn>
}

/**
 * Mock Supabase 客户端接口
 */
export interface MockSupabaseClient {
  /** 表查询入口 */
  from: ReturnType<typeof vi.fn>
  /** 认证模块 */
  auth: MockAuth
  /** 存储模块 */
  storage: MockStorage
  /** RPC 调用 */
  rpc: ReturnType<typeof vi.fn>
}

// ==================== Mock 工厂函数 ====================

/**
 * 创建 Mock 查询构建器
 * 支持 Supabase 的链式调用模式
 *
 * @returns Mock 查询构建器实例
 *
 * @example
 * ```typescript
 * const queryBuilder = createMockQueryBuilder()
 * queryBuilder.select.mockReturnThis()
 * queryBuilder.eq.mockReturnThis()
 * queryBuilder.maybeSingle.mockResolvedValue({ data: mockData, error: null })
 * ```
 */
export function createMockQueryBuilder(): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    gt: vi.fn(),
    lt: vi.fn(),
    like: vi.fn(),
    ilike: vi.fn(),
    is: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    range: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn()
  }

  // 设置链式调用支持（每个方法返回 builder 自身）
  Object.keys(builder).forEach((key) => {
    const fn = builder[key as keyof MockQueryBuilder]
    // maybeSingle 和 single 是终结方法，不需要返回 this
    if (key !== 'maybeSingle' && key !== 'single') {
      fn.mockReturnThis()
    }
  })

  return builder
}

/**
 * 创建 Mock 认证模块
 *
 * @returns Mock 认证模块实例
 *
 * @example
 * ```typescript
 * const auth = createMockAuth()
 * auth.getUser.mockResolvedValue({
 *   data: { user: { id: 'user-001' } },
 *   error: null
 * })
 * ```
 */
export function createMockAuth(): MockAuth {
  return {
    getUser: vi.fn().mockResolvedValue({
      data: {user: null},
      error: null
    }),
    getSession: vi.fn().mockResolvedValue({
      data: {session: null},
      error: null
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: {user: null, session: null},
      error: null
    }),
    signOut: vi.fn().mockResolvedValue({error: null}),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: {subscription: {unsubscribe: vi.fn()}}
    })
  }
}

/**
 * 创建 Mock 存储桶
 *
 * @returns Mock 存储桶实例
 *
 * @example
 * ```typescript
 * const bucket = createMockStorageBucket()
 * bucket.upload.mockResolvedValue({ data: { path: 'file.jpg' }, error: null })
 * ```
 */
export function createMockStorageBucket(): MockStorageBucket {
  return {
    upload: vi.fn().mockResolvedValue({data: null, error: null}),
    download: vi.fn().mockResolvedValue({data: null, error: null}),
    remove: vi.fn().mockResolvedValue({data: null, error: null}),
    getPublicUrl: vi.fn().mockReturnValue({
      data: {publicUrl: 'https://example.com/file.jpg'}
    }),
    list: vi.fn().mockResolvedValue({data: [], error: null})
  }
}

/**
 * 创建 Mock 存储模块
 *
 * @returns Mock 存储模块实例
 *
 * @example
 * ```typescript
 * const storage = createMockStorage()
 * mockSupabaseClient.storage = storage
 * ```
 */
export function createMockStorage(): MockStorage {
  const bucket = createMockStorageBucket()
  return {
    from: vi.fn().mockReturnValue(bucket)
  }
}

/**
 * 创建 Mock Supabase 客户端
 * 提供完整的 Supabase 客户端 Mock，支持链式调用
 *
 * @returns Mock Supabase 客户端实例
 *
 * @example
 * ```typescript
 * const mockClient = createMockSupabaseClient()
 *
 * // 设置查询返回值
 * const queryBuilder = createMockQueryBuilder()
 * queryBuilder.maybeSingle.mockResolvedValue({ data: mockUser, error: null })
 * mockClient.from.mockReturnValue(queryBuilder)
 *
 * // 设置认证状态
 * mockClient.auth.getUser.mockResolvedValue({
 *   data: { user: { id: 'user-001' } },
 *   error: null
 * })
 * ```
 */
export function createMockSupabaseClient(): MockSupabaseClient {
  const defaultQueryBuilder = createMockQueryBuilder()

  return {
    from: vi.fn().mockReturnValue(defaultQueryBuilder),
    auth: createMockAuth(),
    storage: createMockStorage(),
    rpc: vi.fn().mockResolvedValue({data: null, error: null})
  }
}

// ==================== 辅助函数 ====================

/**
 * 设置 Mock 查询成功返回数据
 *
 * @param queryBuilder - Mock 查询构建器
 * @param data - 返回的数据
 *
 * @example
 * ```typescript
 * const queryBuilder = createMockQueryBuilder()
 * setMockQuerySuccess(queryBuilder, [{ id: '1', name: 'Test' }])
 * ```
 */
export function setMockQuerySuccess<T>(
  queryBuilder: MockQueryBuilder,
  data: T
): void {
  queryBuilder.maybeSingle.mockResolvedValue({data, error: null})
  // 同时设置 order 返回值（用于列表查询）
  queryBuilder.order.mockResolvedValue({data, error: null})
}

/**
 * 设置 Mock 查询失败返回错误
 *
 * @param queryBuilder - Mock 查询构建器
 * @param errorMessage - 错误信息
 * @param errorCode - 错误代码（可选）
 *
 * @example
 * ```typescript
 * const queryBuilder = createMockQueryBuilder()
 * setMockQueryError(queryBuilder, '查询失败', 'PGRST116')
 * ```
 */
export function setMockQueryError(
  queryBuilder: MockQueryBuilder,
  errorMessage: string,
  errorCode?: string
): void {
  const error = {message: errorMessage, code: errorCode}
  queryBuilder.maybeSingle.mockResolvedValue({data: null, error})
  queryBuilder.order.mockResolvedValue({data: null, error})
}

/**
 * 设置 Mock 用户已登录状态
 *
 * @param mockClient - Mock Supabase 客户端
 * @param userId - 用户 ID
 * @param email - 用户邮箱（可选）
 *
 * @example
 * ```typescript
 * const mockClient = createMockSupabaseClient()
 * setMockUserLoggedIn(mockClient, 'user-001', 'test@example.com')
 * ```
 */
export function setMockUserLoggedIn(
  mockClient: MockSupabaseClient,
  userId: string,
  email?: string
): void {
  mockClient.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: userId,
        email: email || `${userId}@example.com`,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      }
    },
    error: null
  })
}

/**
 * 设置 Mock 用户未登录状态
 *
 * @param mockClient - Mock Supabase 客户端
 *
 * @example
 * ```typescript
 * const mockClient = createMockSupabaseClient()
 * setMockUserLoggedOut(mockClient)
 * ```
 */
export function setMockUserLoggedOut(mockClient: MockSupabaseClient): void {
  mockClient.auth.getUser.mockResolvedValue({
    data: {user: null},
    error: null
  })
}

/**
 * 重置所有 Mock
 * 在每个测试用例之前调用以确保测试隔离
 *
 * @param mockClient - Mock Supabase 客户端
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   resetMockSupabaseClient(mockClient)
 * })
 * ```
 */
export function resetMockSupabaseClient(mockClient: MockSupabaseClient): void {
  vi.clearAllMocks()

  // 重置 from 方法返回默认查询构建器
  const defaultQueryBuilder = createMockQueryBuilder()
  mockClient.from.mockReturnValue(defaultQueryBuilder)

  // 重置认证状态为未登录
  setMockUserLoggedOut(mockClient)

  // 重置存储模块
  mockClient.storage = createMockStorage()

  // 重置 RPC
  mockClient.rpc.mockResolvedValue({data: null, error: null})
}
