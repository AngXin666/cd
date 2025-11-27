/**
 * 租户配置管理 API
 *
 * 提供租户配置的 CRUD 操作
 */

import {supabase} from '@/client/supabase'
import type {TenantConfig} from '@/client/tenantSupabaseManager'

// 租户配置输入接口
export interface TenantConfigInput {
  tenant_name: string
}

/**
 * 获取所有租户配置
 * @returns 租户配置列表
 */
export async function getAllTenantConfigs(): Promise<TenantConfig[]> {
  const {data, error} = await supabase.rpc('get_all_tenant_configs')

  if (error) {
    console.error('获取租户配置列表失败:', error)
    throw error
  }

  return Array.isArray(data) ? data : []
}

/**
 * 获取用户所属租户的配置
 * @param userId 用户ID
 * @returns 租户配置
 */
export async function getUserTenantConfig(userId: string): Promise<TenantConfig | null> {
  const {data, error} = await supabase.rpc('get_tenant_config', {user_id: userId})

  if (error) {
    console.error('获取用户租户配置失败:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return null
  }

  return data[0] as TenantConfig
}

/**
 * 创建租户配置
 * @param input 租户配置输入
 * @returns 创建的租户配置
 */
export async function createTenantConfig(input: TenantConfigInput): Promise<TenantConfig> {
  // 生成唯一的 schema 名称：tenant_<uuid前8位>_<timestamp后6位>
  const uuid = crypto.randomUUID().replace(/-/g, '').substring(0, 8)
  const timestamp = Date.now().toString().slice(-6)
  const schemaName = `tenant_${uuid}_${timestamp}`

  // 使用中央 Supabase 的配置
  const supabaseUrl = process.env.TARO_APP_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.TARO_APP_SUPABASE_ANON_KEY || ''

  const {data, error} = await supabase
    .from('tenant_configs')
    .insert({
      tenant_name: input.tenant_name,
      schema_name: schemaName,
      supabase_url: supabaseUrl,
      supabase_anon_key: supabaseAnonKey,
      status: 'active'
    })
    .select()
    .single()

  if (error) {
    console.error('创建租户配置失败:', error)
    throw error
  }

  return data as TenantConfig
}

/**
 * 更新租户配置
 * @param tenantId 租户ID
 * @param input 租户配置输入
 * @returns 更新后的租户配置
 */
export async function updateTenantConfig(tenantId: string, input: Partial<TenantConfigInput>): Promise<TenantConfig> {
  const {data, error} = await supabase
    .from('tenant_configs')
    .update({
      ...input,
      updated_at: new Date().toISOString()
    })
    .eq('id', tenantId)
    .select()
    .single()

  if (error) {
    console.error('更新租户配置失败:', error)
    throw error
  }

  return data as TenantConfig
}

/**
 * 删除租户配置（软删除）
 * @param tenantId 租户ID
 */
export async function deleteTenantConfig(tenantId: string): Promise<void> {
  const {error} = await supabase
    .from('tenant_configs')
    .update({
      status: 'deleted',
      updated_at: new Date().toISOString()
    })
    .eq('id', tenantId)

  if (error) {
    console.error('删除租户配置失败:', error)
    throw error
  }
}

/**
 * 暂停租户
 * @param tenantId 租户ID
 */
export async function suspendTenant(tenantId: string): Promise<void> {
  const {error} = await supabase
    .from('tenant_configs')
    .update({
      status: 'suspended',
      updated_at: new Date().toISOString()
    })
    .eq('id', tenantId)

  if (error) {
    console.error('暂停租户失败:', error)
    throw error
  }
}

/**
 * 激活租户
 * @param tenantId 租户ID
 */
export async function activateTenant(tenantId: string): Promise<void> {
  const {error} = await supabase
    .from('tenant_configs')
    .update({
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', tenantId)

  if (error) {
    console.error('激活租户失败:', error)
    throw error
  }
}
