import {createClient} from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

Deno.serve(async req => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', {headers: corsHeaders})
  }

  try {
    // 创建 Supabase 客户端（使用 service_role key）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 验证请求
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({success: false, error: '未授权'}),
        {
          status: 401,
          headers: {...corsHeaders, 'Content-Type': 'application/json'}
        }
      )
    }

    // 验证用户是否是系统管理员
    const token = authHeader.replace('Bearer ', '')
    const {
      data: {user},
      error: authError
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({success: false, error: '认证失败'}),
        {
          status: 401,
          headers: {...corsHeaders, 'Content-Type': 'application/json'}
        }
      )
    }

    // 检查是否是系统管理员
    const {data: adminData, error: adminError} = await supabase
      .from('system_admins')
      .select('id')
      .eq('id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (adminError || !adminData) {
      return new Response(
        JSON.stringify({success: false, error: '权限不足'}),
        {
          status: 403,
          headers: {...corsHeaders, 'Content-Type': 'application/json'}
        }
      )
    }

    // 解析请求体
    const {tenantId} = await req.json()

    if (!tenantId) {
      return new Response(
        JSON.stringify({success: false, error: '缺少租户 ID'}),
        {
          status: 400,
          headers: {...corsHeaders, 'Content-Type': 'application/json'}
        }
      )
    }

    console.log('🗑️ 开始删除租户:', tenantId)

    // 使用新的 RPC 函数完整删除租户
    const {data: deleteResult, error: deleteError} = await supabase.rpc('delete_tenant_completely', {
      p_tenant_id: tenantId
    })

    if (deleteError) {
      console.error('❌ 删除租户失败:', deleteError)
      return new Response(
        JSON.stringify({
          success: false,
          error: '删除租户失败: ' + deleteError.message
        }),
        {
          status: 500,
          headers: {...corsHeaders, 'Content-Type': 'application/json'}
        }
      )
    }

    if (!deleteResult || !deleteResult.success) {
      console.error('❌ 删除租户失败:', deleteResult?.error)
      return new Response(
        JSON.stringify({
          success: false,
          error: deleteResult?.error || '删除租户失败'
        }),
        {
          status: 500,
          headers: {...corsHeaders, 'Content-Type': 'application/json'}
        }
      )
    }

    console.log('✅ 租户删除成功:', deleteResult)

    return new Response(
      JSON.stringify({
        success: true,
        message: deleteResult.message,
        deletedUsers: deleteResult.deleted_users,
        deletedSchema: deleteResult.deleted_schema,
        tenantCode: deleteResult.tenant_code,
        companyName: deleteResult.company_name
      }),
      {
        status: 200,
        headers: {...corsHeaders, 'Content-Type': 'application/json'}
      }
    )
  } catch (error) {
    console.error('❌ 删除租户失败:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || '删除租户失败'
      }),
      {
        status: 500,
        headers: {...corsHeaders, 'Content-Type': 'application/json'}
      }
    )
  }
})
