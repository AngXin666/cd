/**
 * Edge Function: 创建租户
 * 
 * 功能：
 * 1. 创建租户记录
 * 2. 创建租户 Schema 和表结构
 * 3. 创建老板账号
 * 4. 在租户 Schema 中创建老板 profile
 * 5. 更新租户记录，保存老板信息
 */

import {createClient} from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface CreateTenantInput {
  company_name: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  expired_at?: string
  boss_name: string
  boss_phone: string
  boss_email?: string
  boss_account?: string // 登录账号
  boss_password: string
}

Deno.serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', {headers: corsHeaders})
  }

  try {
    // 获取请求数据
    const input: CreateTenantInput = await req.json()

    // 验证必填字段
    if (!input.company_name || !input.boss_name || !input.boss_phone || !input.boss_password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '缺少必填字段'
        }),
        {
          status: 400,
          headers: {...corsHeaders, 'Content-Type': 'application/json'}
        }
      )
    }

    // 创建 Supabase 客户端（使用 service role key）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('🚀 开始创建租户:', input.company_name)

    // 1. 生成租户代码
    const {data: latestTenant} = await supabase
      .from('tenants')
      .select('tenant_code')
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle()

    let tenantCode = 'tenant-001'
    if (latestTenant?.tenant_code) {
      const match = latestTenant.tenant_code.match(/tenant-(\d+)/)
      if (match) {
        const num = parseInt(match[1], 10) + 1
        tenantCode = `tenant-${num.toString().padStart(3, '0')}`
      }
    }

    const schemaName = tenantCode.replace(/-/g, '_')
    console.log('📝 租户代码:', tenantCode, 'Schema:', schemaName)

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
      return new Response(
        JSON.stringify({
          success: false,
          error: tenantError?.message || '创建租户记录失败'
        }),
        {
          status: 500,
          headers: {...corsHeaders, 'Content-Type': 'application/json'}
        }
      )
    }

    console.log('✅ 租户记录创建成功:', tenant.id)

    // 3. 克隆模板租户的 Schema 结构
    console.log('📋 开始克隆模板租户 Schema 结构')
    
    // 检查是否存在模板租户
    const {data: templateCheck} = await supabase.rpc('get_template_schema_name')
    
    if (!templateCheck) {
      // 如果没有模板租户（第一个租户），使用默认创建方式
      console.log('ℹ️ 这是第一个租户，使用默认 Schema 创建方式')
      const {data: schemaResult, error: schemaError} = await supabase.rpc('create_tenant_schema', {
        p_schema_name: schemaName
      })

      if (schemaError || !schemaResult?.success) {
        console.error('❌ 创建 Schema 失败:', schemaError || schemaResult?.error)
        
        // 回滚：删除租户记录
        await supabase.from('tenants').delete().eq('id', tenant.id)
        
        return new Response(
          JSON.stringify({
            success: false,
            error: schemaResult?.error || schemaError?.message || '创建 Schema 失败'
          }),
          {
            status: 500,
            headers: {...corsHeaders, 'Content-Type': 'application/json'}
          }
        )
      }
      
      console.log('✅ 第一个租户 Schema 创建成功')
    } else {
      // 如果存在模板租户，必须克隆成功，不能降级
      console.log('📋 检测到模板租户，开始克隆 Schema 结构')
      const {data: cloneResult, error: cloneError} = await supabase.rpc('clone_tenant_schema_from_template', {
        p_new_schema_name: schemaName
      })

      if (cloneError || !cloneResult?.success) {
        console.error('❌ 克隆 Schema 失败:', cloneError || cloneResult?.message)
        
        // 回滚：删除租户记录
        await supabase.from('tenants').delete().eq('id', tenant.id)
        
        return new Response(
          JSON.stringify({
            success: false,
            error: '克隆模板租户架构失败: ' + (cloneResult?.message || cloneError?.message || '未知错误')
          }),
          {
            status: 500,
            headers: {...corsHeaders, 'Content-Type': 'application/json'}
          }
        )
      }
      
      console.log('✅ Schema 克隆成功:', cloneResult)
    }

    // 4. 创建老板账号
    // 如果提供了账号名，将其作为 email（格式：account@fleet.local）
    const accountEmail = input.boss_account ? `${input.boss_account}@fleet.local` : input.boss_email
    
    const {data: authData, error: authError} = await supabase.auth.admin.createUser({
      phone: input.boss_phone,
      email: accountEmail,
      password: input.boss_password,
      phone_confirm: true,
      email_confirm: true,
      user_metadata: {
        name: input.boss_name,
        account: input.boss_account || input.boss_phone, // 登录账号，默认使用手机号
        role: 'boss', // 老板角色
        tenant_id: tenant.id,
        schema_name: schemaName
      }
    })

    if (authError || !authData.user) {
      console.error('❌ 创建老板账号失败:', authError)
      
      // 回滚
      await supabase.rpc('delete_tenant_schema', {p_schema_name: schemaName})
      await supabase.from('tenants').delete().eq('id', tenant.id)
      
      return new Response(
        JSON.stringify({
          success: false,
          error: authError?.message || '创建老板账号失败'
        }),
        {
          status: 500,
          headers: {...corsHeaders, 'Content-Type': 'application/json'}
        }
      )
    }

    console.log('✅ 老板账号创建成功:', authData.user.id)

    // 5. 在租户 Schema 中创建老板 profile
    const {data: profileResult, error: profileError} = await supabase.rpc('insert_tenant_profile', {
      p_schema_name: schemaName,
      p_user_id: authData.user.id,
      p_name: input.boss_name,
      p_phone: input.boss_phone,
      p_email: input.boss_email || null,
      p_role: 'boss' // 老板角色
    })

    if (profileError || !profileResult?.success) {
      console.error('❌ 创建老板 profile 失败:', profileError || profileResult?.error)
      
      // 回滚
      await supabase.auth.admin.deleteUser(authData.user.id)
      await supabase.rpc('delete_tenant_schema', {p_schema_name: schemaName})
      await supabase.from('tenants').delete().eq('id', tenant.id)
      
      return new Response(
        JSON.stringify({
          success: false,
          error: profileResult?.error || profileError?.message || '创建老板 profile 失败'
        }),
        {
          status: 500,
          headers: {...corsHeaders, 'Content-Type': 'application/json'}
        }
      )
    }

    console.log('✅ 老板 profile 创建成功')

    // 6. 创建默认仓库
    console.log('📦 开始创建默认仓库')
    const {data: warehouseResult, error: warehouseError} = await supabase.rpc('insert_tenant_warehouse', {
      p_schema_name: schemaName,
      p_warehouse_name: '默认仓库',
      p_max_leave_days: 7,
      p_resignation_notice_days: 30
    })

    if (warehouseError || !warehouseResult?.success) {
      console.error('❌ 创建默认仓库失败:', warehouseError || warehouseResult?.error)
      
      // 回滚
      await supabase.auth.admin.deleteUser(authData.user.id)
      await supabase.rpc('delete_tenant_schema', {p_schema_name: schemaName})
      await supabase.from('tenants').delete().eq('id', tenant.id)
      
      return new Response(
        JSON.stringify({
          success: false,
          error: warehouseResult?.error || warehouseError?.message || '创建默认仓库失败'
        }),
        {
          status: 500,
          headers: {...corsHeaders, 'Content-Type': 'application/json'}
        }
      )
    }

    console.log('✅ 默认仓库创建成功')

    // 7. 更新租户记录
    const {data: updatedTenant} = await supabase
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

    console.log('✅ 租户创建完成！')

    return new Response(
      JSON.stringify({
        success: true,
        tenant: updatedTenant || tenant,
        message: '租户创建成功'
      }),
      {
        status: 200,
        headers: {...corsHeaders, 'Content-Type': 'application/json'}
      }
    )
  } catch (error) {
    console.error('❌ 创建租户异常:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : '创建租户失败'
      }),
      {
        status: 500,
        headers: {...corsHeaders, 'Content-Type': 'application/json'}
      }
    )
  }
})
