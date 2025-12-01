# RLS 策略和通知系统逻辑分析

## 一、notifications 表结构

### 1. 基础字段
- `id` (uuid) - 通知ID
- `recipient_id` (uuid) - 接收者ID
- `sender_id` (uuid) - 发送者ID
- `sender_name` (text) - 发送者姓名
- `sender_role` (text) - 发送者角色
- `type` (text) - 通知类型
- `title` (text) - 通知标题
- `content` (text) - 通知内容
- `action_url` (text) - 跳转链接
- `is_read` (boolean) - 是否已读
- `created_at` (timestamptz) - 创建时间

### 2. 审批相关字段（后续添加）
- `approval_status` (text) - 审批状态（pending/approved/rejected/null）
- `updated_at` (timestamptz) - 更新时间
- `related_id` (uuid) - 关联的申请ID

## 二、当前生效的 RLS 策略

### 1. SELECT 策略
- ✅ **"Users can view their own notifications"**
  - 条件：`auth.uid() = recipient_id`
  - 说明：用户可以查看自己的通知

- ✅ **"Admins can view all notifications"**
  - 条件：`is_admin(auth.uid())`
  - 说明：管理员可以查看所有通知

### 2. UPDATE 策略
- ✅ **"Users can update their own notifications"**
  - 条件：`USING (auth.uid() = recipient_id)`
  - 说明：用户可以更新自己的通知（标记已读）
  - ⚠️ **问题：缺少 WITH CHECK 子句**

- ✅ **"Admins can update all notifications"**
  - 条件：`USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()))`
  - 说明：管理员可以更新所有通知
  - ✅ 已添加 WITH CHECK 子句

### 3. INSERT 策略
- ✅ **"Users can create notifications"**
  - 条件：`WITH CHECK (auth.uid() = sender_id)`
  - 说明：发送者可以创建通知

### 4. DELETE 策略
- ✅ **"Admins can delete notifications"**
  - 条件：`USING (is_admin(auth.uid()))`
  - 说明：管理员可以删除通知

## 三、发现的问题

### 问题 1：用户更新策略缺少 WITH CHECK 子句 ⚠️

**当前策略：**
```sql
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id);
```

**问题说明：**
- 只有 `USING` 子句，没有 `WITH CHECK` 子句
- 在 PostgreSQL 中，对于 UPDATE 操作：
  - `USING` 子句：决定哪些行可以被更新（WHERE 条件）
  - `WITH CHECK` 子句：决定更新后的值是否允许（新值检查）
- 如果没有 `WITH CHECK`，PostgreSQL 会默认使用 `USING` 子句作为 `WITH CHECK`
- 但是最好显式指定，避免潜在问题

**建议修复：**
```sql
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);
```

### 问题 2：通知类型字段的约束不完整 ⚠️

**当前定义：**
```sql
type text NOT NULL DEFAULT 'system'
```

**问题说明：**
- `type` 字段没有 CHECK 约束
- 可以插入任意字符串，容易出现拼写错误
- 例如：`leave_application_submitted` vs `leave_application_submit`（少了 ted）

**建议修复：**
```sql
ALTER TABLE notifications 
ADD CONSTRAINT check_notification_type 
CHECK (type IN (
  'system',
  'announcement',
  'leave_application_submitted',
  'leave_approved',
  'leave_rejected',
  'resignation_application_submitted',
  'resignation_approved',
  'resignation_rejected',
  'verification_reminder',
  'attendance_reminder'
));
```

### 问题 3：related_id 字段缺失 ⚠️

**问题说明：**
- 代码中使用了 `related_id` 字段来关联申请
- 但是在表结构中没有找到这个字段的定义
- 这可能导致查询失败

**建议修复：**
```sql
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS related_id uuid;

CREATE INDEX IF NOT EXISTS idx_notifications_related_id ON notifications(related_id);
```

### 问题 4：审批状态更新的逻辑复杂度 ⚠️

**当前流程：**
1. 查询所有 `related_id = applicationId` 且 `type = 'leave_application_submitted'` 的通知
2. 针对每个通知的接收者单独更新
3. 判断接收者是否为审批人本人，显示不同的内容

**问题说明：**
- 逐个更新通知，如果通知数量多，性能可能受影响
- 错误处理不够完善，如果某个通知更新失败，其他通知会继续更新
- 没有事务保护，可能导致部分通知更新成功，部分失败

**建议优化：**
1. 使用批量更新，减少数据库往返次数
2. 添加事务保护，确保所有通知要么全部更新成功，要么全部失败
3. 改进错误处理，记录失败的通知ID

### 问题 5：is_admin 函数的定义不明确 ⚠️

**问题说明：**
- RLS 策略依赖 `is_admin(auth.uid())` 函数
- 但是这个函数的定义可能在不同的迁移文件中被修改过
- 需要确认当前生效的 `is_admin` 函数定义

**需要检查：**
1. `is_admin` 函数是否正确查询 `profiles.role` 字段
2. 是否包含所有管理员角色（`super_admin`, `peer_admin`）
3. 是否处理了用户不存在的情况

## 四、通知系统逻辑分析

### 1. 请假申请流程

#### 步骤 1：司机提交请假申请
- 创建请假申请记录
- 创建通知给所有管理员（老板、车队长）
- 通知类型：`leave_application_submitted`
- 通知状态：`approval_status = 'pending'`

#### 步骤 2：管理员审批
- 更新请假申请状态
- 更新所有原始申请通知（`type = 'leave_application_submitted'`）
  - 设置 `approval_status` 为 `approved` 或 `rejected`
  - 更新通知内容（根据接收者是否为审批人显示不同内容）
  - 设置 `is_read = false`（重置为未读）
- 创建新通知给司机
  - 通知类型：`leave_approved` 或 `leave_rejected`
  - 通知内容：审批结果

### 2. 潜在问题

#### 问题 A：通知内容的一致性 ⚠️
- 审批人看到："您通过了..."
- 其他管理员看到："老板【张三】通过了..."
- 如果审批人的姓名获取失败，会显示默认的"老板"或"车队长"
- 这可能导致通知内容不够明确

#### 问题 B：通知的重复性 ⚠️
- 如果同一个申请被多次审批（例如：车队长审批后，老板再审批）
- 每次审批都会更新所有原始通知
- 这可能导致通知内容被覆盖，丢失之前的审批信息

#### 问题 C：实时更新的可靠性 ⚠️
- 依赖 Supabase Realtime 订阅
- 如果订阅失败或网络中断，通知不会实时更新
- 需要添加重试机制或手动刷新功能

#### 问题 D：通知的删除策略 ⚠️
- 当前只有管理员可以删除通知
- 用户无法删除自己的通知
- 这可能导致通知列表越来越长，影响用户体验

**建议修复：**
```sql
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE
  USING (auth.uid() = recipient_id);
```

## 五、发现的严重问题

### 🔴 **关键问题：权限系统架构不一致**

**问题描述：**
系统中同时存在两种权限管理方式：
1. **旧方式**：`profiles` 表中的 `role` 字段
2. **新方式**：`user_roles` 表（单用户架构）

**当前状态：**
- ✅ `is_admin` 函数使用 `user_roles` 表（正确）
- ✅ 前端代码使用 `user_roles` 表（正确）
- ❌ README 文档说明使用 `profiles.role` 字段（**错误**）

**影响：**
- 文档与实际实现不一致，容易误导开发者
- 可能导致后续开发时使用错误的表

**修复方案：**
1. 更新 README 文档，说明当前使用 `user_roles` 表
2. 确认 `is_admin` 函数定义正确
3. 确认所有 RLS 策略使用正确的权限检查

### 🟡 **问题 1：用户更新策略缺少 WITH CHECK 子句**

**当前策略：**
```sql
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id);
```

**问题说明：**
- 只有 `USING` 子句，没有 `WITH CHECK` 子句
- PostgreSQL 会默认使用 `USING` 子句作为 `WITH CHECK`
- 但是最好显式指定，避免潜在问题

**修复方案：**
```sql
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);
```

### 🟡 **问题 2：用户无法删除自己的通知**

**当前状态：**
- 只有管理员可以删除通知
- 用户无法删除自己的通知

**影响：**
- 用户体验差，通知列表越来越长
- 用户无法清理已读通知

**修复方案：**
```sql
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE
  USING (auth.uid() = recipient_id);
```

## 五、优先级排序

### 高优先级（必须修复）
1. ✅ **问题 3：添加 related_id 字段**
   - 影响：代码中使用了这个字段，但表中没有定义
   - 风险：查询失败，审批功能无法正常工作

2. ✅ **问题 5：确认 is_admin 函数定义**
   - 影响：RLS 策略依赖这个函数
   - 风险：管理员权限可能不正确

### 中优先级（建议修复）
3. ⚠️ **问题 1：添加 WITH CHECK 子句**
   - 影响：用户更新通知时可能失败
   - 风险：中等，PostgreSQL 会使用默认行为

4. ⚠️ **问题 D：添加用户删除通知的策略**
   - 影响：用户体验
   - 风险：低，但会影响用户满意度

### 低优先级（可选优化）
5. ⚠️ **问题 2：添加 type 字段约束**
   - 影响：数据一致性
   - 风险：低，但可以防止拼写错误

6. ⚠️ **问题 4：优化审批状态更新逻辑**
   - 影响：性能和可靠性
   - 风险：低，当前逻辑可以工作，但不够优雅

## 六、建议的修复顺序

1. **立即修复**：
   - 检查 `related_id` 字段是否存在，如果不存在则添加
   - 确认 `is_admin` 函数定义是否正确

2. **短期修复**（本周内）：
   - 添加用户更新通知的 WITH CHECK 子句
   - 添加用户删除通知的策略

3. **中期优化**（下周）：
   - 添加 type 字段约束
   - 优化审批状态更新逻辑

4. **长期优化**（下个月）：
   - 添加通知归档功能
   - 添加通知统计功能
   - 优化实时更新机制
