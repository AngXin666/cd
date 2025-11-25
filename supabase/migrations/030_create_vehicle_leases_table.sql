/*
# 创建车辆租赁表

## 1. 新建表
- `vehicle_leases` - 车辆租赁记录表
  - `id` (uuid, primary key) - 租赁记录ID
  - `vehicle_id` (text, not null) - 车辆ID（车牌号）
  - `driver_id` (uuid, foreign key) - 司机ID
  - `start_date` (date, not null) - 租赁开始日期
  - `end_date` (date) - 租赁结束日期（NULL表示无限期）
  - `monthly_rent` (numeric, not null) - 月租金
  - `deposit` (numeric) - 押金
  - `notes` (text) - 备注
  - `created_by` (uuid, foreign key) - 创建人ID
  - `created_at` (timestamptz) - 创建时间
  - `updated_at` (timestamptz) - 更新时间

## 2. 安全策略
- 启用 RLS
- 司机可以查看自己的租赁记录
- 管理员、超级管理员、租赁管理员可以查看所有租赁记录
- 管理员、超级管理员、租赁管理员可以创建、更新、删除租赁记录

## 3. 索引
- 为 vehicle_id 创建索引
- 为 driver_id 创建索引
- 为 start_date 和 end_date 创建索引

*/

-- 创建车辆租赁表
CREATE TABLE IF NOT EXISTS vehicle_leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id text NOT NULL,
  driver_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date,
  monthly_rent numeric NOT NULL DEFAULT 0,
  deposit numeric DEFAULT 0,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_vehicle_leases_vehicle_id ON vehicle_leases(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_leases_driver_id ON vehicle_leases(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_leases_dates ON vehicle_leases(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_leases_created_by ON vehicle_leases(created_by);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_vehicle_leases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_leases_updated_at
  BEFORE UPDATE ON vehicle_leases
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_leases_updated_at();

-- 启用 RLS
ALTER TABLE vehicle_leases ENABLE ROW LEVEL SECURITY;

-- 司机查看自己的租赁记录
CREATE POLICY "司机查看自己的租赁" ON vehicle_leases
  FOR SELECT TO authenticated
  USING (
    driver_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'driver'::user_role
    )
  );

-- 管理员、超级管理员、租赁管理员查看所有租赁记录
CREATE POLICY "管理员查看所有租赁" ON vehicle_leases
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager'::user_role, 'super_admin'::user_role, 'lease_admin'::user_role)
    )
  );

-- 管理员、超级管理员、租赁管理员创建租赁记录
CREATE POLICY "管理员创建租赁记录" ON vehicle_leases
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager'::user_role, 'super_admin'::user_role, 'lease_admin'::user_role)
    )
  );

-- 管理员、超级管理员、租赁管理员更新租赁记录
CREATE POLICY "管理员更新租赁记录" ON vehicle_leases
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager'::user_role, 'super_admin'::user_role, 'lease_admin'::user_role)
    )
  );

-- 管理员、超级管理员、租赁管理员删除租赁记录
CREATE POLICY "管理员删除租赁记录" ON vehicle_leases
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager'::user_role, 'super_admin'::user_role, 'lease_admin'::user_role)
    )
  );

-- 添加表注释
COMMENT ON TABLE vehicle_leases IS '车辆租赁记录表';
COMMENT ON COLUMN vehicle_leases.id IS '租赁记录ID';
COMMENT ON COLUMN vehicle_leases.vehicle_id IS '车辆ID（车牌号）';
COMMENT ON COLUMN vehicle_leases.driver_id IS '司机ID';
COMMENT ON COLUMN vehicle_leases.start_date IS '租赁开始日期';
COMMENT ON COLUMN vehicle_leases.end_date IS '租赁结束日期（NULL表示无限期）';
COMMENT ON COLUMN vehicle_leases.monthly_rent IS '月租金';
COMMENT ON COLUMN vehicle_leases.deposit IS '押金';
COMMENT ON COLUMN vehicle_leases.notes IS '备注';
COMMENT ON COLUMN vehicle_leases.created_by IS '创建人ID';
COMMENT ON COLUMN vehicle_leases.created_at IS '创建时间';
COMMENT ON COLUMN vehicle_leases.updated_at IS '更新时间';
