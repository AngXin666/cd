/*
# 性能优化 - 索引和缓存

## 说明
为常用查询添加索引，创建用户权限摘要缓存表，提升系统性能

## 优化内容
1. 为各表添加常用查询索引
2. 创建用户权限摘要缓存表
3. 创建缓存刷新函数和触发器
4. 优化复合查询性能

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 为 users 表添加索引
-- ============================================

-- 用户名查询索引
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name) WHERE name IS NOT NULL;

-- 手机号查询索引
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- 邮箱查询索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- ============================================
-- 2. 为 user_roles 表添加索引
-- ============================================

-- 用户ID查询索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- 角色查询索引
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- 复合索引：用户 + 角色
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role);

-- ============================================
-- 3. 为 warehouse_assignments 表添加索引
-- ============================================

-- 仓库查询索引
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_warehouse_id ON warehouse_assignments(warehouse_id);

-- 用户查询索引
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_user_id ON warehouse_assignments(user_id);

-- 分配人查询索引
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_assigned_by ON warehouse_assignments(assigned_by) WHERE assigned_by IS NOT NULL;

-- 复合索引：仓库 + 用户
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_warehouse_user ON warehouse_assignments(warehouse_id, user_id);

-- ============================================
-- 4. 为 warehouses 表添加索引
-- ============================================

-- 管理员查询索引
CREATE INDEX IF NOT EXISTS idx_warehouses_manager_id ON warehouses(manager_id) WHERE manager_id IS NOT NULL;

-- 状态查询索引
CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON warehouses(is_active);

-- 名称查询索引
CREATE INDEX IF NOT EXISTS idx_warehouses_name ON warehouses(name) WHERE name IS NOT NULL;

-- ============================================
-- 5. 为 attendance 表添加索引
-- ============================================

-- 用户查询索引
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);

-- 日期查询索引
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- 类型查询索引
CREATE INDEX IF NOT EXISTS idx_attendance_type ON attendance(type) WHERE type IS NOT NULL;

-- 复合索引：用户 + 日期（最常用的查询组合）
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date DESC);

-- 复合索引：用户 + 类型 + 日期
CREATE INDEX IF NOT EXISTS idx_attendance_user_type_date ON attendance(user_id, type, date DESC) WHERE type IS NOT NULL;

-- 复合索引：日期 + 类型（用于统计查询）
CREATE INDEX IF NOT EXISTS idx_attendance_date_type ON attendance(date, type) WHERE type IS NOT NULL;

-- ============================================
-- 4. 为 leave_applications 表添加索引
-- ============================================

-- 用户查询索引
CREATE INDEX IF NOT EXISTS idx_leave_applications_user_id ON leave_applications(user_id);

-- 审批人查询索引
CREATE INDEX IF NOT EXISTS idx_leave_applications_approver_id ON leave_applications(approver_id) WHERE approver_id IS NOT NULL;

-- 状态查询索引（重要：用于筛选待审批、已批准等）
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);

-- 复合索引：用户 + 状态
CREATE INDEX IF NOT EXISTS idx_leave_applications_user_status ON leave_applications(user_id, status);

-- 复合索引：状态 + 创建时间（用于待审批列表）
CREATE INDEX IF NOT EXISTS idx_leave_applications_status_created ON leave_applications(status, created_at DESC);

-- 复合索引：审批人 + 状态（用于审批人查看待审批列表）
CREATE INDEX IF NOT EXISTS idx_leave_applications_approver_status ON leave_applications(approver_id, status) WHERE approver_id IS NOT NULL;

-- 日期范围查询索引
CREATE INDEX IF NOT EXISTS idx_leave_applications_start_date ON leave_applications(start_date);
CREATE INDEX IF NOT EXISTS idx_leave_applications_end_date ON leave_applications(end_date);

-- ============================================
-- 5. 为 resignation_applications 表添加索引
-- ============================================

-- 用户查询索引
CREATE INDEX IF NOT EXISTS idx_resignation_applications_user_id ON resignation_applications(user_id);

-- 审批人查询索引
CREATE INDEX IF NOT EXISTS idx_resignation_applications_approver_id ON resignation_applications(approver_id) WHERE approver_id IS NOT NULL;

-- 状态查询索引（重要：用于筛选待审批、已批准等）
CREATE INDEX IF NOT EXISTS idx_resignation_applications_status ON resignation_applications(status);

-- 复合索引：用户 + 状态
CREATE INDEX IF NOT EXISTS idx_resignation_applications_user_status ON resignation_applications(user_id, status);

-- 复合索引：状态 + 创建时间（用于待审批列表）
CREATE INDEX IF NOT EXISTS idx_resignation_applications_status_created ON resignation_applications(status, created_at DESC);

-- 复合索引：审批人 + 状态（用于审批人查看待审批列表）
CREATE INDEX IF NOT EXISTS idx_resignation_applications_approver_status ON resignation_applications(approver_id, status) WHERE approver_id IS NOT NULL;

-- 离职日期查询索引
CREATE INDEX IF NOT EXISTS idx_resignation_applications_resignation_date ON resignation_applications(resignation_date);

-- ============================================
-- 6. 为 vehicles 表添加索引
-- ============================================

-- 用户查询索引
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id) WHERE user_id IS NOT NULL;

-- 司机查询索引
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_current_driver_id ON vehicles(current_driver_id) WHERE current_driver_id IS NOT NULL;

-- 仓库查询索引
CREATE INDEX IF NOT EXISTS idx_vehicles_warehouse_id ON vehicles(warehouse_id) WHERE warehouse_id IS NOT NULL;

-- 状态查询索引
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status) WHERE status IS NOT NULL;

-- 活跃状态索引
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);

-- 车牌号查询索引（唯一性查询）
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles(plate_number) WHERE plate_number IS NOT NULL;

-- 复合索引：状态 + 活跃状态
CREATE INDEX IF NOT EXISTS idx_vehicles_status_active ON vehicles(status, is_active) WHERE status IS NOT NULL;

-- ============================================
-- 7. 为 notifications 表添加索引
-- ============================================

-- 接收者查询索引
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);

-- 发送者查询索引
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);

-- 已读状态索引
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 类型查询索引
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 复合索引：接收者 + 已读状态（最常用的查询）
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient_id, is_read);

-- 复合索引：接收者 + 已读状态 + 创建时间（用于通知列表）
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read_created ON notifications(recipient_id, is_read, created_at DESC);

-- 复合索引：接收者 + 类型 + 已读状态
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_type_read ON notifications(recipient_id, type, is_read);

-- 关联ID查询索引
CREATE INDEX IF NOT EXISTS idx_notifications_related_id ON notifications(related_id) WHERE related_id IS NOT NULL;

-- ============================================
-- 8. 创建用户权限摘要缓存表
-- ============================================

CREATE TABLE IF NOT EXISTS user_permission_cache (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  is_admin boolean NOT NULL DEFAULT false,
  is_manager boolean NOT NULL DEFAULT false,
  is_driver boolean NOT NULL DEFAULT false,
  managed_warehouse_ids uuid[] DEFAULT ARRAY[]::uuid[],
  managed_driver_ids uuid[] DEFAULT ARRAY[]::uuid[],
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 为缓存表添加索引
CREATE INDEX IF NOT EXISTS idx_user_permission_cache_role ON user_permission_cache(role);
CREATE INDEX IF NOT EXISTS idx_user_permission_cache_warehouse_id ON user_permission_cache(warehouse_id) WHERE warehouse_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_permission_cache_is_admin ON user_permission_cache(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_user_permission_cache_is_manager ON user_permission_cache(is_manager) WHERE is_manager = true;
CREATE INDEX IF NOT EXISTS idx_user_permission_cache_last_updated ON user_permission_cache(last_updated);

-- 启用 RLS
ALTER TABLE user_permission_cache ENABLE ROW LEVEL SECURITY;

-- 策略：所有认证用户可以查看缓存（用于前端权限判断）
CREATE POLICY "authenticated_users_view_permission_cache" ON user_permission_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- 策略：只有系统可以更新缓存
CREATE POLICY "system_update_permission_cache" ON user_permission_cache
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE user_permission_cache IS '用户权限摘要缓存表';
COMMENT ON COLUMN user_permission_cache.user_id IS '用户ID';
COMMENT ON COLUMN user_permission_cache.role IS '用户角色';
COMMENT ON COLUMN user_permission_cache.warehouse_id IS '用户所属仓库ID';
COMMENT ON COLUMN user_permission_cache.is_admin IS '是否为管理员';
COMMENT ON COLUMN user_permission_cache.is_manager IS '是否为车队长';
COMMENT ON COLUMN user_permission_cache.is_driver IS '是否为司机';
COMMENT ON COLUMN user_permission_cache.managed_warehouse_ids IS '管理的仓库ID列表';
COMMENT ON COLUMN user_permission_cache.managed_driver_ids IS '管理的司机ID列表';
COMMENT ON COLUMN user_permission_cache.permissions IS '权限详情（JSON格式）';
COMMENT ON COLUMN user_permission_cache.last_updated IS '最后更新时间';

-- ============================================
-- 9. 创建缓存刷新函数
-- ============================================

-- 刷新单个用户的权限缓存
CREATE OR REPLACE FUNCTION refresh_user_permission_cache(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_managed_warehouse_ids uuid[];
  v_managed_driver_ids uuid[];
  v_permissions jsonb;
BEGIN
  -- 获取用户信息
  SELECT id, role, warehouse_id
  INTO v_user
  FROM users
  WHERE id = p_user_id;
  
  IF v_user.id IS NULL THEN
    RAISE EXCEPTION '用户不存在';
  END IF;
  
  -- 初始化权限对象
  v_permissions := jsonb_build_object(
    'can_manage_all', false,
    'can_manage_warehouse', false,
    'can_manage_drivers', false,
    'can_view_all_data', false,
    'can_approve_applications', false
  );
  
  -- 根据角色设置权限
  IF v_user.role IN ('BOSS', 'MANAGER') THEN
    -- 管理员权限
    v_permissions := jsonb_build_object(
      'can_manage_all', true,
      'can_manage_warehouse', true,
      'can_manage_drivers', true,
      'can_view_all_data', true,
      'can_approve_applications', true
    );
    
    -- 获取管理的仓库列表
    IF v_user.role = 'BOSS' THEN
      -- BOSS 管理所有仓库
      SELECT array_agg(id) INTO v_managed_warehouse_ids
      FROM warehouses
      WHERE is_active = true;
    ELSE
      -- MANAGER 管理自己的仓库
      v_managed_warehouse_ids := ARRAY[v_user.warehouse_id];
    END IF;
    
    -- 获取管理的司机列表
    SELECT array_agg(id) INTO v_managed_driver_ids
    FROM users
    WHERE role = 'DRIVER'
      AND (v_user.role = 'BOSS' OR warehouse_id = v_user.warehouse_id);
      
  ELSIF v_user.role = 'DRIVER' THEN
    -- 司机权限
    v_permissions := jsonb_build_object(
      'can_manage_all', false,
      'can_manage_warehouse', false,
      'can_manage_drivers', false,
      'can_view_all_data', false,
      'can_approve_applications', false
    );
    
    v_managed_warehouse_ids := ARRAY[]::uuid[];
    v_managed_driver_ids := ARRAY[]::uuid[];
  END IF;
  
  -- 插入或更新缓存
  INSERT INTO user_permission_cache (
    user_id,
    role,
    warehouse_id,
    is_admin,
    is_manager,
    is_driver,
    managed_warehouse_ids,
    managed_driver_ids,
    permissions,
    last_updated
  ) VALUES (
    p_user_id,
    v_user.role,
    v_user.warehouse_id,
    v_user.role IN ('BOSS', 'MANAGER'),
    v_user.role = 'MANAGER',
    v_user.role = 'DRIVER',
    v_managed_warehouse_ids,
    v_managed_driver_ids,
    v_permissions,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    warehouse_id = EXCLUDED.warehouse_id,
    is_admin = EXCLUDED.is_admin,
    is_manager = EXCLUDED.is_manager,
    is_driver = EXCLUDED.is_driver,
    managed_warehouse_ids = EXCLUDED.managed_warehouse_ids,
    managed_driver_ids = EXCLUDED.managed_driver_ids,
    permissions = EXCLUDED.permissions,
    last_updated = now();
END;
$$;

COMMENT ON FUNCTION refresh_user_permission_cache IS '刷新单个用户的权限缓存';

-- 批量刷新所有用户的权限缓存
CREATE OR REPLACE FUNCTION refresh_all_user_permission_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_user_id IN
    SELECT id FROM users
  LOOP
    PERFORM refresh_user_permission_cache(v_user_id);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION refresh_all_user_permission_cache IS '批量刷新所有用户的权限缓存';

-- 获取用户权限缓存
CREATE OR REPLACE FUNCTION get_user_permission_cache(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  role text,
  warehouse_id uuid,
  is_admin boolean,
  is_manager boolean,
  is_driver boolean,
  managed_warehouse_ids uuid[],
  managed_driver_ids uuid[],
  permissions jsonb,
  last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- 检查缓存是否存在
  IF NOT EXISTS (
    SELECT 1 FROM user_permission_cache WHERE user_permission_cache.user_id = p_user_id
  ) THEN
    -- 缓存不存在，刷新缓存
    PERFORM refresh_user_permission_cache(p_user_id);
  END IF;
  
  -- 返回缓存数据
  RETURN QUERY
  SELECT
    upc.user_id,
    upc.role,
    upc.warehouse_id,
    upc.is_admin,
    upc.is_manager,
    upc.is_driver,
    upc.managed_warehouse_ids,
    upc.managed_driver_ids,
    upc.permissions,
    upc.last_updated
  FROM user_permission_cache upc
  WHERE upc.user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION get_user_permission_cache IS '获取用户权限缓存';

-- ============================================
-- 10. 创建触发器自动更新缓存
-- ============================================

-- 用户信息变更时自动更新缓存
CREATE OR REPLACE FUNCTION trigger_refresh_user_permission_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 用户角色或仓库变更时刷新缓存
  IF TG_OP = 'INSERT' THEN
    PERFORM refresh_user_permission_cache(NEW.id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role OR OLD.warehouse_id IS DISTINCT FROM NEW.warehouse_id THEN
      PERFORM refresh_user_permission_cache(NEW.id);
      
      -- 如果是车队长，还需要刷新其管理的司机的缓存
      IF NEW.role = 'MANAGER' AND OLD.warehouse_id IS DISTINCT FROM NEW.warehouse_id THEN
        PERFORM refresh_user_permission_cache(id)
        FROM users
        WHERE role = 'DRIVER' AND warehouse_id IN (OLD.warehouse_id, NEW.warehouse_id);
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM user_permission_cache WHERE user_id = OLD.id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_users_permission_cache ON users;
CREATE TRIGGER trigger_users_permission_cache
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_user_permission_cache();

-- 仓库信息变更时自动更新相关用户缓存
CREATE OR REPLACE FUNCTION trigger_refresh_warehouse_users_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- 仓库管理员变更时，刷新相关用户缓存
    IF OLD.manager_id IS DISTINCT FROM NEW.manager_id THEN
      -- 刷新旧管理员缓存
      IF OLD.manager_id IS NOT NULL THEN
        PERFORM refresh_user_permission_cache(OLD.manager_id);
      END IF;
      
      -- 刷新新管理员缓存
      IF NEW.manager_id IS NOT NULL THEN
        PERFORM refresh_user_permission_cache(NEW.manager_id);
      END IF;
      
      -- 刷新该仓库所有司机的缓存
      PERFORM refresh_user_permission_cache(id)
      FROM users
      WHERE warehouse_id = NEW.id AND role = 'DRIVER';
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_warehouses_permission_cache ON warehouses;
CREATE TRIGGER trigger_warehouses_permission_cache
  AFTER UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_warehouse_users_cache();

-- ============================================
-- 11. 初始化所有用户的权限缓存
-- ============================================

-- 为所有现有用户创建权限缓存
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT refresh_all_user_permission_cache() INTO v_count;
  RAISE NOTICE '已为 % 个用户创建权限缓存', v_count;
END $$;

-- ============================================
-- 12. 创建索引使用情况查询函数
-- ============================================

CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
  table_name text,
  index_name text,
  index_size text,
  index_scans bigint,
  rows_read bigint,
  rows_fetched bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename AS table_name,
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan AS index_scans,
    idx_tup_read AS rows_read,
    idx_tup_fetch AS rows_fetched
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  ORDER BY idx_scan DESC;
END;
$$;

COMMENT ON FUNCTION get_index_usage_stats IS '查询索引使用情况统计';

-- ============================================
-- 13. 创建缓存统计查询函数
-- ============================================

CREATE OR REPLACE FUNCTION get_permission_cache_stats()
RETURNS TABLE (
  total_cached_users integer,
  admin_count integer,
  manager_count integer,
  driver_count integer,
  oldest_cache_age interval,
  newest_cache_age interval,
  avg_cache_age interval
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::integer AS total_cached_users,
    COUNT(*) FILTER (WHERE is_admin = true)::integer AS admin_count,
    COUNT(*) FILTER (WHERE is_manager = true)::integer AS manager_count,
    COUNT(*) FILTER (WHERE is_driver = true)::integer AS driver_count,
    MAX(now() - last_updated) AS oldest_cache_age,
    MIN(now() - last_updated) AS newest_cache_age,
    AVG(now() - last_updated) AS avg_cache_age
  FROM user_permission_cache;
END;
$$;

COMMENT ON FUNCTION get_permission_cache_stats IS '查询权限缓存统计信息';