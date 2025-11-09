# 消息通知系统使用指南

## 系统概述

车队管家小程序的消息通知系统提供了完整的多端消息同步与提醒功能，包括：

1. **滚动提醒**：在管理端工作台顶部显示跑马灯式的实时通知
2. **信息中心**：集中管理所有历史消息
3. **自动通知**：在关键操作时自动发送通知给相关用户

## 通知类型

系统支持以下通知类型：

- `permission_change`: 权限变更
- `driver_info_update`: 司机信息修改
- `driver_created`: 新增司机
- `leave_approved`: 请假审批通过
- `leave_rejected`: 请假审批拒绝
- `warehouse_assigned`: 仓库分配
- `system_notice`: 系统通知

## 使用方法

### 1. 在代码中触发通知

导入通知辅助函数：

```typescript
import {
  notifyPermissionChange,
  notifyDriverInfoUpdate,
  notifyDriverCreated,
  notifyLeaveApproval,
  notifyWarehouseAssigned,
  notifySystemNotice
} from '@/utils/notificationHelper'
```

### 2. 权限变更通知

当超级管理员修改用户角色时：

```typescript
// 在 updateUserInfo 成功后调用
await notifyPermissionChange(
  userId,           // 被修改的用户ID
  operatorId,       // 操作者ID
  oldRole,          // 旧角色
  newRole           // 新角色
)
```

**通知对象**：
- 被修改的用户
- 操作者本人

### 3. 司机信息修改通知

当管理员修改司机个人信息时：

```typescript
// 在 updateUserInfo 成功后调用
await notifyDriverInfoUpdate(
  driverId,                           // 司机ID
  operatorId,                         // 操作者ID
  ['姓名', '手机号', '邮箱']           // 修改的字段列表
)
```

**通知对象**：
- 被修改的司机
- 操作者本人
- 所有超级管理员（如果操作者不是超级管理员）

### 4. 新增司机通知

当管理员添加新司机时：

```typescript
// 在创建用户成功后调用
await notifyDriverCreated(
  newDriverId,      // 新司机ID
  operatorId        // 操作者ID
)
```

**通知对象**：
- 新司机本人
- 操作者本人
- 所有超级管理员（如果操作者是普通管理员）

### 5. 请假审批通知

当管理员审批请假申请时：

```typescript
// 在审批操作成功后调用
await notifyLeaveApproval(
  applicantId,      // 申请人ID
  approverId,       // 审批人ID
  approved,         // 是否通过（true/false）
  leaveType,        // 请假类型
  startDate,        // 开始日期
  endDate           // 结束日期
)
```

**通知对象**：
- 申请人
- 审批人本人

### 6. 仓库分配通知

当超级管理员分配司机到仓库时：

```typescript
// 在分配操作成功后调用
await notifyWarehouseAssigned(
  driverId,         // 司机ID
  warehouseId,      // 仓库ID
  warehouseName,    // 仓库名称
  operatorId        // 操作者ID
)
```

**通知对象**：
- 被分配的司机
- 操作者本人

### 7. 系统通知（广播）

发送系统级通知给所有用户或特定角色：

```typescript
// 发送给所有用户
await notifySystemNotice(
  '系统维护通知',
  '系统将于今晚22:00-23:00进行维护，期间可能无法使用'
)

// 发送给特定角色
await notifySystemNotice(
  '管理员培训通知',
  '本周五下午3点将举行管理员培训，请准时参加',
  'manager'  // 只发送给普通管理员
)
```

**通知对象**：
- 所有用户（不传 targetRole）
- 特定角色的所有用户（传入 targetRole）

## 集成示例

### 示例1：在编辑用户信息页面集成

```typescript
// src/pages/super-admin/edit-user/index.tsx

import {notifyDriverInfoUpdate, notifyPermissionChange} from '@/utils/notificationHelper'

const handleSave = async () => {
  // ... 表单验证 ...

  const oldRole = userInfo.role
  const newRole = role

  const success = await updateUserInfo(userId, {
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim() || undefined,
    role
  })

  if (success) {
    // 如果角色发生变化，发送权限变更通知
    if (oldRole !== newRole) {
      await notifyPermissionChange(userId, user.id, oldRole, newRole)
    }

    // 如果修改了其他信息，发送信息修改通知
    const modifiedFields: string[] = []
    if (name.trim() !== userInfo.name) modifiedFields.push('姓名')
    if (phone.trim() !== userInfo.phone) modifiedFields.push('手机号')
    if (email.trim() !== userInfo.email) modifiedFields.push('邮箱')

    if (modifiedFields.length > 0) {
      await notifyDriverInfoUpdate(userId, user.id, modifiedFields)
    }

    Taro.showToast({title: '保存成功', icon: 'success'})
    setTimeout(() => {
      Taro.navigateBack()
    }, 1500)
  }
}
```

### 示例2：在请假审批页面集成

```typescript
// src/pages/manager/leave-approval/index.tsx

import {notifyLeaveApproval} from '@/utils/notificationHelper'

const handleApprove = async (applicationId: string) => {
  const application = applications.find(a => a.id === applicationId)
  if (!application) return

  const success = await reviewLeaveApplication({
    applicationId,
    status: 'approved',
    reviewerId: user.id,
    reviewComment: '同意'
  })

  if (success) {
    // 发送审批通知
    await notifyLeaveApproval(
      application.user_id,
      user.id,
      true,
      application.type,
      application.start_date,
      application.end_date
    )

    Taro.showToast({title: '已批准', icon: 'success'})
    loadApplications()
  }
}
```

## 滚动提醒特性

1. **自动显示**：有新通知时自动在工作台顶部显示
2. **跑马灯效果**：文字从右向左滚动，循环播放
3. **自动消失**：5分钟后自动消失
4. **手动关闭**：点击关闭按钮立即停止
5. **点击跳转**：点击通知内容跳转到信息中心并标记为已读

## 信息中心功能

1. **消息列表**：显示所有历史消息，按时间倒序排列
2. **未读标识**：未读消息有明显的视觉标识
3. **类型筛选**：可按通知类型筛选消息
4. **标记已读**：单条或全部标记为已读
5. **删除消息**：支持删除单条消息

## 注意事项

1. **异步调用**：所有通知函数都是异步的，建议使用 `await` 等待完成
2. **错误处理**：通知函数内部已包含错误处理，失败不会影响主流程
3. **性能考虑**：批量通知使用 `createNotifications` 而不是循环调用 `createNotification`
4. **权限控制**：通知的创建受 RLS 策略保护，只有管理员可以创建通知

## 数据库表结构

```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                    -- 接收用户ID
  type notification_type NOT NULL,          -- 通知类型
  title text NOT NULL,                      -- 标题
  content text NOT NULL,                    -- 内容
  related_user_id uuid,                     -- 相关用户ID（如操作者）
  related_data jsonb DEFAULT '{}'::jsonb,   -- 相关数据
  is_read boolean DEFAULT false,            -- 是否已读
  is_dismissed boolean DEFAULT false,       -- 是否已关闭滚动提醒
  created_at timestamptz DEFAULT now(),     -- 创建时间
  expires_at timestamptz DEFAULT (now() + interval '5 minutes')  -- 过期时间
);
```

## API 函数

### 基础 API

```typescript
// 创建单条通知
await createNotification(input: NotificationInput)

// 批量创建通知
await createNotifications(inputs: NotificationInput[])

// 获取用户的所有通知
await getUserNotifications(userId: string)

// 获取未读通知数量
await getUnreadNotificationCount(userId: string)

// 获取活跃的滚动提醒
await getActiveScrollNotification(userId: string)

// 标记通知为已读
await markNotificationAsRead(notificationId: string)

// 标记所有通知为已读
await markAllNotificationsAsRead(userId: string)

// 关闭滚动提醒
await dismissScrollNotification(notificationId: string)

// 删除通知
await deleteNotification(notificationId: string)

// 批量删除通知
await deleteNotifications(notificationIds: string[])
```

## 未来扩展

可以考虑添加以下功能：

1. **实时推送**：使用 Supabase Realtime 实现实时通知推送
2. **消息优先级**：区分重要和普通消息
3. **消息模板**：预定义常用消息模板
4. **通知偏好设置**：允许用户自定义接收哪些类型的通知
5. **消息统计**：统计各类型消息的发送和阅读情况
