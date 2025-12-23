-- 强制刷新PostgREST Schema Cache
-- 创建时间: 2025-12-04
-- 目的: 解决PGRST204错误，确保piece_work_records表的need_sorting字段被PostgREST识别

-- 1. 通知PostgREST重新加载schema
NOTIFY pgrst, 'reload schema';

-- 2. 刷新表的统计信息
ANALYZE piece_work_records;
ANALYZE category_prices;
ANALYZE attendance;

-- 3. 确认字段存在（如果执行成功说明字段确实存在）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'piece_work_records' 
    AND column_name = 'need_sorting'
  ) THEN
    RAISE EXCEPTION 'need_sorting字段不存在于piece_work_records表中';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'piece_work_records' 
    AND column_name = 'need_upstairs'
  ) THEN
    RAISE EXCEPTION 'need_upstairs字段不存在于piece_work_records表中';
  END IF;
  
  RAISE NOTICE '✓ piece_work_records表字段验证通过';
END $$;
