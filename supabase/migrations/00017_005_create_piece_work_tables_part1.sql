-- 创建 category_prices 表
CREATE TABLE IF NOT EXISTS category_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  unit_price numeric(10,2) DEFAULT 0 NOT NULL,
  upstairs_price numeric(10,2) DEFAULT 0 NOT NULL,
  sorting_unit_price numeric(10,2) DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(warehouse_id, category_name),
  CONSTRAINT unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT upstairs_price_non_negative CHECK (upstairs_price >= 0),
  CONSTRAINT sorting_unit_price_non_negative CHECK (sorting_unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_category_prices_warehouse_id ON category_prices(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_category_prices_is_active ON category_prices(is_active);

DROP TRIGGER IF EXISTS update_category_prices_updated_at ON category_prices;
CREATE TRIGGER update_category_prices_updated_at
  BEFORE UPDATE ON category_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 创建 piece_work_records 表
CREATE TABLE IF NOT EXISTS piece_work_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES category_prices(id) ON DELETE SET NULL,
  work_date date NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  need_upstairs boolean DEFAULT false NOT NULL,
  upstairs_price numeric(10,2) DEFAULT 0 NOT NULL,
  need_sorting boolean DEFAULT false NOT NULL,
  sorting_quantity integer DEFAULT 0 NOT NULL,
  sorting_unit_price numeric(10,2) DEFAULT 0 NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT quantity_positive CHECK (quantity > 0),
  CONSTRAINT unit_price_non_negative CHECK (unit_price >= 0),
  CONSTRAINT total_amount_non_negative CHECK (total_amount >= 0),
  CONSTRAINT upstairs_price_non_negative CHECK (upstairs_price >= 0),
  CONSTRAINT sorting_quantity_non_negative CHECK (sorting_quantity >= 0),
  CONSTRAINT sorting_unit_price_non_negative CHECK (sorting_unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_piece_work_records_user_id ON piece_work_records(user_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_warehouse_id ON piece_work_records(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_category_id ON piece_work_records(category_id);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_work_date ON piece_work_records(work_date);
CREATE INDEX IF NOT EXISTS idx_piece_work_records_user_date ON piece_work_records(user_id, work_date);

DROP TRIGGER IF EXISTS update_piece_work_records_updated_at ON piece_work_records;
CREATE TRIGGER update_piece_work_records_updated_at
  BEFORE UPDATE ON piece_work_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE piece_work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_prices ENABLE ROW LEVEL SECURITY;