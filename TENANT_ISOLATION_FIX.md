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

删除所有 "Super admins can manage all" 策略，只保留租户隔离策略。

租户隔离策略已经允许 super_admin 访问自己租户的所有数据：
- `get_user_tenant_id()` 对于 super_admin 返回自己的 id
- `tenant_id = get_user_tenant_id()` 确保只能访问自己租户的数据

### 修复的表

**迁移文件**：`supabase/migrations/045_fix_super_admin_tenant_isolation.sql`

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

2025-11-25 22:00:00 (UTC+8)
