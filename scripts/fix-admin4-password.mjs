import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fnzaxqcpzpjqfuqkwdjf.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuemF4cWNwenBqcWZ1cWt3ZGpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzQ3MjI4OCwiZXhwIjoyMDQ5MDQ4Mjg4fQ.d3WjkVaLlFhFE5pCfVWcz_VN1hVpW09p_xZXYPNMMEc'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function fixAdmin4Password() {
  try {
    // 1. 查找admin4用户
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) throw listError
    
    const admin4User = users.find(u => u.phone === '13800000004' || u.email?.includes('admin4'))
    
    if (!admin4User) {
      console.log('❌ 未找到admin4用户')
      return
    }
    
    console.log('✅ 找到用户:', admin4User.id)
    
    // 2. 更新email和密码
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      admin4User.id,
      {
        email: '13800000004@phone.local',
        password: '123456',
        email_confirm: true,
        phone_confirm: true
      }
    )
    
    if (updateError) throw updateError
    
    console.log('✅ 密码已修改为: 123456')
    console.log('✅ Email已更新为: 13800000004@phone.local')
    console.log('✅ 可使用 admin4 + 123456 登录')
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message)
    process.exit(1)
  }
}

fixAdmin4Password()
