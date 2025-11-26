# 通知系统修复总结

## 问题描述

用户报告通知中心功能出现错误：
```
logger.ts:132 ❌ [2025-11-26 15:19:32.210] [ERROR] [NotificationAPI] [User:c61e6b8a] 查询用户通知失败 
{code: '42703', details: null, hint: null, message: 'column notifications.user_id does not exist'}
```

## 根本原因

系统中存在两个不同版本的通知表结构：

1. **旧的通知表**（迁移文件 00037）：
   - 使用 `user_id` 字段
   - 使用 `message` 字段
   - 使用 `notification_type` 枚举类型

2. **新的通知表**（迁移文件 00177）：
   - 使用 `recipient_id` 字段
   - 使用 `content` 字段
   - 添加了 `sender_id`, `sender_name`, `sender_role` 字段
   - 使用 `text` 类型而不是枚举类型

最新的迁移文件（00177）使用了 `DROP TABLE IF EXISTS notifications CASCADE`，这意味着数据库中只有新表结构。但是，旧的 `notificationApi.ts` 代码还在使用旧的字段名，导致查询失败。

## 修复内容

### 1. 更新 `src/db/notificationApi.ts`

#### 1.1 更新 `Notification` 接口
```typescript
export interface Notification {
  id: string
  recipient_id: string // 改为recipient_id以匹配新表结构
  sender_id: string // 新增
  sender_name: string // 新增
  sender_role: string // 新增
  type: NotificationType | string // 支持字符串类型
  category: NotificationCategory
  title: string
  content: string // 改为content以匹配新表结构
  action_url: string | null // 新增
  related_id: string | null
  is_read: boolean
  created_at: string
  updated_at?: string // 新增
}
```

#### 1.2 更新查询函数
- `getUserNotifications`: 将 `user_id` 改为 `recipient_id`
- `getUnreadNotificationCount`: 将 `user_id` 改为 `recipient_id`
- `markAllNotificationsAsRead`: 将 `user_id` 改为 `recipient_id`
- `deleteReadNotifications`: 将 `user_id` 改为 `recipient_id`
- `subscribeToNotifications`: 将 `user_id` 改为 `recipient_id`

#### 1.3 更新创建函数
- `createNotification`: 
  - 获取当前用户信息作为发送者
  - 将 `user_id` 改为 `recipient_id`
  - 将 `message` 改为 `content`
  - 添加 `sender_id`, `sender_name`, `sender_role` 字段
  
- `createNotifications`: 
  - 获取当前用户信息作为发送者
  - 将 `user_id` 改为 `recipient_id`
  - 将 `message` 改为 `content`
  - 添加 `sender_id`, `sender_name`, `sender_role` 字段

#### 1.4 更新类型检查函数
将以下函数的参数类型从 `NotificationType` 改为 `NotificationType | string`：
- `isNotificationPending`
- `isNotificationProcessed`
- `getNotificationProcessStatus`
- `getNotificationStatusLabel`
- `getNotificationStatusColor`
- `getNotificationCategory`

### 2. 更新组件

#### 2.1 `src/components/RealNotificationBar/index.tsx`
- 将 `currentNotification.message` 改为 `currentNotification.content`

#### 2.2 `src/pages/common/notifications/index.tsx`
- 将 `notification.message` 改为 `notification.content`

#### 2.3 `src/pages/shared/notification-center/index.tsx`
- 将 `notification.message` 改为 `notification.content`

### 3. 修复 `src/db/types.ts`
- 移除 `VehicleRecordWithDetails` 接口中重复定义的字段

## 测试结果

运行 `pnpm run lint` 后，所有类型错误都已修复，没有报告任何错误。

## 影响范围

此修复影响以下文件：
1. `src/db/notificationApi.ts` - 核心通知API
2. `src/db/types.ts` - 类型定义
3. `src/components/RealNotificationBar/index.tsx` - 通知栏组件
4. `src/pages/common/notifications/index.tsx` - 通知中心页面
5. `src/pages/shared/notification-center/index.tsx` - 共享通知中心页面

## 向后兼容性

为了保持向后兼容性，我们：
1. 保持了旧的函数签名（如 `createNotification` 的参数列表）
2. 在函数内部自动获取发送者信息，填充新的必需字段
3. 支持 `NotificationType | string` 类型，以兼容新旧通知类型

## 后续建议

1. 清理旧的迁移文件，只保留最新的通知表结构
2. 考虑将所有通知类型统一为字符串类型，而不是枚举类型
3. 更新文档，说明新的通知表结构和字段含义
4. 测试所有通知相关功能，确保正常工作
