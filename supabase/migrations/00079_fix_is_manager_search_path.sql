/*
# 修复 is_manager 函数的 search_path

## 问题
is_manager 函数的 search_path 只包含 'public'，可能导致无法找到 auth schema 中的函数。

## 修复
更新 is_manager 函数，添加 auth schema 到 search_path。
*/

-- 更新 is_manager 函数
CREATE OR REPLACE FUNCTION is_manager(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'manager'::user_role
  );
$$;
