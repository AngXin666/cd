/*
# 物理隔离架构 - 步骤2：创建新的辅助函数和更新约束
*/

-- ============================================================================
-- 创建简化的辅助函数（不使用 boss_id）
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = p_user_id;
$$;

COMMENT ON FUNCTION get_user_role IS '获取用户角色';

CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role IN ('super_admin', 'peer_admin') 
  FROM profiles 
  WHERE id = p_user_id;
$$;

COMMENT ON FUNCTION is_admin IS '检查用户是否是管理员';

CREATE OR REPLACE FUNCTION is_manager(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role = 'manager' 
  FROM profiles 
  WHERE id = p_user_id;
$$;

COMMENT ON FUNCTION is_manager IS '检查用户是否是车队长';

CREATE OR REPLACE FUNCTION is_driver(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role = 'driver' 
  FROM profiles 
  WHERE id = p_user_id;
$$;

COMMENT ON FUNCTION is_driver IS '检查用户是否是司机';

-- ============================================================================
-- 重新创建自动初始化用户权限的触发器
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_init_user_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_permissions (
    user_id,
    can_add_driver,
    can_edit_driver,
    can_delete_driver,
    can_disable_driver,
    can_approve_leave,
    can_approve_resignation,
    can_approve_vehicle,
    can_approve_realname,
    can_view_all_drivers,
    can_view_all_data
  )
  VALUES (
    NEW.id,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role = 'manager' THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_init_user_permissions ON profiles;
CREATE TRIGGER trigger_auto_init_user_permissions
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION auto_init_user_permissions();

COMMENT ON FUNCTION auto_init_user_permissions IS '自动为新用户初始化权限配置';

-- ============================================================================
-- 重新创建获取通知接收者的函数
-- ============================================================================

CREATE OR REPLACE FUNCTION get_notification_recipients(
  p_notification_type text,
  p_warehouse_id uuid DEFAULT NULL
)
RETURNS TABLE (
  recipient_id uuid,
  recipient_name text,
  recipient_role user_role
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH config AS (
    SELECT 
      COALESCE(notify_boss, true) as notify_boss,
      COALESCE(notify_peer_admins, true) as notify_peer_admins,
      COALESCE(notify_managers, true) as notify_managers
    FROM notification_config
    WHERE notification_type = p_notification_type
    LIMIT 1
  )
  SELECT 
    p.id,
    p.name,
    p.role
  FROM profiles p
  CROSS JOIN config c
  WHERE (
    (c.notify_boss = true AND p.role = 'super_admin')
    OR
    (c.notify_peer_admins = true AND p.role = 'peer_admin')
    OR
    (
      c.notify_managers = true 
      AND p.role = 'manager'
      AND (
        p_warehouse_id IS NULL
        OR p_warehouse_id = ANY(p.managed_warehouse_ids)
      )
    )
  );
END;
$$;

COMMENT ON FUNCTION get_notification_recipients IS '获取通知接收者列表';

-- ============================================================================
-- 更新唯一约束
-- ============================================================================

ALTER TABLE user_permissions DROP CONSTRAINT IF EXISTS user_permissions_user_id_boss_id_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_permissions_user_id_key'
  ) THEN
    ALTER TABLE user_permissions ADD CONSTRAINT user_permissions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

ALTER TABLE notification_config DROP CONSTRAINT IF EXISTS notification_config_boss_id_notification_type_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notification_config_notification_type_key'
  ) THEN
    ALTER TABLE notification_config ADD CONSTRAINT notification_config_notification_type_key UNIQUE (notification_type);
  END IF;
END $$;

-- ============================================================================
-- 初始化默认通知配置
-- ============================================================================

TRUNCATE TABLE notification_config;

INSERT INTO notification_config (notification_type, notify_boss, notify_peer_admins, notify_managers)
VALUES 
  ('leave_request', true, true, true),
  ('resignation_request', true, true, true),
  ('vehicle_audit', true, true, true),
  ('realname_audit', true, true, true),
  ('driver_add', true, true, false),
  ('driver_edit', true, true, false),
  ('driver_delete', true, true, false),
  ('driver_disable', true, true, false),
  ('approval_action', true, true, true)
ON CONFLICT (notification_type) DO NOTHING;
