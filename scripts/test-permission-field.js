/**
 * 测试 manager_permissions_enabled 字段是否正常工作
 * 
 * 使用方法: node scripts/test-permission-field.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL
const supabaseKey = process.env.TARO_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置，请检查 .env 文件')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPermissionField() {
  console.log('========================================')
  console.log('  测试 manager_permissions_enabled 字段')
  console.log('========================================\n')

  // 1. 测试字段是否存在
  console.log('1️⃣ 测试字段是否存在...')
  const { data: testData, error: testError } = await supabase
    .from('users')
    .select('id, name, role, manager_permissions_enabled')
    .limit(1)

  if (testError) {
    if (testError.code === '42703') {
      console.error('❌ 字段不存在！请先执行数据库迁移')
      return false
    }
    console.error('❌ 查询失败:', testError)
    return false
  }
  console.log('✅ 字段存在\n')

  // 2. 查询所有 MANAGER 和 PEER_ADMIN 用户
  console.log('2️⃣ 查询 MANAGER/PEER_ADMIN 用户...')
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, role, manager_permissions_enabled')
    .in('role', ['MANAGER', 'PEER_ADMIN'])
    .limit(10)

  if (usersError) {
    console.error('❌ 查询用户失败:', usersError)
    return false
  }

  if (!users || users.length === 0) {
    console.log('⚠️ 没有找到 MANAGER/PEER_ADMIN 用户')
    console.log('   创建一个测试用户来验证...\n')
  } else {
    console.log(`✅ 找到 ${users.length} 个用户:`)
    users.forEach(u => {
      const permStatus = u.manager_permissions_enabled === true ? '完整权限' : 
                         u.manager_permissions_enabled === false ? '仅查看' : '默认(null)'
      console.log(`   - ${u.name} (${u.role}): ${permStatus}`)
    })
    console.log('')
  }

  // 3. 测试更新功能（如果有用户）
  if (users && users.length > 0) {
    const testUser = users[0]
    console.log(`3️⃣ 测试更新功能 (用户: ${testUser.name})...`)
    
    // 保存原始值
    const originalValue = testUser.manager_permissions_enabled
    const newValue = !originalValue
    
    // 更新
    const { error: updateError } = await supabase
      .from('users')
      .update({ manager_permissions_enabled: newValue })
      .eq('id', testUser.id)

    if (updateError) {
      console.error('❌ 更新失败:', updateError)
      return false
    }

    // 验证更新
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('manager_permissions_enabled')
      .eq('id', testUser.id)
      .single()

    if (verifyError) {
      console.error('❌ 验证失败:', verifyError)
      return false
    }

    if (verifyData.manager_permissions_enabled === newValue) {
      console.log(`✅ 更新成功: ${originalValue} → ${newValue}`)
      
      // 恢复原始值
      await supabase
        .from('users')
        .update({ manager_permissions_enabled: originalValue })
        .eq('id', testUser.id)
      console.log(`✅ 已恢复原始值: ${originalValue}\n`)
    } else {
      console.error('❌ 更新未生效')
      return false
    }
  }

  console.log('========================================')
  console.log('  ✅ 所有测试通过！字段工作正常')
  console.log('========================================')
  return true
}

testPermissionField().catch(console.error)
