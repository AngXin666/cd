/*
# 创建司机仓库关联表

## 1. 新建表
- `driver_warehouses` - 司机和仓库的多对多关联表
  - `id` (uuid, 主键)
  - `driver_id` (uuid, 外键 -> profiles.id)
  - `warehouse_id` (uuid, 外键 -> warehouses.id)
  - `created_at` (timestamptz)
  - 唯一约束：(driver_id, warehouse_id)

## 2. 安全策略
- 超级管理员可以管理所有司机仓库关联
- 司机可以查看自己的仓库分配

## 3. 说明
- 支持一个司机分配到多个仓库
- 司机只能在被分配的仓库打卡
*/

-- 创建司机仓库关联表
CREATE TABLE IF NOT EXISTS driver_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(driver_id, warehouse_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_driver_warehouses_driver_id ON driver_warehouses(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_warehouses_warehouse_id ON driver_warehouses(warehouse_id);

-- 启用行级安全
ALTER TABLE driver_warehouses ENABLE ROW LEVEL SECURITY;

-- 创建辅助函数检查是否为超级管理员
CREATE OR REPLACE FUNCTION is_super_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'super_admin'::user_role
  );
$$;

-- 超级管理员可以管理所有司机仓库关联
CREATE POLICY "超级管理员可以管理所有司机仓库关联" ON driver_warehouses
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()));

-- 司机可以查看自己的仓库分配
CREATE POLICY "司机可以查看自己的仓库分配" ON driver_warehouses
  FOR SELECT TO authenticated
  USING (auth.uid() = driver_id);

-- 为现有的司机分配默认仓库（总部仓库）
INSERT INTO driver_warehouses (driver_id, warehouse_id)
SELECT p.id, w.id
FROM profiles p
CROSS JOIN warehouses w
WHERE p.role = 'driver'::user_role
  AND w.name = '总部仓库'
  AND NOT EXISTS (
    SELECT 1 FROM driver_warehouses dw
    WHERE dw.driver_id = p.id AND dw.warehouse_id = w.id
  );
