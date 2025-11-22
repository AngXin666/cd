# 请假申请功能修复说明

## 问题描述
用户在创建请假申请时遇到以下错误：
```
Column 'attachment_url' of relation 'leave_applications' does not exist
```

## 问题原因
代码中使用了数据库表中不存在的 `attachment_url` 字段。

### 技术细节
1. **数据库结构**: `leave_applications` 表中没有 `attachment_url` 字段
2. **类型定义不匹配**: TypeScript 接口中定义了 `attachment_url` 字段，但数据库表中没有
3. **API 代码错误**: 在插入和更新操作中尝试使用不存在的字段

## 解决方案

### 1. 更新类型定义
从 `src/db/types.ts` 中删除 `attachment_url` 字段：

#### LeaveApplication 接口
```typescript
export interface LeaveApplication {
  id: string
  user_id: string
  warehouse_id: string
  type: LeaveType
  start_date: string
  end_date: string
  reason: string
  // attachment_url: string | null  // 已删除
  status: ApplicationStatus
  reviewer_id: string | null
  review_comment: string | null
  reviewed_at: string | null
  created_at: string
  is_draft: boolean
}
```

#### LeaveApplicationInput 接口
```typescript
export interface LeaveApplicationInput {
  user_id: string
  warehouse_id: string
  type: LeaveType
  start_date: string
  end_date: string
  reason: string
  // attachment_url?: string  // 已删除
  is_draft?: boolean
}
```

### 2. 修改 API 函数

#### createLeaveApplication 函数
从插入操作中删除 `attachment_url` 字段：

```typescript
export async function createLeaveApplication(input: LeaveApplicationInput): Promise<LeaveApplication | null> {
  const {data, error} = await supabase
    .from('leave_applications')
    .insert({
      user_id: input.user_id,
      warehouse_id: input.warehouse_id,
      type: input.type,
      start_date: input.start_date,
      end_date: input.end_date,
      reason: input.reason,
      // attachment_url: input.attachment_url || null,  // 已删除
      status: 'pending',
      is_draft: input.is_draft || false
    })
    .select()
    .maybeSingle()
  // ...
}
```

#### saveDraftLeaveApplication 函数
从草稿保存操作中删除 `attachment_url` 字段：

```typescript
export async function saveDraftLeaveApplication(input: LeaveApplicationInput): Promise<LeaveApplication | null> {
  const {data, error} = await supabase
    .from('leave_applications')
    .insert({
      user_id: input.user_id,
      warehouse_id: input.warehouse_id,
      type: input.type,
      start_date: input.start_date || '',
      end_date: input.end_date || '',
      reason: input.reason || '',
      // attachment_url: input.attachment_url || null,  // 已删除
      status: 'pending',
      is_draft: true
    })
    .select()
    .maybeSingle()
  // ...
}
```

#### updateDraftLeaveApplication 函数
从更新操作中删除 `attachment_url` 字段：

```typescript
export async function updateDraftLeaveApplication(
  draftId: string,
  input: Partial<LeaveApplicationInput>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {}
  if (input.type !== undefined) updateData.type = input.type
  if (input.start_date !== undefined) updateData.start_date = input.start_date
  if (input.end_date !== undefined) updateData.end_date = input.end_date
  if (input.reason !== undefined) updateData.reason = input.reason
  // if (input.attachment_url !== undefined) updateData.attachment_url = input.attachment_url  // 已删除
  // ...
}
```

## 修改的文件
1. `src/db/types.ts` - 从 `LeaveApplication` 和 `LeaveApplicationInput` 接口中删除 `attachment_url` 字段
2. `src/db/api.ts` - 从以下函数中删除 `attachment_url` 字段的使用：
   - `createLeaveApplication`
   - `saveDraftLeaveApplication`
   - `updateDraftLeaveApplication`

## 测试验证

### 测试步骤
1. 使用司机账号登录（admin2 / 123456 或 13800000003 / 123456）
2. 进入"请假申请"页面
3. 填写请假信息：
   - 选择请假类型（事假/病假/年假等）
   - 选择开始日期和结束日期
   - 填写请假原因
4. 点击"提交申请"按钮
5. 验证申请创建成功

### 预期结果
- ✅ 请假申请创建成功
- ✅ 显示成功提示信息
- ✅ 申请状态为"待审批"
- ✅ 记录保存到数据库
- ✅ 可以在"我的申请"中查看

## 相关功能
此修复同时确保了以下功能正常工作：
- 创建请假申请
- 保存请假草稿
- 更新请假草稿
- 提交请假申请
- 查看请假申请列表
- 管理员审批请假

## 数据库表结构
`leave_applications` 表的实际字段：
- `id` (uuid) - 主键
- `user_id` (uuid) - 用户ID
- `warehouse_id` (uuid) - 仓库ID
- `leave_type` (enum) - 请假类型
- `start_date` (date) - 开始日期
- `end_date` (date) - 结束日期
- `days` (numeric) - 请假天数
- `reason` (text) - 请假原因
- `status` (enum) - 申请状态
- `reviewed_by` (uuid) - 审批人ID
- `reviewed_at` (timestamptz) - 审批时间
- `review_notes` (text) - 审批备注
- `created_at` (timestamptz) - 创建时间
- `updated_at` (timestamptz) - 更新时间

## 注意事项
- 如果将来需要支持附件上传功能，需要先在数据库中添加 `attachment_url` 字段
- 添加字段的 SQL 语句示例：
  ```sql
  ALTER TABLE leave_applications ADD COLUMN attachment_url TEXT;
  ```
- 然后再在类型定义和 API 代码中添加相应的字段

## 后续建议
1. ✅ 已确保类型定义与数据库结构完全匹配
2. 考虑添加附件上传功能：
   - 在数据库中添加 `attachment_url` 字段
   - 使用 Supabase Storage 存储附件
   - 在前端添加文件上传组件
3. 添加请假申请的撤销功能
4. 添加请假申请的修改功能（仅限待审批状态）
5. 添加请假统计和报表功能

## 相关文档
- `CLOCK_IN_FIX.md` - 打卡功能修复说明
- `LOGIN_FIX_FINAL.md` - 登录功能修复说明
- `TEST_ACCOUNTS.md` - 测试账号快速参考
- `README.md` - 项目整体说明
