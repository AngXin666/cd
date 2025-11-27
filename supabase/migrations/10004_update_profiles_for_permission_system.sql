/*
# 更新 profiles 表以支持新的权限系统

## 概述
更新 profiles 表结构，添加权限系统所需的字段。

## 新增字段
1. `permission_level` - 权限级别（full_permission, read_only）
2. `boss_id` - 所属老板ID（平级账号和车队长需要）
3. `manager_id` - 所属车队长ID（司机需要）
4. `managed_warehouses` - 管辖的仓库ID数组（车队长需要）

## 角色类型
- `super_admin` - 超级管理员
- `boss` - 老板
- `peer` - 平级账号
- `manager` - 车队长（原 manager）
- `driver` - 司机

## 权限级别
- `full_permission` - 完整权限
- `read_only` - 只读权限

## 注意事项
- 超级管理员的 tenant_id 为 NULL
- 老板不需要 permission_level
- 平级账号和车队长需要 permission_level
- 司机不需要 permission_level
*/

-- 添加权限级别字段
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS permission_level text CHECK (permission_level IN ('full_permission', 'read_only'));

-- 添加所属老板字段
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS boss_id uuid REFERENCES public.profiles(id);

-- 添加所属车队长字段
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES public.profiles(id);

-- 添加管辖仓库字段
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS managed_warehouses uuid[];

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_boss_id ON public.profiles(boss_id);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_profiles_permission_level ON public.profiles(permission_level);

-- 添加注释
COMMENT ON COLUMN public.profiles.permission_level IS '权限级别：full_permission-完整权限, read_only-只读权限';
COMMENT ON COLUMN public.profiles.boss_id IS '所属老板ID（仅平级账号和车队长）';
COMMENT ON COLUMN public.profiles.manager_id IS '所属车队长ID（仅司机）';
COMMENT ON COLUMN public.profiles.managed_warehouses IS '管辖的仓库ID数组（仅车队长）';

-- 创建辅助函数：检查是否为超级管理员
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND role = 'super_admin'
  );
$$;

-- 创建辅助函数：检查是否为老板
CREATE OR REPLACE FUNCTION public.is_boss(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND role = 'boss'
  );
$$;

-- 创建辅助函数：检查是否拥有完整权限
CREATE OR REPLACE FUNCTION public.has_full_permission(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND (
      role = 'boss'
      OR (role IN ('peer', 'manager') AND permission_level = 'full_permission')
    )
  );
$$;

-- 创建辅助函数：检查是否可以管理指定仓库
CREATE OR REPLACE FUNCTION public.can_manage_warehouse(user_id uuid, warehouse_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  user_permission text;
  user_warehouses uuid[];
BEGIN
  -- 获取用户信息
  SELECT role, permission_level, managed_warehouses
  INTO user_role, user_permission, user_warehouses
  FROM public.profiles
  WHERE id = user_id;

  -- 老板可以管理所有仓库
  IF user_role = 'boss' THEN
    RETURN true;
  END IF;

  -- 拥有完整权限的平级账号可以管理所有仓库
  IF user_role = 'peer' AND user_permission = 'full_permission' THEN
    RETURN true;
  END IF;

  -- 车队长只能管理分配给自己的仓库
  IF user_role = 'manager' AND user_permission = 'full_permission' THEN
    RETURN warehouse_id = ANY(user_warehouses);
  END IF;

  RETURN false;
END;
$$;

-- 创建辅助函数：获取用户的管辖仓库
CREATE OR REPLACE FUNCTION public.get_managed_warehouses(user_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  user_permission text;
  user_warehouses uuid[];
  all_warehouses uuid[];
BEGIN
  -- 获取用户信息
  SELECT role, permission_level, managed_warehouses
  INTO user_role, user_permission, user_warehouses
  FROM public.profiles
  WHERE id = user_id;

  -- 老板和拥有完整权限的平级账号可以管理所有仓库
  IF user_role = 'boss' OR (user_role = 'peer' AND user_permission = 'full_permission') THEN
    SELECT array_agg(id) INTO all_warehouses FROM public.warehouses;
    RETURN all_warehouses;
  END IF;

  -- 车队长只能管理分配给自己的仓库
  IF user_role = 'manager' THEN
    RETURN user_warehouses;
  END IF;

  -- 其他角色返回空数组
  RETURN ARRAY[]::uuid[];
END;
$$;

-- 更新 RLS 策略：超级管理员可以查看所有 profiles
DROP POLICY IF EXISTS "超级管理员可以查看所有用户" ON public.profiles;
CREATE POLICY "超级管理员可以查看所有用户" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
  );

-- 更新 RLS 策略：老板可以查看自己租户内的所有用户
DROP POLICY IF EXISTS "老板可以查看租户内所有用户" ON public.profiles;
CREATE POLICY "老板可以查看租户内所有用户" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'boss'
    )
  );

-- 更新 RLS 策略：平级账号（完整权限）可以查看租户内所有用户
DROP POLICY IF EXISTS "平级账号完整权限查看" ON public.profiles;
CREATE POLICY "平级账号完整权限查看" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'peer'
      AND permission_level = 'full_permission'
    )
  );

-- 更新 RLS 策略：平级账号（只读）可以查看租户内所有用户
DROP POLICY IF EXISTS "平级账号只读权限查看" ON public.profiles;
CREATE POLICY "平级账号只读权限查看" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'peer'
      AND permission_level = 'read_only'
    )
  );

-- 更新 RLS 策略：车队长可以查看管辖范围内的用户
DROP POLICY IF EXISTS "车队长查看管辖范围用户" ON public.profiles;
CREATE POLICY "车队长查看管辖范围用户" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR id = auth.uid()
  );

-- 更新 RLS 策略：司机只能查看自己
DROP POLICY IF EXISTS "司机查看自己" ON public.profiles;
CREATE POLICY "司机查看自己" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    AND role = 'driver'
  );

-- 记录日志
DO $$
BEGIN
  RAISE NOTICE '✅ profiles 表已更新';
  RAISE NOTICE '📊 新增字段：permission_level, boss_id, manager_id, managed_warehouses';
  RAISE NOTICE '🔧 新增辅助函数：is_super_admin, is_boss, has_full_permission, can_manage_warehouse, get_managed_warehouses';
  RAISE NOTICE '🔒 RLS 策略已更新';
END $$;
