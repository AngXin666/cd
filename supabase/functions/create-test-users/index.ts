import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 删除现有的测试用户
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    if (existingUsers?.users) {
      for (const user of existingUsers.users) {
        await supabaseAdmin.auth.admin.deleteUser(user.id)
      }
    }

    // 创建测试用户
    const testUsers = [
      {
        email: 'admin@fleet.com',
        password: '123456',
        phone: 'admin',
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { name: '管理员', role: 'super_admin' }
      },
      {
        email: 'admin1@fleet.com',
        password: '123456',
        phone: 'admin1',
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { name: '管理员1', role: 'manager' }
      },
      {
        email: 'admin2@fleet.com',
        password: '123456',
        phone: 'admin2',
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { name: '司机', role: 'driver' }
      },
      {
        email: '13800000001@fleet.com',
        password: '123456',
        phone: '13800000001',
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { name: '管理员', role: 'super_admin' }
      },
      {
        email: '13800000002@fleet.com',
        password: '123456',
        phone: '13800000002',
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { name: '管理员1', role: 'manager' }
      },
      {
        email: '13800000003@fleet.com',
        password: '123456',
        phone: '13800000003',
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { name: '司机', role: 'driver' }
      }
    ]

    const createdUsers = []
    for (const userData of testUsers) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
        email_confirm: userData.email_confirm,
        phone_confirm: userData.phone_confirm,
        user_metadata: userData.user_metadata
      })

      if (error) {
        console.error(`创建用户失败 ${userData.email}:`, error)
      } else {
        createdUsers.push(data.user)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `成功创建 ${createdUsers.length} 个用户`,
        users: createdUsers.map(u => ({ id: u.id, email: u.email, phone: u.phone }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
