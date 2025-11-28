/**
 * 租户上下文管理工具
 *
 * 提供安全的跨 Schema 访问功能
 */

import {supabase} from '@/client/supabase'

/**
 * 获取当前用户ID（使用安全代理函数）
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const {data, error} = await supabase.rpc('current_user_id')

    if (error) {
      console.error('获取当前用户ID失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('获取当前用户ID异常:', error)
    return null
  }
}

/**
 * 获取当前租户ID（使用安全代理函数）
 */
export async function getCurrentTenantId(): Promise<string | null> {
  try {
    const {data, error} = await supabase.rpc('current_tenant_id')

    if (error) {
      console.error('获取当前租户ID失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('获取当前租户ID异常:', error)
    return null
  }
}

/**
 * 获取当前租户Schema名称
 */
export async function getTenantSchema(): Promise<string> {
  try {
    const {data, error} = await supabase.rpc('get_tenant_schema')

    if (error) {
      console.error('获取租户Schema失败:', error)
      return 'public'
    }

    return data || 'public'
  } catch (error) {
    console.error('获取租户Schema异常:', error)
    return 'public'
  }
}

/**
 * 设置当前会话的 search_path 到租户 Schema
 */
export async function setTenantSearchPath(): Promise<boolean> {
  try {
    const {error} = await supabase.rpc('set_tenant_search_path')

    if (error) {
      console.error('设置租户search_path失败:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('设置租户search_path异常:', error)
    return false
  }
}

/**
 * 记录跨 Schema 访问日志
 */
export async function logCrossSchemaAccess(params: {
  sourceSchema: string
  targetSchema: string
  operation: string
  tableName: string
  success?: boolean
  errorMessage?: string
}): Promise<void> {
  try {
    const {error} = await supabase.rpc('log_cross_schema_access', {
      p_source_schema: params.sourceSchema,
      p_target_schema: params.targetSchema,
      p_operation: params.operation,
      p_table_name: params.tableName,
      p_success: params.success ?? true,
      p_error_message: params.errorMessage ?? null
    })

    if (error) {
      console.error('记录跨Schema访问日志失败:', error)
    }
  } catch (error) {
    console.error('记录跨Schema访问日志异常:', error)
  }
}

/**
 * 测试跨 Schema 访问安全性
 */
export async function testCrossSchemaSecur(): Promise<
  Array<{
    test_name: string
    result: string
    details: string
  }>
> {
  try {
    const {data, error} = await supabase.rpc('test_cross_schema_security')

    if (error) {
      console.error('测试跨Schema安全性失败:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('测试跨Schema安全性异常:', error)
    return []
  }
}

/**
 * 租户上下文信息
 */
export interface TenantContext {
  userId: string | null
  tenantId: string | null
  schema: string
}

/**
 * 获取完整的租户上下文信息
 */
export async function getTenantContext(): Promise<TenantContext> {
  const [userId, tenantId, schema] = await Promise.all([getCurrentUserId(), getCurrentTenantId(), getTenantSchema()])

  return {
    userId,
    tenantId,
    schema
  }
}

/**
 * 初始化租户上下文
 *
 * 在应用启动时调用，设置正确的 search_path
 */
export async function initTenantContext(): Promise<TenantContext> {
  // 设置 search_path
  await setTenantSearchPath()

  // 获取上下文信息
  const context = await getTenantContext()

  console.log('租户上下文已初始化:', context)

  return context
}
