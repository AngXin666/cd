/**
 * 调试权限流程
 * 模拟前端 loadManagerPermissions 函数的完整流程
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
const supabaseKey = process.env.TARO_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugPermissionFlow() {
  console.log('========================================')
  console.log('  调试权限流程')
  console.log('========================================\n')

  // 1. 查询车队长用户
  console.log('1️⃣ 查询 MANAGER 用户（模拟 getUserWithRole）...')
  const { data: manager, error: managerError } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'MANAGER')
    .maybeSingle()

  if (managerError) {
    console.error('❌ 查询失败:', managerError.message)
    return
  }

  if (!manager) {
    console.log('⚠️ 没有找到 MANAGER 用户')
    return
  }

  console.log('✅ 查询结果:')
  console.log(`   - id: ${manager.id}`)
  console.log(`   - name: ${manager.name}`)
  console.log(`   - role: ${manager.role}`)
  console.log(`   - manager_permissions_enabled: ${manager.manager_permissions_enabled}`)
  console.log(`   - typeof: ${typeof manager.manager_permissions_enabled}`)
  console.log('')

  // 2. 模拟 convertUserToProfile 函数
  console.log('2️⃣ 模拟 convertUserToProfile 转换...')
  const profile = {
    id: manager.id,
    phone: manager.phone,
    email: manager.email,
    name: manager.name,
    role: manager.role || 'DRIVER',
    avatar_url: manager.avatar_url,
    driver_type: manager.driver_type || null,
    created_at: manager.created_at,
    updated_at: manager.updated_at,
    manager_permissions_enabled: manager.manager_permissions_enabled
  }

  console.log('✅ 转换后的 profile:')
  console.log(`   - manager_permissions_enabled: ${profile.manager_permissions_enabled}`)
  console.log(`   - typeof: ${typeof profile.manager_permissions_enabled}`)
  console.log('')

  // 3. 模拟 loadManagerPermissions 中的权限计算（修改前）
  console.log('3️⃣ 模拟权限计算（修改前的逻辑）...')
  const enabledOld = profile.manager_permissions_enabled !== false
  console.log(`   - 计算公式: manager_permissions_enabled !== false`)
  console.log(`   - 结果: ${enabledOld}`)
  console.log('')

  // 4. 模拟 loadManagerPermissions 中的权限计算（修改后）
  console.log('4️⃣ 模拟权限计算（修改后的逻辑）...')
  let enabledNew = false
  if (profile.role === 'BOSS') {
    enabledNew = true
    console.log(`   - BOSS 角色，始终有完整权限`)
  } else if (profile.role === 'MANAGER' || profile.role === 'PEER_ADMIN') {
    enabledNew = profile.manager_permissions_enabled !== false
    console.log(`   - ${profile.role} 角色，根据 manager_permissions_enabled 判断`)
  } else {
    console.log(`   - ${profile.role} 角色，没有管理权限`)
  }
  console.log(`   - 结果: ${enabledNew}`)
  console.log('')

  // 5. 检查字段是否存在于返回数据中
  console.log('5️⃣ 检查返回数据中的所有字段...')
  const fields = Object.keys(manager)
  console.log(`   - 字段数量: ${fields.length}`)
  console.log(`   - 包含 manager_permissions_enabled: ${fields.includes('manager_permissions_enabled')}`)
  console.log('')

  // 6. 总结
  console.log('========================================')
  console.log('  总结')
  console.log('========================================')
  console.log(`用户: ${manager.name}`)
  console.log(`角色: ${manager.role}`)
  console.log(`数据库中 manager_permissions_enabled: ${manager.manager_permissions_enabled}`)
  console.log(`修改前权限计算结果: ${enabledOld}`)
  console.log(`修改后权限计算结果: ${enabledNew}`)
  
  if (manager.manager_permissions_enabled === false && enabledOld === true) {
    console.log('')
    console.log('⚠️ 发现问题：数据库中权限为 false，但旧逻辑计算结果为 true')
    console.log('   这可能是因为 manager_permissions_enabled 的值不是布尔类型的 false')
  }
  
  if (manager.manager_permissions_enabled === false && enabledNew === false) {
    console.log('')
    console.log('✅ 修改后的逻辑正确：权限为 false 时，计算结果也为 false')
  }
}

debugPermissionFlow().catch(console.error)
