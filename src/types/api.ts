/**
 * API 相关类型定义
 * 统一的 API 响应和错误处理类型
 *
 * @module types/api
 */

/**
 * 标准 API 响应格式
 * 所有 API 调用应返回此格式，确保响应结构的一致性
 *
 * @template T - 成功时返回的数据类型
 *
 * @example
 * ```typescript
 * async function getUser(id: string): Promise<ApiResponse<User>> {
 *   try {
 *     const user = await api.fetchUser(id)
 *     return {
 *       data: user,
 *       error: null,
 *       success: true,
 *       message: '获取用户成功'
 *     }
 *   } catch (error) {
 *     return {
 *       data: null,
 *       error: { code: 500, message: '获取用户失败' },
 *       success: false
 *     }
 *   }
 * }
 * ```
 */
export interface ApiResponse<T> {
  /** 成功时的数据，失败时为 null */
  data: T | null
  /** 失败时的错误信息，成功时为 null */
  error: ApiError | null
  /** 请求是否成功 */
  success: boolean
  /** 可选的提示消息 */
  message?: string
}

/**
 * API 错误类型
 * 统一的错误信息结构，包含错误码、消息和详细信息
 *
 * @example
 * ```typescript
 * const error: ApiError = {
 *   code: 400,
 *   message: '请求参数错误',
 *   details: { field: 'email', reason: '格式不正确' },
 *   statusCode: 400
 * }
 * ```
 */
export interface ApiError {
  /** 错误代码（字符串或数字） */
  code: string | number
  /** 错误消息 */
  message: string
  /** 错误详细信息（可选） */
  details?: Record<string, unknown>
  /** HTTP 状态码（可选） */
  statusCode?: number
}

/**
 * Supabase 查询构建器类型
 * 用于类型安全的数据库查询，提供链式调用接口
 *
 * @template T - 查询返回的数据类型
 *
 * @example
 * ```typescript
 * const query: QueryBuilder<User> = supabase
 *   .from('users')
 *   .select('*')
 *   .eq('role', 'admin')
 *   .order('created_at', { ascending: false })
 *   .limit(10)
 * ```
 */
export interface QueryBuilder<T> {
  /** 等于条件 */
  eq: (column: string, value: unknown) => QueryBuilder<T>
  /** 不等于条件 */
  neq: (column: string, value: unknown) => QueryBuilder<T>
  /** IN 条件（值在数组中） */
  in: (column: string, values: unknown[]) => QueryBuilder<T>
  /** 大于条件 */
  gt: (column: string, value: unknown) => QueryBuilder<T>
  /** 大于等于条件 */
  gte: (column: string, value: unknown) => QueryBuilder<T>
  /** 小于条件 */
  lt: (column: string, value: unknown) => QueryBuilder<T>
  /** 小于等于条件 */
  lte: (column: string, value: unknown) => QueryBuilder<T>
  /** LIKE 模糊匹配（区分大小写） */
  like: (column: string, pattern: string) => QueryBuilder<T>
  /** ILIKE 模糊匹配（不区分大小写） */
  ilike: (column: string, pattern: string) => QueryBuilder<T>
  /** IS 条件（null 或 boolean） */
  is: (column: string, value: null | boolean) => QueryBuilder<T>
  /** 排序 */
  order: (column: string, options?: {ascending?: boolean}) => QueryBuilder<T>
  /** 限制返回数量 */
  limit: (count: number) => QueryBuilder<T>
  /** 范围查询 */
  range: (from: number, to: number) => QueryBuilder<T>
  /** 选择字段 */
  select: (columns?: string) => QueryBuilder<T>
  /** 返回单条记录 */
  single: () => QueryBuilder<T>
}

/**
 * API 请求配置
 * 用于配置 HTTP 请求的各项参数
 *
 * @example
 * ```typescript
 * const config: ApiRequestConfig = {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   data: { name: 'test' },
 *   timeout: 5000
 * }
 * ```
 */
export interface ApiRequestConfig {
  /** HTTP 方法 */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  /** 请求头 */
  headers?: Record<string, string>
  /** URL 查询参数 */
  params?: Record<string, unknown>
  /** 请求体数据 */
  data?: unknown
  /** 超时时间（毫秒） */
  timeout?: number
}

/**
 * 分页请求参数
 * 用于列表查询的分页和排序参数
 *
 * @example
 * ```typescript
 * const params: PaginationParams = {
 *   page: 1,
 *   pageSize: 20,
 *   sortBy: 'created_at',
 *   sortOrder: 'desc'
 * }
 * ```
 */
export interface PaginationParams {
  /** 页码（从1开始） */
  page: number
  /** 每页数据量 */
  pageSize: number
  /** 排序字段（可选） */
  sortBy?: string
  /** 排序方向（可选） */
  sortOrder?: 'asc' | 'desc'
}

/**
 * 分页响应数据
 * 包含分页列表数据和分页元信息
 *
 * @template T - 列表项的数据类型
 *
 * @example
 * ```typescript
 * const response: PaginationResponse<User> = {
 *   items: [user1, user2],
 *   total: 100,
 *   page: 1,
 *   pageSize: 20,
 *   totalPages: 5,
 *   hasNext: true,
 *   hasPrev: false
 * }
 * ```
 */
export interface PaginationResponse<T> {
  /** 当前页的数据项 */
  items: T[]
  /** 总数据量 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数据量 */
  pageSize: number
  /** 总页数 */
  totalPages: number
  /** 是否有下一页 */
  hasNext: boolean
  /** 是否有上一页 */
  hasPrev: boolean
}
