/*
# 删除 lease_admin 角色

## 背景
lease_admin（租赁管理员）角色不再使用，需要从系统中完全删除。

## 变更内容
1. 从 user_role 枚举类型中删除 lease_admin 值
2. 删除相关的权限检查函数

## 注意事项
- 已确认没有用户使用 lease_admin 角色
- 删除枚举值需要先删除所有使用该值的数据
*/

-- 1. 删除所有依赖 lease_admin 角色的 RLS 策略

-- driver_warehouses 表
DROP POLICY IF EXISTS "租赁管理员可以删除司机仓库分配" ON driver_warehouses;
DROP POLICY IF EXISTS "租赁管理员可以插入司机仓库分配" ON driver_warehouses;
DROP POLICY IF EXISTS "租赁管理员可以更新司机仓库分配" ON driver_warehouses;
DROP POLICY IF EXISTS "租赁管理员可以查看司机仓库分配" ON driver_warehouses;

-- lease_bills 表
DROP POLICY IF EXISTS "租赁管理员创建账单" ON lease_bills;
DROP POLICY IF EXISTS "租赁管理员删除账单" ON lease_bills;
DROP POLICY IF EXISTS "租赁管理员更新账单" ON lease_bills;
DROP POLICY IF EXISTS "租赁管理员查看所有账单" ON lease_bills;

-- leases 表
DROP POLICY IF EXISTS "Lease admins can manage leases" ON leases;
DROP POLICY IF EXISTS "Lease admins can view all leases" ON leases;

-- manager_warehouses 表
DROP POLICY IF EXISTS "Lease admins can insert manager warehouse assignments" ON manager_warehouses;
DROP POLICY IF EXISTS "Lease admins can update manager warehouse assignments" ON manager_warehouses;
DROP POLICY IF EXISTS "Lease admins can delete manager warehouse assignments" ON manager_warehouses;

-- notifications 表
DROP POLICY IF EXISTS "租赁管理员可以创建通知" ON notifications;
DROP POLICY IF EXISTS "租赁管理员可以删除通知" ON notifications;
DROP POLICY IF EXISTS "租赁管理员可以更新通知" ON notifications;
DROP POLICY IF EXISTS "租赁管理员可以查看通知" ON notifications;

-- permission_audit_logs 表
DROP POLICY IF EXISTS "租赁管理员查看所有审计日志" ON permission_audit_logs;

-- security_audit_log 表
DROP POLICY IF EXISTS "租赁管理员可以查看审计日志" ON security_audit_log;

-- 2. 删除 is_lease_admin 函数
DROP FUNCTION IF EXISTS is_lease_admin();

-- 3. 临时删除使用 user_role 类型的函数
DROP FUNCTION IF EXISTS get_user_role(uuid);

-- 4. 临时禁用 profiles 表的触发器
ALTER TABLE profiles DISABLE TRIGGER ALL;

-- 5. 临时禁用 permission_audit_logs 表的触发器
ALTER TABLE permission_audit_logs DISABLE TRIGGER ALL;

-- 6. 删除使用 user_role 类型的索引
DROP INDEX IF EXISTS idx_profiles_manager_permissions;

-- 7. 从 user_role 枚举类型中删除 lease_admin
-- PostgreSQL 不支持直接删除枚举值，需要重建枚举类型

-- 创建新的枚举类型
CREATE TYPE user_role_new AS ENUM ('driver', 'manager', 'super_admin', 'peer_admin', 'boss');

-- 删除 profiles 表 role 列的默认值
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

-- 更新 profiles 表，使用新的枚举类型
ALTER TABLE profiles 
  ALTER COLUMN role TYPE user_role_new 
  USING role::text::user_role_new;

-- 更新 permission_audit_logs 表，使用新的枚举类型
ALTER TABLE permission_audit_logs 
  ALTER COLUMN operator_role TYPE user_role_new 
  USING operator_role::text::user_role_new;

ALTER TABLE permission_audit_logs 
  ALTER COLUMN target_user_role TYPE user_role_new 
  USING target_user_role::text::user_role_new;

-- 使用 CASCADE 删除旧的枚举类型及其所有依赖
DROP TYPE user_role CASCADE;

-- 重命名新的枚举类型
ALTER TYPE user_role_new RENAME TO user_role;

-- 恢复 profiles 表的默认值
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'driver'::user_role;

COMMENT ON TYPE user_role IS '用户角色类型：driver(司机), manager(车队长), super_admin(超级管理员), peer_admin(平级管理员), boss(老板)';

-- 8. 重新创建使用 user_role 类型的索引
CREATE INDEX idx_profiles_manager_permissions ON profiles (manager_permissions_enabled) WHERE (role = 'manager'::user_role);

-- 9. 重新启用 profiles 表的触发器
ALTER TABLE profiles ENABLE TRIGGER ALL;

-- 10. 重新启用 permission_audit_logs 表的触发器
ALTER TABLE permission_audit_logs ENABLE TRIGGER ALL;

-- 11. 重新创建 get_user_role 函数
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = p_user_id;
$$;

COMMENT ON FUNCTION get_user_role IS '获取用户的角色';
