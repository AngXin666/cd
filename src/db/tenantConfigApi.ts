/**
 * 租户配置管理 API
 *
 * 提供租户配置的 CRUD 操作
 */

import {supabase} from '@/client/supabase'
import type {TenantConfig} from '@/client/tenantSupabaseManager'

/**
 * 创建租户配置输入
 */
export interface CreateTenantConfigInput {
  tenant_name: string
  schema_name: string
  supabase_url: string
  supabase_anon_key: string
}

/**
 * 更新租户配置输入
 */
export interface UpdateTenantConfigInput {
  tenant_name?: string
  supabase_url?: string
  supabase_anon_key?: string
  status?: 'active' | 'suspended' | 'deleted'
}

/**
 * 获取所有租户配置（仅超级管理员）
 * @returns 租户配置列表
 */
export async function getAllTenantConfigs(): Promise<TenantConfig[]> {
  try {
    const {data, error} = await supabase.rpc('get_all_tenant_configs')

    if (error) {
      console.error('获取租户配置列表失败:', error)
      throw error
    }

    return (data || []) as TenantConfig[]
  } catch (error) {
    console.error('获取租户配置列表异常:', error)
    throw error
  }
}

/**
 * 获取用户所属租户的配置
 * @param userId 用户ID
 * @returns 租户配置
 */
export async function getUserTenantConfig(userId: string): Promise<TenantConfig | null> {
  try {
    const {data, error} = await supabase.rpc('get_tenant_config', {user_id: userId})

    if (error) {
      console.error('获取用户租户配置失败:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    return data[0] as TenantConfig
  } catch (error) {
    console.error('获取用户租户配置异常:', error)
    return null
  }
}

/**
 * 创建租户配置
 * @param input 租户配置输入
 * @returns 创建的租户配置
 */
export async function createTenantConfig(input: CreateTenantConfigInput): Promise<TenantConfig> {
  try {
    const {data, error} = await supabase
      .from('tenant_configs')
      .insert({
        tenant_name: input.tenant_name,
        schema_name: input.schema_name,
        supabase_url: input.supabase_url,
        supabase_anon_key: input.supabase_anon_key,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('创建租户配置失败:', error)
      throw error
    }

    return data as TenantConfig
  } catch (error) {
    console.error('创建租户配置异常:', error)
    throw error
  }
}

/**
 * 更新租户配置
 * @param tenantId 租户ID
 * @param input 更新输入
 * @returns 更新后的租户配置
 */
export async function updateTenantConfig(tenantId: string, input: UpdateTenantConfigInput): Promise<TenantConfig> {
  try {
    const {data, error} = await supabase.from('tenant_configs').update(input).eq('id', tenantId).select().single()

    if (error) {
      console.error('更新租户配置失败:', error)
      throw error
    }

    return data as TenantConfig
  } catch (error) {
    console.error('更新租户配置异常:', error)
    throw error
  }
}

/**
 * 删除租户配置（软删除）
 * @param tenantId 租户ID
 */
export async function deleteTenantConfig(tenantId: string): Promise<void> {
  try {
    const {error} = await supabase.from('tenant_configs').update({status: 'deleted'}).eq('id', tenantId)

    if (error) {
      console.error('删除租户配置失败:', error)
      throw error
    }
  } catch (error) {
    console.error('删除租户配置异常:', error)
    throw error
  }
}

/**
 * 暂停租户
 * @param tenantId 租户ID
 */
export async function suspendTenant(tenantId: string): Promise<void> {
  try {
    const {error} = await supabase.from('tenant_configs').update({status: 'suspended'}).eq('id', tenantId)

    if (error) {
      console.error('暂停租户失败:', error)
      throw error
    }
  } catch (error) {
    console.error('暂停租户异常:', error)
    throw error
  }
}

/**
 * 激活租户
 * @param tenantId 租户ID
 */
export async function activateTenant(tenantId: string): Promise<void> {
  try {
    const {error} = await supabase.from('tenant_configs').update({status: 'active'}).eq('id', tenantId)

    if (error) {
      console.error('激活租户失败:', error)
      throw error
    }
  } catch (error) {
    console.error('激活租户异常:', error)
    throw error
  }
}
