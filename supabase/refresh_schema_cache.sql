-- 刷新Supabase Schema Cache
-- 当PostgREST报告找不到字段时，运行此SQL刷新缓存

-- 通知PostgREST重新加载schema
NOTIFY pgrst, 'reload schema';

-- 或者直接执行ANALYZE刷新统计信息
ANALYZE piece_work_records;
ANALYZE category_prices;
ANALYZE attendance;
ANALYZE warehouses;
