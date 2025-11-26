# 通知中心功能实现文档

## 功能概述

本次实现了完整的通知中心功能，包括：
1. 通知数据库表结构设计
2. 通知管理API函数
3. 实名提醒通知功能
4. 通知中心UI界面
5. 通知铃铛组件更新

## 数据库设计

### notifications表结构

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('manager', 'super_admin', 'system')),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS策略

- 用户可以查看自己收到的通知
- 用户可以更新自己收到的通知（标记已读）
- 用户可以删除自己收到的通知
- 管理员和老板可以创建通知

## API函数

### 核心API函数（src/db/api.ts）

1. **createNotificationRecord**: 创建通知记录
2. **getNotifications**: 获取用户的通知列表
3. **getUnreadNotificationCount**: 获取未读通知数量
4. **markNotificationAsRead**: 标记单个通知为已读
5. **markAllNotificationsAsRead**: 标记所有通知为已读
6. **deleteNotification**: 删除通知
7. **sendVerificationReminder**: 发送实名提醒通知

### TypeScript类型定义（src/db/types.ts）

```typescript
export type SenderRole = 'manager' | 'super_admin' | 'system'

export interface Notification {
  id: string
  recipient_id: string
  sender_id: string
  sender_name: string
  sender_role: SenderRole
  type: string
  title: string
  content: string
  action_url: string | null
  is_read: boolean
  created_at: string
  updated_at: string
}

export interface CreateNotificationInput {
  recipient_id: string
  sender_id: string
  sender_name: string
  sender_role: SenderRole
  type: string
  title: string
  content: string
  action_url?: string
}
```

## UI实现

### 1. 通知中心页面（src/pages/driver/notifications/index.tsx）

功能特性：
- 显示通知列表，按时间倒序排列
- 未读通知有蓝色左边框标识
- 显示未读通知数量徽章
- 支持标记单个通知为已读
- 支持标记所有通知为已读
- 支持删除通知
- 点击通知可跳转到相关页面
- 显示相对时间（如"5分钟前"、"昨天"等）
- 显示发送人信息

### 2. 通知铃铛组件（src/components/notification/NotificationBell.tsx）

功能特性：
- 显示纯铃铛图标
- 有未读消息时显示橙色并抖动
- 无未读消息时显示绿色
- 点击跳转到通知中心
- 页面显示时自动刷新未读数量

### 3. 实名通知按钮

#### 车队长端（src/pages/manager/driver-management/index.tsx）
- 在未实名司机卡片上显示"实名通知"按钮
- 按钮居中显示
- 点击后发送实名提醒通知给司机

#### 老板端（src/pages/super-admin/staff-management/index.tsx）
- 在未实名司机卡片上显示"实名通知"按钮
- 按钮居中显示
- 点击后发送实名提醒通知给司机

## 通知内容格式

实名提醒通知的内容格式：
```
{操作人}要求您尽快完成实名和车辆录入
```

其中：
- `{操作人}`：发送通知的管理员或老板的真实姓名
- 通知类型：`verification_reminder`
- 标题：`实名提醒`
- 跳转链接：`/pages/driver/vehicle-list/index`（车辆管理页面）

## 工具函数

### formatDistanceToNow（src/utils/dateFormat.ts）

将时间戳转换为相对时间描述：
- 刚刚（< 1分钟）
- X分钟前（< 1小时）
- X小时前（< 1天）
- 昨天（1天前）
- X天前（< 1周）
- X周前（< 1月）
- X个月前（< 1年）
- X年前（>= 1年）

## 路由配置

在`src/app.config.ts`中添加了通知中心页面路由：
```typescript
'pages/driver/notifications/index'
```

## 使用流程

### 管理员/老板发送实名通知
1. 进入司机管理页面
2. 找到未实名的司机卡片
3. 点击"实名通知"按钮
4. 系统发送通知给司机

### 司机接收和处理通知
1. 司机首页的通知铃铛显示未读数量
2. 点击铃铛进入通知中心
3. 查看实名提醒通知
4. 点击通知跳转到车辆管理页面
5. 完成实名和车辆录入

## 技术亮点

1. **完整的通知系统**：从数据库设计到UI实现的完整解决方案
2. **权限控制**：使用RLS策略确保通知安全
3. **用户体验**：相对时间显示、未读标识、一键已读等功能
4. **类型安全**：完整的TypeScript类型定义
5. **实时更新**：页面显示时自动刷新通知状态
6. **跳转功能**：通知可以携带跳转链接，点击后直接跳转到相关页面

## 后续优化建议

1. **实时推送**：集成WebSocket或Supabase Realtime实现实时通知推送
2. **通知分类**：支持按通知类型筛选
3. **批量操作**：支持批量删除、批量标记已读
4. **通知模板**：支持自定义通知模板
5. **通知统计**：添加通知发送统计和分析功能
