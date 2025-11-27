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
async function generateTenantCode(): Promise<string> {
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
 * 1. 生成租户代码和 Schema 名称
 * 2. 创建租户记录
 * 3. 调用数据库函数创建 Schema 和表结构
 * 4. 创建老板账号
 * 5. 在租户 Schema 中创建老板的 profile 记录
 * 6. 更新租户记录，保存老板账号信息
 */
export async function createTenant(input: CreateTenantInput): Promise<CreateTenantResult> {
  try {
    console.log('🚀 开始创建租户:', input.company_name)

    // 1. 生成租户代码
    const tenantCode = await generateTenantCode()
    const schemaName = tenantCode.replace(/-/g, '_') // tenant-001 -> tenant_001

    console.log('📝 租户代码:', tenantCode)
    console.log('📝 Schema 名称:', schemaName)

    // 2. 创建租户记录
    const {data: tenant, error: tenantError} = await supabase
      .from('tenants')
      .insert({
        company_name: input.company_name,
        tenant_code: tenantCode,
        schema_name: schemaName,
        contact_name: input.contact_name || null,
        contact_phone: input.contact_phone || null,
        contact_email: input.contact_email || null,
        expired_at: input.expired_at || null,
        status: 'active'
      })
      .select()
      .single()

    if (tenantError || !tenant) {
      console.error('❌ 创建租户记录失败:', tenantError)
      return {
        success: false,
        error: tenantError?.message || '创建租户记录失败'
      }
    }

    console.log('✅ 租户记录创建成功:', tenant.id)

    // 3. 调用数据库函数创建 Schema 和表结构
    const {data: schemaResult, error: schemaError} = await supabase.rpc('create_tenant_schema', {
      p_schema_name: schemaName
    })

    if (schemaError || !schemaResult?.success) {
      console.error('❌ 创建 Schema 失败:', schemaError || schemaResult?.error)

      // 回滚：删除租户记录
      await supabase.from('tenants').delete().eq('id', tenant.id)

      return {
        success: false,
        error: schemaResult?.error || schemaError?.message || '创建 Schema 失败'
      }
    }

    console.log('✅ Schema 创建成功:', schemaName)

    // 4. 创建老板账号（使用 Supabase Auth）
    const {data: authData, error: authError} = await supabase.auth.admin.createUser({
      phone: input.boss_phone,
      password: input.boss_password,
      email: input.boss_email || undefined,
      phone_confirm: true, // 自动确认手机号
      email_confirm: true, // 自动确认邮箱
      user_metadata: {
        name: input.boss_name,
        role: 'boss',
        tenant_id: tenant.id,
        schema_name: schemaName
      }
    })

    if (authError || !authData.user) {
      console.error('❌ 创建老板账号失败:', authError)

      // 回滚：删除 Schema 和租户记录
      await supabase.rpc('delete_tenant_schema', {p_schema_name: schemaName})
      await supabase.from('tenants').delete().eq('id', tenant.id)

      return {
        success: false,
        error: authError?.message || '创建老板账号失败'
      }
    }

    console.log('✅ 老板账号创建成功:', authData.user.id)

    // 5. 在租户 Schema 中创建老板的 profile 记录
    // 注意：需要使用原始 SQL，因为 Supabase JS 客户端不支持动态 Schema
    const {error: profileError} = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO ${schemaName}.profiles (id, name, phone, email, role, status)
        VALUES ('${authData.user.id}', '${input.boss_name}', '${input.boss_phone}', ${input.boss_email ? `'${input.boss_email}'` : 'NULL'}, 'boss', 'active')
      `
    })

    if (profileError) {
      console.error('❌ 创建老板 profile 失败:', profileError)

      // 回滚：删除老板账号、Schema 和租户记录
      await supabase.auth.admin.deleteUser(authData.user.id)
      await supabase.rpc('delete_tenant_schema', {p_schema_name: schemaName})
      await supabase.from('tenants').delete().eq('id', tenant.id)

      return {
        success: false,
        error: '创建老板 profile 失败'
      }
    }

    console.log('✅ 老板 profile 创建成功')

    // 6. 更新租户记录，保存老板账号信息
    const {data: updatedTenant, error: updateError} = await supabase
      .from('tenants')
      .update({
        boss_user_id: authData.user.id,
        boss_name: input.boss_name,
        boss_phone: input.boss_phone,
        boss_email: input.boss_email || null
      })
      .eq('id', tenant.id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ 更新租户记录失败:', updateError)
      // 不回滚，因为核心功能已完成
    }

    console.log('✅ 租户创建完成！')

    return {
      success: true,
      tenant: updatedTenant || tenant,
      message: '租户创建成功'
    }
  } catch (error) {
    console.error('❌ 创建租户异常:', error)
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
 * 1. 删除老板账号（auth.users）
 * 2. 调用数据库函数删除 Schema（CASCADE 会删除所有表和数据）
 * 3. 删除租户记录
 */
export async function deleteTenant(tenantId: string): Promise<boolean> {
  try {
    console.log('🗑️ 开始删除租户:', tenantId)

    // 1. 获取租户信息
    const tenant = await getTenantById(tenantId)
    if (!tenant) {
      console.error('❌ 租户不存在')
      return false
    }

    // 2. 删除老板账号
    if (tenant.boss_user_id) {
      const {error: authError} = await supabase.auth.admin.deleteUser(tenant.boss_user_id)
      if (authError) {
        console.error('❌ 删除老板账号失败:', authError)
        // 继续执行，不中断
      } else {
        console.log('✅ 老板账号删除成功')
      }
    }

    // 3. 删除 Schema（会删除所有表和数据）
    const {data: schemaResult, error: schemaError} = await supabase.rpc('delete_tenant_schema', {
      p_schema_name: tenant.schema_name
    })

    if (schemaError || !schemaResult?.success) {
      console.error('❌ 删除 Schema 失败:', schemaError || schemaResult?.error)
      // 继续执行，不中断
    } else {
      console.log('✅ Schema 删除成功')
    }

    // 4. 删除租户记录
    const {error: tenantError} = await supabase.from('tenants').delete().eq('id', tenantId)

    if (tenantError) {
      console.error('❌ 删除租户记录失败:', tenantError)
      return false
    }

    console.log('✅ 租户删除完成')
    return true
  } catch (error) {
    console.error('❌ 删除租户异常:', error)
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
