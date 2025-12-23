-- 添加piece_work_records表缺失的字段
-- 创建时间: 2025-12-04
-- 目的: 修复PGRST204错误

-- 添加need_sorting字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'piece_work_records' AND column_name = 'need_sorting'
  ) THEN
    ALTER TABLE piece_work_records 
    ADD COLUMN need_sorting boolean DEFAULT false NOT NULL;
    RAISE NOTICE '✓ 已添加need_sorting字段';
  ELSE
    RAISE NOTICE '○ need_sorting字段已存在';
  END IF;
END $$;

-- 添加sorting_quantity字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'piece_work_records' AND column_name = 'sorting_quantity'
  ) THEN
    ALTER TABLE piece_work_records 
    ADD COLUMN sorting_quantity integer DEFAULT 0 NOT NULL,
    ADD CONSTRAINT sorting_quantity_non_negative CHECK (sorting_quantity >= 0);
    RAISE NOTICE '✓ 已添加sorting_quantity字段';
  ELSE
    RAISE NOTICE '○ sorting_quantity字段已存在';
  END IF;
END $$;

-- 添加sorting_unit_price字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'piece_work_records' AND column_name = 'sorting_unit_price'
  ) THEN
    ALTER TABLE piece_work_records 
    ADD COLUMN sorting_unit_price numeric(10,2) DEFAULT 0 NOT NULL,
    ADD CONSTRAINT sorting_unit_price_non_negative CHECK (sorting_unit_price >= 0);
    RAISE NOTICE '✓ 已添加sorting_unit_price字段';
  ELSE
    RAISE NOTICE '○ sorting_unit_price字段已存在';
  END IF;
END $$;

-- 添加need_upstairs字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'piece_work_records' AND column_name = 'need_upstairs'
  ) THEN
    ALTER TABLE piece_work_records 
    ADD COLUMN need_upstairs boolean DEFAULT false NOT NULL;
    RAISE NOTICE '✓ 已添加need_upstairs字段';
  ELSE
    RAISE NOTICE '○ need_upstairs字段已存在';
  END IF;
END $$;

-- 添加upstairs_price字段（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'piece_work_records' AND column_name = 'upstairs_price'
  ) THEN
    ALTER TABLE piece_work_records 
    ADD COLUMN upstairs_price numeric(10,2) DEFAULT 0 NOT NULL,
    ADD CONSTRAINT upstairs_price_non_negative CHECK (upstairs_price >= 0);
    RAISE NOTICE '✓ 已添加upstairs_price字段';
  ELSE
    RAISE NOTICE '○ upstairs_price字段已存在';
  END IF;
END $$;

-- 刷新PostgREST缓存
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  RAISE NOTICE '====================';
  RAISE NOTICE '✓ 字段补全完成，PostgREST缓存已刷新';
  RAISE NOTICE '====================';
END $$;

ANALYZE piece_work_records;
