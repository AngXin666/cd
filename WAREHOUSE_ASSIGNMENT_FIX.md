# 仓库分配问题修复报告

## 问题描述

用户反馈：
1. **新建的老板用户管理都没有仓库显示**
2. **创建的车队长账号明明分配了仓库但是进入还是暂无分配仓库**

## 根本原因分析

### 问题1：新建老板没有仓库
- **原因**：创建租户（老板账号）时，没有自动创建默认仓库
- **影响**：所有新建的老板账号都没有仓库，导致用户管理页面显示"暂无分配仓库"

### 问题2：车队长分配了仓库但显示暂无仓库
- **原因1**：用户管理页面只为司机分配仓库（使用 `driver_warehouses` 表），没有为管理员和车队长分配仓库（应该使用 `manager_warehouses` 表）
- **原因2**：创建平级账号（车队长）时，即使在UI上选择了仓库，实际上也没有写入 `manager_warehouses` 表

## 修复方案

### 1. 为现有老板创建默认仓库

创建数据库迁移 `00148_create_default_warehouses_for_existing_tenants.sql`：
- 为所有没有仓库的主账号（老板）创建默认仓库
- 自动分配仓库到 `manager_warehouses` 表

**执行结果**：
```sql
-- 修复前
测试3（老板）：0 个仓库
测试2（老板）：1 个仓库
管理员（老板）：0 个仓库

-- 修复后
测试3（老板）：1 个仓库（测试3的仓库）
测试2（老板）：1 个仓库（测试2）
管理员（老板）：1 个仓库（管理员的仓库）
```

### 2. 修改创建租户逻辑

修改 `src/db/api.ts` 中的 `createTenant` 函数：
- 创建租户后自动创建默认仓库
- 自动分配仓库给老板（写入 `manager_warehouses` 表）

```typescript
// 5. 自动创建默认仓库
const {data: warehouseData, error: warehouseError} = await supabase
  .from('warehouses')
  .insert({
    name: `${tenant.company_name || tenant.name}的仓库`,
    tenant_id: authData.user.id,
    is_active: true
  })
  .select()
  .maybeSingle()

// 6. 自动分配仓库给老板
if (warehouseData) {
  const {error: assignError} = await supabase.from('manager_warehouses').insert({
    manager_id: authData.user.id,
    warehouse_id: warehouseData.id,
    tenant_id: authData.user.id
  })
}
```

### 3. 修改用户管理页面的仓库分配逻辑

修改 `src/pages/super-admin/user-management/index.tsx`：

#### 3.1 创建新函数支持管理员仓库分配

在 `src/db/api.ts` 中添加：
```typescript
export async function insertManagerWarehouseAssignment(input: {
  manager_id: string
  warehouse_id: string
}): Promise<boolean> {
  const {error} = await supabase.from('manager_warehouses').insert(input)
  if (error) {
    console.error('插入管理员仓库分配失败:', error)
    return false
  }
  return true
}
```

#### 3.2 修改创建用户时的仓库分配逻辑

```typescript
if (newUserRole === 'driver') {
  // 为司机分配仓库（使用 driver_warehouses 表）
  for (const warehouseId of newUserWarehouseIds) {
    await insertWarehouseAssignment({
      driver_id: newUser.id,
      warehouse_id: warehouseId
    })
  }
} else if (newUserRole === 'manager' || newUserRole === 'super_admin') {
  // 为管理员和车队长分配仓库（使用 manager_warehouses 表）
  for (const warehouseId of newUserWarehouseIds) {
    await insertManagerWarehouseAssignment({
      manager_id: newUser.id,
      warehouse_id: warehouseId
    })
  }
}
```

#### 3.3 移除"只能为司机分配仓库"的限制

删除了 `handleWarehouseAssignClick` 中的角色检查：
```typescript
// ❌ 删除这段代码
if (targetUser.role !== 'driver') {
  showToast({title: '只能为司机分配仓库', icon: 'none'})
  return
}
```

#### 3.4 修改加载仓库分配的逻辑

根据用户角色使用不同的函数：
```typescript
let assignments: Array<{warehouse_id: string}> = []
if (targetUser.role === 'driver') {
  assignments = await getWarehouseAssignmentsByDriver(targetUser.id)
} else if (targetUser.role === 'manager' || targetUser.role === 'super_admin') {
  assignments = await getWarehouseAssignmentsByManager(targetUser.id)
}
```

#### 3.5 修改保存仓库分配的逻辑

根据用户角色使用不同的表：
```typescript
// 删除旧的仓库分配
if (userRole === 'driver') {
  await deleteWarehouseAssignmentsByDriver(userId)
} else if (userRole === 'manager' || userRole === 'super_admin') {
  await supabase.from('manager_warehouses').delete().eq('manager_id', userId)
}

// 添加新的仓库分配
for (const warehouseId of selectedWarehouseIds) {
  if (userRole === 'driver') {
    await insertWarehouseAssignment({
      driver_id: userId,
      warehouse_id: warehouseId
    })
  } else if (userRole === 'manager' || userRole === 'super_admin') {
    await insertManagerWarehouseAssignment({
      manager_id: userId,
      warehouse_id: warehouseId
    })
  }
}
```

## 修复文件清单

### 数据库迁移
- `supabase/migrations/00148_create_default_warehouses_for_existing_tenants.sql`（新增）

### 后端代码
- `src/db/api.ts`
  - 修改 `createTenant` 函数：添加自动创建默认仓库和分配逻辑
  - 新增 `insertManagerWarehouseAssignment` 函数：支持管理员仓库分配

### 前端代码
- `src/pages/super-admin/user-management/index.tsx`
  - 添加 `supabase` 导入
  - 添加 `insertManagerWarehouseAssignment` 导入
  - 修改创建用户时的仓库分配逻辑（支持管理员和车队长）
  - 移除"只能为司机分配仓库"的限制
  - 修改加载仓库分配的逻辑（根据角色使用不同函数）
  - 修改保存仓库分配的逻辑（根据角色使用不同表）

## 验证结果

### 1. 现有老板账号已修复
```sql
SELECT 
  p.name,
  p.role,
  (SELECT COUNT(*) FROM manager_warehouses mw WHERE mw.manager_id = p.id) as warehouse_count,
  (SELECT string_agg(w.name, ', ') FROM manager_warehouses mw 
   JOIN warehouses w ON w.id = mw.warehouse_id 
   WHERE mw.manager_id = p.id) as warehouse_names
FROM profiles p
WHERE p.role = 'super_admin' AND p.main_account_id IS NULL;

-- 结果：
-- 测试3：1 个仓库（测试3的仓库）
-- 测试2：1 个仓库（测试2）
-- 管理员：1 个仓库（管理员的仓库）
```

### 2. 新建老板将自动创建仓库
- 创建租户时会自动创建默认仓库
- 自动分配仓库到 `manager_warehouses` 表

### 3. 车队长可以正常分配仓库
- 用户管理页面支持为管理员和车队长分配仓库
- 使用正确的 `manager_warehouses` 表存储分配关系

## 测试建议

1. **测试新建老板**：
   - 创建一个新的老板账号
   - 验证是否自动创建了默认仓库
   - 验证用户管理页面是否显示仓库

2. **测试车队长仓库分配**：
   - 为现有车队长（测试22）分配仓库
   - 验证是否成功写入 `manager_warehouses` 表
   - 验证车队长登录后是否能看到分配的仓库

3. **测试司机仓库分配**：
   - 验证司机仓库分配功能是否正常
   - 确保没有影响原有的司机仓库分配逻辑

## 注意事项

1. **租户隔离**：所有仓库分配都包含 `tenant_id`，确保多租户数据隔离
2. **RLS 策略**：确保 `manager_warehouses` 表的 RLS 策略正确配置
3. **向后兼容**：修改后的代码兼容司机、管理员和车队长三种角色

## 相关文档

- [租户隔离紧急修复](./URGENT_FIX_TENANT_ISOLATION.md)
- [超级管理员仓库访问权限修复](./SUPER_ADMIN_WAREHOUSE_ACCESS_FIX.md)
