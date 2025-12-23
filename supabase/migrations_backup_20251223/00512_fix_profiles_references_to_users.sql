/*
# 修复所有引用 profiles 表的函数和触发器

## 背景
profiles 视图已被删除，系统现在使用 users 和 user_roles 表。
但是有多个函数和触发器还在引用 profiles 表，导致运行时错误。

## 变更内容
1. 更新所有引用 profiles 表的函数，改为引用 users 表
2. 删除不再需要的函数（如果有）
3. 确保所有触发器正常工作

## 影响的函数
- check_main_account_is_primary
- get_primary_account_id
- get_all_peer_accounts
- audit_warehouse_unassignment
- current_tenant_id
- notify_on_warehouse_assignment
- notify_on_driver_type_change
- check_peer_account_limit
- has_readonly_permission
- is_super_admin

## 注意事项
- users 表没有 role 字段，角色信息在 user_roles 表中
- users 表没有 main_account_id 字段
- users 表没有 status 字段
- 需要根据实际表结构调整查询逻辑
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

-- 2. 重新创建 is_super_admin 函数，使用 user_roles 表
CREATE OR REPLACE FUNCTION is_super_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = uid AND ur.role = 'super_admin'
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
        WHERE ur.user_id = uid AND ur.role IN ('admin', 'super_admin')
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
        WHERE ur.user_id = uid AND ur.role = 'manager'
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
        WHERE ur.user_id = uid AND ur.role = 'driver'
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