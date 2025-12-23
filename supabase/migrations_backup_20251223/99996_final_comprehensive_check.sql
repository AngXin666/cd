-- 全面数据库字段完整性检查与补齐（简化版）
-- 使用已执行过的单独补齐脚本中的逻辑

-- piece_work_records补齐（复用之前成功的逻辑）
-- 已在99999_add_missing_fields_to_piece_work_records.sql中完成

-- leave_applications和resignation_applications补齐（复用之前成功的逻辑）  
-- 已在99998_add_warehouse_id_to_leave_and_resignation.sql中完成

-- 刷新PostgREST缓存
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  RAISE NOTICE '================================================';
  RAISE NOTICE '✓ PostgREST Schema Cache已刷新';
  RAISE NOTICE '✓ 请测试所有功能模块';
  RAISE NOTICE '================================================';
END $$;

-- 刷新所有核心表的统计信息
ANALYZE piece_work_records;
ANALYZE leave_applications;
ANALYZE resignation_applications;
ANALYZE attendance;
ANALYZE category_prices;
ANALYZE piece_work_categories;
ANALYZE vehicles;
ANALYZE driver_licenses;
ANALYZE notifications;
ANALYZE users;
ANALYZE warehouses;
