/*
# 修复 is_super_admin 函数的 search_path

## 问题
is_super_admin 函数没有设置 search_path，可能导致无法找到 auth schema 中的函数。

## 修复
更新 is_super_admin 函数，添加 search_path。
*/

-- 更新 is_super_admin 函数
CREATE OR REPLACE FUNCTION is_super_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = uid AND role = 'super_admin'::user_role
  );
$$;
