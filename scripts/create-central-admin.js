/**
 * 创建中央管理系统管理员账号
 * 账号：admin (使用手机号 13800000001)
 * 密码：hye19911206
 */

const {createClient} = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.TARO_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createCentralAdmin() {
  try {
    console.log('🚀 开始创建中央管理系统管理员账号...')

    // 1. 创建 auth.users 账号
    const {data: authData, error: authError} = await supabase.auth.admin.createUser({
      phone: '13800000001',
      password: 'hye19911206',
      phone_confirm: true,
      user_metadata: {
        name: '中央管理员',
        role: 'central_admin'
      }
    })

    if (authError) {
      console.error('❌ 创建账号失败:', authError.message)
      process.exit(1)
    }

    console.log('✅ Auth 账号创建成功:', authData.user.id)

    // 2. 添加到 system_admins 表
    const {error: adminError} = await supabase
      .from('system_admins')
      .insert({
        id: authData.user.id,
        name: '中央管理员',
        email: 'central-admin@system.local',
        phone: '13800000001',
        status: 'active'
      })

    if (adminError) {
      console.error('❌ 添加到 system_admins 表失败:', adminError.message)
      // 回滚：删除 auth 账号
      await supabase.auth.admin.deleteUser(authData.user.id)
      process.exit(1)
    }

    console.log('✅ 添加到 system_admins 表成功')

    console.log('\n🎉 中央管理系统管理员账号创建成功！')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📱 手机号：13800000001')
    console.log('🔑 密码：hye19911206')
    console.log('👤 用户ID：', authData.user.id)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n💡 使用此账号登录后，将自动跳转到中央管理系统（租户管理页面）')

  } catch (error) {
    console.error('❌ 创建失败:', error)
    process.exit(1)
  }
}

createCentralAdmin()
