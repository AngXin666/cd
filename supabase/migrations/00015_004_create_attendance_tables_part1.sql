-- 创建 attendance 表
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  clock_in_time timestamptz NOT NULL,
  clock_out_time timestamptz,
  work_date date NOT NULL,
  work_hours numeric(5,2),
  status attendance_status DEFAULT 'normal'::attendance_status NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, work_date),
  CONSTRAINT work_hours_positive CHECK (work_hours IS NULL OR work_hours >= 0),
  CONSTRAINT clock_out_after_clock_in CHECK (clock_out_time IS NULL OR clock_out_time > clock_in_time)
);

CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_warehouse_id ON attendance(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_attendance_work_date ON attendance(work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, work_date);

-- 创建 attendance_rules 表
CREATE TABLE IF NOT EXISTS attendance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  work_start_time time NOT NULL,
  work_end_time time NOT NULL,
  late_threshold integer DEFAULT 15 NOT NULL,
  early_threshold integer DEFAULT 15 NOT NULL,
  require_clock_out boolean DEFAULT true NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT late_threshold_positive CHECK (late_threshold >= 0),
  CONSTRAINT early_threshold_positive CHECK (early_threshold >= 0)
);

CREATE INDEX IF NOT EXISTS idx_attendance_rules_warehouse_id ON attendance_rules(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_attendance_rules_is_active ON attendance_rules(is_active);

DROP TRIGGER IF EXISTS update_attendance_rules_updated_at ON attendance_rules;
CREATE TRIGGER update_attendance_rules_updated_at
  BEFORE UPDATE ON attendance_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_rules_warehouse_active
  ON attendance_rules(warehouse_id)
  WHERE is_active = true;

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_rules ENABLE ROW LEVEL SECURITY;