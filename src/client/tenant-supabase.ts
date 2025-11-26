/**
 * 租户隔离的 Supabase 客户端
 * 
 * 自动设置 search_path 到当前用户的租户 Schema，
 * 实现真正的数据库级别隔离。
 */

import type {SupabaseClient} from '@supabase/supabase-js'
import {supabase} from './supabase'

/**
 * 获取当前用户的租户 Schema 名称
 */
export async function getTenantSchema(): Promise<string | null> {
  try {
    const {data, error} = await supabase.rpc('get_tenant_schema')

    if (error) {
      console.error('[getTenantSchema] 获取租户 Schema 失败:', error)
      return null
    }

    return data as string
  } catch (error) {
    console.error('[getTenantSchema] 异常:', error)
    return null
  }
}

/**
 * 设置当前会话的 search_path 到租户 Schema
 */
export async function setTenantSearchPath(): Promise<boolean> {
  try {
    // 调用数据库函数自动设置 search_path
    const {error} = await supabase.rpc('set_tenant_search_path')

    if (error) {
      console.error('[setTenantSearchPath] 设置 search_path 失败:', error)
      return false
    }

    console.log('✅ 已切换到租户 Schema')
    return true
  } catch (error) {
    console.error('[setTenantSearchPath] 异常:', error)
    return false
  }
}

/**
 * 获取配置了租户 Schema 的 Supabase 客户端
 * 
 * 使用示例：
 * ```typescript
 * const client = await getTenantSupabaseClient()
 * const { data } = await client.from('warehouses').select('*')
 * // 自动从当前租户的 Schema 中查询
 * ```
 */
export async function getTenantSupabaseClient(): Promise<SupabaseClient> {
  // 设置 search_path 到租户 Schema
  await setTenantSearchPath()

  return supabase
}

/**
 * 为新租户创建独立的 Schema
 */
export async function createTenantSchema(bossId: string): Promise<boolean> {
  try {
    const {error} = await supabase.rpc('create_tenant_schema', {
      tenant_boss_id: bossId
    })

    if (error) {
      console.error('[createTenantSchema] 创建租户 Schema 失败:', error)
      return false
    }

    console.log(`✅ 已为租户 ${bossId} 创建独立 Schema`)
    return true
  } catch (error) {
    console.error('[createTenantSchema] 异常:', error)
    return false
  }
}

/**
 * 租户 Schema 管理工具
 */
export const TenantSchemaManager = {
  /**
   * 获取租户 Schema 名称
   */
  getSchema: getTenantSchema,

  /**
   * 设置 search_path
   */
  setSearchPath: setTenantSearchPath,

  /**
   * 获取租户客户端
   */
  getClient: getTenantSupabaseClient,

  /**
   * 创建租户 Schema
   */
  createSchema: createTenantSchema,

  /**
   * 初始化租户会话
   * 在用户登录后调用，自动设置 search_path
   */
  async initSession(): Promise<boolean> {
    return await setTenantSearchPath()
  }
}
