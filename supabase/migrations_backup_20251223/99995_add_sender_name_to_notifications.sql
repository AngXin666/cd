-- 添加sender_name字段到notifications表
-- 创建时间: 2025-12-04

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND information_schema.columns.table_name = 'notifications' 
    AND column_name = 'sender_name'
  ) THEN
    ALTER TABLE notifications ADD COLUMN sender_name TEXT;
    RAISE NOTICE '✓ notifications 已添加 sender_name 字段';
  ELSE
    RAISE NOTICE '○ notifications sender_name 字段已存在';
  END IF;
END $$;

-- 刷新PostgREST缓存
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  RAISE NOTICE '✓ PostgREST缓存已刷新';
END $$;

ANALYZE notifications;
