-- 全面检查并补齐所有表的缺失字段
-- 创建时间: 2025-12-04
-- 目的: 一次性解决所有PGRST204字段缺失问题

-- ========================================
-- 1. piece_work_records 表
-- ========================================
DO $$ 
DECLARE
  missing_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- 检查need_sorting
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'piece_work_records' AND column_name = 'need_sorting') THEN
    ALTER TABLE piece_work_records ADD COLUMN need_sorting boolean DEFAULT false NOT NULL;
    missing_fields := array_append(missing_fields, 'need_sorting');
  END IF;
  
  -- 检查need_upstairs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'piece_work_records' AND column_name = 'need_upstairs') THEN
    ALTER TABLE piece_work_records ADD COLUMN need_upstairs boolean DEFAULT false NOT NULL;
    missing_fields := array_append(missing_fields, 'need_upstairs');
  END IF;
  
  -- 检查sorting_quantity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'piece_work_records' AND column_name = 'sorting_quantity') THEN
    ALTER TABLE piece_work_records ADD COLUMN sorting_quantity integer DEFAULT 0 NOT NULL;
    ALTER TABLE piece_work_records ADD CONSTRAINT sorting_quantity_non_negative CHECK (sorting_quantity >= 0);
    missing_fields := array_append(missing_fields, 'sorting_quantity');
  END IF;
  
  -- 检查sorting_unit_price
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'piece_work_records' AND column_name = 'sorting_unit_price') THEN
    ALTER TABLE piece_work_records ADD COLUMN sorting_unit_price numeric(10,2) DEFAULT 0 NOT NULL;
    ALTER TABLE piece_work_records ADD CONSTRAINT sorting_unit_price_non_negative CHECK (sorting_unit_price >= 0);
    missing_fields := array_append(missing_fields, 'sorting_unit_price');
  END IF;
  
  -- 检查upstairs_price
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'piece_work_records' AND column_name = 'upstairs_price') THEN
    ALTER TABLE piece_work_records ADD COLUMN upstairs_price numeric(10,2) DEFAULT 0 NOT NULL;
    ALTER TABLE piece_work_records ADD CONSTRAINT upstairs_price_non_negative CHECK (upstairs_price >= 0);
    missing_fields := array_append(missing_fields, 'upstairs_price');
  END IF;
  
  IF array_length(missing_fields, 1) > 0 THEN
    RAISE NOTICE '✓ piece_work_records 已添加字段: %', array_to_string(missing_fields, ', ');
  ELSE
    RAISE NOTICE '○ piece_work_records 所有字段完整';
  END IF;
END $$;

-- ========================================
-- 2. leave_applications 表
-- ========================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_applications' AND column_name = 'warehouse_id') THEN
    ALTER TABLE leave_applications ADD COLUMN warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_leave_applications_warehouse_id ON leave_applications(warehouse_id);
    RAISE NOTICE '✓ leave_applications 已添加 warehouse_id';
  ELSE
    RAISE NOTICE '○ leave_applications warehouse_id 已存在';
  END IF;
END $$;

-- ========================================
-- 3. resignation_applications 表
-- ========================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resignation_applications' AND column_name = 'warehouse_id') THEN
    ALTER TABLE resignation_applications ADD COLUMN warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_resignation_applications_warehouse_id ON resignation_applications(warehouse_id);
    RAISE NOTICE '✓ resignation_applications 已添加 warehouse_id';
  ELSE
    RAISE NOTICE '○ resignation_applications warehouse_id 已存在';
  END IF;
END $$;

-- ========================================
-- 4. attendance 表（检查常用字段）
-- ========================================
DO $$ 
DECLARE
  missing_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- 检查user_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'user_id') THEN
    missing_fields := array_append(missing_fields, 'user_id');
  END IF;
  
  -- 检查warehouse_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'warehouse_id') THEN
    missing_fields := array_append(missing_fields, 'warehouse_id');
  END IF;
  
  -- 检查work_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'work_date') THEN
    missing_fields := array_append(missing_fields, 'work_date');
  END IF;
  
  IF array_length(missing_fields, 1) > 0 THEN
    RAISE WARNING '⚠ attendance 缺失字段: %', array_to_string(missing_fields, ', ');
  ELSE
    RAISE NOTICE '○ attendance 所有字段完整';
  END IF;
END $$;

-- ========================================
-- 5. category_prices 表（检查常用字段）
-- ========================================
DO $$ 
DECLARE
  missing_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- 检查category_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'category_prices' AND column_name = 'category_id') THEN
    missing_fields := array_append(missing_fields, 'category_id');
  END IF;
  
  -- 检查warehouse_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'category_prices' AND column_name = 'warehouse_id') THEN
    missing_fields := array_append(missing_fields, 'warehouse_id');
  END IF;
  
  -- 检查price
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'category_prices' AND column_name = 'price') THEN
    missing_fields := array_append(missing_fields, 'price');
  END IF;
  
  -- 检查driver_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'category_prices' AND column_name = 'driver_type') THEN
    missing_fields := array_append(missing_fields, 'driver_type');
  END IF;
  
  IF array_length(missing_fields, 1) > 0 THEN
    RAISE WARNING '⚠ category_prices 缺失字段: %', array_to_string(missing_fields, ', ');
  ELSE
    RAISE NOTICE '○ category_prices 所有字段完整';
  END IF;
END $$;

-- ========================================
-- 6. 刷新PostgREST缓存
-- ========================================
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  RAISE NOTICE '================================================';
  RAISE NOTICE '✓ 所有表字段检查完成，PostgREST缓存已刷新';
  RAISE NOTICE '================================================';
END $$;

-- 刷新表统计信息
ANALYZE piece_work_records;
ANALYZE leave_applications;
ANALYZE resignation_applications;
ANALYZE attendance;
ANALYZE category_prices;
