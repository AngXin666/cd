# 离职日期字段名修复文档

## 问题描述

用户报告创建离职申请失败，错误信息：
```
创建离职申请失败: {code: 'PGRST204', details: null, hint: null, message: "Column 'expected_date' of relation 'resignation_applications' does not exist"}
```

## 问题原因

数据库中定义的离职日期字段名与代码中使用的字段名不匹配：

### 数据库字段名
```sql
CREATE TABLE IF NOT EXISTS resignation_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  resignation_date date NOT NULL,  -- 数据库使用 resignation_date
  reason text NOT NULL,
  status application_status DEFAULT 'pending'::application_status NOT NULL,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT resignation_date_future CHECK (resignation_date > CURRENT_DATE)
);
```

### 代码中使用的字段名（修复前）
```typescript
export interface ResignationApplication {
  id: string
  user_id: string
  warehouse_id: string
  expected_date: string  // 代码使用 expected_date
  reason: string
  status: ApplicationStatus
  reviewed_by: string | null
  review_notes: string | null
  reviewed_at: string | null
  created_at: string
}
```

**不匹配点**：
- 数据库使用：`resignation_date`
- 代码使用：`expected_date`

## 解决方案

将代码中的 `expected_date` 改为 `resignation_date`，与数据库字段名完全一致。

## 修改内容

### 1. 类型定义 (src/db/types.ts)

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
  reviewed_by: string | null
  review_notes: string | null
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
  resignation_date: string
  reason: string
  status: ApplicationStatus
  reviewed_by: string | null
  review_notes: string | null
  reviewed_at: string | null
  created_at: string
}
```

#### 离职申请输入接口

**修改前：**
```typescript
export interface ResignationApplicationInput {
  user_id: string
  warehouse_id: string
  expected_date: string
  reason: string
}
```

**修改后：**
```typescript
export interface ResignationApplicationInput {
  user_id: string
  warehouse_id: string
  resignation_date: string
  reason: string
}
```

### 2. API 函数 (src/db/api.ts)

#### 创建离职申请函数

**修改前：**
```typescript
export async function createResignationApplication(
  input: ResignationApplicationInput
): Promise<ResignationApplication | null> {
  const {data, error} = await supabase
    .from('resignation_applications')
    .insert({
      user_id: input.user_id,
      warehouse_id: input.warehouse_id,
      expected_date: input.expected_date,
      reason: input.reason,
      status: 'pending'
    })
    .select()
    .maybeSingle()
  ...
}
```

**修改后：**
```typescript
export async function createResignationApplication(
  input: ResignationApplicationInput
): Promise<ResignationApplication | null> {
  const {data, error} = await supabase
    .from('resignation_applications')
    .insert({
      user_id: input.user_id,
      warehouse_id: input.warehouse_id,
      resignation_date: input.resignation_date,
      reason: input.reason,
      status: 'pending'
    })
    .select()
    .maybeSingle()
  ...
}
```

#### 更新离职申请草稿函数

**修改前：**
```typescript
export async function updateDraftResignationApplication(
  draftId: string,
  input: Partial<ResignationApplicationInput>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {}
  if (input.expected_date !== undefined) updateData.expected_date = input.expected_date
  if (input.reason !== undefined) updateData.reason = input.reason
  ...
}
```

**修改后：**
```typescript
export async function updateDraftResignationApplication(
  draftId: string,
  input: Partial<ResignationApplicationInput>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {}
  if (input.resignation_date !== undefined) updateData.resignation_date = input.resignation_date
  if (input.reason !== undefined) updateData.reason = input.reason
  ...
}
```

### 3. 前端页面修改

所有前端页面中使用 `.expected_date` 的地方都改为 `.resignation_date`。

#### 修改的页面列表：

1. **src/pages/driver/leave/index.tsx**
   - 离职申请列表中的日期显示
   - 草稿列表中的日期显示

2. **src/pages/driver/leave/resign/index.tsx**
   - 创建离职申请时的日期字段
   - 保存草稿时的日期字段
   - 提交申请时的日期字段

3. **src/pages/manager/driver-leave-detail/index.tsx**
   - 离职详情中的日期显示

4. **src/pages/manager/leave-approval/index.tsx**
   - 离职审批列表中的日期显示

5. **src/pages/super-admin/driver-leave-detail/index.tsx**
   - 离职详情中的日期显示

6. **src/pages/super-admin/leave-approval/index.tsx**
   - 离职审批列表中的日期显示

#### 修改示例

**修改前：**
```tsx
// 显示离职日期
<Text className="text-sm text-gray-800">{_formatDate(app.expected_date)}</Text>

// 创建离职申请
const result = await createResignationApplication({
  user_id: user.id,
  warehouse_id: warehouseId,
  expected_date: expectedDate,
  reason: reason.trim()
})

// 更新草稿
success = await updateDraftResignationApplication(draftId, {
  expected_date: expectedDate,
  reason: reason.trim()
})
```

**修改后：**
```tsx
// 显示离职日期
<Text className="text-sm text-gray-800">{_formatDate(app.resignation_date)}</Text>

// 创建离职申请
const result = await createResignationApplication({
  user_id: user.id,
  warehouse_id: warehouseId,
  resignation_date: expectedDate,
  reason: reason.trim()
})

// 更新草稿
success = await updateDraftResignationApplication(draftId, {
  resignation_date: expectedDate,
  reason: reason.trim()
})
```

## 修改的文件列表

1. `src/db/types.ts` - 类型定义
2. `src/db/api.ts` - API 函数
3. `src/pages/driver/leave/index.tsx` - 司机离职列表页面
4. `src/pages/driver/leave/resign/index.tsx` - 司机离职申请页面
5. `src/pages/manager/driver-leave-detail/index.tsx` - 管理员离职详情页面
6. `src/pages/manager/leave-approval/index.tsx` - 管理员离职审批页面
7. `src/pages/super-admin/driver-leave-detail/index.tsx` - 超级管理员离职详情页面
8. `src/pages/super-admin/leave-approval/index.tsx` - 超级管理员离职审批页面

## 字段名对照表

| 用途 | 数据库字段名 | 修复前代码字段名 | 修复后代码字段名 |
|-----|------------|----------------|----------------|
| 离职日期 | `resignation_date` | `expected_date` | `resignation_date` ✅ |
| 离职原因 | `reason` | `reason` | `reason` ✅ |
| 申请状态 | `status` | `status` | `status` ✅ |
| 审批人ID | `reviewed_by` | `reviewed_by` | `reviewed_by` ✅ |
| 审批意见 | `review_notes` | `review_notes` | `review_notes` ✅ |
| 审批时间 | `reviewed_at` | `reviewed_at` | `reviewed_at` ✅ |

## 验证结果

修改完成后，运行代码检查：
```bash
pnpm run lint
```

确认没有关于 `expected_date` 的错误。

## 测试建议

1. **创建离职申请**：
   - 司机填写离职申请表单
   - 选择离职日期
   - 填写离职原因
   - 提交申请
   - 确认申请创建成功

2. **查看离职申请**：
   - 司机查看自己的离职申请列表
   - 确认离职日期正确显示
   - 管理员查看待审批的离职申请
   - 确认离职日期正确显示

3. **审批离职申请**：
   - 管理员审批离职申请
   - 查看审批后的离职详情
   - 确认所有信息正确显示

4. **数据库验证**：
   - 检查数据库中 `resignation_applications` 表的 `resignation_date` 字段是否正确保存
   - 确认日期格式正确

## 根本原因分析

这个问题的根本原因是在设计阶段，数据库字段命名和代码类型定义没有保持一致。可能的原因：

1. **命名习惯不同**：
   - 数据库使用更具体的命名（`resignation_date`）
   - 代码使用更通用的命名（`expected_date`）

2. **沟通不足**：
   - 数据库设计和代码实现可能由不同人员完成
   - 没有统一的命名规范文档

3. **缺少验证机制**：
   - 没有在开发早期发现这种不一致
   - 缺少集成测试验证数据库操作

## 预防措施

为了避免类似问题再次发生，建议：

1. **统一命名规范**：
   - 数据库字段名和代码类型定义使用相同的命名
   - 制定明确的命名规范文档
   - 在代码审查时检查命名一致性

2. **类型生成工具**：
   - 考虑使用工具从数据库 schema 自动生成 TypeScript 类型
   - 确保类型定义与数据库结构完全一致

3. **集成测试**：
   - 添加集成测试验证数据库操作
   - 测试应该覆盖所有 CRUD 操作
   - 在 CI/CD 流程中运行测试

4. **文档维护**：
   - 维护字段名对照表文档
   - 在数据库迁移文件中添加详细注释
   - 更新 README 文档

5. **代码审查**：
   - 在代码审查时特别注意字段名的一致性
   - 使用 linter 规则检查字段名
   - 确保新功能的字段名与数据库一致

## 相关问题

这是离职申请功能的第二个字段名不匹配问题：

1. **第一次**：`reviewer_id` 和 `review_comment` 应该是 `reviewed_by` 和 `review_notes`
2. **第二次（本次）**：`expected_date` 应该是 `resignation_date`

这些问题都是由于代码与数据库结构不一致导致的，说明需要加强类型定义和数据库结构的同步管理。

## 总结

此次修复统一了离职日期字段的命名，使其与数据库表结构完全一致。所有涉及离职日期的代码都已更新，包括：
- 类型定义
- API 函数
- 前端显示逻辑
- 表单提交逻辑

修复后，离职申请的创建、查看和审批功能应该能够正常工作。
