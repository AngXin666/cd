/**
 * E2E 测试报告生成工具
 * 用于生成详细的测试报告和 API 调用统计
 *
 * @module e2e/utils/test-reporter
 */

import * as fs from 'fs'
import * as path from 'path'

/**
 * API 调用记录
 */
export interface ApiCallRecord {
  url: string
  method: string
  timestamp: number
  status?: number
  duration?: number
  requestBody?: any
  responseBody?: any
  table?: string // Supabase 表名
  operation?: string // 操作类型：select, insert, update, delete
}

/**
 * 页面访问记录
 */
export interface PageVisitRecord {
  path: string
  title: string
  enterTime: number
  exitTime?: number
  duration?: number
  apiCalls: ApiCallRecord[]
  errors: string[]
  consoleLogs: string[]
}

/**
 * 测试轮次记录
 */
export interface TestRoundRecord {
  round: number
  startTime: number
  endTime: number
  duration: number
  pageVisits: PageVisitRecord[]
  totalApiCalls: number
  totalErrors: number
}

/**
 * 完整测试报告
 */
export interface TestReport {
  testName: string
  startTime: number
  endTime: number
  totalDuration: number
  totalRounds: number
  totalPages: number
  totalApiCalls: number
  totalErrors: number
  rounds: TestRoundRecord[]
  apiCallSummary: ApiCallSummary
  pageVisitSummary: PageVisitSummary
}

/**
 * 响应时间分布统计
 * 包含平均值、最大值、最小值和百分位数
 */
export interface ResponseTimeStats {
  /** 平均响应时间（毫秒） */
  avg: number
  /** 最大响应时间（毫秒） */
  max: number
  /** 最小响应时间（毫秒） */
  min: number
  /** 中位数（P50）响应时间（毫秒） */
  p50: number
  /** P90 响应时间（毫秒） */
  p90: number
  /** P99 响应时间（毫秒） */
  p99: number
  /** 样本数量 */
  count: number
}

/**
 * 错误请求详情
 */
export interface ErrorDetail {
  /** 请求 URL */
  url: string
  /** HTTP 方法 */
  method: string
  /** 响应状态码 */
  status: number
  /** 请求时间戳 */
  timestamp: number
  /** 响应时间（毫秒） */
  duration?: number
  /** 所属页面路径 */
  pagePath?: string
  /** 表名 */
  table?: string
  /** 操作类型 */
  operation?: string
}

/**
 * API 调用汇总
 */
export interface ApiCallSummary {
  byTable: Record<string, number>
  byOperation: Record<string, number>
  byPage: Record<string, number>
  avgDuration: number
  maxDuration: number
  minDuration: number
  errorRate: number
  /** 响应时间分布统计 */
  responseTimeStats?: ResponseTimeStats
  /** 错误请求详情列表 */
  errorDetails?: ErrorDetail[]
}

/**
 * 页面访问汇总
 */
export interface PageVisitSummary {
  byPage: Record<
    string,
    {
      visitCount: number
      avgDuration: number
      avgApiCalls: number
      errorCount: number
    }
  >
}

/**
 * URL 解析结果类型
 * 包含表名/资源名和操作类型
 */
export interface ParsedSupabaseUrl {
  /** 表名或资源名（如 users, rpc:function_name, auth, storage, realtime） */
  table: string
  /** 操作类型（如 select, insert, update, delete, rpc, token, signup 等） */
  operation: string
  /** API 类型（rest, rpc, auth, storage, realtime, functions, graphql） */
  apiType: 'rest' | 'rpc' | 'auth' | 'storage' | 'realtime' | 'functions' | 'graphql' | 'unknown'
}

/**
 * 解析 Supabase API URL，提取表名、操作类型和 API 类型
 * 
 * 支持的 URL 模式：
 * - REST API: /rest/v1/{table}
 * - RPC 调用: /rest/v1/rpc/{function_name}
 * - 认证 API: /auth/v1/{endpoint}
 * - 存储 API: /storage/v1/{operation}
 * - 实时 API: /realtime/v1/{channel}
 * - Edge Functions: /functions/v1/{function_name}
 * - GraphQL: /graphql/v1
 * 
 * @param url - Supabase API URL
 * @param method - HTTP 方法（GET, POST, PATCH, DELETE, PUT）
 * @returns 解析结果，包含表名、操作类型和 API 类型
 * 
 * @example
 * // REST API
 * parseSupabaseUrl('https://xxx.supabase.co/rest/v1/users?select=*', 'GET')
 * // => { table: 'users', operation: 'select', apiType: 'rest' }
 * 
 * @example
 * // RPC 调用
 * parseSupabaseUrl('https://xxx.supabase.co/rest/v1/rpc/get_user_stats', 'POST')
 * // => { table: 'rpc:get_user_stats', operation: 'rpc', apiType: 'rpc' }
 * 
 * @example
 * // 认证 API
 * parseSupabaseUrl('https://xxx.supabase.co/auth/v1/token?grant_type=password', 'POST')
 * // => { table: 'auth', operation: 'token', apiType: 'auth' }
 */
export function parseSupabaseUrl(url: string, method: string): ParsedSupabaseUrl {
  let table = 'unknown'
  let operation = 'unknown'
  let apiType: ParsedSupabaseUrl['apiType'] = 'unknown'

  // 标准化 HTTP 方法为大写
  const normalizedMethod = method.toUpperCase()

  // 1. 检查是否是 RPC 调用（优先级最高，因为 RPC URL 也包含 /rest/v1/）
  if (url.includes('/rpc/')) {
    const rpcMatch = url.match(/\/rpc\/([^?/]+)/)
    if (rpcMatch) {
      table = `rpc:${rpcMatch[1]}`
      operation = 'rpc'
      apiType = 'rpc'
      return {table, operation, apiType}
    }
  }

  // 2. 检查是否是认证相关 API
  if (url.includes('/auth/')) {
    table = 'auth'
    apiType = 'auth'
    operation = parseAuthOperation(url, normalizedMethod)
    return {table, operation, apiType}
  }

  // 3. 检查是否是存储 API
  if (url.includes('/storage/')) {
    apiType = 'storage'
    const storageResult = parseStorageUrl(url, normalizedMethod)
    table = storageResult.table
    operation = storageResult.operation
    return {table, operation, apiType}
  }

  // 4. 检查是否是实时 API
  if (url.includes('/realtime/')) {
    apiType = 'realtime'
    const realtimeResult = parseRealtimeUrl(url)
    table = realtimeResult.table
    operation = realtimeResult.operation
    return {table, operation, apiType}
  }

  // 5. 检查是否是 Edge Functions
  if (url.includes('/functions/')) {
    apiType = 'functions'
    const functionsMatch = url.match(/\/functions\/v1\/([^?/]+)/)
    if (functionsMatch) {
      table = `function:${functionsMatch[1]}`
      operation = 'invoke'
    } else {
      table = 'functions'
      operation = 'invoke'
    }
    return {table, operation, apiType}
  }

  // 6. 检查是否是 GraphQL API
  if (url.includes('/graphql/')) {
    apiType = 'graphql'
    table = 'graphql'
    operation = normalizedMethod === 'GET' ? 'query' : 'mutation'
    return {table, operation, apiType}
  }

  // 7. 处理 REST API（默认情况）
  const tableMatch = url.match(/\/rest\/v1\/([^?/]+)/)
  if (tableMatch) {
    table = tableMatch[1]
    apiType = 'rest'
  }

  // 根据 HTTP 方法判断操作类型
  operation = parseRestOperation(normalizedMethod)

  return {table, operation, apiType}
}

/**
 * 解析认证 API 的操作类型
 * 
 * 支持的认证端点：
 * - /token: 获取/刷新令牌
 * - /user: 用户信息操作
 * - /signup: 用户注册
 * - /signin: 用户登录（包括 OTP、OAuth 等）
 * - /signout: 用户登出
 * - /recover: 密码恢复
 * - /verify: 验证（邮箱、手机等）
 * - /otp: 一次性密码
 * - /magiclink: 魔法链接登录
 * - /callback: OAuth 回调
 * - /authorize: OAuth 授权
 * - /session: 会话管理
 * - /mfa: 多因素认证
 * - /factors: MFA 因素管理
 * - /reauthenticate: 重新认证
 * - /resend: 重发验证
 * - /admin: 管理员操作
 * 
 * @param url - 认证 API URL
 * @param method - HTTP 方法
 * @returns 操作类型
 */
function parseAuthOperation(url: string, method: string): string {
  // 按优先级检查各种认证端点
  // 注意：更具体的路径应该先检查，避免被通用路径匹配
  
  // MFA 相关（优先检查，因为 /mfa/verify 应该匹配 mfa_verify 而不是 verify）
  if (url.includes('/mfa')) {
    if (url.includes('/enroll')) return 'mfa_enroll'
    if (url.includes('/challenge')) return 'mfa_challenge'
    if (url.includes('/verify')) return 'mfa_verify'
    return 'mfa'
  }
  if (url.includes('/factors')) return 'mfa_factors'
  
  // 令牌相关
  if (url.includes('/token')) {
    // 检查是否是刷新令牌
    if (url.includes('grant_type=refresh_token')) {
      return 'refresh_token'
    }
    return 'token'
  }
  
  // 用户信息
  if (url.includes('/user')) {
    // 根据方法区分操作
    if (method === 'GET') return 'get_user'
    if (method === 'PUT' || method === 'PATCH') return 'update_user'
    if (method === 'DELETE') return 'delete_user'
    return 'user'
  }
  
  // 注册
  if (url.includes('/signup')) return 'signup'
  
  // 登录相关
  if (url.includes('/signin')) {
    // 检查登录方式
    if (url.includes('otp')) return 'signin_otp'
    if (url.includes('oauth')) return 'signin_oauth'
    if (url.includes('id_token')) return 'signin_id_token'
    if (url.includes('sso')) return 'signin_sso'
    return 'signin'
  }
  
  // 登出
  if (url.includes('/signout') || url.includes('/logout')) return 'signout'
  
  // 密码恢复
  if (url.includes('/recover')) return 'recover'
  
  // 验证（在 MFA 检查之后，避免 /mfa/verify 被错误匹配）
  if (url.includes('/verify')) {
    if (url.includes('otp')) return 'verify_otp'
    return 'verify'
  }
  
  // OTP
  if (url.includes('/otp')) return 'otp'
  
  // 魔法链接
  if (url.includes('/magiclink')) return 'magiclink'
  
  // OAuth 相关
  if (url.includes('/callback')) return 'oauth_callback'
  if (url.includes('/authorize')) return 'oauth_authorize'
  
  // 会话管理
  if (url.includes('/session')) {
    if (method === 'DELETE') return 'delete_session'
    return 'session'
  }
  
  // 重新认证
  if (url.includes('/reauthenticate')) return 'reauthenticate'
  
  // 重发验证
  if (url.includes('/resend')) return 'resend'
  
  // 管理员操作
  if (url.includes('/admin')) {
    if (url.includes('/users')) return 'admin_users'
    if (url.includes('/invite')) return 'admin_invite'
    return 'admin'
  }
  
  // 匿名登录
  if (url.includes('/anonymous')) return 'anonymous'
  
  // 默认返回 auth
  return 'auth'
}

/**
 * 解析存储 API 的 URL
 * 
 * 支持的存储操作：
 * - /bucket: 存储桶管理
 * - /object: 对象操作（上传、下载、删除等）
 * - /upload: 文件上传
 * - /download: 文件下载
 * - /move: 文件移动
 * - /copy: 文件复制
 * - /list: 列出文件
 * - /sign: 签名 URL
 * - /public: 公开访问
 * 
 * @param url - 存储 API URL
 * @param method - HTTP 方法
 * @returns 表名和操作类型
 */
function parseStorageUrl(url: string, method: string): {table: string; operation: string} {
  let table = 'storage'
  let operation = 'unknown'

  // 提取存储桶名称
  const bucketMatch = url.match(/\/storage\/v1\/(?:object|bucket)\/([^?/]+)/)
  if (bucketMatch) {
    table = `storage:${bucketMatch[1]}`
  }

  // 判断操作类型
  if (url.includes('/bucket')) {
    // 存储桶操作
    if (method === 'GET') operation = 'list_buckets'
    else if (method === 'POST') operation = 'create_bucket'
    else if (method === 'PUT') operation = 'update_bucket'
    else if (method === 'DELETE') operation = 'delete_bucket'
    else operation = 'bucket'
  } else if (url.includes('/object')) {
    // 对象操作
    if (url.includes('/upload') || method === 'POST') operation = 'upload'
    else if (url.includes('/move')) operation = 'move'
    else if (url.includes('/copy')) operation = 'copy'
    else if (url.includes('/list') || (method === 'GET' && url.includes('?'))) operation = 'list'
    else if (url.includes('/sign')) operation = 'sign'
    else if (url.includes('/public')) operation = 'public'
    else if (method === 'GET') operation = 'download'
    else if (method === 'DELETE') operation = 'delete'
    else operation = 'object'
  } else if (url.includes('/upload')) {
    operation = 'upload'
  } else if (url.includes('/download')) {
    operation = 'download'
  } else if (url.includes('/render')) {
    // 图片转换
    operation = 'render'
  } else {
    // 默认根据方法判断
    if (method === 'GET') operation = 'download'
    else if (method === 'POST') operation = 'upload'
    else if (method === 'DELETE') operation = 'delete'
    else operation = 'storage'
  }

  return {table, operation}
}

/**
 * 解析实时 API 的 URL
 * 
 * 支持的实时操作：
 * - /websocket: WebSocket 连接
 * - /channel: 频道订阅
 * - /broadcast: 广播消息
 * - /presence: 在线状态
 * 
 * @param url - 实时 API URL
 * @returns 表名和操作类型
 */
function parseRealtimeUrl(url: string): {table: string; operation: string} {
  let table = 'realtime'
  let operation = 'subscribe'

  // 提取频道名称
  const channelMatch = url.match(/\/realtime\/v1\/([^?/]+)/)
  if (channelMatch) {
    const channel = channelMatch[1]
    if (channel !== 'websocket') {
      table = `realtime:${channel}`
    }
  }

  // 判断操作类型
  if (url.includes('/websocket')) {
    operation = 'connect'
  } else if (url.includes('/broadcast')) {
    operation = 'broadcast'
  } else if (url.includes('/presence')) {
    operation = 'presence'
  } else if (url.includes('/channel')) {
    operation = 'channel'
  }

  return {table, operation}
}

/**
 * 根据 HTTP 方法解析 REST API 操作类型
 * 
 * @param method - HTTP 方法（大写）
 * @returns 操作类型
 */
function parseRestOperation(method: string): string {
  switch (method) {
    case 'GET':
      return 'select'
    case 'POST':
      return 'insert'
    case 'PATCH':
      return 'update'
    case 'PUT':
      return 'upsert'
    case 'DELETE':
      return 'delete'
    default:
      return method.toLowerCase()
  }
}

/**
 * 计算响应时间分布统计
 * 
 * 计算给定响应时间数组的统计指标，包括：
 * - 平均值（avg）
 * - 最大值（max）
 * - 最小值（min）
 * - 中位数（P50）
 * - P90 百分位数
 * - P99 百分位数
 * 
 * @param durations - 响应时间数组（毫秒）
 * @returns 响应时间分布统计对象
 * 
 * @example
 * const stats = calculateResponseTimeStats([100, 200, 150, 300, 50])
 * // => { avg: 160, max: 300, min: 50, p50: 150, p90: 300, p99: 300, count: 5 }
 */
export function calculateResponseTimeStats(durations: number[]): ResponseTimeStats {
  // 处理空数组的情况
  if (durations.length === 0) {
    return {
      avg: 0,
      max: 0,
      min: 0,
      p50: 0,
      p90: 0,
      p99: 0,
      count: 0
    }
  }

  // 排序数组用于计算百分位数
  const sorted = [...durations].sort((a, b) => a - b)
  const count = sorted.length

  // 计算平均值
  const sum = sorted.reduce((acc, val) => acc + val, 0)
  const avg = sum / count

  // 计算最大值和最小值
  const min = sorted[0]
  const max = sorted[count - 1]

  // 计算百分位数
  // 使用线性插值方法计算百分位数
  const p50 = calculatePercentile(sorted, 50)
  const p90 = calculatePercentile(sorted, 90)
  const p99 = calculatePercentile(sorted, 99)

  return {
    avg: Math.round(avg * 100) / 100, // 保留两位小数
    max,
    min,
    p50,
    p90,
    p99,
    count
  }
}

/**
 * 计算百分位数
 * 
 * 使用线性插值方法计算给定百分位数的值
 * 
 * @param sortedArray - 已排序的数组
 * @param percentile - 百分位数（0-100）
 * @returns 百分位数对应的值
 */
function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0
  if (sortedArray.length === 1) return sortedArray[0]

  // 计算百分位数的索引位置
  const index = (percentile / 100) * (sortedArray.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)

  // 如果索引是整数，直接返回该位置的值
  if (lower === upper) {
    return sortedArray[lower]
  }

  // 线性插值
  const fraction = index - lower
  const result = sortedArray[lower] + fraction * (sortedArray[upper] - sortedArray[lower])
  
  return Math.round(result * 100) / 100 // 保留两位小数
}

/**
 * 收集错误请求详情
 * 
 * 从测试轮次记录中收集所有状态码 >= 400 的请求详情
 * 
 * @param rounds - 测试轮次记录数组
 * @returns 错误请求详情数组
 * 
 * @example
 * const errors = collectErrorDetails(rounds)
 * // => [{ url: '...', method: 'GET', status: 404, ... }, ...]
 */
export function collectErrorDetails(rounds: TestRoundRecord[]): ErrorDetail[] {
  const errorDetails: ErrorDetail[] = []

  for (const round of rounds) {
    for (const visit of round.pageVisits) {
      for (const call of visit.apiCalls) {
        // 只收集状态码 >= 400 的请求
        if (call.status && call.status >= 400) {
          // 解析 URL 获取表名和操作类型
          const {table, operation} = parseSupabaseUrl(call.url, call.method)
          
          errorDetails.push({
            url: call.url,
            method: call.method,
            status: call.status,
            timestamp: call.timestamp,
            duration: call.duration,
            pagePath: visit.path,
            table,
            operation
          })
        }
      }
    }
  }

  // 按时间戳排序
  return errorDetails.sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * 生成 API 调用汇总
 * 
 * 从测试轮次记录中生成 API 调用的汇总统计，包括：
 * - 按表名分组的调用次数
 * - 按操作类型分组的调用次数
 * - 按页面分组的调用次数
 * - 响应时间统计（平均、最大、最小、百分位数）
 * - 错误率和错误详情
 * 
 * @param rounds - 测试轮次记录数组
 * @returns API 调用汇总对象
 */
export function generateApiCallSummary(rounds: TestRoundRecord[]): ApiCallSummary {
  const byTable: Record<string, number> = {}
  const byOperation: Record<string, number> = {}
  const byPage: Record<string, number> = {}
  const durations: number[] = []
  let errorCount = 0
  let totalCalls = 0

  for (const round of rounds) {
    for (const visit of round.pageVisits) {
      const pagePath = visit.path
      byPage[pagePath] = (byPage[pagePath] || 0) + visit.apiCalls.length

      for (const call of visit.apiCalls) {
        totalCalls++

        // 解析表名和操作
        const {table, operation} = parseSupabaseUrl(call.url, call.method)
        byTable[table] = (byTable[table] || 0) + 1
        byOperation[operation] = (byOperation[operation] || 0) + 1

        // 记录耗时
        if (call.duration) {
          durations.push(call.duration)
        }

        // 统计错误
        if (call.status && call.status >= 400) {
          errorCount++
        }
      }
    }
  }

  // 计算响应时间分布统计
  const responseTimeStats = calculateResponseTimeStats(durations)
  
  // 收集错误详情
  const errorDetails = collectErrorDetails(rounds)

  return {
    byTable,
    byOperation,
    byPage,
    avgDuration: responseTimeStats.avg,
    maxDuration: responseTimeStats.max,
    minDuration: responseTimeStats.min,
    errorRate: totalCalls > 0 ? errorCount / totalCalls : 0,
    responseTimeStats,
    errorDetails
  }
}

/**
 * 生成页面访问汇总
 */
export function generatePageVisitSummary(rounds: TestRoundRecord[]): PageVisitSummary {
  const byPage: Record<
    string,
    {
      visitCount: number
      totalDuration: number
      totalApiCalls: number
      errorCount: number
    }
  > = {}

  for (const round of rounds) {
    for (const visit of round.pageVisits) {
      const pagePath = visit.path

      if (!byPage[pagePath]) {
        byPage[pagePath] = {
          visitCount: 0,
          totalDuration: 0,
          totalApiCalls: 0,
          errorCount: 0
        }
      }

      byPage[pagePath].visitCount++
      byPage[pagePath].totalDuration += visit.duration || 0
      byPage[pagePath].totalApiCalls += visit.apiCalls.length
      byPage[pagePath].errorCount += visit.errors.length
    }
  }

  // 计算平均值
  const result: PageVisitSummary = {byPage: {}}

  for (const [path, data] of Object.entries(byPage)) {
    result.byPage[path] = {
      visitCount: data.visitCount,
      avgDuration: data.visitCount > 0 ? data.totalDuration / data.visitCount : 0,
      avgApiCalls: data.visitCount > 0 ? data.totalApiCalls / data.visitCount : 0,
      errorCount: data.errorCount
    }
  }

  return result
}

/**
 * 生成完整测试报告
 */
export function generateTestReport(
  testName: string,
  rounds: TestRoundRecord[],
  startTime: number,
  endTime: number
): TestReport {
  const totalApiCalls = rounds.reduce((sum, r) => sum + r.totalApiCalls, 0)
  const totalErrors = rounds.reduce((sum, r) => sum + r.totalErrors, 0)
  const totalPages = new Set(rounds.flatMap((r) => r.pageVisits.map((v) => v.path))).size

  return {
    testName,
    startTime,
    endTime,
    totalDuration: endTime - startTime,
    totalRounds: rounds.length,
    totalPages,
    totalApiCalls,
    totalErrors,
    rounds,
    apiCallSummary: generateApiCallSummary(rounds),
    pageVisitSummary: generatePageVisitSummary(rounds)
  }
}

/**
 * 生成响应时间分布的 ASCII 柱状图
 * 
 * @param stats - 响应时间统计对象
 * @returns ASCII 柱状图字符串
 */
function generateResponseTimeChart(stats: ResponseTimeStats): string {
  if (stats.count === 0) {
    return '无数据'
  }

  const lines: string[] = []
  const maxBarLength = 30
  const maxValue = stats.max

  // 定义要显示的指标
  const metrics = [
    { label: 'Min ', value: stats.min },
    { label: 'P50 ', value: stats.p50 },
    { label: 'Avg ', value: stats.avg },
    { label: 'P90 ', value: stats.p90 },
    { label: 'P99 ', value: stats.p99 },
    { label: 'Max ', value: stats.max }
  ]

  for (const metric of metrics) {
    // 计算柱状图长度
    const barLength = maxValue > 0 ? Math.round((metric.value / maxValue) * maxBarLength) : 0
    const bar = '█'.repeat(barLength) + '░'.repeat(maxBarLength - barLength)
    lines.push(`${metric.label} ${bar} ${metric.value.toFixed(0)}ms`)
  }

  return lines.join('\n')
}

/**
 * 格式化错误详情为 Markdown 表格
 * 
 * @param errors - 错误详情数组
 * @returns Markdown 表格字符串
 */
function formatErrorDetailsTable(errors: ErrorDetail[]): string {
  if (errors.length === 0) {
    return '无错误请求'
  }

  const lines: string[] = []
  lines.push('| 时间 | 页面 | 方法 | 表/资源 | 操作 | 状态码 | 耗时 |')
  lines.push('|------|------|------|---------|------|--------|------|')

  for (const error of errors) {
    const time = new Date(error.timestamp).toLocaleTimeString('zh-CN')
    const page = error.pagePath || '-'
    const table = error.table || '-'
    const operation = error.operation || '-'
    const duration = error.duration ? `${error.duration}ms` : '-'
    
    lines.push(`| ${time} | ${page} | ${error.method} | ${table} | ${operation} | ${error.status} | ${duration} |`)
  }

  return lines.join('\n')
}

/**
 * 按 API 类型分组统计
 * 
 * @param byTable - 按表名统计的数据
 * @returns 按 API 类型分组的统计
 */
function groupByApiType(byTable: Record<string, number>): Record<string, { tables: Record<string, number>; total: number }> {
  const groups: Record<string, { tables: Record<string, number>; total: number }> = {
    'REST API': { tables: {}, total: 0 },
    'RPC 调用': { tables: {}, total: 0 },
    '认证 API': { tables: {}, total: 0 },
    '存储 API': { tables: {}, total: 0 },
    '实时 API': { tables: {}, total: 0 },
    'Edge Functions': { tables: {}, total: 0 },
    'GraphQL': { tables: {}, total: 0 },
    '其他': { tables: {}, total: 0 }
  }

  for (const [table, count] of Object.entries(byTable)) {
    let groupName = '其他'
    
    if (table.startsWith('rpc:')) {
      groupName = 'RPC 调用'
    } else if (table === 'auth') {
      groupName = '认证 API'
    } else if (table.startsWith('storage:') || table === 'storage') {
      groupName = '存储 API'
    } else if (table.startsWith('realtime:') || table === 'realtime') {
      groupName = '实时 API'
    } else if (table.startsWith('function:') || table === 'functions') {
      groupName = 'Edge Functions'
    } else if (table === 'graphql') {
      groupName = 'GraphQL'
    } else if (table !== 'unknown') {
      groupName = 'REST API'
    }

    groups[groupName].tables[table] = count
    groups[groupName].total += count
  }

  // 移除空的分组
  for (const key of Object.keys(groups)) {
    if (groups[key].total === 0) {
      delete groups[key]
    }
  }

  return groups
}

/**
 * 格式化测试报告为 Markdown
 * 
 * 生成详细的 Markdown 格式测试报告，包括：
 * - 测试概览（轮次、页面数、API 调用数、错误数、耗时）
 * - API 调用汇总（按表名、操作类型、API 类型分组）
 * - 响应时间分布（包含 ASCII 柱状图）
 * - 错误请求详情
 * - 页面访问汇总
 * - 详细测试记录
 * 
 * @param report - 测试报告对象
 * @returns Markdown 格式的报告字符串
 */
export function formatReportAsMarkdown(report: TestReport): string {
  const lines: string[] = []

  lines.push(`# ${report.testName} 测试报告`)
  lines.push('')
  lines.push(`> 生成时间: ${new Date().toLocaleString('zh-CN')}`)
  lines.push('')

  // ==================== 测试概览 ====================
  lines.push('## 📊 测试概览')
  lines.push('')
  lines.push('| 指标 | 值 |')
  lines.push('|:-----|----:|')
  lines.push(`| 测试轮次 | ${report.totalRounds} |`)
  lines.push(`| 测试页面数 | ${report.totalPages} |`)
  lines.push(`| 总 API 调用 | ${report.totalApiCalls} |`)
  lines.push(`| 总错误数 | ${report.totalErrors} |`)
  lines.push(`| 总耗时 | ${(report.totalDuration / 1000).toFixed(2)}s |`)
  lines.push(`| 错误率 | ${(report.apiCallSummary.errorRate * 100).toFixed(2)}% |`)
  lines.push('')

  // ==================== API 调用汇总 ====================
  lines.push('## 🔗 API 调用汇总')
  lines.push('')

  // 按 API 类型分组显示
  const apiTypeGroups = groupByApiType(report.apiCallSummary.byTable)
  
  lines.push('### 按 API 类型分组')
  lines.push('')
  
  for (const [groupName, groupData] of Object.entries(apiTypeGroups).sort((a, b) => b[1].total - a[1].total)) {
    lines.push(`#### ${groupName} (${groupData.total} 次调用)`)
    lines.push('')
    lines.push('| 表/资源 | 调用次数 |')
    lines.push('|:--------|--------:|')
    for (const [table, count] of Object.entries(groupData.tables).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${table} | ${count} |`)
    }
    lines.push('')
  }

  // 按操作类型统计
  lines.push('### 按操作类型统计')
  lines.push('')
  lines.push('| 操作 | 调用次数 | 占比 |')
  lines.push('|:-----|--------:|-----:|')
  const totalOps = Object.values(report.apiCallSummary.byOperation).reduce((a, b) => a + b, 0)
  for (const [op, count] of Object.entries(report.apiCallSummary.byOperation).sort((a, b) => b[1] - a[1])) {
    const percentage = totalOps > 0 ? ((count / totalOps) * 100).toFixed(1) : '0.0'
    lines.push(`| ${op} | ${count} | ${percentage}% |`)
  }
  lines.push('')

  // ==================== 响应时间分布 ====================
  lines.push('## ⏱️ 响应时间分布')
  lines.push('')
  
  // 响应时间统计表格
  const stats = report.apiCallSummary.responseTimeStats
  if (stats && stats.count > 0) {
    lines.push('### 统计指标')
    lines.push('')
    lines.push('| 指标 | 值 |')
    lines.push('|:-----|----:|')
    lines.push(`| 样本数 | ${stats.count} |`)
    lines.push(`| 平均值 | ${stats.avg.toFixed(2)}ms |`)
    lines.push(`| 最小值 | ${stats.min}ms |`)
    lines.push(`| 中位数 (P50) | ${stats.p50}ms |`)
    lines.push(`| P90 | ${stats.p90}ms |`)
    lines.push(`| P99 | ${stats.p99}ms |`)
    lines.push(`| 最大值 | ${stats.max}ms |`)
    lines.push('')

    // 响应时间分布图
    lines.push('### 分布图')
    lines.push('')
    lines.push('```')
    lines.push(generateResponseTimeChart(stats))
    lines.push('```')
    lines.push('')
  } else {
    lines.push('无响应时间数据')
    lines.push('')
  }

  // ==================== 错误请求详情 ====================
  lines.push('## ❌ 错误请求详情')
  lines.push('')
  
  const errorDetails = report.apiCallSummary.errorDetails
  if (errorDetails && errorDetails.length > 0) {
    lines.push(`共 ${errorDetails.length} 个错误请求：`)
    lines.push('')
    lines.push(formatErrorDetailsTable(errorDetails))
  } else {
    lines.push('✅ 无错误请求')
  }
  lines.push('')

  // ==================== 页面访问汇总 ====================
  lines.push('## 📄 页面访问汇总')
  lines.push('')
  lines.push('| 页面路径 | 访问次数 | 平均耗时 | 平均 API 调用 | 错误数 |')
  lines.push('|:---------|--------:|--------:|--------------:|-------:|')
  for (const [pagePath, data] of Object.entries(report.pageVisitSummary.byPage).sort((a, b) => b[1].visitCount - a[1].visitCount)) {
    lines.push(
      `| ${pagePath} | ${data.visitCount} | ${data.avgDuration.toFixed(0)}ms | ${data.avgApiCalls.toFixed(1)} | ${data.errorCount} |`
    )
  }
  lines.push('')

  // ==================== 按页面分组的 API 调用 ====================
  lines.push('## 📈 按页面分组的 API 调用')
  lines.push('')
  lines.push('| 页面路径 | API 调用次数 | 占比 |')
  lines.push('|:---------|------------:|-----:|')
  const totalPageCalls = Object.values(report.apiCallSummary.byPage).reduce((a, b) => a + b, 0)
  for (const [page, count] of Object.entries(report.apiCallSummary.byPage).sort((a, b) => b[1] - a[1])) {
    const percentage = totalPageCalls > 0 ? ((count / totalPageCalls) * 100).toFixed(1) : '0.0'
    lines.push(`| ${page} | ${count} | ${percentage}% |`)
  }
  lines.push('')

  // ==================== 详细轮次记录 ====================
  lines.push('## 📝 详细测试记录')
  lines.push('')

  for (const round of report.rounds) {
    lines.push(`### 第 ${round.round} 轮`)
    lines.push('')
    lines.push(`| 属性 | 值 |`)
    lines.push(`|:-----|----:|`)
    lines.push(`| 开始时间 | ${new Date(round.startTime).toLocaleString('zh-CN')} |`)
    lines.push(`| 结束时间 | ${new Date(round.endTime).toLocaleString('zh-CN')} |`)
    lines.push(`| 耗时 | ${(round.duration / 1000).toFixed(2)}s |`)
    lines.push(`| API 调用数 | ${round.totalApiCalls} |`)
    lines.push(`| 错误数 | ${round.totalErrors} |`)
    lines.push('')

    for (const visit of round.pageVisits) {
      lines.push(`#### 📍 ${visit.title}`)
      lines.push('')
      lines.push(`- **路径**: \`${visit.path}\``)
      lines.push(`- **进入时间**: ${new Date(visit.enterTime).toLocaleString('zh-CN')}`)
      lines.push(`- **停留时长**: ${visit.duration || 0}ms`)
      lines.push(`- **API 调用数**: ${visit.apiCalls.length}`)
      lines.push(`- **错误数**: ${visit.errors.length}`)
      lines.push('')

      if (visit.apiCalls.length > 0) {
        lines.push('<details>')
        lines.push('<summary>API 调用详情</summary>')
        lines.push('')
        lines.push('| 方法 | 表/资源 | 操作 | 状态 | 耗时 |')
        lines.push('|:-----|:--------|:-----|-----:|-----:|')
        for (const call of visit.apiCalls) {
          const {table, operation} = parseSupabaseUrl(call.url, call.method)
          const status = call.status || 'pending'
          const duration = call.duration ? `${call.duration}ms` : '-'
          const statusEmoji = call.status && call.status >= 400 ? '❌' : '✅'
          lines.push(`| ${call.method} | ${table} | ${operation} | ${statusEmoji} ${status} | ${duration} |`)
        }
        lines.push('')
        lines.push('</details>')
        lines.push('')
      }

      if (visit.errors.length > 0) {
        lines.push('<details>')
        lines.push('<summary>❌ 错误信息</summary>')
        lines.push('')
        for (const error of visit.errors) {
          lines.push(`- ${error}`)
        }
        lines.push('')
        lines.push('</details>')
        lines.push('')
      }
    }
  }

  // ==================== 报告结尾 ====================
  lines.push('---')
  lines.push('')
  lines.push(`*报告生成于 ${new Date().toLocaleString('zh-CN')}*`)

  return lines.join('\n')
}

/**
 * 保存测试报告
 */
export function saveTestReport(report: TestReport, outputDir: string = 'test-results'): void {
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {recursive: true})
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  // 保存 JSON 格式
  const jsonPath = path.join(outputDir, `${report.testName}-${timestamp}.json`)
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8')
  console.log(`JSON 报告已保存: ${jsonPath}`)

  // 保存 Markdown 格式
  const mdPath = path.join(outputDir, `${report.testName}-${timestamp}.md`)
  fs.writeFileSync(mdPath, formatReportAsMarkdown(report), 'utf-8')
  console.log(`Markdown 报告已保存: ${mdPath}`)
}
