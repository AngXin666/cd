/*
# 权限系统重构 - 步骤2：插入策略模板数据

## 说明
定义三种核心策略模板：
1. all_access: 完全访问权限
2. managed_resources: 管辖资源权限
3. own_data_only: 仅自己数据权限

## 执行时间
2025-12-01
*/

-- ============================================
-- 1. 插入策略模板
-- ============================================

-- 策略1：完全访问权限（BOSS, PEER_ADMIN）
INSERT INTO permission_strategies (
  strategy_name,
  strategy_type,
  description,
  select_rule,
  insert_rule,
  update_rule,
  delete_rule
) VALUES (
  'boss_full_access',
  'all_access',
  '老板和平级管理员的完全访问权限，可以操作所有数据',
  'is_admin(auth.uid())',
  'is_admin(auth.uid())',
  'is_admin(auth.uid())',
  'is_admin(auth.uid())'
) ON CONFLICT (strategy_name) DO UPDATE SET
  description = EXCLUDED.description,
  select_rule = EXCLUDED.select_rule,
  insert_rule = EXCLUDED.insert_rule,
  update_rule = EXCLUDED.update_rule,
  delete_rule = EXCLUDED.delete_rule,
  updated_at = now();

-- 策略2：管辖资源权限（MANAGER）
INSERT INTO permission_strategies (
  strategy_name,
  strategy_type,
  description,
  select_rule,
  insert_rule,
  update_rule,
  delete_rule
) VALUES (
  'manager_managed_resources',
  'managed_resources',
  '车队长的管辖资源权限，只能操作自己管理的仓库和司机',
  '{{manager_field}} = auth.uid() OR EXISTS (
    SELECT 1 FROM driver_warehouses dw
    JOIN warehouses w ON dw.warehouse_id = w.id
    WHERE dw.driver_id = {{owner_field}}
      AND w.manager_id = auth.uid()
  )',
  '{{manager_field}} = auth.uid()',
  '{{manager_field}} = auth.uid()',
  '{{manager_field}} = auth.uid()'
) ON CONFLICT (strategy_name) DO UPDATE SET
  description = EXCLUDED.description,
  select_rule = EXCLUDED.select_rule,
  insert_rule = EXCLUDED.insert_rule,
  update_rule = EXCLUDED.update_rule,
  delete_rule = EXCLUDED.delete_rule,
  updated_at = now();

-- 策略3：仅自己数据权限（DRIVER）
INSERT INTO permission_strategies (
  strategy_name,
  strategy_type,
  description,
  select_rule,
  insert_rule,
  update_rule,
  delete_rule
) VALUES (
  'driver_own_data_only',
  'own_data_only',
  '司机的个人数据权限，只能操作自己的数据',
  '{{owner_field}} = auth.uid()',
  '{{owner_field}} = auth.uid()',
  '{{owner_field}} = auth.uid() {{approval_check}}',
  '{{owner_field}} = auth.uid() {{approval_check}}'
) ON CONFLICT (strategy_name) DO UPDATE SET
  description = EXCLUDED.description,
  select_rule = EXCLUDED.select_rule,
  insert_rule = EXCLUDED.insert_rule,
  update_rule = EXCLUDED.update_rule,
  delete_rule = EXCLUDED.delete_rule,
  updated_at = now();

-- ============================================
-- 2. 插入角色权限映射
-- ============================================

-- BOSS 角色映射
INSERT INTO role_permission_mappings (
  role,
  strategy_id,
  resource_field,
  priority
) VALUES (
  'BOSS',
  (SELECT id FROM permission_strategies WHERE strategy_name = 'boss_full_access'),
  NULL,
  100
) ON CONFLICT (role, strategy_id) DO UPDATE SET
  priority = EXCLUDED.priority,
  updated_at = now();

-- PEER_ADMIN 角色映射
INSERT INTO role_permission_mappings (
  role,
  strategy_id,
  resource_field,
  priority
) VALUES (
  'PEER_ADMIN',
  (SELECT id FROM permission_strategies WHERE strategy_name = 'boss_full_access'),
  NULL,
  100
) ON CONFLICT (role, strategy_id) DO UPDATE SET
  priority = EXCLUDED.priority,
  updated_at = now();

-- MANAGER 角色映射
INSERT INTO role_permission_mappings (
  role,
  strategy_id,
  resource_field,
  priority
) VALUES (
  'MANAGER',
  (SELECT id FROM permission_strategies WHERE strategy_name = 'manager_managed_resources'),
  'manager_id',
  50
) ON CONFLICT (role, strategy_id) DO UPDATE SET
  resource_field = EXCLUDED.resource_field,
  priority = EXCLUDED.priority,
  updated_at = now();

-- DRIVER 角色映射
INSERT INTO role_permission_mappings (
  role,
  strategy_id,
  resource_field,
  priority
) VALUES (
  'DRIVER',
  (SELECT id FROM permission_strategies WHERE strategy_name = 'driver_own_data_only'),
  'driver_id',
  10
) ON CONFLICT (role, strategy_id) DO UPDATE SET
  resource_field = EXCLUDED.resource_field,
  priority = EXCLUDED.priority,
  updated_at = now();

-- ============================================
-- 3. 插入资源权限配置
-- ============================================

-- users 表配置
INSERT INTO resource_permissions (
  table_name,
  owner_field,
  manager_field,
  require_approval_status,
  approval_status_field
) VALUES (
  'users',
  'id',
  NULL,
  false,
  NULL
) ON CONFLICT (table_name) DO UPDATE SET
  owner_field = EXCLUDED.owner_field,
  manager_field = EXCLUDED.manager_field,
  require_approval_status = EXCLUDED.require_approval_status,
  approval_status_field = EXCLUDED.approval_status_field,
  updated_at = now();

-- user_roles 表配置
INSERT INTO resource_permissions (
  table_name,
  owner_field,
  manager_field,
  require_approval_status,
  approval_status_field
) VALUES (
  'user_roles',
  'user_id',
  NULL,
  false,
  NULL
) ON CONFLICT (table_name) DO UPDATE SET
  owner_field = EXCLUDED.owner_field,
  manager_field = EXCLUDED.manager_field,
  require_approval_status = EXCLUDED.require_approval_status,
  approval_status_field = EXCLUDED.approval_status_field,
  updated_at = now();

-- warehouses 表配置
INSERT INTO resource_permissions (
  table_name,
  owner_field,
  manager_field,
  require_approval_status,
  approval_status_field
) VALUES (
  'warehouses',
  NULL,
  'manager_id',
  false,
  NULL
) ON CONFLICT (table_name) DO UPDATE SET
  owner_field = EXCLUDED.owner_field,
  manager_field = EXCLUDED.manager_field,
  require_approval_status = EXCLUDED.require_approval_status,
  approval_status_field = EXCLUDED.approval_status_field,
  updated_at = now();

-- driver_warehouses 表配置
INSERT INTO resource_permissions (
  table_name,
  owner_field,
  manager_field,
  require_approval_status,
  approval_status_field
) VALUES (
  'driver_warehouses',
  'driver_id',
  NULL,
  false,
  NULL
) ON CONFLICT (table_name) DO UPDATE SET
  owner_field = EXCLUDED.owner_field,
  manager_field = EXCLUDED.manager_field,
  require_approval_status = EXCLUDED.require_approval_status,
  approval_status_field = EXCLUDED.approval_status_field,
  updated_at = now();

-- notifications 表配置
INSERT INTO resource_permissions (
  table_name,
  owner_field,
  manager_field,
  require_approval_status,
  approval_status_field
) VALUES (
  'notifications',
  'recipient_id',
  NULL,
  false,
  NULL
) ON CONFLICT (table_name) DO UPDATE SET
  owner_field = EXCLUDED.owner_field,
  manager_field = EXCLUDED.manager_field,
  require_approval_status = EXCLUDED.require_approval_status,
  approval_status_field = EXCLUDED.approval_status_field,
  updated_at = now();

-- leave_applications 表配置
INSERT INTO resource_permissions (
  table_name,
  owner_field,
  manager_field,
  require_approval_status,
  approval_status_field
) VALUES (
  'leave_applications',
  'driver_id',
  NULL,
  true,
  'status'
) ON CONFLICT (table_name) DO UPDATE SET
  owner_field = EXCLUDED.owner_field,
  manager_field = EXCLUDED.manager_field,
  require_approval_status = EXCLUDED.require_approval_status,
  approval_status_field = EXCLUDED.approval_status_field,
  updated_at = now();

-- resignation_applications 表配置
INSERT INTO resource_permissions (
  table_name,
  owner_field,
  manager_field,
  require_approval_status,
  approval_status_field
) VALUES (
  'resignation_applications',
  'driver_id',
  NULL,
  true,
  'status'
) ON CONFLICT (table_name) DO UPDATE SET
  owner_field = EXCLUDED.owner_field,
  manager_field = EXCLUDED.manager_field,
  require_approval_status = EXCLUDED.require_approval_status,
  approval_status_field = EXCLUDED.approval_status_field,
  updated_at = now();

-- attendance_records 表配置
INSERT INTO resource_permissions (
  table_name,
  owner_field,
  manager_field,
  require_approval_status,
  approval_status_field
) VALUES (
  'attendance_records',
  'driver_id',
  NULL,
  false,
  NULL
) ON CONFLICT (table_name) DO UPDATE SET
  owner_field = EXCLUDED.owner_field,
  manager_field = EXCLUDED.manager_field,
  require_approval_status = EXCLUDED.require_approval_status,
  approval_status_field = EXCLUDED.approval_status_field,
  updated_at = now();

-- piece_work_records 表配置
INSERT INTO resource_permissions (
  table_name,
  owner_field,
  manager_field,
  require_approval_status,
  approval_status_field
) VALUES (
  'piece_work_records',
  'driver_id',
  NULL,
  false,
  NULL
) ON CONFLICT (table_name) DO UPDATE SET
  owner_field = EXCLUDED.owner_field,
  manager_field = EXCLUDED.manager_field,
  require_approval_status = EXCLUDED.require_approval_status,
  approval_status_field = EXCLUDED.approval_status_field,
  updated_at = now();

-- vehicles 表配置
INSERT INTO resource_permissions (
  table_name,
  owner_field,
  manager_field,
  require_approval_status,
  approval_status_field
) VALUES (
  'vehicles',
  'driver_id',
  NULL,
  true,
  'review_status'
) ON CONFLICT (table_name) DO UPDATE SET
  owner_field = EXCLUDED.owner_field,
  manager_field = EXCLUDED.manager_field,
  require_approval_status = EXCLUDED.require_approval_status,
  approval_status_field = EXCLUDED.approval_status_field,
  updated_at = now();

-- driver_licenses 表配置
INSERT INTO resource_permissions (
  table_name,
  owner_field,
  manager_field,
  require_approval_status,
  approval_status_field
) VALUES (
  'driver_licenses',
  'driver_id',
  NULL,
  false,
  NULL
) ON CONFLICT (table_name) DO UPDATE SET
  owner_field = EXCLUDED.owner_field,
  manager_field = EXCLUDED.manager_field,
  require_approval_status = EXCLUDED.require_approval_status,
  approval_status_field = EXCLUDED.approval_status_field,
  updated_at = now();
