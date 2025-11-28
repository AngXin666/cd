/*
# 修复 is_super_admin_or_peer 函数 - 添加 boss 角色支持

## 问题
当前的 is_super_admin_or_peer 函数只检查 super_admin 和 peer_admin 角色，
没有包含 boss 角色，导致租户老板在某些 RLS 策略中没有正确的权限。

## 解决方案
更新 is_super_admin_or_peer 函数，添加 boss 角色的检查。
为了更清晰，将函数重命名为 is_admin_role。

## 角色说明
- super_admin: 中央管理系统的超级管理员
- boss: 租户的老板（租户内的最高权限）
- peer_admin: 租户的平级管理员

## 注意事项
1. 保留旧函数名以保持向后兼容
2. 新函数名更清晰地表达其用途
*/

-- 更新 is_super_admin_or_peer 函数，添加 boss 角色
CREATE OR REPLACE FUNCTION is_super_admin_or_peer(uid uuid)
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = uid AND p.role IN ('super_admin', 'boss', 'peer_admin')
    );
$$;

-- 创建新的函数名（更清晰）
CREATE OR REPLACE FUNCTION is_admin_role(uid uuid)
RETURNS boolean 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = uid AND p.role IN ('super_admin', 'boss', 'peer_admin')
    );
$$;

COMMENT ON FUNCTION is_super_admin_or_peer(uuid) IS '检查用户是否为管理员角色（super_admin, boss, peer_admin）- 已废弃，请使用 is_admin_role';
COMMENT ON FUNCTION is_admin_role(uuid) IS '检查用户是否为管理员角色（super_admin, boss, peer_admin）';
