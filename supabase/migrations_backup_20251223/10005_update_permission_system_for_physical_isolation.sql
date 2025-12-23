/*
# 更新权限系统以适应物理隔离架构

## 概述
基于物理隔离架构，每个租户使用独立的数据库，因此：
- 不需要 tenant_id 字段（数据已经物理隔离）
- 不需要 boss_id 字段（数据已经物理隔离）
- 只需要 manager_id 来标识司机所属的车队长
- 只需要 managed_warehouses 来标识车队长管辖的仓库

## 角色类型
- `super_admin` - 超级管理员（中央管理系统）
- `boss` - 老板（租户系统最高权限所有者）
- `peer` - 平级账号（与老板平级的协作账号）
- `manager` - 车队长
- `driver` - 司机

## 权限级别
- `full_permission` - 完整权限
- `read_only` - 只读权限

## 字段说明
- `permission_level` - 权限级别（仅平级账号和车队长需要）
- `manager_id` - 所属车队长ID（仅司机需要）
- `managed_warehouses` - 管辖的仓库ID数组（仅车队长需要）
*/

-- ============================================================================
-- 第一部分：确保 profiles 表有正确的字段
-- ============================================================================

-- 添加权限级别字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'permission_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN permission_level text CHECK (permission_level IN ('full_permission', 'read_only'));
    COMMENT ON COLUMN profiles.permission_level IS '权限级别：full_permission-完整权限, read_only-只读权限（仅平级账号和车队长）';
  END IF;
END $$;

-- 添加所属车队长字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN manager_id uuid REFERENCES profiles(id);
    COMMENT ON COLUMN profiles.manager_id IS '所属车队长ID（仅司机）';
    CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON profiles(manager_id);
  END IF;
END $$;

-- 添加管辖仓库字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'managed_warehouses'
  ) THEN
    ALTER TABLE profiles ADD COLUMN managed_warehouses uuid[];
    COMMENT ON COLUMN profiles.managed_warehouses IS '管辖的仓库ID数组（仅车队长）';
  END IF;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_profiles_permission_level ON profiles(permission_level);

-- ============================================================================
-- 第二部分：创建权限检查辅助函数
-- ============================================================================

-- 检查是否为超级管理员
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role = 'super_admin'
  );
$$;

COMMENT ON FUNCTION is_super_admin IS '检查用户是否为超级管理员';

-- 检查是否为老板
CREATE OR REPLACE FUNCTION is_boss(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role = 'boss'
  );
$$;

COMMENT ON FUNCTION is_boss IS '检查用户是否为老板';

-- 检查是否拥有完整权限
CREATE OR REPLACE FUNCTION has_full_permission(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND (
      role = 'boss'
      OR (role IN ('peer', 'manager') AND permission_level = 'full_permission')
    )
  );
$$;

COMMENT ON FUNCTION has_full_permission IS '检查用户是否拥有完整权限';

-- 检查是否可以管理指定仓库
CREATE OR REPLACE FUNCTION can_manage_warehouse(user_id uuid, warehouse_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role user_role;
  user_permission text;
  user_warehouses uuid[];
BEGIN
  -- 获取用户信息
  SELECT role, permission_level, managed_warehouses
  INTO user_role, user_permission, user_warehouses
  FROM profiles
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

COMMENT ON FUNCTION can_manage_warehouse IS '检查用户是否可以管理指定仓库';

-- 获取用户的管辖仓库
CREATE OR REPLACE FUNCTION get_managed_warehouses(user_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role user_role;
  user_permission text;
  user_warehouses uuid[];
  all_warehouses uuid[];
BEGIN
  -- 获取用户信息
  SELECT role, permission_level, managed_warehouses
  INTO user_role, user_permission, user_warehouses
  FROM profiles
  WHERE id = user_id;

  -- 老板和拥有完整权限的平级账号可以管理所有仓库
  IF user_role = 'boss' OR (user_role = 'peer' AND user_permission = 'full_permission') THEN
    SELECT array_agg(id) INTO all_warehouses FROM warehouses;
    RETURN COALESCE(all_warehouses, ARRAY[]::uuid[]);
  END IF;

  -- 车队长只能管理分配给自己的仓库
  IF user_role = 'manager' THEN
    RETURN COALESCE(user_warehouses, ARRAY[]::uuid[]);
  END IF;

  -- 其他角色返回空数组
  RETURN ARRAY[]::uuid[];
END;
$$;

COMMENT ON FUNCTION get_managed_warehouses IS '获取用户的管辖仓库列表';

-- 检查是否可以管理指定用户
CREATE OR REPLACE FUNCTION can_manage_user(manager_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  manager_role user_role;
  manager_permission text;
  manager_warehouses uuid[];
  target_role user_role;
  target_manager_id uuid;
  target_warehouse_ids uuid[];
BEGIN
  -- 获取管理者信息
  SELECT role, permission_level, managed_warehouses
  INTO manager_role, manager_permission, manager_warehouses
  FROM profiles
  WHERE id = manager_id;

  -- 获取目标用户信息
  SELECT role, manager_id
  INTO target_role, target_manager_id
  FROM profiles
  WHERE id = target_user_id;

  -- 老板可以管理所有用户
  IF manager_role = 'boss' THEN
    RETURN true;
  END IF;

  -- 拥有完整权限的平级账号可以管理所有用户（除了老板）
  IF manager_role = 'peer' AND manager_permission = 'full_permission' THEN
    RETURN target_role != 'boss';
  END IF;

  -- 车队长只能管理自己管辖范围内的司机
  IF manager_role = 'manager' AND manager_permission = 'full_permission' THEN
    -- 只能管理司机
    IF target_role != 'driver' THEN
      RETURN false;
    END IF;
    
    -- 检查司机是否属于自己管辖
    IF target_manager_id = manager_id THEN
      RETURN true;
    END IF;
    
    -- 检查司机的仓库是否在自己管辖范围内
    SELECT array_agg(warehouse_id) INTO target_warehouse_ids
    FROM driver_warehouses
    WHERE driver_id = target_user_id;
    
    IF target_warehouse_ids IS NOT NULL THEN
      RETURN target_warehouse_ids && manager_warehouses;
    END IF;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION can_manage_user IS '检查用户是否可以管理指定用户';

-- ============================================================================
-- 第三部分：更新 RLS 策略
-- ============================================================================

-- 删除旧的 RLS 策略
DROP POLICY IF EXISTS "超级管理员可以查看所有用户" ON profiles;
DROP POLICY IF EXISTS "老板可以查看租户内所有用户" ON profiles;
DROP POLICY IF EXISTS "平级账号完整权限查看" ON profiles;
DROP POLICY IF EXISTS "平级账号只读权限查看" ON profiles;
DROP POLICY IF EXISTS "车队长查看管辖范围用户" ON profiles;
DROP POLICY IF EXISTS "司机查看自己" ON profiles;

-- 超级管理员：不能查看租户内的用户（只能管理租户配置）
-- 注意：超级管理员在中央管理系统的 public schema 中，不在租户的 schema 中

-- 老板：可以查看所有用户
CREATE POLICY "老板查看所有用户" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'boss'
    )
  );

-- 平级账号（完整权限）：可以查看所有用户
CREATE POLICY "平级账号完整权限查看所有用户" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'peer'
      AND permission_level = 'full_permission'
    )
  );

-- 平级账号（只读）：可以查看所有用户
CREATE POLICY "平级账号只读查看所有用户" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'peer'
      AND permission_level = 'read_only'
    )
  );

-- 车队长：可以查看自己和管辖范围内的司机
CREATE POLICY "车队长查看管辖范围用户" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    (
      role = 'driver'
      AND manager_id = auth.uid()
    )
    OR
    (
      role = 'driver'
      AND EXISTS (
        SELECT 1 FROM driver_warehouses dw
        INNER JOIN profiles p ON p.id = auth.uid()
        WHERE dw.driver_id = profiles.id
        AND dw.warehouse_id = ANY(p.managed_warehouses)
      )
    )
  );

-- 司机：只能查看自己
CREATE POLICY "司机查看自己" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    AND role = 'driver'
  );

-- 老板：可以修改所有用户
CREATE POLICY "老板修改所有用户" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'boss'
    )
  );

-- 平级账号（完整权限）：可以修改所有用户（除了老板）
CREATE POLICY "平级账号完整权限修改用户" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    role != 'boss'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'peer'
      AND permission_level = 'full_permission'
    )
  );

-- 车队长（完整权限）：可以修改管辖范围内的司机
CREATE POLICY "车队长完整权限修改司机" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    role = 'driver'
    AND (
      manager_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM driver_warehouses dw
        INNER JOIN profiles p ON p.id = auth.uid()
        WHERE dw.driver_id = profiles.id
        AND dw.warehouse_id = ANY(p.managed_warehouses)
        AND p.role = 'manager'
        AND p.permission_level = 'full_permission'
      )
    )
  );

-- 司机：可以修改自己的部分信息
CREATE POLICY "司机修改自己" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    AND role = 'driver'
  );

-- ============================================================================
-- 第四部分：记录日志
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ 权限系统已更新以适应物理隔离架构';
  RAISE NOTICE '📊 字段：permission_level, manager_id, managed_warehouses';
  RAISE NOTICE '🔧 辅助函数：is_super_admin, is_boss, has_full_permission, can_manage_warehouse, get_managed_warehouses, can_manage_user';
  RAISE NOTICE '🔒 RLS 策略已更新';
  RAISE NOTICE '💡 不需要 tenant_id 和 boss_id（数据已物理隔离）';
END $$;
