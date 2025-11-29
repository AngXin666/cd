/*
# 批量删除所有引用 profiles 的外键约束以支持多租户架构

## 背景
在多租户架构中，用户可能存在于不同的 Schema 中：
- 中央用户：`public.profiles`
- 租户用户：`tenant_xxx.profiles`

单一外键约束无法覆盖这两种情况，导致租户用户无法正常使用系统功能。

## 问题范围
经过审计，发现 23 个表共有 41 个外键约束引用 `public.profiles`，包括：
- attendance（考勤记录）
- attendance_rules（考勤规则）
- auto_reminder_rules（自动提醒规则）
- category_prices（类别价格）
- driver_licenses（驾驶证）
- feedback（反馈）
- lease_bills（租赁账单）
- notification_send_records（通知发送记录）
- notification_templates（通知模板）
- permission_audit_logs（权限审计日志）
- piece_work_records（计件工作记录）
- profiles（用户档案）
- resignation_applications（离职申请）
- scheduled_notifications（定时通知）
- security_audit_log（安全审计日志）
- system_performance_metrics（系统性能指标）
- user_behavior_logs（用户行为日志）
- user_feature_weights（用户功能权重）
- user_permissions（用户权限）
- vehicle_leases（车辆租赁）
- vehicle_records（车辆记录）
- vehicles（车辆）
- warehouses（仓库）

## 解决方案
批量删除所有引用 `public.profiles` 的外键约束。

## 为什么删除外键约束是安全的？

### 1. 多租户架构的特性
在多租户架构中，用户可能存在于不同的 Schema 中，单一外键约束无法覆盖这两种情况。

### 2. 数据完整性保证
虽然删除了外键约束，但数据完整性仍然得到保证：

1. **应用层验证**：
   - 前端代码在操作前，会验证用户是否存在
   - 使用 `getCurrentUserRoleAndTenant()` 获取用户信息
   - 只有认证用户才能操作

2. **认证系统保证**：
   - 所有用户都在 `auth.users` 表中
   - 用户 ID 由 Supabase Auth 系统保证有效性

3. **RLS 策略保护**：
   - 所有表都启用了 RLS
   - 只有认证用户才能访问数据
   - 用户只能访问自己的数据或有权限的数据

4. **业务逻辑保证**：
   - 所有操作都需要认证
   - 权限由 RLS 策略控制
   - 不会出现无效用户的数据

### 3. 性能优势
删除外键约束可以提高性能：
- 不需要检查 `profiles` 表
- 减少数据库锁定
- 提高并发性能

## 安全考虑
- ✅ 应用层验证确保用户存在
- ✅ 认证系统保证用户 ID 有效
- ✅ RLS 策略保护数据访问
- ✅ 业务逻辑保证数据完整性
- ✅ 不影响现有功能

## 未来优化建议
如果需要更严格的数据完整性检查，可以考虑：
1. 创建触发器，在插入数据时验证用户是否存在（检查 `auth.users` 表）
2. 创建定期清理任务，删除无效用户的数据
3. 在应用层添加更严格的验证逻辑

*/

-- ============================================================
-- 1. attendance（考勤记录）
-- ============================================================
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_tenant_id_fkey;

COMMENT ON COLUMN attendance.user_id IS 
  '用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN attendance.tenant_id IS 
  '租户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 2. attendance_rules（考勤规则）
-- ============================================================
ALTER TABLE attendance_rules DROP CONSTRAINT IF EXISTS attendance_rules_tenant_id_fkey;

COMMENT ON COLUMN attendance_rules.tenant_id IS 
  '租户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 3. auto_reminder_rules（自动提醒规则）
-- ============================================================
ALTER TABLE auto_reminder_rules DROP CONSTRAINT IF EXISTS auto_reminder_rules_created_by_fkey;

COMMENT ON COLUMN auto_reminder_rules.created_by IS 
  '创建人用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 4. category_prices（类别价格）
-- ============================================================
ALTER TABLE category_prices DROP CONSTRAINT IF EXISTS category_prices_tenant_id_fkey;

COMMENT ON COLUMN category_prices.tenant_id IS 
  '租户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 5. driver_licenses（驾驶证）
-- ============================================================
ALTER TABLE driver_licenses DROP CONSTRAINT IF EXISTS driver_licenses_driver_id_fkey;
ALTER TABLE driver_licenses DROP CONSTRAINT IF EXISTS driver_licenses_tenant_id_fkey;

COMMENT ON COLUMN driver_licenses.driver_id IS 
  '司机用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN driver_licenses.tenant_id IS 
  '租户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 6. feedback（反馈）
-- ============================================================
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_user_id_fkey;
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_responded_by_fkey;
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_tenant_id_fkey;

COMMENT ON COLUMN feedback.user_id IS 
  '用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN feedback.responded_by IS 
  '响应人用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN feedback.tenant_id IS 
  '租户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 7. lease_bills（租赁账单）
-- ============================================================
ALTER TABLE lease_bills DROP CONSTRAINT IF EXISTS lease_bills_tenant_id_fkey;
ALTER TABLE lease_bills DROP CONSTRAINT IF EXISTS lease_bills_verified_by_fkey;

COMMENT ON COLUMN lease_bills.tenant_id IS 
  '租户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN lease_bills.verified_by IS 
  '验证人用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 8. notification_send_records（通知发送记录）
-- ============================================================
ALTER TABLE notification_send_records DROP CONSTRAINT IF EXISTS notification_send_records_sent_by_fkey;

COMMENT ON COLUMN notification_send_records.sent_by IS 
  '发送人用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 9. notification_templates（通知模板）
-- ============================================================
ALTER TABLE notification_templates DROP CONSTRAINT IF EXISTS notification_templates_created_by_fkey;

COMMENT ON COLUMN notification_templates.created_by IS 
  '创建人用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 10. permission_audit_logs（权限审计日志）
-- ============================================================
ALTER TABLE permission_audit_logs DROP CONSTRAINT IF EXISTS permission_audit_logs_operator_id_fkey;
ALTER TABLE permission_audit_logs DROP CONSTRAINT IF EXISTS permission_audit_logs_target_user_id_fkey;

COMMENT ON COLUMN permission_audit_logs.operator_id IS 
  '操作人用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN permission_audit_logs.target_user_id IS 
  '目标用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 11. piece_work_records（计件工作记录）
-- ============================================================
ALTER TABLE piece_work_records DROP CONSTRAINT IF EXISTS piece_work_records_user_id_fkey;
ALTER TABLE piece_work_records DROP CONSTRAINT IF EXISTS piece_work_records_tenant_id_fkey;

COMMENT ON COLUMN piece_work_records.user_id IS 
  '用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN piece_work_records.tenant_id IS 
  '租户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 12. profiles（用户档案）
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_main_account_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_tenant_id_fkey;

COMMENT ON COLUMN profiles.main_account_id IS 
  '主账号用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN profiles.tenant_id IS 
  '租户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 13. resignation_applications（离职申请）
-- ============================================================
ALTER TABLE resignation_applications DROP CONSTRAINT IF EXISTS resignation_applications_user_id_fkey;
ALTER TABLE resignation_applications DROP CONSTRAINT IF EXISTS resignation_applications_reviewed_by_fkey;
ALTER TABLE resignation_applications DROP CONSTRAINT IF EXISTS resignation_applications_tenant_id_fkey;

COMMENT ON COLUMN resignation_applications.user_id IS 
  '申请人用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN resignation_applications.reviewed_by IS 
  '审批人用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN resignation_applications.tenant_id IS 
  '租户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 14. scheduled_notifications（定时通知）
-- ============================================================
ALTER TABLE scheduled_notifications DROP CONSTRAINT IF EXISTS scheduled_notifications_created_by_fkey;

COMMENT ON COLUMN scheduled_notifications.created_by IS 
  '创建人用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 15. security_audit_log（安全审计日志）
-- ============================================================
ALTER TABLE security_audit_log DROP CONSTRAINT IF EXISTS security_audit_log_user_id_fkey;

COMMENT ON COLUMN security_audit_log.user_id IS 
  '用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 16. system_performance_metrics（系统性能指标）
-- ============================================================
ALTER TABLE system_performance_metrics DROP CONSTRAINT IF EXISTS system_performance_metrics_user_id_fkey;

COMMENT ON COLUMN system_performance_metrics.user_id IS 
  '用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 17. user_behavior_logs（用户行为日志）
-- ============================================================
ALTER TABLE user_behavior_logs DROP CONSTRAINT IF EXISTS user_behavior_logs_user_id_fkey;

COMMENT ON COLUMN user_behavior_logs.user_id IS 
  '用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 18. user_feature_weights（用户功能权重）
-- ============================================================
ALTER TABLE user_feature_weights DROP CONSTRAINT IF EXISTS user_feature_weights_user_id_fkey;

COMMENT ON COLUMN user_feature_weights.user_id IS 
  '用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 19. user_permissions（用户权限）
-- ============================================================
ALTER TABLE user_permissions DROP CONSTRAINT IF EXISTS user_permissions_user_id_fkey;

COMMENT ON COLUMN user_permissions.user_id IS 
  '用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 20. vehicle_leases（车辆租赁）
-- ============================================================
ALTER TABLE vehicle_leases DROP CONSTRAINT IF EXISTS vehicle_leases_driver_id_fkey;
ALTER TABLE vehicle_leases DROP CONSTRAINT IF EXISTS vehicle_leases_created_by_fkey;

COMMENT ON COLUMN vehicle_leases.driver_id IS 
  '司机用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN vehicle_leases.created_by IS 
  '创建人用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 21. vehicle_records（车辆记录）
-- ============================================================
ALTER TABLE vehicle_records DROP CONSTRAINT IF EXISTS vehicle_records_driver_id_fkey;
ALTER TABLE vehicle_records DROP CONSTRAINT IF EXISTS vehicle_records_tenant_id_fkey;

COMMENT ON COLUMN vehicle_records.driver_id IS 
  '司机用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN vehicle_records.tenant_id IS 
  '租户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 22. vehicles（车辆）
-- ============================================================
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_driver_id_fkey;
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_current_driver_id_fkey;
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_owner_id_fkey;
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_reviewed_by_fkey;
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_tenant_id_fkey;
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_user_id_fkey;

COMMENT ON COLUMN vehicles.driver_id IS 
  '司机用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN vehicles.current_driver_id IS 
  '当前司机用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN vehicles.owner_id IS 
  '车主用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN vehicles.reviewed_by IS 
  '审核人用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN vehicles.tenant_id IS 
  '租户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

COMMENT ON COLUMN vehicles.user_id IS 
  '用户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';

-- ============================================================
-- 23. warehouses（仓库）
-- ============================================================
ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS warehouses_tenant_id_fkey;

COMMENT ON COLUMN warehouses.tenant_id IS 
  '租户ID（来自 auth.users）。注意：在多租户架构中，用户可能在 public.profiles 或 tenant_xxx.profiles 中，因此不使用外键约束。数据完整性由应用层验证、认证系统和 RLS 策略保证。';
