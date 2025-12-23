/*
# 修复 profiles 表 RLS 策略 - 使用直接的 boss_id 检查

## 问题分析
当前策略使用 get_current_user_boss_id() 函数，该函数会查询 profiles 表，
可能在某些情况下导致性能问题或递归问题。

## 解决方案
创建一个新的辅助函数，使用更简单的逻辑：
1. 创建一个函数来检查用户是否可以查看某个 profile
2. 该函数使用 SECURITY DEFINER 绕过 RLS
3. 简化策略逻辑

## 策略逻辑
- 管理员可以查看同租户下的所有用户
- 普通用户只能查看自己
*/

-- 创建一个辅助函数来检查用户是否可以查看某个 profile
CREATE OR REPLACE FUNCTION can_view_profile(
  viewer_id uuid,
  target_id uuid,
  target_boss_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_boss_id text;
  viewer_role user_role;
BEGIN
  -- 获取查看者的 boss_id 和 role
  SELECT boss_id, role INTO viewer_boss_id, viewer_role
  FROM profiles
  WHERE id = viewer_id;
  
  -- 如果查看者不存在，返回 false
  IF viewer_boss_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- 检查是否同租户
  IF viewer_boss_id != target_boss_id THEN
    RETURN false;
  END IF;
  
  -- 如果是管理员或超级管理员，可以查看同租户下的所有用户
  IF viewer_role IN ('manager', 'super_admin') THEN
    RETURN true;
  END IF;
  
  -- 普通用户只能查看自己
  IF viewer_id = target_id THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 删除旧的策略
DROP POLICY IF EXISTS "Tenant users can view based on role" ON profiles;

-- 创建新的策略
CREATE POLICY "Users can view profiles based on permissions" ON profiles
  FOR SELECT TO authenticated
  USING (
    can_view_profile(auth.uid(), id, boss_id)
  );