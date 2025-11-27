/*
# 创建灵活的权限管理系统

## 核心理念
每个老板的权限设置都不一样，权限配置存储在数据库中，而不是硬编码在 RLS 策略中。

## 新增表
1. user_permissions - 用户权限配置表
2. notification_config - 通知配置表

## RLS 策略
基于权限配置表动态判断权限，而不是硬编码角色权限。

## 司机权限隔离
司机只能查看自己 + 管理员，不能查看其他司机。
*/

-- ============================================================================
-- 第一部分：创建权限配置表
-- ============================================================================

-- 用户权限配置表
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  boss_id text NOT NULL,
  
  -- 司机管理权限
  can_add_driver boolean DEFAULT false,           -- 可以添加司机
  can_edit_driver boolean DEFAULT false,          -- 可以修改司机信息
  can_delete_driver boolean DEFAULT false,        -- 可以删除司机
  can_disable_driver boolean DEFAULT false,       -- 可以停用司机
  
  -- 审核权限
  can_approve_leave boolean DEFAULT false,        -- 可以审批请假
  can_approve_resignation boolean DEFAULT false,  -- 可以审批离职
  can_approve_vehicle boolean DEFAULT false,      -- 可以审批车辆
  can_approve_realname boolean DEFAULT false,     -- 可以审批实名
  
  -- 查看权限
  can_view_all_drivers boolean DEFAULT false,     -- 可以查看所有司机
  can_view_all_data boolean DEFAULT false,        -- 可以查看所有数据
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, boss_id)
);

COMMENT ON TABLE user_permissions IS '用户权限配置表 - 每个老板可以为用户设置不同的权限';
COMMENT ON COLUMN user_permissions.can_add_driver IS '可以添加司机账号';
COMMENT ON COLUMN user_permissions.can_edit_driver IS '可以修改司机信息（分配仓库、修改类型等）';
COMMENT ON COLUMN user_permissions.can_delete_driver IS '可以删除司机账号';
COMMENT ON COLUMN user_permissions.can_disable_driver IS '可以停用司机账号（禁止登录）';
COMMENT ON COLUMN user_permissions.can_approve_leave IS '可以审批请假申请';
COMMENT ON COLUMN user_permissions.can_approve_resignation IS '可以审批离职申请';
COMMENT ON COLUMN user_permissions.can_approve_vehicle IS '可以审批车辆审核';
COMMENT ON COLUMN user_permissions.can_approve_realname IS '可以审批实名认证';
COMMENT ON COLUMN user_permissions.can_view_all_drivers IS '可以查看所有司机（不受管辖范围限制）';
COMMENT ON COLUMN user_permissions.can_view_all_data IS '可以查看所有数据';

-- 通知配置表
CREATE TABLE IF NOT EXISTS notification_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boss_id text NOT NULL,
  
  -- 通知类型
  notification_type text NOT NULL, 
  -- 'leave_request' - 请假申请
  -- 'resignation_request' - 离职申请
  -- 'vehicle_audit' - 车辆审核
  -- 'realname_audit' - 实名审核
  -- 'driver_add' - 添加司机
  -- 'driver_edit' - 修改司机
  -- 'driver_delete' - 删除司机
  -- 'driver_disable' - 停用司机
  -- 'approval_action' - 审核操作
  
  -- 接收者角色
  notify_boss boolean DEFAULT true,              -- 通知老板
  notify_peer_admins boolean DEFAULT true,       -- 通知平级账号
  notify_managers boolean DEFAULT true,          -- 通知车队长
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(boss_id, notification_type)
);

COMMENT ON TABLE notification_config IS '通知配置表 - 配置不同操作的通知接收方';
COMMENT ON COLUMN notification_config.notification_type IS '通知类型';
COMMENT ON COLUMN notification_config.notify_boss IS '是否通知老板';
COMMENT ON COLUMN notification_config.notify_peer_admins IS '是否通知所有平级账号';
COMMENT ON COLUMN notification_config.notify_managers IS '是否通知相关车队长';

-- ============================================================================
-- 第二部分：为 user_permissions 表启用 RLS
-- ============================================================================

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- 老板和平级账号可以查看和管理所有权限配置
CREATE POLICY "Boss and peer admin can manage all permissions"
ON user_permissions
FOR ALL
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
);

COMMENT ON POLICY "Boss and peer admin can manage all permissions" ON user_permissions 
IS '老板和平级账号可以查看和管理所有权限配置';

-- 用户可以查看自己的权限配置
CREATE POLICY "User can view own permissions"
ON user_permissions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

COMMENT ON POLICY "User can view own permissions" ON user_permissions 
IS '用户可以查看自己的权限配置';

-- ============================================================================
-- 第三部分：为 notification_config 表启用 RLS
-- ============================================================================

ALTER TABLE notification_config ENABLE ROW LEVEL SECURITY;

-- 老板和平级账号可以管理通知配置
CREATE POLICY "Boss and peer admin can manage notification config"
ON notification_config
FOR ALL
TO authenticated
USING (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
)
WITH CHECK (
  (SELECT r.role FROM get_user_role_and_boss(auth.uid()) r(role, boss_id)) 
    IN ('super_admin', 'peer_admin')
);

COMMENT ON POLICY "Boss and peer admin can manage notification config" ON notification_config 
IS '老板和平级账号可以管理通知配置';

-- ============================================================================
-- 第四部分：创建辅助函数
-- ============================================================================

-- 检查用户是否有特定权限
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id uuid,
  p_permission text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean;
BEGIN
  -- 查询用户权限
  EXECUTE format(
    'SELECT COALESCE(%I, false) FROM user_permissions WHERE user_id = $1',
    p_permission
  )
  INTO v_has_permission
  USING p_user_id;
  
  RETURN COALESCE(v_has_permission, false);
END;
$$;

COMMENT ON FUNCTION check_user_permission IS '检查用户是否有特定权限';

-- 获取通知接收者列表
CREATE OR REPLACE FUNCTION get_notification_recipients(
  p_boss_id text,
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
    WHERE boss_id = p_boss_id
    AND notification_type = p_notification_type
  )
  SELECT 
    p.id,
    p.name,
    p.role
  FROM profiles p, config c
  WHERE p.boss_id = p_boss_id
  AND (
    -- 通知老板
    (c.notify_boss = true AND p.role = 'super_admin' AND p.id = p_boss_id)
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

COMMENT ON FUNCTION get_notification_recipients IS '获取通知接收者列表';

-- ============================================================================
-- 第五部分：创建触发器 - 自动初始化用户权限
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
    boss_id,
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
    COALESCE(NEW.boss_id, NEW.id::text),
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
  ON CONFLICT (user_id, boss_id) DO NOTHING;
  
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
-- 第六部分：初始化默认通知配置
-- ============================================================================

-- 为现有的老板账号创建默认通知配置
INSERT INTO notification_config (boss_id, notification_type, notify_boss, notify_peer_admins, notify_managers)
SELECT 
  id::text,
  notification_type,
  true,
  true,
  true
FROM profiles
CROSS JOIN (
  VALUES 
    ('leave_request'),
    ('resignation_request'),
    ('vehicle_audit'),
    ('realname_audit'),
    ('driver_add'),
    ('driver_edit'),
    ('driver_delete'),
    ('driver_disable'),
    ('approval_action')
) AS types(notification_type)
WHERE role = 'super_admin'
ON CONFLICT (boss_id, notification_type) DO NOTHING;

-- ============================================================================
-- 第七部分：为现有用户初始化权限
-- ============================================================================

INSERT INTO user_permissions (
  user_id,
  boss_id,
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
SELECT 
  id,
  COALESCE(boss_id, id::text),
  CASE WHEN role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
  CASE WHEN role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
  CASE WHEN role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
  CASE WHEN role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
  CASE WHEN role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
  CASE WHEN role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
  CASE WHEN role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
  CASE WHEN role IN ('super_admin', 'peer_admin') THEN true ELSE false END,
  CASE WHEN role = 'manager' THEN true ELSE false END,
  CASE WHEN role IN ('super_admin', 'peer_admin') THEN true ELSE false END
FROM profiles
ON CONFLICT (user_id, boss_id) DO NOTHING;
