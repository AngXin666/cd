/*
# 修复 profiles 表的无限递归问题

## 问题分析
1. 错误信息：infinite recursion detected in policy for relation "profiles"
2. 根本原因：profiles 表的 RLS 策略中查询了 profiles 表本身，导致无限递归
3. 策略 "Admins can view tenant users" 使用了 EXISTS (SELECT FROM profiles)，这会导致递归

## 解决方案
使用 SECURITY DEFINER 函数来打破递归链

*/

-- 删除导致递归的策略
DROP POLICY IF EXISTS "Admins can view tenant users" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- 创建一个辅助函数来检查用户角色（使用 SECURITY DEFINER 打破递归）
CREATE OR REPLACE FUNCTION get_user_role_and_boss(user_id uuid)
RETURNS TABLE (role user_role, boss_id text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role, boss_id FROM profiles WHERE id = user_id;
$$;

-- 策略 1：用户可以查看自己的档案
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 策略 2：管理员可以查看同租户的所有用户（使用辅助函数避免递归）
CREATE POLICY "Admins can view same tenant users" ON profiles
  FOR SELECT TO authenticated
  USING (
    -- 获取当前用户的角色和 boss_id
    (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r) IN ('manager', 'super_admin')
    AND
    -- 检查目标用户的 boss_id 是否与当前用户相同
    profiles.boss_id = (SELECT b.boss_id FROM get_user_role_and_boss(auth.uid()) b)
  );

-- 添加注释
COMMENT ON FUNCTION get_user_role_and_boss IS '获取用户角色和 boss_id，使用 SECURITY DEFINER 避免 RLS 递归';
COMMENT ON POLICY "Users can view own profile" ON profiles IS '用户可以查看自己的档案';
COMMENT ON POLICY "Admins can view same tenant users" ON profiles IS '管理员可以查看同租户的所有用户（使用辅助函数避免递归）';
