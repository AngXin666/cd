# 修复管理端审批后司机收不到通知的问题

## 问题描述

用户反馈：老板和车队长审批请假申请后，司机无法收到审批结果通知。

## 问题分析

### 原有通知流程

1. **司机提交请假申请**
   ```
   司机提交 → 调用 sendDriverSubmissionNotification()
   ↓
   发送通知给：
   - 主账号（老板）
   - 平级账号
   - 有管辖权的车队长
   ↓
   ❌ 不包括司机自己
   ```

2. **管理端审批请假**
   ```
   老板/车队长审批 → 调用 updateApprovalNotificationStatus()
   ↓
   更新通知状态：
   - 更新发送给老板和车队长的通知
   - 修改 approval_status 为 approved/rejected
   - 更新通知标题和内容
   ↓
   ❌ 没有创建新通知给司机
   ```

### 根本原因

**`updateApprovalNotificationStatus` 函数的设计问题**：

- 该函数只是更新现有通知的状态
- 通过 `related_id` 查找相关通知并更新
- 但司机提交时，通知只发送给管理员，不包括司机自己
- 所以审批后，司机没有任何通知可以更新，也没有创建新通知

```typescript
// updateApprovalNotificationStatus 的逻辑
const {data: notifications} = await supabase
  .from('notifications')
  .select('*')
  .eq('related_id', relatedId)  // 查找相关通知

// 只更新现有通知，不创建新通知
await supabase
  .from('notifications')
  .update(updateData)
  .eq('related_id', relatedId)
```

## 解决方案

### 修改审批逻辑

在审批通过/拒绝后，**创建新通知发送给司机**：

```typescript
// 1. 创建新通知给司机（审批结果通知）
await createNotification(
  application.user_id,  // 发送给申请人（司机）
  notificationType,     // leave_approved 或 leave_rejected
  `${leaveTypeText}申请${statusText}`,
  message,
  applicationId         // 关联请假申请ID
)

// 2. 更新原有通知状态（发送给老板和车队长的通知）
await updateApprovalNotificationStatus(
  applicationId,
  approvalStatus,
  '请假审批通知',
  message
)
```

### 通知内容设计

**审批通过通知**：
```
标题：病假申请已通过
内容：老板【张三】已通过了您的病假申请（2025-11-01 至 2025-11-03）
```

**审批拒绝通知**：
```
标题：病假申请已拒绝
内容：车队长【李四】已拒绝了您的病假申请（2025-11-01 至 2025-11-03）
```

### 审批人显示规则

1. **老板审批**：
   - 优先显示真实姓名：`老板【张三】`
   - 无真实姓名显示用户名：`老板【zhangsan】`
   - 都没有则显示：`老板`

2. **车队长审批**：
   - 优先显示真实姓名：`车队长【李四】`
   - 无真实姓名显示用户名：`车队长【lisi】`
   - 都没有则显示：`车队长`

## 修改文件

### 1. 老板端审批页面

**文件**：`src/pages/super-admin/leave-approval/index.tsx`

**修改内容**：
- 导入 `createNotification` 函数
- 在 `handleReviewLeave` 函数中添加司机通知逻辑
- 获取审批人信息并构建通知消息
- 创建新通知给司机
- 更新原有通知状态

**关键代码**：
```typescript
// 🔔 创建新通知给司机（审批结果通知）
await createNotification(
  application.user_id,
  notificationType,
  `${leaveTypeText}申请${statusText}`,
  message,
  applicationId
)

// 🔄 更新原有通知状态（发送给老板和车队长的通知）
await updateApprovalNotificationStatus(
  applicationId,
  approvalStatus,
  '请假审批通知',
  message
)
```

### 2. 车队长端审批页面

**文件**：`src/pages/manager/leave-approval/index.tsx`

**修改内容**：
- 导入 `createNotification` 和 `updateApprovalNotificationStatus` 函数
- 在 `handleReviewLeave` 函数中添加司机通知逻辑
- 获取审批人信息并构建通知消息
- 创建新通知给司机
- 更新原有通知状态

**关键代码**：
```typescript
// 获取请假申请详情
const application = leaveApplications.find((app) => app.id === applicationId)

// 审批后发送通知给司机
await createNotification(
  application.user_id,
  notificationType,
  `${leaveTypeText}申请${statusText}`,
  message,
  applicationId
)
```

## 完整通知流程

### 请假申请通知流程

```
┌─────────────────────────────────────────────────────────────┐
│                     司机提交请假申请                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────┐
        │  sendDriverSubmissionNotification()     │
        │  发送通知给：                            │
        │  - 主账号（老板）                        │
        │  - 平级账号                              │
        │  - 有管辖权的车队长                      │
        └─────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────┐
        │  老板/车队长收到通知                     │
        │  类型：leave_submitted                   │
        │  标题：新的请假申请                      │
        └─────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────┐
        │  老板/车队长审批（通过/拒绝）            │
        └─────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────┐
        │  createNotification()                    │
        │  创建新通知给司机：                      │
        │  - 类型：leave_approved/leave_rejected   │
        │  - 标题：病假申请已通过/已拒绝           │
        │  - 内容：审批人 + 审批结果 + 日期        │
        └─────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────┐
        │  updateApprovalNotificationStatus()      │
        │  更新原有通知状态：                      │
        │  - 更新发送给老板和车队长的通知          │
        │  - approval_status: approved/rejected    │
        └─────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────┐
        │  ✅ 司机收到审批结果通知                 │
        │  ✅ 老板和车队长看到更新后的通知状态     │
        └─────────────────────────────────────────┘
```

## 测试验证

### 测试场景

1. **老板审批通过**
   - 司机提交请假申请
   - 老板审批通过
   - 验证：司机收到"病假申请已通过"通知

2. **老板审批拒绝**
   - 司机提交请假申请
   - 老板审批拒绝
   - 验证：司机收到"病假申请已拒绝"通知
   - 验证：该仓库的调度和车队长收到拒绝通知

3. **车队长审批通过**
   - 司机提交请假申请
   - 车队长审批通过
   - 验证：司机收到"病假申请已通过"通知

4. **车队长审批拒绝**
   - 司机提交请假申请
   - 车队长审批拒绝
   - 验证：司机收到"病假申请已拒绝"通知

### 验证要点

- ✅ 司机能收到审批结果通知
- ✅ 通知内容包含审批人信息
- ✅ 通知内容包含审批结果（通过/拒绝）
- ✅ 通知内容包含请假类型和日期
- ✅ 通知类型正确（leave_approved/leave_rejected）
- ✅ 通知关联正确的请假申请ID
- ✅ 原有通知状态正确更新

## 代码质量

- ✅ 通过 `pnpm run lint` 检查
- ✅ 保持原有功能完整性
- ✅ 添加详细的注释说明
- ✅ 错误处理机制完善
- ✅ 通知发送失败不影响审批流程

## 总结

通过在审批逻辑中**创建新通知给司机**，解决了司机收不到审批结果通知的问题。修改后的通知流程更加完整，确保所有相关人员都能及时收到通知。
