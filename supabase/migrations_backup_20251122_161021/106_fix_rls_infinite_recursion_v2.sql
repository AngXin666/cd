/*
# 修复 RLS 无限递归问题 v2

## 问题描述
当前的 RLS 策略存在无限递归问题：
- `is_manager_or_above()` 和 `is_super_admin()` 函数查询 profiles 表
- 这些函数在 RLS 策略中使用时，会再次触发 profiles 表的 RLS 策略
- 导致无限递归错误：ERROR: infinite recursion detected in policy for relation "profiles"

## 解决方案
1. 删除所有现有的 RLS 策略
2. 删除旧的辅助函数（使用 CASCADE）
3. 重新创建使用 SECURITY DEFINER 的辅助函数
4. 重新创建所有 RLS 策略

## 变更内容
1. 删除所有 profiles 表的 RLS 策略
2. 删除旧的辅助函数
3. 创建新的辅助函数，使用 SECURITY DEFINER 绕过 RLS
4. 重新创建所有表的 RLS 策略
*/

-- ============================================
-- 第一步：删除所有现有的 RLS 策略
-- ============================================

-- profiles 表
DROP POLICY IF EXISTS "允许匿名用户创建profile" ON profiles;
DROP POLICY IF EXISTS "允许认证用户创建自己的profile" ON profiles;
DROP POLICY IF EXISTS "用户可以更新自己的profile" ON profiles;
DROP POLICY IF EXISTS "用户可以更新自己的档案" ON profiles;
DROP POLICY IF EXISTS "用户可以查看自己的profile" ON profiles;
DROP POLICY IF EXISTS "用户可以查看自己的档案" ON profiles;
DROP POLICY IF EXISTS "管理员可以修改司机档案" ON profiles;
DROP POLICY IF EXISTS "管理员可以创建用户" ON profiles;
DROP POLICY IF EXISTS "管理员可以删除用户" ON profiles;
DROP POLICY IF EXISTS "管理员可以更新所有用户" ON profiles;
DROP POLICY IF EXISTS "管理员可以查看所有档案" ON profiles;
DROP POLICY IF EXISTS "管理员可以查看所有用户" ON profiles;
DROP POLICY IF EXISTS "超级管理员拥有完全访问权限" ON profiles;

-- ============================================
-- 第二步：删除旧的辅助函数（使用 CASCADE）
-- ============================================

DROP FUNCTION IF EXISTS public.is_manager_or_above(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin(uuid) CASCADE;

-- ============================================
-- 第三步：创建新的辅助函数（使用 SECURITY DEFINER 绕过 RLS）
-- ============================================

-- 创建角色检查函数（绕过 RLS）
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- 使用 SECURITY DEFINER 绕过 RLS，直接查询角色
  SELECT role INTO user_role_value
  FROM profiles
  WHERE id = user_id;
  
  RETURN user_role_value;
END;
$$;

-- 创建管理员检查函数（绕过 RLS）
CREATE OR REPLACE FUNCTION public.is_manager_or_above(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- 使用 SECURITY DEFINER 绕过 RLS
  SELECT role INTO user_role_value
  FROM profiles
  WHERE id = user_id;
  
  RETURN user_role_value IN ('manager', 'super_admin');
END;
$$;

-- 创建超级管理员检查函数（绕过 RLS）
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- 使用 SECURITY DEFINER 绕过 RLS
  SELECT role INTO user_role_value
  FROM profiles
  WHERE id = user_id;
  
  RETURN user_role_value = 'super_admin';
END;
$$;

-- ============================================
-- 第四步：重新创建 profiles 表的 RLS 策略
-- ============================================

-- 1. SELECT 策略：用户可以查看自己的档案
CREATE POLICY "用户可以查看自己的档案"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. SELECT 策略：管理员可以查看所有档案
CREATE POLICY "管理员可以查看所有档案"
ON profiles
FOR SELECT
TO authenticated
USING (is_manager_or_above(auth.uid()));

-- 3. INSERT 策略：允许匿名用户创建 profile（用于注册）
CREATE POLICY "允许匿名用户创建profile"
ON profiles
FOR INSERT
TO anon
WITH CHECK (true);

-- 4. INSERT 策略：允许认证用户创建自己的 profile
CREATE POLICY "允许认证用户创建自己的profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 5. INSERT 策略：管理员可以创建任何用户
CREATE POLICY "管理员可以创建用户"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (is_manager_or_above(auth.uid()));

-- 6. UPDATE 策略：用户可以更新自己的档案（不能修改角色）
CREATE POLICY "用户可以更新自己的档案"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 7. UPDATE 策略：管理员可以更新所有用户
CREATE POLICY "管理员可以更新所有用户"
ON profiles
FOR UPDATE
TO authenticated
USING (is_manager_or_above(auth.uid()))
WITH CHECK (is_manager_or_above(auth.uid()));

-- 8. DELETE 策略：管理员可以删除用户
CREATE POLICY "管理员可以删除用户"
ON profiles
FOR DELETE
TO authenticated
USING (is_manager_or_above(auth.uid()));

-- ============================================
-- 第五步：重新创建其他表的 RLS 策略
-- ============================================

-- feedback 表
CREATE POLICY "管理员可以查看所有反馈"
ON feedback
FOR SELECT
TO authenticated
USING (is_manager_or_above(auth.uid()));

CREATE POLICY "管理员可以更新反馈"
ON feedback
FOR UPDATE
TO authenticated
USING (is_manager_or_above(auth.uid()))
WITH CHECK (is_manager_or_above(auth.uid()));

-- ============================================
-- 第六步：验证 RLS 已启用
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
