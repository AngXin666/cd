/*
# 创建车辆录入记录系统

## 1. 设计思路
- 将vehicles表拆分为两个表：
  - vehicles_base: 存储车辆基本信息（车牌号唯一）
  - vehicle_records: 存储每次的录入记录（提车/还车记录）
- 每次司机录入行驶证时，根据车牌号自动归类到对应车辆
- 按时间倒序排列，最新的记录在最前面

## 2. 新表结构

### vehicles_base 表（车辆基本信息表）
- `id` (uuid, primary key)
- `plate_number` (text, unique) - 车牌号（唯一）
- `brand` (text) - 品牌
- `model` (text) - 型号
- `color` (text) - 颜色
- `vin` (text) - 车辆识别代号
- `vehicle_type` (text) - 车辆类型
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### vehicle_records 表（车辆录入记录表）
- `id` (uuid, primary key)
- `vehicle_id` (uuid, foreign key) - 关联vehicles_base表
- `plate_number` (text) - 车牌号（冗余字段，方便查询）
- `driver_id` (uuid) - 司机ID
- `warehouse_id` (uuid) - 仓库ID
- `record_type` (text) - 记录类型：pickup(提车) / return(还车)
- 行驶证信息字段（从vehicles表迁移）
- 车辆照片字段（从vehicles表迁移）
- 驾驶证信息字段
- 审核相关字段
- `recorded_at` (timestamptz) - 录入时间
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## 3. 数据迁移策略
- 从现有vehicles表中提取车辆基本信息，创建vehicles_base记录
- 将vehicles表中的每条记录转换为vehicle_records记录
- 保留原vehicles表，添加_deprecated后缀

## 4. 安全策略
- 禁用RLS（根据项目现有策略）
*/

-- ============================================
-- 1. 创建 vehicles_base 表（车辆基本信息表）
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number TEXT NOT NULL UNIQUE, -- 车牌号（唯一）
  brand TEXT NOT NULL, -- 品牌
  model TEXT NOT NULL, -- 型号
  color TEXT, -- 颜色
  vin TEXT, -- 车辆识别代号
  vehicle_type TEXT, -- 车辆类型
  owner_name TEXT, -- 所有人
  use_character TEXT, -- 使用性质
  register_date DATE, -- 注册日期
  engine_number TEXT, -- 发动机号码
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_vehicles_base_plate_number ON vehicles_base(plate_number);

-- ============================================
-- 2. 创建 vehicle_records 表（车辆录入记录表）
-- ============================================
CREATE TABLE IF NOT EXISTS vehicle_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles_base(id) ON DELETE CASCADE, -- 关联车辆基本信息
  plate_number TEXT NOT NULL, -- 车牌号（冗余字段）
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- 司机ID
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL, -- 仓库ID
  
  -- 记录类型
  record_type TEXT NOT NULL DEFAULT 'pickup', -- pickup(提车) / return(还车)
  
  -- 行驶证信息（从vehicles表迁移）
  issue_date DATE, -- 发证日期
  archive_number TEXT, -- 档案编号
  total_mass NUMERIC, -- 总质量（kg）
  approved_passengers INTEGER, -- 核定载人数
  curb_weight NUMERIC, -- 整备质量（kg）
  approved_load NUMERIC, -- 核定载质量（kg）
  overall_dimension_length NUMERIC, -- 外廓尺寸-长（mm）
  overall_dimension_width NUMERIC, -- 外廓尺寸-宽（mm）
  overall_dimension_height NUMERIC, -- 外廓尺寸-高（mm）
  inspection_valid_until DATE, -- 检验有效期
  inspection_date DATE, -- 年检时间
  mandatory_scrap_date DATE, -- 强制报废期
  
  -- 车辆照片（7个角度）
  left_front_photo TEXT, -- 左前照片
  right_front_photo TEXT, -- 右前照片
  left_rear_photo TEXT, -- 左后照片
  right_rear_photo TEXT, -- 右后照片
  dashboard_photo TEXT, -- 仪表盘照片
  rear_door_photo TEXT, -- 后门照片
  cargo_box_photo TEXT, -- 货箱照片
  
  -- 行驶证照片（3张）
  driving_license_main_photo TEXT, -- 行驶证主页照片
  driving_license_sub_photo TEXT, -- 行驶证副页照片
  driving_license_sub_back_photo TEXT, -- 行驶证副页背页照片
  
  -- 提车/还车照片
  pickup_photos TEXT[], -- 提车照片URL数组
  return_photos TEXT[], -- 还车照片URL数组
  registration_photos TEXT[], -- 行驶证照片URL数组
  damage_photos TEXT[], -- 车损特写照片URL数组
  
  -- 驾驶证信息
  driver_name TEXT, -- 驾驶员姓名
  license_number TEXT, -- 驾驶证号
  license_class TEXT, -- 准驾车型
  first_issue_date DATE, -- 初次领证日期
  license_valid_from DATE, -- 驾驶证有效期起始
  license_valid_until DATE, -- 驾驶证有效期截止
  id_card_number TEXT, -- 身份证号
  
  -- 审核管理字段
  review_status TEXT NOT NULL DEFAULT 'drafting', -- 审核状态
  locked_photos JSONB DEFAULT '{}'::jsonb, -- 已锁定的图片信息
  required_photos TEXT[] DEFAULT ARRAY[]::TEXT[], -- 需要补录的图片字段列表
  review_notes TEXT, -- 审核备注
  reviewed_at TIMESTAMPTZ, -- 审核时间
  reviewed_by UUID REFERENCES profiles(id), -- 审核人ID
  
  -- 时间字段
  pickup_time TIMESTAMPTZ, -- 提车时间
  return_time TIMESTAMPTZ, -- 还车时间
  recorded_at TIMESTAMPTZ DEFAULT NOW(), -- 录入时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 备注
  notes TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_vehicle_records_vehicle_id ON vehicle_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_records_plate_number ON vehicle_records(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicle_records_driver_id ON vehicle_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_records_recorded_at ON vehicle_records(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_records_review_status ON vehicle_records(review_status);

-- ============================================
-- 3. 数据迁移：从vehicles表迁移数据
-- ============================================

-- 3.1 迁移车辆基本信息到 vehicles_base
INSERT INTO vehicles_base (
  id,
  plate_number,
  brand,
  model,
  color,
  vin,
  vehicle_type,
  owner_name,
  use_character,
  register_date,
  engine_number,
  created_at,
  updated_at
)
SELECT DISTINCT ON (plate_number)
  gen_random_uuid(), -- 生成新的ID
  plate_number,
  brand,
  model,
  color,
  vin,
  vehicle_type,
  owner_name,
  use_character,
  register_date::date,
  engine_number,
  created_at,
  updated_at
FROM vehicles
WHERE plate_number IS NOT NULL
ORDER BY plate_number, created_at DESC
ON CONFLICT (plate_number) DO NOTHING;

-- 3.2 迁移车辆录入记录到 vehicle_records
INSERT INTO vehicle_records (
  id,
  vehicle_id,
  plate_number,
  driver_id,
  warehouse_id,
  record_type,
  issue_date,
  archive_number,
  total_mass,
  approved_passengers,
  curb_weight,
  approved_load,
  overall_dimension_length,
  overall_dimension_width,
  overall_dimension_height,
  inspection_valid_until,
  inspection_date,
  mandatory_scrap_date,
  left_front_photo,
  right_front_photo,
  left_rear_photo,
  right_rear_photo,
  dashboard_photo,
  rear_door_photo,
  cargo_box_photo,
  driving_license_main_photo,
  driving_license_sub_photo,
  driving_license_sub_back_photo,
  pickup_photos,
  return_photos,
  registration_photos,
  damage_photos,
  review_status,
  locked_photos,
  required_photos,
  review_notes,
  reviewed_at,
  reviewed_by,
  pickup_time,
  return_time,
  recorded_at,
  created_at,
  updated_at,
  notes
)
SELECT 
  v.id, -- 保留原ID
  vb.id AS vehicle_id, -- 关联到vehicles_base
  v.plate_number,
  v.user_id AS driver_id,
  v.warehouse_id,
  CASE 
    WHEN v.return_time IS NOT NULL THEN 'return'
    ELSE 'pickup'
  END AS record_type,
  v.issue_date::date,
  v.archive_number,
  v.total_mass,
  v.approved_passengers,
  v.curb_weight,
  v.approved_load,
  v.overall_dimension_length,
  v.overall_dimension_width,
  v.overall_dimension_height,
  v.inspection_valid_until::date,
  v.inspection_date::date,
  v.mandatory_scrap_date::date,
  v.left_front_photo,
  v.right_front_photo,
  v.left_rear_photo,
  v.right_rear_photo,
  v.dashboard_photo,
  v.rear_door_photo,
  v.cargo_box_photo,
  v.driving_license_main_photo,
  v.driving_license_sub_photo,
  v.driving_license_sub_back_photo,
  v.pickup_photos,
  v.return_photos,
  v.registration_photos,
  v.damage_photos,
  v.review_status,
  v.locked_photos,
  v.required_photos,
  v.review_notes,
  v.reviewed_at,
  v.reviewed_by,
  v.pickup_time,
  v.return_time,
  COALESCE(v.pickup_time, v.created_at) AS recorded_at,
  v.created_at,
  v.updated_at,
  v.notes
FROM vehicles v
INNER JOIN vehicles_base vb ON v.plate_number = vb.plate_number
WHERE v.plate_number IS NOT NULL;

-- ============================================
-- 4. 重命名原vehicles表（保留备份）
-- ============================================
ALTER TABLE IF EXISTS vehicles RENAME TO vehicles_deprecated;

-- ============================================
-- 5. 创建视图：兼容原有查询
-- ============================================
-- 创建一个视图，模拟原vehicles表的结构，方便过渡期使用
CREATE OR REPLACE VIEW vehicles AS
SELECT 
  vr.id,
  vr.driver_id AS user_id,
  vr.warehouse_id,
  vb.plate_number,
  vb.vehicle_type,
  vb.brand,
  vb.model,
  vb.color,
  NULL::date AS purchase_date,
  CASE 
    WHEN vr.return_time IS NOT NULL THEN 'returned'
    WHEN vr.review_status = 'approved' THEN 'active'
    ELSE 'inactive'
  END AS status,
  vr.notes,
  vb.vin,
  vb.owner_name,
  vb.use_character,
  vb.register_date,
  vr.issue_date,
  vb.engine_number,
  vr.archive_number,
  vr.total_mass,
  vr.approved_passengers,
  vr.curb_weight,
  vr.approved_load,
  vr.overall_dimension_length,
  vr.overall_dimension_width,
  vr.overall_dimension_height,
  vr.inspection_valid_until,
  vr.inspection_date,
  vr.mandatory_scrap_date,
  vr.left_front_photo,
  vr.right_front_photo,
  vr.left_rear_photo,
  vr.right_rear_photo,
  vr.dashboard_photo,
  vr.rear_door_photo,
  vr.cargo_box_photo,
  NULL::text AS driving_license_photo,
  vr.driving_license_main_photo,
  vr.driving_license_sub_photo,
  vr.driving_license_sub_back_photo,
  vr.pickup_time,
  vr.return_time,
  vr.pickup_photos,
  vr.return_photos,
  vr.registration_photos,
  vr.damage_photos,
  vr.review_status,
  vr.locked_photos,
  vr.required_photos,
  vr.review_notes,
  vr.reviewed_at,
  vr.reviewed_by,
  vr.created_at,
  vr.updated_at
FROM vehicle_records vr
INNER JOIN vehicles_base vb ON vr.vehicle_id = vb.id;

-- ============================================
-- 6. 创建触发器：自动更新updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicles_base_updated_at
  BEFORE UPDATE ON vehicles_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_records_updated_at
  BEFORE UPDATE ON vehicle_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. 安全策略（禁用RLS，根据项目现有策略）
-- ============================================
ALTER TABLE vehicles_base DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_records DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. 添加注释
-- ============================================
COMMENT ON TABLE vehicles_base IS '车辆基本信息表：存储车辆的基本信息，每个车牌号唯一';
COMMENT ON TABLE vehicle_records IS '车辆录入记录表：存储每次的提车/还车录入记录，支持历史追溯';
COMMENT ON COLUMN vehicle_records.recorded_at IS '录入时间：用于排序，最新的记录在最前面';
COMMENT ON COLUMN vehicle_records.record_type IS '记录类型：pickup(提车) / return(还车)';
