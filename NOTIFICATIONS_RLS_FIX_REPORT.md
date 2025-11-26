# Notifications RLS 策略修复报告

## 问题描述

在仓库分配功能中，创建通知时出现以下错误：

```
批量创建通知失败 – {
  code: "42501",
  details: null,
  hint: null,
  message: "new row violates row-level security policy for table \"notifications\""
}
```

## 根本原因分析

### 原因 1：缺少 Manager 创建通知的策略

在 `18_add_peer_admin_role_step2.sql` 迁移中，notifications 表的 RLS 策略被更新为：

```sql
CREATE POLICY "Super admin and peer admin can manage tenant notifications" ON notifications
  FOR ALL TO authenticated
  USING ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()))
  WITH CHECK ((boss_id = get_current_user_boss_id()) AND is_super_admin_or_peer(auth.uid()));
```

这个策略只允许 `super_admin` 和 `peer_admin` 创建通知，导致 `manager`（车队长）无法创建通知。

### 原因 2：createNotifications 函数未设置 boss_id

在 `src/db/notificationApi.ts` 的 `createNotifications` 函数中，插入通知时没有设置 `boss_id` 字段：

```typescript
const notificationData = notifications.map((n) => ({
  recipient_id: n.userId,
  sender_id: user.id,
  sender_name: senderName,
  sender_role: senderRole,
  type: n.type,
  title: n.title,
  content: n.message,
  action_url: null,
  related_id: n.relatedId || null,
  is_read: false
  // 缺少 boss_id 字段！
}))
```

即使 RLS 策略允许 super_admin 创建通知，但由于 `WITH CHECK` 条件要求 `boss_id = get_current_user_boss_id()`，而插入的数据中没有 `boss_id` 字段，导致策略检查失败。

## 修复方案

### 修复 1：添加 RLS 策略

创建新的迁移 `19_fix_notifications_rls_for_manager.sql`，添加以下策略：

1. **Manager 创建通知策略**：允许车队长创建通知给自己管理的仓库中的司机
2. **用户查看通知策略**：允许用户查看自己的通知
3. **用户更新通知策略**：允许用户更新自己的通知（标记已读）
4. **用户删除通知策略**：允许用户删除自己的通知

### 修复 2：修改 createNotifications 函数

在 `src/db/notificationApi.ts` 中修改 `createNotifications` 函数，添加 `boss_id` 字段：

```typescript
// 获取发送者的profile信息（包括 boss_id）
const {data: senderProfile} = await supabase
  .from('profiles')
  .select('name, role, boss_id')
  .eq('id', user.id)
  .maybeSingle()

const senderName = senderProfile?.name || '系统'
const senderRole = senderProfile?.role || 'system'
const bossId = senderProfile?.boss_id

if (!bossId) {
  logger.error('批量创建通知失败：无法获取当前用户的 boss_id')
  return false
}

const notificationData = notifications.map((n) => ({
  recipient_id: n.userId,
  sender_id: user.id,
  sender_name: senderName,
  sender_role: senderRole,
  type: n.type,
  title: n.title,
  content: n.message,
  action_url: null,
  related_id: n.relatedId || null,
  is_read: false,
  boss_id: bossId  // 添加 boss_id 字段
}))
```

## 修复内容

### 修改的文件
1. `supabase/migrations/19_fix_notifications_rls_for_manager.sql` - 新增迁移文件
2. `src/db/notificationApi.ts` - 修改 `createNotifications` 函数

### 新增的 RLS 策略

#### 1. Manager 创建通知策略
```sql
CREATE POLICY "Managers can create notifications for their drivers"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND is_manager(auth.uid())
  AND recipient_id IN (
    -- 只能给自己管理的仓库中的司机发送通知
    SELECT dw.driver_id 
    FROM driver_warehouses dw
    WHERE dw.warehouse_id IN (
      SELECT mw.warehouse_id 
      FROM manager_warehouses mw
      WHERE mw.manager_id = auth.uid()
    )
  )
);
```

**说明**：
- 车队长只能创建通知给自己管理的仓库中的司机
- 必须满足租户隔离（boss_id 匹配）
- 通过 `manager_warehouses` 和 `driver_warehouses` 表验证权限

#### 2. 用户查看通知策略
```sql
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND recipient_id = auth.uid()
);
```

**说明**：
- 用户只能查看自己的通知
- 必须满足租户隔离

#### 3. 用户更新通知策略
```sql
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND recipient_id = auth.uid()
)
WITH CHECK (
  boss_id = get_current_user_boss_id() 
  AND recipient_id = auth.uid()
);
```

**说明**：
- 用户只能更新自己的通知（主要用于标记已读）
- 必须满足租户隔离

#### 4. 用户删除通知策略
```sql
CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
TO authenticated
USING (
  boss_id = get_current_user_boss_id() 
  AND recipient_id = auth.uid()
);
```

**说明**：
- 用户只能删除自己的通知
- 必须满足租户隔离

## 验证结果

✅ 迁移应用成功
✅ 代码检查通过 (`pnpm run lint`)
✅ RLS 策略已更新

## 影响范围

此修复影响以下功能模块：
- 通知系统
- 仓库分配（主要问题）
- 车队长管理功能
- 司机通知接收

## 权限矩阵

| 角色 | 创建通知 | 查看通知 | 更新通知 | 删除通知 |
|------|---------|---------|---------|---------|
| super_admin | ✅ 所有租户通知 | ✅ 所有租户通知 | ✅ 所有租户通知 | ✅ 所有租户通知 |
| peer_admin | ✅ 所有租户通知 | ✅ 所有租户通知 | ✅ 所有租户通知 | ✅ 所有租户通知 |
| manager | ✅ 自己管理的司机 | ✅ 自己的通知 | ✅ 自己的通知 | ✅ 自己的通知 |
| driver | ❌ | ✅ 自己的通知 | ✅ 自己的通知 | ✅ 自己的通知 |

## 后续建议

1. **测试验证**：在实际环境中测试车队长创建通知功能
2. **监控日志**：监控通知创建失败的日志，确保没有其他权限问题
3. **文档更新**：更新权限文档，明确各角色的通知权限

## 修复日期

2025-11-05

## 修复状态

✅ 已完成
