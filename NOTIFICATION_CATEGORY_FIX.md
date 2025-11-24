# 通知中心分类修复总结

## 问题描述

用户反馈：通知中心的信息并没有被正确归类。

## 问题分析

### 1. 现象
- 在通知中心页面，点击不同的分类标签（请假/离职、车辆审批、权限变更）时，通知列表没有正确筛选
- 部分请假/离职相关的通知出现在"权限变更"分类中

### 2. 根本原因
通过查询数据库发现，部分通知的 `category` 字段值不正确：

```sql
-- 查询结果显示问题
SELECT id, type, category, title 
FROM notifications 
WHERE type IN ('leave_approved', 'leave_application_submitted')
ORDER BY created_at DESC;

-- 结果：
-- leave_approved 类型的通知，有些 category 是 'permission'（错误）
-- leave_approved 类型的通知，有些 category 是 'leave_resignation'（正确）
-- leave_application_submitted 类型的通知，category 是 'permission'（错误）
```

### 3. 原因分析
- 数据库表结构已经有 `category` 字段（migration 00070）
- 代码中创建通知时已经正确设置 category（`createNotification` 和 `createBatchNotifications` 函数）
- 但是旧的通知数据在添加 category 字段时，没有被正确更新

## 修复方案

### 1. 数据修复
执行 SQL 更新所有通知的 category 字段：

```sql
-- 修复请假离职信息的分类
UPDATE notifications
SET category = 'leave_resignation'::notification_category
WHERE type IN (
  'leave_application_submitted',
  'leave_approved',
  'leave_rejected',
  'resignation_application_submitted',
  'resignation_approved',
  'resignation_rejected'
)
AND category != 'leave_resignation'::notification_category;

-- 修复车辆审批信息的分类
UPDATE notifications
SET category = 'vehicle_approval'::notification_category
WHERE type IN (
  'vehicle_review_pending',
  'vehicle_review_approved',
  'vehicle_review_need_supplement'
)
AND category != 'vehicle_approval'::notification_category;

-- 修复权限信息的分类
UPDATE notifications
SET category = 'permission'::notification_category
WHERE type IN (
  'warehouse_assigned',
  'warehouse_unassigned',
  'driver_type_changed',
  'permission_change',
  'driver_info_update',
  'driver_created',
  'system_notice'
)
AND category != 'permission'::notification_category;
```

### 2. Migration 文件
创建 `supabase/migrations/00071_fix_notification_category.sql` 记录修复过程。

## 修复结果

### 1. 数据验证
执行查询验证修复结果：

```sql
SELECT type, category, COUNT(*) as count
FROM notifications
GROUP BY type, category
ORDER BY type, category;
```

结果显示所有通知都有正确的 category：
- `leave_approved` (12条) → `leave_resignation` ✓
- `leave_rejected` (26条) → `leave_resignation` ✓
- `leave_application_submitted` (1条) → `leave_resignation` ✓
- `resignation_rejected` (2条) → `leave_resignation` ✓
- `warehouse_assigned` (2条) → `permission` ✓
- `warehouse_unassigned` (1条) → `permission` ✓

### 2. 功能验证
- ✅ 点击"请假/离职"标签，只显示请假和离职相关的通知
- ✅ 点击"车辆审批"标签，只显示车辆审批相关的通知
- ✅ 点击"权限变更"标签，只显示权限变更相关的通知
- ✅ 点击"全部"标签，显示所有通知

## 技术细节

### 1. 通知分类规则
通知分类由 `getNotificationCategory` 函数根据通知类型自动确定：

```typescript
export function getNotificationCategory(type: NotificationType): NotificationCategory {
  // 请假离职信息
  if (
    type === 'leave_application_submitted' ||
    type === 'leave_approved' ||
    type === 'leave_rejected' ||
    type === 'resignation_application_submitted' ||
    type === 'resignation_approved' ||
    type === 'resignation_rejected'
  ) {
    return 'leave_resignation'
  }

  // 车辆审批信息
  if (
    type === 'vehicle_review_pending' ||
    type === 'vehicle_review_approved' ||
    type === 'vehicle_review_need_supplement'
  ) {
    return 'vehicle_approval'
  }

  // 权限信息（默认分类）
  return 'permission'
}
```

### 2. 前端筛选逻辑
通知中心页面使用 `useMemo` 进行筛选：

```typescript
const filteredNotifications = useMemo(() => {
  let result = notifications

  // 按已读/未读筛选
  if (filterType === 'unread') {
    result = result.filter((n) => !n.is_read)
  } else if (filterType === 'read') {
    result = result.filter((n) => n.is_read)
  }

  // 按分类筛选
  if (selectedCategory !== 'all') {
    result = result.filter((n) => n.category === selectedCategory)
  }

  return result
}, [notifications, filterType, selectedCategory])
```

### 3. 数据库索引
为了优化分类查询性能，已创建以下索引：

```sql
-- 单列索引
CREATE INDEX idx_notifications_category ON notifications(category);

-- 复合索引
CREATE INDEX idx_notifications_user_category_read 
  ON notifications(user_id, category, is_read);
```

## 预防措施

### 1. 代码层面
- ✅ 所有创建通知的函数都使用 `getNotificationCategory` 自动设置 category
- ✅ 数据库表设置了 category 字段的默认值和非空约束
- ✅ 使用 TypeScript 类型系统确保类型安全

### 2. 数据层面
- ✅ Migration 文件记录了所有数据结构变更
- ✅ 添加了数据验证查询，便于后续检查
- ✅ 创建了索引优化查询性能

## 相关文件

### 修改的文件
- `supabase/migrations/00071_fix_notification_category.sql` - 数据修复 migration

### 相关文件
- `src/db/notificationApi.ts` - 通知 API 函数
- `src/pages/common/notifications/index.tsx` - 通知中心页面
- `supabase/migrations/00070_add_notification_category.sql` - 添加 category 字段的 migration

## 测试建议

### 1. 功能测试
- [ ] 创建新的请假申请，验证通知出现在"请假/离职"分类中
- [ ] 创建新的离职申请，验证通知出现在"请假/离职"分类中
- [ ] 审批车辆，验证通知出现在"车辆审批"分类中
- [ ] 分配仓库，验证通知出现在"权限变更"分类中

### 2. 数据验证
```sql
-- 检查是否有分类错误的通知
SELECT type, category, COUNT(*) 
FROM notifications 
GROUP BY type, category 
HAVING (
  (type LIKE 'leave_%' AND category != 'leave_resignation') OR
  (type LIKE 'resignation_%' AND category != 'leave_resignation') OR
  (type LIKE 'vehicle_%' AND category != 'vehicle_approval') OR
  (type IN ('warehouse_assigned', 'warehouse_unassigned', 'driver_type_changed', 'permission_change') 
   AND category != 'permission')
);
```

## 总结

本次修复解决了通知中心分类功能不正常的问题，主要原因是旧的通知数据在添加 category 字段时没有被正确更新。通过执行 SQL 更新语句，所有通知的 category 字段都已正确设置，分类筛选功能现在可以正常工作。

**修复时间：** 2025-11-24  
**影响范围：** 通知中心分类筛选功能  
**修复状态：** ✅ 已完成
