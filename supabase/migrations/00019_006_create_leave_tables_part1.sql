-- 创建 leave_applications 表
CREATE TABLE IF NOT EXISTS leave_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric(5,1) NOT NULL,
  reason text NOT NULL,
  status application_status DEFAULT 'pending'::application_status NOT NULL,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT end_date_after_start_date CHECK (end_date >= start_date),
  CONSTRAINT days_positive CHECK (days > 0)
);

CREATE INDEX IF NOT EXISTS idx_leave_applications_user_id ON leave_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_warehouse_id ON leave_applications(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_start_date ON leave_applications(start_date);
CREATE INDEX IF NOT EXISTS idx_leave_applications_end_date ON leave_applications(end_date);

DROP TRIGGER IF EXISTS update_leave_applications_updated_at ON leave_applications;
CREATE TRIGGER update_leave_applications_updated_at
  BEFORE UPDATE ON leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 创建 resignation_applications 表
CREATE TABLE IF NOT EXISTS resignation_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  resignation_date date NOT NULL,
  reason text NOT NULL,
  status application_status DEFAULT 'pending'::application_status NOT NULL,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT resignation_date_future CHECK (resignation_date > CURRENT_DATE)
);

CREATE INDEX IF NOT EXISTS idx_resignation_applications_user_id ON resignation_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_resignation_applications_warehouse_id ON resignation_applications(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_resignation_applications_status ON resignation_applications(status);
CREATE INDEX IF NOT EXISTS idx_resignation_applications_resignation_date ON resignation_applications(resignation_date);

DROP TRIGGER IF EXISTS update_resignation_applications_updated_at ON resignation_applications;
CREATE TRIGGER update_resignation_applications_updated_at
  BEFORE UPDATE ON resignation_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE resignation_applications ENABLE ROW LEVEL SECURITY;