/*
# 添加权限变更审计日志

## 目的
记录所有权限相关的变更操作，包括：
1. 用户角色变更
2. 车队长权限启用/禁止
3. 用户创建/删除
4. 仓库分配变更

## 审计日志表结构
- id: 日志ID
- operator_id: 操作人ID
- operator_role: 操作人角色
- action_type: 操作类型
- target_user_id: 目标用户ID
- target_user_role: 目标用户角色
- old_value: 旧值
- new_value: 新值
- description: 操作描述
- ip_address: IP地址
- user_agent: 用户代理
- created_at: 创建时间
*/

-- ============================================================================
-- 1. 创建审计日志表
-- ============================================================================

CREATE TABLE IF NOT EXISTS permission_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  operator_role user_role NOT NULL,
  action_type text NOT NULL,
  target_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target_user_role user_role,
  old_value jsonb,
  new_value jsonb,
  description text NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 添加表注释
COMMENT ON TABLE permission_audit_logs IS '权限变更审计日志表';
COMMENT ON COLUMN permission_audit_logs.operator_id IS '操作人ID';
COMMENT ON COLUMN permission_audit_logs.operator_role IS '操作人角色';
COMMENT ON COLUMN permission_audit_logs.action_type IS '操作类型：role_change, permission_toggle, user_create, user_delete, warehouse_assign';
COMMENT ON COLUMN permission_audit_logs.target_user_id IS '目标用户ID';
COMMENT ON COLUMN permission_audit_logs.target_user_role IS '目标用户角色';
COMMENT ON COLUMN permission_audit_logs.old_value IS '旧值（JSON格式）';
COMMENT ON COLUMN permission_audit_logs.new_value IS '新值（JSON格式）';
COMMENT ON COLUMN permission_audit_logs.description IS '操作描述';
COMMENT ON COLUMN permission_audit_logs.ip_address IS 'IP地址';
COMMENT ON COLUMN permission_audit_logs.user_agent IS '用户代理';
COMMENT ON COLUMN permission_audit_logs.created_at IS '创建时间';

-- ============================================================================
-- 2. 创建索引
-- ============================================================================

-- 优化根据操作人查询的性能
CREATE INDEX idx_permission_audit_logs_operator 
  ON permission_audit_logs(operator_id, created_at DESC);

-- 优化根据目标用户查询的性能
CREATE INDEX idx_permission_audit_logs_target 
  ON permission_audit_logs(target_user_id, created_at DESC);

-- 优化根据操作类型查询的性能
CREATE INDEX idx_permission_audit_logs_action_type 
  ON permission_audit_logs(action_type, created_at DESC);

-- 优化根据时间范围查询的性能
CREATE INDEX idx_permission_audit_logs_created_at 
  ON permission_audit_logs(created_at DESC);

-- ============================================================================
-- 3. 创建 RLS 策略
-- ============================================================================

-- 启用 RLS
ALTER TABLE permission_audit_logs ENABLE ROW LEVEL SECURITY;

-- 租赁管理员可以查看所有审计日志
CREATE POLICY "租赁管理员查看所有审计日志" ON permission_audit_logs
  FOR SELECT TO authenticated
  USING (is_lease_admin());

-- 老板和平级账号可以查看自己租户的审计日志
CREATE POLICY "老板和平级账号查看租户审计日志" ON permission_audit_logs
  FOR SELECT TO authenticated
  USING (
    (is_main_boss(auth.uid()) OR is_peer_admin(auth.uid()))
    AND operator_id IN (
      SELECT id FROM profiles 
      WHERE tenant_id = get_user_tenant_id()
    )
  );

-- 所有用户可以插入审计日志（由触发器自动插入）
CREATE POLICY "所有用户可以插入审计日志" ON permission_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (operator_id = auth.uid());

-- ============================================================================
-- 4. 创建审计日志记录函数
-- ============================================================================

CREATE OR REPLACE FUNCTION log_permission_change(
  p_action_type text,
  p_target_user_id uuid,
  p_old_value jsonb,
  p_new_value jsonb,
  p_description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operator_role user_role;
  v_target_role user_role;
BEGIN
  -- 获取操作人角色
  SELECT role INTO v_operator_role
  FROM profiles
  WHERE id = auth.uid();

  -- 获取目标用户角色
  IF p_target_user_id IS NOT NULL THEN
    SELECT role INTO v_target_role
    FROM profiles
    WHERE id = p_target_user_id;
  END IF;

  -- 插入审计日志
  INSERT INTO permission_audit_logs (
    operator_id,
    operator_role,
    action_type,
    target_user_id,
    target_user_role,
    old_value,
    new_value,
    description
  ) VALUES (
    auth.uid(),
    v_operator_role,
    p_action_type,
    p_target_user_id,
    v_target_role,
    p_old_value,
    p_new_value,
    p_description
  );
END;
$$;

COMMENT ON FUNCTION log_permission_change IS '记录权限变更审计日志';

-- ============================================================================
-- 5. 创建触发器函数
-- ============================================================================

-- 5.1 profiles 表角色变更触发器
CREATE OR REPLACE FUNCTION audit_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 只在角色变更时记录
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    PERFORM log_permission_change(
      'role_change',
      NEW.id,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role),
      format('用户角色从 %s 变更为 %s', OLD.role, NEW.role)
    );
  END IF;

  -- 只在车队长权限状态变更时记录
  IF OLD.manager_permissions_enabled IS DISTINCT FROM NEW.manager_permissions_enabled 
     AND NEW.role = 'manager' THEN
    PERFORM log_permission_change(
      'permission_toggle',
      NEW.id,
      jsonb_build_object('enabled', OLD.manager_permissions_enabled),
      jsonb_build_object('enabled', NEW.manager_permissions_enabled),
      CASE 
        WHEN NEW.manager_permissions_enabled THEN '车队长权限已启用'
        ELSE '车队长权限已禁止'
      END
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 5.2 profiles 表用户创建触发器
CREATE OR REPLACE FUNCTION audit_profile_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM log_permission_change(
    'user_create',
    NEW.id,
    NULL,
    jsonb_build_object('role', NEW.role, 'name', NEW.name),
    format('创建新用户：%s（角色：%s）', COALESCE(NEW.name, '未命名'), NEW.role)
  );

  RETURN NEW;
END;
$$;

-- 5.3 profiles 表用户删除触发器
CREATE OR REPLACE FUNCTION audit_profile_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM log_permission_change(
    'user_delete',
    OLD.id,
    jsonb_build_object('role', OLD.role, 'name', OLD.name),
    NULL,
    format('删除用户：%s（角色：%s）', COALESCE(OLD.name, '未命名'), OLD.role)
  );

  RETURN OLD;
END;
$$;

-- 5.4 driver_warehouses 表仓库分配触发器
CREATE OR REPLACE FUNCTION audit_warehouse_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_warehouse_name text;
  v_driver_name text;
BEGIN
  -- 获取仓库名称
  SELECT name INTO v_warehouse_name
  FROM warehouses
  WHERE id = NEW.warehouse_id;

  -- 获取司机名称
  SELECT name INTO v_driver_name
  FROM profiles
  WHERE id = NEW.driver_id;

  PERFORM log_permission_change(
    'warehouse_assign',
    NEW.driver_id,
    NULL,
    jsonb_build_object('warehouse_id', NEW.warehouse_id, 'warehouse_name', v_warehouse_name),
    format('将司机 %s 分配到仓库 %s', COALESCE(v_driver_name, '未命名'), COALESCE(v_warehouse_name, '未命名'))
  );

  RETURN NEW;
END;
$$;

-- 5.5 driver_warehouses 表仓库取消分配触发器
CREATE OR REPLACE FUNCTION audit_warehouse_unassignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_warehouse_name text;
  v_driver_name text;
BEGIN
  -- 获取仓库名称
  SELECT name INTO v_warehouse_name
  FROM warehouses
  WHERE id = OLD.warehouse_id;

  -- 获取司机名称
  SELECT name INTO v_driver_name
  FROM profiles
  WHERE id = OLD.driver_id;

  PERFORM log_permission_change(
    'warehouse_unassign',
    OLD.driver_id,
    jsonb_build_object('warehouse_id', OLD.warehouse_id, 'warehouse_name', v_warehouse_name),
    NULL,
    format('取消司机 %s 在仓库 %s 的分配', COALESCE(v_driver_name, '未命名'), COALESCE(v_warehouse_name, '未命名'))
  );

  RETURN OLD;
END;
$$;

-- ============================================================================
-- 6. 创建触发器
-- ============================================================================

-- 6.1 profiles 表触发器
DROP TRIGGER IF EXISTS trigger_audit_profile_role_change ON profiles;
CREATE TRIGGER trigger_audit_profile_role_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profile_role_change();

DROP TRIGGER IF EXISTS trigger_audit_profile_create ON profiles;
CREATE TRIGGER trigger_audit_profile_create
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profile_create();

DROP TRIGGER IF EXISTS trigger_audit_profile_delete ON profiles;
CREATE TRIGGER trigger_audit_profile_delete
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profile_delete();

-- 6.2 driver_warehouses 表触发器
DROP TRIGGER IF EXISTS trigger_audit_warehouse_assignment ON driver_warehouses;
CREATE TRIGGER trigger_audit_warehouse_assignment
  AFTER INSERT ON driver_warehouses
  FOR EACH ROW
  EXECUTE FUNCTION audit_warehouse_assignment();

DROP TRIGGER IF EXISTS trigger_audit_warehouse_unassignment ON driver_warehouses;
CREATE TRIGGER trigger_audit_warehouse_unassignment
  BEFORE DELETE ON driver_warehouses
  FOR EACH ROW
  EXECUTE FUNCTION audit_warehouse_unassignment();

-- ============================================================================
-- 7. 创建查询审计日志的便捷视图
-- ============================================================================

CREATE OR REPLACE VIEW v_permission_audit_logs AS
SELECT 
  pal.id,
  pal.operator_id,
  op.name as operator_name,
  pal.operator_role,
  pal.action_type,
  CASE pal.action_type
    WHEN 'role_change' THEN '角色变更'
    WHEN 'permission_toggle' THEN '权限启用/禁止'
    WHEN 'user_create' THEN '创建用户'
    WHEN 'user_delete' THEN '删除用户'
    WHEN 'warehouse_assign' THEN '分配仓库'
    WHEN 'warehouse_unassign' THEN '取消分配仓库'
    ELSE pal.action_type
  END as action_type_cn,
  pal.target_user_id,
  tu.name as target_user_name,
  pal.target_user_role,
  pal.old_value,
  pal.new_value,
  pal.description,
  pal.created_at
FROM permission_audit_logs pal
LEFT JOIN profiles op ON pal.operator_id = op.id
LEFT JOIN profiles tu ON pal.target_user_id = tu.id
ORDER BY pal.created_at DESC;

COMMENT ON VIEW v_permission_audit_logs IS '权限审计日志视图（包含用户名称）';

-- ============================================================================
-- 8. 添加触发器注释
-- ============================================================================

COMMENT ON TRIGGER trigger_audit_profile_role_change ON profiles IS '记录用户角色变更和车队长权限变更';
COMMENT ON TRIGGER trigger_audit_profile_create ON profiles IS '记录用户创建';
COMMENT ON TRIGGER trigger_audit_profile_delete ON profiles IS '记录用户删除';
COMMENT ON TRIGGER trigger_audit_warehouse_assignment ON driver_warehouses IS '记录仓库分配';
COMMENT ON TRIGGER trigger_audit_warehouse_unassignment ON driver_warehouses IS '记录仓库取消分配';
