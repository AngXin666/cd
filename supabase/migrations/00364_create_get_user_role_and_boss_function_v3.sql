/*
# 创建 get_user_role_and_boss 辅助函数

## 说明
创建一个辅助函数来获取用户角色和租户ID，使用 SECURITY DEFINER 避免 RLS 递归问题。
使用 tenant_id 作为 boss_id 来标识用户所属的租户。

## 函数定义
- 函数名：get_user_role_and_boss
- 参数：user_id (uuid)
- 返回：TABLE (role user_role, boss_id text)
- 安全性：SECURITY DEFINER（以函数定义者权限执行，避免 RLS 递归）

*/

-- 创建辅助函数来检查用户角色（使用 SECURITY DEFINER 打破递归）
CREATE OR REPLACE FUNCTION get_user_role_and_boss(user_id uuid)
RETURNS TABLE (role user_role, boss_id text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role, COALESCE(tenant_id::text, id::text) as boss_id FROM profiles WHERE id = user_id;
$$;

-- 添加注释
COMMENT ON FUNCTION get_user_role_and_boss IS '获取用户角色和租户ID，使用 SECURITY DEFINER 避免 RLS 递归';
