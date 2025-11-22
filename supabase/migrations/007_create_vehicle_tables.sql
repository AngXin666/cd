/*
# 创建车辆相关表

## 说明
创建车辆管理相关的表，包括车辆表、车辆记录表和驾驶证表。

## 表结构

### 1. vehicles（车辆表）
记录车辆的基本信息。

**字段说明**：
- id (uuid, PK): 车辆ID
- license_plate (text, unique): 车牌号
- brand (text): 品牌
- model (text): 型号
- color (text): 颜色
- vin (text): 车架号
- owner_id (uuid, FK): 车主ID，关联 profiles.id
- current_driver_id (uuid, FK): 当前司机ID，关联 profiles.id
- is_active (boolean): 是否启用
- notes (text): 备注
- created_at (timestamptz): 创建时间
- updated_at (timestamptz): 更新时间

### 2. vehicle_records（车辆记录表）
记录车辆的租赁、维修、事故等记录。

**字段说明**：
- id (uuid, PK): 记录ID
- vehicle_id (uuid, FK): 车辆ID，关联 vehicles.id
- driver_id (uuid, FK): 司机ID，关联 profiles.id
- record_type (record_type): 记录类型
- start_date (date): 开始日期
- end_date (date): 结束日期
- rental_fee (numeric): 租金
- deposit (numeric): 押金
- status (record_status): 记录状态
- pickup_photos (text[]): 提车照片URL数组
- return_photos (text[]): 还车照片URL数组
- registration_photos (text[]): 行驶证照片URL数组
- damage_photos (text[]): 车损照片URL数组
- locked_photos (jsonb): 锁定的照片信息
- notes (text): 备注
- created_at (timestamptz): 创建时间
- updated_at (timestamptz): 更新时间

**约束**：
- end_date 必须大于等于 start_date
- 租金和押金必须为非负数

### 3. driver_licenses（驾驶证表）
记录司机的驾驶证信息。

**字段说明**：
- id (uuid, PK): 驾驶证ID
- driver_id (uuid, FK): 司机ID，关联 profiles.id
- license_number (text): 驾驶证号
- id_card_name (text): 身份证姓名
- id_card_number (text): 身份证号
- license_class (text): 准驾车型
- issue_date (date): 发证日期
- valid_from (date): 有效期起始
- valid_until (date): 有效期截止
- issuing_authority (text): 发证机关
- front_photo_url (text): 正面照片URL
- back_photo_url (text): 背面照片URL
- created_at (timestamptz): 创建时间
- updated_at (timestamptz): 更新时间

**约束**：
- 每个司机只能有一条驾驶证记录
- valid_until 必须大于 valid_from

## 安全策略
- 所有表都启用 RLS
- 司机只能查看自己相关的车辆和驾驶证信息
- 管理员可以查看和管理自己负责仓库的车辆信息
- 超级管理员可以查看和管理所有车辆信息
*/

-- ============================================
-- 创建 vehicles 表
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate text UNIQUE NOT NULL,
  brand text,
  model text,
  color text,
  vin text,
  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  current_driver_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_current_driver_id ON vehicles(current_driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);

-- 为 vehicles 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 创建 vehicle_records 表
-- ============================================
CREATE TABLE IF NOT EXISTS vehicle_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  record_type record_type NOT NULL,
  start_date date NOT NULL,
  end_date date,
  rental_fee numeric(10,2) DEFAULT 0,
  deposit numeric(10,2) DEFAULT 0,
  status record_status DEFAULT 'active'::record_status NOT NULL,
  pickup_photos text[],
  return_photos text[],
  registration_photos text[],
  damage_photos text[],
  locked_photos jsonb,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT end_date_after_start_date CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT rental_fee_non_negative CHECK (rental_fee >= 0),
  CONSTRAINT deposit_non_negative CHECK (deposit >= 0)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_vehicle_records_vehicle_id ON vehicle_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_records_driver_id ON vehicle_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_records_record_type ON vehicle_records(record_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_records_status ON vehicle_records(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_records_start_date ON vehicle_records(start_date);

-- 为 vehicle_records 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_vehicle_records_updated_at ON vehicle_records;
CREATE TRIGGER update_vehicle_records_updated_at
  BEFORE UPDATE ON vehicle_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 创建 driver_licenses 表
-- ============================================
CREATE TABLE IF NOT EXISTS driver_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  license_number text,
  id_card_name text,
  id_card_number text,
  license_class text,
  issue_date date,
  valid_from date,
  valid_until date,
  issuing_authority text,
  front_photo_url text,
  back_photo_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_until_after_valid_from CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_driver_licenses_driver_id ON driver_licenses(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_license_number ON driver_licenses(license_number);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_valid_until ON driver_licenses(valid_until);

-- 为 driver_licenses 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_driver_licenses_updated_at ON driver_licenses;
CREATE TRIGGER update_driver_licenses_updated_at
  BEFORE UPDATE ON driver_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 启用 RLS
-- ============================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_licenses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 辅助函数：检查驾驶证是否过期
-- ============================================
CREATE OR REPLACE FUNCTION is_license_expired(
  driver_id_param uuid,
  check_date date DEFAULT CURRENT_DATE
)
RETURNS boolean
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1 FROM driver_licenses
    WHERE driver_id = driver_id_param
      AND valid_until IS NOT NULL
      AND valid_until < check_date
  );
$$;

-- ============================================
-- 辅助函数：获取驾驶证剩余有效天数
-- ============================================
CREATE OR REPLACE FUNCTION get_license_remaining_days(
  driver_id_param uuid,
  check_date date DEFAULT CURRENT_DATE
)
RETURNS integer
LANGUAGE sql
AS $$
  SELECT COALESCE(
    (SELECT valid_until - check_date
     FROM driver_licenses
     WHERE driver_id = driver_id_param
       AND valid_until IS NOT NULL),
    NULL
  );
$$;
