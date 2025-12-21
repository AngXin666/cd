/**
 * 获取测试用户信息
 * 从数据库查询司机角色的用户
 */
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function getTestUser() {
  try {
    // 先查询所有用户看看角色值
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name, role, phone')
      .limit(10)

    if (error) {
      console.error('查询失败:', error)
      return
    }

    console.log('用户列表:')
    console.log(JSON.stringify(users, null, 2))

    // 也查询 auth.users 表获取登录信息
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('查询 auth 用户失败:', authError)
    } else {
      console.log('\n认证用户列表 (前10个):')
      const first10 = authUsers.users.slice(0, 10)
      first10.forEach(u => {
        console.log(`- ${u.email} (ID: ${u.id})`)
      })
    }

  } catch (err) {
    console.error('错误:', err)
  }
}

getTestUser()
