# 请假申请字段名修复文档

## 问题描述

用户报告创建请假申请时出现错误：
```
创建请假申请失败: {code: 'PGRST204', details: null, hint: null, message: "Column 'type' of relation 'leave_applications' does not exist"}
```

## 问题原因

数据库表 `leave_applications` 中的字段名是 `leave_type`，但代码中使用的是 `type`，导致字段名不匹配。

### 数据库表结构
```sql
CREATE TABLE IF NOT EXISTS leave_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,  -- 字段名是 leave_type
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric(5,1) NOT NULL,
  reason text NOT NULL,
  status application_status DEFAULT 'pending'::application_status NOT NULL,
  ...
);
```

## 解决方案

将所有代码中的 `type` 字段改为 `leave_type`，使其与数据库表结构一致。

## 修改内容

### 1. 类型定义 (src/db/types.ts)

**修改前：**
```typescript
export interface LeaveApplication {
  id: string
  user_id: string
  warehouse_id: string
  type: LeaveType  // ❌ 错误的字段名
  ...
}

export interface LeaveApplicationInput {
  user_id: string
  warehouse_id: string
  type: LeaveType  // ❌ 错误的字段名
  ...
}
```

**修改后：**
```typescript
export interface LeaveApplication {
  id: string
  user_id: string
  warehouse_id: string
  leave_type: LeaveType  // ✅ 正确的字段名
  ...
}

export interface LeaveApplicationInput {
  user_id: string
  warehouse_id: string
  leave_type: LeaveType  // ✅ 正确的字段名
  ...
}
```

### 2. API 函数 (src/db/api.ts)

#### createLeaveApplication 函数

**修改前：**
```typescript
export async function createLeaveApplication(input: LeaveApplicationInput): Promise<LeaveApplication | null> {
  const {data, error} = await supabase
    .from('leave_applications')
    .insert({
      user_id: input.user_id,
      warehouse_id: input.warehouse_id,
      type: input.type,  // ❌ 错误的字段名
      ...
    })
}
```

**修改后：**
```typescript
export async function createLeaveApplication(input: LeaveApplicationInput): Promise<LeaveApplication | null> {
  const {data, error} = await supabase
    .from('leave_applications')
    .insert({
      user_id: input.user_id,
      warehouse_id: input.warehouse_id,
      leave_type: input.leave_type,  // ✅ 正确的字段名
      ...
    })
}
```

#### updateDraftLeaveApplication 函数

**修改前：**
```typescript
export async function updateDraftLeaveApplication(
  draftId: string,
  input: Partial<LeaveApplicationInput>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {}
  if (input.type !== undefined) updateData.type = input.type  // ❌ 错误的字段名
  ...
}
```

**修改后：**
```typescript
export async function updateDraftLeaveApplication(
  draftId: string,
  input: Partial<LeaveApplicationInput>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {}
  if (input.leave_type !== undefined) updateData.leave_type = input.leave_type  // ✅ 正确的字段名
  ...
}
```

### 3. 前端页面

#### 请假申请页面 (src/pages/driver/leave/apply/index.tsx)

**修改位置：**
1. 加载草稿时读取字段：`data.leave_type`
2. 保存草稿时传入字段：`leave_type: leaveType`
3. 提交申请时传入字段：`leave_type: leaveType`

#### 请假列表页面 (src/pages/driver/leave/index.tsx)

**修改位置：**
1. 显示请假类型：`app.leave_type`
2. 显示草稿类型：`draft.leave_type`

#### 管理员页面 (src/pages/manager/driver-leave-detail/index.tsx)

**修改位置：**
1. 显示请假类型：`app.leave_type`

#### 超级管理员页面

**修改位置：**
1. `src/pages/super-admin/driver-attendance-detail/index.tsx`：显示请假类型 `leave.leave_type`
2. `src/pages/super-admin/driver-leave-detail/index.tsx`：显示请假类型 `app.leave_type`

### 4. 工具函数 (src/utils/attendance-check.ts)

**修改前：**
```typescript
return {
  needClockIn: false,
  hasClockedIn: false,
  onLeave: true,
  leaveId: leaveRecord.id,
  leaveType: leaveRecord.type,  // ❌ 错误的字段名
  message: '今天您休息，无需打卡'
}
```

**修改后：**
```typescript
return {
  needClockIn: false,
  hasClockedIn: false,
  onLeave: true,
  leaveId: leaveRecord.id,
  leaveType: leaveRecord.leave_type,  // ✅ 正确的字段名
  message: '今天您休息，无需打卡'
}
```

## 验证结果

修改完成后，运行代码检查：
```bash
pnpm run lint
```

确认没有关于 `type` 或 `leave_type` 的错误。

## 测试建议

1. **创建请假申请**：测试各种请假类型（病假、事假、年假等）的创建
2. **保存草稿**：测试保存请假草稿功能
3. **编辑草稿**：测试编辑已保存的草稿
4. **提交申请**：测试提交请假申请
5. **查看列表**：确认请假类型正确显示
6. **管理员审批**：确认管理员页面正确显示请假类型

## 总结

此次修复统一了代码中的字段名，使其与数据库表结构完全一致。所有涉及请假申请的代码都已更新，包括：
- 类型定义
- API 函数
- 前端页面（司机端、管理员端、超级管理员端）
- 工具函数

修复后，请假申请功能应该能够正常工作。
