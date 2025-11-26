/*
# 创建权限辅助函数

## 目的
创建用于权限控制的辅助函数。

## 函数列表
1. is_main_boss: 检查是否为老板账号（不是平级账号）
2. is_peer_admin: 检查是否为平级账号
3. is_manager_permissions_enabled: 检查车队长权限是否启用
*/

-- 1. 检查是否为老板账号（不是平级账号）
CREATE OR REPLACE FUNCTION is_main_boss(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles
    WHERE id = user_id
    AND role = 'super_admin'
    AND main_account_id IS NULL
  );
$$;

COMMENT ON FUNCTION is_main_boss(uuid) IS '检查是否为老板账号（main_account_id IS NULL）';

-- 2. 检查是否为平级账号
CREATE OR REPLACE FUNCTION is_peer_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles
    WHERE id = user_id
    AND role = 'super_admin'
    AND main_account_id IS NOT NULL
  );
$$;

COMMENT ON FUNCTION is_peer_admin(uuid) IS '检查是否为平级账号（main_account_id IS NOT NULL）';

-- 3. 检查车队长权限是否启用
CREATE OR REPLACE FUNCTION is_manager_permissions_enabled(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT manager_permissions_enabled FROM profiles WHERE id = user_id),
    false
  );
$$;

COMMENT ON FUNCTION is_manager_permissions_enabled(uuid) IS '检查车队长权限是否启用';

-- 4. 获取用户创建的平级账号列表
CREATE OR REPLACE FUNCTION get_peer_accounts(user_id uuid)
RETURNS TABLE(peer_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id
  FROM profiles
  WHERE main_account_id = user_id
  AND role = 'super_admin';
$$;

COMMENT ON FUNCTION get_peer_accounts(uuid) IS '获取用户创建的平级账号列表';
