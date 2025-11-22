# 审批字段名修复文档

## 问题描述

用户报告审批请假申请时出现错误：
```
审批请假申请失败: {code: 'PGRST204', details: null, hint: null, message: "Column 'review_comment' of relation 'leave_applications' does not exist"}
```

## 问题原因

数据库中定义的审批相关字段名与代码中使用的字段名不匹配：

### 数据库字段名
```sql
CREATE TABLE IF NOT EXISTS leave_applications (
  ...
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  ...
);

CREATE TABLE IF NOT EXISTS resignation_applications (
  ...
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  ...
);
```

### 代码中使用的字段名（修复前）
```typescript
export interface LeaveApplication {
  ...
  reviewer_id: string | null
  review_comment: string | null
  reviewed_at: string | null
  ...
}

export interface ResignationApplication {
  ...
  reviewer_id: string | null
  review_comment: string | null
  reviewed_at: string | null
  ...
}
```

**不匹配点**：
- 数据库使用：`reviewed_by`, `review_notes`
- 代码使用：`reviewer_id`, `review_comment`

## 解决方案

将代码中的字段名改为与数据库完全一致。

## 修改内容

### 1. 类型定义 (src/db/types.ts)

#### 请假申请接口

**修改前：**
```typescript
export interface LeaveApplication {
  id: string
  user_id: string
  warehouse_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  reason: string
  status: ApplicationStatus
  reviewer_id: string | null
  review_comment: string | null
  reviewed_at: string | null
  created_at: string
}
```

**修改后：**
```typescript
export interface LeaveApplication {
  id: string
  user_id: string
  warehouse_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  reason: string
  status: ApplicationStatus
  reviewed_by: string | null
  review_notes: string | null
  reviewed_at: string | null
  created_at: string
}
```

#### 离职申请接口

**修改前：**
```typescript
export interface ResignationApplication {
  id: string
  user_id: string
  warehouse_id: string
  expected_date: string
  reason: string
  status: ApplicationStatus
  reviewer_id: string | null
  review_comment: string | null
  reviewed_at: string | null
  created_at: string
}
```

**修改后：**
```typescript
export interface ResignationApplication {
  id: string
  user_id: string
  warehouse_id: string
  expected_date: string
  reason: string
  status: ApplicationStatus
  reviewed_by: string | null
  review_notes: string | null
  reviewed_at: string | null
  created_at: string
}
```

### 2. API 函数 (src/db/api.ts)

#### 审批请假申请函数

**修改前：**
```typescript
export async function reviewLeaveApplication(applicationId: string, review: ApplicationReviewInput): Promise<boolean> {
  const {error} = await supabase
    .from('leave_applications')
    .update({
      status: review.status,
      reviewer_id: review.reviewer_id,
      review_comment: review.review_comment || null,
      reviewed_at: review.reviewed_at
    })
    .eq('id', applicationId)
  ...
}
```

**修改后：**
```typescript
export async function reviewLeaveApplication(applicationId: string, review: ApplicationReviewInput): Promise<boolean> {
  const {error} = await supabase
    .from('leave_applications')
    .update({
      status: review.status,
      reviewed_by: review.reviewer_id,
      review_notes: review.review_comment || null,
      reviewed_at: review.reviewed_at
    })
    .eq('id', applicationId)
  ...
}
```

#### 审批离职申请函数

**修改前：**
```typescript
export async function reviewResignationApplication(
  applicationId: string,
  review: ApplicationReviewInput
): Promise<boolean> {
  const {error} = await supabase
    .from('resignation_applications')
    .update({
      status: review.status,
      reviewer_id: review.reviewer_id,
      review_comment: review.review_comment || null,
      reviewed_at: review.reviewed_at
    })
    .eq('id', applicationId)
  ...
}
```

**修改后：**
```typescript
export async function reviewResignationApplication(
  applicationId: string,
  review: ApplicationReviewInput
): Promise<boolean> {
  const {error} = await supabase
    .from('resignation_applications')
    .update({
      status: review.status,
      reviewed_by: review.reviewer_id,
      review_notes: review.review_comment || null,
      reviewed_at: review.reviewed_at
    })
    .eq('id', applicationId)
  ...
}
```

**注意**：`ApplicationReviewInput` 接口保持不变，因为它是 API 函数的输入参数，API 函数内部会将这些字段映射到数据库字段。

### 3. 前端页面修改

所有前端页面中使用 `.reviewer_id` 和 `.review_comment` 的地方都改为 `.reviewed_by` 和 `.review_notes`。

#### 修改的页面列表：

1. **src/pages/driver/leave/index.tsx**
   - 请假列表中的审批意见显示
   - 离职申请列表中的审批意见显示

2. **src/pages/manager/driver-leave-detail/index.tsx**
   - 请假详情中的审批人显示
   - 请假详情中的审批意见显示
   - 离职详情中的审批人显示
   - 离职详情中的审批意见显示

3. **src/pages/super-admin/driver-leave-detail/index.tsx**
   - 请假详情中的审批人显示
   - 请假详情中的审批意见显示
   - 离职详情中的审批人显示
   - 离职详情中的审批意见显示

4. **src/pages/super-admin/driver-attendance-detail/index.tsx**
   - 考勤详情中的请假审批信息显示

#### 修改示例

**修改前：**
```tsx
{app.review_comment && (
  <View>
    <Text className="text-sm text-gray-600">审批意见：</Text>
    <Text className="text-sm text-gray-800">{app.review_comment}</Text>
  </View>
)}

{app.reviewer_id && (
  <View>
    <Text className="text-xs text-gray-600">审批人：</Text>
    <Text className="text-xs text-gray-800 font-medium">{getUserName(app.reviewer_id)}</Text>
  </View>
)}
```

**修改后：**
```tsx
{app.review_notes && (
  <View>
    <Text className="text-sm text-gray-600">审批意见：</Text>
    <Text className="text-sm text-gray-800">{app.review_notes}</Text>
  </View>
)}

{app.reviewed_by && (
  <View>
    <Text className="text-xs text-gray-600">审批人：</Text>
    <Text className="text-xs text-gray-800 font-medium">{getUserName(app.reviewed_by)}</Text>
  </View>
)}
```

## 修改的文件列表

1. `src/db/types.ts` - 类型定义
2. `src/db/api.ts` - API 函数
3. `src/pages/driver/leave/index.tsx` - 司机请假/离职列表页面
4. `src/pages/manager/driver-leave-detail/index.tsx` - 管理员请假/离职详情页面
5. `src/pages/super-admin/driver-leave-detail/index.tsx` - 超级管理员请假/离职详情页面
6. `src/pages/super-admin/driver-attendance-detail/index.tsx` - 超级管理员考勤详情页面

## 字段名对照表

| 用途 | 数据库字段名 | 修复前代码字段名 | 修复后代码字段名 |
|-----|------------|----------------|----------------|
| 审批人ID | `reviewed_by` | `reviewer_id` | `reviewed_by` ✅ |
| 审批意见 | `review_notes` | `review_comment` | `review_notes` ✅ |
| 审批时间 | `reviewed_at` | `reviewed_at` | `reviewed_at` ✅ |

## 验证结果

修改完成后，运行代码检查：
```bash
pnpm run lint
```

确认没有关于 `review_comment` 和 `reviewer_id` 的错误。

## 测试建议

1. **请假申请审批**：
   - 管理员通过请假申请
   - 管理员驳回请假申请
   - 查看审批后的请假详情，确认审批人和审批意见正确显示

2. **离职申请审批**：
   - 管理员通过离职申请
   - 管理员驳回离职申请
   - 查看审批后的离职详情，确认审批人和审批意见正确显示

3. **司机端查看**：
   - 司机查看已审批的请假申请
   - 司机查看已审批的离职申请
   - 确认审批意见正确显示

4. **数据库验证**：
   - 检查数据库中 `leave_applications` 表的 `reviewed_by` 和 `review_notes` 字段是否正确保存
   - 检查数据库中 `resignation_applications` 表的 `reviewed_by` 和 `review_notes` 字段是否正确保存

## 根本原因分析

这个问题的根本原因是在设计阶段，数据库字段命名和代码类型定义没有保持一致。可能的原因：

1. **命名风格不统一**：
   - 数据库使用被动语态（`reviewed_by`）
   - 代码使用主动语态（`reviewer_id`）

2. **字段名称选择不一致**：
   - 数据库使用 `review_notes`（复数形式）
   - 代码使用 `review_comment`（单数形式）

3. **缺少验证机制**：没有在开发早期发现这种不一致

4. **文档不完善**：没有明确的字段名对照文档

## 预防措施

为了避免类似问题再次发生，建议：

1. **统一命名规范**：
   - 数据库字段名和代码类型定义使用相同的命名
   - 制定明确的命名规范文档

2. **类型生成工具**：
   - 考虑使用工具从数据库 schema 自动生成 TypeScript 类型
   - 确保类型定义与数据库结构完全一致

3. **集成测试**：
   - 添加集成测试验证数据库操作
   - 测试应该覆盖所有 CRUD 操作

4. **代码审查**：
   - 在代码审查时特别注意字段名的一致性
   - 使用 linter 规则检查字段名

5. **文档维护**：
   - 维护字段名对照表文档
   - 在数据库迁移文件中添加详细注释

## 相关问题

这是请假申请功能的第三个字段名不匹配问题：

1. **第一次**：`attachment_url` 和 `is_draft` 字段不存在
2. **第二次**：`type` 字段应该是 `leave_type`
3. **第三次**：`reviewer_id` 和 `review_comment` 应该是 `reviewed_by` 和 `review_notes`

这些问题都是由于代码与数据库结构不一致导致的，说明需要加强类型定义和数据库结构的同步管理。

## 总结

此次修复统一了审批相关字段的命名，使其与数据库表结构完全一致。所有涉及审批信息的代码都已更新，包括：
- 类型定义
- API 函数
- 前端显示逻辑

修复后，请假和离职申请的审批功能应该能够正常工作。
