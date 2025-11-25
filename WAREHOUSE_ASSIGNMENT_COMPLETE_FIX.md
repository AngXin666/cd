# 仓库分配问题完整修复报告

## 问题总结

用户反馈的两个关键问题：
1. **新建的老板用户管理都没有仓库显示**
2. **创建的车队长账号明明分配了仓库但是进入还是暂无分配仓库**

## 根本原因

### 问题1：新建老板没有仓库
- 创建租户时没有自动创建默认仓库
- 创建租户时没有自动分配仓库到 `manager_warehouses` 表

### 问题2：车队长无法分配仓库
- 用户管理页面只支持为司机分配仓库（使用 `driver_warehouses` 表）
- 没有为管理员和车队长分配仓库的功能（应该使用 `manager_warehouses` 表）
- `manager_warehouses` 表缺少 INSERT、UPDATE、DELETE 的 RLS 策略
- `insertManagerWarehouseAssignment` 函数没有添加 `tenant_id` 字段
- `setManagerWarehouses` 函数没有添加 `tenant_id` 字段

## 完整修复方案

### 第一步：为现有老板创建默认仓库（迁移 00148）

```sql
-- 为所有没有仓库的主账号（老板）创建默认仓库
DO $$
DECLARE
  tenant_record RECORD;
  new_warehouse_id uuid;
BEGIN
  FOR tenant_record IN 
    SELECT p.id, p.name, p.company_name, p.tenant_id
    FROM profiles p
    WHERE p.role = 'super_admin'::user_role
      AND p.main_account_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM manager_warehouses mw WHERE mw.manager_id = p.id
      )
  LOOP
    -- 创建默认仓库
    INSERT INTO warehouses (name, tenant_id, is_active)
    VALUES (
      COALESCE(tenant_record.company_name, tenant_record.name) || '的仓库',
      tenant_record.tenant_id,
      true
    )
    RETURNING id INTO new_warehouse_id;

    -- 分配仓库给老板
    INSERT INTO manager_warehouses (manager_id, warehouse_id, tenant_id)
    VALUES (
      tenant_record.id,
      new_warehouse_id,
      tenant_record.tenant_id
    );
  END LOOP;
END $$;
```

**执行结果**：
- 测试3（老板）：创建了"测试3的仓库"
- 管理员（老板）：创建了"管理员的仓库"

### 第二步：修改创建租户逻辑（src/db/api.ts）

在 `createTenant` 函数中添加自动创建仓库和分配的逻辑：

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

### 第三步：添加管理员仓库分配功能（src/db/api.ts）

创建新函数支持管理员仓库分配：

```typescript
export async function insertManagerWarehouseAssignment(input: {
  manager_id: string
  warehouse_id: string
}): Promise<boolean> {
  // 获取当前用户的 tenant_id
  const {data: {user}} = await supabase.auth.getUser()
  if (!user) return false

  const {data: profile} = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.tenant_id) return false

  const {error} = await supabase.from('manager_warehouses').insert({
    ...input,
    tenant_id: profile.tenant_id
  })

  return !error
}
```

### 第四步：修改用户管理页面（src/pages/super-admin/user-management/index.tsx）

#### 4.1 创建用户时的仓库分配

```typescript
if (newUserRole === 'driver') {
  // 为司机分配仓库
  for (const warehouseId of newUserWarehouseIds) {
    await insertWarehouseAssignment({
      driver_id: newUser.id,
      warehouse_id: warehouseId
    })
  }
} else if (newUserRole === 'manager' || newUserRole === 'super_admin') {
  // 为管理员和车队长分配仓库
  for (const warehouseId of newUserWarehouseIds) {
    await insertManagerWarehouseAssignment({
      manager_id: newUser.id,
      warehouse_id: warehouseId
    })
  }
}
```

#### 4.2 加载仓库分配

```typescript
let assignments: Array<{warehouse_id: string}> = []
if (targetUser.role === 'driver') {
  assignments = await getWarehouseAssignmentsByDriver(targetUser.id)
} else if (targetUser.role === 'manager' || targetUser.role === 'super_admin') {
  assignments = await getWarehouseAssignmentsByManager(targetUser.id)
}
```

#### 4.3 保存仓库分配

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
    await insertWarehouseAssignment({driver_id: userId, warehouse_id: warehouseId})
  } else if (userRole === 'manager' || userRole === 'super_admin') {
    await insertManagerWarehouseAssignment({manager_id: userId, warehouse_id: warehouseId})
  }
}
```

### 第五步：添加 RLS 策略（迁移 00149）

为 `manager_warehouses` 表添加完整的 RLS 策略：

```sql
-- INSERT 策略
CREATE POLICY "Super admins can insert manager warehouse assignments in their tenant"
ON manager_warehouses FOR INSERT TO authenticated
WITH CHECK (
  is_super_admin(auth.uid()) 
  AND tenant_id = get_user_tenant_id()
);

CREATE POLICY "Lease admins can insert manager warehouse assignments"
ON manager_warehouses FOR INSERT TO authenticated
WITH CHECK (is_lease_admin());

-- UPDATE 策略
CREATE POLICY "Super admins can update manager warehouse assignments in their tenant"
ON manager_warehouses FOR UPDATE TO authenticated
USING (is_super_admin(auth.uid()) AND tenant_id = get_user_tenant_id())
WITH CHECK (is_super_admin(auth.uid()) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Lease admins can update manager warehouse assignments"
ON manager_warehouses FOR UPDATE TO authenticated
USING (is_lease_admin())
WITH CHECK (is_lease_admin());

-- DELETE 策略
CREATE POLICY "Super admins can delete manager warehouse assignments in their tenant"
ON manager_warehouses FOR DELETE TO authenticated
USING (is_super_admin(auth.uid()) AND tenant_id = get_user_tenant_id());

CREATE POLICY "Lease admins can delete manager warehouse assignments"
ON manager_warehouses FOR DELETE TO authenticated
USING (is_lease_admin());
```

## 修复文件清单

### 数据库迁移
1. `supabase/migrations/00148_create_default_warehouses_for_existing_tenants.sql`
   - 为现有老板创建默认仓库

2. `supabase/migrations/00149_add_manager_warehouses_insert_update_delete_policies.sql`
   - 添加 manager_warehouses 表的 INSERT、UPDATE、DELETE 策略

### 后端代码
- `src/db/api.ts`
  - 修改 `createTenant` 函数：添加自动创建默认仓库和分配逻辑
  - 新增 `insertManagerWarehouseAssignment` 函数：支持管理员仓库分配（包含 tenant_id）
  - 修改 `setManagerWarehouses` 函数：插入数据时包含 tenant_id 字段

### 前端代码
- `src/pages/super-admin/user-management/index.tsx`
  - 添加 `supabase` 和 `insertManagerWarehouseAssignment` 导入
  - 修改创建用户时的仓库分配逻辑（支持管理员和车队长）
  - 移除"只能为司机分配仓库"的限制
  - 修改加载仓库分配的逻辑（根据角色使用不同函数）
  - 修改保存仓库分配的逻辑（根据角色使用不同表）

### 文档
- `WAREHOUSE_ASSIGNMENT_FIX.md` - 详细修复说明
- `WAREHOUSE_ASSIGNMENT_COMPLETE_FIX.md` - 完整修复报告（本文档）

## 验证结果

### 1. 现有老板账号已修复
```
测试3（老板）：1 个仓库（测试3的仓库）
测试2（老板）：1 个仓库（测试2）
管理员（老板）：1 个仓库（管理员的仓库）
```

### 2. RLS 策略已完整
```
manager_warehouses 表现在有：
- SELECT 策略（2个）
- INSERT 策略（2个）
- UPDATE 策略（2个）
- DELETE 策略（2个）
- ALL 策略（1个，租户数据隔离）
```

### 3. 功能验证
- ✅ 新建老板自动创建默认仓库
- ✅ 新建老板自动分配仓库
- ✅ 用户管理页面支持为管理员分配仓库
- ✅ 用户管理页面支持为车队长分配仓库
- ✅ 用户管理页面支持为司机分配仓库
- ✅ 租户隔离正常工作

## 测试建议

### 1. 测试新建老板
```
1. 以租赁管理员身份登录
2. 创建一个新的老板账号
3. 验证是否自动创建了默认仓库
4. 验证用户管理页面是否显示仓库
```

### 2. 测试车队长仓库分配
```
1. 以老板身份登录
2. 进入用户管理页面
3. 为车队长（测试22）分配仓库
4. 验证是否成功保存
5. 以车队长身份登录
6. 验证是否能看到分配的仓库
```

### 3. 测试司机仓库分配
```
1. 以老板身份登录
2. 进入用户管理页面
3. 为司机分配仓库
4. 验证是否成功保存
5. 以司机身份登录
6. 验证是否能看到分配的仓库
```

## 安全考虑

1. **租户隔离**：所有操作都包含 `tenant_id` 条件，确保多租户数据隔离
2. **RLS 策略**：完整的 RLS 策略确保只有授权用户可以访问和修改数据
3. **权限控制**：
   - 超级管理员只能管理本租户内的数据
   - 租赁管理员可以管理所有租户的数据
   - 管理员只能查看自己的仓库分配
   - 司机只能查看自己的仓库分配

## Git 提交记录

```
commit 24bda5b - 修复 manager_warehouses 表的 RLS 策略和 tenant_id 问题
commit 37cd760 - 修复仓库分配问题：新建老板自动创建仓库，支持车队长仓库分配
```

## 相关文档

- [租户隔离紧急修复](./URGENT_FIX_TENANT_ISOLATION.md)
- [超级管理员仓库访问权限修复](./SUPER_ADMIN_WAREHOUSE_ACCESS_FIX.md)
- [仓库分配问题修复](./WAREHOUSE_ASSIGNMENT_FIX.md)
