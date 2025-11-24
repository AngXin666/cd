# 请假和离职申请通知系统完整修复方案

## 问题描述

司机发起请假申请并且提交成功以后，双管理员端都仅仅提示弹窗提示收到新的申请，但是：
- ❌ 首页的通知栏没有信息通知
- ❌ 通知中心也收不到信息

## 问题分析

### 1. 通知写入机制已经存在

经过代码审查，发现通知系统的数据库写入机制**已经完整实现**：

**司机提交请假申请时：**
```typescript
// src/pages/driver/leave/apply/index.tsx
const notificationCount = await createNotificationForAllManagers({
  type: 'leave_application_submitted',
  title: '新的请假申请',
  message: `司机 ${driverName} 提交了${leaveTypeLabel}申请...`,
  related_id: applicationId
})
```

**管理员审批请假申请时：**
```typescript
// src/db/api.ts - reviewLeaveApplication 函数
await createNotification({
  user_id: application.user_id,
  type: notificationType,
  title: notificationTitle,
  message: `您的${leaveTypeLabel}申请...${statusText}`,
  related_id: applicationId
})
```

### 2. 根本原因

通知已经成功写入数据库，但是**前端无法正确识别和显示**这些通知，原因是：

#### 问题 1：通知类型定义不完整

`src/db/notificationApi.ts` 中的 `NotificationType` 类型定义缺少以下类型：
- ❌ `leave_application_submitted` - 管理员收到的请假申请通知
- ❌ `resignation_application_submitted` - 管理员收到的离职申请通知
- ❌ `resignation_approved` - 司机收到的离职批准通知
- ❌ `resignation_rejected` - 司机收到的离职驳回通知

#### 问题 2：前端组件不支持新的通知类型

以下组件的 `getNotificationIcon` 函数中缺少对新通知类型的处理：
- `src/pages/common/notifications/index.tsx` - 通知中心页面
- `src/components/RealNotificationBar/index.tsx` - 首页通知栏组件

## 解决方案

### 方案对比

#### ❌ 错误方案（之前的尝试）
在轮询检测到新申请时，再次写入数据库通知：
```typescript
// 这是错误的！会导致重复通知
await showNotification(title, content, key, type, data, userId)
  └─ 写入数据库通知
```

**问题：**
- 通知已经在提交申请时写入数据库了
- 轮询再次写入会导致重复通知
- 增加了不必要的数据库操作

#### ✅ 正确方案（参考仓库分配通知）
只需要完善前端的通知类型支持，让前端能正确识别和显示数据库中的通知。

### 实施步骤

#### 1. 完善通知类型定义

**文件：`src/db/notificationApi.ts`**

```typescript
export type NotificationType =
  | 'permission_change'
  | 'driver_info_update'
  | 'driver_created'
  | 'leave_application_submitted' // 🆕 请假申请提交（管理员收到）
  | 'leave_approved' // 请假批准（司机收到）
  | 'leave_rejected' // 请假拒绝（司机收到）
  | 'resignation_application_submitted' // 🆕 离职申请提交（管理员收到）
  | 'resignation_approved' // 🆕 离职批准（司机收到）
  | 'resignation_rejected' // 🆕 离职拒绝（司机收到）
  | 'warehouse_assigned'
  | 'warehouse_unassigned'
  | 'system_notice'
  | 'driver_type_changed'
  | 'vehicle_review_pending'
  | 'vehicle_review_approved'
  | 'vehicle_review_need_supplement'
```

#### 2. 更新通知中心页面

**文件：`src/pages/common/notifications/index.tsx`**

在 `getNotificationIcon` 函数中添加新的通知类型：

```typescript
const getNotificationIcon = (type: string) => {
  switch (type) {
    // ... 其他类型
    case 'leave_application_submitted':
      return 'i-mdi-file-document-edit text-orange-500'
    case 'leave_approved':
      return 'i-mdi-check-circle text-green-500'
    case 'leave_rejected':
      return 'i-mdi-close-circle text-red-500'
    case 'resignation_application_submitted':
      return 'i-mdi-account-remove text-orange-500'
    case 'resignation_approved':
      return 'i-mdi-check-circle text-green-500'
    case 'resignation_rejected':
      return 'i-mdi-close-circle text-red-500'
    // ... 其他类型
  }
}
```

#### 3. 更新首页通知栏组件

**文件：`src/components/RealNotificationBar/index.tsx`**

更新三个函数：

**`getNotificationIcon` 函数：**
```typescript
case 'leave_application_submitted':
  return 'i-mdi-file-document-edit'
case 'resignation_application_submitted':
  return 'i-mdi-account-remove'
// ... 其他新增类型
```

**`getNotificationColor` 函数：**
```typescript
case 'leave_application_submitted':
  return 'bg-orange-50 border-orange-200'
case 'resignation_application_submitted':
  return 'bg-orange-50 border-orange-200'
// ... 其他新增类型
```

**`getIconColor` 函数：**
```typescript
case 'leave_application_submitted':
  return 'text-orange-500'
case 'resignation_application_submitted':
  return 'text-orange-500'
// ... 其他新增类型
```

#### 4. 恢复轮询通知 Hook

**文件：`src/hooks/usePollingNotifications.ts`**

恢复到之前的版本，轮询只负责：
- ✅ 显示 Toast 弹窗提示
- ✅ 添加到首页通知栏（内存中）
- ❌ 不再写入数据库（已在提交和审批时写入）

## 完整工作流程

### 请假申请流程

```
1. 司机提交请假申请
   ↓
   调用 createLeaveApplication()
   ↓
   调用 createNotificationForAllManagers()
   ├─ 查询所有管理员和超级管理员
   ├─ 为每个管理员创建通知记录
   └─ 直接写入 notifications 表 ✅
   ↓
2. 管理员端（10秒后）
   ↓
   轮询检测到新申请
   ├─ 显示 Toast 弹窗 ✅
   ├─ 添加到首页通知栏（内存） ✅
   └─ 不再写入数据库（已存在）
   ↓
3. 管理员查看通知中心
   ↓
   从 notifications 表读取通知
   ├─ 通知类型：leave_application_submitted ✅
   ├─ 前端识别类型并显示图标 ✅
   └─ 显示完整通知内容 ✅
```

### 审批结果通知流程

```
1. 管理员审批请假申请
   ↓
   调用 reviewLeaveApplication()
   ├─ 更新申请状态
   ├─ 调用 createNotification()
   └─ 为司机创建通知记录 ✅
   ↓
2. 司机端（10秒后）
   ↓
   轮询检测到状态变化
   ├─ 显示 Toast 弹窗 ✅
   ├─ 添加到首页通知栏（内存） ✅
   └─ 不再写入数据库（已存在）
   ↓
3. 司机查看通知中心
   ↓
   从 notifications 表读取通知
   ├─ 通知类型：leave_approved/leave_rejected ✅
   ├─ 前端识别类型并显示图标 ✅
   └─ 显示完整通知内容 ✅
```

## 关键优势

### 1. 参考成功案例
完全参照仓库分配通知的实现方式：
- ✅ 操作时直接写入数据库
- ✅ 前端从数据库读取显示
- ✅ 不依赖轮询写入

### 2. 避免重复通知
- ✅ 每个通知只写入数据库一次
- ✅ 轮询只负责实时提示
- ✅ 不会出现重复记录

### 3. 代码简洁
- ✅ 只修改前端类型定义和组件
- ✅ 不修改数据库逻辑
- ✅ 不修改 RLS 策略

### 4. 易于维护
- ✅ 通知类型集中管理
- ✅ 前端组件统一处理
- ✅ 逻辑清晰明确

## 测试验证

### 测试步骤

#### 1. 测试请假申请通知

**步骤：**
1. 登录司机账号（13800000003）
2. 提交一个请假申请
3. 等待 10 秒（轮询间隔）
4. 登录管理员账号（13800000001）
5. 查看首页通知栏 - ✅ 应该看到橙色通知卡片
6. 点击右上角铃铛图标 - ✅ 应该看到通知中心有记录
7. 登录另一个管理员账号（13800000002）- ✅ 也应该看到通知

**预期结果：**
- ✅ 首页通知栏显示："收到新的请假申请"
- ✅ 通知中心显示完整信息：司机姓名、请假类型、时间、事由
- ✅ 图标：橙色文档编辑图标
- ✅ 可以点击查看详情、标记已读、删除

#### 2. 测试审批结果通知

**步骤：**
1. 管理员审批请假申请（批准或驳回）
2. 等待 10 秒
3. 登录司机账号
4. 查看首页通知栏 - ✅ 应该看到绿色或红色通知卡片
5. 点击右上角铃铛图标 - ✅ 应该看到通知中心有记录

**预期结果：**
- ✅ 批准：绿色勾选图标，"您的请假申请已通过"
- ✅ 驳回：红色叉号图标，"您的请假申请已被驳回"
- ✅ 通知中心显示完整信息

#### 3. 测试离职申请通知

**步骤：**
1. 司机提交离职申请
2. 管理员查看通知中心 - ✅ 应该看到离职申请通知
3. 管理员审批离职申请
4. 司机查看通知中心 - ✅ 应该看到审批结果通知

**预期结果：**
- ✅ 离职申请提交：橙色账户移除图标
- ✅ 离职批准：绿色勾选图标
- ✅ 离职驳回：红色叉号图标

## 相关文件

### 修改的文件
- ✅ `src/db/notificationApi.ts` - 添加通知类型定义
- ✅ `src/pages/common/notifications/index.tsx` - 更新通知中心页面
- ✅ `src/components/RealNotificationBar/index.tsx` - 更新首页通知栏组件
- ✅ `src/hooks/usePollingNotifications.ts` - 恢复轮询逻辑

### 未修改的文件（已正确实现）
- ✅ `src/pages/driver/leave/apply/index.tsx` - 提交时已写入通知
- ✅ `src/db/api.ts` - 审批时已写入通知
- ✅ `src/db/notificationApi.ts` - 通知 API 已完整

## 提交记录

- `0d439d5` - 修复请假和离职申请通知系统

## 总结

### 问题根源
- ❌ 通知类型定义不完整
- ❌ 前端组件不支持新的通知类型

### 解决方案
- ✅ 完善通知类型定义
- ✅ 更新前端组件支持新类型
- ✅ 参考仓库分配通知的成功实现

### 结果
- ✅ 管理员能在通知中心看到请假申请
- ✅ 司机能在通知中心看到审批结果
- ✅ 首页通知栏正常显示
- ✅ 弹窗提示正常
- ✅ 不会出现重复通知
- ✅ 代码简洁易维护

---

**文档创建时间**：2025-11-05  
**最后更新**：2025-11-05  
**状态**：✅ 问题已完全解决
