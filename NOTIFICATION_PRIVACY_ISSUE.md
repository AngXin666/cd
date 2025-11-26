# 通知系统隐私问题分析

## 问题描述

用户发现：**管理员和老板可以看到所有司机的通知**

## 当前权限设置

### RLS 策略

```sql
-- 策略 1：用户可以查看自己的通知
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT
  USING (auth.uid() = recipient_id);

-- 策略 2：管理员可以查看所有通知
CREATE POLICY "Admins can view all notifications" ON notifications
  FOR SELECT
  USING (is_admin(auth.uid()));
```

### is_admin 函数定义

```sql
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = uid AND role IN ('manager'::user_role, 'super_admin'::user_role)
  );
$$;
```

## 当前行为

| 角色 | 可以查看的通知 |
|-----|--------------|
| **司机** | ✅ 只能看到自己的通知 |
| **车队长（manager）** | ⚠️ 可以看到**所有**通知（包括所有司机的通知） |
| **老板（super_admin）** | ⚠️ 可以看到**所有**通知（包括所有司机的通知） |

## 隐私问题

### 问题 1：车队长可以看到所有司机的通知

**场景**：
- 司机 A 提交请假申请
- 车队长 B 审批通过
- 司机 A 收到"请假申请已通过"的通知
- **问题**：车队长 B 也能看到司机 A 收到的这条通知

**影响**：
- 车队长可以看到司机收到的所有通知
- 包括审批结果、系统消息等
- 可能涉及司机的隐私信息

### 问题 2：老板可以看到所有通知

**场景**：
- 司机 A 和司机 B 之间的通知（如果有）
- 车队长发给司机的通知
- 所有人收到的通知

**影响**：
- 老板可以看到系统中所有的通知
- 包括司机、车队长之间的所有通知
- 可能涉及隐私问题

## 业务需求分析

### 需要明确的问题

1. **车队长是否需要查看司机的通知？**
   - 如果需要：用于监督和管理
   - 如果不需要：应该限制权限

2. **老板是否需要查看所有通知？**
   - 如果需要：用于系统管理和问题排查
   - 如果不需要：应该限制权限

3. **通知的隐私级别**
   - 哪些通知是公开的（可以被管理员查看）
   - 哪些通知是私密的（只能接收者查看）

## 解决方案

### 方案 1：完全隔离（最严格）

**策略**：
- 所有用户只能看到自己的通知
- 管理员和老板也只能看到自己的通知

**优点**：
- ✅ 最大程度保护隐私
- ✅ 简单明了

**缺点**：
- ❌ 管理员无法进行系统管理
- ❌ 无法排查通知相关的问题

**实现**：
```sql
-- 删除管理员查看所有通知的策略
DROP POLICY "Admins can view all notifications" ON notifications;

-- 只保留用户查看自己通知的策略
-- (已存在，无需修改)
```

### 方案 2：只允许超级管理员查看所有通知（推荐）

**策略**：
- 司机：只能看到自己的通知
- 车队长：只能看到自己的通知
- 老板：可以看到所有通知（用于系统管理）

**优点**：
- ✅ 保护司机和车队长的隐私
- ✅ 老板可以进行系统管理
- ✅ 权限分级合理

**缺点**：
- ⚠️ 老板仍然可以看到所有通知

**实现**：
```sql
-- 删除旧策略
DROP POLICY "Admins can view all notifications" ON notifications;

-- 创建新策略：只有超级管理员可以查看所有通知
CREATE POLICY "Super admins can view all notifications" ON notifications
  FOR SELECT
  USING (is_super_admin(auth.uid()));

-- 创建 is_super_admin 函数
CREATE OR REPLACE FUNCTION is_super_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = uid AND role = 'super_admin'::user_role
  );
$$;
```

### 方案 3：基于通知类型的隔离（最灵活）

**策略**：
- 添加 `is_private` 字段到通知表
- 私密通知：只有接收者可以查看
- 公开通知：管理员可以查看

**优点**：
- ✅ 最灵活，可以根据通知类型决定隐私级别
- ✅ 可以保护敏感通知
- ✅ 管理员可以查看非敏感通知

**缺点**：
- ❌ 需要修改表结构
- ❌ 需要修改所有创建通知的代码
- ❌ 复杂度较高

**实现**：
```sql
-- 添加 is_private 字段
ALTER TABLE notifications ADD COLUMN is_private boolean DEFAULT false;

-- 更新策略
DROP POLICY "Admins can view all notifications" ON notifications;

CREATE POLICY "Admins can view non-private notifications" ON notifications
  FOR SELECT
  USING (
    auth.uid() = recipient_id OR 
    (is_admin(auth.uid()) AND is_private = false)
  );
```

### 方案 4：基于仓库的隔离（业务相关）

**策略**：
- 车队长只能看到自己仓库司机的通知
- 老板可以看到所有通知

**优点**：
- ✅ 符合业务逻辑（车队长管理自己仓库）
- ✅ 保护跨仓库的隐私

**缺点**：
- ❌ 需要在通知表中添加 `warehouse_id` 字段
- ❌ 需要修改所有创建通知的代码
- ❌ 复杂度较高

## 推荐方案

### 推荐：方案 2（只允许超级管理员查看所有通知）

**理由**：
1. **平衡隐私和管理需求**：
   - 保护司机和车队长的隐私
   - 老板可以进行系统管理和问题排查

2. **实现简单**：
   - 只需修改 RLS 策略
   - 不需要修改表结构
   - 不需要修改应用代码

3. **符合业务逻辑**：
   - 老板作为系统最高管理者，需要全局视角
   - 车队长作为中层管理者，不需要看到其他人的通知

## 实施步骤

### 1. 创建迁移文件

```sql
/*
# 限制通知查看权限

## 变更说明
修改通知表的 RLS 策略，只允许超级管理员查看所有通知。
车队长和司机只能查看自己的通知。

## 变更内容
1. 删除旧策略：管理员可以查看所有通知
2. 创建新函数：is_super_admin
3. 创建新策略：只有超级管理员可以查看所有通知

## 影响范围
- 车队长现在只能看到自己的通知
- 老板仍然可以看到所有通知
- 司机不受影响
*/

-- 删除旧策略
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;

-- 创建 is_super_admin 函数
CREATE OR REPLACE FUNCTION is_super_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = uid AND role = 'super_admin'::user_role
  );
$$;

-- 创建新策略：只有超级管理员可以查看所有通知
CREATE POLICY "Super admins can view all notifications" ON notifications
  FOR SELECT
  USING (is_super_admin(auth.uid()));

-- 添加策略注释
COMMENT ON POLICY "Super admins can view all notifications" ON notifications IS '只有超级管理员可以查看所有通知，用于系统管理';
```

### 2. 应用迁移

使用 `supabase_apply_migration` 工具应用迁移。

### 3. 测试验证

1. **测试司机**：
   - 登录司机账号
   - 只能看到自己的通知
   - 无法看到其他司机的通知

2. **测试车队长**：
   - 登录车队长账号
   - 只能看到自己的通知
   - 无法看到司机的通知

3. **测试老板**：
   - 登录老板账号
   - 可以看到所有通知
   - 包括司机和车队长的通知

## 其他考虑

### 1. 通知中心页面

如果车队长有"通知中心"页面显示所有通知，需要：
- 修改查询逻辑，只查询自己的通知
- 或者移除车队长的"查看所有通知"功能

### 2. 通知统计

如果有通知统计功能（如"未读通知数"），需要：
- 确保统计只包含自己的通知
- 不包含其他用户的通知

### 3. 通知管理

如果管理员需要管理通知（如删除、批量操作），需要：
- 只允许管理自己的通知
- 或者只允许超级管理员管理所有通知

## 总结

**当前问题**：
- ⚠️ 车队长和老板可以看到所有司机的通知
- ⚠️ 存在隐私泄露风险

**推荐解决方案**：
- ✅ 只允许超级管理员查看所有通知
- ✅ 车队长和司机只能查看自己的通知
- ✅ 平衡隐私保护和系统管理需求

**是否需要修复**：
- 取决于业务需求
- 如果需要保护隐私，建议立即修复
- 如果管理员需要监督功能，可以保持现状或使用方案 3/4
