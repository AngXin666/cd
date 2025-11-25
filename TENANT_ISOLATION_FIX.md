# 租户数据隔离问题修复总结

## 问题描述

新创建的老板账号能看到其他老板的数据，多租户数据隔离没有生效。

## 根本原因

所有数据表都有两个冲突的 RLS 策略：

1. **"Super admins can manage all ..."** - 允许所有 super_admin 角色访问所有数据（不考虑租户）
2. **"租户数据隔离 - ..."** - 限制只能访问自己 tenant_id 下的数据

由于 PostgreSQL RLS 策略是 **OR 关系**（任何一个策略通过就允许访问），第一个策略让所有 super_admin 都能看到所有数据，完全绕过了租户隔离！

### 策略冲突示例

```sql
-- 策略 1：允许所有 super_admin 访问所有数据
CREATE POLICY "Super admins can manage all vehicles" ON vehicles
  FOR ALL
  USING (is_super_admin(auth.uid()));

-- 策略 2：限制只能访问自己租户的数据
CREATE POLICY "租户数据隔离 - vehicles" ON vehicles
  FOR ALL
  USING (
    is_lease_admin() 
    OR tenant_id = get_user_tenant_id()
  );

-- 结果：策略 1 OR 策略 2 = 所有 super_admin 都能访问所有数据！
```

## 解决方案

删除所有允许跨租户访问的策略，只保留租户隔离策略。

租户隔离策略已经允许 super_admin 访问自己租户的所有数据：
- `get_user_tenant_id()` 对于 super_admin 返回自己的 id
- `tenant_id = get_user_tenant_id()` 确保只能访问自己租户的数据

### 修复的策略

#### 迁移 045：删除 "Super admins can manage all" 策略

**文件**：`supabase/migrations/045_fix_super_admin_tenant_isolation.sql`

删除了以下表的 "Super admins can manage all" 策略：
- attendance
- vehicles
- vehicle_records
- warehouses
- profiles（司机表）
- driver_warehouses
- manager_warehouses
- attendance_rules
- leave_applications
- piece_work_records
- vehicle_leases
- driver_licenses
- category_prices
- feedback
- auto_reminder_rules
- notification_templates
- scheduled_notifications
- notification_send_records
- lease_bills
- resignation_applications

#### 迁移 046：删除剩余的跨租户访问策略

**文件**：`supabase/migrations/046_fix_remaining_cross_tenant_policies.sql`

**问题**：迁移 045 只删除了 "manage all" 策略，但还有很多 SELECT 策略允许跨租户访问。

**删除的策略类型**：

1. **Super admin VIEW 策略**（允许所有老板查看所有数据）：
   - piece_work_records: "Super admins can view all piece work records"
   - vehicle_records: "Super admins can view all vehicle records"
   - driver_licenses: "Super admins can view all driver licenses"
   - driver_warehouses: "Super admins can view all driver warehouses"
   - manager_warehouses: "Super admins can view all manager warehouses"
   - leave_applications: "Super admins can view all leave applications"
   - resignation_applications: "Super admins can view all resignation applications"

2. **Super admin UPDATE/DELETE 策略**：
   - profiles: "Super admins can update all profiles"
   - profiles: "Super admins can delete profiles"

3. **Authenticated users 策略**（允许所有登录用户查看所有数据）：
   - vehicles: "Authenticated users can view vehicles" ⚠️
   - attendance_rules: "Authenticated users can view attendance rules" ⚠️
   - category_prices: "Authenticated users can view category prices" ⚠️
   - warehouses: "Authenticated users can view active warehouses" ⚠️

⚠️ 这些策略特别危险，因为它们允许**所有登录用户**（包括普通司机）查看所有租户的数据！

#### 迁移 047：修复 profiles 表的跨租户查看

**文件**：`supabase/migrations/047_fix_profiles_cross_tenant_view.sql`

**问题**：新老板在设置仓库管理员时，能看到其他租户的管理员和车队长。

**根本原因**："All users can view managers" 策略允许所有用户查看所有管理员和老板：
```sql
-- 有问题的策略
CREATE POLICY "All users can view managers" ON profiles
  FOR SELECT
  USING (role = ANY (ARRAY['manager', 'super_admin']));
```

这个策略只检查角色，不检查 tenant_id，导致跨租户访问。

**删除的策略**：
- profiles: "All users can view managers" ⚠️⚠️⚠️
- profiles: "Managers can view all drivers"

⚠️⚠️⚠️ **这是最严重的数据泄露问题**，允许所有用户查看所有租户的管理员和老板信息！

**影响**：
- 删除后，用户只能通过租户隔离策略访问 profiles
- 同一租户内的用户可以互相查看
- 不同租户的用户无法互相查看


## 验证修复

### 1. 检查策略是否已删除

```sql
-- 查看 vehicles 表的策略（示例）
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'vehicles'
ORDER BY policyname;

-- 应该看不到 "Super admins can manage all vehicles" 策略
```

### 2. 测试数据隔离

**准备工作**：
1. 使用第一个老板账号（13800000001@fleet.com）登录
2. 创建一些测试数据（司机、车辆等）
3. 退出登录

**测试步骤**：
1. 使用第二个老板账号（13700000001@163.com）登录
2. 查看各个数据列表：
   - 司机列表
   - 车辆列表
   - 考勤记录
   - 请假申请
3. 验证：
   - ✅ 看不到第一个老板的数据
   - ✅ 只能看到空列表或自己的数据

### 3. 数据库验证

```sql
-- 查看两个老板的 tenant_id
SELECT 
  id,
  name,
  email,
  role,
  tenant_id,
  id = tenant_id as tenant_id_correct
FROM profiles
WHERE role = 'super_admin'::user_role
ORDER BY created_at;

-- 验证司机的 tenant_id
SELECT 
  id,
  name,
  phone,
  role,
  tenant_id
FROM profiles
WHERE role = 'driver'::user_role
ORDER BY tenant_id, created_at;

-- 每个司机的 tenant_id 应该对应其所属老板的 id
```

## 技术细节

### RLS 策略的 OR 逻辑

PostgreSQL RLS 策略之间是 **OR 关系**：
- 如果有多个策略，只要任何一个策略返回 true，就允许访问
- 这意味着更宽松的策略会覆盖更严格的策略

### 正确的策略设计

**❌ 错误设计**：
```sql
-- 策略 A：允许所有 super_admin
CREATE POLICY "super_admin_all" ON table_name
  USING (is_super_admin(auth.uid()));

-- 策略 B：租户隔离
CREATE POLICY "tenant_isolation" ON table_name
  USING (tenant_id = get_user_tenant_id());

-- 结果：策略 A 让所有 super_admin 绕过租户隔离
```

**✅ 正确设计**：
```sql
-- 只有一个策略，包含所有逻辑
CREATE POLICY "tenant_isolation" ON table_name
  USING (
    is_lease_admin()  -- 租赁管理员可以访问所有租户
    OR tenant_id = get_user_tenant_id()  -- 其他用户只能访问自己租户
  );

-- get_user_tenant_id() 的逻辑：
-- - super_admin: 返回自己的 id（作为 tenant_id）
-- - manager/driver: 返回所属租户的 id
```

### get_user_tenant_id() 函数

```sql
CREATE FUNCTION get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN p.role = 'super_admin'::user_role THEN p.id
      ELSE p.tenant_id
    END
  FROM profiles p
  WHERE p.id = auth.uid();
$$;
```

**逻辑说明**：
- **super_admin（老板）**：返回自己的 id，因为老板就是租户的拥有者
- **manager/driver**：返回 tenant_id 字段，指向所属老板的 id

## 测试场景

### 场景 1：老板 A 创建数据

1. 老板 A（13800000001@fleet.com）登录
2. 创建司机：张三
3. 创建车辆：京A12345
4. 数据库中：
   - 张三的 tenant_id = 老板 A 的 id
   - 京A12345 的 tenant_id = 老板 A 的 id

### 场景 2：老板 B 查看数据

1. 老板 B（13700000001@163.com）登录
2. 查看司机列表
3. 预期结果：
   - ✅ 看不到张三（tenant_id 不匹配）
   - ✅ 只能看到自己创建的司机

### 场景 3：租赁管理员查看数据

1. 租赁管理员（admin888@fleet.com）登录
2. 查看所有老板账号列表
3. 预期结果：
   - ✅ 可以看到所有老板（老板 A 和老板 B）
   - ✅ 可以管理所有租户的数据

## 相关文档

- [多租户功能实现完成](./MULTI_TENANT_IMPLEMENTATION_COMPLETE.md)
- [多租户功能 406 错误修复](./MULTI_TENANT_FIX_406_COMPLETE.md)
- [邮箱确认问题修复](./EMAIL_CONFIRMATION_FIX.md)
- [快速测试指南](./QUICK_TEST_CREATE_TENANT.md)

## 更新时间

2025-11-25 23:00:00 (UTC+8)

## 更新历史

- **2025-11-25 22:00** - 创建文档，修复 super_admin 策略（迁移 045）
- **2025-11-25 22:30** - 修复剩余的跨租户访问策略（迁移 046）
  - 删除所有 "Super admins can view all" 策略
  - 删除所有 "Authenticated users can view" 策略
- **2025-11-25 23:00** - 修复 profiles 表跨租户查看问题（迁移 047）
  - 删除 "All users can view managers" 策略
  - 完全实现租户数据和用户隔离

