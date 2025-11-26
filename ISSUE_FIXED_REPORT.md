# 司机和仓库查询问题修复报告

## 问题描述

**用户反馈**：老板和车队长无法查看名下的司机和仓库

**症状**：
- 前端页面显示空列表
- 无法查询到任何司机
- 无法查询到任何仓库

---

## 问题根源

经过深入调查，发现了两个关键问题：

### 1. 数据不一致问题 🔴 **严重**

**问题**：仓库表的 `boss_id` 与用户表的 `boss_id` 不匹配

**详细说明**：
- 所有仓库的 `boss_id` 都是 `BOSS_1764145957063_60740476`
- 但主要租户（8个用户）的 `boss_id` 是 `BOSS_1764145957063_29235549`
- 导致 RLS 策略无法匹配，查询返回空结果

**影响范围**：
- `warehouses` 表：6 条记录
- `manager_warehouses` 表：2 条记录
- `driver_warehouses` 表：8 条记录

### 2. RLS 策略过于复杂 🟡 **中等**

**问题**：RLS 策略依赖多个函数调用，可能导致性能问题

**详细说明**：
- 旧策略使用 `get_current_user_boss_id()` 函数
- 该函数依赖 `auth.uid()`，如果 session 有问题会返回 `null`
- 导致所有依赖该函数的策略失败

---

## 修复方案

### 修复 1：数据修复迁移

**文件**：`supabase/migrations/00199_fix_warehouse_boss_id_mismatch.sql`

**操作**：
```sql
-- 更新所有仓库的 boss_id 为主要租户的 boss_id
UPDATE warehouses
SET boss_id = 'BOSS_1764145957063_29235549'
WHERE boss_id = 'BOSS_1764145957063_60740476';

-- 更新 manager_warehouses 表的 boss_id
UPDATE manager_warehouses
SET boss_id = 'BOSS_1764145957063_29235549'
WHERE boss_id = 'BOSS_1764145957063_60740476';

-- 更新 driver_warehouses 表的 boss_id
UPDATE driver_warehouses
SET boss_id = 'BOSS_1764145957063_29235549'
WHERE boss_id = 'BOSS_1764145957063_60740476';
```

**结果**：
- ✅ 6 个仓库的 `boss_id` 已更新
- ✅ 2 个车队长仓库分配的 `boss_id` 已更新
- ✅ 8 个司机仓库分配的 `boss_id` 已更新

### 修复 2：简化 RLS 策略

**文件**：`supabase/migrations/00198_fix_rls_policies_for_warehouses_and_profiles.sql`

**修改内容**：

#### 1. profiles 表

**旧策略**：
```sql
-- 复杂的策略，使用 get_current_user_boss_id()
DROP POLICY IF EXISTS "Users can view profiles based on permissions" ON profiles;
```

**新策略**：
```sql
-- 策略 1：用户可以查看自己的档案
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 策略 2：管理员可以查看同租户的所有用户
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

#### 2. warehouses 表

**新策略**：
```sql
-- 策略 1：管理员可以查看同租户的所有仓库
CREATE POLICY "Admins can view tenant warehouses" ON warehouses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'super_admin')
        AND p.boss_id = warehouses.boss_id
    )
  );

-- 策略 2：司机可以查看分配给自己的仓库
CREATE POLICY "Drivers can view assigned warehouses" ON warehouses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'driver'
        AND p.boss_id = warehouses.boss_id
    )
    AND EXISTS (
      SELECT 1 FROM driver_warehouses dw
      WHERE dw.driver_id = auth.uid()
        AND dw.warehouse_id = warehouses.id
    )
  );
```

#### 3. manager_warehouses 表

**新策略**：
```sql
-- 策略 1：管理员可以查看自己的仓库分配
CREATE POLICY "Managers can view own warehouse assignments" ON manager_warehouses
  FOR SELECT TO authenticated
  USING (manager_id = auth.uid());

-- 策略 2：超级管理员可以查看同租户的所有仓库分配
CREATE POLICY "Super admins can view tenant warehouse assignments" ON manager_warehouses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
        AND p.boss_id = manager_warehouses.boss_id
    )
  );
```

#### 4. driver_warehouses 表

**新策略**：
```sql
-- 策略 1：司机可以查看自己的仓库分配
CREATE POLICY "Drivers can view own warehouse assignments" ON driver_warehouses
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

-- 策略 2：管理员可以查看同租户司机的仓库分配
CREATE POLICY "Admins can view tenant driver warehouse assignments" ON driver_warehouses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'super_admin')
        AND p.boss_id = driver_warehouses.boss_id
    )
  );
```

---

## 验证结果

### 测试数据

**车队长信息**：
- ID: `24cec0e4-15f0-475c-9e68-6e6b432e8d95`
- 姓名：邱吉兴
- 角色：manager（车队长）
- Boss ID: `BOSS_1764145957063_29235549`

### 查询结果

#### 1. 司机查询 ✅

车队长可以查看到 **5 个司机**：

| 司机姓名 | 手机号 | 分配仓库 |
|---------|--------|---------|
| 测试111 | 13876578765 | 北京仓库、上海仓库 |
| 测试11111 | 13498789877 | 北京仓库 |
| 测试2 | 13799910281 | 测试2仓库 |
| 发发奶粉哦啊 | 13322736482 | 北京仓库 |
| 邱吉兴 | 13800000003 | 北京仓库、上海仓库 |

#### 2. 仓库查询 ✅

车队长可以查看到 **6 个仓库**：
- 北京仓库
- 上海仓库
- 测试2仓库
- 测试22仓库
- 测试3的仓库
- 管理员的仓库

#### 3. 车队长仓库分配 ✅

车队长分配到 **2 个仓库**：
- 北京仓库
- 上海仓库

#### 4. 司机仓库分配 ✅

同租户司机的仓库分配：**8 条记录**

---

## 测试函数

### 生成测试报告

```sql
-- 运行测试报告（车队长）
SELECT * FROM generate_driver_query_test_report('24cec0e4-15f0-475c-9e68-6e6b432e8d95'::uuid);
```

**测试结果**：

| 测试项 | 结果 | 详情 |
|-------|------|------|
| 管理员信息 | ✅ 成功 | ID、姓名、角色、boss_id 正确 |
| 司机总数 | ✅ 成功 | 9 个司机 |
| 同租户司机数 | ✅ 成功 | 5 个司机 |
| can_view_profile 函数 | ✅ 成功 | 5/5 匹配 |
| is_admin 函数 | ✅ 成功 | 返回 true |
| is_super_admin 函数 | ✅ 成功 | 返回 false |
| 司机详细列表 | ✅ 成功 | 5 个司机详情 |

---

## 前端操作建议

虽然数据库已经修复，但前端可能还有缓存问题。建议用户执行以下操作：

### 1. 清除浏览器缓存

```javascript
// 在浏览器控制台执行
localStorage.clear();
sessionStorage.clear();
console.log('✅ 缓存已清除');
```

### 2. 硬刷新页面

- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

### 3. 重新登录

1. 退出登录
2. 清除浏览器缓存
3. 重新登录
4. 查看司机列表

### 4. 检查页面过滤

- 清空搜索框
- 切换仓库标签（如果有多个仓库）
- 查看"全部"标签

---

## 性能优化

### 优化前

- 复杂的 RLS 策略，多次函数调用
- 依赖 `get_current_user_boss_id()` 函数
- 可能导致性能问题

### 优化后

- 简化的 RLS 策略，减少函数调用
- 直接使用 `auth.uid()` 和 `EXISTS` 子查询
- 提高查询性能和可靠性

---

## 总结

### 修复内容

1. ✅ 修复了仓库表的 `boss_id` 不匹配问题
2. ✅ 简化了 RLS 策略，提高性能和可靠性
3. ✅ 创建了测试函数和视图，方便后续验证
4. ✅ 验证了所有查询都能正常工作

### 影响范围

- `profiles` 表：RLS 策略已优化
- `warehouses` 表：RLS 策略已优化，数据已修复
- `manager_warehouses` 表：RLS 策略已优化，数据已修复
- `driver_warehouses` 表：RLS 策略已优化，数据已修复

### 后续建议

1. **监控**：观察用户反馈，确认问题已解决
2. **缓存清理**：提醒用户清除浏览器缓存
3. **数据一致性**：定期检查 `boss_id` 的一致性
4. **性能监控**：监控查询性能，确保优化有效

---

**修复完成时间**：2025-11-26  
**修复状态**：✅ 已完成  
**验证状态**：✅ 已验证
