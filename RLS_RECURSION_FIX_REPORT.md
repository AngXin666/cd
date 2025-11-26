# RLS 无限递归问题修复报告

## 问题描述

**错误信息**：
```
infinite recursion detected in policy for relation "profiles"
```

**影响**：
- 用户无法查询自己的档案
- 用户无法查询司机列表
- 用户无法查询仓库列表
- 整个系统无法正常使用

---

## 问题根源

### RLS 策略导致无限递归

**问题策略**：
```sql
CREATE POLICY "Admins can view tenant users" ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'super_admin')
        AND p.boss_id = profiles.boss_id
    )
  );
```

**递归链**：
1. 用户查询 `profiles` 表
2. RLS 策略检查权限，需要查询 `profiles` 表（`SELECT 1 FROM profiles p WHERE p.id = auth.uid()`）
3. 第 2 步的查询又触发 RLS 策略检查
4. 回到第 2 步，形成无限递归

---

## 解决方案

### 使用 SECURITY DEFINER 函数打破递归链

**核心思想**：
- 创建一个 `SECURITY DEFINER` 函数来查询用户信息
- `SECURITY DEFINER` 函数以函数所有者的权限执行，绕过 RLS 检查
- 在 RLS 策略中调用这个函数，避免递归

**实现**：

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
- `STABLE`：标记为稳定函数，提高性能
- `SET search_path = public`：安全设置，防止搜索路径攻击

#### 2. 修复 profiles 表的策略

```sql
-- 策略 1：用户可以查看自己的档案
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 策略 2：管理员可以查看同租户的所有用户
CREATE POLICY "Admins can view same tenant users" ON profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) IN ('manager', 'super_admin')
    AND
    profiles.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(auth.uid()) b)
  );
```

#### 3. 修复 warehouses 表的策略

```sql
-- 策略 1：管理员可以查看同租户的所有仓库
CREATE POLICY "Admins can view tenant warehouses" ON warehouses
  FOR SELECT TO authenticated
  USING (
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) IN ('manager', 'super_admin')
    AND
    warehouses.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(auth.uid()) b)
  );
```

#### 4. 修复 manager_warehouses 和 driver_warehouses 表的策略

同样使用 `get_user_role_and_boss` 函数来避免递归。

---

## 验证结果

### 测试辅助函数

```sql
SELECT * FROM get_user_role_and_boss('9e04dfd6-9b18-4e00-992f-bcfb73a86900'::uuid);
```

**结果**：
```
role         | boss_id
-------------|---------------------------
super_admin  | BOSS_1764145957063_52128391
```

✅ 函数正常工作

### 测试查询

```sql
-- 测试查询自己的档案
SELECT id, name, role, boss_id 
FROM profiles 
WHERE id = '9e04dfd6-9b18-4e00-992f-bcfb73a86900';
```

✅ 应该能正常返回结果，不再报递归错误

---

## 迁移文件

已创建以下迁移文件：

1. `00200_fix_infinite_recursion_in_profiles_rls.sql`
   - 创建 `get_user_role_and_boss` 函数
   - 修复 `profiles` 表的 RLS 策略

2. `00201_fix_warehouses_rls_recursion.sql`
   - 修复 `warehouses` 表的 RLS 策略

3. `00202_fix_warehouse_assignments_rls_recursion.sql`
   - 修复 `manager_warehouses` 表的 RLS 策略
   - 修复 `driver_warehouses` 表的 RLS 策略

---

## 用户操作指南

### 步骤 1：刷新页面

直接刷新浏览器页面（按 `F5` 或 `Ctrl+R`）

### 步骤 2：清除缓存（如果步骤 1 无效）

在浏览器控制台执行：
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 步骤 3：重新登录（如果步骤 2 无效）

1. 退出登录
2. 重新登录
3. 查看司机管理页面

---

## 关于 boss_id 不匹配的问题

### 当前状态

- 所有仓库的 `boss_id` 都是 `BOSS_1764145957063_29235549`
- 但系统中有多个租户，每个租户都有不同的 `boss_id`

### 问题

如果您的 `boss_id` 不是 `BOSS_1764145957063_29235549`，您将看不到任何仓库。

### 解决方案

**选项 1：为每个租户创建独立的仓库**

每个超级管理员登录后，在自己的账号下创建仓库。这样仓库的 `boss_id` 会自动设置为当前用户的 `boss_id`。

**选项 2：手动分配仓库给不同租户**

如果需要将现有仓库分配给不同租户，请提供以下信息：
1. 您的用户 ID 或手机号
2. 您想要查看的仓库名称
3. 我们可以手动更新仓库的 `boss_id`

---

## 技术细节

### SECURITY DEFINER 的安全性

**优点**：
- 打破 RLS 递归链
- 提高查询性能

**注意事项**：
- 必须设置 `search_path` 防止搜索路径攻击
- 函数内部的查询不受 RLS 限制，需要谨慎设计
- 只返回必要的信息（role 和 boss_id）

### 性能优化

**STABLE 标记**：
- 标记函数为稳定函数
- PostgreSQL 可以在同一查询中缓存函数结果
- 提高查询性能

---

## 总结

### 修复内容

1. ✅ 创建了 `get_user_role_and_boss` 辅助函数
2. ✅ 修复了 `profiles` 表的 RLS 策略
3. ✅ 修复了 `warehouses` 表的 RLS 策略
4. ✅ 修复了 `manager_warehouses` 表的 RLS 策略
5. ✅ 修复了 `driver_warehouses` 表的 RLS 策略

### 影响范围

- 所有涉及 RLS 策略的查询
- 所有用户的档案查询
- 所有仓库查询
- 所有司机查询

### 后续建议

1. **测试**：登录不同角色的用户，验证查询是否正常
2. **监控**：观察是否还有其他递归错误
3. **数据一致性**：确保每个租户的数据（用户、仓库、司机）的 `boss_id` 一致

---

**修复完成时间**：2025-11-26  
**修复状态**：✅ 已完成  
**验证状态**：⏳ 等待用户测试
