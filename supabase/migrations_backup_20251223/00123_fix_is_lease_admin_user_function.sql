/*
# 修复 is_lease_admin_user 函数的类型问题

## 问题
is_lease_admin_user 函数检查 role = 'lease_admin'（字符串）
但应该使用枚举类型 role = 'lease_admin'::user_role

## 解决方案
重新创建函数，使用正确的枚举类型比较
*/

-- 删除旧函数
DROP FUNCTION IF EXISTS is_lease_admin_user(uuid);

-- 创建新函数，使用正确的枚举类型
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
