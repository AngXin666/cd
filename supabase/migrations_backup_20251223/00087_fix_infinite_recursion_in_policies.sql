/*
# 修复 RLS 策略无限递归问题

## 问题
策略中使用 EXISTS 子查询检查 profiles 表，导致无限递归：
- INSERT 策略需要查询 profiles 表检查用户角色
- 查询 profiles 表时又触发 SELECT 策略
- 导致无限递归

## 解决方案
1. 重新创建 is_manager 和 is_super_admin 函数，使用 SECURITY DEFINER 绕过 RLS
2. 在策略中使用这些函数，而不是直接查询 profiles 表
3. 确保函数可以正确执行，不会触发 RLS 检查
*/

-- 重新创建 is_manager 函数，使用 SECURITY DEFINER 绕过 RLS
CREATE OR REPLACE FUNCTION public.is_manager(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'manager'::user_role
  );
END;
$$;

-- 重新创建 is_super_admin 函数
CREATE OR REPLACE FUNCTION public.is_super_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'super_admin'::user_role
  );
END;
$$;

-- 删除旧的策略
DROP POLICY IF EXISTS "Managers can insert driver profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can update driver profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can delete driver profiles" ON profiles;

-- 重新创建 INSERT 策略，使用函数而不是直接查询
CREATE POLICY "Managers can insert driver profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    is_manager(auth.uid()) AND role = 'driver'::user_role
  );

-- 重新创建 UPDATE 策略
CREATE POLICY "Managers can update driver profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (
    role = 'driver'::user_role AND is_manager(auth.uid())
  )
  WITH CHECK (
    role = 'driver'::user_role
  );

-- 重新创建 DELETE 策略
CREATE POLICY "Managers can delete driver profiles" ON profiles
  FOR DELETE TO authenticated
  USING (
    role = 'driver'::user_role AND is_manager(auth.uid())
  );

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.is_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
