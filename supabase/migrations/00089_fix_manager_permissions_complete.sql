/*
# 彻底修复普通管理员权限问题

## 问题分析
1. SELECT 策略限制：普通管理员只能查看分配到他们仓库的司机，导致新创建的司机无法立即查看
2. 权限不完整：普通管理员应该拥有对所有司机的完整权限（增删改查）

## 解决方案
1. 添加新的 SELECT 策略：允许普通管理员查看所有司机
2. 确保 INSERT、UPDATE、DELETE 策略正确
3. 使用 SECURITY DEFINER 函数避免无限递归

## 修改内容
- 添加 "Managers can view all drivers" SELECT 策略
- 保留现有的 INSERT、UPDATE、DELETE 策略
*/

-- 删除可能导致问题的旧策略
DROP POLICY IF EXISTS "Managers can view drivers in their warehouses" ON profiles;

-- 添加新的 SELECT 策略：普通管理员可以查看所有司机
CREATE POLICY "Managers can view all drivers" ON profiles
  FOR SELECT TO authenticated
  USING (
    -- 如果当前用户是 manager，可以查看所有 driver
    is_manager(auth.uid()) AND role = 'driver'::user_role
  );

-- 确保 INSERT 策略存在且正确
DROP POLICY IF EXISTS "Managers can insert driver profiles" ON profiles;
CREATE POLICY "Managers can insert driver profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    is_manager(auth.uid()) AND role = 'driver'::user_role
  );

-- 确保 UPDATE 策略存在且正确
DROP POLICY IF EXISTS "Managers can update driver profiles" ON profiles;
CREATE POLICY "Managers can update driver profiles" ON profiles
  FOR UPDATE TO authenticated
  USING (
    role = 'driver'::user_role AND is_manager(auth.uid())
  )
  WITH CHECK (
    role = 'driver'::user_role
  );

-- 确保 DELETE 策略存在且正确
DROP POLICY IF EXISTS "Managers can delete driver profiles" ON profiles;
CREATE POLICY "Managers can delete driver profiles" ON profiles
  FOR DELETE TO authenticated
  USING (
    role = 'driver'::user_role AND is_manager(auth.uid())
  );

-- 重新创建 is_manager 函数，确保使用 SECURITY DEFINER
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

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.is_manager(uuid) TO authenticated;

-- 添加注释
COMMENT ON POLICY "Managers can view all drivers" ON profiles IS '普通管理员可以查看所有司机';
COMMENT ON POLICY "Managers can insert driver profiles" ON profiles IS '普通管理员可以创建司机';
COMMENT ON POLICY "Managers can update driver profiles" ON profiles IS '普通管理员可以修改司机信息';
COMMENT ON POLICY "Managers can delete driver profiles" ON profiles IS '普通管理员可以删除司机';
