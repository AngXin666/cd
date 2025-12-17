-- ============================================
-- Supabase Schema Cache 刷新脚本
-- ============================================
-- 
-- 功能说明：
-- 当 PostgREST 报告找不到字段时，运行此 SQL 刷新缓存
-- 
-- 使用场景：
-- 1. 执行数据库迁移后，新字段在 API 中不可见
-- 2. 添加新表或字段后，API 返回字段不存在错误
-- 
-- 执行方式：
-- 1. 打开 Supabase Dashboard
-- 2. 进入 SQL Editor
-- 3. 复制并执行此脚本
-- ============================================

-- 通知 PostgREST 重新加载 Schema
-- 这是最重要的命令，会触发 Schema Cache 刷新
NOTIFY pgrst, 'reload schema';

-- 更新表统计信息
-- ANALYZE 命令会更新表的统计信息，帮助查询优化器做出更好的决策

-- 核心业务表
ANALYZE vehicles;
ANALYZE vehicle_documents;
ANALYZE driver_licenses;

-- 考勤和计件表
ANALYZE piece_work_records;
ANALYZE category_prices;
ANALYZE attendance;
ANALYZE attendance_rules;

-- 仓库和用户表
ANALYZE warehouses;
ANALYZE warehouse_assignments;
ANALYZE users;

-- 通知表
ANALYZE notifications;

-- 请假和离职表
ANALYZE leave_applications;
ANALYZE resignation_applications;

-- 输出完成信息
DO $$
BEGIN
  RAISE NOTICE 'Schema Cache 刷新完成！';
  RAISE NOTICE '如果仍然出现字段缺失错误，请等待几分钟后重试';
END $$;
