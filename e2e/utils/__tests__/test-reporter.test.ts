/**
 * URL 解析属性测试
 * 使用 fast-check 进行属性测试，验证 URL 解析的正确性
 * 
 * **Feature: e2e-api-statistics, Property 2: URL 解析正确性**
 * **Validates: Requirements 1.4, 1.5**
 * 
 * @module e2e/utils/__tests__/test-reporter.test
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { parseSupabaseUrl, ParsedSupabaseUrl } from '../test-reporter'

/**
 * 生成有效的 HTTP 方法
 */
const httpMethodArb = fc.constantFrom('GET', 'POST', 'PATCH', 'DELETE', 'PUT')

/**
 * 生成有效的 Supabase 表名
 * 表名由小写字母和下划线组成，以字母开头
 */
const tableNameArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => /^[a-z][a-z0-9_]*$/.test(s))

/**
 * 生成有效的 RPC 函数名
 * 函数名由小写字母和下划线组成，以字母开头
 */
const rpcFunctionNameArb = fc.string({ minLength: 1, maxLength: 30 })
  .filter(s => /^[a-z][a-z0-9_]*$/.test(s))

/**
 * 生成 Supabase 基础 URL
 */
const supabaseBaseUrlArb = fc.constantFrom(
  'https://abc123.supabase.co',
  'https://xyz789.supabase.in',
  'https://project-ref.supabase.co'
)

/**
 * 生成有效的 Supabase REST API URL
 */
const supabaseRestUrlArb = fc.tuple(
  supabaseBaseUrlArb,
  tableNameArb,
  fc.constantFrom('', '?select=*', '?select=id,name', '?id=eq.1')
).map(([baseUrl, table, query]) => `${baseUrl}/rest/v1/${table}${query}`)

/**
 * 生成有效的 Supabase RPC URL
 */
const supabaseRpcUrlArb = fc.tuple(
  supabaseBaseUrlArb,
  rpcFunctionNameArb,
  fc.constantFrom('', '?param1=value1')
).map(([baseUrl, funcName, query]) => `${baseUrl}/rest/v1/rpc/${funcName}${query}`)

/**
 * 生成有效的 Supabase Auth URL
 */
const supabaseAuthUrlArb = fc.tuple(
  supabaseBaseUrlArb,
  fc.constantFrom(
    'token',
    'token?grant_type=refresh_token',
    'user',
    'signup',
    'signin/password',
    'signin/otp',
    'signin/oauth',
    'signout',
    'recover',
    'verify',
    'verify/otp',
    'otp',
    'magiclink',
    'callback',
    'authorize',
    'session',
    'mfa/enroll',
    'mfa/challenge',
    'mfa/verify',
    'factors',
    'reauthenticate',
    'resend',
    'admin/users',
    'admin/invite',
    'anonymous'
  )
).map(([baseUrl, endpoint]) => `${baseUrl}/auth/v1/${endpoint}`)

/**
 * 生成有效的 Supabase Storage URL
 */
const supabaseStorageUrlArb = fc.tuple(
  supabaseBaseUrlArb,
  fc.constantFrom(
    'bucket',
    'bucket/my-bucket',
    'object/my-bucket/path/to/file.jpg',
    'object/my-bucket/upload',
    'object/my-bucket/move',
    'object/my-bucket/copy',
    'object/my-bucket/list',
    'object/my-bucket/sign',
    'object/my-bucket/public',
    'upload/my-bucket/file.jpg',
    'download/my-bucket/file.jpg',
    'render/image/my-bucket/file.jpg'
  )
).map(([baseUrl, path]) => `${baseUrl}/storage/v1/${path}`)

/**
 * 生成有效的 Supabase Realtime URL
 */
const supabaseRealtimeUrlArb = fc.tuple(
  supabaseBaseUrlArb,
  fc.constantFrom(
    'websocket',
    'channel/my-channel',
    'broadcast',
    'presence'
  )
).map(([baseUrl, path]) => `${baseUrl}/realtime/v1/${path}`)

/**
 * 生成有效的 Supabase Edge Functions URL
 */
const supabaseFunctionsUrlArb = fc.tuple(
  supabaseBaseUrlArb,
  rpcFunctionNameArb
).map(([baseUrl, funcName]) => `${baseUrl}/functions/v1/${funcName}`)

/**
 * 生成有效的 Supabase GraphQL URL
 */
const supabaseGraphqlUrlArb = fc.tuple(
  supabaseBaseUrlArb,
  fc.constantFrom('', '?query=...')
).map(([baseUrl, query]) => `${baseUrl}/graphql/v1${query}`)

describe('parseSupabaseUrl', () => {
  /**
   * Property 2: URL 解析正确性
   * 
   * *For any* Supabase API URL，解析函数应正确识别表名和操作类型（包括 RPC 和 auth 类型）。
   * 
   * **Feature: e2e-api-statistics, Property 2: URL 解析正确性**
   * **Validates: Requirements 1.4, 1.5**
   */
  describe('Property 2: URL 解析正确性', () => {
    
    describe('REST API URL 解析', () => {
      it('对于任意有效的 REST API URL，应正确识别表名', () => {
        fc.assert(
          fc.property(
            fc.tuple(supabaseBaseUrlArb, tableNameArb),
            httpMethodArb,
            ([baseUrl, tableName], method) => {
              const url = `${baseUrl}/rest/v1/${tableName}`
              const result = parseSupabaseUrl(url, method)
              
              // 表名应该正确识别
              expect(result.table).toBe(tableName)
              // API 类型应该是 rest
              expect(result.apiType).toBe('rest')
              
              return true
            }
          ),
          { numRuns: 100 }
        )
      })

      it('对于任意 REST API URL 和 HTTP 方法，应正确识别操作类型', () => {
        fc.assert(
          fc.property(
            supabaseRestUrlArb,
            httpMethodArb,
            (url, method) => {
              const result = parseSupabaseUrl(url, method)
              
              // 根据 HTTP 方法验证操作类型
              const expectedOperations: Record<string, string> = {
                'GET': 'select',
                'POST': 'insert',
                'PATCH': 'update',
                'PUT': 'upsert',
                'DELETE': 'delete'
              }
              
              expect(result.operation).toBe(expectedOperations[method])
              return true
            }
          ),
          { numRuns: 100 }
        )
      })
    })

    describe('RPC URL 解析', () => {
      it('对于任意有效的 RPC URL，应正确识别为 RPC 调用', () => {
        fc.assert(
          fc.property(
            fc.tuple(supabaseBaseUrlArb, rpcFunctionNameArb),
            httpMethodArb,
            ([baseUrl, funcName], method) => {
              const url = `${baseUrl}/rest/v1/rpc/${funcName}`
              const result = parseSupabaseUrl(url, method)
              
              // 表名应该是 rpc:函数名 格式
              expect(result.table).toBe(`rpc:${funcName}`)
              // 操作类型应该是 rpc
              expect(result.operation).toBe('rpc')
              // API 类型应该是 rpc
              expect(result.apiType).toBe('rpc')
              
              return true
            }
          ),
          { numRuns: 100 }
        )
      })

      it('RPC URL 应优先于 REST URL 解析', () => {
        fc.assert(
          fc.property(
            supabaseRpcUrlArb,
            httpMethodArb,
            (url, method) => {
              const result = parseSupabaseUrl(url, method)
              
              // 即使 URL 包含 /rest/v1/，也应该识别为 RPC
              expect(result.apiType).toBe('rpc')
              expect(result.operation).toBe('rpc')
              expect(result.table.startsWith('rpc:')).toBe(true)
              
              return true
            }
          ),
          { numRuns: 50 }
        )
      })
    })

    describe('Auth URL 解析', () => {
      it('对于任意有效的 Auth URL，应正确识别为认证调用', () => {
        fc.assert(
          fc.property(
            supabaseAuthUrlArb,
            httpMethodArb,
            (url, method) => {
              const result = parseSupabaseUrl(url, method)
              
              // 表名应该是 auth
              expect(result.table).toBe('auth')
              // API 类型应该是 auth
              expect(result.apiType).toBe('auth')
              // 操作类型不应该是 unknown
              expect(result.operation).not.toBe('unknown')
              
              return true
            }
          ),
          { numRuns: 100 }
        )
      })

      it('应正确识别 token 操作', () => {
        const baseUrls = ['https://abc.supabase.co', 'https://xyz.supabase.in']
        
        for (const baseUrl of baseUrls) {
          // 普通 token
          let result = parseSupabaseUrl(`${baseUrl}/auth/v1/token`, 'POST')
          expect(result.operation).toBe('token')
          
          // 刷新 token
          result = parseSupabaseUrl(`${baseUrl}/auth/v1/token?grant_type=refresh_token`, 'POST')
          expect(result.operation).toBe('refresh_token')
        }
      })

      it('应正确识别各种登录方式', () => {
        const baseUrl = 'https://abc.supabase.co'
        
        // 普通登录
        let result = parseSupabaseUrl(`${baseUrl}/auth/v1/signin/password`, 'POST')
        expect(result.operation).toBe('signin')
        
        // OTP 登录
        result = parseSupabaseUrl(`${baseUrl}/auth/v1/signin/otp`, 'POST')
        expect(result.operation).toBe('signin_otp')
        
        // OAuth 登录
        result = parseSupabaseUrl(`${baseUrl}/auth/v1/signin/oauth`, 'POST')
        expect(result.operation).toBe('signin_oauth')
      })

      it('应正确识别 MFA 相关操作', () => {
        const baseUrl = 'https://abc.supabase.co'
        
        let result = parseSupabaseUrl(`${baseUrl}/auth/v1/mfa/enroll`, 'POST')
        expect(result.operation).toBe('mfa_enroll')
        
        result = parseSupabaseUrl(`${baseUrl}/auth/v1/mfa/challenge`, 'POST')
        expect(result.operation).toBe('mfa_challenge')
        
        result = parseSupabaseUrl(`${baseUrl}/auth/v1/mfa/verify`, 'POST')
        expect(result.operation).toBe('mfa_verify')
        
        result = parseSupabaseUrl(`${baseUrl}/auth/v1/factors`, 'GET')
        expect(result.operation).toBe('mfa_factors')
      })
    })

    describe('Storage URL 解析', () => {
      it('对于任意有效的 Storage URL，应正确识别为存储调用', () => {
        fc.assert(
          fc.property(
            supabaseStorageUrlArb,
            httpMethodArb,
            (url, method) => {
              const result = parseSupabaseUrl(url, method)
              
              // API 类型应该是 storage
              expect(result.apiType).toBe('storage')
              // 表名应该以 storage 开头
              expect(result.table.startsWith('storage')).toBe(true)
              // 操作类型不应该是 unknown
              expect(result.operation).not.toBe('unknown')
              
              return true
            }
          ),
          { numRuns: 50 }
        )
      })

      it('应正确识别存储桶操作', () => {
        const baseUrl = 'https://abc.supabase.co'
        
        let result = parseSupabaseUrl(`${baseUrl}/storage/v1/bucket`, 'GET')
        expect(result.operation).toBe('list_buckets')
        
        result = parseSupabaseUrl(`${baseUrl}/storage/v1/bucket`, 'POST')
        expect(result.operation).toBe('create_bucket')
        
        result = parseSupabaseUrl(`${baseUrl}/storage/v1/bucket/my-bucket`, 'DELETE')
        expect(result.operation).toBe('delete_bucket')
      })

      it('应正确识别对象操作', () => {
        const baseUrl = 'https://abc.supabase.co'
        
        let result = parseSupabaseUrl(`${baseUrl}/storage/v1/object/my-bucket/file.jpg`, 'GET')
        expect(result.operation).toBe('download')
        
        result = parseSupabaseUrl(`${baseUrl}/storage/v1/object/my-bucket/file.jpg`, 'POST')
        expect(result.operation).toBe('upload')
        
        result = parseSupabaseUrl(`${baseUrl}/storage/v1/object/my-bucket/file.jpg`, 'DELETE')
        expect(result.operation).toBe('delete')
      })
    })

    describe('Realtime URL 解析', () => {
      it('对于任意有效的 Realtime URL，应正确识别为实时调用', () => {
        fc.assert(
          fc.property(
            supabaseRealtimeUrlArb,
            (url) => {
              const result = parseSupabaseUrl(url, 'GET')
              
              // API 类型应该是 realtime
              expect(result.apiType).toBe('realtime')
              // 表名应该以 realtime 开头
              expect(result.table.startsWith('realtime')).toBe(true)
              
              return true
            }
          ),
          { numRuns: 50 }
        )
      })

      it('应正确识别 WebSocket 连接', () => {
        const baseUrl = 'https://abc.supabase.co'
        const result = parseSupabaseUrl(`${baseUrl}/realtime/v1/websocket`, 'GET')
        
        expect(result.apiType).toBe('realtime')
        expect(result.operation).toBe('connect')
      })

      it('应正确识别频道订阅', () => {
        const baseUrl = 'https://abc.supabase.co'
        const result = parseSupabaseUrl(`${baseUrl}/realtime/v1/channel/my-channel`, 'GET')
        
        expect(result.apiType).toBe('realtime')
        expect(result.table).toBe('realtime:channel')
      })
    })

    describe('Edge Functions URL 解析', () => {
      it('对于任意有效的 Functions URL，应正确识别为函数调用', () => {
        fc.assert(
          fc.property(
            supabaseFunctionsUrlArb,
            httpMethodArb,
            (url, method) => {
              const result = parseSupabaseUrl(url, method)
              
              // API 类型应该是 functions
              expect(result.apiType).toBe('functions')
              // 表名应该以 function: 开头
              expect(result.table.startsWith('function:')).toBe(true)
              // 操作类型应该是 invoke
              expect(result.operation).toBe('invoke')
              
              return true
            }
          ),
          { numRuns: 50 }
        )
      })
    })

    describe('GraphQL URL 解析', () => {
      it('对于任意有效的 GraphQL URL，应正确识别为 GraphQL 调用', () => {
        fc.assert(
          fc.property(
            supabaseGraphqlUrlArb,
            httpMethodArb,
            (url, method) => {
              const result = parseSupabaseUrl(url, method)
              
              // API 类型应该是 graphql
              expect(result.apiType).toBe('graphql')
              // 表名应该是 graphql
              expect(result.table).toBe('graphql')
              // 操作类型应该是 query 或 mutation
              if (method === 'GET') {
                expect(result.operation).toBe('query')
              } else {
                expect(result.operation).toBe('mutation')
              }
              
              return true
            }
          ),
          { numRuns: 50 }
        )
      })
    })

    describe('未知 URL 处理', () => {
      it('对于未知 URL，应返回 unknown', () => {
        const unknownUrls = [
          'https://example.com/api/users',
          'https://other-service.com/data',
          'http://localhost:3000/test'
        ]
        
        for (const url of unknownUrls) {
          const result = parseSupabaseUrl(url, 'GET')
          expect(result.table).toBe('unknown')
          expect(result.apiType).toBe('unknown')
        }
      })
    })
  })

  describe('返回值结构验证', () => {
    it('返回值应始终包含 table、operation 和 apiType 字段', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            supabaseRestUrlArb,
            supabaseRpcUrlArb,
            supabaseAuthUrlArb,
            supabaseStorageUrlArb,
            supabaseRealtimeUrlArb,
            supabaseFunctionsUrlArb,
            supabaseGraphqlUrlArb
          ),
          httpMethodArb,
          (url, method) => {
            const result = parseSupabaseUrl(url, method)
            
            // 验证返回值结构
            expect(result).toHaveProperty('table')
            expect(result).toHaveProperty('operation')
            expect(result).toHaveProperty('apiType')
            
            // 验证类型
            expect(typeof result.table).toBe('string')
            expect(typeof result.operation).toBe('string')
            expect(typeof result.apiType).toBe('string')
            
            // 验证非空
            expect(result.table.length).toBeGreaterThan(0)
            expect(result.operation.length).toBeGreaterThan(0)
            expect(result.apiType.length).toBeGreaterThan(0)
            
            return true
          }
        ),
        { numRuns: 200 }
      )
    })

    it('apiType 应该是预定义的类型之一', () => {
      const validApiTypes = ['rest', 'rpc', 'auth', 'storage', 'realtime', 'functions', 'graphql', 'unknown']
      
      fc.assert(
        fc.property(
          fc.oneof(
            supabaseRestUrlArb,
            supabaseRpcUrlArb,
            supabaseAuthUrlArb,
            supabaseStorageUrlArb,
            supabaseRealtimeUrlArb,
            supabaseFunctionsUrlArb,
            supabaseGraphqlUrlArb,
            fc.constant('https://example.com/unknown')
          ),
          httpMethodArb,
          (url, method) => {
            const result = parseSupabaseUrl(url, method)
            expect(validApiTypes).toContain(result.apiType)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
