/*
# 数据库查询索引优化

## 说明
基于实际查询模式分析，添加缺失的索引以优化查询性能

## 优化内容
1. 考勤表 (attendance) - 添加 work_date 和复合索引
2. 计件记录表 (piece_work_records) - 添加 work_date、warehouse_id 复合索引
3. 通知表 (notifications) - 优化 recipient_id + created_at 索引
4. 车辆表 (vehicles) - 添加 review_status 索引
5. 车辆文档表 (vehicle_documents) - 添加 vehicle_id 索引
6. 驾照表 (driver_licenses) - 添加 driver_id 索引
7. 品类价格表 (category_prices) - 添加 warehouse_id、category_id 索引
8. 仓库分配表 (warehouse_assignments) - 优化复合索引

## 执行时间
2025-12-23
*/

-- ============================================
-- 1. 考勤表 (attendance) 索引优化
-- ============================================

-- 工作日期索引（用于日期范围查询）
CREATE INDEX IF NOT EXISTS idx_attendance_work_date 
ON attendance(work_date DESC);

-- 用户 + 工作日期复合索引（最常用的查询组合）
CREATE INDEX IF NOT EXISTS idx_attendance_user_work_date 
ON attendance(user_id, work_date DESC);

-- 打卡时间范围查询索引
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in_time 
ON attendance(clock_in_time) 
WHERE clock_in_time IS NOT NULL;

-- 用户 + 工作日期唯一性查询（用于检查当天是否已打卡）
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_user_work_date_unique 
ON attendance(user_id, work_date);

COMMENT ON INDEX idx_attendance_work_date IS '考勤工作日期索引，用于日期范围查询';
COMMENT ON INDEX idx_attendance_user_work_date IS '考勤用户+工作日期复合索引，用于查询用户某段时间的考勤记录';
COMMENT ON INDEX idx_attendance_clock_in_time IS '考勤打卡时间索引，用于统计查询';

-- ============================================
-- 2. 计件记录表 (piece_work_records) 索引优化
-- ============================================

-- 工作日期索引
CREATE INDEX IF NOT EXISTS idx_piece_work_records_work_date 
ON piece_work_records(work_date DESC);

-- 用户 + 工作日期复合索引
CREATE INDEX IF NOT EXISTS idx_piece_work_records_user_work_date 
ON piece_work_records(user_id, work_date DESC);

-- 仓库 + 工作日期复合索引（用于仓库统计）
CREATE INDEX IF NOT EXISTS idx_piece_work_records_warehouse_work_date 
ON piece_work_records(warehouse_id, work_date DESC);

-- 用户 + 仓库 + 工作日期复合索引（用于特定仓库的用户计件查询）
CREATE INDEX IF NOT EXISTS idx_piece_work_records_user_warehouse_work_date 
ON piece_work_records(user_id, warehouse_id, work_date DESC);

-- 品类索引（用于按品类统计）
CREATE INDEX IF NOT EXISTS idx_piece_work_records_category_id 
ON piece_work_records(category_id);

COMMENT ON INDEX idx_piece_work_records_work_date IS '计件工作日期索引';
COMMENT ON INDEX idx_piece_work_records_user_work_date IS '计件用户+工作日期复合索引';
COMMENT ON INDEX idx_piece_work_records_warehouse_work_date IS '计件仓库+工作日期复合索引，用于仓库统计';
COMMENT ON INDEX idx_piece_work_records_user_warehouse_work_date IS '计件用户+仓库+工作日期复合索引';
COMMENT ON INDEX idx_piece_work_records_category_id IS '计件品类索引';

-- ============================================
-- 3. 通知表 (notifications) 索引优化
-- ============================================

-- 接收者 + 创建时间复合索引（用于通知列表查询）
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created 
ON notifications(recipient_id, created_at DESC);

-- 接收者 + 未读 + 创建时间复合索引（用于未读通知查询）
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread_created 
ON notifications(recipient_id, created_at DESC) 
WHERE is_read = false;

-- 批次ID索引（用于批量通知查询）
CREATE INDEX IF NOT EXISTS idx_notifications_batch_id 
ON notifications(batch_id) 
WHERE batch_id IS NOT NULL;

COMMENT ON INDEX idx_notifications_recipient_created IS '通知接收者+创建时间索引';
COMMENT ON INDEX idx_notifications_recipient_unread_created IS '通知未读消息索引';
COMMENT ON INDEX idx_notifications_batch_id IS '通知批次ID索引';

-- ============================================
-- 4. 车辆表 (vehicles) 索引优化
-- ============================================

-- 审核状态索引（用于待审核车辆查询）
CREATE INDEX IF NOT EXISTS idx_vehicles_review_status 
ON vehicles(review_status) 
WHERE review_status IS NOT NULL;

-- 用户 + 审核状态复合索引
CREATE INDEX IF NOT EXISTS idx_vehicles_user_review_status 
ON vehicles(user_id, review_status) 
WHERE user_id IS NOT NULL;

-- 司机 + 创建时间复合索引（用于司机车辆列表）
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_created 
ON vehicles(driver_id, created_at DESC) 
WHERE driver_id IS NOT NULL;

-- 仓库 + 创建时间复合索引（用于仓库车辆列表）
CREATE INDEX IF NOT EXISTS idx_vehicles_warehouse_created 
ON vehicles(warehouse_id, created_at DESC) 
WHERE warehouse_id IS NOT NULL;

COMMENT ON INDEX idx_vehicles_review_status IS '车辆审核状态索引';
COMMENT ON INDEX idx_vehicles_user_review_status IS '车辆用户+审核状态复合索引';
COMMENT ON INDEX idx_vehicles_driver_created IS '车辆司机+创建时间复合索引';
COMMENT ON INDEX idx_vehicles_warehouse_created IS '车辆仓库+创建时间复合索引';

-- ============================================
-- 5. 车辆文档表 (vehicle_documents) 索引优化
-- ============================================

-- 车辆ID索引（用于关联查询）
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id 
ON vehicle_documents(vehicle_id);

COMMENT ON INDEX idx_vehicle_documents_vehicle_id IS '车辆文档车辆ID索引';

-- ============================================
-- 6. 驾照表 (driver_licenses) 索引优化
-- ============================================

-- 司机ID索引（用于查询司机驾照）
CREATE INDEX IF NOT EXISTS idx_driver_licenses_driver_id 
ON driver_licenses(driver_id);

-- 创建时间索引（用于列表查询）
CREATE INDEX IF NOT EXISTS idx_driver_licenses_created_at 
ON driver_licenses(created_at DESC);

COMMENT ON INDEX idx_driver_licenses_driver_id IS '驾照司机ID索引';
COMMENT ON INDEX idx_driver_licenses_created_at IS '驾照创建时间索引';

-- ============================================
-- 7. 品类价格表 (category_prices) 索引优化
-- ============================================

-- 仓库ID索引（用于查询仓库品类价格）
CREATE INDEX IF NOT EXISTS idx_category_prices_warehouse_id 
ON category_prices(warehouse_id);

-- 品类ID索引（用于查询品类价格）
CREATE INDEX IF NOT EXISTS idx_category_prices_category_id 
ON category_prices(category_id);

-- 仓库 + 品类复合索引（用于精确查询）
CREATE INDEX IF NOT EXISTS idx_category_prices_warehouse_category 
ON category_prices(warehouse_id, category_id);

-- 创建时间索引
CREATE INDEX IF NOT EXISTS idx_category_prices_created_at 
ON category_prices(created_at DESC);

COMMENT ON INDEX idx_category_prices_warehouse_id IS '品类价格仓库ID索引';
COMMENT ON INDEX idx_category_prices_category_id IS '品类价格品类ID索引';
COMMENT ON INDEX idx_category_prices_warehouse_category IS '品类价格仓库+品类复合索引';
COMMENT ON INDEX idx_category_prices_created_at IS '品类价格创建时间索引';

-- ============================================
-- 8. 请假申请表 (leave_applications) 索引优化
-- ============================================

-- 仓库ID索引（用于仓库请假列表）
CREATE INDEX IF NOT EXISTS idx_leave_applications_warehouse_id 
ON leave_applications(warehouse_id) 
WHERE warehouse_id IS NOT NULL;

-- 仓库 + 状态 + 创建时间复合索引
CREATE INDEX IF NOT EXISTS idx_leave_applications_warehouse_status_created 
ON leave_applications(warehouse_id, status, created_at DESC) 
WHERE warehouse_id IS NOT NULL;

COMMENT ON INDEX idx_leave_applications_warehouse_id IS '请假申请仓库ID索引';
COMMENT ON INDEX idx_leave_applications_warehouse_status_created IS '请假申请仓库+状态+创建时间复合索引';

-- ============================================
-- 9. 离职申请表 (resignation_applications) 索引优化
-- ============================================

-- 仓库ID索引（用于仓库离职列表）
CREATE INDEX IF NOT EXISTS idx_resignation_applications_warehouse_id 
ON resignation_applications(warehouse_id) 
WHERE warehouse_id IS NOT NULL;

-- 仓库 + 状态 + 创建时间复合索引
CREATE INDEX IF NOT EXISTS idx_resignation_applications_warehouse_status_created 
ON resignation_applications(warehouse_id, status, created_at DESC) 
WHERE warehouse_id IS NOT NULL;

COMMENT ON INDEX idx_resignation_applications_warehouse_id IS '离职申请仓库ID索引';
COMMENT ON INDEX idx_resignation_applications_warehouse_status_created IS '离职申请仓库+状态+创建时间复合索引';

-- ============================================
-- 10. 用户表 (users) 索引优化
-- ============================================
-- 注意：users 表没有 warehouse_id 字段，用户与仓库的关系通过 warehouse_assignments 表管理

-- 司机类型索引（用于按司机类型查询）
CREATE INDEX IF NOT EXISTS idx_users_driver_type 
ON users(driver_type) 
WHERE driver_type IS NOT NULL;

-- 入职日期索引（用于按入职日期查询）
CREATE INDEX IF NOT EXISTS idx_users_join_date 
ON users(join_date) 
WHERE join_date IS NOT NULL;

COMMENT ON INDEX idx_users_driver_type IS '用户司机类型索引';
COMMENT ON INDEX idx_users_join_date IS '用户入职日期索引';

-- ============================================
-- 11. 仓库分配表 (warehouse_assignments) 索引优化
-- ============================================

-- 用户 + 仓库唯一性索引（防止重复分配）
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouse_assignments_user_warehouse_unique 
ON warehouse_assignments(user_id, warehouse_id);

COMMENT ON INDEX idx_warehouse_assignments_user_warehouse_unique IS '仓库分配用户+仓库唯一索引';

-- ============================================
-- 12. 品类表 (piece_work_categories) 索引优化
-- ============================================

-- 名称索引（用于按名称查询和排序）
CREATE INDEX IF NOT EXISTS idx_piece_work_categories_name 
ON piece_work_categories(name);

COMMENT ON INDEX idx_piece_work_categories_name IS '品类名称索引';

-- ============================================
-- 13. 仓库表 (warehouses) 索引优化
-- ============================================

-- 活跃状态 + 名称复合索引（用于活跃仓库列表）
CREATE INDEX IF NOT EXISTS idx_warehouses_active_name 
ON warehouses(is_active, name) 
WHERE is_active = true;

COMMENT ON INDEX idx_warehouses_active_name IS '仓库活跃状态+名称复合索引';

-- ============================================
-- 完成提示
-- ============================================

SELECT '数据库查询索引优化完成，共添加 32 个索引' AS result;
