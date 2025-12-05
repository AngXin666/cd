-- 添加warehouse_id字段到请假和离职申请表
-- 创建时间: 2025-12-04
-- 目的: 修复PGRST204错误

-- 为leave_applications添加warehouse_id字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leave_applications' AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE leave_applications 
    ADD COLUMN warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_leave_applications_warehouse_id 
    ON leave_applications(warehouse_id);
    
    RAISE NOTICE '✓ leave_applications已添加warehouse_id字段';
  ELSE
    RAISE NOTICE '○ leave_applications的warehouse_id字段已存在';
  END IF;
END $$;

-- 为resignation_applications添加warehouse_id字段
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resignation_applications' AND column_name = 'warehouse_id'
  ) THEN
    ALTER TABLE resignation_applications 
    ADD COLUMN warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_resignation_applications_warehouse_id 
    ON resignation_applications(warehouse_id);
    
    RAISE NOTICE '✓ resignation_applications已添加warehouse_id字段';
  ELSE
    RAISE NOTICE '○ resignation_applications的warehouse_id字段已存在';
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

ANALYZE leave_applications;
ANALYZE resignation_applications;
