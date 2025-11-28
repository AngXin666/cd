/**
 * 中央管理系统 API
 * 用于管理多租户系统的租户
 */

import {supabase} from './supabase'
import type {CreateTenantInput, CreateTenantResult, Tenant, UpdateTenantInput} from './types'

/**
 * 获取所有租户列表
 */
export async function getAllTenants(): Promise<Tenant[]> {
  try {
    const {data, error} = await supabase.from('tenants').select('*').order('created_at', {ascending: false})

    if (error) {
      console.error('❌ 获取租户列表失败:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('❌ 获取租户列表异常:', error)
    return []
  }
}

/**
 * 根据 ID 获取租户详情
 */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  try {
    const {data, error} = await supabase.from('tenants').select('*').eq('id', tenantId).maybeSingle()

    if (error) {
      console.error('❌ 获取租户详情失败:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('❌ 获取租户详情异常:', error)
    return null
  }
}

/**
 * 生成租户代码
 * 格式：tenant-001, tenant-002, ...
 */
async function _generateTenantCode(): Promise<string> {
  try {
    // 获取最新的租户代码
    const {data, error} = await supabase
      .from('tenants')
      .select('tenant_code')
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('❌ 获取最新租户代码失败:', error)
      return 'tenant-001'
    }

    if (!data || !data.tenant_code) {
      return 'tenant-001'
    }

    // 提取数字部分并加1
    const match = data.tenant_code.match(/tenant-(\d+)/)
    if (match) {
      const num = parseInt(match[1], 10) + 1
      return `tenant-${num.toString().padStart(3, '0')}`
    }

    return 'tenant-001'
  } catch (error) {
    console.error('❌ 生成租户代码异常:', error)
    return 'tenant-001'
  }
}

/**
 * 创建租户（自动化部署）
 *
 * 流程：
 * 1. 调用 Edge Function 完成租户创建
 * 2. Edge Function 内部会：
 *    - 生成租户代码和 Schema 名称
 *    - 创建租户记录
 *    - 调用数据库函数创建 Schema 和表结构
 *    - 创建老板账号
 *    - 在租户 Schema 中创建老板的 profile 记录
 *    - 更新租户记录，保存老板账号信息
 */
export async function createTenant(input: CreateTenantInput): Promise<CreateTenantResult> {
  try {
    console.log('🚀 开始创建租户:', input.company_name)

    // 获取访问令牌
    const {
      data: {session}
    } = await supabase.auth.getSession()

    if (!session) {
      console.error('❌ 未登录')
      return {
        success: false,
        error: '未登录，请先登录'
      }
    }

    // 使用 fetch 直接调用 Edge Function，以便获取详细错误信息
    const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
    const response = await fetch(`${supabaseUrl}/functions/v1/create-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(input)
    })

    // 获取响应文本
    const responseText = await response.text()
    console.log('📥 Edge Function 响应状态:', response.status)
    console.log('📥 Edge Function 响应内容:', responseText)

    // 尝试解析 JSON
    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('❌ 无法解析响应 JSON:', e)
      return {
        success: false,
        error: `服务器返回了无效的响应: ${responseText.substring(0, 200)}`
      }
    }

    if (!response.ok) {
      console.error('❌ Edge Function 返回错误状态:', response.status)
      return {
        success: false,
        error: data.error || `服务器错误 (${response.status})`
      }
    }

    if (!data.success) {
      console.error('❌ 创建租户失败:', data.error)
      return {
        success: false,
        error: data.error || '创建租户失败'
      }
    }

    console.log('✅ 租户创建成功')
    return {
      success: true,
      tenant: data.tenant,
      message: data.message || '租户创建成功'
    }
  } catch (error) {
    console.error('❌ 创建租户异常:', error)
    console.error('异常详情:', JSON.stringify(error, null, 2))
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建租户失败'
    }
  }
}

/**
 * 更新租户信息
 */
export async function updateTenant(tenantId: string, input: UpdateTenantInput): Promise<boolean> {
  try {
    const {error} = await supabase
      .from('tenants')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId)

    if (error) {
      console.error('❌ 更新租户失败:', error)
      return false
    }

    console.log('✅ 租户更新成功')
    return true
  } catch (error) {
    console.error('❌ 更新租户异常:', error)
    return false
  }
}

/**
 * 更新租户租期
 */
export async function updateTenantExpiry(tenantId: string, expiredAt: string | null): Promise<boolean> {
  return updateTenant(tenantId, {expired_at: expiredAt})
}

/**
 * 停用租户
 */
export async function suspendTenant(tenantId: string): Promise<boolean> {
  return updateTenant(tenantId, {status: 'suspended'})
}

/**
 * 启用租户
 */
export async function activateTenant(tenantId: string): Promise<boolean> {
  return updateTenant(tenantId, {status: 'active'})
}

/**
 * 删除租户
 *
 * 警告：此操作会删除租户的所有数据，不可恢复！
 *
 * 流程：
 * 1. 调用 Edge Function 删除租户（包括老板账号、Schema 和租户记录）
 */
export async function deleteTenant(tenantId: string): Promise<boolean> {
  try {
    console.log('🗑️ 开始删除租户:', tenantId)

    // 获取访问令牌
    const {
      data: {session}
    } = await supabase.auth.getSession()

    if (!session) {
      console.error('❌ 未登录')
      return false
    }

    // 调用 Edge Function 删除租户
    const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
    const response = await fetch(`${supabaseUrl}/functions/v1/delete-tenant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({tenantId})
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      console.error('❌ 删除租户失败:', result.error)
      return false
    }

    console.log('✅ 租户删除成功')
    return true
  } catch (error) {
    console.error('❌ 删除租户失败:', error)
    return false
  }
}

/**
 * 检查租户代码是否已存在
 */
export async function checkTenantCodeExists(tenantCode: string): Promise<boolean> {
  try {
    const {data, error} = await supabase.from('tenants').select('id').eq('tenant_code', tenantCode).maybeSingle()

    if (error) {
      console.error('❌ 检查租户代码失败:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('❌ 检查租户代码异常:', error)
    return false
  }
}

/**
 * 获取租户统计信息
 */
export async function getTenantStats() {
  try {
    const tenants = await getAllTenants()

    const total = tenants.length
    const active = tenants.filter((t) => t.status === 'active').length
    const suspended = tenants.filter((t) => t.status === 'suspended').length
    const expired = tenants.filter((t) => {
      if (!t.expired_at) return false
      return new Date(t.expired_at) < new Date()
    }).length

    return {
      total,
      active,
      suspended,
      expired
    }
  } catch (error) {
    console.error('❌ 获取租户统计失败:', error)
    return {
      total: 0,
      active: 0,
      suspended: 0,
      expired: 0
    }
  }
}

/**
 * 获取模板租户配置
 */
export async function getTemplateTenantConfig(): Promise<{
  success: boolean
  tenant_id?: string
  tenant_code?: string
  company_name?: string
  message?: string
}> {
  try {
    const {data, error} = await supabase.rpc('get_template_tenant_config')

    if (error) {
      console.error('❌ 获取模板租户配置失败:', error)
      return {
        success: false,
        message: error.message
      }
    }

    return data || {success: false, message: '未找到模板租户'}
  } catch (error) {
    console.error('❌ 获取模板租户配置异常:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : '获取失败'
    }
  }
}
