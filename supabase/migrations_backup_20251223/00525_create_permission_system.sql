/*
# 创建权限管理系统

## 1. 新增表结构

### roles 表 - 角色表
存储系统中所有角色的基本信息
- `id` (text, 主键) - 角色ID，使用枚举值：DRIVER, MANAGER, DISPATCHER, BOSS
- `name` (text, 非空) - 角色名称
- `description` (text) - 角色描述
- `parent_role_id` (text) - 父角色ID，用于权限继承
- `created_at` (timestamptz) - 创建时间

### permissions 表 - 权限表
存储系统中所有权限点
- `id` (text, 主键) - 权限代码，如 driver:view
- `name` (text, 非空) - 权限名称
- `description` (text) - 权限描述
- `module` (text) - 所属模块
- `created_at` (timestamptz) - 创建时间

### role_permissions 表 - 角色权限映射表
建立角色与权限的关联关系
- `id` (uuid, 主键) - 映射ID
- `role_id` (text, 外键) - 角色ID
- `permission_id` (text, 外键) - 权限ID
- `created_at` (timestamptz) - 创建时间

## 2. 权限点设计

### 司机管理模块
- driver:view - 查看司机信息
- driver:manage - 管理司机（增删改）
- driver:verify - 审核司机实名

### 车辆管理模块
- vehicle:view - 查看车辆信息
- vehicle:manage - 管理车辆（增删改）

### 计件管理模块
- piecework:view - 查看计件记录
- piecework:manage - 管理计件记录
- piecework:approve - 审核计件记录

### 通知模块
- notification:send - 发送通知
- notification:view - 查看通知

### 报表模块
- report:view - 查看报表
- report:export - 导出报表

### 系统管理模块
- system:admin - 系统管理（超级管理员）
- system:role - 角色管理
- system:permission - 权限管理

## 3. 角色权限分配

### DRIVER（司机）
- driver:view, vehicle:view, piecework:view, notification:view

### MANAGER（车队长）
- driver:view, driver:manage, driver:verify
- vehicle:view, vehicle:manage
- piecework:view, piecework:manage, piecework:approve
- notification:send, notification:view
- report:view

### DISPATCHER（调度）
- driver:view, vehicle:view
- piecework:view, piecework:manage
- notification:send, notification:view
- report:view

### BOSS（老板）
- 所有权限

## 4. 安全规则
- roles 表：所有认证用户可读
- permissions 表：所有认证用户可读
- role_permissions 表：所有认证用户可读
- 只有 BOSS 可以修改权限配置
*/

-- ============================================
-- 1. 创建角色表
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  parent_role_id text REFERENCES roles(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. 创建权限表
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  module text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 3. 创建角色权限映射表
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id text NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id text NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- ============================================
-- 4. 插入角色数据
-- ============================================
INSERT INTO roles (id, name, description) VALUES
  ('DRIVER', '司机', '普通司机，可以查看自己的信息和记录'),
  ('MANAGER', '车队长', '车队管理员，可以管理司机、车辆和计件记录'),
  ('DISPATCHER', '调度', '调度员，可以管理计件记录和发送通知'),
  ('BOSS', '老板', '超级管理员，拥有所有权限')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. 插入权限数据
-- ============================================
INSERT INTO permissions (id, name, description, module) VALUES
  -- 司机管理模块
  ('driver:view', '查看司机', '查看司机信息列表', 'driver'),
  ('driver:manage', '管理司机', '增删改司机信息', 'driver'),
  ('driver:verify', '审核司机', '审核司机实名认证', 'driver'),
  
  -- 车辆管理模块
  ('vehicle:view', '查看车辆', '查看车辆信息列表', 'vehicle'),
  ('vehicle:manage', '管理车辆', '增删改车辆信息', 'vehicle'),
  
  -- 计件管理模块
  ('piecework:view', '查看计件', '查看计件记录', 'piecework'),
  ('piecework:manage', '管理计件', '增删改计件记录', 'piecework'),
  ('piecework:approve', '审核计件', '审核计件记录', 'piecework'),
  
  -- 通知模块
  ('notification:send', '发送通知', '发送系统通知', 'notification'),
  ('notification:view', '查看通知', '查看通知列表', 'notification'),
  
  -- 报表模块
  ('report:view', '查看报表', '查看统计报表', 'report'),
  ('report:export', '导出报表', '导出报表数据', 'report'),
  
  -- 系统管理模块
  ('system:admin', '系统管理', '系统管理权限', 'system'),
  ('system:role', '角色管理', '管理角色配置', 'system'),
  ('system:permission', '权限管理', '管理权限配置', 'system')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. 配置角色权限映射
-- ============================================

-- DRIVER 权限
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('DRIVER', 'driver:view'),
  ('DRIVER', 'vehicle:view'),
  ('DRIVER', 'piecework:view'),
  ('DRIVER', 'notification:view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- MANAGER 权限
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('MANAGER', 'driver:view'),
  ('MANAGER', 'driver:manage'),
  ('MANAGER', 'driver:verify'),
  ('MANAGER', 'vehicle:view'),
  ('MANAGER', 'vehicle:manage'),
  ('MANAGER', 'piecework:view'),
  ('MANAGER', 'piecework:manage'),
  ('MANAGER', 'piecework:approve'),
  ('MANAGER', 'notification:send'),
  ('MANAGER', 'notification:view'),
  ('MANAGER', 'report:view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- DISPATCHER 权限
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('DISPATCHER', 'driver:view'),
  ('DISPATCHER', 'vehicle:view'),
  ('DISPATCHER', 'piecework:view'),
  ('DISPATCHER', 'piecework:manage'),
  ('DISPATCHER', 'notification:send'),
  ('DISPATCHER', 'notification:view'),
  ('DISPATCHER', 'report:view')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- BOSS 权限（所有权限）
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'BOSS', id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- 7. 配置 RLS 策略
-- ============================================

-- roles 表：所有认证用户可读
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "所有用户可以查看角色" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "只有BOSS可以管理角色" ON roles FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'BOSS'
  )
);

-- permissions 表：所有认证用户可读
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "所有用户可以查看权限" ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "只有BOSS可以管理权限" ON permissions FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'BOSS'
  )
);

-- role_permissions 表：所有认证用户可读
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "所有用户可以查看角色权限映射" ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "只有BOSS可以管理角色权限映射" ON role_permissions FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'BOSS'
  )
);

-- ============================================
-- 8. 创建权限查询函数
-- ============================================

-- 获取用户的所有权限
CREATE OR REPLACE FUNCTION get_user_permissions(user_id_param uuid)
RETURNS TABLE (permission_id text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT DISTINCT rp.permission_id
  FROM user_roles ur
  JOIN role_permissions rp ON ur.role::text = rp.role_id
  WHERE ur.user_id = user_id_param;
$$;

-- 检查用户是否有指定权限
CREATE OR REPLACE FUNCTION has_permission(user_id_param uuid, permission_code text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role::text = rp.role_id
    WHERE ur.user_id = user_id_param
    AND rp.permission_id = permission_code
  );
$$;

-- 检查用户是否有任一权限
CREATE OR REPLACE FUNCTION has_any_permission(user_id_param uuid, permission_codes text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role::text = rp.role_id
    WHERE ur.user_id = user_id_param
    AND rp.permission_id = ANY(permission_codes)
  );
$$;

-- 检查用户是否有所有权限
CREATE OR REPLACE FUNCTION has_all_permissions(user_id_param uuid, permission_codes text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(DISTINCT rp.permission_id) = array_length(permission_codes, 1)
  FROM user_roles ur
  JOIN role_permissions rp ON ur.role::text = rp.role_id
  WHERE ur.user_id = user_id_param
  AND rp.permission_id = ANY(permission_codes);
$$;
