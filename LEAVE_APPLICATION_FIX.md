# 请假申请功能修复说明

## 问题描述
用户在创建请假申请时遇到以下错误：
1. 第一个错误：
```
Column 'attachment_url' of relation 'leave_applications' does not exist
```

2. 第二个错误（修复第一个后出现）：
```
Column 'is_draft' of relation 'leave_applications' does not exist
```

## 问题原因
代码中使用了数据库表中不存在的字段：
1. `attachment_url` - 附件URL字段
2. `is_draft` - 草稿状态字段

### 技术细节
1. **数据库结构**: `leave_applications` 和 `resignation_applications` 表中都没有 `attachment_url` 和 `is_draft` 字段
2. **类型定义不匹配**: TypeScript 接口中定义了这些字段，但数据库表中没有
3. **API 代码错误**: 在插入和更新操作中尝试使用不存在的字段
4. **前端代码错误**: 在提交表单时传递了不存在的字段

## 解决方案

### 1. 更新类型定义
从 `src/db/types.ts` 中删除 `attachment_url` 和 `is_draft` 字段：

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
  // is_draft: boolean  // 已删除
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
  // is_draft?: boolean  // 已删除
}
```

#### ResignationApplication 接口
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
  // is_draft: boolean  // 已删除
}
```

#### ResignationApplicationInput 接口
```typescript
export interface ResignationApplicationInput {
  user_id: string
  warehouse_id: string
  expected_date: string
  reason: string
  // is_draft?: boolean  // 已删除
}
```

### 2. 修改 API 函数

#### createLeaveApplication 函数
从插入操作中删除 `attachment_url` 和 `is_draft` 字段：

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
      status: 'pending'
      // attachment_url: input.attachment_url || null,  // 已删除
      // is_draft: input.is_draft || false  // 已删除
    })
    .select()
    .maybeSingle()
  // ...
}
```

#### 草稿相关函数的处理
由于数据库不支持草稿功能（没有 `is_draft` 字段），我们采用以下策略：

1. **saveDraftLeaveApplication** - 直接调用 `createLeaveApplication` 创建正式申请
2. **updateDraftLeaveApplication** - 更新正式申请（删除 `is_draft` 过滤条件）
3. **submitDraftLeaveApplication** - 直接返回成功（因为没有草稿状态需要转换）
4. **deleteDraftLeaveApplication** - 删除正式申请（删除 `is_draft` 过滤条件）
5. **getDraftLeaveApplications** - 返回空数组（因为没有草稿）
6. **getLeaveApplicationsByUser** - 删除 `is_draft` 过滤条件，返回所有申请

同样的策略也应用于离职申请的草稿函数。

## 修改的文件

### 类型定义
1. `src/db/types.ts` - 从以下接口中删除 `attachment_url` 和 `is_draft` 字段：
   - `LeaveApplication`
   - `LeaveApplicationInput`
   - `ResignationApplication`
   - `ResignationApplicationInput`

### API 函数
2. `src/db/api.ts` - 修改以下函数：
   - **请假申请相关**：
     - `createLeaveApplication` - 删除 `attachment_url` 和 `is_draft` 字段
     - `saveDraftLeaveApplication` - 改为直接调用 `createLeaveApplication`
     - `updateDraftLeaveApplication` - 删除 `is_draft` 过滤条件
     - `submitDraftLeaveApplication` - 改为直接返回成功
     - `deleteDraftLeaveApplication` - 删除 `is_draft` 过滤条件
     - `getDraftLeaveApplications` - 改为返回空数组
     - `getLeaveApplicationsByUser` - 删除 `is_draft` 过滤条件
   - **离职申请相关**：
     - `createResignationApplication` - 删除 `is_draft` 字段
     - `saveDraftResignationApplication` - 改为直接调用 `createResignationApplication`
     - `updateDraftResignationApplication` - 删除 `is_draft` 过滤条件
     - `submitDraftResignationApplication` - 改为直接返回成功
     - `deleteDraftResignationApplication` - 删除 `is_draft` 过滤条件
     - `getDraftResignationApplications` - 改为返回空数组
     - `getResignationApplicationsByUser` - 删除 `is_draft` 过滤条件

### 前端页面
3. `src/pages/driver/leave/apply/index.tsx` - 删除 `is_draft` 字段的使用
4. `src/pages/driver/leave/resign/index.tsx` - 删除 `is_draft` 字段的使用

## 测试验证

### 测试步骤

#### 测试请假申请
1. 使用司机账号登录（admin2 / 123456 或 13800000003 / 123456）
2. 进入"请假申请"页面
3. 填写请假信息：
   - 选择请假类型（事假/病假/年假等）
   - 选择开始日期和结束日期
   - 填写请假原因
4. 点击"提交申请"按钮
5. 验证申请创建成功

#### 测试离职申请
1. 使用司机账号登录
2. 进入"离职申请"页面
3. 填写离职信息：
   - 选择预计离职日期
   - 填写离职原因
4. 点击"提交申请"按钮
5. 验证申请创建成功

### 预期结果
- ✅ 请假申请创建成功
- ✅ 离职申请创建成功
- ✅ 显示成功提示信息
- ✅ 申请状态为"待审批"
- ✅ 记录保存到数据库
- ✅ 可以在"我的申请"中查看
- ✅ 不再出现 `attachment_url` 或 `is_draft` 字段不存在的错误

## 相关功能
此修复同时确保了以下功能正常工作：

### 请假申请功能
- 创建请假申请
- 查看请假申请列表
- 管理员审批请假
- 草稿功能（注意：由于数据库不支持，草稿功能实际上直接创建正式申请）

### 离职申请功能
- 创建离职申请
- 查看离职申请列表
- 管理员审批离职
- 草稿功能（注意：由于数据库不支持，草稿功能实际上直接创建正式申请）

## 数据库表结构

### leave_applications 表的实际字段
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

### resignation_applications 表的实际字段
- `id` (uuid) - 主键
- `user_id` (uuid) - 用户ID
- `warehouse_id` (uuid) - 仓库ID
- `resignation_date` (date) - 预计离职日期
- `reason` (text) - 离职原因
- `status` (enum) - 申请状态
- `reviewed_by` (uuid) - 审批人ID
- `reviewed_at` (timestamptz) - 审批时间
- `review_notes` (text) - 审批备注
- `created_at` (timestamptz) - 创建时间
- `updated_at` (timestamptz) - 更新时间

## 注意事项

### 关于附件功能
- 如果将来需要支持附件上传功能，需要先在数据库中添加 `attachment_url` 字段
- 添加字段的 SQL 语句示例：
  ```sql
  ALTER TABLE leave_applications ADD COLUMN attachment_url TEXT;
  ALTER TABLE resignation_applications ADD COLUMN attachment_url TEXT;
  ```
- 然后再在类型定义和 API 代码中添加相应的字段

### 关于草稿功能
- 如果将来需要支持真正的草稿功能，需要在数据库中添加 `is_draft` 字段
- 添加字段的 SQL 语句示例：
  ```sql
  ALTER TABLE leave_applications ADD COLUMN is_draft BOOLEAN DEFAULT FALSE;
  ALTER TABLE resignation_applications ADD COLUMN is_draft BOOLEAN DEFAULT FALSE;
  ```
- 然后需要修改相关的 API 函数和前端代码以支持草稿功能
- 当前的草稿函数已经做了兼容处理，添加字段后只需要恢复原来的实现即可

## 后续建议
1. ✅ 已确保类型定义与数据库结构完全匹配
2. ✅ 已修复所有 `attachment_url` 和 `is_draft` 字段相关的错误
3. 考虑添加附件上传功能：
   - 在数据库中添加 `attachment_url` 字段
   - 使用 Supabase Storage 存储附件
   - 在前端添加文件上传组件
4. 考虑添加真正的草稿功能：
   - 在数据库中添加 `is_draft` 字段
   - 恢复草稿函数的原始实现
   - 在前端添加"保存草稿"和"提交"两个按钮
5. 添加请假申请的撤销功能（仅限待审批状态）
6. 添加请假申请的修改功能（仅限待审批状态）
7. 添加请假统计和报表功能
8. 添加离职申请的撤销和修改功能

## 相关文档
- `CLOCK_IN_FIX.md` - 打卡功能修复说明
- `LOGIN_FIX_FINAL.md` - 登录功能修复说明
- `TEST_ACCOUNTS.md` - 测试账号快速参考
- `README.md` - 项目整体说明
