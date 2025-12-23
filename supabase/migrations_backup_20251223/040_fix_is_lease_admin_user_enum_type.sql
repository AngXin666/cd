/*
# 修复 is_lease_admin_user 函数的枚举类型问题

## 问题
is_lease_admin_user 函数检查 role = 'lease_admin'（字符串）
'::user_role

## 解决方案
CTION is_lease_admin_user(user_id uuid DEFAULT NULL)
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
