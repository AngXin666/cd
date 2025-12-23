/*
# 修复 is_admin 函数 - 添加 boss 角色支持

## 问题
当前的 is_admin 函数只检查 super_admin 和 peer_admin 角色，
没有包含 boss 角色，导致租户老板在数据库层面没有管理员权限。

## 解决方案
更新 is_admin 函数，添加 boss 角色的检查。

## 角色说明
- super_admin: 中央管理系统的超级管理员
- boss: 租户的老板（租户内的最高权限）
- peer_admin: 租户的平级管理员

## 注意事项
1. 这个函数用于 RLS 策略，确保管理员有正确的数据访问权限
2. boss 角色应该在租户 Schema 中有完整的管理权限
*/

-- 更新 is_admin 函数，添加 boss 角色
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role IN ('super_admin', 'boss', 'peer_admin') 
  FROM profiles 
  WHERE id = p_user_id;
$$;

COMMENT ON FUNCTION is_admin(uuid) IS '检查用户是否为管理员（super_admin, boss, peer_admin）';
