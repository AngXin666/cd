/*
# 修复所有引用 profiles 表的函数和触发器 v3

## 背景
profiles 视图已被删除，系统现在使用 users 和 user_roles 表。
但是有多个函数和触发器还在引用 profiles 表，导致运行时错误。

## 变更内容
1. 删除所有引用 profiles 表的旧函数
2. 重新创建必要的函数，使用 users 和 user_roles 表
3. 使用正确的枚举值（BOSS, DISPATCHER, DRIVER, MANAGER）

## 影响的函数
- 删除：check_main_account_is_primary, get_primary_account_id, get_all_peer_accounts
- 删除：audit_warehouse_unassignment, current_tenant_id
- 删除：notify_on_warehouse_assignment, notify_on_driver_type_change
- 删除：check_peer_account_limit, has_readonly_permission
- 重新创建：is_super_admin, is_admin, is_manager, is_driver, get_user_role
*/

-- 1. 删除所有引用 profiles 表的旧函数
DROP FUNCTION IF EXISTS check_main_account_is_primary() CASCADE;
DROP FUNCTION IF EXISTS get_primary_account_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_all_peer_accounts(uuid) CASCADE;
DROP FUNCTION IF EXISTS audit_warehouse_unassignment() CASCADE;
DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS notify_on_warehouse_assignment() CASCADE;
DROP FUNCTION IF EXISTS notify_on_driver_type_change() CASCADE;
DROP FUNCTION IF EXISTS check_peer_account_limit(uuid) CASCADE;
DROP FUNCTION IF EXISTS has_readonly_permission(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_manager(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_driver(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;

-- 2. 重新创建 is_super_admin 函数（BOSS 相当于 super_admin）
CREATE OR REPLACE FUNCTION is_super_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = uid AND ur.role = 'BOSS'
    );
$$;

-- 3. 创建 is_admin 函数（检查是否是管理员或超级管理员）
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = uid AND ur.role IN ('BOSS', 'MANAGER')
    );
$$;

-- 4. 创建 is_manager 函数
CREATE OR REPLACE FUNCTION is_manager(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = uid AND ur.role = 'MANAGER'
    );
$$;

-- 5. 创建 is_driver 函数
CREATE OR REPLACE FUNCTION is_driver(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = uid AND ur.role = 'DRIVER'
    );
$$;

-- 6. 创建获取用户角色的函数
CREATE OR REPLACE FUNCTION get_user_role(uid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT ur.role::text
    FROM public.user_roles ur
    WHERE ur.user_id = uid
    LIMIT 1;
$$;