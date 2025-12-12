/*
# 扩展行驶证字段 - 支持主页、副页、副页背页完整信息

## 1. 新增字段说明

### 主页字段（已有）
- plate_number: 车牌号码
- vehicle_type: 车辆类型
- brand: 品牌
- model: 型号
- vin: 车辆识别代号
- register_date: 注册日期

### 主页新增字段
- engine_number: 发动机号码

### 副页字段
- archive_number: 档案编号
- total_mass: 总质量（kg）
- approved_passengers: 核定载人数
- curb_weight: 整备质量（kg）
- approved_load: 核定载质量（kg）
- overall_dimension_length: 外廓尺寸-长（mm）
- overall_dimension_width: 外廓尺寸-宽（mm）
- overall_dimension_height: 外廓尺寸-高（mm）
- inspection_valid_until: 检验有效期

### 副页背页字段
- mandatory_scrap_date: 强制报废期

### 照片字段
- driving_license_main_photo: 行驶证主页照片
- driving_license_sub_photo: 行驶证副页照片
- driving_license_sub_back_photo: 行驶证副页背页照片

## 2. 安全策略
- 保持现有RLS策略不变
*/

-- 主页新增字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_number TEXT;

-- 副页字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS archive_number TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS total_mass NUMERIC;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS approved_passengers INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS curb_weight NUMERIC;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS approved_load NUMERIC;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS overall_dimension_length NUMERIC;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS overall_dimension_width NUMERIC;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS overall_dimension_height NUMERIC;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS inspection_valid_until DATE;

-- 副页背页字段
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mandatory_scrap_date DATE;

-- 照片字段（重命名和新增）
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driving_license_main_photo TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driving_license_sub_photo TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driving_license_sub_back_photo TEXT;

-- 添加字段注释
COMMENT ON COLUMN vehicles.engine_number IS '发动机号码';
COMMENT ON COLUMN vehicles.archive_number IS '档案编号';
COMMENT ON COLUMN vehicles.total_mass IS '总质量（kg）';
COMMENT ON COLUMN vehicles.approved_passengers IS '核定载人数';
COMMENT ON COLUMN vehicles.curb_weight IS '整备质量（kg）';
COMMENT ON COLUMN vehicles.approved_load IS '核定载质量（kg）';
COMMENT ON COLUMN vehicles.overall_dimension_length IS '外廓尺寸-长（mm）';
COMMENT ON COLUMN vehicles.overall_dimension_width IS '外廓尺寸-宽（mm）';
COMMENT ON COLUMN vehicles.overall_dimension_height IS '外廓尺寸-高（mm）';
COMMENT ON COLUMN vehicles.inspection_valid_until IS '检验有效期';
COMMENT ON COLUMN vehicles.mandatory_scrap_date IS '强制报废期';
COMMENT ON COLUMN vehicles.driving_license_main_photo IS '行驶证主页照片';
COMMENT ON COLUMN vehicles.driving_license_sub_photo IS '行驶证副页照片';
COMMENT ON COLUMN vehicles.driving_license_sub_back_photo IS '行驶证副页背页照片';
