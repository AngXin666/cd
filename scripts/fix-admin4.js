#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fnzaxqcpzpjqfuqkwdjf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuemF4cWNwenBqcWZ1cWt3ZGpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzQ3MjI4OCwiZXhwIjoyMDQ5MDQ4Mjg4fQ.d3WjkVaLlFhFE5pCfVWcz_VN1hVpW09p_xZXYPNMMEc'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixAdmin4() {
  console.log('🔧 开始修复admin4账号...')
  
  // 使用RPC调用执行SQL
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      UPDATE auth.users 
      SET email = '13800000004@phone.local',
          encrypted_password = crypt('admin123', gen_salt('bf')),
          updated_at = NOW()
      WHERE phone = '13800000004';
      
      SELECT email, phone FROM auth.users WHERE phone = '13800000004';
    `
  })
  
  if (error) {
    console.error('❌ 修复失败:', error.message)
    // 尝试直接更新
    console.log('🔄 尝试直接查询更新...')
    
    const { data: users } = await supabase.auth.admin.listUsers()
    const admin4User = users.users.find(u => u.phone === '13800000004')
    
    if (admin4User) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        admin4User.id,
        {
          email: '13800000004@phone.local',
          password: 'admin123'
        }
      )
      
      if (updateError) {
        console.error('❌ 更新失败:', updateError.message)
      } else {
        console.log('✅ 密码已重置')
        console.log('📧 Email已更新为: 13800000004@phone.local')
        console.log('🔑 密码: admin123')
      }
    } else {
      console.error('❌ 未找到admin4用户')
    }
  } else {
    console.log('✅ 修复成功')
    console.log('结果:', data)
  }
}

fixAdmin4().catch(console.error)
