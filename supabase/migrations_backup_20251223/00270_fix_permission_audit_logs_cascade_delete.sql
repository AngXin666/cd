/*
# 修复权限审计日志的级联删除问题

## 问题描述
当删除用户时，`trigger_audit_profile_delete` 触发器会尝试插入审计日志，
但由于 `target_user_id` 的外键约束是 `ON DELETE SET NULL`，
在删除过程中会导致外键约束冲突。

## 解决方案
1. 删除删除用户的触发器（因为用户已经被删除，记录日志意义不大）
2. 将 `target_user_id` 的外键约束改为 `ON DELETE CASCADE`，
   这样当用户被删除时，相关的审计日志也会被自动删除

## 变更内容
1. 删除 `trigger_audit_profile_delete` 触发器
2. 删除 `audit_profile_delete` 函数
3. 修改 `target_user_id` 的外键约束为 `ON DELETE CASCADE`

## 影响范围
- 删除用户时不再记录审计日志（因为用户已被删除）
- 删除用户时，相关的审计日志会被自动删除
- 其他审计日志功能不受影响
*/

-- 1. 删除触发器
DROP TRIGGER IF EXISTS trigger_audit_profile_delete ON profiles;

-- 2. 删除函数
DROP FUNCTION IF EXISTS audit_profile_delete();

-- 3. 删除旧的外键约束
ALTER TABLE permission_audit_logs 
DROP CONSTRAINT IF EXISTS permission_audit_logs_target_user_id_fkey;

-- 4. 添加新的外键约束（ON DELETE CASCADE）
ALTER TABLE permission_audit_logs 
ADD CONSTRAINT permission_audit_logs_target_user_id_fkey 
FOREIGN KEY (target_user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

COMMENT ON CONSTRAINT permission_audit_logs_target_user_id_fkey ON permission_audit_logs IS 
'目标用户外键约束，用户删除时级联删除相关审计日志';