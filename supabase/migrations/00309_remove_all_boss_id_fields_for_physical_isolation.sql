/*
# 物理隔离架构 - 删除所有 boss_id 字段

## 核心理念
每个老板拥有完全独立的 Supabase 项目和数据库，数据在物理上完全隔离。
不需要 boss_id 字段进行逻辑隔离。

## 变更内容
1. 删除所有表中的 boss_id 字段
2. 删除 boss_id 相关的函数
3. 删除 boss_id 相关的约束和索引
4. 更新相关的触发器

## 影响范围
- profiles
- notifications
- leave_applications
- resignation_applications
- vehicles
- warehouses
- attendance_records
- salary_records
- user_permissions
- notification_config
*/

-- ============================================================================
-- 第一部分：删除所有表中的 boss_id 字段
-- ============================================================================

-- profiles 表
ALTER TABLE profiles DROP COLUMN IF EXISTS boss_id CASCADE;

-- notifications 表
ALTER TABLE notifications DROP COLUMN IF EXISTS boss_id CASCADE;

-- leave_applications 表
ALTER TABLE leave_applications DROP COLUMN IF EXISTS boss_id CASCADE;

-- resignation_applications 表
ALTER TABLE resignation_applications DROP COLUMN IF EXISTS boss_id CASCADE;

-- vehicles 表
ALTER TABLE vehicles DROP COLUMN IF EXISTS boss_id CASCADE;

-- warehouses 表
ALTER TABLE warehouses DROP COLUMN IF EXISTS boss_id CASCADE;

-- attendance_records 表
ALTER TABLE attendance_records DROP COLUMN IF EXISTS boss_id CASCADE;

-- salary_records 表
ALTER TABLE salary_records DROP COLUMN IF EXISTS boss_id CASCADE;

-- user_permissions 表
ALTER TABLE user_permissions DROP COLUMN IF EXISTS boss_id CASCADE;

-- notification_config 表
ALTER TABLE notification_config DROP COLUMN IF EXISTS boss_id CASCADE;

-- vehicle_audit_applications 表
ALTER TABLE vehicle_audit_applications DROP COLUMN IF EXISTS boss_id CASCADE;

-- realname_audit_applications 表
ALTER TABLE realname_audit_applications DROP COLUMN IF EXISTS boss_id CASCADE;

-- ============================================================================
-- 第二部分：删除 boss_id 相关的函数
-- ============================================================================

-- 删除获取当前用户 boss_id 的函数
DROP FUNCTION IF EXISTS get_current_user_boss_id() CASCADE;

-- 删除获取用户角色和 boss_id 的函数
DROP FUNCTION IF EXISTS get_user_role_and_boss(uuid) CASCADE;

-- 删除自动设置 boss_id 的触发器函数
DROP FUNCTION IF EXISTS auto_set_boss_id() CASCADE;

-- 删除自动初始化用户权限的触发器函数（需要重新创建，不使用 boss_id）
DROP FUNCTION IF EXISTS auto_init_user_permissions() CASCADE;

-- 删除获取通知接收者的函数（需要重新创建，不使用 boss_id）
DROP FUNCTION IF EXISTS get_notification_recipients(text, text, uuid) CASCADE;

-- ============================================================================
-- 第三部分：创建简化的辅助函数（不使用 boss_id）
-- ============================================================================

-- 获取用户角色
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = p_user_id;
$$;

COMMENT ON FUNCTION get_user_role IS '获取用户角色';

-- 检查用户是否是管理员
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

COMMENT ON FUNCTION is_admin IS '检查用户是否是管理员（老板或平级账号）';

-- 检查用户是否是车队长
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

-- 检查用户是否是司机
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
-- 第四部分：重新创建自动初始化用户权限的触发器（不使用 boss_id）
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_init_user_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 为新用户创建权限配置
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
    -- 老板和平级账号拥有所有权限
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    CASE WHEN NEW.role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
    -- 车队长默认可以查看所有司机
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

COMMENT ON FUNCTION auto_init_user_permissions IS '自动为新用户初始化权限配置（物理隔离架构）';

-- ============================================================================
-- 第五部分：重新创建获取通知接收者的函数（不使用 boss_id）
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
      notify_boss,
      notify_peer_admins,
      notify_managers
    FROM notification_config
    WHERE notification_type = p_notification_type
    LIMIT 1
  )
  SELECT 
    p.id,
    p.name,
    p.role
  FROM profiles p, config c
  WHERE (
    -- 通知老板
    (c.notify_boss = true AND p.role = 'super_admin')
    OR
    -- 通知平级账号
    (c.notify_peer_admins = true AND p.role = 'peer_admin')
    OR
    -- 通知相关车队长
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

COMMENT ON FUNCTION get_notification_recipients IS '获取通知接收者列表（物理隔离架构）';

-- ============================================================================
-- 第六部分：更新 user_permissions 表的唯一约束
-- ============================================================================

-- 删除旧的唯一约束（包含 boss_id）
ALTER TABLE user_permissions DROP CONSTRAINT IF EXISTS user_permissions_user_id_boss_id_key;

-- 添加新的唯一约束（只有 user_id）
ALTER TABLE user_permissions ADD CONSTRAINT user_permissions_user_id_key UNIQUE (user_id);

-- ============================================================================
-- 第七部分：更新 notification_config 表的唯一约束
-- ============================================================================

-- 删除旧的唯一约束（包含 boss_id）
ALTER TABLE notification_config DROP CONSTRAINT IF EXISTS notification_config_boss_id_notification_type_key;

-- 添加新的唯一约束（只有 notification_type）
ALTER TABLE notification_config ADD CONSTRAINT notification_config_notification_type_key UNIQUE (notification_type);

-- ============================================================================
-- 第八部分：初始化默认通知配置（不使用 boss_id）
-- ============================================================================

-- 删除旧的通知配置
TRUNCATE TABLE notification_config;

-- 插入新的默认通知配置
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
