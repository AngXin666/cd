/*
# 修复 is_lease_admin_user 函数的枚举类型问题

## 问题
is_lease_admin_user 函数检查 role = 'lease_admin'（字符串）
但应该使用枚举类型 role = 'lease_admin'::user_role

## 解决方案
使用 CREATE OR REPLACE 更新函数，使用正确的枚举类型比较
*/

-- 使用 OR REPLACE 更新函数
CREATE OR REPLACE FUNCTION is_lease_admin_user(user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = COALESCE(user_id, auth.uid()) 
    AND role = 'lease_admin'::user_role
  );
$$;
