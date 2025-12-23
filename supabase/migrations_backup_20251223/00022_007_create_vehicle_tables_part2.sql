-- 创建 driver_licenses 表
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

CREATE INDEX IF NOT EXISTS idx_driver_licenses_driver_id ON driver_licenses(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_license_number ON driver_licenses(license_number);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_valid_until ON driver_licenses(valid_until);

DROP TRIGGER IF EXISTS update_driver_licenses_updated_at ON driver_licenses;
CREATE TRIGGER update_driver_licenses_updated_at
  BEFORE UPDATE ON driver_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE driver_licenses ENABLE ROW LEVEL SECURITY;

-- 检查驾驶证是否过期函数
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

-- 获取驾驶证剩余有效天数函数
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