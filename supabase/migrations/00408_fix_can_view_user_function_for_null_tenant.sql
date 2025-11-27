/*
# 修复 can_view_user 函数，支持 tenant_id 为 NULL 的情况

## 说明
1. 当 tenant_id 为 NULL 时，认为所有用户在同一个默认租户下
2. 车队长可以查看所有司机（当 tenant_id 为 NULL 时）
3. 保持其他权限逻辑不变

## 核心原则
- 兼容 tenant_id 为 NULL 的情况
- 车队长可以查看司机
- 保持安全性

*/

-- ============================================================================
-- 更新 can_view_user 函数
-- ============================================================================
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
        (viewer.role IN ('lease_admin', 'peer_admin') AND (
          viewer.tenant_id = target.tenant_id 
          OR (viewer.tenant_id IS NULL AND target.tenant_id IS NULL)
        ))
        OR
        -- 车队长可以查看同租户的所有用户（包括 tenant_id 为 NULL 的情况）
        (viewer.role = 'manager' AND (
          viewer.tenant_id = target.tenant_id 
          OR (viewer.tenant_id IS NULL AND target.tenant_id IS NULL)
          OR (viewer.tenant_id IS NULL AND target.role = 'driver')  -- 车队长可以查看所有司机
        ))
        OR
        -- 司机只能查看自己
        (viewer.role = 'driver' AND viewer.id = target_user_id)
      )
  );
$$;

COMMENT ON FUNCTION public.can_view_user(uuid, uuid) 
IS '检查用户是否可以查看目标用户，支持 tenant_id 为 NULL 的情况';
