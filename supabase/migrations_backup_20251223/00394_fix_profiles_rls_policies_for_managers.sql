/*
# 修复 profiles 表的 RLS 策略，确保车队长可以查看司机

## 说明
1. 更新所有仍在使用 auth.uid() 的策略，改为使用 current_user_id()
2. 确保 can_view_user 和 can_manage_user 函数也使用 current_user_id()
3. 添加专门的策略，允许车队长查看司机

## 核心原则
- 使用 public.current_user_id() 替代 auth.uid()
- 保留 RLS 策略的安全保护
- 确保车队长可以查看和管理司机

*/

-- ============================================================================
-- 删除旧的 profiles 表策略（使用 auth.uid() 的）
-- ============================================================================
DROP POLICY IF EXISTS "Super admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "User update self" ON profiles;
DROP POLICY IF EXISTS "Users can delete based on role" ON profiles;
DROP POLICY IF EXISTS "Users can insert based on role" ON profiles;
DROP POLICY IF EXISTS "Users can update based on role" ON profiles;
DROP POLICY IF EXISTS "Users can view based on role" ON profiles;

-- ============================================================================
-- 创建新的 profiles 表策略（使用 current_user_id()）
-- ============================================================================

-- 超级管理员可以删除用户
CREATE POLICY "Super admins can delete profiles"
ON profiles FOR DELETE
USING (is_super_admin(public.current_user_id()));

-- 超级管理员可以插入用户
CREATE POLICY "Super admins can insert profiles"
ON profiles FOR INSERT
WITH CHECK (is_super_admin(public.current_user_id()));

-- 超级管理员可以更新所有用户
CREATE POLICY "Super admins can update all profiles"
ON profiles FOR UPDATE
USING (is_super_admin(public.current_user_id()))
WITH CHECK (is_super_admin(public.current_user_id()));

-- 超级管理员可以查看所有用户
CREATE POLICY "Super admins can view all profiles"
ON profiles FOR SELECT
USING (is_super_admin(public.current_user_id()));

-- 用户可以更新自己的资料
CREATE POLICY "User update self"
ON profiles FOR UPDATE
USING (id = public.current_user_id())
WITH CHECK (id = public.current_user_id());

-- 用户可以根据角色删除其他用户
CREATE POLICY "Users can delete based on role"
ON profiles FOR DELETE
USING (can_manage_user(public.current_user_id(), id));

-- 用户可以根据角色插入新用户
CREATE POLICY "Users can insert based on role"
ON profiles FOR INSERT
WITH CHECK (has_full_permission(public.current_user_id()));

-- 用户可以根据角色更新其他用户
CREATE POLICY "Users can update based on role"
ON profiles FOR UPDATE
USING ((public.current_user_id() = id) OR can_manage_user(public.current_user_id(), id))
WITH CHECK ((public.current_user_id() = id) OR can_manage_user(public.current_user_id(), id));

-- 用户可以根据角色查看其他用户
CREATE POLICY "Users can view based on role"
ON profiles FOR SELECT
USING (can_view_user(public.current_user_id(), id));

COMMENT ON POLICY "Super admins can delete profiles" ON profiles 
IS '超级管理员可以删除用户，使用 current_user_id()';

COMMENT ON POLICY "Super admins can insert profiles" ON profiles 
IS '超级管理员可以插入用户，使用 current_user_id()';

COMMENT ON POLICY "Super admins can update all profiles" ON profiles 
IS '超级管理员可以更新所有用户，使用 current_user_id()';

COMMENT ON POLICY "Super admins can view all profiles" ON profiles 
IS '超级管理员可以查看所有用户，使用 current_user_id()';

COMMENT ON POLICY "User update self" ON profiles 
IS '用户可以更新自己的资料，使用 current_user_id()';

COMMENT ON POLICY "Users can delete based on role" ON profiles 
IS '用户可以根据角色删除其他用户，使用 current_user_id()';

COMMENT ON POLICY "Users can insert based on role" ON profiles 
IS '用户可以根据角色插入新用户，使用 current_user_id()';

COMMENT ON POLICY "Users can update based on role" ON profiles 
IS '用户可以根据角色更新其他用户，使用 current_user_id()';

COMMENT ON POLICY "Users can view based on role" ON profiles 
IS '用户可以根据角色查看其他用户，使用 current_user_id()';