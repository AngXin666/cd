/*
# 添加性能优化索引

## 目的
为常用查询添加索引，优化RLS策略的查询性能。

## 索引列表
1. driver_warehouses 表索引
2. manager_warehouses 表索引
3. attendance 表索引
4. piece_work_records 表索引
5. notifications 表索引
6. profiles 表索引
*/

-- ============================================================================
-- 1. driver_warehouses 表索引
-- ============================================================================

-- 优化车队长查询仓库司机的性能
CREATE INDEX IF NOT EXISTS idx_driver_warehouses_warehouse_driver 
  ON driver_warehouses(warehouse_id, driver_id);

-- 优化根据司机查询仓库的性能
CREATE INDEX IF NOT EXISTS idx_driver_warehouses_driver 
  ON driver_warehouses(driver_id);

-- 优化根据仓库查询司机的性能
CREATE INDEX IF NOT EXISTS idx_driver_warehouses_warehouse 
  ON driver_warehouses(warehouse_id);

-- ============================================================================
-- 2. manager_warehouses 表索引
-- ============================================================================

-- 优化根据车队长查询仓库的性能
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_manager_warehouse 
  ON manager_warehouses(manager_id, warehouse_id);

-- 优化根据仓库查询车队长的性能
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_warehouse 
  ON manager_warehouses(warehouse_id);

-- 优化根据车队长查询的性能
CREATE INDEX IF NOT EXISTS idx_manager_warehouses_manager 
  ON manager_warehouses(manager_id);

-- ============================================================================
-- 3. attendance 表索引
-- ============================================================================

-- 优化根据用户和租户查询考勤的性能
CREATE INDEX IF NOT EXISTS idx_attendance_user_tenant 
  ON attendance(user_id, tenant_id);

-- 优化根据租户查询考勤的性能
CREATE INDEX IF NOT EXISTS idx_attendance_tenant 
  ON attendance(tenant_id);

-- 优化根据工作日期查询考勤的性能
CREATE INDEX IF NOT EXISTS idx_attendance_work_date 
  ON attendance(work_date DESC);

-- 优化根据仓库查询考勤的性能
CREATE INDEX IF NOT EXISTS idx_attendance_warehouse 
  ON attendance(warehouse_id);

-- 复合索引：优化车队长查询仓库司机考勤的性能
CREATE INDEX IF NOT EXISTS idx_attendance_warehouse_user_date 
  ON attendance(warehouse_id, user_id, work_date DESC);

-- ============================================================================
-- 4. piece_work_records 表索引
-- ============================================================================

-- 优化根据用户和租户查询计件记录的性能
CREATE INDEX IF NOT EXISTS idx_piece_work_records_user_tenant 
  ON piece_work_records(user_id, tenant_id);

-- 优化根据租户查询计件记录的性能
CREATE INDEX IF NOT EXISTS idx_piece_work_records_tenant 
  ON piece_work_records(tenant_id);

-- 优化根据工作日期查询计件记录的性能
CREATE INDEX IF NOT EXISTS idx_piece_work_records_work_date 
  ON piece_work_records(work_date DESC);

-- 优化根据仓库查询计件记录的性能
CREATE INDEX IF NOT EXISTS idx_piece_work_records_warehouse 
  ON piece_work_records(warehouse_id);

-- 复合索引：优化车队长查询仓库司机计件记录的性能
CREATE INDEX IF NOT EXISTS idx_piece_work_records_warehouse_user_date 
  ON piece_work_records(warehouse_id, user_id, work_date DESC);

-- ============================================================================
-- 5. notifications 表索引
-- ============================================================================

-- 优化根据用户查询通知的性能
CREATE INDEX IF NOT EXISTS idx_notifications_user 
  ON notifications(user_id);

-- 优化根据租户查询通知的性能
CREATE INDEX IF NOT EXISTS idx_notifications_tenant 
  ON notifications(tenant_id);

-- 优化根据创建时间查询通知的性能
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
  ON notifications(created_at DESC);

-- 复合索引：优化查询用户未读通知的性能
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- 6. profiles 表索引
-- ============================================================================

-- 优化根据角色查询用户的性能
CREATE INDEX IF NOT EXISTS idx_profiles_role 
  ON profiles(role);

-- 优化根据租户查询用户的性能
CREATE INDEX IF NOT EXISTS idx_profiles_tenant 
  ON profiles(tenant_id);

-- 优化根据主账号查询平级账号的性能
CREATE INDEX IF NOT EXISTS idx_profiles_main_account 
  ON profiles(main_account_id);

-- 复合索引：优化根据租户和角色查询用户的性能
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_role 
  ON profiles(tenant_id, role);

-- 优化根据车队长权限状态查询的性能
CREATE INDEX IF NOT EXISTS idx_profiles_manager_permissions 
  ON profiles(manager_permissions_enabled) 
  WHERE role = 'manager';

-- ============================================================================
-- 7. 添加索引注释
-- ============================================================================

COMMENT ON INDEX idx_driver_warehouses_warehouse_driver IS '优化车队长查询仓库司机的性能';
COMMENT ON INDEX idx_driver_warehouses_driver IS '优化根据司机查询仓库的性能';
COMMENT ON INDEX idx_driver_warehouses_warehouse IS '优化根据仓库查询司机的性能';

COMMENT ON INDEX idx_manager_warehouses_manager_warehouse IS '优化根据车队长查询仓库的性能';
COMMENT ON INDEX idx_manager_warehouses_warehouse IS '优化根据仓库查询车队长的性能';
COMMENT ON INDEX idx_manager_warehouses_manager IS '优化根据车队长查询的性能';

COMMENT ON INDEX idx_attendance_user_tenant IS '优化根据用户和租户查询考勤的性能';
COMMENT ON INDEX idx_attendance_tenant IS '优化根据租户查询考勤的性能';
COMMENT ON INDEX idx_attendance_work_date IS '优化根据工作日期查询考勤的性能';
COMMENT ON INDEX idx_attendance_warehouse IS '优化根据仓库查询考勤的性能';
COMMENT ON INDEX idx_attendance_warehouse_user_date IS '优化车队长查询仓库司机考勤的性能';

COMMENT ON INDEX idx_piece_work_records_user_tenant IS '优化根据用户和租户查询计件记录的性能';
COMMENT ON INDEX idx_piece_work_records_tenant IS '优化根据租户查询计件记录的性能';
COMMENT ON INDEX idx_piece_work_records_work_date IS '优化根据工作日期查询计件记录的性能';
COMMENT ON INDEX idx_piece_work_records_warehouse IS '优化根据仓库查询计件记录的性能';
COMMENT ON INDEX idx_piece_work_records_warehouse_user_date IS '优化车队长查询仓库司机计件记录的性能';

COMMENT ON INDEX idx_notifications_user IS '优化根据用户查询通知的性能';
COMMENT ON INDEX idx_notifications_tenant IS '优化根据租户查询通知的性能';
COMMENT ON INDEX idx_notifications_created_at IS '优化根据创建时间查询通知的性能';
COMMENT ON INDEX idx_notifications_user_read_created IS '优化查询用户未读通知的性能';

COMMENT ON INDEX idx_profiles_role IS '优化根据角色查询用户的性能';
COMMENT ON INDEX idx_profiles_tenant IS '优化根据租户查询用户的性能';
COMMENT ON INDEX idx_profiles_main_account IS '优化根据主账号查询平级账号的性能';
COMMENT ON INDEX idx_profiles_tenant_role IS '优化根据租户和角色查询用户的性能';
COMMENT ON INDEX idx_profiles_manager_permissions IS '优化根据车队长权限状态查询的性能';
