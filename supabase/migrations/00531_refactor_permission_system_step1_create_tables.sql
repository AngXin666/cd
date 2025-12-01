/*
# 权限系统重构 - 步骤1：创建核心表

## 重构目标
将硬编码的 RLS 策略重构为基于策略模板的动态权限引擎

## 新增表结构

### 1. permission_strategies（策略模板表）
定义可复用的权限策略模板

### 2. role_permission_mappings（角色权限映射表）
将角色与策略模板关联，并指定资源归属字段

### 3. resource_permissions（资源权限配置表）
为每个数据表配置具体的权限规则

## 策略模板类型
- all_access: 完全访问权限（BOSS, PEER_ADMIN）
- managed_resources: 管辖资源权限（MANAGER）
- own_data_only: 仅自己数据权限（DRIVER）

## 执行时间
2025-12-01

## 作者
系统管理员
*/

-- ============================================
-- 1. 创建策略模板表
-- ============================================
CREATE TABLE IF NOT EXISTS permission_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_name text UNIQUE NOT NULL,
  strategy_type text NOT NULL CHECK (strategy_type IN ('all_access', 'managed_resources', 'own_data_only')),
  description text,
  select_rule text,
  insert_rule text,
  update_rule text,
  delete_rule text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE permission_strategies IS '权限策略模板表，定义可复用的权限规则';
COMMENT ON COLUMN permission_strategies.strategy_name IS '策略名称，如：boss_full_access';
COMMENT ON COLUMN permission_strategies.strategy_type IS '策略类型：all_access, managed_resources, own_data_only';
COMMENT ON COLUMN permission_strategies.select_rule IS 'SELECT 操作的权限规则（SQL 表达式）';
COMMENT ON COLUMN permission_strategies.insert_rule IS 'INSERT 操作的权限规则（SQL 表达式）';
COMMENT ON COLUMN permission_strategies.update_rule IS 'UPDATE 操作的权限规则（SQL 表达式）';
COMMENT ON COLUMN permission_strategies.delete_rule IS 'DELETE 操作的权限规则（SQL 表达式）';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_permission_strategies_type ON permission_strategies(strategy_type);
CREATE INDEX IF NOT EXISTS idx_permission_strategies_active ON permission_strategies(is_active);

-- ============================================
-- 2. 创建角色权限映射表
-- ============================================
CREATE TABLE IF NOT EXISTS role_permission_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  strategy_id uuid NOT NULL REFERENCES permission_strategies(id) ON DELETE CASCADE,
  resource_field text,
  priority integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(role, strategy_id)
);

COMMENT ON TABLE role_permission_mappings IS '角色权限映射表，将角色与策略模板关联';
COMMENT ON COLUMN role_permission_mappings.role IS '用户角色：BOSS, PEER_ADMIN, MANAGER, DRIVER';
COMMENT ON COLUMN role_permission_mappings.strategy_id IS '关联的策略模板ID';
COMMENT ON COLUMN role_permission_mappings.resource_field IS '资源归属字段名，如：manager_id, driver_id';
COMMENT ON COLUMN role_permission_mappings.priority IS '优先级，数字越大优先级越高';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_role_permission_mappings_role ON role_permission_mappings(role);
CREATE INDEX IF NOT EXISTS idx_role_permission_mappings_strategy ON role_permission_mappings(strategy_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_mappings_active ON role_permission_mappings(is_active);

-- ============================================
-- 3. 创建资源权限配置表
-- ============================================
CREATE TABLE IF NOT EXISTS resource_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text UNIQUE NOT NULL,
  owner_field text,
  manager_field text,
  require_approval_status boolean DEFAULT false,
  approval_status_field text,
  custom_rules jsonb,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE resource_permissions IS '资源权限配置表，为每个数据表配置权限规则';
COMMENT ON COLUMN resource_permissions.table_name IS '表名，如：users, warehouses';
COMMENT ON COLUMN resource_permissions.owner_field IS '所有者字段名，如：driver_id';
COMMENT ON COLUMN resource_permissions.manager_field IS '管理者字段名，如：manager_id';
COMMENT ON COLUMN resource_permissions.require_approval_status IS '是否需要审批状态检查';
COMMENT ON COLUMN resource_permissions.approval_status_field IS '审批状态字段名，如：status';
COMMENT ON COLUMN resource_permissions.custom_rules IS '自定义规则（JSON 格式）';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_resource_permissions_table ON resource_permissions(table_name);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_active ON resource_permissions(is_active);

-- ============================================
-- 4. 添加更新时间触发器
-- ============================================
DROP TRIGGER IF EXISTS update_permission_strategies_updated_at ON permission_strategies;
CREATE TRIGGER update_permission_strategies_updated_at
  BEFORE UPDATE ON permission_strategies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_role_permission_mappings_updated_at ON role_permission_mappings;
CREATE TRIGGER update_role_permission_mappings_updated_at
  BEFORE UPDATE ON role_permission_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_resource_permissions_updated_at ON resource_permissions;
CREATE TRIGGER update_resource_permissions_updated_at
  BEFORE UPDATE ON resource_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. 启用 RLS（权限表本身也需要保护）
-- ============================================
ALTER TABLE permission_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permission_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_permissions ENABLE ROW LEVEL SECURITY;

-- 只有管理员可以管理权限配置
CREATE POLICY "admins_manage_permission_strategies" ON permission_strategies
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "admins_manage_role_permission_mappings" ON role_permission_mappings
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "admins_manage_resource_permissions" ON resource_permissions
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 所有认证用户可以查看权限配置（用于前端权限判断）
CREATE POLICY "authenticated_view_permission_strategies" ON permission_strategies
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "authenticated_view_role_permission_mappings" ON role_permission_mappings
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "authenticated_view_resource_permissions" ON resource_permissions
  FOR SELECT
  TO authenticated
  USING (is_active = true);
