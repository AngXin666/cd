/*
# 为剩余表添加 boss_id 字段

## 目标
为还没有 boss_id 字段的表添加该字段，完善租户隔离。

## 添加 boss_id 的表
- leases（租赁信息）
- lease_bills（租赁账单）
- vehicle_leases（车辆租赁）
- auto_reminder_rules（自动提醒规则）
- notification_templates（通知模板）
- notification_send_records（通知发送记录）
- scheduled_notifications（定时通知）
- permission_audit_logs（权限审计日志）
- security_audit_log（安全审计日志）
*/

-- 1. leases 表
ALTER TABLE leases ADD COLUMN IF NOT EXISTS boss_id text;
CREATE INDEX IF NOT EXISTS idx_leases_boss_id ON leases(boss_id);

-- 2. lease_bills 表
ALTER TABLE lease_bills ADD COLUMN IF NOT EXISTS boss_id text;
CREATE INDEX IF NOT EXISTS idx_lease_bills_boss_id ON lease_bills(boss_id);

-- 3. vehicle_leases 表
ALTER TABLE vehicle_leases ADD COLUMN IF NOT EXISTS boss_id text;
CREATE INDEX IF NOT EXISTS idx_vehicle_leases_boss_id ON vehicle_leases(boss_id);

-- 4. auto_reminder_rules 表
ALTER TABLE auto_reminder_rules ADD COLUMN IF NOT EXISTS boss_id text;
CREATE INDEX IF NOT EXISTS idx_auto_reminder_rules_boss_id ON auto_reminder_rules(boss_id);

-- 5. notification_templates 表
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS boss_id text;
CREATE INDEX IF NOT EXISTS idx_notification_templates_boss_id ON notification_templates(boss_id);

-- 6. notification_send_records 表
ALTER TABLE notification_send_records ADD COLUMN IF NOT EXISTS boss_id text;
CREATE INDEX IF NOT EXISTS idx_notification_send_records_boss_id ON notification_send_records(boss_id);

-- 7. scheduled_notifications 表
ALTER TABLE scheduled_notifications ADD COLUMN IF NOT EXISTS boss_id text;
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_boss_id ON scheduled_notifications(boss_id);

-- 8. permission_audit_logs 表
ALTER TABLE permission_audit_logs ADD COLUMN IF NOT EXISTS boss_id text;
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_boss_id ON permission_audit_logs(boss_id);

-- 9. security_audit_log 表
ALTER TABLE security_audit_log ADD COLUMN IF NOT EXISTS boss_id text;
CREATE INDEX IF NOT EXISTS idx_security_audit_log_boss_id ON security_audit_log(boss_id);

-- 为现有数据填充 boss_id

-- 更新 leases 表
UPDATE leases l
SET boss_id = v.boss_id
FROM vehicles v
WHERE l.vehicle_id = v.id AND l.boss_id IS NULL;

-- 更新 lease_bills 表
UPDATE lease_bills lb
SET boss_id = l.boss_id
FROM leases l
WHERE lb.lease_id = l.id AND lb.boss_id IS NULL;

-- 更新 vehicle_leases 表
UPDATE vehicle_leases vl
SET boss_id = v.boss_id
FROM vehicles v
WHERE vl.vehicle_id = v.id AND vl.boss_id IS NULL;

-- 更新 auto_reminder_rules 表（假设它关联到 warehouses）
UPDATE auto_reminder_rules arr
SET boss_id = w.boss_id
FROM warehouses w
WHERE arr.warehouse_id = w.id AND arr.boss_id IS NULL;

-- 更新 notification_templates 表（假设它是全局的，设置为创建者的 boss_id）
UPDATE notification_templates nt
SET boss_id = p.boss_id
FROM profiles p
WHERE nt.created_by = p.id AND nt.boss_id IS NULL;

-- 更新 notification_send_records 表
UPDATE notification_send_records nsr
SET boss_id = n.boss_id
FROM notifications n
WHERE nsr.notification_id = n.id AND nsr.boss_id IS NULL;

-- 更新 scheduled_notifications 表
UPDATE scheduled_notifications sn
SET boss_id = p.boss_id
FROM profiles p
WHERE sn.created_by = p.id AND sn.boss_id IS NULL;

-- 更新 permission_audit_logs 表
UPDATE permission_audit_logs pal
SET boss_id = p.boss_id
FROM profiles p
WHERE pal.user_id = p.id AND pal.boss_id IS NULL;

-- 更新 security_audit_log 表
UPDATE security_audit_log sal
SET boss_id = p.boss_id
FROM profiles p
WHERE sal.user_id = p.id AND sal.boss_id IS NULL;