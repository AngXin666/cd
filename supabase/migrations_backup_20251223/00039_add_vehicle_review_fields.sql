/*
# 为 vehicles 表添加审核相关字段

## 背景
代码中使用的 Vehicle 类型包含审核相关字段，但数据库表中缺少这些字段。
需要添加这些字段以支持车辆审核功能和通知系统。

## 新增字段
1. user_id - 司机ID（车辆录入人）
2. warehouse_id - 仓库ID
3. plate_number - 车牌号（与 license_plate 同义，为了代码兼容性）
4. driver_id - 司机ID（当前使用车辆的司机）
5. review_status - 审核状态
6. locked_photos - 已锁定的照片信息
7. required_photos - 需要补录的照片列表
8. review_notes - 审核备注
9. reviewed_at - 审核时间
10. reviewed_by - 审核人ID
11. 车辆照片字段（7个角度）
12. 行驶证照片字段（3张）
13. OCR识别字段
14. 租赁管理字段
*/

-- 添加基础字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS plate_number text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_date date;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 添加审核相关字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS review_status review_status DEFAULT 'drafting';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS locked_photos jsonb DEFAULT '{}'::jsonb;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS required_photos text[] DEFAULT ARRAY[]::text[];
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS review_notes text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 添加车辆照片字段（7个角度）
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS left_front_photo text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS right_front_photo text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS left_rear_photo text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS right_rear_photo text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS dashboard_photo text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rear_door_photo text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS cargo_box_photo text;

-- 添加行驶证照片字段（3张）
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driving_license_main_photo text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driving_license_sub_photo text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driving_license_back_photo text;

-- 添加OCR识别字段 - 主页
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS use_character text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS register_date date;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS issue_date date;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_number text;

-- 添加OCR识别字段 - 副页
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS archive_number text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS total_mass numeric(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS approved_passengers integer;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS curb_weight numeric(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS approved_load numeric(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS overall_dimension_length numeric(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS overall_dimension_width numeric(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS overall_dimension_height numeric(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS inspection_valid_until date;

-- 添加OCR识别字段 - 副页背页
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS inspection_date date;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mandatory_scrap_date date;

-- 创建 ownership_type 枚举（如果不存在）
DO $$ BEGIN
  CREATE TYPE ownership_type AS ENUM ('company', 'personal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 添加租赁管理字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ownership_type ownership_type;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS lessor_name text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS lessor_contact text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS lessee_name text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS lessee_contact text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS monthly_rent numeric(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS lease_start_date date;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS lease_end_date date;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS rent_payment_day integer;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_warehouse_id ON vehicles(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_review_status ON vehicles(review_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_reviewed_by ON vehicles(reviewed_by);

-- 同步 plate_number 和 license_plate（如果 plate_number 为空，从 license_plate 复制）
UPDATE vehicles SET plate_number = license_plate WHERE plate_number IS NULL;

-- 添加约束：plate_number 和 license_plate 至少有一个不为空
ALTER TABLE vehicles ADD CONSTRAINT vehicles_plate_check 
  CHECK (plate_number IS NOT NULL OR license_plate IS NOT NULL);
