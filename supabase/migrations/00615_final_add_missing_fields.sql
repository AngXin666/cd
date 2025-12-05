-- ============================================
-- 最终补充缺失字段（基于实际表结构验证）
-- ============================================

DO $$ 
BEGIN
  -- 1. driver_licenses 添加 license_number 和 license_class 字段
  -- 实际表中没有这两个字段，需要添加
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_licenses' AND column_name = 'license_number') THEN
    ALTER TABLE public.driver_licenses ADD COLUMN license_number TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'driver_licenses' AND column_name = 'license_class') THEN
    ALTER TABLE public.driver_licenses ADD COLUMN license_class TEXT;
  END IF;

  -- 2. piece_work_records 添加 category_id 字段
  -- 实际表中有 category (TEXT)，但前端API可能需要 category_id (UUID)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'piece_work_records' AND column_name = 'category_id') THEN
    ALTER TABLE public.piece_work_records ADD COLUMN category_id UUID REFERENCES public.piece_work_categories(id);
  END IF;

  -- 3. 创建索引
  CREATE INDEX IF NOT EXISTS idx_driver_licenses_license_number ON public.driver_licenses(license_number);
  CREATE INDEX IF NOT EXISTS idx_driver_licenses_license_class ON public.driver_licenses(license_class);
  CREATE INDEX IF NOT EXISTS idx_piece_work_records_category_id ON public.piece_work_records(category_id);

END $$;

-- 4. 添加注释
COMMENT ON COLUMN driver_licenses.license_number IS '驾驶证号码';
COMMENT ON COLUMN driver_licenses.license_class IS '准驾车型（如C1、B2等）';
COMMENT ON COLUMN piece_work_records.category_id IS '计件分类ID（关联piece_work_categories表）';
