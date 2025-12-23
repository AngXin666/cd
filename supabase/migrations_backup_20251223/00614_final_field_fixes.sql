-- ============================================
-- 最终字段修复：基于实际表结构
-- ============================================

DO $$ 
BEGIN
  -- 1. driver_licenses 添加 license_number 别名字段（实际使用 license_class）
  -- 注：表中已有 license_class, license_type 可作为补充
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_licenses' AND column_name = 'license_type') THEN
    ALTER TABLE public.driver_licenses ADD COLUMN license_type TEXT;
  END IF;

  -- 2. piece_work_records work_date 字段修改为可空（解决NOT NULL约束问题）
  -- 检查是否为NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'piece_work_records' 
    AND column_name = 'work_date'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.piece_work_records ALTER COLUMN work_date DROP NOT NULL;
    ALTER TABLE public.piece_work_records ALTER COLUMN work_date SET DEFAULT CURRENT_DATE;
  END IF;

  -- 3. piece_work_records warehouse_id 修改为可空（原表NOT NULL会导致插入失败）
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'piece_work_records' 
    AND column_name = 'warehouse_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.piece_work_records ALTER COLUMN warehouse_id DROP NOT NULL;
  END IF;

  -- 4. piece_work_records unit_price 修改为可空
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'piece_work_records' 
    AND column_name = 'unit_price'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.piece_work_records ALTER COLUMN unit_price DROP NOT NULL;
  END IF;

  -- 5. piece_work_records total_amount 修改为可空
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'piece_work_records' 
    AND column_name = 'total_amount'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.piece_work_records ALTER COLUMN total_amount DROP NOT NULL;
  END IF;

END $$;
