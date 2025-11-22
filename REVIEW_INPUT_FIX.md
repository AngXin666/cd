# 修复记录：ApplicationReviewInput 接口字段名不匹配

## 问题描述

在审批请假和离职申请时，出现 `TypeError: Cannot read properties of undefined (reading 'toString')` 错误。

经过排查发现，`ApplicationReviewInput` 接口中的字段名与数据库表结构不匹配：

### 字段名对照

| 接口字段（旧） | 数据库字段 | 接口字段（新） |
|--------------|-----------|--------------|
| reviewer_id  | reviewed_by | reviewed_by |
| review_comment | review_notes | review_notes |

## 修复内容

### 1. 修改类型定义

**文件：** `src/db/types.ts`

修改 `ApplicationReviewInput` 接口：

```typescript
export interface ApplicationReviewInput {
  status: 'approved' | 'rejected'
  reviewed_by: string        // 原：reviewer_id
  review_notes?: string      // 原：review_comment
  reviewed_at: string
}
```

### 2. 修改 API 函数

**文件：** `src/db/api.ts`

#### 2.1 修改 `reviewLeaveApplication` 函数

```typescript
export async function reviewLeaveApplication(applicationId: string, review: ApplicationReviewInput): Promise<boolean> {
  const {error} = await supabase
    .from('leave_applications')
    .update({
      status: review.status,
      reviewed_by: review.reviewed_by,        // 原：review.reviewer_id
      review_notes: review.review_notes || null,  // 原：review.review_comment
      reviewed_at: review.reviewed_at
    })
    .eq('id', applicationId)
  // ...
}
```

#### 2.2 修改 `reviewResignationApplication` 函数

```typescript
export async function reviewResignationApplication(
  applicationId: string,
  review: ApplicationReviewInput
): Promise<boolean> {
  const {error} = await supabase
    .from('resignation_applications')
    .update({
      status: review.status,
      reviewed_by: review.reviewed_by,        // 原：review.reviewer_id
      review_notes: review.review_notes || null,  // 原：review.review_comment
      reviewed_at: review.reviewed_at
    })
    .eq('id', applicationId)
  // ...
}
```

### 3. 修改前端页面

修改所有使用 `ApplicationReviewInput` 接口的页面，将字段名从旧名称改为新名称。

#### 3.1 manager/driver-leave-detail/index.tsx

修改了 4 处审批函数调用：
- 通过请假申请
- 驳回请假申请
- 通过离职申请
- 驳回离职申请

```typescript
// 示例：通过请假申请
const success = await reviewLeaveApplication(applicationId, {
  status: 'approved',
  reviewed_by: user.id,        // 原：reviewer_id
  review_notes: '已通过',      // 原：review_comment
  reviewed_at: new Date().toISOString()
})
```

#### 3.2 manager/leave-approval/index.tsx

修改了 2 处审批函数调用：
- 审批请假申请（通过/拒绝）
- 审批离职申请（通过/拒绝）

```typescript
// 示例：审批请假申请
const success = await reviewLeaveApplication(applicationId, {
  status: approved ? 'approved' : 'rejected',
  reviewed_by: user.id,        // 原：reviewer_id
  reviewed_at: new Date().toISOString()
})
```

#### 3.3 super-admin/driver-attendance-detail/index.tsx

修改了 1 处审批函数调用：
- 审批请假申请

```typescript
const success = await reviewLeaveApplication(leaveId, {
  status,
  reviewed_by: user.id,        // 原：reviewer_id
  review_notes: undefined,     // 原：review_comment: null
  reviewed_at: new Date().toISOString()
})
```

#### 3.4 super-admin/driver-leave-detail/index.tsx

修改了 4 处审批函数调用：
- 通过请假申请
- 驳回请假申请
- 通过离职申请
- 驳回离职申请

#### 3.5 super-admin/leave-approval/index.tsx

修改了 2 处审批函数调用：
- 审批请假申请（通过/拒绝）
- 审批离职申请（通过/拒绝）

## 修复结果

✅ 所有字段名不匹配的错误已修复
✅ TypeScript 编译通过
✅ 审批功能应该可以正常工作

## 测试建议

1. 测试管理员审批请假申请
2. 测试管理员审批离职申请
3. 测试超级管理员审批请假申请
4. 测试超级管理员审批离职申请
5. 验证审批后的数据是否正确保存到数据库

## 相关文件

- `src/db/types.ts` - 类型定义
- `src/db/api.ts` - API 函数
- `src/pages/manager/driver-leave-detail/index.tsx` - 管理员查看详情页
- `src/pages/manager/leave-approval/index.tsx` - 管理员审批页
- `src/pages/super-admin/driver-attendance-detail/index.tsx` - 超级管理员考勤详情页
- `src/pages/super-admin/driver-leave-detail/index.tsx` - 超级管理员查看详情页
- `src/pages/super-admin/leave-approval/index.tsx` - 超级管理员审批页
