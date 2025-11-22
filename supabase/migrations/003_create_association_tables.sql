/*
# 创建关联表

## 说明
创建用户与仓库之间的关联表，包括司机-仓库关联和管理员-仓库关联。

## 表结构

### 1. driver_warehouses（司机-仓库关联表）
记录司机分配到哪些仓库工作。

**字段说明**：
- id (uuid, PK): 关联ID
- driver_id (uuid, FK): 司机ID，关联 profiles.id
- warehouse_id (uuid, FK): 仓库ID，关联 warehouses.id
- created_at (timestamptz): 创建时间

**约束**：
- driver_id 必须是司机角色
- 同一司机和仓库的组合唯一

### 2. manager_warehouses（管理员-仓库关联表）
记录管理员负责管理哪些仓库。

**字段说明**：
- id (uuid, PK): 关联ID
- manager_id (uuid, FK): 管理员ID，关联 profiles.id
- warehouse_id (uuid, FK): 仓库ID，关联 warehouses.id
- created_at (timestamptz): 创建时间

**约束**：
- manager_id 必须是管理员角色
- 同一管理员和仓库的组合唯一

## 安全策略
- 两个表都启用 RLS
- 超级管理员可以查看和修改所有关联
- 管理员可以查看自己负责的仓库关联
- 司机可以查看自己的仓库分配
*/

-- ============================================
-- 创建 driver_warehouses 表
-- ============================================
CREATE TABLE IF NOT EXISTS driver_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(driver_id, warehouse_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_driver_warehouses_driver_id ON driver_warehouses(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_warehouses_warehouse_id ON driver_warehouses(warehouse_id);

-- 添加约束：确保 driver_id 是司机角色
ALTER TABLE driver_warehouses
  DROP CONSTRAINT IF EXISTS driver_warehouses_driver_role_check;
ALTER TABLE driver_warehouses
  ADD CONSTRAINT driver_warehouses_driver_role_check
  CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = driver_id AND role = 'driver'::user_role
    )
  );

-- ============================================
-- 创建 manager_warehouses 表
-- ============================================
CREATE TABLE IF NOT EXISTS manager_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(manager_id, warehouse_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_manager_id ON manager_warehouses(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_warehouse_id ON manager_warehouses(warehouse_id);

-- 添加约束：确保 manager_id 是管理员角色
ALTER TABLE manager_warehouses
  DROP CONSTRAINT IF EXISTS manager_warehouses_manager_role_check;
ALTER TABLE manager_warehouses
  ADD CONSTRAINT manager_warehouses_manager_role_check
  CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = manager_id AND role = 'manager'::user_role
    )
  );

-- ============================================
-- 启用 RLS
-- ============================================
ALTER TABLE driver_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_warehouses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 辅助函数：获取管理员负责的仓库ID列表
-- ============================================
CREATE OR REPLACE FUNCTION get_manager_warehouse_ids(uid uuid)
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT ARRAY_AGG(warehouse_id)
  FROM manager_warehouses
  WHERE manager_id = uid;
$$;

-- ============================================
-- 辅助函数：检查管理员是否负责某个仓库
-- ============================================
CREATE OR REPLACE FUNCTION is_manager_of_warehouse(uid uuid, wid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM manager_warehouses
    WHERE manager_id = uid AND warehouse_id = wid
  );
$$;

-- ============================================
-- 辅助函数：检查司机是否分配到某个仓库
-- ============================================
CREATE OR REPLACE FUNCTION is_driver_of_warehouse(uid uuid, wid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM driver_warehouses
    WHERE driver_id = uid AND warehouse_id = wid
  );
$$;
