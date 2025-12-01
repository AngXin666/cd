# 通知系统修复总结

## 问题概述
老板在审核请假、离职、车辆信息后，通知中心对应的那条信息应该更新状态为审核状态，但实际上没有更新。

## 已修复的问题

### 1. ✅ 请假申请通知类型不匹配

#### 问题描述
- 司机提交请假申请后，老板和车队长收到通知
- 老板审批后，通知状态不会更新，一直显示"待审批"

#### 根本原因
- **司机端发送通知**：`type: 'leave_submitted'`
- **老板端查询通知**：`type: 'leave_application_submitted'`
- **结果**：类型不匹配，查询不到通知，无法更新状态

#### 修复方案
- 修改司机端发送通知的类型为 `leave_application_submitted`
- 确保与老板端、车队长端查询的类型一致

#### 修改文件
- `src/pages/driver/leave/apply/index.tsx`

#### 验证步骤
1. 司机端提交请假申请
2. 检查老板端通知中心是否收到通知
3. 老板审批请假申请（通过或拒绝）
4. 检查老板端通知中心的通知状态是否更新
5. 检查通知内容是否显示审批结果

### 2. ✅ RLS 策略完整性问题

#### 问题描述
1. 用户更新通知的策略缺少 WITH CHECK 子句
2. 用户无法删除自己的通知

#### 修复方案
1. 为 "Users can update their own notifications" 策略添加 WITH CHECK 子句
2. 添加 "Users can delete their own notifications" 策略

#### 修改文件
- `supabase/migrations/00530_fix_notifications_rls_policies.sql`

### 3. ✅ 管理员更新通知的 RLS 策略

#### 问题描述
- 管理员审批时，需要更新其他管理员的通知，但 RLS 策略不允许

#### 修复方案
- 添加 "Admins can update all notifications" 策略
- 使用 `is_admin(auth.uid())` 函数判断管理员权限

#### 修改文件
- `supabase/migrations/00528_add_admin_update_notifications_policy.sql`
- `supabase/migrations/00529_fix_admin_update_notifications_policy.sql`

### 4. ✅ 审批流程中的 Session 检查问题

#### 问题描述
- 审批时出现"Session 不存在"错误

#### 修复方案
- 移除审批逻辑中间的额外 session 检查
- 依赖 `useAuth({guard: true})` 的认证检查

#### 修改文件
- `src/pages/super-admin/leave-approval/index.tsx`
- `src/pages/manager/leave-approval/index.tsx`

## 已验证的功能

### 离职申请通知 ✅
- **司机端发送**：`type: 'resignation_application_submitted'`
- **老板端查询**：`type: 'resignation_application_submitted'`
- **状态**：类型匹配，无需修复

### 车辆审核通知 ⚠️
- **状态**：未找到车辆审核的通知更新逻辑
- **建议**：如果需要车辆审核通知更新功能，需要单独实现

## 通知系统架构说明

### 通知流程
1. **司机提交申请**
   - 创建申请记录（`leave_applications` 表）
   - 发送通知给管理员（老板、车队长）
   - 通知包含：`related_id`（申请ID）、`type`（通知类型）

2. **管理员审批**
   - 更新申请状态
   - 查询原始通知：`WHERE related_id = applicationId AND type = '..._application_submitted'`
   - 更新原始通知的状态和内容
   - 创建新通知给司机（审批结果）

3. **通知状态更新**
   - 原始通知：`approval_status` 更新为 `approved` 或 `rejected`
   - 通知内容：显示审批人和审批结果
   - 未读状态：重置为未读（`is_read = false`）

### 关键字段
- `related_id`：关联的申请ID，用于查询和更新通知
- `type`：通知类型，必须与查询条件匹配
- `approval_status`：审批状态（`pending`/`approved`/`rejected`）

### 权限系统
- **单用户架构**：使用 `user_roles` 表管理用户角色
- **RLS 策略**：使用 `is_admin(auth.uid())` 函数判断管理员权限
- **角色类型**：`BOSS`（老板）、`MANAGER`（车队长）、`DRIVER`（司机）

## 通知类型定义

### 请假申请相关
- `leave_application_submitted`：请假申请提交（管理员收到）✅
- `leave_approved`：请假批准（司机收到）
- `leave_rejected`：请假拒绝（司机收到）
- ~~`leave_submitted`~~：已废弃，不应使用 ❌

### 离职申请相关
- `resignation_application_submitted`：离职申请提交（管理员收到）✅
- `resignation_approved`：离职批准（司机收到）
- `resignation_rejected`：离职拒绝（司机收到）

### 车辆审核相关
- `vehicle_review_pending`：车辆待审核
- `vehicle_review_approved`：车辆审核通过
- `vehicle_review_need_supplement`：车辆需要补录

## 测试建议

### 请假申请流程测试
1. ✅ 司机提交请假申请
2. ✅ 老板收到通知（类型：`leave_application_submitted`）
3. ✅ 老板审批通过
4. ✅ 老板端通知状态更新为"已通过"
5. ✅ 司机收到审批结果通知
6. ✅ 车队长端通知状态也更新

### 离职申请流程测试
1. ✅ 司机提交离职申请
2. ✅ 老板收到通知（类型：`resignation_application_submitted`）
3. ✅ 老板审批通过
4. ✅ 老板端通知状态更新为"已通过"
5. ✅ 司机收到审批结果通知

### 车辆审核流程测试
1. ⚠️ 司机提交车辆信息
2. ⚠️ 老板收到通知（需要确认通知类型）
3. ⚠️ 老板审核车辆信息
4. ⚠️ 检查通知状态是否更新（可能未实现）

## 后续优化建议

### 1. 统一通知类型命名
- 删除 `leave_submitted` 类型定义
- 只保留 `leave_application_submitted`
- 添加类型检查，防止类似问题

### 2. 完善车辆审核通知
- 实现车辆审核后的通知状态更新
- 确保通知类型一致性

### 3. 添加通知归档功能
- 允许用户删除已读通知
- 添加通知自动清理机制

### 4. 优化通知更新性能
- 使用批量更新代替逐个更新
- 添加事务保护

### 5. 改进错误处理
- 添加更详细的错误日志
- 提供用户友好的错误提示

## 相关文档
- `RLS_AND_NOTIFICATION_ANALYSIS.md`：RLS 策略和通知系统逻辑分析
- `NOTIFICATION_TYPE_MISMATCH_ANALYSIS.md`：通知类型不匹配问题详细分析
- `README.md`：项目文档，包含所有修复记录
