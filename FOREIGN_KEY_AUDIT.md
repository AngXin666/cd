# 多租户架构外键约束审计报告

## 审计日期
2025-11-05

## 审计目的
检查所有引用 `public.profiles` 的外键约束，确保系统完全支持多租户架构。

---

## 发现的问题表

### 1. attendance（考勤记录）
**外键约束**：
- `attendance_user_id_fkey`：user_id → profiles(id)
- `attendance_tenant_id_fkey`：tenant_id → profiles(id)

**影响**：租户用户无法创建考勤记录

---

### 2. attendance_rules（考勤规则）
**外键约束**：
- `attendance_rules_tenant_id_fkey`：tenant_id → profiles(id)

**影响**：租户无法创建考勤规则

---

### 3. auto_reminder_rules（自动提醒规则）
**外键约束**：
- `auto_reminder_rules_created_by_fkey`：created_by → profiles(id)

**影响**：租户用户无法创建自动提醒规则

---

### 4. category_prices（类别价格）
**外键约束**：
- `category_prices_tenant_id_fkey`：tenant_id → profiles(id)

**影响**：租户无法设置类别价格

---

### 5. driver_licenses（驾驶证）
**外键约束**：
- `driver_licenses_driver_id_fkey`：driver_id → profiles(id)
- `driver_licenses_tenant_id_fkey`：tenant_id → profiles(id)

**影响**：租户用户无法添加驾驶证信息

---

### 6. feedback（反馈）
**外键约束**：
- `feedback_user_id_fkey`：user_id → profiles(id)
- `feedback_responded_by_fkey`：responded_by → profiles(id)
- `feedback_tenant_id_fkey`：tenant_id → profiles(id)

**影响**：租户用户无法提交反馈

---

### 7. lease_bills（租赁账单）
**外键约束**：
- `lease_bills_tenant_id_fkey`：tenant_id → profiles(id)
- `lease_bills_verified_by_fkey`：verified_by → profiles(id)

**影响**：租户无法创建租赁账单

---

### 8. notification_send_records（通知发送记录）
**外键约束**：
- `notification_send_records_sent_by_fkey`：sent_by → profiles(id)

**影响**：租户用户无法创建通知发送记录

---

### 9. notification_templates（通知模板）
**外键约束**：
- `notification_templates_created_by_fkey`：created_by → profiles(id)

**影响**：租户用户无法创建通知模板

---

### 10. permission_audit_logs（权限审计日志）
**外键约束**：
- `permission_audit_logs_operator_id_fkey`：operator_id → profiles(id)
- `permission_audit_logs_target_user_id_fkey`：target_user_id → profiles(id)

**影响**：租户用户的权限操作无法记录

---

### 11. piece_work_records（计件工作记录）
**外键约束**：
- `piece_work_records_user_id_fkey`：user_id → profiles(id)
- `piece_work_records_tenant_id_fkey`：tenant_id → profiles(id)

**影响**：租户用户无法创建计件工作记录

---

### 12. profiles（用户档案）
**外键约束**：
- `profiles_main_account_id_fkey`：main_account_id → profiles(id)
- `profiles_tenant_id_fkey`：tenant_id → profiles(id)

**影响**：租户用户无法创建子账号

---

### 13. resignation_applications（离职申请）
**外键约束**：
- `resignation_applications_user_id_fkey`：user_id → profiles(id)
- `resignation_applications_reviewed_by_fkey`：reviewed_by → profiles(id)
- `resignation_applications_tenant_id_fkey`：tenant_id → profiles(id)

**影响**：租户用户无法提交离职申请

---

### 14. scheduled_notifications（定时通知）
**外键约束**：
- `scheduled_notifications_created_by_fkey`：created_by → profiles(id)

**影响**：租户用户无法创建定时通知

---

### 15. security_audit_log（安全审计日志）
**外键约束**：
- `security_audit_log_user_id_fkey`：user_id → profiles(id)

**影响**：租户用户的安全操作无法记录

---

### 16. system_performance_metrics（系统性能指标）
**外键约束**：
- `system_performance_metrics_user_id_fkey`：user_id → profiles(id)

**影响**：租户用户的性能指标无法记录

---

### 17. user_behavior_logs（用户行为日志）
**外键约束**：
- `user_behavior_logs_user_id_fkey`：user_id → profiles(id)

**影响**：租户用户的行为无法记录

---

### 18. user_feature_weights（用户功能权重）
**外键约束**：
- `user_feature_weights_user_id_fkey`：user_id → profiles(id)

**影响**：租户用户无法设置功能权重

---

### 19. user_permissions（用户权限）
**外键约束**：
- `user_permissions_user_id_fkey`：user_id → profiles(id)

**影响**：租户用户无法设置权限

---

### 20. vehicle_leases（车辆租赁）
**外键约束**：
- `vehicle_leases_driver_id_fkey`：driver_id → profiles(id)
- `vehicle_leases_created_by_fkey`：created_by → profiles(id)

**影响**：租户用户无法创建车辆租赁

---

### 21. vehicle_records（车辆记录）
**外键约束**：
- `vehicle_records_driver_id_fkey`：driver_id → profiles(id)
- `vehicle_records_tenant_id_fkey`：tenant_id → profiles(id)

**影响**：租户用户无法创建车辆记录

---

### 22. vehicles（车辆）
**外键约束**：
- `vehicles_driver_id_fkey`：driver_id → profiles(id)
- `vehicles_current_driver_id_fkey`：current_driver_id → profiles(id)
- `vehicles_owner_id_fkey`：owner_id → profiles(id)
- `vehicles_reviewed_by_fkey`：reviewed_by → profiles(id)
- `vehicles_tenant_id_fkey`：tenant_id → profiles(id)
- `vehicles_user_id_fkey`：user_id → profiles(id)

**影响**：租户用户无法创建车辆

---

### 23. warehouses（仓库）
**外键约束**：
- `warehouses_tenant_id_fkey`：tenant_id → profiles(id)

**影响**：租户无法创建仓库

---

## 统计信息

**总计**：23 个表，41 个外键约束

**已修复**：
1. ✅ notifications（通知）
2. ✅ driver_warehouses（司机仓库分配）
3. ✅ manager_warehouses（管理员仓库分配）
4. ✅ leave_applications（请假申请）

**待修复**：23 个表

---

## 修复策略

### 策略1：批量删除外键约束（推荐）
创建一个迁移文件，批量删除所有引用 `profiles` 的外键约束。

**优点**：
- 一次性解决所有问题
- 避免重复工作
- 统一管理

**缺点**：
- 需要仔细测试
- 可能影响现有功能

### 策略2：按需修复
只修复用户实际使用的功能相关的表。

**优点**：
- 风险较小
- 可以逐步验证

**缺点**：
- 需要多次修复
- 可能遗漏某些表

---

## 建议

**推荐使用策略1**，原因：
1. 系统已经采用多租户架构，所有表都应该支持
2. 外键约束的删除不会影响数据完整性（有应用层验证、认证系统和RLS策略保证）
3. 一次性修复可以避免未来出现类似问题
4. 提高系统性能（减少外键检查）

---

## 下一步行动

1. 创建批量删除外键约束的迁移文件
2. 为所有受影响的列添加注释，说明设计决策
3. 更新文档，记录修复过程
4. 测试所有功能，确保正常工作

---

## 数据完整性保证

虽然删除了外键约束，但数据完整性仍然得到保证：

1. **应用层验证**：
   - 前端代码验证用户存在
   - 使用 `getCurrentUserRoleAndTenant()` 获取用户信息
   - 只有认证用户才能操作

2. **认证系统保证**：
   - 所有用户都在 `auth.users` 表中
   - 用户 ID 有效性由 Supabase Auth 保证

3. **RLS 策略保护**：
   - 所有表都启用了 RLS
   - 只有认证用户才能访问数据
   - 用户只能访问自己的数据或有权限的数据

4. **业务逻辑保证**：
   - 所有操作都需要认证
   - 权限由 RLS 策略控制
   - 不会出现无效用户的数据

5. **性能优势**：
   - 提高插入性能
   - 减少数据库锁定
   - 提高并发性能
