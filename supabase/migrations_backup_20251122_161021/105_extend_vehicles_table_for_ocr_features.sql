/*
# 扩展 vehicles 表以支持OCR识别功能

## 1. 新增字段
- 行驶证信息字段
- 车辆照片字段

## 2. 创建 driver_licenses 表
- 存储驾驶员身份证和驾驶证信息
*/

-- 为 vehicles 表添加新字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS use_character TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS register_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS front_photo TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS back_photo TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS left_photo TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS right_photo TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tire_photo TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driving_license_photo TEXT;

-- 创建 driver_licenses 表
CREATE TABLE IF NOT EXISTS driver_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 身份证信息
  id_card_number TEXT,
  id_card_name TEXT,
  id_card_address TEXT,
  id_card_birth_date DATE,
  id_card_photo_front TEXT,
  id_card_photo_back TEXT,
  
  -- 驾驶证信息
  license_number TEXT,
  license_class TEXT,
  valid_from DATE,
  valid_to DATE,
  issue_authority TEXT,
  driving_license_photo TEXT,
  
  -- 状态
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE driver_licenses ENABLE ROW LEVEL SECURITY;

-- driver_licenses 表的 RLS 策略
CREATE POLICY "司机可以查看自己的证件" ON driver_licenses
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "司机可以插入自己的证件" ON driver_licenses
  FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "司机可以更新自己的证件" ON driver_licenses
  FOR UPDATE TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "司机可以删除自己的证件" ON driver_licenses
  FOR DELETE TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "管理员可以查看所有证件" ON driver_licenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'super_admin')
    )
  );
