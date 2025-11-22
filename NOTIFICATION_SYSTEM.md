# 实时通知系统

## 测试说明

### 首次测试

如果您是首次测试通知功能，页面加载时会自动显示3条欢迎通知：
1. 欢迎使用车队管家
2. 功能提示
3. 实时通知已启用

这些通知会在通知栏中自动滚动显示（每5秒切换一次）。

### 查看调试信息

打开浏览器开发者工具（F12）或微信开发者工具的控制台，您会看到以下调试日志：
- `🎯 检查欢迎通知标记` - 检查是否已显示过欢迎通知
- `✨ 开始添加欢迎通知` - 开始添加通知
- `📢 添加新通知` - 每次添加通知时的详细信息
- `📋 当前通知列表` - 当前所有通知的列表
- `🔔 NotificationBar 渲染` - 通知栏组件的渲染信息
- `✅ 欢迎通知添加完成` - 通知添加完成

如果没有看到通知栏，请检查控制台是否有错误信息。

### 清除缓存重新测试

如果您已经看过欢迎通知，想要重新测试，可以通过以下方式清除缓存：

**在浏览器中（H5）**：
- 打开浏览器开发者工具（F12）
- 进入 Application/应用 标签
- 找到 Storage/存储 > Local Storage
- 删除以下键：
  - `manager_welcome_shown`（管理员端）
  - `super_admin_welcome_shown`（超级管理员端）
  - `driver_welcome_shown`（司机端）
- 刷新页面

**在微信开发者工具中**：
- 点击工具栏的"清除缓存" > "清除数据缓存"
- 或在控制台执行：
  ```javascript
  Taro.removeStorageSync('manager_welcome_shown')
  Taro.removeStorageSync('super_admin_welcome_shown')
  Taro.removeStorageSync('driver_welcome_shown')
  ```
- 重新编译运行

## 功能概述

本系统实现了一个完整的实时通知功能，包括：

1. **实时数据库监听**：基于 Supabase Realtime 监听数据库变更
2. **动态通知栏**：在页面顶部显示最新的通知信息
3. **多端支持**：管理员端、超级管理员端和司机端都有独立的通知逻辑

## 核心组件

### 1. useNotifications Hook

位置：`src/hooks/useNotifications.ts`

功能：
- 管理通知数据（添加、标记已读、获取最新通知）
- 使用 localStorage 持久化通知数据
- 自动清理过期通知（7天前的通知）

使用方法：
```typescript
const {notifications, addNotification, markAsRead, getRecentNotifications} = useNotifications()

// 添加新通知
addNotification('新的请假申请', '司机提交了新的请假申请', 'leave_insert', 'leave_application', {applicationId: '123'})

// 标记为已读
markAsRead('notification-id')

// 获取最近的通知
const recent = getRecentNotifications(5)
```

### 2. useRealtimeNotifications Hook

位置：`src/hooks/useRealtimeNotifications.ts`

功能：
- 监听数据库实时变更
- 根据用户角色显示不同的通知
- 支持震动反馈和 Toast 提示
- 防抖机制避免重复通知

使用方法：
```typescript
useRealtimeNotifications({
  userId: user?.id || '',
  userRole: 'manager', // 或 'super_admin', 'driver'
  onLeaveApplicationChange: () => {
    // 刷新请假申请数据
  },
  onResignationApplicationChange: () => {
    // 刷新离职申请数据
  },
  onAttendanceChange: () => {
    // 刷新考勤数据
  },
  onNewNotification: addNotification // 添加到通知栏
})
```

### 3. NotificationBar 组件

位置：`src/components/NotificationBar/index.tsx`

功能：
- 显示最新的未读通知
- 自动滚动切换通知（每5秒）
- 点击通知可跳转到相应页面
- 支持不同类型的通知图标

使用方法：
```typescript
<NotificationBar
  notifications={getRecentNotifications(5)}
  onNotificationClick={(notification) => {
    markAsRead(notification.id)
    // 根据通知类型跳转
    if (notification.type === 'leave_application') {
      Taro.navigateTo({url: '/pages/manager/leave-approval/index'})
    }
  }}
/>
```

## 通知类型

系统支持以下通知类型：

1. **leave_application**：请假申请相关
   - `leave_insert`：新的请假申请
   - `leave_approved`：请假申请已通过
   - `leave_rejected`：请假申请已驳回

2. **resignation_application**：离职申请相关
   - `resignation_insert`：新的离职申请
   - `resignation_approved`：离职申请已通过
   - `resignation_rejected`：离职申请已驳回

3. **attendance**：考勤相关
   - `attendance_insert`：新的打卡记录

4. **approval**：审批结果通知

## 角色权限

### 管理员（manager）
- 监听：新的请假申请、离职申请、打卡记录
- 通知：收到新申请时显示通知

### 超级管理员（super_admin）
- 监听：新的请假申请、离职申请、打卡记录
- 通知：收到新申请时显示通知

### 司机（driver）
- 监听：自己的申请状态变化
- 通知：申请被批准或驳回时显示通知

## 集成位置

通知系统已集成到以下页面：

1. **管理员首页**：`src/pages/manager/index.tsx`
2. **超级管理员首页**：`src/pages/super-admin/index.tsx`
3. **司机首页**：`src/pages/driver/index.tsx`

## 技术特性

1. **实时性**：基于 Supabase Realtime，数据变更立即推送
2. **持久化**：通知数据保存在 localStorage，刷新页面不丢失
3. **防抖**：同一通知在短时间内不会重复显示
4. **自动清理**：7天前的通知自动清理
5. **震动反馈**：收到通知时震动提醒（仅小程序环境）
6. **Toast 提示**：收到通知时弹出提示

## 注意事项

1. 通知栏只显示未读通知
2. 点击通知后会自动标记为已读
3. 通知数据存储在 localStorage，不会占用服务器资源
4. 实时监听在页面显示时自动启动，页面隐藏时自动停止
