# 通知中心页面总结

## 当前系统中的通知相关页面

项目中共有 **7个** 通知相关的页面，分为两大类：

### 一、通知中心页面（接收通知）- 3个

这些页面用于用户查看和管理自己收到的通知：

#### 1. `/pages/common/notifications/index.tsx`
- **页面标题**: 通知中心
- **功能**: 通用通知中心页面，网格布局版本
- **特点**:
  - 顶部横列：信息分类导航（请假/离职、车辆审批、权限变更）
  - 左侧竖列：状态筛选区（未读、已读、全部、清空）
  - 右侧主内容区：通知列表
  - 支持分类筛选、状态筛选、清空已读通知
  - 显示通知的标题、内容、时间等信息
- **使用场景**: 普通管理员和超级管理员使用

#### 2. `/pages/driver/notifications/index.tsx`
- **页面标题**: 通知中心
- **功能**: 司机端通知中心页面
- **特点**:
  - 简化版的通知列表
  - 显示未读通知数量
  - 支持标记已读
- **使用场景**: 司机端使用

#### 3. `/pages/shared/notification-center/index.tsx`
- **页面标题**: 通知中心
- **功能**: 共享通知中心页面，网格布局版本
- **特点**:
  - 与 `common/notifications` 功能完全相同
  - 顶部横列：信息分类导航
  - 左侧竖列：状态筛选区
  - 右侧主内容区：通知列表
- **使用场景**: 共享页面，可能用于多角色访问
- **⚠️ 注意**: 此页面与 `common/notifications` 功能重复

### 二、通知管理页面（发送通知）- 4个

这些页面用于管理员发送和管理通知：

#### 4. `/pages/shared/driver-notification/index.tsx`
- **页面标题**: 司机通知
- **功能**: 向司机发送通知的管理页面
- **使用场景**: 管理员向司机发送通知

#### 5. `/pages/shared/notification-templates/index.tsx`
- **页面标题**: 通知模板
- **功能**: 管理通知模板
- **使用场景**: 管理员创建和管理可重复使用的通知模板

#### 6. `/pages/shared/scheduled-notifications/index.tsx`
- **页面标题**: 定时通知
- **功能**: 管理定时发送的通知
- **使用场景**: 管理员设置定时通知任务

#### 7. `/pages/shared/notification-records/index.tsx`
- **页面标题**: 发送记录
- **功能**: 查看通知发送历史记录
- **使用场景**: 管理员查看已发送的通知记录

## 问题分析

### 重复页面问题

发现 **2个功能完全相同的通知中心页面**：

1. `/pages/common/notifications/index.tsx`
2. `/pages/shared/notification-center/index.tsx`

这两个页面的代码几乎完全相同，都是：
- 网格布局
- 相同的分类导航
- 相同的状态筛选
- 相同的通知列表展示
- 相同的操作功能

### 建议

#### 方案1：合并重复页面（推荐）
- 删除其中一个页面
- 更新所有引用该页面的导航链接
- 统一使用一个通知中心页面

#### 方案2：明确区分功能
如果确实需要两个页面，应该明确区分它们的功能：
- `common/notifications`: 用于普通管理员和超级管理员
- `shared/notification-center`: 用于特定场景或特定角色
- 在代码中添加注释说明两者的区别

## 页面使用关系

### 司机端
- 查看通知: `/pages/driver/notifications/index.tsx`

### 管理员端
- 查看通知: `/pages/common/notifications/index.tsx` 或 `/pages/shared/notification-center/index.tsx`
- 发送通知: `/pages/shared/driver-notification/index.tsx`
- 管理模板: `/pages/shared/notification-templates/index.tsx`
- 定时通知: `/pages/shared/scheduled-notifications/index.tsx`
- 发送记录: `/pages/shared/notification-records/index.tsx`

## 修复状态

所有通知中心页面已经更新为使用新的通知表结构：
- ✅ `common/notifications` - 已将 `message` 改为 `content`
- ✅ `shared/notification-center` - 已将 `message` 改为 `content`
- ✅ `driver/notifications` - 使用 `@/db/api` 中的函数，已经使用 `recipient_id`

### 通知API状态

项目中有两套通知API：

1. **`@/db/notificationApi.ts`** - 旧的通知API（已更新）
   - 被 `common/notifications` 和 `shared/notification-center` 使用
   - 已更新所有字段名：`user_id` → `recipient_id`, `message` → `content`
   - 已更新所有类型签名以支持 `string` 类型

2. **`@/db/api.ts`** - 新的通知API
   - 被 `driver/notifications` 使用
   - 已经使用新的字段名 `recipient_id`
   - 函数包括：`getNotifications`, `markNotificationAsRead`, `getUnreadNotificationCount` 等

## 下一步行动

1. ✅ ~~检查 `driver/notifications` 页面是否也需要更新字段名~~ - 已确认使用正确的API
2. 决定是否合并重复的通知中心页面（`common/notifications` 和 `shared/notification-center`）
3. 测试所有通知功能是否正常工作
4. 考虑统一使用一套通知API（建议使用 `@/db/api.ts`）
