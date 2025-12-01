# 通知系统调试指南

## 问题描述
用户反馈：老板在审核请假申请后，通知中心会出现两条信息，而不是更新原有通知的状态。

## 最新发现（2025-12-01）

### 错误信息
```
invalid input syntax for type uuid: "anon"
```

### 问题分析
1. **错误位置**：在老板审批请假申请时，查询原始通知失败
2. **错误原因**：`applicationId` 的值是字符串 `"anon"`，而不是有效的 UUID
3. **影响范围**：
   - 无法查询到原始通知
   - 无法更新通知状态
   - 老板会看到未更新的通知

### 可能的根本原因
1. **数据库中存在无效数据**：
   - `leave_applications` 表中可能有 `id = 'anon'` 的记录
   - 这可能是测试数据或错误数据
   
2. **用户认证问题**：
   - 用户可能使用了匿名会话
   - `user.id` 可能是 `'anon'`

### 解决方案
1. **添加数据验证**：
   - 在司机端提交请假申请后，验证返回的 `applicationId` 是否有效
   - 在老板端审批前，验证 `applicationId` 是否有效
   
2. **清理无效数据**：
   - 使用 `CLEANUP_INVALID_DATA.sql` 脚本检查数据库
   - 删除无效的记录

3. **防止创建无效数据**：
   - 确保用户已正确登录
   - 验证 `user.id` 不是 `'anon'`

## 已完成的修复

### 1. ✅ 修复通知类型不匹配
- **问题**：司机端使用 `leave_submitted`，老板端查询 `leave_application_submitted`
- **修复**：统一使用 `leave_application_submitted`
- **文件**：`src/pages/driver/leave/apply/index.tsx`

### 2. ✅ 添加详细的调试日志
- **位置**：`src/pages/super-admin/leave-approval/index.tsx`
- **内容**：
  - 查询原始通知前的参数日志
  - 查询结果的详细信息
  - 更新过程的每一步日志
  - 错误信息的详细输出

## 调试步骤

### 第零步：检查和清理无效数据（重要！）
在开始测试之前，**必须先检查数据库中是否有无效数据**。

#### 1. 运行检查脚本
使用 `CLEANUP_INVALID_DATA.sql` 脚本检查数据库：

```sql
-- 1. 检查是否有无效的 ID
SELECT 
  id,
  user_id,
  leave_type,
  start_date,
  end_date,
  status,
  created_at
FROM leave_applications
WHERE 
  id::text = 'anon'
  OR user_id::text = 'anon'
ORDER BY created_at DESC;
```

#### 2. 如果发现无效数据
**症状**：查询结果显示有 `id` 或 `user_id` 为 `'anon'` 的记录

**解决方案**：删除这些无效记录
```sql
-- 删除 ID 为 'anon' 的请假申请
DELETE FROM leave_applications WHERE id::text = 'anon';

-- 删除 user_id 为 'anon' 的请假申请
DELETE FROM leave_applications WHERE user_id::text = 'anon';

-- 删除 related_id 为 'anon' 的通知
DELETE FROM notifications WHERE related_id::text = 'anon';
```

#### 3. 验证清理结果
```sql
-- 确认没有无效数据
SELECT COUNT(*) as invalid_count
FROM leave_applications
WHERE id::text = 'anon' OR user_id::text = 'anon';

-- 应该返回 0
```

#### 4. 检查用户认证状态
确保用户已正确登录：
1. 打开浏览器控制台
2. 运行以下代码：
```javascript
// 检查当前用户
const { data: { user } } = await supabase.auth.getUser()
console.log('当前用户:', user)
console.log('用户ID:', user?.id)

// 验证用户ID是否有效
if (user?.id === 'anon' || !user?.id || user?.id.length < 10) {
  console.error('❌ 用户ID无效！')
} else {
  console.log('✅ 用户ID有效')
}
```

### 第一步：清理现有数据
为了准确测试，建议先清理现有的通知数据：

```sql
-- 查看所有请假相关的通知
SELECT 
  id,
  recipient_id,
  type,
  title,
  approval_status,
  related_id,
  created_at
FROM notifications
WHERE type IN ('leave_application_submitted', 'leave_submitted', 'leave_approved', 'leave_rejected')
ORDER BY created_at DESC;

-- 如果需要，可以删除测试数据
-- DELETE FROM notifications WHERE type IN ('leave_application_submitted', 'leave_submitted', 'leave_approved', 'leave_rejected');
```

### 第二步：司机提交请假申请
1. 使用司机账号登录
2. 提交一个请假申请
3. **打开浏览器控制台**，查看日志输出
4. 记录以下信息：
   - 请假申请ID（`applicationId`）
   - 通知发送结果
   - 是否有错误信息

**预期日志：**
```
✅ 请假申请提交成功
📬 发送司机提交申请通知
✅ 将通知主账号（老板）
✅ 将通知有管辖权的车队长
📊 通知接收者总数: X
📮 通知发送结果: true
```

### 第三步：检查数据库中的通知
```sql
-- 使用第二步记录的 applicationId
SELECT 
  id,
  recipient_id,
  type,
  title,
  approval_status,
  related_id,
  is_read,
  created_at
FROM notifications
WHERE related_id = '<applicationId>'
ORDER BY created_at;
```

**预期结果：**
- 应该有 1-3 条通知（取决于有多少管理员）
- 所有通知的 `type` 应该是 `leave_application_submitted`
- 所有通知的 `related_id` 应该是请假申请的ID
- 所有通知的 `approval_status` 应该是 `pending`

### 第四步：老板审批请假申请
1. 使用老板账号登录
2. 进入请假审批页面
3. **打开浏览器控制台**，查看日志输出
4. 点击"批准"或"拒绝"按钮
5. 仔细查看控制台输出的所有日志

**关键日志：**
```
🔍 开始查询原始申请通知: {
  related_id: '<applicationId>',
  type: 'leave_application_submitted',
  current_user: '<userId>'
}

🔍 查询到 X 条原始申请通知

📋 通知详情:
  [1] ID: xxx
      接收者: xxx
      类型: leave_application_submitted
      关联ID: <applicationId>
      审批状态: pending
      标题: 新的请假申请
      是否已读: false

📝 准备更新通知 xxx:
  - 接收者: xxx
  - 是否为审批人: true/false
  - 新状态: approved/rejected
  - 新内容: xxx

✅ 成功更新通知 xxx

📊 通知更新结果: 成功 X 条, 失败 0 条

✅ 已发送审批结果通知给司机: xxx
```

### 第五步：再次检查数据库
```sql
-- 使用相同的 applicationId
SELECT 
  id,
  recipient_id,
  type,
  title,
  approval_status,
  related_id,
  is_read,
  content,
  created_at,
  updated_at
FROM notifications
WHERE related_id = '<applicationId>'
ORDER BY created_at;
```

**预期结果：**
- 原有的通知（`type = 'leave_application_submitted'`）应该被更新：
  - `approval_status` 变为 `approved` 或 `rejected`
  - `title` 变为 `请假审批通知`
  - `content` 包含审批结果
  - `is_read` 重置为 `false`
  - `updated_at` 更新为当前时间
- 新增一条通知给司机（`type = 'leave_approved'` 或 `leave_rejected'`）

### 第六步：检查通知中心
1. 使用老板账号查看通知中心
2. 检查是否有重复的通知
3. 检查通知的状态是否正确

## 可能的问题和解决方案

### 问题 1：查询不到原始通知（`existingNotifications` 为空）

**可能原因：**
1. **类型不匹配**：司机端使用了错误的类型
   - 检查：`src/pages/driver/leave/apply/index.tsx` 第 485 行
   - 应该是：`type: 'leave_application_submitted'`

2. **related_id 为 null**：司机提交时没有传递 `relatedId`
   - 检查：`src/pages/driver/leave/apply/index.tsx` 第 488 行
   - 应该有：`relatedId: applicationId`

3. **通知创建失败**：司机提交时通知没有成功创建
   - 检查控制台日志，查看是否有错误信息
   - 检查数据库，确认通知是否存在

**解决方案：**
- 确保司机端使用正确的通知类型
- 确保 `relatedId` 正确传递
- 检查 RLS 策略，确保司机有权限创建通知

### 问题 2：更新通知失败

**可能原因：**
1. **权限问题**：RLS 策略不允许更新
   - 检查：`supabase/migrations/00530_fix_notifications_rls_policies.sql`
   - 应该有：`"Admins can update all notifications"` 策略

2. **数据验证失败**：更新的数据不符合表结构
   - 检查控制台日志中的错误信息

**解决方案：**
- 确保 RLS 策略正确配置
- 检查更新的数据格式是否正确

### 问题 3：创建了重复的通知

**可能原因：**
1. **更新失败后创建了新通知**：某些逻辑错误导致创建了新通知
   - 检查代码，确认没有在更新失败后创建新通知

2. **多次提交**：用户多次点击提交按钮
   - 添加防抖或禁用按钮

**解决方案：**
- 确保更新逻辑正确执行
- 添加提交按钮的防抖保护

## 诊断检查清单

### 司机端提交
- [ ] 通知类型是否为 `leave_application_submitted`
- [ ] `relatedId` 是否正确传递
- [ ] 通知是否成功创建
- [ ] 数据库中是否有对应的通知记录

### 老板端审批
- [ ] 是否能查询到原始通知
- [ ] 查询到的通知数量是否正确
- [ ] 通知更新是否成功
- [ ] 是否有更新失败的错误日志
- [ ] 是否创建了新通知给司机

### 数据库检查
- [ ] 原始通知的 `approval_status` 是否更新
- [ ] 原始通知的 `title` 和 `content` 是否更新
- [ ] 原始通知的 `updated_at` 是否更新
- [ ] 是否有重复的通知记录

### RLS 策略检查
- [ ] 用户是否有权限创建通知
- [ ] 用户是否有权限更新自己的通知
- [ ] 管理员是否有权限更新所有通知
- [ ] 用户是否有权限删除自己的通知

## 常见错误信息

### "Session not exists"
- **原因**：认证会话不存在
- **解决**：移除额外的 session 检查，依赖 `useAuth({guard: true})`

### "new row violates row-level security policy"
- **原因**：RLS 策略不允许操作
- **解决**：检查并修复 RLS 策略

### "查询到 0 条原始申请通知"
- **原因**：类型不匹配或 `related_id` 不匹配
- **解决**：确保司机端和老板端使用相同的类型和 `related_id`

## 下一步行动

1. **清理测试数据**：删除所有测试通知
2. **完整测试流程**：按照上述步骤完整测试一遍
3. **记录日志**：保存所有控制台日志
4. **检查数据库**：在每个步骤后检查数据库状态
5. **报告问题**：如果问题仍然存在，提供详细的日志和数据库截图

## 联系支持

如果按照上述步骤仍然无法解决问题，请提供以下信息：
1. 完整的控制台日志（司机端和老板端）
2. 数据库查询结果截图
3. 问题复现的详细步骤
4. 浏览器和操作系统信息
