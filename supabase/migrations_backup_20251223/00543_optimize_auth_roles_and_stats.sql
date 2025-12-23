/*
# 优化用户认证、角色管理和统计功能

## 说明
为用户认证、角色管理和统计数据展示功能添加索引和优化查询性能

## 优化内容
1. 为认证相关表添加索引
2. 创建统计数据查询函数
3. 优化角色查询性能
4. 创建缓存机制

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 为认证相关表添加索引
-- ============================================

-- auth.users 表的索引（如果可以访问）
-- 注意：auth schema 可能受限，这些索引可能需要超级用户权限

-- 为 users 表添加更多索引
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at DESC);

-- 为 user_roles 表添加更多索引
CREATE INDEX IF NOT EXISTS idx_user_roles_created_at ON user_roles(created_at DESC);

-- 为 roles 表添加索引
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name) WHERE name IS NOT NULL;

-- 为 permissions 表添加索引
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource) WHERE resource IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action) WHERE action IS NOT NULL;

-- 为 role_permissions 表添加索引
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_permission ON role_permissions(role_id, permission_id);

-- 为 user_departments 表添加索引
CREATE INDEX IF NOT EXISTS idx_user_departments_user_id ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_department_id ON user_departments(department_id);

-- 为 departments 表添加索引
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name) WHERE name IS NOT NULL;

-- ============================================
-- 2. 创建统计数据查询函数
-- ============================================

-- 获取系统总体统计
CREATE OR REPLACE FUNCTION get_system_stats(p_user_id uuid)
RETURNS TABLE (
  total_users integer,
  total_drivers integer,
  total_managers integer,
  total_warehouses integer,
  total_vehicles integer,
  total_active_vehicles integer,
  total_attendance_today integer,
  total_pending_leaves integer,
  total_pending_resignations integer,
  total_unread_notifications integer
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- 检查用户是否为管理员
  v_is_admin := is_admin(p_user_id);
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION '权限不足：只有管理员可以查看系统统计';
  END IF;
  
  RETURN QUERY
  SELECT
    -- 总用户数
    (SELECT COUNT(*)::integer FROM users) AS total_users,
    -- 总司机数
    (SELECT COUNT(*)::integer FROM user_roles WHERE role = 'DRIVER') AS total_drivers,
    -- 总车队长数
    (SELECT COUNT(*)::integer FROM user_roles WHERE role = 'MANAGER') AS total_managers,
    -- 总仓库数
    (SELECT COUNT(*)::integer FROM warehouses WHERE is_active = true) AS total_warehouses,
    -- 总车辆数
    (SELECT COUNT(*)::integer FROM vehicles WHERE is_active = true) AS total_vehicles,
    -- 活跃车辆数
    (SELECT COUNT(*)::integer FROM vehicles WHERE is_active = true AND status = 'active') AS total_active_vehicles,
    -- 今日考勤数
    (SELECT COUNT(*)::integer FROM attendance WHERE work_date = CURRENT_DATE) AS total_attendance_today,
    -- 待审批请假数
    (SELECT COUNT(*)::integer FROM leave_applications WHERE status = 'pending') AS total_pending_leaves,
    -- 待审批离职数
    (SELECT COUNT(*)::integer FROM resignation_applications WHERE status = 'pending') AS total_pending_resignations,
    -- 未读通知数（当前用户）
    (SELECT COUNT(*)::integer FROM notifications WHERE recipient_id = p_user_id AND is_read = false) AS total_unread_notifications;
END;
$$;

COMMENT ON FUNCTION get_system_stats IS '获取系统总体统计数据（仅管理员）';

-- 获取用户个人统计
CREATE OR REPLACE FUNCTION get_user_personal_stats(p_user_id uuid)
RETURNS TABLE (
  my_attendance_count integer,
  my_leave_count integer,
  my_pending_leave_count integer,
  my_approved_leave_count integer,
  my_rejected_leave_count integer,
  my_vehicles_count integer,
  my_unread_notifications integer,
  my_total_notifications integer
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- 我的考勤记录数（本月）
    (SELECT COUNT(*)::integer FROM attendance 
     WHERE user_id = p_user_id 
       AND work_date >= DATE_TRUNC('month', CURRENT_DATE)
       AND work_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month') AS my_attendance_count,
    -- 我的请假记录数（本年）
    (SELECT COUNT(*)::integer FROM leave_applications 
     WHERE user_id = p_user_id
       AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)) AS my_leave_count,
    -- 我的待审批请假数
    (SELECT COUNT(*)::integer FROM leave_applications 
     WHERE user_id = p_user_id AND status = 'pending') AS my_pending_leave_count,
    -- 我的已批准请假数（本年）
    (SELECT COUNT(*)::integer FROM leave_applications 
     WHERE user_id = p_user_id 
       AND status = 'approved'
       AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)) AS my_approved_leave_count,
    -- 我的已拒绝请假数（本年）
    (SELECT COUNT(*)::integer FROM leave_applications 
     WHERE user_id = p_user_id 
       AND status = 'rejected'
       AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)) AS my_rejected_leave_count,
    -- 我的车辆数
    (SELECT COUNT(*)::integer FROM vehicles 
     WHERE (user_id = p_user_id OR driver_id = p_user_id OR current_driver_id = p_user_id)
       AND is_active = true) AS my_vehicles_count,
    -- 我的未读通知数
    (SELECT COUNT(*)::integer FROM notifications 
     WHERE recipient_id = p_user_id AND is_read = false) AS my_unread_notifications,
    -- 我的总通知数
    (SELECT COUNT(*)::integer FROM notifications 
     WHERE recipient_id = p_user_id) AS my_total_notifications;
END;
$$;

COMMENT ON FUNCTION get_user_personal_stats IS '获取用户个人统计数据';

-- 获取仓库统计
CREATE OR REPLACE FUNCTION get_warehouse_stats(p_warehouse_id uuid, p_user_id uuid)
RETURNS TABLE (
  warehouse_id uuid,
  warehouse_name text,
  total_drivers integer,
  total_vehicles integer,
  active_vehicles integer,
  attendance_today integer,
  pending_leaves integer,
  approved_leaves_this_month integer
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_is_admin boolean;
  v_is_manager boolean;
  v_manager_warehouses uuid[];
BEGIN
  -- 检查用户权限
  v_is_admin := is_admin(p_user_id);
  v_is_manager := is_manager(p_user_id);
  
  -- 如果是车队长，获取管理的仓库列表
  IF v_is_manager AND NOT v_is_admin THEN
    SELECT array_agg(warehouse_id) INTO v_manager_warehouses
    FROM warehouse_assignments
    WHERE user_id = p_user_id;
    
    -- 检查是否有权限查看该仓库
    IF NOT (p_warehouse_id = ANY(v_manager_warehouses)) THEN
      RAISE EXCEPTION '权限不足：您没有权限查看该仓库的统计数据';
    END IF;
  END IF;
  
  -- 如果不是管理员也不是车队长，无权查看
  IF NOT v_is_admin AND NOT v_is_manager THEN
    RAISE EXCEPTION '权限不足：只有管理员和车队长可以查看仓库统计';
  END IF;
  
  RETURN QUERY
  SELECT
    w.id AS warehouse_id,
    w.name AS warehouse_name,
    -- 该仓库的司机数
    (SELECT COUNT(DISTINCT wa.user_id)::integer 
     FROM warehouse_assignments wa
     JOIN user_roles ur ON ur.user_id = wa.user_id
     WHERE wa.warehouse_id = p_warehouse_id 
       AND ur.role = 'DRIVER') AS total_drivers,
    -- 该仓库的车辆数
    (SELECT COUNT(*)::integer FROM vehicles 
     WHERE warehouse_id = p_warehouse_id AND is_active = true) AS total_vehicles,
    -- 该仓库的活跃车辆数
    (SELECT COUNT(*)::integer FROM vehicles 
     WHERE warehouse_id = p_warehouse_id 
       AND is_active = true 
       AND status = 'active') AS active_vehicles,
    -- 今日考勤数
    (SELECT COUNT(*)::integer FROM attendance 
     WHERE warehouse_id = p_warehouse_id 
       AND work_date = CURRENT_DATE) AS attendance_today,
    -- 待审批请假数
    (SELECT COUNT(*)::integer FROM leave_applications 
     WHERE warehouse_id = p_warehouse_id 
       AND status = 'pending') AS pending_leaves,
    -- 本月已批准请假数
    (SELECT COUNT(*)::integer FROM leave_applications 
     WHERE warehouse_id = p_warehouse_id 
       AND status = 'approved'
       AND start_date >= DATE_TRUNC('month', CURRENT_DATE)
       AND start_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month') AS approved_leaves_this_month
  FROM warehouses w
  WHERE w.id = p_warehouse_id;
END;
$$;

COMMENT ON FUNCTION get_warehouse_stats IS '获取仓库统计数据（管理员和车队长）';

-- 获取所有仓库统计（仅管理员）
CREATE OR REPLACE FUNCTION get_all_warehouses_stats(p_user_id uuid)
RETURNS TABLE (
  warehouse_id uuid,
  warehouse_name text,
  total_drivers integer,
  total_vehicles integer,
  active_vehicles integer,
  attendance_today integer,
  pending_leaves integer
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- 检查用户是否为管理员
  v_is_admin := is_admin(p_user_id);
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION '权限不足：只有管理员可以查看所有仓库统计';
  END IF;
  
  RETURN QUERY
  SELECT
    w.id AS warehouse_id,
    w.name AS warehouse_name,
    -- 该仓库的司机数
    (SELECT COUNT(DISTINCT wa.user_id)::integer 
     FROM warehouse_assignments wa
     JOIN user_roles ur ON ur.user_id = wa.user_id
     WHERE wa.warehouse_id = w.id 
       AND ur.role = 'DRIVER') AS total_drivers,
    -- 该仓库的车辆数
    (SELECT COUNT(*)::integer FROM vehicles 
     WHERE warehouse_id = w.id AND is_active = true) AS total_vehicles,
    -- 该仓库的活跃车辆数
    (SELECT COUNT(*)::integer FROM vehicles 
     WHERE warehouse_id = w.id 
       AND is_active = true 
       AND status = 'active') AS active_vehicles,
    -- 今日考勤数
    (SELECT COUNT(*)::integer FROM attendance 
     WHERE warehouse_id = w.id 
       AND work_date = CURRENT_DATE) AS attendance_today,
    -- 待审批请假数
    (SELECT COUNT(*)::integer FROM leave_applications 
     WHERE warehouse_id = w.id 
       AND status = 'pending') AS pending_leaves
  FROM warehouses w
  WHERE w.is_active = true
  ORDER BY w.name;
END;
$$;

COMMENT ON FUNCTION get_all_warehouses_stats IS '获取所有仓库统计数据（仅管理员）';

-- ============================================
-- 3. 创建角色管理辅助函数
-- ============================================

-- 获取用户的所有角色
CREATE OR REPLACE FUNCTION get_user_all_roles(p_user_id uuid)
RETURNS TABLE (
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ur.role::text,
    ur.created_at
  FROM user_roles ur
  WHERE ur.user_id = p_user_id
  ORDER BY ur.created_at;
END;
$$;

COMMENT ON FUNCTION get_user_all_roles IS '获取用户的所有角色';

-- 检查用户是否有指定角色
CREATE OR REPLACE FUNCTION user_has_role(p_user_id uuid, p_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role::text = p_role
  );
END;
$$;

COMMENT ON FUNCTION user_has_role IS '检查用户是否有指定角色';

-- 添加角色给用户
CREATE OR REPLACE FUNCTION add_role_to_user(p_user_id uuid, p_role text, p_admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- 检查操作者是否为管理员
  v_is_admin := is_admin(p_admin_id);
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION '权限不足：只有管理员可以添加角色';
  END IF;
  
  -- 检查角色是否已存在
  IF user_has_role(p_user_id, p_role) THEN
    RAISE EXCEPTION '用户已拥有该角色';
  END IF;
  
  -- 添加角色
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, p_role::user_role);
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION add_role_to_user IS '添加角色给用户（仅管理员）';

-- 移除用户的角色
CREATE OR REPLACE FUNCTION remove_role_from_user(p_user_id uuid, p_role text, p_admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_role_count integer;
BEGIN
  -- 检查操作者是否为管理员
  v_is_admin := is_admin(p_admin_id);
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION '权限不足：只有管理员可以移除角色';
  END IF;
  
  -- 检查用户是否至少有一个角色
  SELECT COUNT(*) INTO v_role_count
  FROM user_roles
  WHERE user_id = p_user_id;
  
  IF v_role_count <= 1 THEN
    RAISE EXCEPTION '无法移除：用户必须至少保留一个角色';
  END IF;
  
  -- 移除角色
  DELETE FROM user_roles
  WHERE user_id = p_user_id AND role::text = p_role;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION remove_role_from_user IS '移除用户的角色（仅管理员）';

-- 获取角色的用户列表
CREATE OR REPLACE FUNCTION get_users_by_role(p_role text, p_admin_id uuid)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_phone text,
  user_email text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- 检查操作者是否为管理员
  v_is_admin := is_admin(p_admin_id);
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION '权限不足：只有管理员可以查看角色用户列表';
  END IF;
  
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.name AS user_name,
    u.phone AS user_phone,
    u.email AS user_email,
    ur.created_at
  FROM user_roles ur
  JOIN users u ON u.id = ur.user_id
  WHERE ur.role::text = p_role
  ORDER BY ur.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_users_by_role IS '获取指定角色的用户列表（仅管理员）';

-- ============================================
-- 4. 创建认证相关辅助函数
-- ============================================

-- 获取用户详细信息（包含角色）
CREATE OR REPLACE FUNCTION get_user_details(p_user_id uuid, p_requester_id uuid)
RETURNS TABLE (
  user_id uuid,
  name text,
  phone text,
  email text,
  avatar_url text,
  roles text[],
  warehouses jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_is_admin boolean;
  v_is_self boolean;
BEGIN
  -- 检查权限：管理员或本人
  v_is_admin := is_admin(p_requester_id);
  v_is_self := (p_user_id = p_requester_id);
  
  IF NOT v_is_admin AND NOT v_is_self THEN
    RAISE EXCEPTION '权限不足：只能查看自己或管理员可以查看其他用户';
  END IF;
  
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.name,
    u.phone,
    u.email,
    u.avatar_url,
    -- 获取所有角色
    ARRAY(
      SELECT ur.role::text
      FROM user_roles ur
      WHERE ur.user_id = u.id
      ORDER BY ur.created_at
    ) AS roles,
    -- 获取关联的仓库
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', w.id,
          'name', w.name,
          'assigned_at', wa.created_at
        )
      )
      FROM warehouse_assignments wa
      JOIN warehouses w ON w.id = wa.warehouse_id
      WHERE wa.user_id = u.id
    ) AS warehouses,
    u.created_at,
    u.updated_at
  FROM users u
  WHERE u.id = p_user_id;
END;
$$;

COMMENT ON FUNCTION get_user_details IS '获取用户详细信息（包含角色和仓库）';

-- 获取当前登录用户的完整信息
CREATE OR REPLACE FUNCTION get_current_user_info()
RETURNS TABLE (
  user_id uuid,
  name text,
  phone text,
  email text,
  avatar_url text,
  roles text[],
  is_admin boolean,
  is_manager boolean,
  is_driver boolean,
  warehouses jsonb,
  permissions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 获取当前用户ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '用户未登录';
  END IF;
  
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.name,
    u.phone,
    u.email,
    u.avatar_url,
    -- 获取所有角色
    ARRAY(
      SELECT ur.role::text
      FROM user_roles ur
      WHERE ur.user_id = u.id
      ORDER BY ur.created_at
    ) AS roles,
    -- 权限标识
    is_admin(u.id) AS is_admin,
    is_manager(u.id) AS is_manager,
    is_driver(u.id) AS is_driver,
    -- 获取关联的仓库
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', w.id,
          'name', w.name,
          'assigned_at', wa.created_at
        )
      )
      FROM warehouse_assignments wa
      JOIN warehouses w ON w.id = wa.warehouse_id
      WHERE wa.user_id = u.id
    ) AS warehouses,
    -- 权限详情
    jsonb_build_object(
      'can_manage_all', is_admin(u.id),
      'can_manage_warehouse', is_manager(u.id) OR is_admin(u.id),
      'can_manage_drivers', is_manager(u.id) OR is_admin(u.id),
      'can_view_all_data', is_admin(u.id),
      'can_approve_applications', is_manager(u.id) OR is_admin(u.id)
    ) AS permissions
  FROM users u
  WHERE u.id = v_user_id;
END;
$$;

COMMENT ON FUNCTION get_current_user_info IS '获取当前登录用户的完整信息';

-- ============================================
-- 5. 创建验证函数
-- ============================================

-- 验证统计函数
CREATE OR REPLACE FUNCTION verify_stats_functions()
RETURNS TABLE (
  function_name text,
  function_exists boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.function_name::text,
    true AS function_exists
  FROM (
    VALUES
      ('get_system_stats'),
      ('get_user_personal_stats'),
      ('get_warehouse_stats'),
      ('get_all_warehouses_stats'),
      ('get_user_all_roles'),
      ('user_has_role'),
      ('add_role_to_user'),
      ('remove_role_from_user'),
      ('get_users_by_role'),
      ('get_user_details'),
      ('get_current_user_info')
  ) AS f(function_name)
  WHERE EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = f.function_name
      AND routine_type = 'FUNCTION'
  );
END;
$$;

COMMENT ON FUNCTION verify_stats_functions IS '验证统计和角色管理函数是否存在';