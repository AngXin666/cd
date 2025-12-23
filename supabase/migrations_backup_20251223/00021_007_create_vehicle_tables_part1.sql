-- 创建 vehicles 表
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

CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_current_driver_id ON vehicles(current_driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 创建 vehicle_records 表
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

CREATE INDEX IF NOT EXISTS idx_vehicle_records_vehicle_id ON vehicle_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_records_driver_id ON vehicle_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_records_record_type ON vehicle_records(record_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_records_status ON vehicle_records(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_records_start_date ON vehicle_records(start_date);

DROP TRIGGER IF EXISTS update_vehicle_records_updated_at ON vehicle_records;
CREATE TRIGGER update_vehicle_records_updated_at
  BEFORE UPDATE ON vehicle_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_records ENABLE ROW LEVEL SECURITY;