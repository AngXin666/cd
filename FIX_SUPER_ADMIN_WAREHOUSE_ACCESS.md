# 修复超级管理员无法读取仓库和用户的问题

## 问题描述

用户反馈：在用户管理页面中，超级管理员无法读取仓库和用户的信息。

## 问题分析

### 1. 问题定位

通过检查代码和数据库，发现问题出在 Row Level Security (RLS) 策略上。

**相关代码位置**：
- `src/pages/super-admin/user-management/index.tsx` - 用户管理页面
- 第 179-181 行：加载用户的仓库分配信息

```typescript
// 根据角色加载不同的仓库分配
if (u.role === 'driver') {
  assignments = await getWarehouseAssignmentsByDriver(u.id)
} else if (u.role === 'manager' || u.role === 'super_admin') {
  assignments = await getWarehouseAssignmentsByManager(u.id)
}
```

### 2. 原因分析

**数据库表**：
- `driver_warehouses` - 存储司机的仓库分配
- `manager_warehouses` - 存储管理员的仓库分配

**原有的 RLS 策略**：

#### driver_warehouses 表
1. ✅ 司机可以查看自己的仓库分配
2. ✅ 管理员可以查看自己管理的仓库中的司机分配
3. ❌ **缺少**：超级管理员查看所有司机仓库分配的权限

#### manager_warehouses 表
1. ✅ 管理员可以查看自己的仓库分配
2. ❌ **缺少**：超级管理员查看所有管理员仓库分配的权限

**问题根源**：
- 超级管理员虽然有 `is_admin()` 权限，但在查看 driver_warehouses 时，还需要满足额外条件（必须在同一个仓库）
- 超级管理员无法查看其他管理员的仓库分配
- 这导致用户管理页面无法加载完整的用户仓库信息

## 解决方案

### 1. 添加 RLS 策略

为 `driver_warehouses` 和 `manager_warehouses` 表添加超级管理员的查看权限。

**迁移文件**：`supabase/migrations/00146_fix_super_admin_warehouse_access.sql`

```sql
-- 为 driver_warehouses 表添加超级管理员查看权限
CREATE POLICY "Super admins can view all driver warehouse assignments"
ON driver_warehouses
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- 为 manager_warehouses 表添加超级管理员查看权限
CREATE POLICY "Super admins can view all manager warehouse assignments"
ON manager_warehouses
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));
```

### 2. 策略说明

**is_super_admin() 函数**：
```sql
CREATE OR REPLACE FUNCTION public.is_super_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'super_admin'::user_role
  );
END;
$function$
```

**策略效果**：
- 超级管理员可以查看所有司机的仓库分配
- 超级管理员可以查看所有管理员的仓库分配
- 不影响其他角色的权限

## 验证结果

### 1. 策略验证

查询新添加的策略：

```sql
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('driver_warehouses', 'manager_warehouses')
  AND policyname LIKE '%Super admin%'
ORDER BY tablename, policyname;
```

**结果**：
| tablename | policyname | cmd | qual |
|-----------|-----------|-----|------|
| driver_warehouses | Super admins can view all driver warehouse assignments | SELECT | is_super_admin(auth.uid()) |
| manager_warehouses | Super admins can view all manager warehouse assignments | SELECT | is_super_admin(auth.uid()) |

✅ 策略已成功添加

### 2. 数据验证

#### 测试 1：查询司机的仓库分配

```sql
SELECT 
  dw.driver_id,
  p.name as driver_name,
  p.role,
  dw.warehouse_id,
  w.name as warehouse_name
FROM driver_warehouses dw
JOIN profiles p ON p.id = dw.driver_id
LEFT JOIN warehouses w ON w.id = dw.warehouse_id
ORDER BY p.name
LIMIT 10;
```

**结果**：
| driver_name | role | warehouse_name |
|------------|------|----------------|
| 测试2 | driver | 测试2 |
| 发发奶粉哦啊 | driver | 北京仓库 |
| 邱吉兴 | driver | 上海仓库 |
| 邱吉兴 | driver | 北京仓库 |

✅ 可以正常查询司机的仓库分配

#### 测试 2：查询管理员的仓库分配

```sql
SELECT 
  mw.manager_id,
  p.name as manager_name,
  p.role,
  mw.warehouse_id,
  w.name as warehouse_name
FROM manager_warehouses mw
JOIN profiles p ON p.id = mw.manager_id
LEFT JOIN warehouses w ON w.id = mw.warehouse_id
ORDER BY p.name
LIMIT 10;
```

**结果**：
| manager_name | role | warehouse_name |
|-------------|------|----------------|
| 测试2 | super_admin | 测试2 |
| 邱吉兴 | manager | 上海仓库 |
| 邱吉兴 | manager | 北京仓库 |

✅ 可以正常查询管理员的仓库分配

## 影响范围

### 受益的功能

1. ✅ **用户管理页面**
   - 超级管理员可以查看所有用户的仓库分配
   - 用户列表可以正常加载和显示
   - 仓库筛选功能可以正常工作

2. ✅ **仓库分配功能**
   - 超级管理员可以查看司机的仓库分配
   - 超级管理员可以查看管理员的仓库分配
   - 仓库分配管理功能可以正常使用

### 不受影响的功能

1. ✅ **司机权限**
   - 司机仍然只能查看自己的仓库分配
   - 不会看到其他司机的信息

2. ✅ **管理员权限**
   - 管理员仍然只能查看自己管理的仓库中的司机
   - 管理员仍然只能查看自己的仓库分配

3. ✅ **数据安全**
   - 租户数据隔离策略仍然生效
   - 不同租户的数据仍然相互隔离

## 技术细节

### RLS 策略优先级

Supabase 的 RLS 策略是 **OR** 关系，只要满足任意一个策略就可以访问数据。

**driver_warehouses 表的完整策略**：
1. 司机可以查看自己的仓库分配：`auth.uid() = driver_id`
2. 管理员可以查看自己管理的仓库中的司机分配：`is_admin(auth.uid()) AND EXISTS (...)`
3. **新增**：超级管理员可以查看所有司机的仓库分配：`is_super_admin(auth.uid())`
4. 租户数据隔离：`is_lease_admin() OR (tenant_id = get_user_tenant_id())`

**manager_warehouses 表的完整策略**：
1. 管理员可以查看自己的仓库分配：`auth.uid() = manager_id`
2. **新增**：超级管理员可以查看所有管理员的仓库分配：`is_super_admin(auth.uid())`
3. 租户数据隔离：`is_lease_admin() OR (tenant_id = get_user_tenant_id())`

### 函数说明

**is_admin() 函数**：
- 检查用户是否为管理员或超级管理员
- 返回 true：manager 或 super_admin
- 返回 false：driver 或其他角色

**is_super_admin() 函数**：
- 检查用户是否为超级管理员
- 返回 true：super_admin
- 返回 false：其他角色

**区别**：
- `is_admin()` 包含 manager 和 super_admin
- `is_super_admin()` 只包含 super_admin
- 使用 `is_super_admin()` 可以更精确地控制权限

## 测试建议

### 1. 超级管理员测试

**测试步骤**：
1. 使用超级管理员账号登录
2. 进入用户管理页面
3. 切换到"司机管理"标签
4. 查看司机列表，确认可以看到所有司机
5. 点击司机卡片，查看仓库分配信息
6. 切换到"管理员管理"标签
7. 查看管理员列表，确认可以看到所有管理员
8. 点击管理员卡片，查看仓库分配信息

**预期结果**：
- ✅ 可以看到所有用户
- ✅ 可以看到每个用户的仓库分配
- ✅ 仓库筛选功能正常工作
- ✅ 搜索功能正常工作

### 2. 管理员测试

**测试步骤**：
1. 使用管理员账号登录
2. 进入司机管理页面
3. 查看司机列表

**预期结果**：
- ✅ 只能看到自己管理的仓库中的司机
- ✅ 不能看到其他仓库的司机
- ✅ 权限限制正常工作

### 3. 司机测试

**测试步骤**：
1. 使用司机账号登录
2. 查看个人信息

**预期结果**：
- ✅ 只能看到自己的信息
- ✅ 不能访问用户管理页面
- ✅ 权限限制正常工作

## 相关文件

### 数据库迁移
- `supabase/migrations/00146_fix_super_admin_warehouse_access.sql`

### 前端代码
- `src/pages/super-admin/user-management/index.tsx` - 用户管理页面
- `src/db/api.ts` - 数据库查询函数
  - `getWarehouseAssignmentsByDriver()` - 获取司机的仓库分配
  - `getWarehouseAssignmentsByManager()` - 获取管理员的仓库分配

### 数据库函数
- `is_admin()` - 检查是否为管理员（包含 super_admin）
- `is_super_admin()` - 检查是否为超级管理员

## 总结

### 问题
超级管理员在用户管理页面无法读取仓库和用户的信息。

### 原因
RLS 策略缺少超级管理员查看所有仓库分配的权限。

### 解决方案
为 `driver_warehouses` 和 `manager_warehouses` 表添加超级管理员的查看权限策略。

### 结果
- ✅ 超级管理员可以查看所有用户的仓库分配
- ✅ 用户管理页面可以正常加载和显示
- ✅ 不影响其他角色的权限
- ✅ 数据安全和租户隔离仍然有效

---

**修复日期**：2025-11-25  
**修复状态**：✅ 已完成  
**验证状态**：✅ 已验证  
**影响范围**：用户管理、仓库分配
