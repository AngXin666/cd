/*
# 修复 profiles 表 RLS 策略 - 允许车队长查看申请人信息

## 说明
修复 profiles 表的 RLS 策略，允许车队长（manager）查看司机的信息，以便在审批请假/离职申请时能够获取申请人信息。

## 变更内容
1. 创建 can_view_user 函数来检查用户查看权限
2. 创建 can_manage_user 函数来检查用户管理权限
3. 创建 has_full_permission 函数来检查完整权限
4. 更新 profiles 表的 RLS 策略

## 权限规则
- 超级管理员（super_admin）可以查看所有用户
- 老板（lease_admin, peer_admin）可以查看租户内所有用户
- 车队长（manager）可以查看同租户内的所有用户
- 司机（driver）只能查看自己

*/

-- 创建 can_view_user 函数
CREATE OR REPLACE FUNCTION public.can_view_user(viewer_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles viewer
    LEFT JOIN profiles target ON target.id = target_user_id
    WHERE viewer.id = viewer_id
      AND (
        -- 超级管理员可以查看所有用户
        viewer.role = 'super_admin'
        OR
        -- 老板和平级管理员可以查看同租户的所有用户
        (viewer.role IN ('lease_admin', 'peer_admin') AND viewer.tenant_id = target.tenant_id)
        OR
        -- 车队长可以查看同租户的所有用户
        (viewer.role = 'manager' AND viewer.tenant_id = target.tenant_id)
        OR
        -- 司机只能查看自己
        (viewer.role = 'driver' AND viewer.id = target_user_id)
      )
  );
$$;

-- 创建 can_manage_user 函数
CREATE OR REPLACE FUNCTION public.can_manage_user(manager_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles manager
    LEFT JOIN profiles target ON target.id = target_user_id
    WHERE manager.id = manager_id
      AND (
        -- 超级管理员可以管理所有用户
        manager.role = 'super_admin'
        OR
        -- 老板和平级管理员可以管理同租户的所有用户
        (manager.role IN ('lease_admin', 'peer_admin') AND manager.tenant_id = target.tenant_id)
        OR
        -- 车队长可以管理同租户的司机
        (manager.role = 'manager' AND manager.tenant_id = target.tenant_id AND target.role = 'driver')
      )
  );
$$;

-- 创建 has_full_permission 函数
CREATE OR REPLACE FUNCTION public.has_full_permission(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
      AND role IN ('super_admin', 'lease_admin', 'peer_admin')
  );
$$;

-- 添加注释
COMMENT ON FUNCTION public.can_view_user IS '检查用户是否有权限查看目标用户信息';
COMMENT ON FUNCTION public.can_manage_user IS '检查用户是否有权限管理目标用户';
COMMENT ON FUNCTION public.has_full_permission IS '检查用户是否有完整权限（超级管理员或老板）';

-- 删除旧的 SELECT 策略（保留超级管理员和用户查看自己的策略）
DROP POLICY IF EXISTS "查看用户" ON profiles;

-- 创建新的 SELECT 策略
CREATE POLICY "Users can view based on role" ON profiles
  FOR SELECT
  TO public
  USING (public.can_view_user(auth.uid(), id));

-- 删除旧的 UPDATE 策略
DROP POLICY IF EXISTS "更新用户" ON profiles;

-- 创建新的 UPDATE 策略
CREATE POLICY "Users can update based on role" ON profiles
  FOR UPDATE
  TO public
  USING ((auth.uid() = id) OR public.can_manage_user(auth.uid(), id))
  WITH CHECK ((auth.uid() = id) OR public.can_manage_user(auth.uid(), id));

-- 删除旧的 DELETE 策略
DROP POLICY IF EXISTS "删除用户" ON profiles;

-- 创建新的 DELETE 策略
CREATE POLICY "Users can delete based on role" ON profiles
  FOR DELETE
  TO public
  USING (public.can_manage_user(auth.uid(), id));

-- 删除旧的 INSERT 策略
DROP POLICY IF EXISTS "插入用户" ON profiles;

-- 创建新的 INSERT 策略
CREATE POLICY "Users can insert based on role" ON profiles
  FOR INSERT
  TO public
  WITH CHECK (public.has_full_permission(auth.uid()));