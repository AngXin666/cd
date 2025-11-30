const {createClient} = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.TARO_APP_SUPABASE_URL,
  process.env.TARO_APP_SUPABASE_ANON_KEY
)

async function testWarehouseAssignment() {
  console.log('\n=== 测试仓库分配 ===\n')

  // 1. 查询所有用户
  console.log('1. 查询所有用户:')
  const {data: users, error: usersError} = await supabase
    .from('users')
    .select('id, name, phone, role')
    .order('name')

  if (usersError) {
    console.error('查询用户失败:', usersError)
    return
  }

  console.log('用户列表:')
  users.forEach(user => {
    console.log(`  - ${user.name} (${user.role}): ${user.id}`)
  })

  // 2. 查询所有仓库
  console.log('\n2. 查询所有仓库:')
  const {data: warehouses, error: warehousesError} = await supabase
    .from('warehouses')
    .select('id, name')
    .order('name')

  if (warehousesError) {
    console.error('查询仓库失败:', warehousesError)
    return
  }

  console.log('仓库列表:')
  warehouses.forEach(warehouse => {
    console.log(`  - ${warehouse.name}: ${warehouse.id}`)
  })

  // 3. 查询所有管理员-仓库关联
  console.log('\n3. 查询所有管理员-仓库关联:')
  const {data: assignments, error: assignmentsError} = await supabase
    .from('manager_warehouses')
    .select('*')

  if (assignmentsError) {
    console.error('查询关联失败:', assignmentsError)
    return
  }

  console.log(`找到 ${assignments.length} 条关联记录:`)
  for (const assignment of assignments) {
    // 查找用户名
    const user = users.find(u => u.id === assignment.manager_id)
    const warehouse = warehouses.find(w => w.id === assignment.warehouse_id)
    console.log(`  - ${user?.name || assignment.manager_id} -> ${warehouse?.name || assignment.warehouse_id}`)
  }

  // 4. 查询车队长（MANAGER 角色）
  console.log('\n4. 查询车队长的仓库分配:')
  const managers = users.filter(u => u.role === 'MANAGER')
  
  for (const manager of managers) {
    console.log(`\n  车队长: ${manager.name} (${manager.id})`)
    
    // 查询该车队长的仓库
    const {data: managerWarehouses, error: mwError} = await supabase
      .from('manager_warehouses')
      .select('warehouse_id')
      .eq('manager_id', manager.id)

    if (mwError) {
      console.error(`    查询失败:`, mwError)
      continue
    }

    if (managerWarehouses.length === 0) {
      console.log('    ❌ 暂未分配仓库')
    } else {
      console.log(`    ✅ 已分配 ${managerWarehouses.length} 个仓库:`)
      for (const mw of managerWarehouses) {
        const warehouse = warehouses.find(w => w.id === mw.warehouse_id)
        console.log(`      - ${warehouse?.name || mw.warehouse_id}`)
      }
    }
  }

  console.log('\n=== 测试完成 ===\n')
}

testWarehouseAssignment().catch(console.error)
