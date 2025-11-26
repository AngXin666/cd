# RLS 无限递归问题 - 完整修复报告

## 问题概述

**错误信息**：
```
infinite recursion detected in policy for relation "profiles"
```

**影响范围**：
- ❌ 用户管理系统无法使用
- ❌ 租赁系统无法使用
- ❌ 所有依赖 profiles 表的功能都受影响

---

## 问题根源

### RLS 策略导致无限递归

**问题模式**：
```sql
-- 错误的策略写法
CREATE POLICY "policy_name" ON table_name
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'some_role'
    )
  );
```

**递归链**：
1. 查询 `table_name` 表
2. RLS 策略需要查询 `profiles` 表来检查权限
3. 查询 `profiles` 表时，触发 `profiles` 表的 RLS 策略
4. `profiles` 表的 RLS 策略又需要查询 `profiles` 表
5. 回到步骤 3，形成无限递归 ❌

---

## 修复方案

### 核心思想

使用 `SECURITY DEFINER` 函数打破递归链。

### 实现步骤

#### 1. 创建辅助函数

```sql
CREATE OR REPLACE FUNCTION get_user_role_and_boss(user_id uuid)
RETURNS TABLE (role user_role, boss_id text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role, boss_id FROM profiles WHERE id = user_id;
$$;
```

**关键点**：
- `SECURITY DEFINER`：以函数所有者权限执行，绕过 RLS
- `STABLE`：标记为稳定函数，PostgreSQL 可以缓存结果
- `SET search_path = public`：安全设置，防止搜索路径攻击

#### 2. 修复 RLS 策略

**修复前**：
```sql
-- ❌ 会导致递归
CREATE POLICY "policy_name" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'super_admin')
    )
  );
```

**修复后**：
```sql
-- ✅ 使用辅助函数避免递归
CREATE POLICY "policy_name" ON profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) IN ('manager', 'super_admin')
    AND
    profiles.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(auth.uid()) b)
  );
```

---

## 修复内容详情

### 1. 用户管理系统

**迁移文件**：
- `00200_fix_infinite_recursion_in_profiles_rls.sql`
- `00201_fix_warehouses_rls_recursion.sql`
- `00202_fix_warehouse_assignments_rls_recursion.sql`

**修复的表**：
- ✅ `profiles` - 用户档案表
- ✅ `warehouses` - 仓库表
- ✅ `manager_warehouses` - 车队长仓库分配表
- ✅ `driver_warehouses` - 司机仓库分配表

**创建的函数**：
- ✅ `get_user_role_and_boss(user_id uuid)` - 获取用户角色和 boss_id

**验证结果**：
- ✅ 租户 A 超级管理员可以查看 8 个用户
- ✅ 租户 B 超级管理员只能查看 1 个用户（自己）
- ✅ 跨租户隔离正常
- ✅ 司机权限隔离正常
- ✅ 车队长权限正常

### 2. 租赁系统

**迁移文件**：
- `00206_fix_lease_system_rls_policies.sql`

**修复的表**：
- ✅ `leases` - 租赁记录表（15 条记录）
- ✅ `lease_bills` - 租赁账单表（0 条记录）
- ✅ `vehicle_leases` - 车辆租赁表（0 条记录）

**创建的函数**：
- ✅ `is_lease_admin_user(user_id uuid)` - 检查用户是否为租赁管理员

**验证结果**：
- ✅ 租赁管理员可以查看 15 条租赁记录
- ✅ 租赁管理员可以管理账单
- ✅ 租赁管理员可以管理车辆租赁

### 3. 数据隔离测试

**迁移文件**：
- `00203_create_data_isolation_test_function.sql`（已被 00205 替代）
- `00205_fix_test_function_cascade.sql`

**创建的函数**：
- ✅ `test_data_isolation()` - 自动化测试数据隔离功能

**测试结果**：
- ✅ 所有 6 项测试通过
- ✅ 数据隔离功能完全正常

---

## 迁移文件列表

| 文件名 | 说明 | 状态 |
|-------|------|------|
| 00200_fix_infinite_recursion_in_profiles_rls.sql | 修复 profiles 表的无限递归 | ✅ 已应用 |
| 00201_fix_warehouses_rls_recursion.sql | 修复 warehouses 表的递归 | ✅ 已应用 |
| 00202_fix_warehouse_assignments_rls_recursion.sql | 修复仓库分配表的递归 | ✅ 已应用 |
| 00203_create_data_isolation_test_function.sql | 创建测试函数（已替代） | ⚠️ 已替代 |
| 00205_fix_test_function_cascade.sql | 修复测试函数 | ✅ 已应用 |
| 00206_fix_lease_system_rls_policies.sql | 修复租赁系统 RLS 策略 | ✅ 已应用 |

---

## 用户操作指南

### 🚀 立即执行以下操作

#### 方法 1：直接刷新页面（推荐）

按 `F5` 键或 `Ctrl+R`（Mac: `Cmd+R`）刷新页面

#### 方法 2：清除缓存后刷新

如果方法 1 无效，请在浏览器控制台（按 `F12` 打开）执行：

```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

#### 方法 3：重新登录

如果方法 2 无效，请：
1. 退出登录
2. 重新登录
3. 查看相应的管理页面

---

## 验证测试

### 自动化测试

运行以下 SQL 命令来验证数据隔离功能：

```sql
-- 运行数据隔离测试
SELECT * FROM test_data_isolation();
```

**预期结果**：所有测试项的 `test_status` 都应该是 `✅ 通过`

### 手动测试

#### 1. 测试用户管理系统

**超级管理员**：
- ✅ 可以查看同租户的所有用户
- ✅ 可以查看同租户的所有仓库
- ✅ 可以查看同租户的司机

**车队长**：
- ✅ 可以查看同租户的所有用户
- ✅ 可以查看同租户的所有仓库
- ✅ 可以查看同租户的司机

**司机**：
- ✅ 只能查看自己的档案
- ✅ 只能查看分配给自己的仓库

#### 2. 测试租赁系统

**租赁管理员**：
- ✅ 可以查看所有租赁记录
- ✅ 可以创建、更新、删除租赁记录
- ✅ 可以管理租赁账单
- ✅ 可以管理车辆租赁

---

## 技术细节

### SECURITY DEFINER 的工作原理

**普通函数**：
```sql
-- 以调用者的权限执行
CREATE FUNCTION normal_function()
RETURNS ...
LANGUAGE sql
AS $$
  SELECT * FROM profiles;  -- 受 RLS 限制
$$;
```

**SECURITY DEFINER 函数**：
```sql
-- 以函数所有者的权限执行
CREATE FUNCTION secure_function()
RETURNS ...
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM profiles;  -- 不受 RLS 限制
$$;
```

### 性能优化

**STABLE 标记**：
- PostgreSQL 可以在同一查询中缓存函数结果
- 减少重复计算，提高性能

**示例**：
```sql
-- 这个查询只会调用一次 get_user_role_and_boss
SELECT *
FROM profiles
WHERE (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) = 'manager'
  AND boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(auth.uid()) b);
```

---

## 安全考虑

### SECURITY DEFINER 的安全性

**优点**：
- ✅ 打破 RLS 递归链
- ✅ 提高查询性能
- ✅ 简化策略逻辑

**注意事项**：
- ⚠️ 必须设置 `search_path` 防止搜索路径攻击
- ⚠️ 函数内部的查询不受 RLS 限制，需要谨慎设计
- ⚠️ 只返回必要的信息（role 和 boss_id）

**安全实践**：
```sql
CREATE OR REPLACE FUNCTION get_user_role_and_boss(user_id uuid)
RETURNS TABLE (role user_role, boss_id text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public  -- ✅ 防止搜索路径攻击
STABLE                     -- ✅ 提高性能
AS $$
  SELECT role, boss_id FROM profiles WHERE id = user_id;  -- ✅ 只返回必要信息
$$;
```

---

## 总结

### 修复成果

1. ✅ 修复了 profiles 表的无限递归问题
2. ✅ 修复了 warehouses 表的递归问题
3. ✅ 修复了仓库分配表的递归问题
4. ✅ 修复了租赁系统的递归问题
5. ✅ 创建了自动化测试函数
6. ✅ 验证了所有功能正常工作

### 影响范围

**用户管理系统**：
- profiles 表：16 个用户
- warehouses 表：6 个仓库
- manager_warehouses 表：2 条分配记录
- driver_warehouses 表：8 条分配记录

**租赁系统**：
- leases 表：15 条租赁记录
- lease_bills 表：0 条账单记录
- vehicle_leases 表：0 条车辆租赁记录

### 数据隔离验证

- ✅ 租户 A（8 个用户）与租户 B（1 个用户）完全隔离
- ✅ 超级管理员可以查看同租户的所有数据
- ✅ 车队长可以查看同租户的所有数据
- ✅ 司机只能查看自己的数据
- ✅ 租赁管理员可以查看所有租赁数据

### 后续建议

1. **监控**：观察系统运行情况，确认没有其他递归问题
2. **测试**：定期运行 `test_data_isolation()` 函数验证数据隔离
3. **性能**：监控查询性能，确保优化有效
4. **安全**：定期审查 SECURITY DEFINER 函数的使用

---

**修复完成时间**：2025-11-26  
**修复状态**：✅ 完全修复  
**验证状态**：✅ 全部通过  
**系统状态**：✅ 可以正常使用
