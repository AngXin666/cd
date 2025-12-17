/**
 * 测试 getCurrentUserWithRealName 函数返回的数据
 * 验证 manager_permissions_enabled 字段是否正确传递
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.TARO_APP_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.TARO_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testGetUserWithRole() {
  console.log('========================================')
  console.log('  测试 getUserWithRole 数据传递')
  console.log('========================================\n')

  // 1. 查询车队长用户
  console.log('1️⃣ 查询 MANAGER 用户...')
  const { data: managers, error: managerError } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'MANAGER')

  if (managerError) {
    console.error('❌ 查询失败:', managerError.message)
    return
  }

  if (!managers || managers.length === 0) {
    console.log('⚠️ 没有找到 MANAGER 用户')
    return
  }

  console.log(`✅ 找到 ${managers.length} 个 MANAGER 用户\n`)

  // 2. 检查每个用户的字段
  console.log('2️⃣ 检查用户数据字段...\n')
  
  for (const user of managers) {
    console.log(`用户: ${user.name} (${user.id})`)
    console.log(`  - role: ${user.role}`)
    console.log(`  - manager_permissions_enabled: ${user.manager_permissions_enabled}`)
    console.log(`  - typeof manager_permissions_enabled: ${typeof user.manager_permissions_enabled}`)
    console.log(`  - manager_permissions_enabled !== false: ${user.manager_permissions_enabled !== false}`)
    console.log(`  - 所有字段:`, Object.keys(user).join(', '))
    console.log('')
  }

  // 3. 模拟 convertUserToProfile 函数
  console.log('3️⃣ 模拟 convertUserToProfile 转换...\n')
  
  for (const user of managers) {
    // 模拟 convertUserToProfile 函数的逻辑
    const profile = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      role: user.role || 'DRIVER',
      avatar_url: user.avatar_url,
      driver_type: user.driver_type || null,
      created_at: user.created_at,
      updated_at: user.updated_at,
      manager_permissions_enabled: user.manager_permissions_enabled
    }

    console.log(`用户: ${user.name}`)
    console.log(`  转换前 manager_permissions_enabled: ${user.manager_permissions_enabled}`)
    console.log(`  转换后 manager_permissions_enabled: ${profile.manager_permissions_enabled}`)
    console.log(`  权限计算 (enabled !== false): ${profile.manager_permissions_enabled !== false}`)
    console.log('')
  }

  // 4. 检查数据库中的原始值
  console.log('4️⃣ 直接查询数据库原始值...\n')
  
  const { data: rawData, error: rawError } = await supabase
    .from('users')
    .select('id, name, role, manager_permissions_enabled')
    .eq('role', 'MANAGER')

  if (rawError) {
    console.error('❌ 查询失败:', rawError.message)
    return
  }

  console.log('原始数据库值:')
  console.log(JSON.stringify(rawData, null, 2))

  console.log('\n========================================')
  console.log('  测试完成')
  console.log('========================================')
}

testGetUserWithRole().catch(console.error)
