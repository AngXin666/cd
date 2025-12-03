-- ==========================================
-- 补充缺失的字段和表
-- ==========================================

-- 1. 添加 warehouse_assignments 表
CREATE TABLE IF NOT EXISTS warehouse_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, user_id)
);

-- 2. 添加 driver_licenses 表
CREATE TABLE IF NOT EXISTS driver_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  id_card_name TEXT,
  front_photo TEXT,
  back_photo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 启用RLS
ALTER TABLE warehouse_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_licenses ENABLE ROW LEVEL SECURITY;

-- 4. 删除可能存在的旧策略
DROP POLICY IF EXISTS "warehouse_assignments_select" ON warehouse_assignments;
DROP POLICY IF EXISTS "driver_licenses_select_own" ON driver_licenses;

-- 5. 添加基础策略
CREATE POLICY "warehouse_assignments_select" ON warehouse_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "driver_licenses_select_own" ON driver_licenses
  FOR SELECT TO authenticated USING (driver_id = auth.uid());

-- 6. 创建索引
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_user_id ON warehouse_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_assignments_warehouse_id ON warehouse_assignments(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_driver_id ON driver_licenses(driver_id);
