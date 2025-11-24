# 司机请假通知系统修复文档

## 📋 问题描述

**原问题**：司机提交请假申请后，管理员端的通知栏没有显示通知信息。

**根本原因**：
1. 缺少请假申请相关的通知类型枚举值
2. 司机请假申请提交成功后，没有调用通知系统创建通知
3. 缺少为所有管理员批量创建通知的函数

## ✅ 修复方案

### 1. 添加通知类型枚举值

**文件**：`supabase/migrations/00060_add_leave_application_notification_types.sql`

新增以下通知类型：
- `leave_application_submitted` - 请假申请已提交（管理员收到）
- `resignation_application_submitted` - 离职申请已提交（管理员收到）
- `resignation_approved` - 离职申请已通过
- `resignation_rejected` - 离职申请已驳回

```sql
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'leave_application_submitted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'resignation_application_submitted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'resignation_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'resignation_rejected';
```

### 2. 添加通知系统函数

**文件**：`src/db/api.ts`

新增以下函数：

#### 2.1 创建单个通知
```typescript
export async function createNotification(notification: {
  user_id: string
  type: string
  title: string
  message: string
  related_id?: string
}): Promise<string | null>
```

**功能**：为指定用户创建一条通知

**参数**：
- `user_id` - 接收通知的用户ID
- `type` - 通知类型（如 `leave_application_submitted`）
- `title` - 通知标题
- `message` - 通知内容
- `related_id` - 关联的记录ID（可选）

**返回值**：成功返回通知ID，失败返回null

#### 2.2 为所有管理员创建通知
```typescript
export async function createNotificationForAllManagers(notification: {
  type: string
  title: string
  message: string
  related_id?: string
}): Promise<number>
```

**功能**：为所有管理员和超级管理员批量创建通知

**工作流程**：
1. 查询所有角色为 `manager` 或 `super_admin` 的用户
2. 为每个管理员创建一条通知
3. 批量插入数据库

**返回值**：成功创建的通知数量

#### 2.3 获取司机姓名
```typescript
export async function getDriverName(userId: string): Promise<string>
```

**功能**：根据用户ID获取司机姓名

**返回值**：司机姓名，失败返回"未知司机"

### 3. 修改司机请假申请页面

**文件**：`src/pages/driver/leave/apply/index.tsx`

**修改内容**：

1. **导入新函数**：
```typescript
import {
  createLeaveApplication,
  createNotificationForAllManagers,  // 新增
  getDriverName,                      // 新增
  // ... 其他导入
} from '@/db/api'
```

2. **修改 handleSubmit 函数**：

在请假申请提交成功后，立即创建通知：

```typescript
if (success && applicationId) {
  // 获取司机姓名
  const driverName = await getDriverName(user.id)

  // 获取请假类型中文名称
  const leaveTypeLabel = leaveTypes.find(t => t.value === leaveType)?.label || '请假'

  // 为所有管理员创建通知
  const notificationCount = await createNotificationForAllManagers({
    type: 'leave_application_submitted',
    title: '新的请假申请',
    message: `司机 ${driverName} 提交了${leaveTypeLabel}申请，请假时间：${startDate} 至 ${endDate}（${leaveDays}天），事由：${reason.trim()}`,
    related_id: applicationId
  })

  console.log('✅ 请假申请提交成功，已通知', notificationCount, '位管理员')

  showToast({title: '提交成功', icon: 'success'})
  setTimeout(() => {
    navigateBack()
  }, 1500)
}
```

**通知内容包含**：
- ✅ 司机姓名
- ✅ 请假类型（事假、病假、年假、其他）
- ✅ 请假时间（开始日期 至 结束日期）
- ✅ 请假天数
- ✅ 请假事由

### 4. 修改司机离职申请页面

**文件**：`src/pages/driver/leave/resign/index.tsx`

**修改内容**：

1. **导入新函数**：
```typescript
import {
  createNotificationForAllManagers,  // 新增
  createResignationApplication,
  getDriverName,                      // 新增
  // ... 其他导入
} from '@/db/api'
```

2. **修改 handleSubmit 函数**：

在离职申请提交成功后，立即创建通知：

```typescript
if (success && applicationId) {
  // 获取司机姓名
  const driverName = await getDriverName(user.id)

  // 为所有管理员创建通知
  const notificationCount = await createNotificationForAllManagers({
    type: 'resignation_application_submitted',
    title: '新的离职申请',
    message: `司机 ${driverName} 提交了离职申请，期望离职日期：${expectedDate}，离职原因：${reason.trim()}`,
    related_id: applicationId
  })

  console.log('✅ 离职申请提交成功，已通知', notificationCount, '位管理员')

  showToast({title: '提交成功', icon: 'success'})
  setTimeout(() => {
    navigateBack()
  }, 1500)
}
```

**通知内容包含**：
- ✅ 司机姓名
- ✅ 期望离职日期
- ✅ 离职原因

## 🧪 测试方法

### 测试环境准备

1. **创建测试账号**：
   - 1个司机账号
   - 2个管理员账号（1个普通管理员 + 1个超级管理员）

2. **分配仓库**：
   - 确保司机已分配到仓库

### 测试步骤

#### 测试1：司机提交请假申请

1. **司机端操作**：
   - 登录司机账号
   - 进入"请假申请"页面
   - 填写请假信息：
     - 请假类型：事假
     - 请假时间：2025-11-10 至 2025-11-12（3天）
     - 请假事由：家里有事需要处理
   - 点击"提交申请"

2. **预期结果**：
   - ✅ 显示"提交成功"提示
   - ✅ 控制台输出：`✅ 请假申请提交成功，已通知 2 位管理员`
   - ✅ 自动返回上一页

3. **管理员端验证**：
   - 登录**普通管理员**账号
   - 查看通知栏（右上角铃铛图标）
   - **预期**：显示红点，未读通知数量 +1
   - 点击通知栏，查看通知详情
   - **预期**：显示通知内容：
     ```
     标题：新的请假申请
     内容：司机 张三 提交了事假申请，请假时间：2025-11-10 至 2025-11-12（3天），事由：家里有事需要处理
     ```

4. **超级管理员端验证**：
   - 登录**超级管理员**账号
   - 查看通知栏
   - **预期**：同样显示相同的通知内容

#### 测试2：司机提交离职申请

1. **司机端操作**：
   - 登录司机账号
   - 进入"离职申请"页面
   - 填写离职信息：
     - 期望离职日期：2025-12-31
     - 离职原因：个人发展原因
   - 点击"提交申请"

2. **预期结果**：
   - ✅ 显示"提交成功"提示
   - ✅ 控制台输出：`✅ 离职申请提交成功，已通知 2 位管理员`
   - ✅ 自动返回上一页

3. **管理员端验证**：
   - 两个管理员账号都应该收到通知
   - **预期通知内容**：
     ```
     标题：新的离职申请
     内容：司机 张三 提交了离职申请，期望离职日期：2025-12-31，离职原因：个人发展原因
     ```

#### 测试3：多个管理员同时在线

1. **准备**：
   - 同时打开2个浏览器窗口
   - 分别登录普通管理员和超级管理员账号

2. **操作**：
   - 司机提交一个请假申请

3. **预期结果**：
   - ✅ 两个管理员窗口**同时**显示通知红点
   - ✅ 两个管理员都能看到相同的通知内容
   - ✅ 通知数量一致

### 验证要点

#### ✅ 通知创建验证
- [ ] 司机提交请假后，控制台显示"已通知 X 位管理员"
- [ ] 通知数量与实际管理员数量一致
- [ ] 通知创建成功，没有错误日志

#### ✅ 通知内容验证
- [ ] 通知标题正确（"新的请假申请" 或 "新的离职申请"）
- [ ] 通知内容包含司机姓名
- [ ] 通知内容包含完整的请假/离职信息
- [ ] 通知内容格式清晰易读

#### ✅ 管理员端验证
- [ ] 普通管理员能收到通知
- [ ] 超级管理员能收到通知
- [ ] 通知栏显示红点提示
- [ ] 未读通知数量正确
- [ ] 点击通知可以查看详情

#### ✅ 实时性验证
- [ ] 司机提交后，管理员立即收到通知（如果实时通知可用）
- [ ] 管理员刷新页面后能看到通知（如果实时通知不可用）

## 📊 数据库验证

### 查询通知记录

```sql
-- 查询最近创建的通知
SELECT 
  n.id,
  n.type,
  n.title,
  n.message,
  n.is_read,
  n.created_at,
  p.name as user_name,
  p.role as user_role
FROM notifications n
JOIN profiles p ON n.user_id = p.id
WHERE n.type IN ('leave_application_submitted', 'resignation_application_submitted')
ORDER BY n.created_at DESC
LIMIT 10;
```

**预期结果**：
- 每次司机提交申请，应该有 N 条通知记录（N = 管理员数量）
- 每条通知的 `user_id` 对应不同的管理员
- 通知内容完整且格式正确

### 查询管理员列表

```sql
-- 查询所有管理员
SELECT id, name, role
FROM profiles
WHERE role IN ('manager', 'super_admin')
ORDER BY role, name;
```

**用途**：确认系统中有多少个管理员，验证通知数量是否正确

## 🎯 修复效果

### 修复前
- ❌ 司机提交请假后，管理员收不到通知
- ❌ 管理员需要手动刷新页面才能看到新申请
- ❌ 通知栏没有红点提示

### 修复后
- ✅ 司机提交请假后，所有管理员立即收到通知
- ✅ 通知内容包含完整信息（司机姓名、时间、事由等）
- ✅ 通知栏显示红点提示
- ✅ 支持多个管理员同时接收通知
- ✅ 普通管理员和超级管理员都能收到通知

## 🔍 技术细节

### 通知创建流程

```
司机提交申请
    ↓
createLeaveApplication() 创建申请记录
    ↓
获取申请ID (applicationId)
    ↓
getDriverName() 获取司机姓名
    ↓
createNotificationForAllManagers() 批量创建通知
    ↓
    ├─ 查询所有管理员 (role IN ['manager', 'super_admin'])
    ↓
    ├─ 为每个管理员创建通知对象
    ↓
    └─ 批量插入数据库
    ↓
返回成功创建的通知数量
    ↓
控制台输出日志
    ↓
显示成功提示
```

### 通知数据结构

```typescript
{
  id: uuid,                              // 通知ID
  user_id: uuid,                         // 接收通知的管理员ID
  type: 'leave_application_submitted',   // 通知类型
  title: '新的请假申请',                  // 通知标题
  message: '司机 张三 提交了...',         // 通知内容
  related_id: uuid,                      // 关联的申请ID
  is_read: false,                        // 是否已读
  created_at: timestamptz                // 创建时间
}
```

### 权限控制

通知表的 RLS 策略：
- ✅ 用户只能查看自己的通知
- ✅ 用户可以更新自己的通知（标记为已读）
- ✅ 系统可以插入通知（通过认证用户）

## 📝 相关文件

### 数据库迁移
- `supabase/migrations/00060_add_leave_application_notification_types.sql`

### 后端API
- `src/db/api.ts`
  - `createNotification()`
  - `createNotificationForAllManagers()`
  - `getDriverName()`

### 前端页面
- `src/pages/driver/leave/apply/index.tsx` - 司机请假申请
- `src/pages/driver/leave/resign/index.tsx` - 司机离职申请

## 🎉 总结

本次修复完成了以下内容：

1. ✅ 添加了请假和离职申请相关的通知类型
2. ✅ 实现了通知系统的核心函数
3. ✅ 修改了司机请假申请页面，提交成功后自动通知所有管理员
4. ✅ 修改了司机离职申请页面，提交成功后自动通知所有管理员
5. ✅ 通知内容包含完整信息（司机姓名、时间、天数、事由等）
6. ✅ 支持多个管理员同时接收通知
7. ✅ 普通管理员和超级管理员都能收到通知

**修复完成时间**：2025-11-05  
**相关提交**：`f2d5977` - 修复司机请假后双管理员端通知栏显示问题
